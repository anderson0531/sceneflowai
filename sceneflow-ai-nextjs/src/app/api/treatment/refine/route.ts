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
Each beat should have clear dramatic purpose.

CRITICAL CONSTRAINTS:
- Maximum 8 beats total (consolidate if needed)
- Each beat synopsis should be 1-3 sentences max
- Keep response compact - no lengthy descriptions
- Preserve existing beat structure where possible`,

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

    // For beats section, limit the data size to prevent OOM
    if (section === 'beats' && Array.isArray(sectionData.beats)) {
      const beats = sectionData.beats as Array<Record<string, unknown>>
      sectionData.beats = beats.slice(0, 10).map((b, i) => ({
        title: b.title || `Beat ${i + 1}`,
        intent: b.intent || '',
        minutes: b.minutes || 0,
        synopsis: typeof b.synopsis === 'string' ? b.synopsis.substring(0, 200) : ''
      }))
    }

    // Section-specific token limits to prevent OOM
    const maxTokens = section === 'beats' ? 2048 : 
                      section === 'characters' ? 3072 : 4096

    const prompt = `${SECTION_CONTEXT[section]}

You are an expert film treatment editor. REWRITE the specified fields according to the user's instructions.

CRITICAL: You are REPLACING content, NOT appending to it.
- Return a COMPLETE replacement for each field you modify
- Do NOT concatenate new text with existing content
- Do NOT preserve the original text unless explicitly asked to keep specific parts
- If a synopsis needs improvement, return a new synopsis of similar length, not a longer one
- The output should be a refined VERSION, not an extended version

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
- REPLACE field content entirely - do not append or concatenate

${strictJsonPromptSuffix}`

    console.log(`[Refine Treatment] Refining section "${section}" with instructions: ${instructions.substring(0, 100)}...`)
    console.log(`[Refine Treatment] Using maxTokens: ${maxTokens} for section: ${section}`)
    
    const result = await generateText(prompt, {
      model: 'gemini-2.5-flash',
      temperature: 0.3,
      maxOutputTokens: maxTokens,
      thinkingBudget: 0  // Disable thinking mode to prevent OOM crashes
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
