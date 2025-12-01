import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { currentPrompt, instructions } = await request.json()

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

    const systemPrompt = `You are a prompt engineering expert specializing in image generation prompts for Imagen 3 (Vertex AI).

Your task is to refine and improve image generation prompts to create better, more visually striking results.

Guidelines:
- Be specific and descriptive
- Include relevant style, lighting, and composition details
- Follow Imagen 3 best practices
- Maintain cinematic billboard quality
- Keep the core concept while applying improvements
- Don't add text, titles, or watermarks to the prompt
- Focus on visual elements: lighting, composition, mood, color palette

Apply the user's requested changes while maintaining professional film poster quality.`

    const userPrompt = `Current prompt:
${currentPrompt}

User instructions:
${instructions}

Provide the refined prompt (output only the improved prompt, no explanations):`

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
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
      console.error('[Refine Thumbnail] API error:', errorText)
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
    console.error('[Refine Thumbnail] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

