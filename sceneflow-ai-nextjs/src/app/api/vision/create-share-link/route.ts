import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import Project from '../../../../models/Project'
import { sequelize } from '../../../../config/database'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(request: NextRequest) {
  try {
    const { projectId } = await request.json()
    
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
    await project.update({
      metadata: {
        ...metadata,
        screeningRoomShareLink: shareLink
      }
    })

    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://sceneflow-ai-nextjs.vercel.app'}/share/screening-room/${shareToken}`

    console.log(`[Create Share Link] Created share link for project ${projectId}: ${shareUrl}`)

    return NextResponse.json({
      success: true,
      shareUrl,
      shareToken
    })
  } catch (error: any) {
    console.error('[Create Share Link] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create share link' },
      { status: 500 }
    )
  }
}
