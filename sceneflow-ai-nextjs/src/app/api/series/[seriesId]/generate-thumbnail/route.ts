import { NextRequest, NextResponse } from 'next/server'
import Series from '@/models/Series'
import { sequelize } from '@/config/database'
import { uploadImageToBlob } from '@/lib/storage/blob'
import { generateImageWithGemini } from '@/lib/gemini/imageClient'

export const maxDuration = 60

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ seriesId: string }> }
) {
  try {
    const { seriesId } = await params

    if (!seriesId) {
      return NextResponse.json(
        { success: false, error: 'Series ID is required' },
        { status: 400 }
      )
    }

    // TODO: BYOK - Use user's Gemini API key when BYOK is implemented
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'Gemini API not configured. Please set GEMINI_API_KEY.',
        requiresBYOK: true
      }, { status: 400 })
    }

    // Fetch the series to get metadata for prompt generation
    await sequelize.authenticate()
    
    const series = await Series.findByPk(seriesId)
    if (!series) {
      return NextResponse.json({
        success: false,
        error: 'Series not found'
      }, { status: 404 })
    }

    // Parse optional custom prompt from request body
    let customPrompt: string | undefined
    try {
      const body = await request.json()
      customPrompt = body.customPrompt
    } catch {
      // No body or invalid JSON - that's fine, use default prompt
    }

    // Use custom prompt if provided, otherwise generate from series data
    let enhancedPrompt: string
    
    if (customPrompt) {
      enhancedPrompt = customPrompt
      console.log('[Series Thumbnail] Using custom prompt from user')
    } else {
      // Build cinematic billboard prompt from series metadata
      const seriesInfo = [
        series.title ? `Series Title: ${series.title}` : '',
        series.genre ? `Genre: ${series.genre}` : '',
        series.logline ? `Concept: ${series.logline}` : ''
      ].filter(Boolean).join('\n')

      enhancedPrompt = `Create a cinematic billboard image for a TV series with the following details:

${seriesInfo}

Style Requirements:
- Professional TV series poster quality, suitable for streaming platform display
- Cinematic lighting with high contrast and dramatic shadows
- Visually striking composition with strong focal point
- Premium streaming platform marketing quality, eye-catching and memorable
- Wide angle cinematic framing
- Professional studio lighting with dramatic highlights
- 16:9 landscape aspect ratio
- No text, titles, or watermarks on the image
- Photorealistic or stylized based on genre appropriateness`
      
      console.log('[Series Thumbnail] Using default generated prompt')
    }

    console.log('[Series Thumbnail] Generating with Gemini Image...')

    // Generate image using Gemini API
    const base64Image = await generateImageWithGemini(enhancedPrompt, {
      aspectRatio: '16:9',
      numberOfImages: 1,
      imageSize: '2K'
    })
    
    console.log('[Series Thumbnail] Image generated, uploading to Vercel Blob...')
    
    // Upload to Vercel Blob storage
    const blobUrl = await uploadImageToBlob(base64Image, `series-thumbnails/${seriesId}-${Date.now()}.png`)
    console.log('[Series Thumbnail] Uploaded to Blob:', blobUrl)
    
    // Update series metadata with the thumbnail
    const updatedMetadata = {
      ...series.metadata,
      thumbnailUrl: blobUrl,
      thumbnailPrompt: enhancedPrompt,
      thumbnailGeneratedAt: new Date().toISOString()
    }

    await series.update({ metadata: updatedMetadata })

    console.log('[Series Thumbnail] Successfully generated and saved thumbnail for series:', seriesId)

    return NextResponse.json({ 
      success: true, 
      thumbnailUrl: blobUrl,
      promptUsed: enhancedPrompt,
      model: 'imagen-3.0-generate-001',
      provider: 'vertex-ai-imagen-3',
      storageType: 'vercel-blob'
    })

  } catch (error) {
    console.error('[Series Thumbnail] Generation error:', error)
    return NextResponse.json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 })
  }
}
