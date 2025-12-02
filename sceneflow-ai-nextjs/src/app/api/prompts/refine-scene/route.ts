import { NextRequest, NextResponse } from 'next/server'

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

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY || process.env.GOOGLE_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'Google API key not configured' },
        { status: 500 }
      )
    }

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

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: userPrompt }] }],
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2000
          }
        })
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Refine Scene] API error:', errorText)
      return NextResponse.json(
        { success: false, error: `API error: ${response.status}` },
        { status: 500 }
      )
    }

    const data = await response.json()
    const refinedPrompt = data?.candidates?.[0]?.content?.parts?.[0]?.text

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

