import { NextRequest, NextResponse } from 'next/server'
import {
  createPremiereScreeningFromUpload,
  listPremiereScreenings,
  updatePremiereScreeningTitle,
} from '@/lib/premiere/screenings'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const projectId = (request.nextUrl.searchParams.get('projectId') || '').trim()
    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
    }

    const items = await listPremiereScreenings(projectId)
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
    }

    const projectId = (body.projectId || '').trim()
    const screeningId = (body.screeningId || '').trim()
    const title = (body.title || '').trim()
    if (!projectId || !screeningId || !title) {
      return NextResponse.json(
        { error: 'projectId, screeningId, and title are required' },
        { status: 400 }
      )
    }

    const item = await updatePremiereScreeningTitle(projectId, screeningId, title)
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
