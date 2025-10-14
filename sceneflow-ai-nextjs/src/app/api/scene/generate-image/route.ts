import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const { prompt, sceneContext } = await req.json()
    
    if (!prompt?.trim()) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    const openaiKey = process.env.OPENAI_API_KEY
    if (!openaiKey) {
      return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500 })
    }

    // Enhance prompt for cinematic scene
    let enhancedPrompt = prompt
    
    // Add scene context if provided
    if (sceneContext) {
      const contextParts = []
      if (sceneContext.visualStyle) contextParts.push(`Visual style: ${sceneContext.visualStyle}`)
      if (sceneContext.tone) contextParts.push(`Tone: ${sceneContext.tone}`)
      if (contextParts.length > 0) {
        enhancedPrompt = `${prompt}\n\n${contextParts.join(', ')}`
      }
    }
    
    // Add cinematic quality enhancers
    enhancedPrompt += `\n\nStyle: Cinematic scene, professional cinematography, film quality
Quality: 4K resolution, cinematic lighting, sharp focus
Composition: 16:9 aspect ratio, professional framing, rule of thirds
Camera: Cinematic camera angle, depth of field
Lighting: Cinematic lighting, atmospheric, professional film lighting`

    console.log('[Scene Image] Generating with DALL-E 3:', enhancedPrompt.substring(0, 100))

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: enhancedPrompt,
        size: '1792x1024',  // 16:9 landscape for scenes
        quality: 'hd',
        n: 1,
        response_format: 'b64_json'
      })
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      console.error('[Scene Image] OpenAI error:', response.status, error)
      
      if (response.status === 400 && error?.error?.code === 'content_policy_violation') {
        return NextResponse.json({ 
          error: 'Content policy violation. Please try a different scene description.' 
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
    console.error('[Scene Image] Generation error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

