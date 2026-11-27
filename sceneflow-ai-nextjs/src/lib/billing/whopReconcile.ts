import crypto from 'crypto'
import { PaymentWebhookEvent } from '@/models'
import { ensureWhopRuntimeConfig, getWhopClient, getWhopCompanyId } from './whopClient'
import {
  ADDON_PACK_CATALOG,
  CHARTER_OFFER_CATALOG,
  getAddonPackFromWhopPlanId,
  getCharterOfferFromWhopPlanId,
  getTierNameFromWhopPlanId,
  isOneTimeTier,
  isWhopPaymentEnabled,
  normalizeAddonPackId,
  normalizeCharterOfferId,
  normalizeTierName,
} from './tierCatalog'
import { isCheckoutConfigured } from './checkoutHelper'
import { isWebhookEventProcessed } from './webhookIdempotency'
import { SubscriptionService } from '@/services/SubscriptionService'

export interface ReconcileUserTarget {
  id: string
  email?: string | null
  whop_user_id?: string | null
}

/**
 * Canonical payment idempotency key shared across Whop webhooks, reconciliation,
 * credit lots, and CreditLedger so a payment can never be double-granted.
 */
export function canonicalWhopPaymentKey(paymentId: string): string {
  const trimmed = paymentId.trim()
  if (trimmed.startsWith('whop_payment:')) return trimmed
  if (trimmed.startsWith('whop_pay_')) return `whop_payment:${trimmed.slice('whop_pay_'.length)}`
  return `whop_payment:${trimmed}`
}

export function legacyWhopPaymentKey(paymentId: string): string {
  const trimmed = paymentId.trim()
  const raw = trimmed.startsWith('whop_payment:')
    ? trimmed.slice('whop_payment:'.length)
    : trimmed.startsWith('whop_pay_')
      ? trimmed.slice('whop_pay_'.length)
      : trimmed
  return `whop_pay_${raw}`
}

function parseFutureTimestamp(value: unknown): Date | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    // Handle Unix timestamps in either seconds or milliseconds.
    const ms = value > 0 && value < 1e12 ? value * 1000 : value
    const date = new Date(ms)
    if (!Number.isNaN(date.getTime()) && date.getTime() > Date.now()) return date
    return undefined
  }
  if (typeof value === 'string' && value.trim()) {
    const asNumber = Number(value)
    if (!Number.isNaN(asNumber) && Number.isFinite(asNumber) && /^\d+(\.\d+)?$/.test(value.trim())) {
      const ms = asNumber > 0 && asNumber < 1e12 ? asNumber * 1000 : asNumber
      const date = new Date(ms)
      if (!Number.isNaN(date.getTime()) && date.getTime() > Date.now()) return date
      return undefined
    }
    const date = new Date(value)
    if (!Number.isNaN(date.getTime()) && date.getTime() > Date.now()) return date
  }
  return undefined
}

export function extractBillingPeriodEndFromPayload(
  data: Record<string, unknown> | null | undefined
): Date | undefined {
  if (!data) return undefined
  const membership = data.membership as Record<string, unknown> | undefined
  const candidates = [
    data.renewal_period_end,
    data.renewal_period_end_at,
    data.current_period_end,
    data.current_period_end_at,
    data.expires_at,
    membership?.renewal_period_end,
    membership?.renewal_period_end_at,
    membership?.current_period_end,
    membership?.current_period_end_at,
    membership?.expires_at,
  ]
  for (const value of candidates) {
    const parsed = parseFutureTimestamp(value)
    if (parsed) return parsed
  }
  return undefined
}

/**
 * Atomically claim an idempotency key in `payment_webhook_events` BEFORE processing
 * to eliminate TOCTOU race conditions between concurrent webhooks and reconciliation.
 */
export async function claimWebhookEvent(
  provider: string,
  eventId: string,
  eventType: string,
  rawBody: string
): Promise<{ claimed: boolean }> {
  const payloadHash = crypto.createHash('sha256').update(rawBody).digest('hex')
  try {
    await PaymentWebhookEvent.create({
      provider,
      event_id: eventId,
      event_type: eventType,
      payload_hash: payloadHash,
      processed_at: new Date(),
    })
    return { claimed: true }
  } catch (error: any) {
    if (
      error?.name === 'SequelizeUniqueConstraintError' ||
      error?.parent?.code === '23505' ||
      error?.original?.code === '23505'
    ) {
      return { claimed: false }
    }
    throw error
  }
}

/**
 * Release an idempotency claim when downstream processing throws so retries can re-run.
 */
export async function releaseWebhookEventClaim(eventId: string): Promise<void> {
  try {
    await PaymentWebhookEvent.destroy({ where: { event_id: eventId } })
  } catch (err) {
    console.warn(`[Whop Idempotency] Failed to release claim for ${eventId}:`, err)
  }
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
 * Uses canonical idempotency keys (`whop_payment:<id>`) in PaymentWebhookEvent so payments
 * are never double-applied between webhooks and reconciliation.
 */
export async function reconcileWhopUserPayments(
  target: ReconcileUserTarget
): Promise<{ fulfilledPayments: string[]; syncedMemberships: string[] }> {
  const fulfilledPayments: string[] = []
  const syncedMemberships: string[] = []

  await ensureWhopRuntimeConfig()

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

      const idempotencyKey = canonicalWhopPaymentKey(payment.id)
      const legacyKey = legacyWhopPaymentKey(payment.id)
      if (
        (await isWebhookEventProcessed(idempotencyKey)) ||
        (await isWebhookEventProcessed(legacyKey))
      ) {
        continue
      }

      const planId = payment.plan?.id
      const metaCharter =
        (metadata.charter_offer as string | undefined) ||
        (metadata.sceneflow_charter_offer as string | undefined)
      const normalizedCharter = metaCharter ? normalizeCharterOfferId(metaCharter) : null
      const resolvedCharterOffer =
        (normalizedCharter ? CHARTER_OFFER_CATALOG[normalizedCharter] : null) ||
        (planId ? getCharterOfferFromWhopPlanId(planId) : null)

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

      if (!resolvedCharterOffer && !resolvedAddonPack && !resolvedTier) {
        continue
      }

      // Claim canonical payment key BEFORE applying credits to prevent TOCTOU double-grants.
      const claimPayload = JSON.stringify({
        paymentId: payment.id,
        charterOffer: resolvedCharterOffer?.id || null,
        addonPack: resolvedAddonPack?.id || null,
        tier: resolvedTier || null,
      })
      const claim = await claimWebhookEvent(
        'whop',
        idempotencyKey,
        'payment.succeeded.reconciled',
        claimPayload
      )
      if (!claim.claimed) continue

      try {
        if (resolvedCharterOffer) {
          await SubscriptionService.activateCharterOffer(target.id, resolvedCharterOffer.id, {
            whopMembershipId: payment.membership?.id || undefined,
            whopUserId: payment.user?.id || target.whop_user_id || undefined,
            source: 'whop_reconcile_charter',
            paymentId: payment.id,
          })
          fulfilledPayments.push(payment.id)
        } else if (resolvedAddonPack) {
          await SubscriptionService.purchaseAddonCredits(
            target.id,
            resolvedAddonPack.credits,
            resolvedAddonPack.priceUsd,
            {
              paymentId: payment.id,
              source: 'whop_api_reconcile',
            }
          )
          fulfilledPayments.push(payment.id)
        } else if (resolvedTier && isOneTimeTier(resolvedTier)) {
          try {
            await SubscriptionService.grantExplorerPurchase(target.id, {
              paymentId: payment.id,
            })
          } catch (err: any) {
            if (!String(err?.message || '').includes('already purchased')) {
              throw err
            }
          }
          fulfilledPayments.push(payment.id)
        } else if (resolvedTier) {
          let billingPeriodEnd = extractBillingPeriodEndFromPayload(
            payment as unknown as Record<string, unknown>
          )
          if (!billingPeriodEnd && payment.membership?.id) {
            try {
              const membership = await client.memberships.retrieve(payment.membership.id)
              billingPeriodEnd = extractBillingPeriodEndFromPayload(
                membership as unknown as Record<string, unknown>
              )
            } catch (memErr) {
              console.warn(
                `[Whop Reconcile] Unable to fetch membership ${payment.membership.id} for billing period end:`,
                memErr
              )
            }
          }
          await SubscriptionService.activateSubscription(target.id, resolvedTier, {
            whopMembershipId: payment.membership?.id || undefined,
            whopUserId: payment.user?.id || undefined,
            billingPeriodEnd,
            source: 'whop_api_reconcile',
            paymentId: payment.id,
          })
          fulfilledPayments.push(payment.id)
        }
      } catch (err) {
        await releaseWebhookEventClaim(idempotencyKey)
        throw err
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
  await ensureWhopRuntimeConfig()
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
      const paymentRecord = payment as unknown as Record<string, unknown>
      return {
        verified: true,
        enrichedData: {
          ...event.data,
          id: payment.id,
          plan: payment.plan,
          membership: payment.membership || event.data.membership,
          membership_id: payment.membership?.id || event.data.membership_id,
          renewal_period_end:
            paymentRecord.renewal_period_end ||
            (payment.membership as unknown as Record<string, unknown> | undefined)
              ?.renewal_period_end ||
            event.data.renewal_period_end,
          current_period_end:
            paymentRecord.current_period_end ||
            (payment.membership as unknown as Record<string, unknown> | undefined)
              ?.current_period_end ||
            event.data.current_period_end,
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
      const membershipRecord = membership as unknown as Record<string, unknown>
      return {
        verified: true,
        enrichedData: {
          ...event.data,
          id: membership.id,
          plan: membership.plan,
          metadata: membership.metadata || event.data.metadata,
          user_id: membership.user?.id || event.data.user_id,
          renewal_period_end: membership.renewal_period_end,
          current_period_end:
            membershipRecord.current_period_end || event.data.current_period_end,
        },
      }
    }

    return { verified: false }
  } catch (error) {
    console.error('[Whop API Webhook Verification] Failed to verify resource:', error)
    return { verified: false }
  }
}
