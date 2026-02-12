import { NextRequest, NextResponse } from 'next/server'
import { strictJsonPromptSuffix, safeParseJsonFromText } from '@/lib/safeJson'
import { generateText } from '@/lib/vertexai/gemini'
import type { AudienceResonanceAnalysis } from '@/lib/types/audienceResonance'

/**
 * Blueprint Optimization API
 * 
 * Rewrites (not appends) treatment sections for clarity, effectiveness, and consistency.
 * Uses AR analysis context to guide optimization priorities.
 */

interface OptimizeRequest {
  variant: Record<string, unknown>
  previousAnalysis?: AudienceResonanceAnalysis | null
  focusAreas?: ('clarity' | 'pacing' | 'character' | 'tone' | 'commercial')[]
}

interface OptimizedSection {
  title?: string
  logline?: string
  synopsis?: string
  tone_description?: string
  protagonist?: string
  antagonist?: string
  setting?: string
  themes?: string[]
  visual_style?: string
  beats?: Array<{
    title: string
    intent?: string
    minutes?: number
    synopsis?: string
  }>
}

export async function POST(request: NextRequest) {
  try {
    const body: OptimizeRequest = await request.json()
    const { variant, previousAnalysis, focusAreas = ['clarity', 'pacing', 'character'] } = body

    if (!variant) {
      return NextResponse.json(
        { success: false, message: 'variant is required' },
        { status: 400 }
      )
    }

    // Build context from previous analysis
    const analysisContext = previousAnalysis ? `
PREVIOUS AUDIENCE RESONANCE ANALYSIS:
- Overall Score: ${previousAnalysis.greenlightScore?.score || 'N/A'}/100
- Strengths: ${previousAnalysis.insights?.filter(i => i.status === 'strength').map(i => i.title).join(', ') || 'None identified'}
- Weaknesses: ${previousAnalysis.insights?.filter(i => i.status === 'weakness').map(i => i.title).join(', ') || 'None identified'}
- Axis Scores:
  * Originality: ${previousAnalysis.axes?.find(a => a.id === 'originality')?.score || 'N/A'}
  * Character Depth: ${previousAnalysis.axes?.find(a => a.id === 'character-depth')?.score || 'N/A'}
  * Pacing: ${previousAnalysis.axes?.find(a => a.id === 'pacing')?.score || 'N/A'}
  * Genre Fidelity: ${previousAnalysis.axes?.find(a => a.id === 'genre-fidelity')?.score || 'N/A'}
  * Commercial Viability: ${previousAnalysis.axes?.find(a => a.id === 'commercial-viability')?.score || 'N/A'}

Use this analysis to prioritize which areas need the most improvement while preserving strengths.
` : ''

    // Focus area instructions
    const focusInstructions = focusAreas.map(area => {
      switch (area) {
        case 'clarity':
          return '- CLARITY: Ensure every sentence is clear, concise, and purposeful. Remove redundancy and vague language.'
        case 'pacing':
          return '- PACING: Ensure beats flow naturally with proper escalation. Each beat should have clear dramatic purpose.'
        case 'character':
          return '- CHARACTER: Deepen protagonist/antagonist motivations. Make character descriptions more vivid and specific.'
        case 'tone':
          return '- TONE: Ensure consistent tone throughout. Make visual style descriptions more specific and evocative.'
        case 'commercial':
          return '- COMMERCIAL: Strengthen marketable hooks. Ensure logline is punchy and genre conventions are satisfied.'
        default:
          return ''
      }
    }).join('\n')

    // Extract current treatment data
    const currentData = {
      title: variant.title || '',
      logline: variant.logline || '',
      synopsis: variant.synopsis || '',
      genre: variant.genre || '',
      tone_description: variant.tone_description || variant.tone || '',
      protagonist: variant.protagonist || '',
      antagonist: variant.antagonist || '',
      setting: variant.setting || '',
      themes: variant.themes || [],
      visual_style: variant.visual_style || '',
      beats: Array.isArray(variant.beats) 
        ? (variant.beats as Array<Record<string, unknown>>).slice(0, 8).map((b, i) => ({
            title: b.title || `Beat ${i + 1}`,
            intent: b.intent || '',
            minutes: b.minutes || 0,
            synopsis: typeof b.synopsis === 'string' ? b.synopsis.substring(0, 500) : ''
          }))
        : []
    }

    const prompt = `You are an expert film treatment editor and story consultant. Your task is to REWRITE and OPTIMIZE the following film treatment for maximum clarity, effectiveness, and industry-standard quality.

CRITICAL INSTRUCTIONS:
- You are REWRITING, not appending. Return complete replacements for each field.
- Preserve the core creative vision and story, but elevate the execution.
- Keep the same overall length - don't expand sections unnecessarily.
- Maintain genre conventions while enhancing originality.
- Make every word count - eliminate fluff and redundancy.

OPTIMIZATION FOCUS AREAS:
${focusInstructions}

${analysisContext}

CURRENT TREATMENT:
${JSON.stringify(currentData, null, 2)}

YOUR TASK:
Rewrite the treatment with these improvements:
1. Sharpen the logline to be punchy and memorable (1-2 sentences max)
2. Tighten the synopsis for clarity and dramatic impact
3. Enhance protagonist/antagonist descriptions with clear motivations and visual details
4. Improve beat synopses for better pacing and dramatic progression
5. Refine tone_description and visual_style for specificity

Return a JSON object with ALL fields rewritten and optimized. Include all fields even if minimal changes were needed.

CONSTRAINTS:
- Maximum 8 beats
- Each beat synopsis: 1-3 sentences
- Synopsis: 150-300 words
- Logline: 1-2 punchy sentences
- Maintain the original genre and core premise

${strictJsonPromptSuffix}`

    console.log('[Optimize Blueprint] Starting optimization with focus areas:', focusAreas)

    const result = await generateText(prompt, {
      model: 'gemini-2.5-flash',
      temperature: 0.4, // Slightly creative but controlled
      maxOutputTokens: 4096,
      thinkingBudget: 0 // Disable thinking mode
    })

    const generatedText = result?.text || '{}'
    const parsed = safeParseJsonFromText(generatedText)

    if (!parsed || typeof parsed !== 'object') {
      console.error('[Optimize Blueprint] Failed to parse response:', generatedText)
      return NextResponse.json(
        { success: false, message: 'Failed to parse optimization response' },
        { status: 500 }
      )
    }

    // Validate and clean the response
    const optimizedDraft: OptimizedSection = {}
    
    if (parsed.title) optimizedDraft.title = String(parsed.title)
    if (parsed.logline) optimizedDraft.logline = String(parsed.logline)
    if (parsed.synopsis) optimizedDraft.synopsis = String(parsed.synopsis)
    if (parsed.tone_description) optimizedDraft.tone_description = String(parsed.tone_description)
    if (parsed.protagonist) optimizedDraft.protagonist = String(parsed.protagonist)
    if (parsed.antagonist) optimizedDraft.antagonist = String(parsed.antagonist)
    if (parsed.setting) optimizedDraft.setting = String(parsed.setting)
    if (parsed.visual_style) optimizedDraft.visual_style = String(parsed.visual_style)
    if (Array.isArray(parsed.themes)) optimizedDraft.themes = parsed.themes.map(String)
    if (Array.isArray(parsed.beats)) {
      optimizedDraft.beats = parsed.beats.slice(0, 8).map((b: any) => ({
        title: String(b.title || ''),
        intent: String(b.intent || ''),
        minutes: Number(b.minutes) || 0,
        synopsis: String(b.synopsis || '').substring(0, 500)
      }))
    }

    console.log('[Optimize Blueprint] Successfully optimized', Object.keys(optimizedDraft).length, 'fields')

    return NextResponse.json({
      success: true,
      optimizedDraft,
      fieldsUpdated: Object.keys(optimizedDraft),
      focusAreas
    })

  } catch (error) {
    console.error('[Optimize Blueprint] Error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to optimize treatment' },
      { status: 500 }
    )
  }
}
