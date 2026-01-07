import { NextRequest, NextResponse } from 'next/server'
import { generateText } from '@/lib/vertexai/gemini'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { currentPrompt, instructions, sceneContext } = await request.json()

    if (!currentPrompt || !instructions) {
      return NextResponse.json(
        { success: false, error: 'currentPrompt and instructions are required' },
        { status: 400 }
      )
    }

    // Vertex AI uses service account credentials - no API key required
    const sceneInfo = sceneContext ? `
Scene Context:
- Heading: ${sceneContext.heading}
- Action: ${sceneContext.action}
- Visual Style: ${sceneContext.visualStyle}
` : ''

    const systemPrompt = `You are a prompt engineering expert specializing in cinematic scene image generation for Imagen 3 (Vertex AI).

Your task is to refine and improve scene image prompts to create better, more visually compelling film production stills.

Guidelines:
- Be specific about camera angles, framing, and composition
- Include detailed lighting directions (motivated by story/mood)
- Describe character blocking and positioning
- Specify depth of field and focus
- Include atmospheric elements (fog, haze, particles)
- Follow Imagen 3 best practices for photorealism
- Maintain continuity with scene context
- Don't add text, titles, or watermarks
- Focus on cinematic storytelling through visual elements

Apply the user's requested changes while maintaining professional film production quality.`

    const userPrompt = `${sceneInfo}
Current prompt:
${currentPrompt}

User instructions:
${instructions}

Provide the refined prompt (output only the improved prompt, no explanations):`

    const fullPrompt = `${systemPrompt}\n\n${userPrompt}`
    
    console.log('[Refine Scene] Calling Vertex AI Gemini...')
    const refinedPrompt = await generateText(fullPrompt, { model: 'gemini-2.0-flash' })

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
    console.error('[Refine Scene] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

