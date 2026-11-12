import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generateText } from '@/lib/vertexai/gemini'
import { getGeminiTextModel } from '@/lib/config/modelConfig'
import { safeParseJsonFromText } from '@/lib/safeJson'
import { englishForModel, resolveRequestStoryLocale } from '@/i18n/server/requestLocale'
import { localePromptDirective } from '@/lib/prompts/localeDirective'
import {
  type ArtStyleSpec,
  type ArtStyleStoryContext,
  normalizeArtStyleSpec,
  optimizeArtStyleDirectionFallback,
  recommendArtStyleFallback,
  serializeArtStyleValue,
} from '@/lib/artStyle/globalArtStyle'

export const runtime = 'nodejs'
export const maxDuration = 60

const ART_STYLE_ENGLISH_FIELDS = [
  'medium',
  'presetId',
  'stylePrompt',
  'paletteAndLighting',
  'characterRefDirective',
  'locationRefDirective',
  'propRefDirective',
  'videoMotionDirective',
  'negativeTerms',
] as const

interface ArtStyleIntelligenceRequest {
  mode?: 'recommend' | 'optimize'
  storyContext?: ArtStyleStoryContext
  userDirection?: string
  currentArtStyle?: string
  storyLocale?: string
}

function formatStoryContextBlock(ctx?: ArtStyleStoryContext): string {
  if (!ctx) return 'No storyline provided yet — propose versatile, high-craft narrative production styles.'
  const lines: string[] = []
  if (ctx.title?.trim()) lines.push(`Title: ${ctx.title.trim()}`)
  if (ctx.logline?.trim()) lines.push(`Logline: ${ctx.logline.trim()}`)
  if (ctx.storyline?.trim()) lines.push(`Storyline / Synopsis:\n${ctx.storyline.trim().slice(0, 4000)}`)
  const genreStr = Array.isArray(ctx.genre) ? ctx.genre.filter(Boolean).join(', ') : ctx.genre?.trim()
  if (genreStr) lines.push(`Genre: ${genreStr}`)
  if (ctx.tone?.trim()) lines.push(`Tone: ${ctx.tone.trim()}`)
  if (ctx.targetAudience?.trim()) lines.push(`Target Audience: ${ctx.targetAudience.trim()}`)
  if (ctx.format?.trim()) lines.push(`Production Format: ${ctx.format.trim()}`)
  if (ctx.aspectRatio?.trim()) lines.push(`Aspect Ratio: ${ctx.aspectRatio.trim()}`)
  if (ctx.isSeries) {
    lines.push(
      `Scope: Multi-episode Series${ctx.episodeCount ? ` (${ctx.episodeCount} episodes)` : ''} — style MUST stay pixel-consistent across shared Continuity References (Characters, Locations, Key Props), Stills, and Video Clips across all episodes.`
    )
  }
  return lines.length > 0
    ? lines.join('\n')
    : 'No storyline provided yet — propose versatile, high-craft narrative production styles.'
}

const SPEC_SCHEMA_GUIDANCE = `{
  "title": "Concise 3-6 word production design title (e.g. 'Hand-Painted Gouache & Cel Animation' or 'Anamorphic 35mm Chiaroscuro Neo-Noir')",
  "medium": "EXACTLY ONE OF: 'live-action' | '3d-animation' | '2d-animation' | 'painterly' | 'graphic-illustration' | 'mixed-media'",
  "presetId": "Use matching preset ID ONLY if pure preset ('photorealistic' | 'cinematic-3d' | 'pixar' | 'anime-90s' | 'ghibli' | 'comic-book' | 'concept-art' | 'flat-vector' | 'storyboard' | 'digital-art' | 'watercolor' | 'sketch' | 'oil-painting'), otherwise 'custom'",
  "rationale": "1-2 crisp sentences explaining why this visual medium & aesthetic serves the storyline, emotional tone, and recurring continuity",
  "stylePrompt": "Rich comma-separated visual rendering directive (lens/medium, surface texture, linework/brushwork or film stock, color & lighting grammar — NO scene-specific plot nouns)",
  "paletteAndLighting": "Concise color palette, key-to-fill contrast, and lighting grammar",
  "characterRefDirective": "Exact rendering rule for Character Continuity Reference portraits & wardrobe sheets in this exact medium (for non-live-action, explicitly forbid live-action human DSLR skin pores)",
  "locationRefDirective": "Exact rendering rule for empty wide Location Continuity Reference plates in this exact medium (no people, consistent medium textures)",
  "propRefDirective": "Exact rendering rule for isolated Key Prop Continuity Reference plates in this exact medium",
  "videoMotionDirective": "Temporal motion & rendering rule for video clip generation (avoid static freeze words like 'film still', 'photograph', '8K')",
  "negativeTerms": ["5 to 8 concise terms to block style drift (e.g. block live-action photography if stylized, or block cartoon/anime/CGI if live-action)"]
}`

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: ArtStyleIntelligenceRequest
  try {
    body = (await request.json()) as ArtStyleIntelligenceRequest
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const mode = body.mode === 'optimize' ? 'optimize' : 'recommend'
  const storyContext = body.storyContext ?? {}
  const userDirection = typeof body.userDirection === 'string' ? body.userDirection.trim() : ''

  if (mode === 'optimize' && !userDirection) {
    return NextResponse.json(
      { error: 'Please enter or dictate an art style direction to optimize.' },
      { status: 400 }
    )
  }

  const { storyLocale } = await resolveRequestStoryLocale(request, {
    explicitLocale: body.storyLocale,
    userId: session.user.id,
  })
  const localeBlock = localePromptDirective(storyLocale, {
    visualPromptFields: ART_STYLE_ENGLISH_FIELDS,
  })
  const contextBlock = formatStoryContextBlock(storyContext)
  const model = getGeminiTextModel('flash')

  if (mode === 'recommend') {
    const systemInstruction = `You are a Principal Film & Animation Production Designer for SceneFlow Studio.
Your job is to analyze a project's storyline, genre, tone, audience, and format and recommend the single best Global Art Style to lock across:
1. Shared Continuity References (Character identity & wardrobe, Location plates, Key Props)
2. Scene Stills / Keyframes
3. Video Clips

Do NOT trap the creator in generic labels. Craft an authentic, specific visual production design tailored to the story (whether grounded 35mm/65mm live-action cinema, tactile 3D feature animation, hand-painted 2D animation, graphic novel illustration, or editorial motion art), PLUS 2 distinct creative alternatives in contrasting mediums or visual grammars.
Return valid JSON only.${localeBlock ? `\n\n${localeBlock}` : ''}`

    const prompt = `STORY & PRODUCTION CONTEXT:
${contextBlock}
${body.currentArtStyle ? `\nCurrent style seed (optional context): ${body.currentArtStyle}` : ''}

Return a JSON object with this exact shape:
{
  "recommended": ${SPEC_SCHEMA_GUIDANCE},
  "alternatives": [
    ${SPEC_SCHEMA_GUIDANCE},
    ${SPEC_SCHEMA_GUIDANCE}
  ]
}`

    try {
      const result = await generateText(prompt, {
        model,
        systemInstruction,
        responseMimeType: 'application/json',
        temperature: 0.55,
        maxOutputTokens: 3072,
        thinkingLevel: 'minimal',
      })
      const parsed = safeParseJsonFromText(result.text) as {
        recommended?: Partial<ArtStyleSpec>
        alternatives?: Array<Partial<ArtStyleSpec>>
      } | null

      if (parsed?.recommended && (parsed.recommended.stylePrompt || parsed.recommended.title)) {
        const recommended = normalizeArtStyleSpec({
          ...parsed.recommended,
          source: 'ai-recommended',
        })
        const alternatives = Array.isArray(parsed.alternatives)
          ? parsed.alternatives
              .filter((a) => a && (a.stylePrompt || a.title))
              .slice(0, 2)
              .map((a) =>
                normalizeArtStyleSpec({
                  ...a,
                  source: 'ai-recommended',
                })
              )
          : []

        return NextResponse.json({
          success: true,
          recommended,
          serializedArtStyle: serializeArtStyleValue(recommended),
          alternatives,
        })
      }
    } catch (err) {
      console.warn('[art-style intelligence] recommend fallback:', err)
    }

    const fallback = recommendArtStyleFallback(storyContext)
    return NextResponse.json({
      success: true,
      recommended: fallback.recommended,
      serializedArtStyle: serializeArtStyleValue(fallback.recommended),
      alternatives: fallback.alternatives,
      fallback: true,
    })
  }

  // mode === 'optimize'
  const systemInstruction = `You are a Principal Film & Animation Production Designer for SceneFlow Studio.
The creator has typed or voice-dictated their Global Art Style preference. Clean up any spoken dictation artifacts, honor their exact artistic intent and medium choice, harmonize it with the storyline's atmosphere, and compile a production-locked Global Art Style specification that keeps Character References, Location Plates, Prop References, Scene Stills, and Video Clips 100% visually unified.
Never override a stylized user request back to photorealism, and never turn a live-action request into animation.
Return valid JSON only.${localeBlock ? `\n\n${localeBlock}` : ''}`

  const prompt = `CREATOR ART STYLE DIRECTION (typed or voice-dictated):
"${userDirection}"

STORY & PRODUCTION CONTEXT:
${contextBlock}

Synthesize the creator's direction and story context into a single JSON object matching this exact schema:
${SPEC_SCHEMA_GUIDANCE}`

  try {
    const result = await generateText(prompt, {
      model,
      systemInstruction,
      responseMimeType: 'application/json',
      temperature: 0.4,
      maxOutputTokens: 2048,
      thinkingLevel: 'minimal',
    })
    const parsed = safeParseJsonFromText(result.text) as Partial<ArtStyleSpec> | null
    if (parsed && (parsed.stylePrompt || parsed.title)) {
      const optimized = normalizeArtStyleSpec({
        ...parsed,
        userDirection,
        source: 'ai-recommended',
      })
      return NextResponse.json({
        success: true,
        optimized,
        serializedArtStyle: serializeArtStyleValue(optimized),
      })
    }
  } catch (err) {
    console.warn('[art-style intelligence] optimize fallback:', err)
  }

  const englishDirection = await englishForModel(userDirection, storyLocale)
  const fallbackOptimized = optimizeArtStyleDirectionFallback(englishDirection, storyContext)
  return NextResponse.json({
    success: true,
    optimized: fallbackOptimized,
    serializedArtStyle: serializeArtStyleValue(fallbackOptimized),
    fallback: true,
  })
}
