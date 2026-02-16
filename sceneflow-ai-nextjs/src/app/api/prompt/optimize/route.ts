/**
 * Prompt Optimization API
 * 
 * Uses Gemini to restructure messy "wall of text" prompts into a
 * hierarchical framework that AI image models can follow more effectively.
 * 
 * The optimization:
 * 1. Categorizes content into Scene/Setting, Character/Performance, Technical
 * 2. Eliminates redundancy
 * 3. Prioritizes visual anchors in the first 100-200 words
 * 4. Creates narrative flow for performance beats
 */

import { NextRequest, NextResponse } from 'next/server'
import { generateText } from '@/lib/vertexai/gemini'

export const maxDuration = 60
export const runtime = 'nodejs'

interface OptimizePromptRequest {
  prompt: string
  sceneHeading?: string
  /** Whether to preserve character names exactly as written */
  preserveCharacterNames?: boolean
}

interface OptimizedPromptResponse {
  success: boolean
  optimizedPrompt?: string
  error?: string
}

const OPTIMIZATION_SYSTEM_PROMPT = `You are an expert prompt engineer specializing in AI image generation (Imagen, DALL-E, Midjourney).

Your task is to take a messy, verbose "wall of text" prompt and restructure it into an optimized format that AI models can follow effectively.

## Optimization Principles:

1. **PRIORITY ORDER**: AI models weight the first 100-200 words most heavily. Put the most important visual anchors FIRST:
   - Shot type and camera angle
   - Main subject (character appearance, position)
   - Key environmental context
   
2. **ELIMINATE REDUNDANCY**: Remove repeated descriptions. Each visual element should be mentioned ONCE in the optimal location.

3. **CATEGORIZE**: Group related concepts:
   - SCENE & SETTING: Location, atmosphere, time, key props
   - CHARACTER & PERFORMANCE: Appearance, action, expression, body language
   - TECHNICAL: Camera, lighting, style, quality

4. **NARRATIVE FLOW**: For character actions, list beats chronologically so the model understands the "peak moment" to capture.

5. **REMOVE NON-VISUAL**: Strip audio cues, dialogue text, story context that can't be visualized.

## Output Format:

Return ONLY the optimized prompt as plain text. Structure it as:

[Shot type], [camera angle]. [Main subject description and key action]. [Setting/environment]. [Atmosphere and lighting]. [Technical specifications].

Keep the total under 500 words. Be concise but visually specific.`

export async function POST(request: NextRequest): Promise<NextResponse<OptimizedPromptResponse>> {
  try {
    const body: OptimizePromptRequest = await request.json()
    const { prompt, sceneHeading, preserveCharacterNames = true } = body

    if (!prompt || !prompt.trim()) {
      return NextResponse.json({
        success: false,
        error: 'No prompt provided'
      }, { status: 400 })
    }

    // Build the optimization request
    const userPrompt = `Optimize this image generation prompt for better AI model comprehension:

${sceneHeading ? `SCENE: ${sceneHeading}\n\n` : ''}ORIGINAL PROMPT:
${prompt}

${preserveCharacterNames ? 'IMPORTANT: Preserve all character names exactly as written (e.g., "Dr. Benjamin Anderson", "SARA").\n' : ''}
Return ONLY the optimized prompt, no explanations or markdown headers.`

    console.log('[Prompt Optimize] Calling Gemini to optimize prompt...')
    console.log('[Prompt Optimize] Original length:', prompt.length, 'characters')

    const result = await generateText(userPrompt, {
      model: 'gemini-2.5-flash',
      temperature: 0.3, // Low temperature for consistent, focused output
      maxOutputTokens: 1500,
      systemInstruction: OPTIMIZATION_SYSTEM_PROMPT
    })

    if (!result || !result.trim()) {
      return NextResponse.json({
        success: false,
        error: 'Gemini returned empty response'
      }, { status: 500 })
    }

    // Clean up the result - remove any markdown formatting that might have slipped through
    let optimizedPrompt = result.trim()
    
    // Remove markdown headers if present
    optimizedPrompt = optimizedPrompt.replace(/^#+\s*\[?[^\]]*\]?\s*/gm, '')
    optimizedPrompt = optimizedPrompt.replace(/^\*\*[^*]+\*\*:?\s*/gm, '')
    
    // Remove bullet points and convert to flowing text
    optimizedPrompt = optimizedPrompt.replace(/^\s*[-*]\s+/gm, '')
    optimizedPrompt = optimizedPrompt.replace(/^\s*\d+\.\s+/gm, '')
    
    // Clean up extra whitespace
    optimizedPrompt = optimizedPrompt.replace(/\n{3,}/g, '\n\n')
    optimizedPrompt = optimizedPrompt.trim()

    console.log('[Prompt Optimize] Optimized length:', optimizedPrompt.length, 'characters')
    console.log('[Prompt Optimize] Reduction:', Math.round((1 - optimizedPrompt.length / prompt.length) * 100), '%')

    return NextResponse.json({
      success: true,
      optimizedPrompt
    })

  } catch (error: any) {
    console.error('[Prompt Optimize] Error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to optimize prompt'
    }, { status: 500 })
  }
}
