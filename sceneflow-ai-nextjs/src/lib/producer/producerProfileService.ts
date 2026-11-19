import { del } from '@vercel/blob'
import ProducerProfile from '@/models/ProducerProfile'
import CustomerConsent from '@/models/CustomerConsent'
import ClientAssetSubmission from '@/models/ClientAssetSubmission'
import { SubscriptionService } from '@/services/SubscriptionService'
import { normalizeTierName, type BillingTierName } from '@/lib/billing/tierCatalog'
import {
  COMMERCIAL_ADDENDUM_VERSION,
  CUSTOMER_CONSENT_VERSION,
  ensureProducerPlatformSchema,
} from '@/lib/database/migrateProducerPlatform'
import { normalizeLocalePmRouting, type LocalePmRoutingMap } from '@/lib/producer/teamGovernance'

export const WHITE_LABEL_ELIGIBLE_TIERS: readonly BillingTierName[] = [
  'pro',
  'studio',
  'enterprise',
] as const

export function isWhiteLabelEligibleTier(tierName?: string | null): boolean {
  if (!tierName) return false
  const normalized = normalizeTierName(tierName)
  if (!normalized) return false
  return WHITE_LABEL_ELIGIBLE_TIERS.includes(normalized)
}

export async function resolveProducerWhiteLabelEligibility(
  userId: string
): Promise<{ eligible: boolean; tierName: BillingTierName }> {
  try {
    const sub = await SubscriptionService.getUserSubscription(userId)
    const rawTierName = (sub.tier as { name?: string } | null)?.name ?? null
    const normalized = rawTierName ? normalizeTierName(rawTierName) : null
    const tierName: BillingTierName = normalized ?? 'explorer'
    const activeStatus =
      sub.status === 'active' || sub.status === 'trial' || sub.status === null
    return {
      eligible: Boolean(normalized && activeStatus && isWhiteLabelEligibleTier(tierName)),
      tierName,
    }
  } catch {
    return { eligible: false, tierName: 'explorer' }
  }
}

export interface BrandProfileSnapshot {
  brandName: string
  logoUrl?: string | null
  primaryColor?: string
  supportEmail?: string | null
  customTermsUrl?: string | null
  hideSceneFlowBranding?: boolean
}

export async function getOrCreateProducerProfile(userId: string): Promise<ProducerProfile> {
  await ensureProducerPlatformSchema()
  const existing = await ProducerProfile.findOne({ where: { user_id: userId } })
  if (existing) return existing

  return ProducerProfile.create({
    user_id: userId,
    brand_name: '',
    primary_color: '#7c3aed',
    hide_sceneflow_branding: false,
    default_max_rounds: 2,
    daily_public_intake_credit_cap: 200,
  })
}

export function toBrandProfileSnapshot(
  profile: Partial<ProducerProfile> | null | undefined,
  fallbackDisplayName = 'Production Studio',
  options?: { whiteLabelEligible?: boolean }
): BrandProfileSnapshot {
  const brandName = (profile?.brand_name || '').trim() || fallbackDisplayName
  const allowHide = options?.whiteLabelEligible !== false
  return {
    brandName,
    logoUrl: profile?.brand_logo_url || null,
    primaryColor: profile?.primary_color || '#7c3aed',
    supportEmail: profile?.support_email || null,
    customTermsUrl: profile?.custom_terms_url || null,
    hideSceneFlowBranding: allowHide ? Boolean(profile?.hide_sceneflow_branding) : false,
  }
}

export async function upsertProducerProfile(
  userId: string,
  input: {
    brandName?: string
    brandLogoUrl?: string | null
    primaryColor?: string
    supportEmail?: string | null
    customTermsUrl?: string | null
    hideSceneFlowBranding?: boolean
    defaultMaxRounds?: number
    dailyPublicIntakeCreditCap?: number
    acceptCommercialAddendum?: boolean
    acceptedIp?: string | null
    whiteLabelEligibleOverride?: boolean
    localePmRouting?: LocalePmRoutingMap
  }
): Promise<ProducerProfile> {
  const profile = await getOrCreateProducerProfile(userId)

  const updates: Record<string, unknown> = {}
  if (typeof input.brandName === 'string') {
    updates.brand_name = input.brandName.trim().slice(0, 160)
  }
  if (input.brandLogoUrl !== undefined) {
    updates.brand_logo_url = input.brandLogoUrl ? String(input.brandLogoUrl).trim().slice(0, 1000) : null
  }
  if (typeof input.primaryColor === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(input.primaryColor.trim())) {
    updates.primary_color = input.primaryColor.trim()
  }
  if (input.supportEmail !== undefined) {
    updates.support_email = input.supportEmail ? String(input.supportEmail).trim().slice(0, 255) : null
  }
  if (input.customTermsUrl !== undefined) {
    updates.custom_terms_url = input.customTermsUrl ? String(input.customTermsUrl).trim().slice(0, 1000) : null
  }
  if (typeof input.hideSceneFlowBranding === 'boolean') {
    if (input.hideSceneFlowBranding) {
      const eligible =
        typeof input.whiteLabelEligibleOverride === 'boolean'
          ? input.whiteLabelEligibleOverride
          : (await resolveProducerWhiteLabelEligibility(userId)).eligible
      updates.hide_sceneflow_branding = eligible
    } else {
      updates.hide_sceneflow_branding = false
    }
  }
  if (typeof input.defaultMaxRounds === 'number' && Number.isFinite(input.defaultMaxRounds)) {
    updates.default_max_rounds = Math.min(10, Math.max(1, Math.round(input.defaultMaxRounds)))
  }
  if (
    typeof input.dailyPublicIntakeCreditCap === 'number' &&
    Number.isFinite(input.dailyPublicIntakeCreditCap)
  ) {
    updates.daily_public_intake_credit_cap = Math.min(
      50_000,
      Math.max(20, Math.round(input.dailyPublicIntakeCreditCap))
    )
  }
  if (input.acceptCommercialAddendum === true && !profile.commercial_addendum_accepted_at) {
    updates.commercial_addendum_accepted_at = new Date()
    updates.commercial_addendum_version = COMMERCIAL_ADDENDUM_VERSION
    updates.accepted_ip = input.acceptedIp ? String(input.acceptedIp).slice(0, 96) : null
  }
  if (input.localePmRouting !== undefined) {
    updates.locale_pm_routing = normalizeLocalePmRouting(input.localePmRouting)
  }

  if (Object.keys(updates).length > 0) {
    await profile.update(updates)
  }

  return profile
}

export async function recordCustomerConsent(input: {
  collabSessionId: string
  projectId?: string | null
  ownerUserId: string
  customerName: string
  customerEmail?: string | null
  ipAddress?: string | null
  userAgent?: string | null
  attestedMediaRights: boolean
  acknowledgedZeroPrivity: boolean
  consentedVisualLikeness?: boolean
  consentedVoiceLocalization?: boolean
}): Promise<CustomerConsent> {
  if (!input.attestedMediaRights || !input.acknowledgedZeroPrivity) {
    throw new Error('Customer media rights attestation and provider terms acknowledgment are required')
  }
  const cleanName = (input.customerName || '').trim()
  if (!cleanName) {
    throw new Error('Customer name is required')
  }

  await ensureProducerPlatformSchema()

  return CustomerConsent.create({
    collab_session_id: input.collabSessionId,
    project_id: input.projectId || null,
    owner_user_id: input.ownerUserId,
    customer_name: cleanName.slice(0, 160),
    customer_email: input.customerEmail ? input.customerEmail.trim().slice(0, 255) : null,
    consent_version: CUSTOMER_CONSENT_VERSION,
    ip_address: input.ipAddress ? input.ipAddress.slice(0, 96) : null,
    user_agent: input.userAgent ? input.userAgent.slice(0, 512) : null,
    attested_media_rights: true,
    acknowledged_zero_privity: true,
    consented_visual_likeness: input.consentedVisualLikeness !== false,
    consented_voice_localization: input.consentedVoiceLocalization === true,
    accepted_at: new Date(),
  })
}

export async function getLatestCustomerConsent(
  collabSessionId: string
): Promise<CustomerConsent | null> {
  await ensureProducerPlatformSchema()
  return CustomerConsent.findOne({
    where: { collab_session_id: collabSessionId },
    order: [['accepted_at', 'DESC']],
  })
}

export async function purgeProjectClientUploads(input: {
  projectId: string
  ownerUserId: string
}): Promise<{ deletedCount: number }> {
  await ensureProducerPlatformSchema()
  const rows = await ClientAssetSubmission.findAll({
    where: {
      project_id: input.projectId,
      owner_user_id: input.ownerUserId,
    },
  })
  if (rows.length === 0) {
    return { deletedCount: 0 }
  }

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const urls = rows.map((r) => r.blob_url).filter(Boolean)
    if (urls.length > 0) {
      await del(urls).catch((err) => {
        console.warn('[purgeProjectClientUploads] Best-effort blob delete warning:', err)
      })
    }
  }

  const deletedCount = await ClientAssetSubmission.destroy({
    where: {
      project_id: input.projectId,
      owner_user_id: input.ownerUserId,
    },
  })

  return { deletedCount }
}
