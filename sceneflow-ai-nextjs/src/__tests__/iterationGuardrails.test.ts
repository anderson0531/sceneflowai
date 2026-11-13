import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  isBlueprintFeedbackAllowed,
  isBlueprintRoundLimitReached,
  shouldHideBlueprintAudienceResonance,
} from '@/lib/blueprint/shareSettings'

const findOneSessionMock = vi.fn()
const findByPkProjectMock = vi.fn()
const getConsentMock = vi.fn()

vi.mock('@/models/CollabSession', () => ({
  default: {
    findOne: (...args: unknown[]) => findOneSessionMock(...args),
  },
}))

vi.mock('@/models/Project', () => ({
  default: {
    findByPk: (...args: unknown[]) => findByPkProjectMock(...args),
  },
}))

vi.mock('@/models/ClientAssetSubmission', () => ({ default: {} }))
vi.mock('@/models/ReferenceAsset', () => ({ default: {} }))
vi.mock('@/lib/jobs/jobService', () => ({ notifyUser: vi.fn() }))
vi.mock('@/lib/database/migrateProducerPlatform', () => ({
  ensureProducerPlatformSchema: vi.fn(),
}))
vi.mock('@/lib/producer/producerProfileService', () => ({
  getLatestCustomerConsent: (...args: unknown[]) => getConsentMock(...args),
  getOrCreateProducerProfile: vi.fn(),
  toBrandProfileSnapshot: vi.fn(),
}))

import { submitContinuityClientReview } from '@/lib/continuity/continuityPortalService'

describe('Round-Capped Iteration & Audience Resonance Guardrails', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('keeps Audience Resonance visible on internal peer collab links unless hidden', () => {
    expect(shouldHideBlueprintAudienceResonance(null)).toBe(false)
    expect(shouldHideBlueprintAudienceResonance({ allowFeedback: true })).toBe(false)
    expect(
      shouldHideBlueprintAudienceResonance({
        clientMode: false,
        hideAudienceResonance: true,
      })
    ).toBe(true)
  })

  it('strips Audience Resonance by default on Client Mode Blueprint links', () => {
    expect(shouldHideBlueprintAudienceResonance({ clientMode: true })).toBe(true)
    expect(
      shouldHideBlueprintAudienceResonance({
        clientMode: true,
        hideAudienceResonance: false,
      })
    ).toBe(false)
  })

  it('enforces Blueprint revision round caps and locks feedback once approved', () => {
    expect(isBlueprintFeedbackAllowed({ allowFeedback: true })).toBe(true)
    expect(isBlueprintRoundLimitReached({ maxFeedbackRounds: 2, roundsUsed: 0 })).toBe(false)
    expect(isBlueprintRoundLimitReached({ maxFeedbackRounds: 2, roundsUsed: 1 })).toBe(false)
    expect(isBlueprintRoundLimitReached({ maxFeedbackRounds: 2, roundsUsed: 2 })).toBe(true)
    expect(
      isBlueprintRoundLimitReached({
        maxFeedbackRounds: 5,
        roundsUsed: 0,
        approvalStatus: 'approved',
      })
    ).toBe(true)
  })

  it('blocks Continuity revision submissions at 409 when roundsUsed >= maxRounds, while still permitting 1-click approval', async () => {
    const updateSession = vi.fn().mockResolvedValue(undefined)
    findOneSessionMock.mockResolvedValue({
      id: 'sess-1',
      project_id: 'proj-1',
      owner_user_id: 'owner-1',
      expires_at: null,
      update: updateSession,
      payload: {
        type: 'continuity',
        locale: 'en',
        maxRounds: 2,
        roundsUsed: 2,
        approvalStatus: 'changes_requested',
        brandProfileSnapshot: { brandName: 'Studio' },
        slots: [
          {
            slotId: 'char-1',
            slotType: 'character',
            slotKey: 'Arthur',
            label: 'Arthur',
            description: 'Grandfather',
            clientDecision: 'pending',
          },
        ],
      },
    })
    getConsentMock.mockResolvedValue({ id: 'consent-1', customer_name: 'Maria' })
    findByPkProjectMock.mockResolvedValue({
      id: 'proj-1',
      title: 'Arthur Memoir',
      metadata: {},
      update: vi.fn(),
    })

    const blockedRevision = await submitContinuityClientReview({
      token: 'tok-continuity',
      reviewerName: 'Maria',
      slotDecisions: [{ slotId: 'char-1', decision: 'revision_requested', note: 'Different coat' }],
    })

    expect(blockedRevision.ok).toBe(false)
    if (!blockedRevision.ok) {
      expect(blockedRevision.status).toBe(409)
      expect(blockedRevision.error).toContain('ROUND_LIMIT_REACHED')
    }
    expect(updateSession).not.toHaveBeenCalled()

    // Even at 2/2 revision rounds used, final approval is permitted cleanly
    const finalApprove = await submitContinuityClientReview({
      token: 'tok-continuity',
      reviewerName: 'Maria',
      slotDecisions: [{ slotId: 'char-1', decision: 'approved' }],
    })
    expect(finalApprove.ok).toBe(true)
    if (finalApprove.ok) {
      expect(finalApprove.approvalStatus).toBe('approved')
      expect(finalApprove.roundsUsed).toBe(2)
    }
  })
})
