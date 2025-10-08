import { NextRequest, NextResponse } from 'next/server'
import { strictJsonPromptSuffix, safeParseJsonFromText } from '@/lib/safeJson'

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
  variants?: number // default 3
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

export async function POST(request: NextRequest) {
  try {
    const body: FilmTreatmentRequest = await request.json()
    const { input, targetAudience, keyMessage, tone, genre, duration, platform } = body
    let { coreConcept } = body
    const variantsCount = Math.max(1, Math.min(body.variants || 3, 5))

    if (!input) {
      return NextResponse.json({ success: false, message: 'Input content is required' }, { status: 400 })
    }

    const apiKey = process.env.GOOGLE_GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ success: false, message: 'Google Gemini API key not configured' }, { status: 500 })
    }

    console.log('🎬 Film Treatment Generation - Input length:', input.length)

    // Derive core concept if not provided
    if (!coreConcept) {
      console.log('🧠 Deriving core concept (not provided) ...')
      coreConcept = await analyzeCoreConcept(input, { targetAudience, keyMessage, tone, genre, duration }, apiKey)
    }

    // Prepare diversified variant styles
    const variantConfigs: Array<{ id: string; label: string; styleHint: string }> = [
      { id: 'A', label: 'A', styleHint: 'Contemporary, minimal, crisp pacing, clean visual language' },
      { id: 'B', label: 'B', styleHint: 'Nostalgic, warm, human-centric tone, cinematic texture' },
      { id: 'C', label: 'C', styleHint: 'Energetic, bold, high-contrast visuals, rhythmic editing' },
    ].slice(0, variantsCount)

    const context = { targetAudience, keyMessage, tone, genre, duration, platform }

    // Generate variants serially (keeps logs clearer); can parallelize later if needed
    const variants: Array<{ id: string; label: string } & FilmTreatmentItem> = []
    for (const cfg of variantConfigs) {
      const v = await generateFilmTreatment(input, coreConcept!, { ...context, variantStyle: cfg.styleHint }, apiKey)
      variants.push({ id: cfg.id, label: cfg.label, ...v })
    }

    return NextResponse.json({
      success: true,
      data: variants[0], // backward compatibility
      variants,
      message: 'Film treatment variants generated successfully'
    })

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
  apiKey: string
): Promise<FilmTreatmentItem> {
  
  const prompt = `CRITICAL INSTRUCTIONS: You are a professional film treatment writer. Create a treatment based on the core concept, NOT by copying the input.

INPUT:
${input}

CORE CONCEPT:
- Title: ${coreConcept.input_title}
- Synopsis: ${coreConcept.input_synopsis}
- Themes: ${coreConcept.core_themes.join(', ')}
- Structure: ${coreConcept.narrative_structure}

CONTEXT:
- Target Audience: ${context.targetAudience || 'General'}
- Key Message: ${context.keyMessage || 'Not specified'}
- Tone: ${context.tone || 'Professional'}
- Genre: ${context.genre || 'Documentary'}
- Duration: ${context.duration || 60} seconds
- Platform: ${context.platform || 'Multi-platform'}
 - Variant Style: ${context.variantStyle || 'Default professional style'}

CRITICAL RULES:
1. DO NOT copy or repeat the input content
2. Create ORIGINAL treatment based on the core concept
3. Focus on VISION and APPROACH, not scene details
4. Keep treatment under 100 words - be CONCISE
5. Describe HOW to tell the story, not WHAT happens

TASK: Create a comprehensive film treatment that includes:
1. Treatment description (≤100 words) - VISION ONLY, no scene details
2. Visual style and aesthetic approach
3. Tone and mood description
4. Target audience specifics

Respond with valid JSON only (no markdown fences, no backticks). Use EXACT keys below:
{
  "title": "Proposed title",
  "logline": "One or two-sentence summary",
  "genre": "Genre",
  "format_length": "Feature (90-120m) | Short (5-40m) | Series Pilot | ...",
  "target_audience": "Primary demographic",
  "author_writer": "Author/Writer name",
  "date": "YYYY-MM-DD",

  "synopsis": "Concise overview of the entire plot (paragraph)",
  "setting": "Time/place and world rules",
  "protagonist": "Main character brief (goal/flaw)",
  "antagonist": "Primary opposing force/conflict",
  "act_breakdown": {
    "act1": "Beginning: setup/inciting incident/main goal",
    "act2": "Middle: rising action/complications/midpoint",
    "act3": "End: climax/resolution/transformation"
  },

  "tone": "Overall mood",
  "style": "Visual/narrative approach",
  "themes": ["Theme 1", "Theme 2"],
  "mood_references": ["Reference 1", "Reference 2"],

  "character_descriptions": [
    { "name": "Name", "description": "Concise", "image_prompt": "Concise generative prompt" }
  ]
}` + strictJsonPromptSuffix

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: prompt
        }]
      }]
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

  console.log('🎬 Gemini Film Treatment Response:', generatedText)

  const parsed = safeParseJsonFromText(generatedText)
  const filmTreatmentText = parsed.film_treatment || parsed.synopsis || 'Comprehensive film treatment'
  return {
    // Legacy minimal
    film_treatment: filmTreatmentText,
    visual_style: parsed.visual_style || parsed.style || 'Professional visual style',
    tone_description: parsed.tone_description || parsed.tone || 'Engaging and informative tone',
    target_audience: parsed.target_audience || 'General audience',

    // Structured
    title: parsed.title,
    logline: parsed.logline,
    genre: parsed.genre,
    format_length: parsed.format_length,
    author_writer: parsed.author_writer,
    date: parsed.date,

    synopsis: parsed.synopsis,
    setting: parsed.setting,
    protagonist: parsed.protagonist,
    antagonist: parsed.antagonist,
    act_breakdown: parsed.act_breakdown,

    tone: parsed.tone,
    style: parsed.style,
    themes: parsed.themes,
    mood_references: parsed.mood_references,

    character_descriptions: Array.isArray(parsed.character_descriptions) ? parsed.character_descriptions : undefined
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
