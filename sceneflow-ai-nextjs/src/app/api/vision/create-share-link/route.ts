import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import Project from '../../../../models/Project'
import { sequelize } from '../../../../config/database'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(request: NextRequest) {
  try {
    const { projectId, linkType = 'screening-room' } = await request.json()
    
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 })
    }

    await sequelize.authenticate()
    const project = await Project.findByPk(projectId)
    
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Generate unique share token
    const shareToken = uuidv4()
    
    // Create share link data
    const shareLink = {
      id: uuidv4(),
      shareToken,
      linkType,
      createdAt: new Date().toISOString(),
      isActive: true,
      viewCount: 0,
      allowedFeatures: {
        translation: true,
        download: false,
        captions: true
      }
    }

    // Save to project metadata
    const metadata = project.metadata || {}
    const metadataKey = linkType === 'storyboard' ? 'storyboardShareLink' : 'screeningRoomShareLink'
    
    await project.update({
      metadata: {
        ...metadata,
        [metadataKey]: shareLink
      }
    })

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://sceneflow-ai-nextjs.vercel.app'
    const shareUrl = linkType === 'storyboard' 
      ? `${baseUrl}/share/storyboard/${shareToken}`
      : `${baseUrl}/share/screening-room/${shareToken}`

    console.log(`[Create Share Link] Created ${linkType} link for project ${projectId}: ${shareUrl}`)

    return NextResponse.json({
      success: true,
      shareUrl,
      shareToken,
      linkType
    })
  } catch (error: any) {
    console.error('[Create Share Link] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create share link' },
      { status: 500 }
    )
  }
}
