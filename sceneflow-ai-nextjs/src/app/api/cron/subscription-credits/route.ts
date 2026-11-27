/**
 * Credit shelf-life cron.
 *
 * Runs daily via Vercel Cron. Expires subscription allotments and purchased
 * packs whose own dates have passed, including cancelled accounts.
 * The next subscription allotment is granted only when a renewal payment
 * lands (Whop payment.succeeded / membership activation). This job does not
 * mint credits.
 */

import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { Op, QueryTypes } from 'sequelize'
import { sequelize, User } from '@/models'
import { SubscriptionService } from '@/services/SubscriptionService'
import { ensureCreditLotsTable } from '@/lib/database/migrateCreditLots'

const SUBSCRIPTION_EXPIRY_GRACE_MS = 48 * 60 * 60 * 1000
const BACKFILL_BATCH_SIZE = 200
const BACKFILL_MAX_USERS = 2000

function hasValidCronAuth(authHeader: string | null, cronSecret: string): boolean {
  if (!authHeader) return false
  const expected = `Bearer ${cronSecret}`
  const actualBuf = Buffer.from(authHeader, 'utf8')
  const expectedBuf = Buffer.from(expected, 'utf8')
  if (actualBuf.length !== expectedBuf.length) return false
  return crypto.timingSafeEqual(actualBuf, expectedBuf)
}

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET?.trim()
  if (!cronSecret) {
    console.error('[Cron subscription-credits] CRON_SECRET is not configured — refusing execution')
    return NextResponse.json(
      { error: 'Cron authentication is not configured' },
      { status: 500 }
    )
  }

  const authHeader = req.headers.get('authorization')
  if (!hasValidCronAuth(authHeader, cronSecret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const stats = {
    users: 0,
    expiredSubscription: 0,
    expiredPack: 0,
    expiredSubscriptionStatuses: 0,
    backfilledLegacyUsers: 0,
    errors: [] as string[],
  }

  try {
    await ensureCreditLotsTable()
    const now = new Date()
    const graceCutoff = new Date(now.getTime() - SUBSCRIPTION_EXPIRY_GRACE_MS)

    const subscriptionUsers = await User.findAll({
      where: {
        subscription_credits_monthly: { [Op.gt]: 0 },
        [Op.or]: [
          { subscription_credits_expires_at: { [Op.lt]: now } },
          { subscription_credits_expires_at: null },
        ],
      },
      attributes: ['id'],
    })

    const expiredStatusUsers = await User.findAll({
      where: {
        subscription_status: 'active',
        subscription_end_date: { [Op.lt]: graceCutoff },
      },
      attributes: ['id'],
    })

    const packUsers = await sequelize.query<{ user_id: string }>(
      `SELECT DISTINCT user_id
         FROM credit_lots
        WHERE remaining > 0
          AND expires_at <= NOW()`,
      { type: QueryTypes.SELECT }
    )

    const processedIds = new Set<string>()
    const initialIds = new Set<string>()
    for (const user of subscriptionUsers) initialIds.add(user.id)
    for (const user of expiredStatusUsers) initialIds.add(user.id)
    for (const row of packUsers) initialIds.add(row.user_id)

    for (const userId of initialIds) {
      processedIds.add(userId)
      try {
        const expired = await SubscriptionService.expireDueCredits(userId)
        stats.users += 1
        stats.expiredSubscription += expired.expiredSubscription
        stats.expiredPack += expired.expiredPack
        if (expired.subscriptionExpired) stats.expiredSubscriptionStatuses += 1
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error)
        stats.errors.push(`expire ${userId}: ${message}`)
      }
    }

    // Bounded pagination loop for legacy addon balance backfill (200 per batch, up to 2000 per run).
    let backfilledCount = 0
    const seenBackfill = new Set<string>()
    while (backfilledCount < BACKFILL_MAX_USERS) {
      const remaining = Math.min(BACKFILL_BATCH_SIZE, BACKFILL_MAX_USERS - backfilledCount)
      const batch = await sequelize.query<{ id: string }>(
        `SELECT u.id
           FROM users u
          WHERE u.addon_credits > 0
            AND NOT EXISTS (
              SELECT 1 FROM credit_lots c WHERE c.user_id = u.id
            )
          ORDER BY u.id ASC
          LIMIT :limit`,
        {
          replacements: { limit: remaining },
          type: QueryTypes.SELECT,
        }
      )

      const candidates = batch
        .map((row) => row.id)
        .filter((id) => !seenBackfill.has(id))
      if (candidates.length === 0) break

      for (const userId of candidates) {
        seenBackfill.add(userId)
        backfilledCount += 1
        if (processedIds.has(userId)) continue
        processedIds.add(userId)
        try {
          const expired = await SubscriptionService.expireDueCredits(userId)
          stats.users += 1
          stats.backfilledLegacyUsers += 1
          stats.expiredSubscription += expired.expiredSubscription
          stats.expiredPack += expired.expiredPack
          if (expired.subscriptionExpired) stats.expiredSubscriptionStatuses += 1
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error)
          stats.errors.push(`expire ${userId}: ${message}`)
        }
      }

      if (batch.length < remaining) break
    }

    return NextResponse.json({ success: true, stats })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[Cron subscription-credits] Error:', error)
    return NextResponse.json({ success: false, error: message, stats }, { status: 500 })
  }
}
