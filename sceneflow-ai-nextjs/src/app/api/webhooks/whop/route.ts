import { NextRequest, NextResponse } from 'next/server'
import { getWhopClient } from '@/lib/billing/whopClient'
import {
  getTierNameFromWhopPlanId,
  isOneTimeTier,
  normalizeTierName,
} from '@/lib/billing/tierCatalog'
import {
  isWebhookEventProcessed,
  markWebhookEventProcessed,
} from '@/lib/billing/webhookIdempotency'
import { SubscriptionService } from '@/services/SubscriptionService'

export const runtime = 'nodejs'

interface WhopWebhookEvent {
  id: string
  type: string
  data: Record<string, unknown>
  timestamp?: string
}

function extractMetadata(event: WhopWebhookEvent): {
  userId?: string
  tierName?: string
} {
  const data = event.data || {}
  const metadata =
    (data.metadata as Record<string, unknown> | undefined) ||
    (data.checkout_configuration as Record<string, unknown> | undefined)?.metadata ||
    {}

  const userId =
    (metadata.user_id as string | undefined) ||
    (metadata.userId as string | undefined)

  const tierName =
    (metadata.tier_name as string | undefined) ||
    (metadata.tierName as string | undefined)

  return { userId, tierName }
}

function extractPlanId(event: WhopWebhookEvent): string | undefined {
  const data = event.data || {}
  const plan =
    (data.plan as Record<string, unknown> | undefined) ||
    (data.membership as Record<string, unknown> | undefined)?.plan

  if (typeof plan === 'string') return plan
  if (plan && typeof plan === 'object' && typeof plan.id === 'string') {
    return plan.id
  }

  if (typeof data.plan_id === 'string') return data.plan_id
  return undefined
}

async function fulfillExplorerPurchase(userId: string): Promise<void> {
  try {
    await SubscriptionService.grantExplorerPurchase(userId)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    if (message.includes('already purchased')) {
      console.log('[Whop Webhook] Explorer already purchased for user:', userId)
      return
    }
    throw error
  }
}

async function processWhopEvent(event: WhopWebhookEvent): Promise<void> {
  const eventType = event.type
  const { userId: metadataUserId, tierName: metadataTierName } = extractMetadata(event)
  const planId = extractPlanId(event)
  const resolvedTier =
    (metadataTierName ? normalizeTierName(metadataTierName) : null) ||
    (planId ? getTierNameFromWhopPlanId(planId) : null)

  const membershipId =
    typeof event.data?.id === 'string' ? event.data.id : undefined
  const whopUserId =
    typeof event.data?.user_id === 'string' ? event.data.user_id : undefined

  console.log(`[Whop Webhook] Processing ${eventType}`, {
    eventId: event.id,
    userId: metadataUserId,
    tier: resolvedTier,
    planId,
  })

  switch (eventType) {
    case 'payment.succeeded':
    case 'payment_succeeded': {
      if (!metadataUserId) {
        console.error('[Whop Webhook] Missing user_id in payment.succeeded')
        return
      }
      if (resolvedTier && isOneTimeTier(resolvedTier)) {
        await fulfillExplorerPurchase(metadataUserId)
      }
      break
    }

    case 'membership.went_valid':
    case 'membership.activated':
    case 'membership_activated': {
      if (!metadataUserId || !resolvedTier) {
        console.error('[Whop Webhook] Missing user_id or tier in membership event')
        return
      }
      if (isOneTimeTier(resolvedTier)) {
        await fulfillExplorerPurchase(metadataUserId)
      } else {
        await SubscriptionService.activateSubscription(metadataUserId, resolvedTier, {
          whopMembershipId: membershipId,
          whopUserId,
          source: eventType,
        })
      }
      break
    }

    case 'membership.went_invalid':
    case 'membership.deactivated':
    case 'membership_deactivated': {
      if (!metadataUserId) {
        console.error('[Whop Webhook] Missing user_id in membership invalid event')
        return
      }
      await SubscriptionService.deactivateSubscription(metadataUserId, eventType)
      break
    }

    case 'payment.failed':
    case 'payment_failed': {
      console.log('[Whop Webhook] Payment failed for user:', metadataUserId)
      break
    }

    case 'refund.created':
    case 'refund_created': {
      if (metadataUserId) {
        const paymentId =
          typeof event.data?.payment_id === 'string'
            ? event.data.payment_id
            : event.id
        await SubscriptionService.recordRefund(metadataUserId, paymentId)
      }
      break
    }

    default:
      console.log(`[Whop Webhook] Unhandled event type: ${eventType}`)
  }
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()
    const headers = Object.fromEntries(req.headers.entries())

    let event: WhopWebhookEvent

    const webhookSecret = process.env.WHOP_WEBHOOK_SECRET
    if (webhookSecret) {
      const client = getWhopClient()
      event = client.webhooks.unwrap(rawBody, { headers }) as WhopWebhookEvent
    } else if (
      process.env.NODE_ENV === 'development' ||
      process.env.DEMO_MODE === 'true'
    ) {
      console.warn('[Whop Webhook] WHOP_WEBHOOK_SECRET not configured — skipping verification')
      event = JSON.parse(rawBody) as WhopWebhookEvent
    } else {
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
    }

    if (!event?.id) {
      return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 })
    }

    if (await isWebhookEventProcessed(event.id)) {
      console.log(`[Whop Webhook] Duplicate event skipped: ${event.id}`)
      return NextResponse.json({ success: true, duplicate: true })
    }

    await processWhopEvent(event)
    await markWebhookEventProcessed('whop', event.id, event.type, rawBody)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[Whop Webhook] Error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed', message: error.message },
      { status: 500 }
    )
  }
}
