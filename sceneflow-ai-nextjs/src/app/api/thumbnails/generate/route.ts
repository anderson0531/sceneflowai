import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 300

export interface ThumbnailGenerationRequest {
  userId: string
  ideas: Array<{
    id: string
    thumbnail_prompt: string
  }>
}

export interface ThumbnailGenerationResponse {
  success: boolean
  thumbnails?: Record<string, {
    success: boolean
    imageUrl?: string
    error?: string
  }>
  error?: string
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { userId, ideas }: ThumbnailGenerationRequest = await request.json()

    if (!userId || !ideas || !Array.isArray(ideas)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request data'
      }, { status: 400 })
    }

    const googleApiKey = process.env.GOOGLE_API_KEY
    if (!googleApiKey) {
      return NextResponse.json({
        success: false,
        error: 'Google API key not configured'
      }, { status: 500 })
    }

    const thumbnails: Record<string, { success: boolean; imageUrl?: string; error?: string }> = {}

    // Generate sequentially to avoid rate limiting
    for (const idea of ideas) {
      const prompt = idea.thumbnail_prompt
      try {
        const enhancedPrompt = `Create a cinematic billboard image for a film with the following requirements: ${prompt}\n\nStyle: Professional film poster, cinematic lighting, high contrast, suitable for billboard display\nQuality: High-resolution, professional photography, visually striking\nComposition: Dramatic, eye-catching, film marketing quality\nCamera: Wide angle, cinematic framing\nLighting: Dramatic, high contrast, professional studio lighting\nAspect ratio: 16:9 landscape for billboard display`

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-4:generateContent?key=${googleApiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: enhancedPrompt }] }],
            generationConfig: {
              temperature: 0.6,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 2048
            },
            safetySettings: [
              { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
              { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
              { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
              { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' }
            ]
          })
        })

        if (!response.ok) {
          const errText = await response.text()
          thumbnails[idea.id] = { success: false, error: `Imagen API error: ${response.status} ${errText}` }
          continue
        }

        const data = await response.json()

        let imageUrl = ''
        if (data?.candidates?.[0]?.content?.parts?.length) {
          for (const part of data.candidates[0].content.parts) {
            if (part.inlineData?.mimeType?.startsWith('image/')) {
              imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
              break
            }
          }
        }

        if (!imageUrl) {
          // Provide a lightweight SVG placeholder rather than failing
          const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='675' viewBox='0 0 1200 675' fill='none'>
  <defs>
    <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
      <stop offset='0%' stop-color='#0f172a'/>
      <stop offset='100%' stop-color='#1e293b'/>
    </linearGradient>
  </defs>
  <rect width='1200' height='675' fill='url(#g)'/>
  <g fill='#64748b'>
    <rect x='80' y='120' width='1040' height='435' rx='16' ry='16' fill-opacity='0.25' stroke='#334155' stroke-width='2'/>
    <text x='600' y='350' font-family='Inter, system-ui, -apple-system' font-size='28' text-anchor='middle' fill='#cbd5e1'>Thumbnail Preview</text>
  </g>
</svg>`
          const placeholder = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
          thumbnails[idea.id] = { success: true, imageUrl: placeholder }
          continue
        }

        thumbnails[idea.id] = { success: true, imageUrl }

        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 150))
      } catch (err) {
        thumbnails[idea.id] = { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
      }
    }

    return NextResponse.json({
      success: true,
      thumbnails
    })

  } catch (error) {
    console.error('Thumbnail generation error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
