import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/admin/requireAdmin'
import {
  creditsForProviderUsd,
  marginPercents,
  quoteGenerationCredits,
  SEEDED_PROVIDER_RATES,
} from '@/lib/credits/quoteGenerationCredits'
import { listRateCardRows, saveRateDraft, seedToRateCardRow } from '@/lib/credits/rateCardStore'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function previewForSeed(operation: string, usdPerUnit: number, markup: number, creditsPerUnitOverride: number | null) {
  const seed = SEEDED_PROVIDER_RATES.find((rate) => rate.operation === operation)
  if (!seed) return null
  const units = seed.metric === 'per_second' ? 10 : 1
  const providerUsd = usdPerUnit * units
  const credits = creditsForProviderUsd(providerUsd, markup, creditsPerUnitOverride, units)
  return {
    exampleUnits: units,
    providerUsd,
    credits,
    ...marginPercents(credits, providerUsd),
  }
}

export async function GET() {
  const session = await requireAdminSession()
  if (!session.authorized) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 401 })
  }

  const stored = await listRateCardRows()
  const seeds = SEEDED_PROVIDER_RATES.map((seed) => {
    const row = seedToRateCardRow(seed)
    const quote = quoteGenerationCredits({
      kind: seed.metric === 'per_image' ? 'still' : 'clip',
      provider: seed.provider,
      model: seed.model,
      resolution: seed.resolution,
      audio: seed.audio !== false,
      durationSeconds: 10,
      imageCount: 1,
      floorCredits: seed.metric === 'per_image' ? 10 : undefined,
    })
    return {
      ...row,
      example: {
        exampleUnits: quote.units,
        providerUsd: quote.providerUsd,
        credits: quote.credits,
        faceMarginPercent: quote.faceMarginPercent,
        studioMarginPercent: quote.studioMarginPercent,
      },
    }
  })

  return NextResponse.json({
    seeds,
    rows: stored.map((row) => ({
      ...row,
      example: previewForSeed(row.operation, row.usdPerUnit, row.markup, row.creditsPerUnitOverride),
    })),
  })
}

export async function POST(req: NextRequest) {
  const session = await requireAdminSession()
  if (!session.authorized) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 401 })
  }

  const body = await req.json()
  const usdPerUnit = Number(body.usdPerUnit)
  const markup = body.markup == null ? undefined : Number(body.markup)
  if (!body.operation || !(usdPerUnit > 0)) {
    return NextResponse.json({ error: 'operation and usdPerUnit are required' }, { status: 400 })
  }

  const draft = await saveRateDraft({
    operation: String(body.operation),
    usdPerUnit,
    markup,
    creditsPerUnitOverride:
      body.creditsPerUnitOverride == null || body.creditsPerUnitOverride === ''
        ? null
        : Number(body.creditsPerUnitOverride),
    sourceUrl: body.sourceUrl ?? null,
    notes: body.notes ?? `Draft saved by ${session.email || 'admin'}`,
    fetchedAt: body.fetchedAt ? new Date(body.fetchedAt) : null,
  })

  return NextResponse.json({ draft })
}
