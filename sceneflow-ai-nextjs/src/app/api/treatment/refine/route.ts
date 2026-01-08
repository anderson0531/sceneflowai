import { NextRequest, NextResponse } from 'next/server'
import { strictJsonPromptSuffix, safeParseJsonFromText } from '@/lib/safeJson'
import { generateText } from '@/lib/vertexai/gemini'

/**
 * Section-aware Blueprint Refinement API
 * 
 * Takes an existing treatment variant and refines specific sections
 * based on user instructions while preserving the rest of the content.
 */

type SectionType = 'core' | 'story' | 'tone' | 'beats' | 'characters'

interface RefineRequest {
  variant: Record<string, unknown>
  section: SectionType
  instructions: string
}

// Section-specific field mappings for targeted refinement
const SECTION_FIELDS: Record<SectionType, string[]> = {
  core: ['title', 'logline', 'genre', 'format_length', 'target_audience'],
  story: ['synopsis', 'setting', 'protagonist', 'antagonist', 'act_breakdown'],
  tone: ['tone', 'tone_description', 'style', 'visual_style', 'themes', 'mood_references'],
  beats: ['beats', 'total_duration_seconds', 'estimatedDurationMinutes'],
  characters: ['character_descriptions']
}

// Section-specific prompting context
const SECTION_CONTEXT: Record<SectionType, string> = {
  core: `You are refining the CORE IDENTIFYING INFORMATION of a film treatment.
Focus on: title, logline, genre, format/length, and target audience.
Keep the logline punchy (1-2 sentences max). Ensure genre and format are industry-standard terms.`,

  story: `You are refining the STORY SETUP of a film treatment.
Focus on: synopsis, setting, protagonist, antagonist, and act breakdown.
Maintain narrative coherence. The synopsis should be compelling but concise.
Ensure protagonist/antagonist descriptions include clear motivations.`,

  tone: `You are refining the TONE & STYLE of a film treatment.
Focus on: tone, visual style, themes, and mood references.
Be specific about visual language. Reference comparable films/shows when helpful.
Themes should be thematically rich but not preachy.`,

  beats: `You are refining the STORY BEATS of a film treatment.
Focus on: beat titles, intents, durations, and synopses.
Ensure beats flow logically and total duration is realistic.
Each beat should have clear dramatic purpose.`,

  characters: `You are refining the CHARACTER DESCRIPTIONS of a film treatment.
Focus on: character names, descriptions, appearance, and psychological depth.
Characters should feel three-dimensional with clear visual identity.
Include physical descriptions suitable for image generation.`
}

export async function POST(request: NextRequest) {
  try {
    const body: RefineRequest = await request.json()
    const { variant, section, instructions } = body

    if (!variant) {
      return NextResponse.json(
        { success: false, message: 'variant is required' },
        { status: 400 }
      )
    }

    if (!section || !SECTION_FIELDS[section]) {
      return NextResponse.json(
        { success: false, message: 'Valid section is required (core, story, tone, beats, characters)' },
        { status: 400 }
      )
    }

    if (!instructions?.trim()) {
      return NextResponse.json(
        { success: false, message: 'instructions are required' },
        { status: 400 }
      )
    }

    // Extract only the relevant fields for this section
    const sectionFields = SECTION_FIELDS[section]
    const sectionData: Record<string, unknown> = {}
    for (const field of sectionFields) {
      if (variant[field] !== undefined) {
        sectionData[field] = variant[field]
      }
    }

    const prompt = `${SECTION_CONTEXT[section]}

You are an expert film treatment editor. Refine the provided section according to the user's instructions.
Keep structure and factual content unless explicitly asked to change. Improve clarity, tone, and concision.

CURRENT SECTION DATA:
${JSON.stringify(sectionData, null, 2)}

USER INSTRUCTIONS:
${instructions}

FULL TREATMENT CONTEXT (read-only, for reference):
Title: ${variant.title || 'Untitled'}
Logline: ${variant.logline || 'No logline'}
Genre: ${variant.genre || 'Unspecified'}

IMPORTANT:
- Only modify fields within this section: ${sectionFields.join(', ')}
- Return ONLY the modified fields as a JSON object
- Maintain consistency with the overall treatment
- If a field doesn't need changes, you may omit it from the response

${strictJsonPromptSuffix}`

    console.log(`[Refine Treatment] Refining section "${section}" with instructions: ${instructions.substring(0, 100)}...`)
    
    const result = await generateText(prompt, {
      model: 'gemini-2.5-flash',
      temperature: 0.3,
      maxOutputTokens: 4096
    })

    const generatedText = result?.text || '{}'
    const parsed = safeParseJsonFromText(generatedText)

    if (!parsed || typeof parsed !== 'object') {
      console.error('[Refine Treatment] Failed to parse response:', generatedText)
      return NextResponse.json(
        { success: false, message: 'Failed to parse refinement response' },
        { status: 500 }
      )
    }

    // Filter to only return fields that belong to this section
    const filteredDraft: Record<string, unknown> = {}
    for (const field of sectionFields) {
      if (parsed[field] !== undefined) {
        filteredDraft[field] = parsed[field]
      }
    }

    console.log(`[Refine Treatment] Successfully refined ${Object.keys(filteredDraft).length} fields in section "${section}"`)

    return NextResponse.json({
      success: true,
      draft: filteredDraft,
      section,
      fieldsUpdated: Object.keys(filteredDraft)
    })

  } catch (error) {
    console.error('[Refine Treatment] Error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to refine treatment section' },
      { status: 500 }
    )
  }
}
