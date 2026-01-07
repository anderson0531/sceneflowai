import { NextRequest, NextResponse } from 'next/server'
import { safeParseJsonFromText, strictJsonPromptSuffix } from '@/lib/safeJson'
import { generateText } from '@/lib/vertexai/gemini'

// ============================================================================
// PHASE 1 OPTIMIZATION: Direct Function Calls (No HTTP Overhead)
// ============================================================================

// Consolidated Type Definitions
interface CoreConceptData {
  input_title: string
  input_synopsis: string
  core_themes: string[]
  narrative_structure: string
}

interface FilmTreatmentData {
  film_treatment: string
  visual_style: string
  tone_description: string
  target_audience: string
}

interface Character {
  name: string
  role: 'Protagonist' | 'Antagonist' | 'Supporting' | 'Narrator' | 'Expert' | 'Host'
  description: string
  importance: 'High' | 'Medium' | 'Low'
  key_traits: string[]
}

interface CharacterBreakdownData {
  characters: Character[]
  character_relationships: string[]
  character_arcs: string[]
}

interface Beat {
  beat_number: number
  beat_title: string
  beat_description: string
  duration_estimate: string
  key_elements: string[]
  visual_cues: string[]
  audio_cues: string[]
}

interface Act {
  title: string
  duration: string
  beats: Beat[]
}

interface BeatSheetData {
  act_structure: {
    act_1: Act
    act_2: Act
    act_3: Act
  }
  total_duration: string
  pacing_notes: string[]
  transition_notes: string[]
}

// ============================================================================
// EXTRACTED CORE FUNCTIONS (Phase 1: Direct Function Calls)
// ============================================================================

type Provider = 'gemini' | 'openai'

interface ModelConfig {
  provider: Provider
  model: string
  geminiApiKey?: string
  openaiApiKey?: string
}

// Local legacy helper removed in favor of shared import

async function callLLM(modelConfig: ModelConfig, prompt: string): Promise<string> {
  const { provider, model, geminiApiKey, openaiApiKey } = modelConfig

  if (provider === 'openai') {
    if (!openaiApiKey) throw new Error('OpenAI API key not configured')
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          { role: 'system', content: 'You are a structured writer. Always return ONLY valid JSON matching the requested schema.' },
          { role: 'user', content: prompt }
        ]
      })
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`)
    }
    const data = await response.json()
    const content: string | undefined = data.choices?.[0]?.message?.content
    if (!content) throw new Error('No response from OpenAI API')
    return content
  }

  // Default: Use Vertex AI Gemini (migrated from deprecated consumer API)
  console.log('[Generate Sequential] Calling Vertex AI Gemini...')
  const generatedText = await generateText(prompt, { model: 'gemini-2.5-flash' })
  if (!generatedText) throw new Error('No response from Vertex AI Gemini')
  return generatedText
}

async function analyzeCoreConcept(
  input: string, 
  context: any, 
  modelConfig: ModelConfig
): Promise<CoreConceptData> {
  const prompt = `CRITICAL INSTRUCTIONS: You are a professional script analyst. Analyze this input and extract ONLY the core concept.

INPUT:
${input}

CONTEXT:
- Target Audience: ${context.targetAudience || 'General'}
- Key Message: ${context.keyMessage || 'Not specified'}
- Tone: ${context.tone || 'Professional'}
- Genre: ${context.genre || 'Documentary'}
- Duration: ${context.duration || 300} seconds (minimum 5 minutes)

CRITICAL RULES:
1. If the input is a detailed script, DO NOT copy the script content
2. Create ORIGINAL summaries based on the script's themes and structure
3. Extract the ESSENCE, not the details
4. Keep synopsis under 50 words - be CONCISE
5. Focus on the CORE MESSAGE, not scene-by-scene details

TASK: Extract the core concept by:
1. Creating a descriptive title (not copying script titles)
2. Writing a brief synopsis (≤50 words) - SUMMARIZE, don't copy
3. Identifying core themes (extract main ideas)
4. Determining the best narrative structure

Respond with valid JSON only:
{
  "input_title": "Descriptive title based on the input",
  "input_synopsis": "Brief overview summary (≤50 words) - ORIGINAL SUMMARY ONLY",
  "core_themes": ["Theme 1", "Theme 2", "Theme 3"],
  "narrative_structure": "3-Act Structure" | "5-Act Structure" | "Hero's Journey" | "Documentary Structure" | "Series Structure" | "Experimental Structure"
}` + strictJsonPromptSuffix

  const generatedText = await callLLM(modelConfig, prompt)

  console.log('🎯 Direct Core Concept Response:', generatedText)

  const parsed = safeParseJsonFromText(generatedText)
  return {
    input_title: parsed.input_title || 'Core Concept',
    input_synopsis: parsed.input_synopsis || 'Brief overview of the concept',
    core_themes: Array.isArray(parsed.core_themes) ? parsed.core_themes : ['General'],
    narrative_structure: parsed.narrative_structure || '3-Act Structure'
  }
}

async function generateFilmTreatment(
  input: string,
  coreConcept: CoreConceptData,
  context: any,
  modelConfig: ModelConfig
): Promise<FilmTreatmentData> {
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
- Duration: ${context.duration || 300} seconds (minimum 5 minutes)
- Platform: ${context.platform || 'Multi-platform'}

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

Respond with valid JSON only (no markdown fences, no backticks, no comments):
{
  "film_treatment": "Treatment vision and approach (≤100 words) - NO SCENE DETAILS",
  "visual_style": "Visual aesthetic and style approach",
  "tone_description": "Detailed tone and mood description",
  "target_audience": "Specific target audience description"
}` + strictJsonPromptSuffix

  const generatedText = await callLLM(modelConfig, prompt)

  console.log('🎬 Direct Film Treatment Response:', generatedText)

  const parsed = safeParseJsonFromText(generatedText)
  return {
    film_treatment: parsed.film_treatment || 'Comprehensive film treatment',
    visual_style: parsed.visual_style || 'Professional visual style',
    tone_description: parsed.tone_description || 'Engaging and informative tone',
    target_audience: parsed.target_audience || 'General audience'
  }
}

async function generateCharacterBreakdown(
  input: string,
  coreConcept: CoreConceptData,
  context: any,
  modelConfig: ModelConfig
): Promise<CharacterBreakdownData> {
  const prompt = `CRITICAL INSTRUCTIONS: You are a professional character analyst. Identify ALL characters from the input, focusing on their ESSENTIAL traits and roles.

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
- Duration: ${context.duration || 300} seconds (minimum 5 minutes)

CRITICAL RULES:
1. Identify EVERY character mentioned in the input
2. Focus on ESSENTIAL traits, not detailed descriptions
3. Be CONCISE in character descriptions
4. Identify clear roles and importance levels
5. Extract key relationships and arcs

TASK: Identify and analyze all characters by:
1. Extracting ALL characters mentioned in the input
2. Determining their roles and importance
3. Describing their key traits and characteristics (CONCISE)
4. Identifying relationships between characters
5. Outlining potential character arcs

Respond with valid JSON only:
{
  "characters": [
    {
      "name": "Character Name",
      "role": "Protagonist" | "Antagonist" | "Supporting" | "Narrator" | "Expert" | "Host",
      "description": "Concise character description (≤30 words)",
      "importance": "High" | "Medium" | "Low",
      "key_traits": ["Trait 1", "Trait 2", "Trait 3"]
    }
  ],
  "character_relationships": ["Relationship 1", "Relationship 2"],
  "character_arcs": ["Arc 1", "Arc 2"]
}` + strictJsonPromptSuffix

  const generatedText = await callLLM(modelConfig, prompt)

  console.log('👥 Direct Character Breakdown Response:', generatedText)

  const parsed = safeParseJsonFromText(generatedText)
  return {
    characters: Array.isArray(parsed.characters) ? parsed.characters : [],
    character_relationships: Array.isArray(parsed.character_relationships) ? parsed.character_relationships : [],
    character_arcs: Array.isArray(parsed.character_arcs) ? parsed.character_arcs : []
  }
}

async function generateBeatSheet(
  input: string,
  coreConcept: CoreConceptData,
  filmTreatment: FilmTreatmentData,
  characters: Character[],
  context: any,
  modelConfig: ModelConfig
): Promise<BeatSheetData> {
  const prompt = `CRITICAL INSTRUCTIONS: You are a professional beat sheet writer. Create a detailed beat sheet based on the analysis, NOT by copying the input.

INPUT:
${input}

CORE CONCEPT:
- Title: ${coreConcept.input_title}
- Synopsis: ${coreConcept.input_synopsis}
- Themes: ${coreConcept.core_themes.join(', ')}
- Structure: ${coreConcept.narrative_structure}

FILM TREATMENT:
- Treatment: ${filmTreatment.film_treatment}
- Visual Style: ${filmTreatment.visual_style}
- Tone: ${filmTreatment.tone_description}
- Target Audience: ${filmTreatment.target_audience}

CHARACTERS:
${characters.map(char => `- ${char.name} (${char.role}): ${char.description}`).join('\n')}

CONTEXT:
- Target Audience: ${context.targetAudience || 'General'}
- Key Message: ${context.keyMessage || 'Not specified'}
- Tone: ${context.tone || 'Professional'}
- Genre: ${context.genre || 'Documentary'}
- Duration: ${context.duration || 300} seconds (minimum 5 minutes)
- Platform: ${context.platform || 'Multi-platform'}

CRITICAL RULES:
1. DO NOT copy or repeat the input content
2. Create ORIGINAL beat descriptions based on the analysis
3. Focus on STRUCTURE and PACING, not scene details
4. Each beat should be CONCISE but informative
5. Use the characters and themes to guide the beats

TASK: Create a detailed beat sheet with:
1. Three-act structure with specific beats
2. Each beat should have detailed descriptions (ORIGINAL, not copied)
3. Duration estimates that add up to the total duration
4. Visual and audio cues for each beat
5. Pacing and transition notes

CRITICAL: Total duration of all beats must equal ${context.duration || 300} seconds (minimum 5 minutes).

Respond with valid JSON only:
{
  "act_structure": {
    "act_1": {
      "title": "Setup",
      "duration": "25% of total",
      "beats": [
        {
          "beat_number": 1,
          "beat_title": "Opening Hook",
          "beat_description": "Detailed description of what happens",
          "duration_estimate": "5-10% of total",
          "key_elements": ["Element 1", "Element 2"],
          "visual_cues": ["Visual 1", "Visual 2"],
          "audio_cues": ["Audio 1", "Audio 2"]
        }
      ]
    },
    "act_2": {
      "title": "Development",
      "duration": "50% of total",
      "beats": [
        {
          "beat_number": 2,
          "beat_title": "Main Content",
          "beat_description": "Detailed description of core content",
          "duration_estimate": "30-40% of total",
          "key_elements": ["Element 1", "Element 2"],
          "visual_cues": ["Visual 1", "Visual 2"],
          "audio_cues": ["Audio 1", "Audio 2"]
        }
      ]
    },
    "act_3": {
      "title": "Resolution",
      "duration": "25% of total",
      "beats": [
        {
          "beat_number": 3,
          "beat_title": "Call to Action",
          "beat_description": "Clear conclusion and CTA",
          "duration_estimate": "15-20% of total",
          "key_elements": ["Element 1", "Element 2"],
          "visual_cues": ["Visual 1", "Visual 2"],
          "audio_cues": ["Audio 1", "Audio 2"]
        }
      ]
    }
  },
  "total_duration": "${context.duration || 60} seconds",
  "pacing_notes": ["Note 1", "Note 2"],
  "transition_notes": ["Transition 1", "Transition 2"]
}` + strictJsonPromptSuffix

  const generatedText = await callLLM(modelConfig, prompt)

  console.log('📋 Direct Beat Sheet Response:', generatedText)

  const parsed = JSON.parse(generatedText)
  return {
    act_structure: parsed.act_structure || {
      act_1: { title: 'Setup', duration: '25%', beats: [] },
      act_2: { title: 'Development', duration: '50%', beats: [] },
      act_3: { title: 'Resolution', duration: '25%', beats: [] }
    },
    total_duration: parsed.total_duration || `${context.duration || 60} seconds`,
    pacing_notes: Array.isArray(parsed.pacing_notes) ? parsed.pacing_notes : [],
    transition_notes: Array.isArray(parsed.transition_notes) ? parsed.transition_notes : []
  }
}

interface SequentialGenerationRequest {
  input: string
  targetAudience?: string
  keyMessage?: string
  tone?: string
  genre?: string
  duration?: number
  platform?: string
  provider?: Provider
  model?: string
}

interface SequentialGenerationResponse {
  success: boolean
  data: {
    core_concept: any
    film_treatment: any
    character_breakdown: any
    beat_sheet: any
    combined_result: any
  }
  message: string
}

export async function POST(request: NextRequest) {
  try {
    const body: SequentialGenerationRequest = await request.json()
    const { input, targetAudience, keyMessage, tone, genre, duration, platform, provider, model } = body

    if (!input) {
      return NextResponse.json({
        success: false,
        message: 'Input content is required'
      }, { status: 400 })
    }

    console.log('🔄 Sequential Generation - Input length:', input.length)
    console.log('🚀 PHASE 1: Using DIRECT function calls (No HTTP overhead)...')
    console.log('🔄 Input content preview:', input.substring(0, 200))

    // Resolve provider/model and API keys with Gemini-first fallback when auto
    const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY
    const openaiApiKey = process.env.OPENAI_API_KEY

    const userProvider = provider && (provider as any) !== 'auto' ? (provider as Provider) : null
    const hasGemini = !!geminiApiKey
    const hasOpenAI = !!openaiApiKey

    const pick = (p: Provider) => ({
      provider: p,
      model: p === 'openai'
        ? ((model && (model as any) !== 'auto') ? model : (process.env.OPENAI_MODEL || 'gpt-5'))
        : ((model && (model as any) !== 'auto') ? model : (process.env.GEMINI_MODEL || 'gemini-3.0-flash'))
    })

    const candidates: Provider[] = userProvider
      ? [userProvider]
      : (hasGemini && hasOpenAI ? ['gemini','openai'] : (hasGemini ? ['gemini'] : ['openai']))

    const context = { targetAudience, keyMessage, tone, genre, duration, platform }

    let lastErr: any = null
    for (const p of candidates) {
      const { provider: tryProvider, model: tryModel } = pick(p)

      if (tryProvider === 'openai' && !openaiApiKey) {
        lastErr = new Error('OpenAI API key not configured')
        continue
      }
      if (tryProvider === 'gemini' && !geminiApiKey) {
        lastErr = new Error('Google Gemini API key not configured')
        continue
      }

      const modelConfig: ModelConfig = { provider: tryProvider, model: tryModel, geminiApiKey, openaiApiKey }
      console.log(`🤖 Trying provider ${tryProvider} model ${tryModel}`)
      try {
        // Step 1: Direct Core Concept Analysis (No HTTP call)
        console.log('🚀 Step 1: Direct Core Concept Analysis')
        const coreConceptData = await analyzeCoreConcept(input, context, modelConfig)
        console.log('✅ Core Concept Analysis completed (Direct call)')

        // Step 2: Direct Film Treatment Generation (No HTTP call)
        console.log('🚀 Step 2: Direct Film Treatment Generation')
        const filmTreatmentData = await generateFilmTreatment(input, coreConceptData, context, modelConfig)
        console.log('✅ Film Treatment Generation completed (Direct call)')

        // Step 3: Direct Character Breakdown (No HTTP call)
        console.log('🚀 Step 3: Direct Character Breakdown')
        const characterBreakdownData = await generateCharacterBreakdown(input, coreConceptData, context, modelConfig)
        console.log('✅ Character Breakdown completed (Direct call)')

        // Step 4: Direct Beat Sheet Generation (No HTTP call)
        console.log('🚀 Step 4: Direct Beat Sheet Generation')
        const beatSheetData = await generateBeatSheet(input, coreConceptData, filmTreatmentData, characterBreakdownData.characters, context, modelConfig)
        console.log('✅ Beat Sheet Generation completed (Direct call)')

        // Combine all results (Phase 1: Direct data access)
        const combinedResult = {
          script_analysis: {
            input_title: coreConceptData.input_title,
            input_synopsis: coreConceptData.input_synopsis,
            input_treatment: filmTreatmentData.film_treatment,
            characters: characterBreakdownData.characters,
            core_themes: coreConceptData.core_themes
          },
          video_concepts: [{
            id: 'generated-concept-1',
            title: coreConceptData.input_title,
            concept_synopsis: coreConceptData.input_synopsis,
            concept_approach: filmTreatmentData.film_treatment,
            narrative_structure: coreConceptData.narrative_structure,
            act_structure: beatSheetData.act_structure,
            thumbnail_prompt: `Visual representation of ${coreConceptData.input_title}`,
            strength_rating: 4.5
          }]
        }

        console.log('✅ Sequential Generation completed successfully')

        const responseBody = {
          success: true,
          data: {
            core_concept: coreConceptData,
            film_treatment: filmTreatmentData,
            character_breakdown: characterBreakdownData,
            beat_sheet: beatSheetData,
            combined_result: combinedResult
          },
          message: 'Phase 1 Optimized: Sequential generation completed with direct function calls',
          debug: {
            api: 'sequential-phase1',
            provider: tryProvider,
            model: tryModel,
            timestamp: new Date().toISOString()
          }
        }

        return NextResponse.json(responseBody, {
          headers: {
            'x-seq-api': 'sequential-phase1',
            'x-llm-provider': tryProvider,
            'x-llm-model': tryModel
          }
        })
      } catch (e) {
        console.error(`Provider ${tryProvider} failed`, e)
        lastErr = e
        continue
      }
    }

    throw lastErr || new Error('No provider succeeded')

  } catch (error) {
    console.error('❌ Sequential Generation Error:', error)
    return NextResponse.json({
      success: false,
      message: `Failed to complete sequential generation: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 })
  }
}
