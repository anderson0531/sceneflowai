import { NextResponse } from 'next/server'
import { getPublishedRateCardSnapshot } from '@/lib/credits/rateCardStore'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/credits/rate-card
 *
 * Public, CDN-cached snapshot of published `credit_pricing` rows merged over
 * `SEEDED_PROVIDER_RATES`. Consumed by `useLiveRateCard()` so every budget
 * calculator, project estimator, Production Builder preview, and confirmation
 * dialog dynamically reflects Admin Rate Card publishes.
 */
export async function GET() {
  try {
    const snapshot = await getPublishedRateCardSnapshot()
    return NextResponse.json(snapshot, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    })
  } catch (error) {
    console.error('[GET /api/credits/rate-card] Error:', error)
    return NextResponse.json(
      { error: 'Failed to load live rate card' },
      { status: 500 }
    )
  }
}
