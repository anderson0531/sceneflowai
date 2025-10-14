import { NextRequest, NextResponse } from 'next/server'
import Project from '@/models/Project'
import { sequelize } from '@/config/database'

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

    console.log('[Thumbnail] Generating billboard image for project:', projectId)

    // Use the existing generate-image endpoint which has proper fallbacks
    const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000'

    const imageGenResponse = await fetch(`${baseUrl}/api/generate-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: enhancedPrompt,
        options: {
          userApiKey: geminiApiKey, // Pass the BYOK key
          width: 1792,
          height: 1024,
          style: 'cinematic'
        }
      })
    })

    if (!imageGenResponse.ok) {
      const error = await imageGenResponse.json().catch(() => ({}))
      console.error('[Thumbnail] Image generation error:', imageGenResponse.status, error)
      return NextResponse.json({ 
        success: false,
        error: error?.error || 'Thumbnail generation failed' 
      }, { status: imageGenResponse.status })
    }

    const imageData = await imageGenResponse.json()
    const imageUrl = imageData?.imageUrl || imageData?.images?.[0]?.dataUrl

    if (!imageUrl) {
      console.error('[Thumbnail] No image URL in response')
      return NextResponse.json({ 
        success: false,
        error: 'No image data returned' 
      }, { status: 500 })
    }
    
    // Update project metadata with the thumbnail
    await sequelize.authenticate()
    
    const project = await Project.findByPk(projectId)
    if (!project) {
      return NextResponse.json({
        success: false,
        error: 'Project not found'
      }, { status: 404 })
    }

    // Update the metadata with the thumbnail
    const updatedMetadata = {
      ...project.metadata,
      thumbnail: imageUrl,
      thumbnailGeneratedAt: new Date().toISOString()
    }

    await project.update({ metadata: updatedMetadata })

    console.log('[Thumbnail] Successfully generated and saved thumbnail for project:', projectId)

    return NextResponse.json({ 
      success: true, 
      imageUrl,
      model: imageData?.model || 'unknown',
      provider: imageData?.provider || 'unknown',
      usedBYOK: !!userApiKey
    })

  } catch (error) {
    console.error('[Thumbnail] Generation error:', error)
    return NextResponse.json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 })
  }
}

