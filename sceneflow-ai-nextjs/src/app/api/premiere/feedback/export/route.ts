import { NextRequest, NextResponse } from 'next/server'
import { listPremiereFeedback } from '@/lib/premiere/feedback'

export const dynamic = 'force-dynamic'

function csvEscape(value: string): string {
  return `"${value.replaceAll('"', '""')}"`
}

export async function GET(request: NextRequest) {
  try {
    const projectId = (request.nextUrl.searchParams.get('projectId') || '').trim()
    const screeningId = (request.nextUrl.searchParams.get('screeningId') || '').trim()
    const format = (request.nextUrl.searchParams.get('format') || 'csv').trim().toLowerCase()
    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
    }

    const items = await listPremiereFeedback(projectId, { screeningId: screeningId || undefined })
    if (format === 'json') {
      return NextResponse.json({ success: true, items })
    }

    const header = [
      'id',
      'projectId',
      'screeningId',
      'streamId',
      'author',
      'rating',
      'status',
      'owner',
      'tags',
      'comment',
      'createdAt',
      'updatedAt',
    ]
    const rows = items.map((item) =>
      [
        item.id,
        item.projectId,
        item.screeningId,
        item.streamId || '',
        item.author,
        String(item.rating),
        item.status,
        item.owner || '',
        item.tags.join('|'),
        item.comment,
        item.createdAt,
        item.updatedAt,
      ]
        .map(csvEscape)
        .join(',')
    )
    const csv = [header.map(csvEscape).join(','), ...rows].join('\n')
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="premiere-feedback-${projectId}.csv"`,
      },
    })
  } catch (error: any) {
    console.error('[Premiere Feedback Export] GET error:', error?.message || String(error))
    return NextResponse.json({ error: error?.message || 'Failed to export feedback' }, { status: 500 })
  }
}

