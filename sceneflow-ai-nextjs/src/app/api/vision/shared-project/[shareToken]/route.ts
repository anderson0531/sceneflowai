import { NextRequest, NextResponse } from 'next/server'
import Project from '../../../../../models/Project'
import { sequelize } from '../../../../../config/database'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shareToken: string }> }
) {
  try {
    const { shareToken } = await params
    
    if (!shareToken) {
      return NextResponse.json({ error: 'Share token required' }, { status: 400 })
    }

    await sequelize.authenticate()
    
    // Find project with this share token or slug
    const projects = await Project.findAll()
    const project = projects.find(p => {
      const screeningLink = p.metadata?.screeningRoomShareLink
      const storyboardLink = p.metadata?.storyboardShareLink
      return (screeningLink?.shareToken === shareToken && screeningLink?.isActive) ||
             (storyboardLink?.shareToken === shareToken && storyboardLink?.isActive) ||
             (screeningLink?.slug === shareToken && screeningLink?.isActive) ||
             (storyboardLink?.slug === shareToken && storyboardLink?.isActive)
    })

    if (!project) {
      console.log(`[Get Shared Project] Share token/slug not found or inactive: ${shareToken}`)
      return NextResponse.json({ error: 'Share link not found or expired' }, { status: 404 })
    }

    // Determine which link was used and increment view count
    const isStoryboard = (project.metadata?.storyboardShareLink?.shareToken === shareToken || project.metadata?.storyboardShareLink?.slug === shareToken)
    const metadataKey = isStoryboard ? 'storyboardShareLink' : 'screeningRoomShareLink'
    const shareLink = project.metadata[metadataKey]
    
    // Make sure we pass the exact token used for feedback linking back
    const actualShareToken = shareLink.shareToken
    
    shareLink.viewCount = (shareLink.viewCount || 0) + 1
    await project.update({
      metadata: {
        ...project.metadata,
        [metadataKey]: shareLink
      }
    })

    // Return only necessary data (no sensitive info)
    const sharedData = {
      title: project.title,
      script: project.metadata?.visionPhase?.script,
      characters: project.metadata?.visionPhase?.characters,
      sceneProductionState: project.metadata?.visionPhase?.production?.scenes,
      allowedFeatures: shareLink.allowedFeatures,
      shareToken: actualShareToken // Pass this back so the feedback API can find it
    }

    console.log(`[Get Shared Project] Serving shared project: ${project.title} (views: ${shareLink.viewCount})`)

    return NextResponse.json({
      success: true,
      project: sharedData
    })
  } catch (error: any) {
    console.error('[Get Shared Project] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to load shared project' },
      { status: 500 }
    )
  }
}
