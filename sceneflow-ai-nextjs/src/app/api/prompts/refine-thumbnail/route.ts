import { NextRequest, NextResponse } from 'next/server'
import { generateText } from '@/lib/vertexai/gemini'
import { englishForModel, resolveRequestStoryLocale } from '@/i18n/server/requestLocale'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { currentPrompt, instructions: enteredInstructions, projectId } = body

    if (!currentPrompt || !enteredInstructions) {
      return NextResponse.json(
        { success: false, error: 'currentPrompt and instructions are required' },
        { status: 400 }
      )
    }

    // This rewrites an image prompt, so the typed instruction is normalized to
    // English before the rewriter sees it.
    const { storyLocale, properNouns } = await resolveRequestStoryLocale(request, { projectId })
    const instructions = await englishForModel(enteredInstructions, storyLocale, properNouns)

    // Vertex AI uses service account credentials - no API key required
    const systemPrompt = `You are a prompt engineering expert specializing in image generation prompts for Imagen 3 (Vertex AI).

Your task is to refine and improve image generation prompts to create better, more visually striking results.

Guidelines:
- Be specific and descriptive
- Include relevant style, lighting, and composition details
- Follow Imagen 3 best practices
- Maintain cinematic thumbnail quality
- Keep the core concept while applying improvements
- Don't add text, titles, or watermarks to the prompt
- Focus on visual elements: lighting, composition, mood, color palette

Apply the user's requested changes while maintaining professional film poster quality.`

    const userPrompt = `Current prompt:
${currentPrompt}

User instructions:
${instructions}

Provide the refined prompt (output only the improved prompt, no explanations):`

    const fullPrompt = `${systemPrompt}\n\n${userPrompt}`
    
    console.log('[Refine Thumbnail] Calling Vertex AI Gemini...')
    const refinedPrompt = await generateText(fullPrompt, { })

    if (!refinedPrompt) {
      return NextResponse.json(
        { success: false, error: 'No response from AI' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      refinedPrompt: refinedPrompt.trim()
    })
  } catch (error: any) {
    console.error('[Refine Thumbnail] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

