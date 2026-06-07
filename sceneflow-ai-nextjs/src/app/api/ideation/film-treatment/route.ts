import { NextRequest, NextResponse } from 'next/server'
import { strictJsonPromptSuffix, safeParseJsonFromText } from '@/lib/safeJson'
import { analyzeDuration, normalizeDuration } from '@/lib/treatment/duration'
import { buildTreatmentPrompt } from '@/lib/treatment/prompts'
import {
  type ContentIntent,
  resolveContentIntent,
  resolveProductionFormat,
} from '@/lib/content/contentIntent'
import { BEAT_STRUCTURES, type BeatStructureKey } from '@/lib/treatment/structures'
import { repairTreatment } from '@/lib/treatment/validate'
import { generateText } from '@/lib/vertexai/gemini'

// Vercel function configuration - must match vercel.json
export const maxDuration = 300 // 5 minutes for complex Blueprint generation

interface FilmTreatmentRequest {
  input: string
  coreConcept?: {
    input_title: string
    input_synopsis: string
    core_themes: string[]
    narrative_structure: string
  }
  targetAudience?: string
  keyMessage?: string
  tone?: string
  genre?: string
  duration?: number
  platform?: string
  format?: string
  contentIntent?: ContentIntent
  targetMinutes?: number  // Legacy, kept for backward compatibility
  filmType?: 'micro_short'|'short_film'|'featurette'|'feature_length'|'epic'
  rigor?: 'fast'|'balanced'|'thorough'
  beatStructure?: BeatStructureKey
  variants?: number // default 1 when explicit settings, else 3
  userName?: string  // User's name for "Created By" field
  hasExplicitSettings?: boolean
  /** Dev-only: override thinking budget for A/B validation (NODE_ENV=development only) */
  debugThinkingBudget?: number
}

type RigorMode = 'fast' | 'balanced' | 'thorough'

function getThinkingBudgetForRigor(rigor: RigorMode): number {
  switch (rigor) {
    case 'fast': return 0
    case 'balanced': return 256
    case 'thorough':
    default: return 1024
  }
}

function resolveThinkingBudget(rigor: RigorMode, debugOverride?: number): number {
  if (process.env.NODE_ENV === 'development' && debugOverride !== undefined) {
    return debugOverride
  }
  return getThinkingBudgetForRigor(rigor)
}

function shouldUseSyntheticCoreConcept(
  rigor: RigorMode,
  genre?: string,
  tone?: string,
  targetAudience?: string,
  hasExplicitSettings?: boolean
): boolean {
  if (!genre || !tone) return false
  const allThreeSettings = !!(genre && tone && targetAudience)
  if (rigor === 'fast') return true
  if (rigor === 'balanced') return allThreeSettings
  // thorough: synthetic when user provided full explicit settings
  return !!hasExplicitSettings && allThreeSettings
}

interface FilmTreatmentItem {
  // Legacy minimal fields (backward-compatible)
  film_treatment: string
  visual_style: string
  tone_description: string
  target_audience: string

  // Structured attributes
  title?: string
  logline?: string
  genre?: string
  format_length?: string
  author_writer?: string
  date?: string

  synopsis?: string
  setting?: string
  protagonist?: string
  antagonist?: string
  act_breakdown?: {
    act1?: string
    act2?: string
    act3?: string
  }

  tone?: string
  style?: string
  themes?: string[] | string
  mood_references?: string[]

  character_descriptions?: Array<{
    name: string
    description: string
    image_prompt?: string
  }>
  // Duration-aware additions
  estimatedDurationMinutes?: number
  beats?: Array<{ title: string; intent?: string; minutes: number; synopsis?: string }>
  total_duration_seconds?: number
  
  // Narrative reasoning
  narrative_reasoning?: {
    character_focus: string
    key_decisions: Array<{
      decision: string
      why: string
      impact: string
    }>
    story_strengths: string
    user_adjustments: string
  }
}

interface FilmTreatmentResponse {
  success: boolean
  data: FilmTreatmentItem
  variants?: Array<{ id: string; label: string; } & FilmTreatmentItem>
  message: string
}

interface CoreConceptData {
  input_title: string
  input_synopsis: string
  core_themes: string[]
  narrative_structure: string
}

// =============================================================================
// HELPER FUNCTIONS FOR SYNTHETIC CORE CONCEPT (Optimization)
// =============================================================================
// When user provides explicit settings, we can build a core concept without LLM

function extractTitleFromInput(input: string): string {
  // Try to extract a title from the first line or sentence
  const firstLine = input.split('\n')[0].trim()
  if (firstLine.length > 0 && firstLine.length < 100) {
    // If first line looks like a title (short, no periods)
    if (!firstLine.includes('.') && firstLine.length < 60) {
      return firstLine
    }
  }
  // Fall back to first few words
  const words = input.split(/\s+/).slice(0, 5).join(' ')
  return words.length > 50 ? words.slice(0, 50) + '...' : words
}

function extractThemesFromGenreTone(genre: string, tone: string): string[] {
  const genreThemes: Record<string, string[]> = {
    'drama': ['personal growth', 'conflict', 'relationships'],
    'thriller': ['suspense', 'danger', 'survival'],
    'horror': ['fear', 'isolation', 'the unknown'],
    'comedy': ['humor', 'relationships', 'absurdity'],
    'sci-fi': ['technology', 'humanity', 'the future'],
    'romance': ['love', 'connection', 'vulnerability'],
    'action': ['heroism', 'justice', 'sacrifice'],
    'fantasy': ['magic', 'destiny', 'good vs evil'],
    'mystery': ['truth', 'deception', 'justice'],
    'documentary': ['authenticity', 'discovery', 'human experience']
  }
  
  const toneThemes: Record<string, string[]> = {
    'dark': ['moral ambiguity', 'consequence'],
    'gritty': ['realism', 'hardship'],
    'light': ['hope', 'optimism'],
    'comedic': ['irony', 'levity'],
    'inspirational': ['triumph', 'perseverance'],
    'suspenseful': ['tension', 'anticipation'],
    'dramatic': ['emotion', 'transformation']
  }
  
  const themes = new Set<string>()
  
  // Add genre themes
  const genreKey = genre.toLowerCase()
  if (genreThemes[genreKey]) {
    genreThemes[genreKey].forEach(t => themes.add(t))
  }
  
  // Add tone themes (match partial)
  Object.keys(toneThemes).forEach(key => {
    if (tone.toLowerCase().includes(key)) {
      toneThemes[key].forEach(t => themes.add(t))
    }
  })
  
  return Array.from(themes).slice(0, 4) // Return up to 4 themes
}

// Map film type to target minutes estimate
function getFilmTypeMinutes(filmType?: string): number {
  switch (filmType) {
    case 'micro_short': return 3  // 1-5 min average
    case 'short_film': return 10  // 5-15 min average
    case 'featurette': return 25  // 15-40 min average
    case 'feature_length': return 65  // 40-90 min average
    case 'epic': return 120  // 90+ min average
    default: return 20  // fallback
  }
}

/**
 * Auto-detect the optimal film structure based on content analysis
 * Uses keyword matching, format hints, and duration to select the best beat structure
 */
function autoDetectFilmStructure(
  input: string,
  coreConcept: CoreConceptData | null,
  format: string,
  targetMinutes: number
): { structure: BeatStructureKey; confidence: number; reason: string } {
  const content = `${input} ${coreConcept?.input_synopsis || ''} ${coreConcept?.core_themes?.join(' ') || ''}`.toLowerCase()
  
  // Check for instructional/educational content
  const instructionalPatterns = /\b(tutorial|how-to|guide|lesson|learn|teach|step-by-step|instructions|training|course|module|explain|explainer|walkthrough|demonstration)\b/i
  if (instructionalPatterns.test(content) || format === 'education' || format === 'educational' || format === 'training') {
    return {
      structure: 'instructional',
      confidence: 0.9,
      reason: 'Content has educational/instructional focus'
    }
  }
  
  // Check for sales/demo/commercial content
  const salesDemoPatterns = /\b(demo|product|sales|pitch|walkthrough|tour|feature|benefit|roi|conversion|prospect|lead|explainer|case study|advertisement|ad\b)\b/i
  const commercialFormats = ['demo', 'sales', 'product_demo', 'explainer', 'case_study', 'advertisement']
  if (salesDemoPatterns.test(content) || commercialFormats.includes(format)) {
    return {
      structure: 'instructional',
      confidence: 0.85,
      reason: 'Content suits commercial/demo format'
    }
  }

  // Check for news/reporting content
  const newsPatterns = /\b(news|report|breaking|investigate|coverage|headline|anchor|correspondent|journalism|update)\b/i
  if (newsPatterns.test(content) || format === 'news') {
    return {
      structure: 'mini_doc', // News fits well with documentary structure
      confidence: 0.85,
      reason: 'Content suits news/reporting format'
    }
  }

  // Check for documentary/mini-doc style
  const documentaryPatterns = /\b(documentary|real|authentic|behind-the-scenes|journey|explore|discover|reveal|interview|profile|portrait|day-in-the-life|story of|true story|podcast)\b/i
  if (documentaryPatterns.test(content) || format === 'documentary' || format === 'podcast' || format === 'interview') {
    return {
      structure: 'mini_doc',
      confidence: 0.85,
      reason: 'Content suits documentary/podcast/mini-doc format'
    }
  }
  
  // Check for hero's journey patterns
  const herosJourneyPatterns = /\b(hero|journey|quest|adventure|transform|overcome|destiny|calling|mentor|ordeal|return|triumph|dragon|villain|chosen one|reluctant|crossing threshold)\b/i
  if (herosJourneyPatterns.test(content)) {
    return {
      structure: 'heros_journey',
      confidence: 0.8,
      reason: 'Content contains hero\'s journey narrative elements'
    }
  }
  
  // Check for Save the Cat patterns (commercial/Hollywood style)
  const saveTheCatPatterns = /\b(commercial|blockbuster|mainstream|hook|catalyst|fun and games|midpoint|twist|all is lost|finale|crowd-pleaser|high-concept|entertainment)\b/i
  if (saveTheCatPatterns.test(content) || targetMinutes >= 30) {
    // Save the Cat works well for longer, more structured narratives
    if (targetMinutes >= 20) {
      return {
        structure: 'save_the_cat',
        confidence: 0.75,
        reason: 'Content suits structured commercial narrative'
      }
    }
  }
  
  // Default to three-act structure - the most versatile
  return {
    structure: 'three_act',
    confidence: 0.7,
    reason: 'Using versatile three-act structure as default'
  }
}

export async function POST(request: NextRequest) {
  const requestStartMs = Date.now()
  try {
    const body: FilmTreatmentRequest = await request.json()
    const { input, targetAudience, keyMessage, tone, genre, duration, platform, userName } = body
    let { coreConcept } = body
    const rigor: RigorMode = body.rigor || 'thorough'
    const thinkingBudget = resolveThinkingBudget(rigor, body.debugThinkingBudget)
    
    // Check if explicit settings were provided (enables optimizations)
    const hasExplicitSettings = !!body.hasExplicitSettings || !!(genre && tone && targetAudience)
    
    const requestedVariants = body.variants ?? 1
    const variantsCount = Math.max(1, Math.min(requestedVariants, 5))
    
    console.log(`[Film Treatment] rigor=${rigor} thinkingBudget=${thinkingBudget} variants=${variantsCount}${hasExplicitSettings ? ' (explicit settings)' : ''}`)
    
    const format = body.format || resolveProductionFormat(genre) || 'short_film'
    const contentIntent: ContentIntent =
      body.contentIntent || resolveContentIntent(genre)
    // Prefer filmType over targetMinutes, but fall back to analyzeDuration if neither provided
    const targetMinutes = body.filmType 
      ? getFilmTypeMinutes(body.filmType)
      : (body.targetMinutes || analyzeDuration(input, 20))

    // Cap duration at 180 minutes (3 hours) as reasonable maximum
    const MAX_DURATION_MINUTES = 180
    const cappedTargetMinutes = Math.min(targetMinutes, MAX_DURATION_MINUTES)

    if (targetMinutes > MAX_DURATION_MINUTES) {
      console.warn(`[Film Treatment] Duration ${targetMinutes}min exceeds maximum ${MAX_DURATION_MINUTES}min, capping to ${MAX_DURATION_MINUTES}min`)
    }

    if (!input) {
      return NextResponse.json({ success: false, message: 'Input content is required' }, { status: 400 })
    }

    // Vertex AI doesn't require API key check - uses service account credentials

    const coreConceptStartMs = Date.now()
    if (!coreConcept) {
      const useSynthetic =
        rigor === 'fast' ||
        shouldUseSyntheticCoreConcept(rigor, genre, tone, targetAudience, hasExplicitSettings)
      if (useSynthetic) {
        const effectiveGenre = genre || 'drama'
        const effectiveTone = tone || 'professional'
        console.log(`[Film Treatment] Building synthetic core concept (rigor=${rigor}, skipping LLM extraction)`)
        const narrativeStructure =
          contentIntent === 'fiction'
            ? 'three_act'
            : contentIntent === 'informational'
              ? format === 'documentary' || format === 'news'
                ? 'Documentary Structure'
                : 'Instructional Structure'
              : contentIntent === 'commercial'
                ? 'Problem-Solution-Proof-CTA'
                : 'Segment Flow'
        coreConcept = {
          input_title: extractTitleFromInput(input),
          input_synopsis: input.slice(0, 500),
          core_themes: extractThemesFromGenreTone(effectiveGenre, effectiveTone),
          narrative_structure: narrativeStructure,
        }
      } else {
        coreConcept = await analyzeCoreConcept(input, { targetAudience, keyMessage, tone, genre, duration }, thinkingBudget)
      }
    }
    const coreConceptMs = Date.now() - coreConceptStartMs

    // Auto-detect film structure if not explicitly provided
    let effectiveBeatStructure = body.beatStructure
    let autoDetectedStructure: { structure: BeatStructureKey; confidence: number; reason: string } | null = null
    
    if (!effectiveBeatStructure) {
      autoDetectedStructure = autoDetectFilmStructure(input, coreConcept, format, cappedTargetMinutes)
      effectiveBeatStructure = autoDetectedStructure.structure
      console.log(`[Film Treatment] Auto-detected structure: ${effectiveBeatStructure} (confidence: ${autoDetectedStructure.confidence}, reason: ${autoDetectedStructure.reason})`)
    }

    // Prepare diversified variant styles
    const variantConfigs: Array<{ id: string; label: string; styleHint: string }> = [
      { id: 'A', label: 'A', styleHint: 'Contemporary, minimal, crisp pacing, clean visual language' },
      { id: 'B', label: 'B', styleHint: 'Nostalgic, warm, human-centric tone, cinematic texture' },
      { id: 'C', label: 'C', styleHint: 'Energetic, bold, high-contrast visuals, rhythmic editing' },
    ].slice(0, variantsCount)

    const context = { 
      targetAudience, 
      keyMessage, 
      tone, 
      genre, 
      duration, 
      platform, 
      format, 
      contentIntent,
      visualStyle: (body as any).visualStyle,
      targetMinutes: cappedTargetMinutes, 
      beatStructure: effectiveBeatStructure, 
      userName,
      hasExplicitSettings,
      rigor,
      thinkingBudget,
    }

    const variantsStartMs = Date.now()
    const variantResults = await Promise.all(
      variantConfigs.map(async (cfg) => {
        const v = await generateFilmTreatment(input, coreConcept!, { ...context, variantStyle: cfg.styleHint })
        return {
          id: cfg.id,
          label: cfg.label,
          ...v,
          beats: v.beats,
          estimatedDurationMinutes: v.estimatedDurationMinutes,
          total_duration_seconds: v.total_duration_seconds,
        }
      })
    )
    const variantsMs = Date.now() - variantsStartMs
    const totalMs = Date.now() - requestStartMs

    console.log('[Film Treatment] timing', {
      coreConceptMs,
      variantsMs,
      variantCount: variantsCount,
      rigor,
      thinkingBudget,
      totalMs,
    })

    const includeDebugTiming = request.headers.get('x-debug-timing') === '1'
    const responseData = {
      success: true,
      data: variantResults[0],
      variants: variantResults,
      message: 'Film treatment variants generated successfully',
      ...(autoDetectedStructure && {
        autoDetectedStructure: {
          structure: autoDetectedStructure.structure,
          label: BEAT_STRUCTURES[autoDetectedStructure.structure]?.label,
          confidence: autoDetectedStructure.confidence,
          reason: autoDetectedStructure.reason
        }
      }),
      ...(includeDebugTiming && {
        debug: {
          timing: { coreConceptMs, variantsMs, variantCount: variantsCount, rigor, thinkingBudget, totalMs },
        },
      }),
    }

    return NextResponse.json(responseData)

  } catch (error) {
    console.error('❌ Film Treatment Error:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to generate film treatment'
    }, { status: 500 })
  }
}

async function generateFilmTreatment(
  input: string,
  coreConcept: CoreConceptData,
  context: any,
  attempt: number = 1
): Promise<FilmTreatmentItem> {
  const maxAttempts = 2 // Allow 1 retry
  const targetMinutes = context?.targetMinutes || 20
  
  // Add stricter JSON formatting instruction on retry
  const retryHint = attempt > 1 
    ? '\n\nCRITICAL: Previous response had JSON errors. Ensure ALL arrays use commas between elements, ALL strings are properly escaped, and NO control characters exist in strings.'
    : ''
  
  const prompt = buildTreatmentPrompt({
    input,
    coreConcept,
    format: context?.format || 'short_film',
    targetMinutes,
    styleHint: context?.variantStyle,
    context,
    beatStructure: context?.beatStructure ? { label: BEAT_STRUCTURES[context.beatStructure as BeatStructureKey]?.label, beats: (BEAT_STRUCTURES[context.beatStructure as BeatStructureKey]?.beats || []).map(b => ({ title: b.title })) } : null,
    persona: (context as any)?.persona ?? null,
    hasExplicitSettings: context?.hasExplicitSettings,
    contentIntent: context?.contentIntent,
    rigor: context?.rigor || 'thorough',
  }) + retryHint + strictJsonPromptSuffix

  const thinkingBudget = context?.thinkingBudget ?? getThinkingBudgetForRigor(context?.rigor || 'thorough')
  console.log(`[Film Treatment] Calling Vertex AI Gemini (thinkingBudget=${thinkingBudget})...`)
  
  const result = await generateText(prompt, {
    model: 'gemini-2.5-flash',
    temperature: 0.3,
    topP: 0.9,
    responseMimeType: 'application/json',
    thinkingBudget,
  })

  if (!result?.text) {
    throw new Error('No response from Vertex AI Gemini')
  }

  const generatedText = result.text

  try {
    const parsedRaw = safeParseJsonFromText(generatedText)
    const parsed = repairTreatment(parsedRaw)
    
    // Normalize beats to target duration if model deviates
    const beats = Array.isArray(parsed.beats) ? parsed.beats : []
    const normalizedBeats = normalizeDuration(
      beats.map((b: any) => ({ title: b.title || 'Segment', summary: b.intent || '', minutes: Number(b.minutes) || 1 })),
      targetMinutes
    )
    const filmTreatmentText = (parsed as any).film_treatment || parsed.synopsis || 'Comprehensive film treatment'
    
    // Calculate total duration from beats (in seconds)
    const totalDurationSeconds = normalizedBeats.reduce((sum: number, b: any) => sum + ((b.minutes || 1) * 60), 0)
    
    // Prepare the result object
    const result = {
      // Legacy minimal
      film_treatment: filmTreatmentText,
      visual_style: parsed.visual_style || parsed.style || 'Professional visual style',
      tone_description: parsed.tone_description || parsed.tone || 'Engaging and informative tone',
      target_audience: parsed.target_audience || 'General audience',

      // Structured
      title: parsed.title,
      logline: parsed.logline,
      genre: parsed.genre,
      format_length: `${totalDurationSeconds} seconds`,
      author_writer: context?.userName || 'User',
      date: new Date().toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }),

      synopsis: parsed.synopsis,
      setting: parsed.setting,
      protagonist: parsed.protagonist,
      antagonist: parsed.antagonist,
      act_breakdown: (parsed as any).act_breakdown,

      tone: parsed.tone,
      style: parsed.style,
      themes: parsed.themes,
      mood_references: parsed.mood_references,

      character_descriptions: Array.isArray((parsed as any).character_descriptions)
        ? ((parsed as any).character_descriptions as any[]).map((c: any) => ({
            name: String(c?.name || ''),
            role: String(c?.role || 'supporting'),
            subject: String(c?.subject || c?.name || ''),
            ethnicity: String(c?.ethnicity || ''),
            keyFeature: String(c?.keyFeature || ''),
            hairStyle: String(c?.hairStyle || ''),
            hairColor: String(c?.hairColor || ''),
            eyeColor: String(c?.eyeColor || ''),
            expression: String(c?.expression || ''),
            build: String(c?.build || ''),
            defaultWardrobe: String(c?.defaultWardrobe || ''),
            wardrobeAccessories: String(c?.wardrobeAccessories || ''),
            description: String(c?.description || ''),
            imagePrompt: c?.imagePrompt || c?.image_prompt ? String(c.imagePrompt || c.image_prompt) : undefined,
            referenceImage: null,
            generating: false,
            version: 1,
            lastModified: new Date().toISOString(),
          }))
        : undefined,
      
      scene_descriptions: Array.isArray((parsed as any).scene_descriptions)
        ? ((parsed as any).scene_descriptions as any[]).map((s: any) => ({
            name: String(s?.name || ''),
            type: String(s?.type || 'INT'),
            location: String(s?.location || ''),
            atmosphere: String(s?.atmosphere || ''),
            furniture_props: String(s?.furniture_props || '')
          }))
        : undefined,
      
      // Embed summarized beats and estimate
      beats: normalizedBeats.map((b: any, i: number) => ({
        title: beats[i]?.title || b.title,
        intent: beats[i]?.intent,
        minutes: b.minutes,
        synopsis: beats[i]?.synopsis
      })),
      estimatedDurationMinutes: targetMinutes,
      total_duration_seconds: totalDurationSeconds,
      
      // Narrative reasoning - now flattened at root level
      narrative_reasoning: {
        character_focus: String((parsed as any).character_focus || 'Not provided by AI'),
        key_decisions: Array.isArray((parsed as any).key_decisions) 
          ? ((parsed as any).key_decisions as any[]).map((d: any) => ({
              decision: String(d.decision || ''),
              why: String(d.why || ''),
              impact: String(d.impact || '')
            }))
          : [],
        story_strengths: String((parsed as any).story_strengths || 'Not provided by AI'),
        user_adjustments: String((parsed as any).user_adjustments || 'Regenerate the treatment to see AI reasoning')
      }
    }
    
    console.log('[Film Treatment] narrative_reasoning fields present:', !!((parsed as any).character_focus || (parsed as any).story_strengths))
    if ((parsed as any).character_focus || (parsed as any).story_strengths) {
      console.log('[Film Treatment] narrative_reasoning data:', JSON.stringify({
        character_focus: (parsed as any).character_focus,
        key_decisions: (parsed as any).key_decisions,
        story_strengths: (parsed as any).story_strengths,
        user_adjustments: (parsed as any).user_adjustments
      }, null, 2))
    }
    
    return result
    
  } catch (parseError: any) {
    // Retry on JSON parse errors if attempts remaining
    if (attempt < maxAttempts) {
      console.warn(`[Film Treatment] JSON parse failed on attempt ${attempt}, retrying...`)
      return generateFilmTreatment(input, coreConcept, context, attempt + 1)
    }
    
    // Log the error with context
    console.error('[Film Treatment] JSON parse failed after all attempts:', {
      error: parseError.message,
      attempt,
      textPreview: generatedText.substring(0, 500)
    })
    throw parseError
  }
}

async function analyzeCoreConcept(
  input: string,
  context: any,
  thinkingBudget: number = 1024
): Promise<CoreConceptData> {
  const prompt = `CRITICAL INSTRUCTIONS: Analyze the input and extract ONLY the core concept. Avoid copying text.

INPUT:
${input}

CONTEXT:
- Target Audience: ${context?.targetAudience || 'General'}
- Key Message: ${context?.keyMessage || 'Not specified'}
- Tone: ${context?.tone || 'Professional'}
- Genre: ${context?.genre || 'Documentary'}
- Duration: ${context?.duration || 60} seconds

Respond with valid JSON only:
{
  "input_title": "Descriptive title",
  "input_synopsis": "Brief overview (≤50 words)",
  "core_themes": ["Theme 1", "Theme 2"],
  "narrative_structure": "3-Act Structure"
}` + strictJsonPromptSuffix

  console.log('[Film Treatment] Analyzing core concept with Vertex AI Gemini...')

  const result = await generateText(prompt, {
    model: 'gemini-2.5-flash',
    temperature: 0.3,
    topP: 0.9,
    responseMimeType: 'application/json',
    thinkingBudget,
  })

  if (!result?.text) {
    throw new Error('No response from Vertex AI Gemini (core concept)')
  }

  const generatedText = result.text
  const parsed = safeParseJsonFromText(generatedText)
  return {
    input_title: parsed.input_title || 'Core Concept',
    input_synopsis: parsed.input_synopsis || 'Brief overview of the concept',
    core_themes: Array.isArray(parsed.core_themes) ? parsed.core_themes : ['General'],
    narrative_structure: parsed.narrative_structure || '3-Act Structure'
  }
}
