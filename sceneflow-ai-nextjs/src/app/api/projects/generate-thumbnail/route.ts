import { NextRequest, NextResponse } from 'next/server'
import Project from '@/models/Project'
import { sequelize } from '@/config/database'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const { projectId, description, title, genre } = await request.json()

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

    const openaiKey = process.env.OPENAI_API_KEY
    if (!openaiKey) {
      return NextResponse.json(
        { success: false, error: 'OpenAI API key not configured' },
        { status: 500 }
      )
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

    // Call OpenAI DALL-E 3
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: enhancedPrompt,
        size: '1792x1024', // 16:9 landscape for billboard
        quality: 'hd',
        n: 1,
        response_format: 'b64_json'
      })
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      console.error('[Thumbnail] OpenAI error:', response.status, error)
      
      if (response.status === 400 && error?.error?.code === 'content_policy_violation') {
        return NextResponse.json({ 
          success: false,
          error: 'Content policy violation. Please try a different project description.' 
        }, { status: 400 })
      }
      
      return NextResponse.json({ 
        success: false,
        error: error?.error?.message || 'Thumbnail generation failed' 
      }, { status: response.status })
    }

    const data = await response.json()
    const b64 = data?.data?.[0]?.b64_json
    
    if (!b64) {
      return NextResponse.json({ 
        success: false,
        error: 'No image data returned' 
      }, { status: 500 })
    }

    const imageUrl = `data:image/png;base64,${b64}`
    
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
      model: 'dall-e-3',
      provider: 'openai'
    })

  } catch (error) {
    console.error('[Thumbnail] Generation error:', error)
    return NextResponse.json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 })
  }
}

