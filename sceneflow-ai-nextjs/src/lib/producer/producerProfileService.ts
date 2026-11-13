import ProducerProfile from '@/models/ProducerProfile'
import CustomerConsent from '@/models/CustomerConsent'
import {
  COMMERCIAL_ADDENDUM_VERSION,
  CUSTOMER_CONSENT_VERSION,
  ensureProducerPlatformSchema,
} from '@/lib/database/migrateProducerPlatform'

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
    hide_sceneflow_branding: true,
    default_max_rounds: 2,
    daily_public_intake_credit_cap: 200,
  })
}

export function toBrandProfileSnapshot(
  profile: Partial<ProducerProfile> | null | undefined,
  fallbackDisplayName = 'Production Studio'
): BrandProfileSnapshot {
  const brandName = (profile?.brand_name || '').trim() || fallbackDisplayName
  return {
    brandName,
    logoUrl: profile?.brand_logo_url || null,
    primaryColor: profile?.primary_color || '#7c3aed',
    supportEmail: profile?.support_email || null,
    customTermsUrl: profile?.custom_terms_url || null,
    hideSceneFlowBranding: profile?.hide_sceneflow_branding !== false,
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
    updates.hide_sceneflow_branding = input.hideSceneFlowBranding
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
