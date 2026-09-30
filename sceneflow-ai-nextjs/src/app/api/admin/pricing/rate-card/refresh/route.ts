import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/admin/requireAdmin'
import { fetchLatestProviderQuotes } from '@/lib/credits/fetchProviderQuotes'
import { getSeededRate } from '@/lib/credits/quoteGenerationCredits'
import { saveRateDraft } from '@/lib/credits/rateCardStore'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const session = await requireAdminSession()
  if (!session.authorized) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const quotes = await fetchLatestProviderQuotes()
  const diff = quotes.updates.map((update) => {
    const seed = getSeededRate(update.operation)
    return {
      ...update,
      seededUsdPerUnit: seed?.usdPerUnit ?? null,
      changed: seed ? Math.abs(seed.usdPerUnit - update.usdPerUnit) > 0.0005 : true,
    }
  })

  let drafts: unknown[] = []
  if (body.applyDrafts === true) {
    drafts = []
    for (const update of quotes.updates) {
      drafts.push(
        await saveRateDraft({
          operation: update.operation,
          usdPerUnit: update.usdPerUnit,
          sourceUrl: update.sourceUrl,
          notes: 'Fetched public list price. Not live until published.',
          fetchedAt: new Date(quotes.fetchedAt),
        })
      )
    }
  }

  return NextResponse.json({
    fetchedAt: quotes.fetchedAt,
    errors: quotes.errors,
    diff,
    drafts,
    applied: body.applyDrafts === true,
  })
}
