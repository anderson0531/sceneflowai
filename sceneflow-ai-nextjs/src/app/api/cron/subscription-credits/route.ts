/**
 * Subscription credit lifecycle cron
 *
 * Runs daily via Vercel Cron:
 * - Expires subscription credits past their expiry date
 * - Allocates monthly credits for active subscribers when due
 */

import { NextRequest, NextResponse } from 'next/server'
import { Op } from 'sequelize'
import { User } from '@/models/User'
import { SubscriptionService } from '@/services/SubscriptionService'

const CRON_SECRET = process.env.CRON_SECRET

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const stats = {
    expired: 0,
    allocated: 0,
    errors: [] as string[],
  }

  try {
    const now = new Date()

    const expiredUsers = await User.findAll({
      where: {
        subscription_status: 'active',
        subscription_credits_expires_at: {
          [Op.lt]: now,
        },
        subscription_credits_monthly: {
          [Op.gt]: 0,
        },
      },
      attributes: ['id'],
    })

    for (const user of expiredUsers) {
      try {
        await SubscriptionService.expireSubscriptionCredits(user.id)
        await SubscriptionService.allocateMonthlyCredits(user.id)
        stats.expired += 1
        stats.allocated += 1
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error)
        stats.errors.push(`expire+allocate ${user.id}: ${message}`)
      }
    }

    const needsAllocation = await User.findAll({
      where: {
        subscription_status: 'active',
        subscription_tier_id: {
          [Op.ne]: null,
        },
        [Op.or]: [
          { subscription_credits_expires_at: null },
          { subscription_credits_monthly: 0 },
        ],
      },
      attributes: ['id'],
      limit: 200,
    })

    for (const user of needsAllocation) {
      try {
        await SubscriptionService.allocateMonthlyCredits(user.id)
        stats.allocated += 1
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error)
        if (!message.includes('does not have an active subscription')) {
          stats.errors.push(`allocate ${user.id}: ${message}`)
        }
      }
    }

    return NextResponse.json({ success: true, stats })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[Cron subscription-credits] Error:', error)
    return NextResponse.json({ success: false, error: message, stats }, { status: 500 })
  }
}
