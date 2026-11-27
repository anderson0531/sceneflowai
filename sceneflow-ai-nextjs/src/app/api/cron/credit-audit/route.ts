import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/admin/requireAdmin'
import { runCreditAudit } from '@/lib/credits/creditAuditEngine'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

/**
 * GET /api/cron/credit-audit
 *
 * Automated hourly credit-leakage, balance-integrity, margin-guardrail, and stale-hold sweeper.
 * Fail-closed authentication: requires valid CRON_SECRET bearer token OR an authenticated Admin session.
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET?.trim()
  const authHeader = request.headers.get('authorization')

  let authorized = false
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    authorized = true
  } else {
    const admin = await requireAdminSession().catch(() => ({ authorized: false }))
    if (admin.authorized) {
      authorized = true
    }
  }

  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const dryRun = searchParams.get('dryRun') === '1'
    const report = await runCreditAudit({
      sweepStaleHolds: !dryRun,
      sendAlerts: !dryRun,
    })

    if (report.alerts.length > 0) {
      console.warn(
        `[Cron:CreditAudit] Completed with ${report.alerts.length} alert(s):`,
        report.alerts.map((a) => `${a.code}(${a.severity})`).join(', ')
      )
    } else {
      console.log(
        `[Cron:CreditAudit] Healthy — 24h runs=${report.daily.totalRuns}, COGS=$${report.daily.totalPlatformCogsUsd.toFixed(2)}, margin=${report.daily.effectiveMarginPercent.toFixed(1)}%`
      )
    }

    return NextResponse.json(report, { status: 200 })
  } catch (error: any) {
    console.error('[Cron:CreditAudit] Failed:', error)
    return NextResponse.json(
      { error: 'Credit audit failed', details: error?.message || 'Unknown error' },
      { status: 500 }
    )
  }
}
