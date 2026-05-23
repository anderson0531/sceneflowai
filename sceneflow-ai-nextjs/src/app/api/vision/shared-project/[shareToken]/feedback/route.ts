import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { consumeReviewerEmailToken } from '@/lib/email/reviewerOtp'
import { findActiveShareProject } from '@/lib/storyboard/shareProjectLookup'

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
    const {
      feedbacks,
      reviewerFirstName,
      reviewerLastName,
      reviewerEmail,
      emailVerificationToken,
      storyboardVersion: rawVersion,
    } = body

    const firstName = typeof reviewerFirstName === 'string' ? reviewerFirstName.trim() : ''
    const lastName = typeof reviewerLastName === 'string' ? reviewerLastName.trim() : ''
    const email = typeof reviewerEmail === 'string' ? reviewerEmail.trim().toLowerCase() : ''
    const token = typeof emailVerificationToken === 'string' ? emailVerificationToken.trim() : ''

    if (!firstName || !lastName) {
      return NextResponse.json({ error: 'First and last name are required' }, { status: 400 })
    }
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid verified email is required' }, { status: 400 })
    }
    if (!token) {
      return NextResponse.json({ error: 'Email verification is required' }, { status: 401 })
    }

    const verified = await consumeReviewerEmailToken(email, token)
    if (!verified) {
      return NextResponse.json({ error: 'Email verification expired or invalid. Please verify again.' }, { status: 401 })
    }

    if (!feedbacks || typeof feedbacks !== 'object') {
      return NextResponse.json({ error: 'Feedbacks object required' }, { status: 400 })
    }

    const project = await findActiveShareProject(shareToken)
    if (!project) {
      return NextResponse.json({ error: 'Share link not found or expired' }, { status: 404 })
    }

    const metadata = project.metadata || {}
    const storyboardLink = metadata.storyboardShareLink
    const actualShareToken = storyboardLink?.shareToken || shareToken

    const currentRevision = metadata.storyboardRevision
    const currentVersion =
      currentRevision && typeof currentRevision.version === 'number' ? currentRevision.version : 1
    let stampedVersion = typeof rawVersion === 'number' ? rawVersion : parseInt(String(rawVersion), 10)
    if (Number.isNaN(stampedVersion) || stampedVersion < 1) stampedVersion = 1
    if (stampedVersion > currentVersion) stampedVersion = currentVersion

    const reviewerName = `${firstName} ${lastName}`.trim()
    const verifiedEmailAt = new Date().toISOString()
    const timestamp = verifiedEmailAt

    const newFeedbackEntries = Object.entries(feedbacks)
      .map(([sceneIndexStr, feedbackData]: [string, any]) => {
        const tags = Array.isArray(feedbackData.tags)
          ? feedbackData.tags.filter((t: unknown) => typeof t === 'string')
          : []
        const rating = feedbackData.rating || 0
        const comment = feedbackData.comment || ''
        return {
          id: uuidv4(),
          shareToken: actualShareToken,
          sceneIndex: parseInt(sceneIndexStr, 10),
          rating,
          comment,
          tags,
          createdAt: timestamp,
          reviewerName,
          reviewerFirstName: firstName,
          reviewerLastName: lastName,
          reviewerEmail: email,
          verifiedEmailAt,
          storyboardVersion: stampedVersion,
        }
      })
      .filter(
        (entry) => entry.rating > 0 || entry.comment.trim() !== '' || entry.tags.length > 0
      )

    if (newFeedbackEntries.length === 0) {
      return NextResponse.json({ success: true, message: 'No actionable feedback provided' })
    }

    const existingFeedback = Array.isArray(metadata.storyboardFeedback) ? metadata.storyboardFeedback : []
    const updatedFeedback = [...existingFeedback, ...newFeedbackEntries]

    await project.update({
      metadata: {
        ...metadata,
        storyboardFeedback: updatedFeedback,
      },
    })

    console.log(
      `[Submit Feedback] Appended ${newFeedbackEntries.length} entries from ${email} on project: ${project.title}`
    )

    return NextResponse.json({
      success: true,
      message: 'Feedback submitted successfully',
      count: newFeedbackEntries.length,
    })
  } catch (error: unknown) {
    console.error('[Submit Feedback] Error:', error)
    const message = error instanceof Error ? error.message : 'Failed to submit feedback'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
