import { NextRequest, NextResponse } from 'next/server'
import {
  createPremiereFeedback,
  listPremiereFeedback,
  summarizePremiereFeedback,
  updatePremiereFeedback,
} from '@/lib/premiere/feedback'
import { updatePremiereScreening } from '@/lib/premiere/screenings'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const projectId = (request.nextUrl.searchParams.get('projectId') || '').trim()
    const screeningId = (request.nextUrl.searchParams.get('screeningId') || '').trim()
    const streamId = (request.nextUrl.searchParams.get('streamId') || '').trim()
    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
    }

    const items = await listPremiereFeedback(projectId, {
      screeningId: screeningId || undefined,
      streamId: streamId || undefined,
    })
    const summary = summarizePremiereFeedback(items)
    return NextResponse.json({ success: true, items, summary })
  } catch (error: any) {
    console.error('[Premiere Feedback] GET error:', error?.message || String(error))
    return NextResponse.json({ error: error?.message || 'Failed to list feedback' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      projectId?: string
      screeningId?: string
      streamId?: string
      author?: string
      rating?: number
      comment?: string
      tags?: string[]
    }
    const projectId = (body.projectId || '').trim()
    const screeningId = (body.screeningId || '').trim()
    const comment = (body.comment || '').trim()
    const rating = typeof body.rating === 'number' ? body.rating : 3

    if (!projectId || !screeningId || !comment) {
      return NextResponse.json(
        { error: 'projectId, screeningId, and comment are required' },
        { status: 400 }
      )
    }

    const item = await createPremiereFeedback({
      projectId,
      screeningId,
      streamId: body.streamId,
      author: body.author,
      rating,
      comment,
      tags: body.tags,
    })

    const items = await listPremiereFeedback(projectId, { screeningId })
    const summary = summarizePremiereFeedback(items)
    await updatePremiereScreening(projectId, screeningId, {
      feedbackCount: summary.feedbackCount,
      avgRating: summary.avgRating,
      latestFeedbackAt: summary.latestFeedbackAt,
      openItems: summary.openItems,
    })

    return NextResponse.json({ success: true, item, summary })
  } catch (error: any) {
    console.error('[Premiere Feedback] POST error:', error?.message || String(error))
    return NextResponse.json({ error: error?.message || 'Failed to create feedback' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      projectId?: string
      screeningId?: string
      feedbackId?: string
      status?: 'open' | 'in_review' | 'resolved'
      tags?: string[]
      owner?: string
      comment?: string
      rating?: number
    }
    const projectId = (body.projectId || '').trim()
    const screeningId = (body.screeningId || '').trim()
    const feedbackId = (body.feedbackId || '').trim()
    if (!projectId || !screeningId || !feedbackId) {
      return NextResponse.json(
        { error: 'projectId, screeningId, and feedbackId are required' },
        { status: 400 }
      )
    }

    const item = await updatePremiereFeedback(projectId, screeningId, feedbackId, {
      status: body.status,
      tags: body.tags,
      owner: body.owner,
      comment: body.comment,
      rating: body.rating,
    })
    if (!item) {
      return NextResponse.json({ error: 'Feedback not found' }, { status: 404 })
    }

    const items = await listPremiereFeedback(projectId, { screeningId })
    const summary = summarizePremiereFeedback(items)
    await updatePremiereScreening(projectId, screeningId, {
      feedbackCount: summary.feedbackCount,
      avgRating: summary.avgRating,
      latestFeedbackAt: summary.latestFeedbackAt,
      openItems: summary.openItems,
      reviewStatus: summary.openItems > 0 ? 'in_review' : 'resolved',
    })

    return NextResponse.json({ success: true, item, summary })
  } catch (error: any) {
    console.error('[Premiere Feedback] PATCH error:', error?.message || String(error))
    return NextResponse.json({ error: error?.message || 'Failed to update feedback' }, { status: 500 })
  }
}

