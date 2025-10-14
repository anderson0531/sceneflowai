import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json()
    
    if (!prompt?.trim()) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    const openaiKey = process.env.OPENAI_API_KEY
    if (!openaiKey) {
      return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500 })
    }

    // Enhance prompt for character portrait
    const enhancedPrompt = `${prompt}

Style: Professional character portrait, photorealistic, high detail
Quality: 8K resolution, studio lighting, sharp focus
Composition: Portrait orientation, neutral background, character-focused
Camera: 85mm portrait lens, shallow depth of field
Lighting: Soft natural lighting, professional photography`

    console.log('[Character Image] Generating with DALL-E 3:', enhancedPrompt.substring(0, 100))

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: enhancedPrompt,
        size: '1024x1024',
        quality: 'hd',
        n: 1,
        response_format: 'b64_json'
      })
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      console.error('[Character Image] OpenAI error:', response.status, error)
      
      // Handle specific error cases
      if (response.status === 400 && error?.error?.code === 'content_policy_violation') {
        return NextResponse.json({ 
          error: 'Content policy violation. Please try a different description or remove sensitive terms.' 
        }, { status: 400 })
      }
      
      if (response.status === 403) {
        return NextResponse.json({ 
          error: 'Access forbidden. Please check your OpenAI API key permissions.' 
        }, { status: 403 })
      }
      
      return NextResponse.json({ 
        error: error?.error?.message || 'Image generation failed' 
      }, { status: response.status })
    }

    const data = await response.json()
    const b64 = data?.data?.[0]?.b64_json
    
    if (!b64) {
      return NextResponse.json({ error: 'No image data returned' }, { status: 500 })
    }

    const imageUrl = `data:image/png;base64,${b64}`
    
    return NextResponse.json({ 
      success: true, 
      imageUrl,
      model: 'dall-e-3',
      provider: 'openai'
    })

  } catch (error) {
    console.error('[Character Image] Generation error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

