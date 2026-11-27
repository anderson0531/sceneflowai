import { NextRequest, NextResponse } from 'next/server'
import { ensureWhopRuntimeConfig, getWhopClient } from '@/lib/billing/whopClient'
import {
  ADDON_PACK_CATALOG,
  CHARTER_OFFER_CATALOG,
  getAddonPackFromWhopPlanId,
  getCharterOfferFromWhopPlanId,
  getTierNameFromWhopPlanId,
  isOneTimeTier,
  normalizeAddonPackId,
  normalizeCharterOfferId,
  normalizeTierName,
} from '@/lib/billing/tierCatalog'
import { isWebhookEventProcessed } from '@/lib/billing/webhookIdempotency'
import {
  canonicalWhopPaymentKey,
  claimWebhookEvent,
  extractBillingPeriodEndFromPayload,
  legacyWhopPaymentKey,
  releaseWebhookEventClaim,
  verifyWebhookEventViaWhopApi,
} from '@/lib/billing/whopReconcile'
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
  addonPack?: string
  charterOffer?: string
  applicationId?: string
  orderKind?: string
  showcaseOrderId?: string
} {
  const data = event.data || {}
  const paymentObj = data.payment as Record<string, unknown> | undefined
  const membershipObj = data.membership as Record<string, unknown> | undefined
  const metadata: Record<string, unknown> =
    (data.metadata as Record<string, unknown> | undefined) ||
    (paymentObj?.metadata as Record<string, unknown> | undefined) ||
    (membershipObj?.metadata as Record<string, unknown> | undefined) ||
    ((data.checkout_configuration as Record<string, unknown> | undefined)?.metadata as
      | Record<string, unknown>
      | undefined) ||
    {}

  const userId =
    (metadata.user_id as string | undefined) ||
    (metadata.userId as string | undefined) ||
    (metadata.sceneflow_user_id as string | undefined)

  const tierName =
    (metadata.tier_name as string | undefined) ||
    (metadata.tierName as string | undefined) ||
    (metadata.sceneflow_tier as string | undefined)

  const addonPack =
    (metadata.addon_pack as string | undefined) ||
    (metadata.addonPack as string | undefined) ||
    (metadata.sceneflow_addon_pack as string | undefined)

  const charterOffer =
    (metadata.charter_offer as string | undefined) ||
    (metadata.charterOffer as string | undefined) ||
    (metadata.sceneflow_charter_offer as string | undefined)

  const applicationId =
    (metadata.application_id as string | undefined) ||
    (metadata.applicationId as string | undefined)

  const orderKind =
    (metadata.order_kind as string | undefined) ||
    (metadata.orderKind as string | undefined)

  const showcaseOrderId =
    (metadata.showcase_order_id as string | undefined) ||
    (metadata.showcaseOrderId as string | undefined)

  return {
    userId,
    tierName,
    addonPack,
    charterOffer,
    applicationId,
    orderKind,
    showcaseOrderId,
  }
}

function extractPlanId(event: WhopWebhookEvent): string | undefined {
  const data = event.data || {}
  const paymentObj = data.payment as Record<string, unknown> | undefined
  const membershipObj = data.membership as Record<string, unknown> | undefined
  const plan =
    (data.plan as Record<string, unknown> | undefined) ||
    membershipObj?.plan ||
    paymentObj?.plan

  if (typeof plan === 'string') return plan
  if (plan && typeof plan === 'object' && typeof (plan as Record<string, unknown>).id === 'string') {
    return (plan as Record<string, unknown>).id as string
  }

  if (typeof data.plan_id === 'string') return data.plan_id
  if (typeof paymentObj?.plan_id === 'string') return paymentObj.plan_id
  if (typeof membershipObj?.plan_id === 'string') return membershipObj.plan_id
  return undefined
}

function extractPaymentId(event: WhopWebhookEvent): string | undefined {
  const data = event.data || {}
  const paymentObj = data.payment as Record<string, unknown> | undefined
  if (typeof data.payment_id === 'string' && data.payment_id.trim()) {
    return data.payment_id.trim()
  }
  if (typeof paymentObj?.id === 'string' && paymentObj.id.trim()) {
    return paymentObj.id.trim()
  }
  if (
    typeof data.id === 'string' &&
    data.id.trim() &&
    (event.type === 'payment.succeeded' ||
      event.type === 'payment_succeeded' ||
      event.type === 'payment.failed' ||
      event.type === 'payment_failed' ||
      data.id.startsWith('pay_'))
  ) {
    return data.id.trim()
  }
  return undefined
}

function extractMembershipId(event: WhopWebhookEvent): string | undefined {
  const data = event.data || {}
  const membershipObj = data.membership as Record<string, unknown> | undefined
  const paymentObj = data.payment as Record<string, unknown> | undefined
  if (typeof data.membership_id === 'string' && data.membership_id.trim()) {
    return data.membership_id.trim()
  }
  if (typeof membershipObj?.id === 'string' && membershipObj.id.trim()) {
    return membershipObj.id.trim()
  }
  if (typeof paymentObj?.membership_id === 'string' && paymentObj.membership_id.trim()) {
    return paymentObj.membership_id.trim()
  }
  if (
    typeof data.id === 'string' &&
    data.id.trim() &&
    (data.id.startsWith('mem_') || event.type.startsWith('membership'))
  ) {
    return data.id.trim()
  }
  return undefined
}

async function fulfillExplorerPurchase(userId: string, paymentId?: string): Promise<void> {
  try {
    await SubscriptionService.grantExplorerPurchase(
      userId,
      paymentId ? { paymentId } : undefined
    )
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
  const {
    userId: metadataUserId,
    tierName: metadataTierName,
    addonPack: metadataAddonPack,
    charterOffer: metadataCharterOffer,
    applicationId,
    orderKind,
    showcaseOrderId,
  } = extractMetadata(event)
  const planId = extractPlanId(event)
  const normalizedMetaCharter = metadataCharterOffer
    ? normalizeCharterOfferId(metadataCharterOffer)
    : null
  const resolvedCharterOffer =
    (normalizedMetaCharter ? CHARTER_OFFER_CATALOG[normalizedMetaCharter] : null) ||
    (planId ? getCharterOfferFromWhopPlanId(planId) : null)
  const resolvedTier =
    (metadataTierName ? normalizeTierName(metadataTierName) : null) ||
    (planId ? getTierNameFromWhopPlanId(planId) : null)
  const normalizedMetaAddon = metadataAddonPack ? normalizeAddonPackId(metadataAddonPack) : null
  const resolvedAddonPack =
    (normalizedMetaAddon ? ADDON_PACK_CATALOG[normalizedMetaAddon] : null) ||
    (planId ? getAddonPackFromWhopPlanId(planId) : null)

  const paymentId = extractPaymentId(event)
  const membershipId = extractMembershipId(event)
  const whopUserId =
    typeof event.data?.user_id === 'string' ? event.data.user_id : undefined
  const billingPeriodEnd = extractBillingPeriodEndFromPayload(event.data)

  console.log(`[Whop Webhook] Processing ${eventType}`, {
    eventId: event.id,
    paymentId: paymentId || null,
    membershipId: membershipId || null,
    userId: metadataUserId,
    tier: resolvedTier,
    charterOffer: resolvedCharterOffer?.id || null,
    addonPack: resolvedAddonPack?.id || null,
    planId,
    applicationId,
  })

  switch (eventType) {
    case 'payment.succeeded':
    case 'payment_succeeded': {
      // Express 4K Cinema Showcase consumer orders (zero-login buyers fulfilled via showcaseOrderId)
      if (
        showcaseOrderId &&
        (orderKind === 'express_blueprint_pass' || orderKind === 'express_film_balance')
      ) {
        const showcasePaymentId = paymentId || event.id
        const {
          fulfillExpressBlueprintPassOrder,
          fulfillExpressFilmBalanceOrder,
        } = await import('@/lib/showcase/expressShowcaseService')
        if (orderKind === 'express_blueprint_pass') {
          await fulfillExpressBlueprintPassOrder({
            orderId: showcaseOrderId,
            whopPaymentId: showcasePaymentId,
          })
        } else {
          await fulfillExpressFilmBalanceOrder({
            orderId: showcaseOrderId,
            whopPaymentId: showcasePaymentId,
          })
        }
        break
      }

      if (!metadataUserId) {
        console.error('[Whop Webhook] Missing user_id in payment.succeeded')
        return
      }
      if (resolvedCharterOffer) {
        await SubscriptionService.activateCharterOffer(
          metadataUserId,
          resolvedCharterOffer.id,
          {
            whopMembershipId: membershipId,
            whopUserId,
            source: eventType,
            paymentId,
          }
        )
      } else if (resolvedAddonPack) {
        await SubscriptionService.purchaseAddonCredits(
          metadataUserId,
          resolvedAddonPack.credits,
          resolvedAddonPack.priceUsd,
          {
            paymentId,
            source: eventType,
          }
        )
      } else if (resolvedTier && isOneTimeTier(resolvedTier)) {
        await fulfillExplorerPurchase(metadataUserId, paymentId)
      } else if (resolvedTier) {
        await SubscriptionService.activateSubscription(metadataUserId, resolvedTier, {
          whopMembershipId: membershipId,
          whopUserId,
          billingPeriodEnd,
          source: eventType,
          paymentId,
        })
      }
      break
    }

    case 'membership.went_valid':
    case 'membership.activated':
    case 'membership_activated': {
      if (!metadataUserId) {
        console.error('[Whop Webhook] Missing user_id in membership event')
        return
      }
      if (resolvedAddonPack) {
        // Ignore or fulfill if payment.succeeded wasn't used; payment.succeeded handles add-ons
        break
      }
      if (!resolvedTier) {
        console.error('[Whop Webhook] Missing tier in membership event')
        return
      }
      if (isOneTimeTier(resolvedTier)) {
        await fulfillExplorerPurchase(metadataUserId, paymentId)
      } else {
        await SubscriptionService.activateSubscription(metadataUserId, resolvedTier, {
          whopMembershipId: membershipId,
          whopUserId,
          billingPeriodEnd,
          source: eventType,
          paymentId,
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
        const refundPaymentId = paymentId || event.id
        const isSubscriptionRefund = Boolean(
          resolvedCharterOffer ||
            (resolvedTier && !isOneTimeTier(resolvedTier)) ||
            membershipId
        )
        const refundAmountCredits = resolvedCharterOffer
          ? resolvedCharterOffer.credits
          : resolvedAddonPack
            ? resolvedAddonPack.credits
            : undefined
        await SubscriptionService.recordRefund(metadataUserId, refundPaymentId, {
          membershipId,
          isSubscriptionRefund,
          refundAmountCredits,
          planId,
          tierName: resolvedTier,
          addonPackId: resolvedAddonPack?.id || null,
          charterOfferId: resolvedCharterOffer?.id || null,
          source: eventType,
        })
      }
      break
    }

    default:
      console.log(`[Whop Webhook] Unhandled event type: ${eventType}`)
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureWhopRuntimeConfig()
    const rawBody = await req.text()
    const headers = Object.fromEntries(req.headers.entries())

    let event: WhopWebhookEvent

    const webhookSecret = process.env.WHOP_WEBHOOK_SECRET
    if (webhookSecret) {
      const client = getWhopClient()
      event = client.webhooks.unwrap(rawBody, { headers }) as unknown as WhopWebhookEvent
    } else if (
      process.env.NODE_ENV === 'development' ||
      process.env.DEMO_MODE === 'true'
    ) {
      console.warn('[Whop Webhook] WHOP_WEBHOOK_SECRET not configured — skipping verification in dev/demo')
      event = JSON.parse(rawBody) as WhopWebhookEvent
    } else {
      const parsed = JSON.parse(rawBody) as WhopWebhookEvent
      const verification = await verifyWebhookEventViaWhopApi(parsed)
      if (!verification.verified) {
        return NextResponse.json(
          { error: 'Webhook verification failed against Whop API' },
          { status: 401 }
        )
      }
      event = {
        ...parsed,
        data: verification.enrichedData || parsed.data,
      }
    }

    if (!event?.id) {
      return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 })
    }

    // Atomically claim event.id BEFORE processing to eliminate TOCTOU race conditions.
    const eventClaim = await claimWebhookEvent('whop', event.id, event.type, rawBody)
    if (!eventClaim.claimed) {
      console.log(`[Whop Webhook] Duplicate event skipped: ${event.id}`)
      return NextResponse.json({ success: true, duplicate: true })
    }

    // For payment fulfillment events, also claim the canonical `whop_payment:<id>` key
    // shared with whopReconcile so webhook + reconcile can never double-grant.
    let claimedPaymentKey: string | null = null
    if (event.type === 'payment.succeeded' || event.type === 'payment_succeeded') {
      const paymentId = extractPaymentId(event)
      if (paymentId) {
        const legacyKey = legacyWhopPaymentKey(paymentId)
        if (await isWebhookEventProcessed(legacyKey)) {
          console.log(`[Whop Webhook] Payment already processed via legacy key: ${legacyKey}`)
          return NextResponse.json({ success: true, duplicate: true })
        }
        const paymentKey = canonicalWhopPaymentKey(paymentId)
        const paymentClaim = await claimWebhookEvent('whop', paymentKey, event.type, rawBody)
        if (!paymentClaim.claimed) {
          console.log(`[Whop Webhook] Duplicate payment skipped: ${paymentKey}`)
          return NextResponse.json({ success: true, duplicate: true })
        }
        claimedPaymentKey = paymentKey
      }
    }

    try {
      await processWhopEvent(event)
    } catch (processingError) {
      if (claimedPaymentKey) {
        await releaseWebhookEventClaim(claimedPaymentKey)
      }
      await releaseWebhookEventClaim(event.id)
      throw processingError
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[Whop Webhook] Error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed', message: error.message },
      { status: 500 }
    )
  }
}
