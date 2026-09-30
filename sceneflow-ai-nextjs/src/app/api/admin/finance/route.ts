import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/admin/requireAdmin'
import { loadFinanceSummary } from '@/lib/credits/financeReport'
import { ensurePricingAdminSchema } from '@/lib/credits/rateCardStore'
import { PlatformInfraCost } from '@/models'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function startOfDay(value: string | null, fallback: Date): Date {
  if (!value) return fallback
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? fallback : parsed
}

export async function GET(req: NextRequest) {
  const session = await requireAdminSession()
  if (!session.authorized) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 401 })
  }

  const now = new Date()
  const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const start = startOfDay(req.nextUrl.searchParams.get('from'), defaultStart)
  const end = startOfDay(req.nextUrl.searchParams.get('to'), now)
  const summary = await loadFinanceSummary(start, end)
  return NextResponse.json({ from: start.toISOString(), to: end.toISOString(), summary })
}

export async function POST(req: NextRequest) {
  const session = await requireAdminSession()
  if (!session.authorized) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 401 })
  }

  const body = await req.json()
  const amount = Number(body.amountUsd)
  const source = body.source === 'gcp' || body.source === 'vercel' || body.source === 'other' ? body.source : null
  const period = typeof body.periodMonth === 'string' ? body.periodMonth.slice(0, 10) : ''
  if (!source || !(amount >= 0) || !/^\d{4}-\d{2}-\d{2}$/.test(period)) {
    return NextResponse.json(
      { error: 'source (gcp, vercel, other), periodMonth (YYYY-MM-DD), and amountUsd are required' },
      { status: 400 }
    )
  }

  await ensurePricingAdminSchema()
  const row = await PlatformInfraCost.create({
    period_month: period,
    source,
    amount_usd: amount,
    notes: body.notes ? String(body.notes) : null,
  })

  return NextResponse.json({
    entry: {
      id: row.id,
      periodMonth: row.period_month,
      source: row.source,
      amountUsd: Number(row.amount_usd),
      notes: row.notes,
    },
  })
}
