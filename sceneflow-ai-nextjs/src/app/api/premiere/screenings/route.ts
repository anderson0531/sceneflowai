import { NextRequest, NextResponse } from 'next/server'
import {
  createPremiereScreeningFromUpload,
  listPremiereScreenings,
  updatePremiereScreening,
} from '@/lib/premiere/screenings'
import { listPremiereFeedback, summarizePremiereFeedback } from '@/lib/premiere/feedback'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const projectId = (request.nextUrl.searchParams.get('projectId') || '').trim()
    const streamId = (request.nextUrl.searchParams.get('streamId') || '').trim()
    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
    }

    const screenings = await listPremiereScreenings(projectId)
    const feedbackItems = await listPremiereFeedback(projectId, {
      streamId: streamId || undefined,
    })
    const feedbackByScreeningId = new Map<string, ReturnType<typeof summarizePremiereFeedback>>()
    for (const screening of screenings) {
      const linked = feedbackItems.filter((item) => item.screeningId === screening.id)
      feedbackByScreeningId.set(screening.id, summarizePremiereFeedback(linked))
    }
    const items = screenings
      .filter((item) => !streamId || item.streamId === streamId)
      .map((item) => ({
        ...item,
        ...feedbackByScreeningId.get(item.id),
      }))
    return NextResponse.json({ success: true, items })
  } catch (error: any) {
    console.error('[Premiere Screenings] GET error:', error?.message || String(error))
    return NextResponse.json(
      { error: error?.message || 'Failed to list screenings' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      projectId?: string
      title?: string
      videoUrl?: string
      streamId?: string
      streamLabel?: string
      locale?: string
      sourceType?: 'video' | 'animatic'
      source?: 'external_upload' | 'final_cut_export'
    }

    const projectId = (body.projectId || '').trim()
    const title = (body.title || '').trim()
    const videoUrl = (body.videoUrl || '').trim()
    if (!projectId || !title || !videoUrl) {
      return NextResponse.json(
        { error: 'projectId, title, and videoUrl are required' },
        { status: 400 }
      )
    }

    const record = await createPremiereScreeningFromUpload({
      projectId,
      title,
      videoUrl,
      streamId: body.streamId,
      streamLabel: body.streamLabel,
      locale: body.locale,
      sourceType: body.sourceType,
      source: body.source || 'external_upload',
    })

    return NextResponse.json({ success: true, item: record })
  } catch (error: any) {
    console.error('[Premiere Screenings] POST error:', error?.message || String(error))
    return NextResponse.json(
      { error: error?.message || 'Failed to create screening' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      projectId?: string
      screeningId?: string
      title?: string
      owner?: string
      reviewStatus?: 'open' | 'in_review' | 'resolved'
      status?: 'draft' | 'active' | 'completed' | 'expired'
      feedbackCount?: number
      avgRating?: number
      latestFeedbackAt?: string
      openItems?: number
    }

    const projectId = (body.projectId || '').trim()
    const screeningId = (body.screeningId || '').trim()
    if (!projectId || !screeningId) {
      return NextResponse.json(
        { error: 'projectId and screeningId are required' },
        { status: 400 }
      )
    }

    const item = await updatePremiereScreening(projectId, screeningId, {
      title: typeof body.title === 'string' ? body.title : undefined,
      owner: body.owner,
      reviewStatus: body.reviewStatus,
      status: body.status,
      feedbackCount: body.feedbackCount,
      avgRating: body.avgRating,
      latestFeedbackAt: body.latestFeedbackAt,
      openItems: body.openItems,
    })
    if (!item) {
      return NextResponse.json(
        { error: 'Screening not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, item })
  } catch (error: any) {
    console.error('[Premiere Screenings] PATCH error:', error?.message || String(error))
    return NextResponse.json(
      { error: error?.message || 'Failed to update screening' },
      { status: 500 }
    )
  }
}
