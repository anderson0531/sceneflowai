import { getWhopClient, getWhopCompanyId } from './whopClient'
import {
  ADDON_PACK_CATALOG,
  getAddonPackFromWhopPlanId,
  getTierNameFromWhopPlanId,
  isOneTimeTier,
  isWhopPaymentEnabled,
  normalizeAddonPackId,
  normalizeTierName,
} from './tierCatalog'
import { isCheckoutConfigured } from './checkoutHelper'
import {
  isWebhookEventProcessed,
  markWebhookEventProcessed,
} from './webhookIdempotency'
import { SubscriptionService } from '@/services/SubscriptionService'

export interface ReconcileUserTarget {
  id: string
  email?: string | null
  whop_user_id?: string | null
}

function matchesUser(
  metadata: Record<string, unknown> | null | undefined,
  whopUser: { id?: string | null; email?: string | null } | null | undefined,
  target: ReconcileUserTarget
): boolean {
  const metaUserId =
    (metadata?.user_id as string | undefined) ||
    (metadata?.userId as string | undefined) ||
    (metadata?.sceneflow_user_id as string | undefined)
  if (metaUserId && metaUserId === target.id) return true

  const targetEmail = target.email?.trim().toLowerCase()
  if (targetEmail) {
    const metaEmail = (
      (metadata?.user_email as string | undefined) ||
      (metadata?.sceneflow_user_email as string | undefined) ||
      ''
    )
      .trim()
      .toLowerCase()
    if (metaEmail && metaEmail === targetEmail) return true

    const whopEmail = (whopUser?.email || '').trim().toLowerCase()
    if (whopEmail && whopEmail === targetEmail) return true
  }

  if (target.whop_user_id && whopUser?.id && target.whop_user_id === whopUser.id) {
    return true
  }

  return false
}

/**
 * Reconciles a user's recent Whop payments & memberships directly via the Whop API.
 * Uses idempotency keys (`whop_pay_<id>`) in WebhookEvent so payments are never double-applied,
 * allowing instant checkout fulfillment and renewal sync without requiring manual webhook setup.
 */
export async function reconcileWhopUserPayments(
  target: ReconcileUserTarget
): Promise<{ fulfilledPayments: string[]; syncedMemberships: string[] }> {
  const fulfilledPayments: string[] = []
  const syncedMemberships: string[] = []

  if (!isWhopPaymentEnabled() || !isCheckoutConfigured()) {
    return { fulfilledPayments, syncedMemberships }
  }

  try {
    const client = getWhopClient()
    const companyId = getWhopCompanyId()

    const paymentsPage = await client.payments.list({
      company_id: companyId,
      first: 25,
    })

    for (const payment of paymentsPage.data || []) {
      const isPaid =
        payment.status === 'paid' || payment.substatus === 'succeeded'
      if (!isPaid || payment.auto_refunded || payment.refunded_at) continue

      const metadata = (payment.metadata || {}) as Record<string, unknown>
      if (!matchesUser(metadata, payment.user, target)) continue

      const idempotencyKey = `whop_pay_${payment.id}`
      if (await isWebhookEventProcessed(idempotencyKey)) continue

      const planId = payment.plan?.id
      const metaAddon =
        (metadata.addon_pack as string | undefined) ||
        (metadata.sceneflow_addon_pack as string | undefined)
      const normalizedAddon = metaAddon ? normalizeAddonPackId(metaAddon) : null
      const resolvedAddonPack =
        (normalizedAddon ? ADDON_PACK_CATALOG[normalizedAddon] : null) ||
        (planId ? getAddonPackFromWhopPlanId(planId) : null)

      const metaTier =
        (metadata.tier_name as string | undefined) ||
        (metadata.sceneflow_tier as string | undefined)
      const resolvedTier =
        (metaTier ? normalizeTierName(metaTier) : null) ||
        (planId ? getTierNameFromWhopPlanId(planId) : null)

      if (resolvedAddonPack) {
        await SubscriptionService.purchaseAddonCredits(
          target.id,
          resolvedAddonPack.credits,
          resolvedAddonPack.priceUsd
        )
        await markWebhookEventProcessed(
          'whop',
          idempotencyKey,
          'payment.succeeded.reconciled',
          JSON.stringify({ paymentId: payment.id, addonPack: resolvedAddonPack.id })
        )
        fulfilledPayments.push(payment.id)
      } else if (resolvedTier && isOneTimeTier(resolvedTier)) {
        try {
          await SubscriptionService.grantExplorerPurchase(target.id)
        } catch (err: any) {
          if (!String(err?.message || '').includes('already purchased')) {
            throw err
          }
        }
        await markWebhookEventProcessed(
          'whop',
          idempotencyKey,
          'payment.succeeded.reconciled',
          JSON.stringify({ paymentId: payment.id, tier: resolvedTier })
        )
        fulfilledPayments.push(payment.id)
      } else if (resolvedTier) {
        await SubscriptionService.activateSubscription(target.id, resolvedTier, {
          whopMembershipId: payment.membership?.id || undefined,
          whopUserId: payment.user?.id || undefined,
          source: 'whop_api_reconcile',
        })
        await markWebhookEventProcessed(
          'whop',
          idempotencyKey,
          'payment.succeeded.reconciled',
          JSON.stringify({ paymentId: payment.id, tier: resolvedTier })
        )
        fulfilledPayments.push(payment.id)
      }
    }
  } catch (error) {
    console.warn('[Whop Reconcile] Non-fatal reconciliation warning:', error)
  }

  return { fulfilledPayments, syncedMemberships }
}

/**
 * Verifies an incoming webhook event directly against the Whop API using WHOP_API_KEY
 * when WHOP_WEBHOOK_SECRET is not set.
 */
export async function verifyWebhookEventViaWhopApi(event: {
  id: string
  type: string
  data: Record<string, unknown>
}): Promise<{ verified: boolean; enrichedData?: Record<string, unknown> }> {
  if (!isCheckoutConfigured()) {
    return { verified: false }
  }

  try {
    const client = getWhopClient()
    const companyId = getWhopCompanyId()
    const resourceId = typeof event.data?.id === 'string' ? event.data.id : ''

    if (resourceId.startsWith('pay_')) {
      const payment = await client.payments.retrieve(resourceId)
      if (payment.company?.id !== companyId) {
        return { verified: false }
      }
      if (
        (event.type === 'payment.succeeded' || event.type === 'payment_succeeded') &&
        payment.status !== 'paid' &&
        payment.substatus !== 'succeeded'
      ) {
        return { verified: false }
      }
      return {
        verified: true,
        enrichedData: {
          ...event.data,
          id: payment.id,
          plan: payment.plan,
          metadata: payment.metadata || event.data.metadata,
          user_id: payment.user?.id || event.data.user_id,
        },
      }
    }

    if (resourceId.startsWith('mem_')) {
      const membership = await client.memberships.retrieve(resourceId)
      if (membership.company?.id !== companyId) {
        return { verified: false }
      }
      return {
        verified: true,
        enrichedData: {
          ...event.data,
          id: membership.id,
          plan: membership.plan,
          metadata: membership.metadata || event.data.metadata,
          user_id: membership.user?.id || event.data.user_id,
          renewal_period_end: membership.renewal_period_end,
        },
      }
    }

    return { verified: false }
  } catch (error) {
    console.error('[Whop API Webhook Verification] Failed to verify resource:', error)
    return { verified: false }
  }
}
