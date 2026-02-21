/**
 * AI Prompt Rephrase API
 * 
 * Uses Gemini to rephrase video generation prompts that were flagged
 * by content safety filters. The AI rewrites the prompt to preserve
 * creative intent while using cinematic-safe language.
 * 
 * @route POST /api/prompt/rephrase
 */

import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { prompt, flaggedTerms = [], systemPrompt, userPrompt } = body

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      )
    }

    console.log('[Prompt Rephrase] Rephrasing prompt with flagged terms:', flaggedTerms)

    // Use Gemini Flash for fast, cost-effective rephrasing
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash',
      systemInstruction: systemPrompt || getDefaultSystemPrompt(),
    })

    const finalUserPrompt = userPrompt || buildUserPrompt(prompt, flaggedTerms)

    const result = await model.generateContent(finalUserPrompt)
    const response = await result.response
    const rephrasedPrompt = response.text().trim()

    console.log('[Prompt Rephrase] Original:', prompt.substring(0, 100) + '...')
    console.log('[Prompt Rephrase] Rephrased:', rephrasedPrompt.substring(0, 100) + '...')

    return NextResponse.json({
      success: true,
      rephrasedPrompt,
      originalPrompt: prompt,
      flaggedTermsCount: flaggedTerms.length,
    })
  } catch (error) {
    console.error('[Prompt Rephrase] Error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to rephrase prompt',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

function getDefaultSystemPrompt(): string {
  return `You are a cinematic prompt engineer helping rephrase video generation prompts to avoid content safety filter triggers.

Your task is to take a prompt that was flagged by Google Vertex AI's content safety system and rewrite it to:
1. Preserve the creative intent and visual storytelling
2. Replace graphic/explicit terms with cinematic alternatives
3. Focus on visual descriptions rather than violent actions
4. Maintain the emotional tone without triggering filters

Guidelines for replacements:
- "blood" → "crimson", "dark liquid", "stained"
- "corpse/dead body" → "motionless figure", "fallen form"
- "wound" → "injury", "mark"
- "violent" → "intense", "dramatic", "forceful"
- "gore" → "visceral detail", "dramatic imagery"
- "torture" → "suffering", "ordeal", "struggle"
- "death/dying" → "fading", "falling", "end"
- "kill" → "defeat", "stop", "overcome"
- "necrotic" → "darkened", "discolored", "shadowed"
- "rotting" → "deteriorating", "weathered", "aged"

Focus on camera movements, lighting, composition, and emotion rather than graphic details.
Keep the response concise - output only the rephrased prompt with no explanations or markdown.`
}

function buildUserPrompt(originalPrompt: string, flaggedTerms: string[]): string {
  const termsStr = flaggedTerms.length > 0 
    ? `Specifically avoid these flagged terms: ${flaggedTerms.join(', ')}\n\n`
    : ''

  return `The following video generation prompt was flagged by content safety filters.
Please rewrite it to achieve the same cinematic effect while using safe, cinematic language.

${termsStr}Original prompt:
"${originalPrompt}"

Rephrased prompt:`
}
