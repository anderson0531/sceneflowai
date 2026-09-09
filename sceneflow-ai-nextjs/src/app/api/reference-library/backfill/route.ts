import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import '@/models'
import {
  backfillProjectLibrary,
  backfillSeriesLibrary,
  backfillUserLibrary,
} from '@/lib/referenceLibrary/backfill'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const { projectId, seriesId, scope } = body as {
    projectId?: string
    seriesId?: string
    scope?: 'project' | 'series' | 'user'
  }

  try {
    if (projectId) {
      const result = await backfillProjectLibrary(projectId, session.user.id)
      return NextResponse.json({ success: true, result })
    }
    if (seriesId) {
      const result = await backfillSeriesLibrary(seriesId, session.user.id)
      return NextResponse.json({ success: true, result })
    }
    if (scope === 'user') {
      const result = await backfillUserLibrary(session.user.id)
      return NextResponse.json({ success: true, result })
    }

    return NextResponse.json(
      { error: 'Provide projectId, seriesId, or scope=user' },
      { status: 400 }
    )
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Backfill failed'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
