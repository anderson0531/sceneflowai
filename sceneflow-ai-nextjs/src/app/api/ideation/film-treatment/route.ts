import { NextRequest, NextResponse } from 'next/server'
import { strictJsonPromptSuffix, safeParseJsonFromText } from '@/lib/safeJson'
import { analyzeDuration, normalizeDuration } from '@/lib/treatment/duration'
import { buildTreatmentPrompt } from '@/lib/treatment/prompts'
import { BEAT_STRUCTURES, type BeatStructureKey } from '@/lib/treatment/structures'
import { repairTreatment } from '@/lib/treatment/validate'

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
  format?: 'youtube'|'short_film'|'documentary'|'education'|'training'
  targetMinutes?: number  // Legacy, kept for backward compatibility
  filmType?: 'micro_short'|'short_film'|'featurette'|'feature_length'|'epic'
  rigor?: 'fast'|'balanced'|'thorough'
  beatStructure?: BeatStructureKey
  variants?: number // default 3
  userName?: string  // User's name for "Created By" field
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

export async function POST(request: NextRequest) {
  try {
    const body: FilmTreatmentRequest = await request.json()
    const { input, targetAudience, keyMessage, tone, genre, duration, platform, userName } = body
    let { coreConcept } = body
    const variantsCount = Math.max(1, Math.min(body.variants || 1, 5))
    const format = body.format || 'documentary'
    // Prefer filmType over targetMinutes, but fall back to analyzeDuration if neither provided
    const targetMinutes = body.filmType 
      ? getFilmTypeMinutes(body.filmType)
      : (body.targetMinutes || analyzeDuration(input, 20))

    if (!input) {
      return NextResponse.json({ success: false, message: 'Input content is required' }, { status: 400 })
    }

    const apiKey = process.env.GOOGLE_GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ success: false, message: 'Google Gemini API key not configured' }, { status: 500 })
    }


    // Derive core concept if not provided
    if (!coreConcept) {
      coreConcept = await analyzeCoreConcept(input, { targetAudience, keyMessage, tone, genre, duration }, apiKey)
    }

    // Prepare diversified variant styles
    const variantConfigs: Array<{ id: string; label: string; styleHint: string }> = [
      { id: 'A', label: 'A', styleHint: 'Contemporary, minimal, crisp pacing, clean visual language' },
      { id: 'B', label: 'B', styleHint: 'Nostalgic, warm, human-centric tone, cinematic texture' },
      { id: 'C', label: 'C', styleHint: 'Energetic, bold, high-contrast visuals, rhythmic editing' },
    ].slice(0, variantsCount)

    const context = { targetAudience, keyMessage, tone, genre, duration, platform, format, targetMinutes, beatStructure: body.beatStructure, userName }

    // Generate variants serially (keeps logs clearer); can parallelize later if needed
    const variants: Array<{ id: string; label: string } & FilmTreatmentItem> = []
    for (const cfg of variantConfigs) {
      const v = await generateFilmTreatment(input, coreConcept!, { ...context, variantStyle: cfg.styleHint }, apiKey)
      variants.push({ 
        id: cfg.id, 
        label: cfg.label, 
        ...v,
        // Explicitly preserve critical fields to ensure they're not stripped
        beats: v.beats,
        estimatedDurationMinutes: v.estimatedDurationMinutes,
        total_duration_seconds: v.total_duration_seconds
      })
    }


    const responseData = {
      success: true,
      data: variants[0],
      variants,
      message: 'Film treatment variants generated successfully'
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
  apiKey: string,
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
    format: context?.format || 'documentary',
    targetMinutes,
    styleHint: context?.variantStyle,
    context,
    beatStructure: context?.beatStructure ? { label: BEAT_STRUCTURES[context.beatStructure as BeatStructureKey]?.label, beats: (BEAT_STRUCTURES[context.beatStructure as BeatStructureKey]?.beats || []).map(b => ({ title: b.title })) } : null,
    persona: (context as any)?.persona ?? null
  }) + retryHint + strictJsonPromptSuffix

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'object',
          properties: {
            narrative_reasoning: {
              type: 'object',
              required: ['character_focus', 'key_decisions', 'story_strengths', 'user_adjustments'],
              properties: {
                character_focus: { type: 'string' },
                key_decisions: {
                  type: 'array',
                  items: {
                    type: 'object',
                    required: ['decision', 'why', 'impact'],
                    properties: {
                      decision: { type: 'string' },
                      why: { type: 'string' },
                      impact: { type: 'string' }
                    }
                  }
                },
                story_strengths: { type: 'string' },
                user_adjustments: { type: 'string' }
              }
            },
            title: { type: 'string' },
            logline: { type: 'string' },
            synopsis: { type: 'string' },
            beats: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  intent: { type: 'string' },
                  synopsis: { type: 'string' },
                  minutes: { type: 'number' }
                }
              }
            },
            character_descriptions: { type: 'array' },
            scene_descriptions: { type: 'array' }
          },
          required: ['narrative_reasoning', 'title', 'logline', 'synopsis', 'beats']
        }
      }
    }),
  })

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`)
  }

  const data = await response.json()
  const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text

  if (!generatedText) {
    throw new Error('No response from Gemini API')
  }

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
      
      // Narrative reasoning
      narrative_reasoning: (parsed as any).narrative_reasoning ? {
        character_focus: String((parsed as any).narrative_reasoning.character_focus || ''),
        key_decisions: Array.isArray((parsed as any).narrative_reasoning.key_decisions) 
          ? ((parsed as any).narrative_reasoning.key_decisions as any[]).map((d: any) => ({
              decision: String(d.decision || ''),
              why: String(d.why || ''),
              impact: String(d.impact || '')
            }))
          : [],
        story_strengths: String((parsed as any).narrative_reasoning.story_strengths || ''),
        user_adjustments: String((parsed as any).narrative_reasoning.user_adjustments || '')
      } : undefined
    }
    
    console.log('[Film Treatment] narrative_reasoning present:', !!(parsed as any).narrative_reasoning)
    if ((parsed as any).narrative_reasoning) {
      console.log('[Film Treatment] narrative_reasoning data:', JSON.stringify((parsed as any).narrative_reasoning, null, 2))
    }
    
    return result
    
  } catch (parseError: any) {
    // Retry on JSON parse errors if attempts remaining
    if (attempt < maxAttempts) {
      console.warn(`[Film Treatment] JSON parse failed on attempt ${attempt}, retrying...`)
      return generateFilmTreatment(input, coreConcept, context, apiKey, attempt + 1)
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
  apiKey: string
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

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
  })
  if (!response.ok) throw new Error(`Gemini API error (core concept): ${response.status}`)
  const data = await response.json()
  const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!generatedText) throw new Error('No response from Gemini API (core concept)')
  const parsed = safeParseJsonFromText(generatedText)
  return {
    input_title: parsed.input_title || 'Core Concept',
    input_synopsis: parsed.input_synopsis || 'Brief overview of the concept',
    core_themes: Array.isArray(parsed.core_themes) ? parsed.core_themes : ['General'],
    narrative_structure: parsed.narrative_structure || '3-Act Structure'
  }
}
