/**
 * Automated Credit Audit & Reconciliation Engine
 *
 * Runs 4 automated financial integrity invariants:
 * 1. Run-to-Ledger Parity: platform provider runs that succeeded/timed-out with NO credit_ledger deduction
 * 2. Balance Integrity: users.credits vs sum(active credit_lots.remaining)
 * 3. Rolling Margin & Unbilled COGS Guardrail: 1h & 24h COGS vs credit revenue
 * 4. Stale Hold Sweeper: expires abandoned PENDING credit_holds past expires_at
 */

import { Op } from 'sequelize'
import { CreditHold, CreditLotRow, ProviderApiRun, User } from '@/models'
import { ensureCreditHoldsTable } from '@/lib/database/migrateCreditHolds'
import { ensureProviderApiRunsTable } from '@/lib/database/migrateProviderApiRuns'
import { ensureCreditLotsTable } from '@/lib/database/migrateCreditLots'
import { CREDIT_EXCHANGE_RATE } from './creditCosts'

export interface AuditAlert {
  severity: 'warning' | 'critical'
  code: string
  message: string
  details?: Record<string, unknown>
}

export interface UnbilledRunSample {
  id: string
  route: string
  provider: string
  model: string
  operation: string
  status: string
  estimatedCogsUsd: number
  userId: string | null
  createdAt: string
}

export interface BalanceDriftSample {
  userId: string
  userCreditsColumn: number
  activeLotsSum: number
  drift: number
}

export interface WindowEconomics {
  windowHours: number
  totalRuns: number
  succeededRuns: number
  rateLimitedRuns: number
  failedRuns: number
  timedOutRuns: number
  unbilledPlatformRuns: number
  unbilledCogsUsd: number
  totalPlatformCogsUsd: number
  totalChargedCredits: number
  estimatedRevenueUsd: number
  effectiveMarginPercent: number
}

export interface CreditAuditReport {
  generatedAt: string
  ok: boolean
  alerts: AuditAlert[]
  hourly: WindowEconomics
  daily: WindowEconomics
  unbilledSamples: UnbilledRunSample[]
  balanceDriftCount: number
  balanceDriftSamples: BalanceDriftSample[]
  staleHoldsExpired: number
  staleHoldsTotalCredits: number
}

export interface AuditThresholds {
  minMarginPercent: number
  maxUnbilledCogsHourlyUsd: number
  maxUnbilledRunsHourly: number
  blendedUsdPerCredit: number
}

export const DEFAULT_AUDIT_THRESHOLDS: AuditThresholds = {
  minMarginPercent: Number(process.env.CREDIT_AUDIT_MIN_MARGIN_PCT ?? '40'),
  maxUnbilledCogsHourlyUsd: Number(process.env.CREDIT_AUDIT_MAX_UNBILLED_USD_HR ?? '10'),
  maxUnbilledRunsHourly: Number(process.env.CREDIT_AUDIT_MAX_UNBILLED_RUNS_HR ?? '0'),
  blendedUsdPerCredit: 1 / CREDIT_EXCHANGE_RATE, // $0.01/credit baseline
}

export interface RunLikeRow {
  id: string
  route: string
  provider: string
  model: string
  operation: string
  credential_source: string
  status: string
  estimated_cogs_usd: number | string
  ledger_id: string | null
  charged_credits: number | string
  user_id: string | null
  created_at: Date | string
}

/**
 * Pure computation of window economics and alerts (easily unit-tested without DB).
 */
export function evaluateWindowEconomics(
  runs: RunLikeRow[],
  windowHours: number,
  thresholds: AuditThresholds = DEFAULT_AUDIT_THRESHOLDS
): { economics: WindowEconomics; unbilledSamples: UnbilledRunSample[] } {
  let succeededRuns = 0
  let rateLimitedRuns = 0
  let failedRuns = 0
  let timedOutRuns = 0
  let unbilledPlatformRuns = 0
  let unbilledCogsUsd = 0
  let totalPlatformCogsUsd = 0
  let totalChargedCredits = 0
  const unbilledSamples: UnbilledRunSample[] = []

  for (const r of runs) {
    const cogs = Number(r.estimated_cogs_usd || 0)
    const credits = Number(r.charged_credits || 0)
    const isPlatform = r.credential_source !== 'byok'

    if (r.status === 'succeeded') succeededRuns += 1
    else if (r.status === 'rate_limited') rateLimitedRuns += 1
    else if (r.status === 'timed_out') timedOutRuns += 1
    else if (r.status === 'failed') failedRuns += 1

    if (isPlatform) {
      totalPlatformCogsUsd += cogs
    }
    totalChargedCredits += credits

    const isPotentiallyBilledByProvider =
      r.status === 'succeeded' || r.status === 'timed_out'
    const isMissingCharge = !r.ledger_id && credits <= 0

    if (isPlatform && isPotentiallyBilledByProvider && isMissingCharge && cogs > 0) {
      unbilledPlatformRuns += 1
      unbilledCogsUsd += cogs
      if (unbilledSamples.length < 25) {
        unbilledSamples.push({
          id: r.id,
          route: r.route,
          provider: r.provider,
          model: r.model,
          operation: r.operation,
          status: r.status,
          estimatedCogsUsd: Number(cogs.toFixed(6)),
          userId: r.user_id,
          createdAt:
            r.created_at instanceof Date
              ? r.created_at.toISOString()
              : String(r.created_at),
        })
      }
    }
  }

  const estimatedRevenueUsd = totalChargedCredits * thresholds.blendedUsdPerCredit
  const effectiveMarginPercent =
    totalPlatformCogsUsd <= 0
      ? 100
      : estimatedRevenueUsd <= 0
        ? -100
        : ((estimatedRevenueUsd - totalPlatformCogsUsd) / estimatedRevenueUsd) * 100

  return {
    economics: {
      windowHours,
      totalRuns: runs.length,
      succeededRuns,
      rateLimitedRuns,
      failedRuns,
      timedOutRuns,
      unbilledPlatformRuns,
      unbilledCogsUsd: Number(unbilledCogsUsd.toFixed(4)),
      totalPlatformCogsUsd: Number(totalPlatformCogsUsd.toFixed(4)),
      totalChargedCredits,
      estimatedRevenueUsd: Number(estimatedRevenueUsd.toFixed(4)),
      effectiveMarginPercent: Number(effectiveMarginPercent.toFixed(2)),
    },
    unbilledSamples,
  }
}

export function evaluateAuditAlerts(args: {
  hourly: WindowEconomics
  daily: WindowEconomics
  balanceDriftCount: number
  staleHoldsExpired: number
  thresholds?: AuditThresholds
}): AuditAlert[] {
  const t = args.thresholds ?? DEFAULT_AUDIT_THRESHOLDS
  const alerts: AuditAlert[] = []

  if (args.hourly.unbilledPlatformRuns > t.maxUnbilledRunsHourly) {
    alerts.push({
      severity:
        args.hourly.unbilledCogsUsd >= t.maxUnbilledCogsHourlyUsd ? 'critical' : 'warning',
      code: 'UNBILLED_PLATFORM_RUNS',
      message: `${args.hourly.unbilledPlatformRuns} platform API run(s) succeeded/timed-out in the last hour without a credit ledger charge (~$${args.hourly.unbilledCogsUsd.toFixed(2)} COGS).`,
      details: {
        unbilledPlatformRuns: args.hourly.unbilledPlatformRuns,
        unbilledCogsUsd: args.hourly.unbilledCogsUsd,
      },
    })
  }

  if (args.hourly.unbilledCogsUsd >= t.maxUnbilledCogsHourlyUsd) {
    alerts.push({
      severity: 'critical',
      code: 'UNBILLED_COGS_SPIKE',
      message: `Unbilled platform COGS ($${args.hourly.unbilledCogsUsd.toFixed(2)}/hr) exceeded threshold ($${t.maxUnbilledCogsHourlyUsd.toFixed(2)}/hr).`,
      details: { unbilledCogsUsd: args.hourly.unbilledCogsUsd },
    })
  }

  if (
    args.daily.totalPlatformCogsUsd >= 1 &&
    args.daily.effectiveMarginPercent < t.minMarginPercent
  ) {
    alerts.push({
      severity: args.daily.effectiveMarginPercent < 15 ? 'critical' : 'warning',
      code: 'LOW_ROLLING_MARGIN',
      message: `24h gross margin (${args.daily.effectiveMarginPercent.toFixed(1)}%) dropped below target (${t.minMarginPercent}%). COGS=$${args.daily.totalPlatformCogsUsd.toFixed(2)} vs Revenue=$${args.daily.estimatedRevenueUsd.toFixed(2)}.`,
      details: {
        marginPercent: args.daily.effectiveMarginPercent,
        totalPlatformCogsUsd: args.daily.totalPlatformCogsUsd,
        estimatedRevenueUsd: args.daily.estimatedRevenueUsd,
      },
    })
  }

  if (args.balanceDriftCount > 0) {
    alerts.push({
      severity: 'warning',
      code: 'BALANCE_LOT_DRIFT',
      message: `${args.balanceDriftCount} user account(s) have drift between users.credits and active credit_lots sum.`,
      details: { balanceDriftCount: args.balanceDriftCount },
    })
  }

  if (args.staleHoldsExpired > 0) {
    alerts.push({
      severity: 'warning',
      code: 'STALE_HOLDS_EXPIRED',
      message: `Expired ${args.staleHoldsExpired} stale pending credit hold(s) past TTL (possible function timeout or orphaned async job).`,
      details: { staleHoldsExpired: args.staleHoldsExpired },
    })
  }

  return alerts
}

/**
 * Dispatch alert payload to optional webhook (Slack / Discord / PagerDuty / Ops webhook)
 * AND/OR admin alert email via Resend (`RESEND_API_KEY` + `CREDIT_AUDIT_ALERT_EMAIL`).
 */
async function dispatchAuditAlerts(report: CreditAuditReport): Promise<void> {
  if (report.alerts.length === 0) return

  const isCritical = report.alerts.some((a) => a.severity === 'critical')
  const headline = isCritical
    ? '🚨 SceneFlow Credit Audit CRITICAL Alert'
    : '⚠️ SceneFlow Credit Audit Warning'

  const lines = report.alerts.map((a) => `• [${a.severity.toUpperCase()}] ${a.code}: ${a.message}`)
  const summaryLine = `24h COGS: $${report.daily.totalPlatformCogsUsd.toFixed(2)} | 24h Rev: $${report.daily.estimatedRevenueUsd.toFixed(2)} | Margin: ${report.daily.effectiveMarginPercent.toFixed(1)}%`
  const text = [headline, ...lines, summaryLine].join('\n')

  const webhookUrl = process.env.CREDIT_AUDIT_ALERT_WEBHOOK_URL?.trim()
  if (webhookUrl) {
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, report }),
        signal: AbortSignal.timeout(8_000),
      })
    } catch (err) {
      console.error('[CreditAudit] Failed to post alert webhook:', err)
    }
  }

  const resendKey = process.env.RESEND_API_KEY?.trim()
  const alertEmail =
    process.env.CREDIT_AUDIT_ALERT_EMAIL?.trim() ||
    process.env.ADMIN_ALERT_EMAIL?.trim() ||
    ''
  if (resendKey && alertEmail) {
    const fromEmail =
      process.env.RESEND_FROM_EMAIL?.trim() || 'SceneFlow AI Studio <noreply@sfai.studio>'
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: alertEmail.split(',').map((e) => e.trim()).filter(Boolean),
          subject: headline,
          text: `${text}\n\nGenerated: ${report.generatedAt}`,
        }),
        signal: AbortSignal.timeout(8_000),
      })
    } catch (err) {
      console.error('[CreditAudit] Failed to send Resend alert email:', err)
    }
  }
}

/**
 * Execute full automated credit audit + stale hold sweep against Postgres.
 */
export async function runCreditAudit(options?: {
  now?: Date
  sweepStaleHolds?: boolean
  sendAlerts?: boolean
  thresholds?: AuditThresholds
}): Promise<CreditAuditReport> {
  const now = options?.now ?? new Date()
  const thresholds = options?.thresholds ?? DEFAULT_AUDIT_THRESHOLDS

  await ensureProviderApiRunsTable()
  await ensureCreditHoldsTable()
  await ensureCreditLotsTable()

  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  // 1. Load 24h provider_api_runs
  const dailyRuns = (await ProviderApiRun.findAll({
    where: { created_at: { [Op.gte]: oneDayAgo } },
    order: [['created_at', 'DESC']],
    limit: 20_000,
    raw: true,
  })) as unknown as RunLikeRow[]

  const hourlyRuns = dailyRuns.filter(
    (r) => new Date(r.created_at).getTime() >= oneHourAgo.getTime()
  )

  const hourlyEval = evaluateWindowEconomics(hourlyRuns, 1, thresholds)
  const dailyEval = evaluateWindowEconomics(dailyRuns, 24, thresholds)

  // 2. Balance Integrity Check (sample active users who had lots updated or positive balances)
  const activeLots = (await CreditLotRow.findAll({
    where: {
      remaining: { [Op.gt]: 0 },
      expires_at: { [Op.gt]: now },
    },
    attributes: ['user_id', 'remaining'],
    raw: true,
  })) as unknown as Array<{ user_id: string; remaining: number | string }>

  const lotSumByUser = new Map<string, number>()
  for (const lot of activeLots) {
    lotSumByUser.set(
      lot.user_id,
      (lotSumByUser.get(lot.user_id) || 0) + Number(lot.remaining || 0)
    )
  }

  const userIdsWithLots = Array.from(lotSumByUser.keys()).slice(0, 1000)
  const balanceDriftSamples: BalanceDriftSample[] = []
  let balanceDriftCount = 0

  if (userIdsWithLots.length > 0) {
    const users = (await User.findAll({
      where: { id: { [Op.in]: userIdsWithLots } },
      attributes: ['id', 'credits'],
      raw: true,
    })) as unknown as Array<{ id: string; credits: number | string }>

    for (const u of users) {
      const col = Number(u.credits || 0)
      const lotSum = lotSumByUser.get(u.id) || 0
      const drift = col - lotSum
      if (drift !== 0) {
        balanceDriftCount += 1
        if (balanceDriftSamples.length < 25) {
          balanceDriftSamples.push({
            userId: u.id,
            userCreditsColumn: col,
            activeLotsSum: lotSum,
            drift,
          })
        }
      }
    }
  }

  // 3. Stale Hold Sweeper
  let staleHoldsExpired = 0
  let staleHoldsTotalCredits = 0

  if (options?.sweepStaleHolds !== false) {
    const staleHolds = await CreditHold.findAll({
      where: {
        status: 'pending',
        expires_at: { [Op.lte]: now },
      },
      limit: 500,
    })

    for (const hold of staleHolds) {
      hold.status = 'expired'
      hold.settled_at = now
      hold.meta = {
        ...(hold.meta || {}),
        expiredByAuditAt: now.toISOString(),
      }
      await hold.save()
      staleHoldsExpired += 1
      staleHoldsTotalCredits += Number(hold.amount || 0)
    }
  }

  const alerts = evaluateAuditAlerts({
    hourly: hourlyEval.economics,
    daily: dailyEval.economics,
    balanceDriftCount,
    staleHoldsExpired,
    thresholds,
  })

  const report: CreditAuditReport = {
    generatedAt: now.toISOString(),
    ok: alerts.filter((a) => a.severity === 'critical').length === 0,
    alerts,
    hourly: hourlyEval.economics,
    daily: dailyEval.economics,
    unbilledSamples: hourlyEval.unbilledSamples,
    balanceDriftCount,
    balanceDriftSamples,
    staleHoldsExpired,
    staleHoldsTotalCredits,
  }

  if (options?.sendAlerts !== false && alerts.length > 0) {
    await dispatchAuditAlerts(report)
  }

  return report
}
