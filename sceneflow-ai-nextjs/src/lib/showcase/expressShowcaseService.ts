/**
 * Express 4K Cinema Showcase — Whop MoR Checkout & Automated Fulfillment Service
 *
 * Powers the live Keepsake Cinema reference storefront (`/showcase`) and self-serve
 * Blueprint -> Express 4K balance upgrades using Whop Merchant of Record (MoR):
 *
 * 1. `express_blueprint_pass` ($29):
 *    Creates Whop checkout -> on payment.succeeded (or return-URL Whop API reconciliation),
 *    automatically launches the guided AI Story Intake link and emails the customer.
 * 2. `express_film_balance` ($120 / $170 / $220 after $29 credit):
 *    Creates Whop checkout from the approved Blueprint Portal -> on payment.succeeded,
 *    automatically unlocks & emails the Continuity Photo + 10s Pronunciation Portal.
 */

import crypto from 'node:crypto'
import '@/models'
import Project from '@/models/Project'
import CollabSession from '@/models/CollabSession'
import User from '@/models/User'
import { sequelize } from '@/config/database'
import { ensureWhopRuntimeConfig, getWhopClient, getWhopCompanyId } from '@/lib/billing/whopClient'
import { buildWhopPurchaseUrl } from '@/lib/billing/checkoutHelper'
import {
  EXPRESS_BLUEPRINT_PASS_USD,
  SHOWCASE_BRAND_SNAPSHOT,
  getShowcaseOfferById,
  getShowcaseOfferByVertical,
  type ShowcaseOfferId,
} from '@/config/showcase/expressCinemaCatalog'
import {
  createClientIntakeLink,
} from '@/lib/intake/intakeService'
import {
  sendAutomatedClientPortalEmail,
} from '@/lib/intake/automatedClientBlueprint'
import {
  resolveClientPortalLocale,
  type ClientPortalLocale,
} from '@/lib/intake/clientPortalCopy'
import { resolveBlueprintShareByToken } from '@/lib/blueprint/shareSession'
import { sessionDbId } from '@/lib/blueprint/shareAuth'
import { createOrUpdateContinuityPortalLink } from '@/lib/continuity/continuityPortalService'
import { ensureProducerPlatformSchema } from '@/lib/database/migrateProducerPlatform'
import { notifyUser } from '@/lib/jobs/jobService'

export type ExpressShowcaseOrderKind = 'express_blueprint_pass' | 'express_film_balance'
export type ExpressShowcaseOrderStatus = 'pending_payment' | 'fulfilled' | 'failed'

export interface ExpressShowcaseOrderPayload {
  type: 'express_showcase_order'
  orderId: string
  orderKind: ExpressShowcaseOrderKind
  status: ExpressShowcaseOrderStatus
  offerId: ShowcaseOfferId
  vertical: string
  locale: ClientPortalLocale
  customerName: string
  customerEmail: string
  honoreeOrTitle?: string
  amountUsd: number
  totalPriceUsd: number
  balanceDueUsd: number
  projectId: string
  ownerUserId: string
  blueprintToken?: string
  whopCheckoutConfigId?: string
  whopPurchaseUrl?: string
  whopPaymentId?: string
  intakeToken?: string
  intakeUrl?: string
  continuityToken?: string
  continuityUrl?: string
  origin: string
  createdAt: string
  paidAt?: string
  fulfilledAt?: string
}

export function isExpressShowcaseOrderPayload(
  payload: Record<string, unknown> | null | undefined
): payload is Record<string, unknown> & ExpressShowcaseOrderPayload {
  return payload?.type === 'express_showcase_order'
}

export function resolveShowcaseWhopPlanEnvId(
  orderKind: ExpressShowcaseOrderKind,
  amountUsd: number
): string | null {
  const candidates: string[] = []
  if (orderKind === 'express_blueprint_pass') {
    candidates.push('WHOP_PLAN_EXPRESS_BLUEPRINT_29', 'WHOP_PLAN_BLUEPRINT_PASS_29')
  } else {
    candidates.push(`WHOP_PLAN_EXPRESS_BALANCE_${Math.round(amountUsd)}`)
    if (Math.round(amountUsd) === 120) {
      candidates.push('WHOP_PLAN_EXPRESS_FILM_120')
    }
  }
  for (const key of candidates) {
    const val = (process.env[key] || '').replace(/\\n/g, '').trim()
    if (val) return val
  }
  return null
}

function resolveWhopRedirectUrl(origin: string, orderId: string, locale?: string): string {
  const cleanOrigin = origin.startsWith('https://')
    ? origin.replace(/^https:\/\/sceneflowai\.studio\b/, 'https://www.sceneflowai.studio')
    : 'https://www.sceneflowai.studio'
  const langParam = locale ? `&lang=${encodeURIComponent(locale)}` : ''
  return `${cleanOrigin}/showcase/order/${encodeURIComponent(orderId)}?checkout=success${langParam}`
}

export async function resolveShowcaseOwnerUserId(): Promise<string> {
  const envOwner = (process.env.SHOWCASE_OWNER_USER_ID || '').trim()
  if (envOwner) return envOwner

  await sequelize.authenticate()
  const adminUser = await User.findOne({
    where: { is_active: true },
    order: [['created_at', 'ASC']],
  })
  if (!adminUser) {
    throw new Error('SHOWCASE_OWNER_NOT_CONFIGURED: No active studio owner account found.')
  }
  return adminUser.id
}

export async function createWhopExpressCheckoutSession(input: {
  orderId: string
  orderKind: ExpressShowcaseOrderKind
  amountUsd: number
  title: string
  description: string
  productExternalId: string
  customerEmail: string
  origin: string
  metadata: Record<string, string>
}): Promise<{ sessionId: string; purchaseUrl: string }> {
  await ensureWhopRuntimeConfig()
  const client = getWhopClient()
  const redirectUrl = resolveWhopRedirectUrl(input.origin, input.orderId, input.metadata.locale)
  const configuredPlanId = resolveShowcaseWhopPlanEnvId(input.orderKind, input.amountUsd)

  const checkoutConfig = configuredPlanId
    ? await client.checkoutConfigurations.create({
        plan_id: configuredPlanId,
        metadata: input.metadata,
        redirect_url: redirectUrl,
        source_url: redirectUrl,
      })
    : await client.checkoutConfigurations.create({
        mode: 'payment',
        currency: 'usd',
        plan: {
          company_id: getWhopCompanyId(),
          currency: 'usd',
          plan_type: 'one_time',
          initial_price: Number(input.amountUsd.toFixed(2)),
          title: input.title.slice(0, 120),
          description: input.description.slice(0, 400),
          product: {
            external_identifier: input.productExternalId,
            title: input.title.slice(0, 120),
            collect_shipping_address: false,
          },
        },
        metadata: input.metadata,
        redirect_url: redirectUrl,
        source_url: redirectUrl,
      })

  const purchaseUrl = buildWhopPurchaseUrl(
    checkoutConfig.purchase_url,
    checkoutConfig.id,
    input.customerEmail
  )

  return {
    sessionId: checkoutConfig.id,
    purchaseUrl,
  }
}

/**
 * Step 1: Starts a $29 Express Storyboard Blueprint Pass order via Whop MoR.
 */
export async function startExpressBlueprintPassOrder(input: {
  offerId: ShowcaseOfferId | string
  customerName: string
  customerEmail: string
  honoreeOrTitle?: string
  locale?: string
  origin: string
}): Promise<{
  orderId: string
  purchaseUrl: string
  sessionId: string
  amountUsd: number
}> {
  const offer = getShowcaseOfferById(input.offerId)
  const customerName = input.customerName.trim().slice(0, 120)
  const customerEmail = input.customerEmail.trim().toLowerCase().slice(0, 180)
  const honoreeOrTitle = (input.honoreeOrTitle || '').trim().slice(0, 140)
  const locale = resolveClientPortalLocale(input.locale)

  if (!customerName) throw new Error('Please enter your name.')
  if (!customerEmail || !customerEmail.includes('@')) {
    throw new Error('Please enter a valid email address so we can send your private studio links.')
  }

  await ensureProducerPlatformSchema()
  const ownerUserId = await resolveShowcaseOwnerUserId()
  const orderId = `exp_${crypto.randomBytes(12).toString('base64url')}`
  const projectTitle = honoreeOrTitle || `${offer.title} — ${customerName}`

  const draftProject = await Project.create({
    user_id: ownerUserId,
    title: projectTitle,
    description: `${offer.occasionPromptContext} (Keepsake Cinema Express 4K Order ${orderId})`,
    genre: offer.vertical === 'video_memoir' ? 'documentary' : 'commercial',
    duration: 360,
    status: 'draft',
    current_step: 'ideation',
    step_statuses: { ideation: 'in_progress' },
    metadata: {
      clientOrder: {
        isClientProject: true,
        source: 'express_showcase',
        showcaseOrderId: orderId,
        offerId: offer.id,
        occasionId: offer.id,
        vertical: offer.vertical,
        locale,
        deliveryTier: 'express_cinema_4k',
        expressReleaseMode: 'supervised_pm_release',
        blueprintDepositUsd: EXPRESS_BLUEPRINT_PASS_USD,
        expressTotalPriceUsd: offer.totalPriceUsd,
        expressBalanceUsd: offer.balanceDueUsd,
        clientPriceUsd: offer.totalPriceUsd,
        customerName,
        customerLabel: honoreeOrTitle || customerName,
        customerEmail,
        stage: 'pending_blueprint_payment',
        actionState: 'waiting_on_client',
        createdAt: new Date().toISOString(),
      },
    },
  } as any)

  const whop = await createWhopExpressCheckoutSession({
    orderId,
    orderKind: 'express_blueprint_pass',
    amountUsd: offer.blueprintPassUsd,
    title: `Keepsake Cinema — Storyboard Blueprint Pass (${offer.title})`,
    description: `$29 Storyboard Blueprint Pass (100% credited toward your $${offer.totalPriceUsd} Same-Day Express 4K Cinema Film). Includes guided story intake, illustrated storyboards, narration, family comment link & 4 AI revision rounds.`,
    productExternalId: `keepsake_blueprint_pass_${offer.id}`,
    customerEmail,
    origin: input.origin,
    metadata: {
      order_kind: 'express_blueprint_pass',
      showcase_order_id: orderId,
      project_id: draftProject.id,
      owner_user_id: ownerUserId,
      offer_id: offer.id,
      vertical: offer.vertical,
      locale,
      customer_name: customerName,
      customer_email: customerEmail,
      delivery_tier: 'express_cinema_4k',
    },
  })

  const orderPayload: ExpressShowcaseOrderPayload = {
    type: 'express_showcase_order',
    orderId,
    orderKind: 'express_blueprint_pass',
    status: 'pending_payment',
    offerId: offer.id,
    vertical: offer.vertical,
    locale,
    customerName,
    customerEmail,
    honoreeOrTitle: honoreeOrTitle || undefined,
    amountUsd: offer.blueprintPassUsd,
    totalPriceUsd: offer.totalPriceUsd,
    balanceDueUsd: offer.balanceDueUsd,
    projectId: draftProject.id,
    ownerUserId,
    whopCheckoutConfigId: whop.sessionId,
    whopPurchaseUrl: whop.purchaseUrl,
    origin: input.origin,
    createdAt: new Date().toISOString(),
  }

  await CollabSession.create({
    project_id: draftProject.id,
    owner_user_id: ownerUserId,
    token: orderId,
    status: 'active',
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    payload: orderPayload as unknown as Record<string, unknown>,
  })

  return {
    orderId,
    purchaseUrl: whop.purchaseUrl,
    sessionId: whop.sessionId,
    amountUsd: offer.blueprintPassUsd,
  }
}

/**
 * Step 2: Starts the Express 4K Film balance checkout ($120 / $170 / $220)
 * directly from an approved (or ready-to-approve) Blueprint Share Portal via Whop MoR.
 */
export async function startExpressFilmBalanceOrder(input: {
  blueprintToken: string
  customerName?: string
  customerEmail?: string
  origin: string
}): Promise<{
  orderId: string
  purchaseUrl: string
  sessionId: string
  amountUsd: number
}> {
  await sequelize.authenticate()
  const resolved = await resolveBlueprintShareByToken(input.blueprintToken)
  if (!resolved) {
    throw new Error('Blueprint share link not found or expired.')
  }
  if (resolved.accessRole === 'guest_reviewer') {
    throw new Error('Only the primary customer can unlock the Express 4K Cinema Film.')
  }

  const { session, payload } = resolved
  const projectId = String((session as { project_id?: string }).project_id || payload.projectId || '')
  const ownerUserId = String((session as { owner_user_id?: string }).owner_user_id || '')
  if (!projectId || !ownerUserId) {
    throw new Error('Project context is missing on this Blueprint link.')
  }

  const project = await Project.findByPk(projectId)
  const md = ((project?.metadata || {}) as Record<string, any>)
  const co = ((md.clientOrder || {}) as Record<string, any>)
  const settings = payload.shareSettings || {}

  const offer =
    settings.occasionId || co.offerId
      ? getShowcaseOfferById(String(settings.occasionId || co.offerId))
      : getShowcaseOfferByVertical(String(co.vertical || 'video_memoir'))

  const balanceUsd =
    typeof settings.expressBalanceUsd === 'number' && settings.expressBalanceUsd > 0
      ? settings.expressBalanceUsd
      : typeof co.expressBalanceUsd === 'number' && co.expressBalanceUsd > 0
        ? co.expressBalanceUsd
        : offer.balanceDueUsd

  const totalPriceUsd =
    typeof settings.expressTotalPriceUsd === 'number' && settings.expressTotalPriceUsd > 0
      ? settings.expressTotalPriceUsd
      : offer.totalPriceUsd

  const customerName =
    (input.customerName || settings.customerName || co.customerName || 'Client').trim().slice(0, 120)
  const customerEmail = (
    input.customerEmail ||
    settings.customerEmail ||
    co.customerEmail ||
    ''
  )
    .trim()
    .toLowerCase()
  const locale = resolveClientPortalLocale(String(co.locale || payload.sectionAudioLanguage || 'en'))
  const orderId = `expbal_${crypto.randomBytes(12).toString('base64url')}`

  const whop = await createWhopExpressCheckoutSession({
    orderId,
    orderKind: 'express_film_balance',
    amountUsd: balanceUsd,
    title: `Keepsake Cinema — Same-Day Express 4K Cinema Film Balance`,
    description: `$${balanceUsd} balance ($${totalPriceUsd} Express 4K Cinema Film minus your $29 Blueprint Pass credit). Unlocks Continuity Photo Library, 10-second Pronunciation Guide, Private Screening Room & Auto-Rendered 4K Master MP4.`,
    productExternalId: `keepsake_express_4k_balance_${offer.id}`,
    customerEmail: customerEmail || 'client@sceneflowai.studio',
    origin: input.origin,
    metadata: {
      order_kind: 'express_film_balance',
      showcase_order_id: orderId,
      blueprint_token: input.blueprintToken,
      project_id: projectId,
      owner_user_id: ownerUserId,
      offer_id: offer.id,
      locale,
      customer_name: customerName,
      customer_email: customerEmail,
      delivery_tier: 'express_cinema_4k',
    },
  })

  const orderPayload: ExpressShowcaseOrderPayload = {
    type: 'express_showcase_order',
    orderId,
    orderKind: 'express_film_balance',
    status: 'pending_payment',
    offerId: offer.id,
    vertical: offer.vertical,
    locale,
    customerName,
    customerEmail,
    honoreeOrTitle: project?.title || undefined,
    amountUsd: balanceUsd,
    totalPriceUsd,
    balanceDueUsd: balanceUsd,
    projectId,
    ownerUserId,
    blueprintToken: input.blueprintToken,
    whopCheckoutConfigId: whop.sessionId,
    whopPurchaseUrl: whop.purchaseUrl,
    origin: input.origin,
    createdAt: new Date().toISOString(),
  }

  await CollabSession.create({
    project_id: projectId,
    owner_user_id: ownerUserId,
    token: orderId,
    status: 'active',
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    payload: orderPayload as unknown as Record<string, unknown>,
  })

  return {
    orderId,
    purchaseUrl: whop.purchaseUrl,
    sessionId: whop.sessionId,
    amountUsd: balanceUsd,
  }
}

/**
 * Idempotent fulfillment for a paid $29 Blueprint Pass order.
 * Auto-provisions the guided AI Story Intake link + sends the branded magic-link email.
 */
export async function fulfillExpressBlueprintPassOrder(input: {
  orderId: string
  whopPaymentId?: string
}): Promise<{ ok: boolean; intakeUrl?: string; alreadyFulfilled?: boolean; error?: string }> {
  await sequelize.authenticate()
  const session = await CollabSession.findOne({ where: { token: input.orderId } })
  if (!session || !isExpressShowcaseOrderPayload(session.payload)) {
    return { ok: false, error: 'Showcase order not found' }
  }

  const order = session.payload
  if (order.status === 'fulfilled' && order.intakeUrl) {
    return { ok: true, intakeUrl: order.intakeUrl, alreadyFulfilled: true }
  }

  const offer = getShowcaseOfferById(order.offerId)
  const intake = await createClientIntakeLink({
    ownerUserId: order.ownerUserId,
    ownerDisplayName: SHOWCASE_BRAND_SNAPSHOT.brandName,
    projectId: order.projectId,
    vertical: offer.vertical,
    mode: 'single_project',
    locale: order.locale,
    blueprintDepositUsd: order.amountUsd,
    autoPublishBlueprintShare: true,
    deliveryTier: 'express_cinema_4k',
    expressReleaseMode: 'supervised_pm_release',
    expressTotalPriceUsd: offer.totalPriceUsd,
    expressBalanceUsd: offer.balanceDueUsd,
    occasionId: offer.id,
    occasionPromptContext: offer.occasionPromptContext,
    showcaseOrderId: order.orderId,
    brandProfileOverride: SHOWCASE_BRAND_SNAPSHOT,
    skipCommercialAddendumCheck: true,
    customerEmail: order.customerEmail,
    clientPriceUsd: offer.totalPriceUsd,
    customerLabel: order.honoreeOrTitle || order.customerName,
    origin: order.origin,
  })

  const nowIso = new Date().toISOString()
  const updatedOrder: ExpressShowcaseOrderPayload = {
    ...order,
    status: 'fulfilled',
    whopPaymentId: input.whopPaymentId || order.whopPaymentId,
    intakeToken: intake.token,
    intakeUrl: intake.hostedUrl,
    paidAt: order.paidAt || nowIso,
    fulfilledAt: nowIso,
  }

  await session.update({ payload: updatedOrder as unknown as Record<string, unknown> })

  const project = await Project.findByPk(order.projectId).catch(() => null)
  if (project) {
    const md = ((project.metadata || {}) as Record<string, any>)
    const co = ((md.clientOrder || {}) as Record<string, any>)
    await project.update({
      metadata: {
        ...md,
        clientOrder: {
          ...co,
          blueprintPassPaidAt: nowIso,
          whopBlueprintPaymentId: input.whopPaymentId || co.whopBlueprintPaymentId,
          intakeUrl: intake.hostedUrl,
          stage: 'awaiting_intake',
          actionState: 'waiting_on_client',
        },
      },
    })
  }

  return { ok: true, intakeUrl: intake.hostedUrl, alreadyFulfilled: false }
}

/**
 * Idempotent fulfillment for a paid Express 4K Film balance order ($120 / $170 / $220).
 * Auto-creates the Continuity Photo + 10s Pronunciation Portal and emails the customer.
 */
export async function fulfillExpressFilmBalanceOrder(input: {
  orderId: string
  whopPaymentId?: string
}): Promise<{ ok: boolean; continuityUrl?: string; alreadyFulfilled?: boolean; error?: string }> {
  await sequelize.authenticate()
  const session = await CollabSession.findOne({ where: { token: input.orderId } })
  if (!session || !isExpressShowcaseOrderPayload(session.payload)) {
    return { ok: false, error: 'Showcase balance order not found' }
  }

  const order = session.payload
  if (order.status === 'fulfilled' && order.continuityUrl) {
    return { ok: true, continuityUrl: order.continuityUrl, alreadyFulfilled: true }
  }

  const nowIso = new Date().toISOString()
  const project = await Project.findByPk(order.projectId)
  if (!project) {
    return { ok: false, error: 'Associated project not found' }
  }

  const md = ((project.metadata || {}) as Record<string, any>)
  const co = ((md.clientOrder || {}) as Record<string, any>)

  const continuity = await createOrUpdateContinuityPortalLink({
    project,
    ownerUserId: order.ownerUserId,
    ownerDisplayName: SHOWCASE_BRAND_SNAPSHOT.brandName,
    clientMode: true,
    allowUploads: true,
    allowVoiceCapture: true,
    locale: order.locale,
    maxRounds: 2,
    origin: order.origin,
  })

  await project.update({
    metadata: {
      ...md,
      clientOrder: {
        ...co,
        isClientProject: true,
        deliveryTier: 'express_cinema_4k',
        expressReleaseMode: co.expressReleaseMode || 'supervised_pm_release',
        expressBalancePaidAt: nowIso,
        expressBalanceAmountUsd: order.amountUsd,
        whopBalancePaymentId: input.whopPaymentId || co.whopBalancePaymentId,
        continuityPortalUrl: continuity.url,
        stage: 'continuity_sent',
        actionState: 'waiting_on_client',
      },
    },
  })

  // Also stamp paid status + continuity link onto the Blueprint share session so refreshing shows instant progress
  if (order.blueprintToken) {
    const bpResolved = await resolveBlueprintShareByToken(order.blueprintToken).catch(() => null)
    if (bpResolved) {
      const nextBpPayload = {
        ...bpResolved.payload,
        shareSettings: {
          ...bpResolved.payload.shareSettings,
          approvalStatus: 'approved' as const,
          expressBalancePaidAt: nowIso,
          continuityPortalUrl: continuity.url,
        },
      }
      await CollabSession.update(
        { payload: nextBpPayload },
        { where: { id: sessionDbId(bpResolved.session) } }
      ).catch(() => {})
    }
  }

  const updatedOrder: ExpressShowcaseOrderPayload = {
    ...order,
    status: 'fulfilled',
    whopPaymentId: input.whopPaymentId || order.whopPaymentId,
    continuityToken: continuity.token,
    continuityUrl: continuity.url,
    paidAt: order.paidAt || nowIso,
    fulfilledAt: nowIso,
  }
  await session.update({ payload: updatedOrder as unknown as Record<string, unknown> })

  if (order.customerEmail) {
    await sendAutomatedClientPortalEmail({
      toEmail: order.customerEmail,
      customerName: order.customerName,
      brandName: SHOWCASE_BRAND_SNAPSHOT.brandName,
      subject: `${SHOWCASE_BRAND_SNAPSHOT.brandName} — Upload Photos & Lock Cast for "${project.title}"`,
      heading: `Your Express 4K Film Is Unlocked — Next Step: Continuity Library`,
      paragraphs: [
        `Hi ${order.customerName},`,
        `Thank you for upgrading "${project.title}" to a Same-Day Express 4K Cinema Film!`,
        `Open your private Continuity Library below to upload real photos right from your phone (EXIF GPS stripped automatically), leave a quick 10-second name/town pronunciation guide, and approve your cast & visual look.`,
      ],
      ctaLabel: 'Open Continuity Library',
      ctaUrl: continuity.url,
    })
  }

  await notifyUser({
    userId: order.ownerUserId,
    projectId: project.id,
    type: 'client_stage_approved',
    title: `Express 4K Balance Paid ($${order.amountUsd}): ${project.title}`,
    message: `${order.customerName} completed Whop checkout ($${order.amountUsd}). Continuity Library link was automatically sent.`,
    sendEmail: true,
    metadata: {
      projectId: project.id,
      orderId: order.orderId,
      openPath: `/dashboard/workflow/vision/${project.id}`,
    },
  }).catch(() => {})

  return { ok: true, continuityUrl: continuity.url, alreadyFulfilled: false }
}

/**
 * Verifies a pending showcase order directly via Whop Payments API when the customer
 * returns from Whop Checkout (`?checkout=success`) before the webhook arrives.
 */
export async function reconcileExpressShowcaseOrderViaWhop(
  orderId: string
): Promise<ExpressShowcaseOrderPayload | null> {
  await sequelize.authenticate()
  const session = await CollabSession.findOne({ where: { token: orderId } })
  if (!session || !isExpressShowcaseOrderPayload(session.payload)) {
    return null
  }

  const order = session.payload
  if (order.status === 'fulfilled') {
    return order
  }

  try {
    await ensureWhopRuntimeConfig()
    const client = getWhopClient()
    const companyId = getWhopCompanyId()

    let matchedPaymentId: string | undefined
    const page = await client.payments.list({
      company_id: companyId,
      statuses: ['paid'],
      first: 30,
    })

    for (const payment of page.data || []) {
      const pMeta = (payment.metadata || {}) as Record<string, unknown>
      if (pMeta.showcase_order_id === orderId) {
        matchedPaymentId = payment.id
        break
      }
    }

    if (matchedPaymentId) {
      if (order.orderKind === 'express_blueprint_pass') {
        await fulfillExpressBlueprintPassOrder({ orderId, whopPaymentId: matchedPaymentId })
      } else {
        await fulfillExpressFilmBalanceOrder({ orderId, whopPaymentId: matchedPaymentId })
      }
      const refreshed = await CollabSession.findOne({ where: { token: orderId } })
      if (refreshed && isExpressShowcaseOrderPayload(refreshed.payload)) {
        return refreshed.payload
      }
    }
  } catch (err) {
    console.warn('[ExpressShowcaseService] Whop return-URL reconciliation warning:', err)
  }

  return order
}
