import { NextRequest, NextResponse } from 'next/server'
import { searchEpidemicSfx } from '@/lib/audio/epidemicClient'
import { rankSfxCandidates } from '@/lib/audio/sfxRanking'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const {
      query,
      sceneContext,
      limit = 8,
      targetDurationSec = 2,
    } = await req.json()

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'query is required' }, { status: 400 })
    }

    const compoundQuery = [query, sceneContext].filter(Boolean).join(' | ')
    const candidates = await searchEpidemicSfx(compoundQuery, Math.min(Math.max(limit, 1), 20))
    const ranked = rankSfxCandidates(compoundQuery, candidates, targetDurationSec)

    return NextResponse.json({
      success: true,
      query: compoundQuery,
      results: ranked,
    })
  } catch (error: any) {
    console.error('[Epidemic Search] Error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to search Epidemic SFX' },
      { status: 500 }
    )
  }
}
