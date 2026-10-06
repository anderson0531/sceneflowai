/**
 * Credit shelf-life cron.
 *
 * Runs daily via Vercel Cron. Expires subscription allotments and purchased
 * packs whose own dates have passed, including cancelled accounts.
 * The next subscription allotment is granted only when a renewal payment
 * lands (Whop payment.succeeded / membership activation). This job does not
 * mint credits.
 */

import { NextRequest, NextResponse } from 'next/server'
import { Op, QueryTypes } from 'sequelize'
import { sequelize, User } from '@/models'
import { SubscriptionService } from '@/services/SubscriptionService'
import { ensureCreditLotsTable } from '@/lib/database/migrateCreditLots'

const CRON_SECRET = process.env.CRON_SECRET

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const stats = {
    users: 0,
    expiredSubscription: 0,
    expiredPack: 0,
    errors: [] as string[],
  }

  try {
    await ensureCreditLotsTable()
    const now = new Date()

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

    const packUsers = await sequelize.query<{ user_id: string }>(
      `SELECT DISTINCT user_id
         FROM credit_lots
        WHERE remaining > 0
          AND expires_at <= NOW()`,
      { type: QueryTypes.SELECT }
    )

    const unclockedPacks = await sequelize.query<{ id: string }>(
      `SELECT u.id
         FROM users u
        WHERE u.addon_credits > 0
          AND NOT EXISTS (
            SELECT 1 FROM credit_lots c WHERE c.user_id = u.id
          )
        LIMIT 200`,
      { type: QueryTypes.SELECT }
    )

    const ids = new Set<string>()
    for (const user of subscriptionUsers) ids.add(user.id)
    for (const row of packUsers) ids.add(row.user_id)
    for (const row of unclockedPacks) ids.add(row.id)

    for (const userId of ids) {
      try {
        const expired = await SubscriptionService.expireDueCredits(userId)
        stats.users += 1
        stats.expiredSubscription += expired.expiredSubscription
        stats.expiredPack += expired.expiredPack
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error)
        stats.errors.push(`expire ${userId}: ${message}`)
      }
    }

    return NextResponse.json({ success: true, stats })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[Cron subscription-credits] Error:', error)
    return NextResponse.json({ success: false, error: message, stats }, { status: 500 })
  }
}
