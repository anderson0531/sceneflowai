import { beforeEach, describe, expect, it, vi } from 'vitest'

const findOneProfileMock = vi.fn()
const createProfileMock = vi.fn()
const createConsentMock = vi.fn()
const findAllSubmissionsMock = vi.fn()
const destroySubmissionsMock = vi.fn()
const getUserSubscriptionMock = vi.fn()
const blobDelMock = vi.fn().mockResolvedValue(undefined)

vi.mock('@vercel/blob', () => ({
  del: (...args: unknown[]) => blobDelMock(...args),
}))

vi.mock('@/lib/database/migrateProducerPlatform', () => ({
  COMMERCIAL_ADDENDUM_VERSION: '2026-11-v1',
  CUSTOMER_CONSENT_VERSION: '2026-11-v2',
  ensureProducerPlatformSchema: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/models/ProducerProfile', () => ({
  default: {
    findOne: (...args: unknown[]) => findOneProfileMock(...args),
    create: (...args: unknown[]) => createProfileMock(...args),
  },
}))

vi.mock('@/models/CustomerConsent', () => ({
  default: {
    create: (...args: unknown[]) => createConsentMock(...args),
    findOne: vi.fn(),
  },
}))

vi.mock('@/models/ClientAssetSubmission', () => ({
  default: {
    findAll: (...args: unknown[]) => findAllSubmissionsMock(...args),
    destroy: (...args: unknown[]) => destroySubmissionsMock(...args),
  },
}))

vi.mock('@/services/SubscriptionService', () => ({
  SubscriptionService: {
    getUserSubscription: (...args: unknown[]) => getUserSubscriptionMock(...args),
  },
}))

import {
  isWhiteLabelEligibleTier,
  purgeProjectClientUploads,
  recordCustomerConsent,
  toBrandProfileSnapshot,
  upsertProducerProfile,
} from '@/lib/producer/producerProfileService'

describe('Video Service Provider White-Label Tier Gate, Consent Ledger & Upload Purge', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('gates 100% white-label branding to Pro, Studio, and Enterprise tiers', () => {
    expect(isWhiteLabelEligibleTier('explorer')).toBe(false)
    expect(isWhiteLabelEligibleTier('hobbyist')).toBe(false)
    expect(isWhiteLabelEligibleTier('starter')).toBe(false)
    expect(isWhiteLabelEligibleTier('pro')).toBe(true)
    expect(isWhiteLabelEligibleTier('studio')).toBe(true)
    expect(isWhiteLabelEligibleTier('enterprise')).toBe(true)

    const rawProfile = { brand_name: 'Harbor Films', hide_sceneflow_branding: true }
    expect(
      toBrandProfileSnapshot(rawProfile, 'Fallback', { whiteLabelEligible: false })
        .hideSceneFlowBranding
    ).toBe(false)
    expect(
      toBrandProfileSnapshot(rawProfile, 'Fallback', { whiteLabelEligible: true })
        .hideSceneFlowBranding
    ).toBe(true)
  })

  it('clamps hide_sceneflow_branding to false on Starter plans while allowing true on Pro plans', async () => {
    const updateMock = vi.fn().mockResolvedValue(undefined)
    findOneProfileMock.mockResolvedValue({
      id: 'prof-1',
      user_id: 'user-1',
      hide_sceneflow_branding: false,
      commercial_addendum_accepted_at: null,
      update: updateMock,
    })

    // Starter user attempts to enable hideSceneFlowBranding
    getUserSubscriptionMock.mockResolvedValueOnce({
      tier: { name: 'starter' },
      status: 'active',
    })
    await upsertProducerProfile('user-1', { hideSceneFlowBranding: true })
    expect(updateMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ hide_sceneflow_branding: false })
    )

    // Pro user enables hideSceneFlowBranding
    getUserSubscriptionMock.mockResolvedValueOnce({
      tier: { name: 'pro' },
      status: 'active',
    })
    await upsertProducerProfile('user-1', { hideSceneFlowBranding: true })
    expect(updateMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ hide_sceneflow_branding: true })
    )
  })

  it('records granular visual likeness and voice localization consent flags', async () => {
    createConsentMock.mockImplementation(async (payload) => ({ id: 'consent-1', ...payload }))

    const consent = await recordCustomerConsent({
      collabSessionId: 'sess-1',
      projectId: 'proj-1',
      ownerUserId: 'producer-1',
      customerName: 'Elena Rossi',
      customerEmail: 'elena@example.com',
      attestedMediaRights: true,
      acknowledgedZeroPrivity: true,
      consentedVisualLikeness: true,
      consentedVoiceLocalization: true,
    })

    expect(consent.consent_version).toBe('2026-11-v2')
    expect(consent.consented_visual_likeness).toBe(true)
    expect(consent.consented_voice_localization).toBe(true)
  })

  it('purges raw client continuity uploads after delivery', async () => {
    process.env.BLOB_READ_WRITE_TOKEN = 'test_blob_token'
    findAllSubmissionsMock.mockResolvedValueOnce([
      { id: 'sub-1', blob_url: 'https://blob.vercel-storage.com/photo1.jpg' },
      { id: 'sub-2', blob_url: 'https://blob.vercel-storage.com/photo2.jpg' },
    ])
    destroySubmissionsMock.mockResolvedValueOnce(2)

    const result = await purgeProjectClientUploads({
      projectId: 'proj-memoir-1',
      ownerUserId: 'producer-1',
    })

    expect(blobDelMock).toHaveBeenCalledWith([
      'https://blob.vercel-storage.com/photo1.jpg',
      'https://blob.vercel-storage.com/photo2.jpg',
    ])
    expect(destroySubmissionsMock).toHaveBeenCalledWith({
      where: { project_id: 'proj-memoir-1', owner_user_id: 'producer-1' },
    })
    expect(result.deletedCount).toBe(2)
  })
})
