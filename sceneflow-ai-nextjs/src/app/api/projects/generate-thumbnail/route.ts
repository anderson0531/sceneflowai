import { NextRequest, NextResponse } from 'next/server'
import Project from '@/models/Project'
import { sequelize } from '@/config/database'
import { uploadImageToBlob } from '@/lib/storage/blob'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const { projectId, description, title, genre, userApiKey } = await request.json()

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'Project ID is required' },
        { status: 400 }
      )
    }

    if (!description) {
      return NextResponse.json(
        { success: false, error: 'Project description is required' },
        { status: 400 }
      )
    }

    // BYOK: Use user-provided key if available, fallback to server key for development
    const geminiApiKey = userApiKey || process.env.GOOGLE_GEMINI_API_KEY

    if (!geminiApiKey) {
      return NextResponse.json({
        success: false,
        error: 'Google Gemini API key required. Please configure BYOK settings.',
        requiresBYOK: true
      }, { status: 400 })
    }

    // Build a cinematic billboard prompt
    const projectInfo = [
      title ? `Film Title: ${title}` : '',
      genre ? `Genre: ${genre}` : '',
      `Concept: ${description}`
    ].filter(Boolean).join('\n')

    const enhancedPrompt = `Create a cinematic billboard image for a film with the following details:

${projectInfo}

Style Requirements:
- Professional film poster quality, suitable for billboard display
- Cinematic lighting with high contrast and dramatic shadows
- Visually striking composition with strong focal point
- Film marketing quality, eye-catching and memorable
- Wide angle cinematic framing
- Professional studio lighting with dramatic highlights
- 16:9 landscape aspect ratio
- No text, titles, or watermarks on the image
- Photorealistic or stylized based on genre appropriateness`

    console.log('[Thumbnail] Generating with Gemini/Imagen...')

    // Try multiple Gemini image models
    const modelsToTry = [
      'gemini-2.0-flash-exp',  // Gemini 2.0 Flash experimental
      'gemini-1.5-flash',      // Gemini 1.5 Flash (known to work for text)
      'gemini-1.5-pro'         // Gemini Pro (fallback)
    ]

    let imageUrl: string | null = null
    let usedModel: string | null = null

    for (const model of modelsToTry) {
      try {
        console.log(`[Thumbnail] Trying model: ${model}`)
        
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ 
                parts: [{ 
                  text: `Generate an image: ${enhancedPrompt}` 
                }] 
              }]
            })
          }
        )
        
        if (!response.ok) {
          console.log(`[Thumbnail] Model ${model} returned ${response.status}`)
          continue
        }
        
        const data = await response.json()
        
        // Try to extract image from response
        if (data?.candidates?.[0]?.content?.parts) {
          for (const part of data.candidates[0].content.parts) {
            const inlineData = part.inlineData || part.inline_data
            if (inlineData?.mimeType?.startsWith('image/') && inlineData?.data) {
              imageUrl = `data:${inlineData.mimeType};base64,${inlineData.data}`
              usedModel = model
              break
            }
          }
        }
        
        if (imageUrl) break // Success!
        
      } catch (error) {
        console.log(`[Thumbnail] Model ${model} failed:`, error)
        continue
      }
    }

    if (!imageUrl) {
      return NextResponse.json({
        success: false,
        error: 'No Gemini models available for image generation. Imagen may require Vertex AI or special access.',
        triedModels: modelsToTry
      }, { status: 503 })
    }

    console.log(`[Thumbnail] Success with model: ${usedModel}`)
    
    // Upload to Vercel Blob instead of storing base64
    console.log('[Thumbnail] Uploading to Vercel Blob storage...')
    const blobUrl = await uploadImageToBlob(imageUrl, `thumbnails/${projectId}-${Date.now()}.png`)
    console.log('[Thumbnail] Uploaded to Blob:', blobUrl)
    
    // Update project metadata with the thumbnail
    await sequelize.authenticate()
    
    const project = await Project.findByPk(projectId)
    if (!project) {
      return NextResponse.json({
        success: false,
        error: 'Project not found'
      }, { status: 404 })
    }

    // Update the metadata with Blob URL, not base64
    const updatedMetadata = {
      ...project.metadata,
      thumbnail: blobUrl, // URL instead of base64
      thumbnailGeneratedAt: new Date().toISOString()
    }

    await project.update({ metadata: updatedMetadata })

    console.log('[Thumbnail] Successfully generated and saved thumbnail for project:', projectId)

    return NextResponse.json({ 
      success: true, 
      imageUrl: blobUrl, // Return Blob URL, not base64
      model: usedModel || 'unknown',
      provider: 'google-gemini',
      usedBYOK: !!userApiKey,
      storageType: 'vercel-blob'
    })

  } catch (error) {
    console.error('[Thumbnail] Generation error:', error)
    return NextResponse.json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 })
  }
}

