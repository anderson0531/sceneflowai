import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { freesoundTextSearch, getFreesoundApiKey } from '@/lib/freesound/server'

export const dynamic = 'force-dynamic'

const MAX_PAGE_SIZE = 30

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!getFreesoundApiKey()) {
      return NextResponse.json(
        { error: 'Freesound is not configured (missing FREESOUND_API_KEY).' },
        { status: 503 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const q = typeof body.q === 'string' ? body.q : ''
    const page = typeof body.page === 'number' && body.page >= 1 ? body.page : 1
    const pageSize =
      typeof body.pageSize === 'number'
        ? Math.min(MAX_PAGE_SIZE, Math.max(1, body.pageSize))
        : 15

    if (q.length > 200) {
      return NextResponse.json({ error: 'Query too long' }, { status: 400 })
    }

    const data = await freesoundTextSearch(q, page, pageSize)
    return NextResponse.json(data)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Search failed'
    console.error('[freesound/search]', msg)
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
