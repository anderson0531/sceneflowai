import { NextRequest, NextResponse } from 'next/server'
import Project from '../../../../../../models/Project'
import { sequelize } from '../../../../../../config/database'
import { v4 as uuidv4 } from 'uuid'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ shareToken: string }> }
) {
  try {
    const { shareToken } = await params
    
    if (!shareToken) {
      return NextResponse.json({ error: 'Share token required' }, { status: 400 })
    }

    const body = await request.json()
    const { feedbacks, reviewerName } = body

    if (!feedbacks || typeof feedbacks !== 'object') {
      return NextResponse.json({ error: 'Feedbacks object required' }, { status: 400 })
    }

    await sequelize.authenticate()
    
    // Find project with this share token
    const projects = await Project.findAll()
    const project = projects.find(p => {
      const screeningLink = p.metadata?.screeningRoomShareLink
      const storyboardLink = p.metadata?.storyboardShareLink
      return (screeningLink?.shareToken === shareToken && screeningLink?.isActive) ||
             (storyboardLink?.shareToken === shareToken && storyboardLink?.isActive)
    })

    if (!project) {
      console.log(`[Submit Feedback] Share token not found or inactive: ${shareToken}`)
      return NextResponse.json({ error: 'Share link not found or expired' }, { status: 404 })
    }

    // Format new feedback entries
    const timestamp = new Date().toISOString()
    const newFeedbackEntries = Object.entries(feedbacks).map(([sceneIndexStr, feedbackData]: [string, any]) => {
      return {
        id: uuidv4(),
        shareToken,
        sceneIndex: parseInt(sceneIndexStr, 10),
        rating: feedbackData.rating || 0,
        comment: feedbackData.comment || '',
        createdAt: timestamp,
        reviewerName: reviewerName || 'Anonymous'
      }
    }).filter(entry => entry.rating > 0 || entry.comment.trim() !== '')

    if (newFeedbackEntries.length === 0) {
      return NextResponse.json({ success: true, message: 'No actionable feedback provided' })
    }

    // Append to existing feedback array
    const metadata = project.metadata || {}
    const existingFeedback = Array.isArray(metadata.storyboardFeedback) ? metadata.storyboardFeedback : []
    
    const updatedFeedback = [...existingFeedback, ...newFeedbackEntries]

    await project.update({
      metadata: {
        ...metadata,
        storyboardFeedback: updatedFeedback
      }
    })

    console.log(`[Submit Feedback] Appended ${newFeedbackEntries.length} feedback entries to project: ${project.title}`)

    return NextResponse.json({
      success: true,
      message: 'Feedback submitted successfully'
    })
  } catch (error: any) {
    console.error('[Submit Feedback] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to submit feedback' },
      { status: 500 }
    )
  }
}
