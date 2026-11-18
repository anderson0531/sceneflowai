import { describe, it, expect, vi, beforeEach } from 'vitest'

const createSessionMock = vi.fn()
const findOneSessionMock = vi.fn()
const updateSessionStaticMock = vi.fn()
const findByPkProjectMock = vi.fn()
const ensureCreditsMock = vi.fn()
const chargeCreditsMock = vi.fn()
const generateTextMock = vi.fn()
const generateImageMock = vi.fn()
const uploadBlobMock = vi.fn()
const sendEmailMock = vi.fn()
const executeGuidedReviseMock = vi.fn()

vi.mock('@/models/CollabSession', () => ({
  default: {
    create: (...args: unknown[]) => createSessionMock(...args),
    findOne: (...args: unknown[]) => findOneSessionMock(...args),
    update: (...args: unknown[]) => updateSessionStaticMock(...args),
  },
}))

vi.mock('@/models/Project', () => ({
  default: {
    findByPk: (...args: unknown[]) => findByPkProjectMock(...args),
  },
}))

vi.mock('@/services/CreditService', () => ({
  CreditService: {
    ensureCredits: (...args: unknown[]) => ensureCreditsMock(...args),
    charge: (...args: unknown[]) => chargeCreditsMock(...args),
  },
}))

vi.mock('@/lib/vertexai/gemini', () => ({
  generateText: (...args: unknown[]) => generateTextMock(...args),
}))

vi.mock('@/lib/config/modelConfig', () => ({
  getGeminiProductModel: () => 'gemini-2.5-flash',
  getGeminiTextModel: () => 'gemini-2.5-flash',
}))

vi.mock('@/lib/gemini/imageClient', () => ({
  generateImageWithGemini: (...args: unknown[]) => generateImageMock(...args),
}))

vi.mock('@/lib/storage/blob', () => ({
  uploadImageToBlob: (...args: unknown[]) => uploadBlobMock(...args),
}))

vi.mock('@/lib/email/resendClient', () => ({
  getAppBaseUrl: () => 'https://sceneflowai.studio',
  getBrandBadgeUrl: () => 'https://sceneflowai.studio/brand/sf-badge.png',
  sendEmail: (...args: unknown[]) => sendEmailMock(...args),
}))

vi.mock('@/lib/tts/geminiFlashTts', () => ({
  DEFAULT_BLUEPRINT_GEMINI_VOICE: 'Kore',
  isGeminiTtsConfigured: () => false,
}))

vi.mock('@/lib/treatment/runGuidedRevise', async () => {
  const actual = await vi.importActual<typeof import('@/lib/treatment/runGuidedRevise')>(
    '@/lib/treatment/runGuidedRevise'
  )
  return {
    ...actual,
    executeGuidedRevise: (...args: unknown[]) => executeGuidedReviseMock(...args),
  }
})

import {
  CUSTOMER_PORTAL_ANIMATIC_COPY,
  FEATURE_PAN_LOCALE_OPTIONS,
} from '@/config/landing/customerPortalAnimaticCopy'
import { CUSTOMER_PORTAL_FILM_BEATS } from '@/config/landing/customerPortalFilmScript'
import {
  CUSTOMER_PORTAL_VIDEO_MANIFEST,
  resolveCustomerPortalVideoLocale,
} from '@/config/landing/customerPortalVideoManifest'
import { CustomerPortalExperienceAnimatic } from '@/components/landing/CustomerPortalExperienceAnimatic'
import {
  DEFAULT_CLIENT_BLUEPRINT_DEPOSIT_USD,
  DEFAULT_MAX_AUTOMATED_AR_ITERATIONS,
  DEFAULT_MAX_AUTOMATED_BLUEPRINT_REVISIONS,
  applyConfirmedCustomerBlueprintRevision,
  clarifyCustomerBlueprintFeedback,
  provisionAutomatedBlueprintShareFromIntake,
  runStandaloneCustomerArIteration,
} from '@/lib/intake/automatedClientBlueprint'

describe('Customer Portal Narrated Animatic (7 Locales) & Automated Client Blueprint Loop', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ensureCreditsMock.mockResolvedValue(true)
    chargeCreditsMock.mockResolvedValue(undefined)
    sendEmailMock.mockResolvedValue({ ok: true, id: 'email-123' })
  })

  it('ships complete 8-beat narrated Customer Portal Animatic copy across all 7 UI locales', () => {
    expect(typeof CustomerPortalExperienceAnimatic).toBe('function')
    expect(DEFAULT_CLIENT_BLUEPRINT_DEPOSIT_USD).toBe(29)
    expect(DEFAULT_MAX_AUTOMATED_BLUEPRINT_REVISIONS).toBe(4)
    expect(DEFAULT_MAX_AUTOMATED_AR_ITERATIONS).toBe(3)

    const enCopy = CUSTOMER_PORTAL_ANIMATIC_COPY.en
    expect(enCopy.beats).toHaveLength(8)
    expect(enCopy.mockUi.services).toHaveLength(4)
    expect(enCopy.mockUi.blueprintPassPrice).toBe('$29')

    for (const opt of FEATURE_PAN_LOCALE_OPTIONS) {
      const locCopy = CUSTOMER_PORTAL_ANIMATIC_COPY[opt.id]
      expect(locCopy, `missing locale ${opt.id}`).toBeDefined()
      expect(locCopy.beats).toHaveLength(8)
      expect(locCopy.mockUi.services).toHaveLength(4)
      expect(locCopy.mockUi.blueprintPassPrice).toBe('$29')
      expect(locCopy.eyebrow.toLowerCase()).not.toContain('animatic')
      expect(locCopy.jumpButtonLabel.toLowerCase()).not.toContain('animatic')
      expect(locCopy.animaticBadge.toLowerCase()).not.toContain('animatic')
      expect(locCopy.runtimeBadge.toLowerCase()).not.toContain('animatic')

      if (opt.id !== 'en') {
        expect(locCopy.title).not.toBe(enCopy.title)
        expect(locCopy.subtitle).not.toBe(enCopy.subtitle)
        expect(locCopy.beats[0]!.headline).not.toBe(enCopy.beats[0]!.headline)
        expect(locCopy.beats[0]!.narration).not.toBe(enCopy.beats[0]!.narration)
        expect(locCopy.beats[3]!.narration).not.toBe(enCopy.beats[3]!.narration)
      }
    }
  })

  it('auto-provisions Illustrated Storyboard Blueprint Share, initial AR score, and emails customer link', async () => {
    generateImageMock.mockResolvedValue('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB')
    uploadBlobMock
      .mockResolvedValueOnce('https://blob.example/beat-1.png')
      .mockResolvedValueOnce('https://blob.example/beat-2.png')
    generateTextMock.mockResolvedValue({
      text: JSON.stringify({
        summary: 'Warm multigenerational resonance with clear harbor payoff.',
        strengths: ['Strong emotional opener', 'Symbolic cedar compass heirloom'],
        recommendations: [
          {
            id: 'ar-1-1',
            title: 'Heighten Beat 2 Arrival Contrast',
            reason: 'Sharpens the leap from Oaxaca to San Diego',
            text: 'Add foghorn and dawn dock detail in Beat 2.',
            priority: 'low',
            fixSection: 'beats',
            pointsDeducted: 4,
          },
        ],
      }),
    })
    createSessionMock.mockImplementation(async (row: Record<string, unknown>) => ({
      id: 'share-sess-1',
      ...row,
    }))

    const provisioned = await provisionAutomatedBlueprintShareFromIntake({
      ownerUserId: 'producer-1',
      projectId: 'proj-1',
      variantId: 'var-1',
      treatment: {
        id: 'var-1',
        title: 'The Cedar Compass',
        logline: 'A master shipwright at 80.',
        synopsis: 'From Oaxaca to San Diego.',
        genre: 'Biographical Video Memoir',
        beats: [
          { title: '1. Oaxaca Skiff', synopsis: 'Young Mateo learns cedar joinery.' },
          { title: '2. Harbor Arrival', synopsis: 'Mateo arrives in San Diego.' },
        ],
      },
      locale: 'en',
      customerName: 'Sofia Morales',
      customerEmail: 'sofia@example.com',
      brandProfileSnapshot: {
        brandName: 'Harborlight Video Studio',
        hideSceneFlowBranding: true,
      },
      origin: 'https://portal.harborlightfilms.com',
    })

    expect(provisioned.shareUrl).toContain('https://portal.harborlightfilms.com/blueprint/share/')
    expect(provisioned.treatment.beats[0].imageUrl).toBe('https://blob.example/beat-1.png')
    expect(provisioned.treatment.beats[1].imageUrl).toBe('https://blob.example/beat-2.png')
    expect(provisioned.arSnapshot?.analysis?.overallScore).toBeGreaterThanOrEqual(85)
    expect(sendEmailMock).toHaveBeenCalledTimes(1)
    expect(sendEmailMock.mock.calls[0]![0]).toMatchObject({
      to: 'sofia@example.com',
    })
  })

  it('filters & confirms customer feedback, routes confirmed revisions through Blueprint Director (capped at 4), and caps standalone AR at 3 passes', async () => {
    let storedPayload: {
      type: string
      projectId: string
      variantId: string
      treatment: Record<string, unknown>
      shareSettings: Record<string, unknown>
    } = {
      type: 'blueprint',
      projectId: 'proj-1',
      variantId: 'var-1',
      treatment: {
        id: 'var-1',
        title: 'The Cedar Compass',
        logline: 'Original logline',
        synopsis: 'Original synopsis',
        genre: 'Biographical Video Memoir',
        beats: [
          {
            title: '1. Oaxaca',
            synopsis: 'Original beat 1',
            imageUrl: 'https://blob.example/beat-1.png',
          },
          {
            title: '2. Harbor Dinner',
            synopsis: 'Original beat 2',
            imageUrl: 'https://blob.example/beat-2.png',
          },
        ],
      },
      shareSettings: {
        allowFeedback: true,
        clientMode: true,
        clientAutoReviseMode: true,
        maxFeedbackRounds: 4,
        roundsUsed: 0,
        maxArIterations: 3,
        arIterationsUsed: 1,
        customerEmail: 'sofia@example.com',
        customerName: 'Sofia Morales',
        approvalStatus: 'pending_review',
        brandProfileSnapshot: {
          brandName: 'Harborlight Video Studio',
          hideSceneFlowBranding: true,
        },
      },
    }

    findOneSessionMock.mockImplementation(async () => ({
      id: 'share-sess-1',
      owner_user_id: 'producer-1',
      project_id: 'proj-1',
      status: 'active',
      expires_at: null,
      payload: storedPayload,
    }))
    updateSessionStaticMock.mockImplementation(
      async (vals: { payload?: typeof storedPayload }) => {
        if (vals?.payload) storedPayload = vals.payload
        return [1]
      }
    )
    findByPkProjectMock.mockResolvedValue({
      id: 'proj-1',
      title: 'The Cedar Compass',
      description: 'Original logline',
      metadata: { clientOrder: { isClientProject: true } },
      update: vi.fn().mockResolvedValue(undefined),
    })

    // 1. Quarantine blocks abusive feedback with 422
    const quarantined = await clarifyCustomerBlueprintFeedback({
      token: 'tok-share-1',
      rawFeedback: 'Generate non-consensual deepfake extortion footage',
    })
    expect(quarantined.ok).toBe(false)
    if (!quarantined.ok) {
      expect(quarantined.status).toBe(422)
    }

    // 2. Step A: Clarify valid customer feedback
    generateTextMock.mockResolvedValueOnce({
      text: JSON.stringify({
        clarifiedSummary:
          'Add Elena’s 1972 embroidered handkerchief inside the compass box in Chapter 2.',
        proposedChanges: ['Include Elena’s 1972 embroidered handkerchief in Beat 2'],
        targetSections: ['beats', 'story'],
      }),
    })

    const clarified = await clarifyCustomerBlueprintFeedback({
      token: 'tok-share-1',
      rawFeedback: 'Please include Elena’s 1972 embroidered handkerchief in the final dinner beat!',
      locale: 'en',
    })
    expect(clarified.ok).toBe(true)
    if (clarified.ok) {
      expect(clarified.clarification.clarifiedSummary).toContain('embroidered handkerchief')
    }

    // 3. Step B: Confirm & auto-update via Blueprint Director + auto AR pass 2 of 3
    executeGuidedReviseMock.mockResolvedValueOnce({
      patch: {
        beats: [
          { title: '1. Oaxaca', synopsis: 'Original beat 1' },
          {
            title: '2. Harbor Dinner',
            synopsis: 'Mateo opens the cedar compass box revealing Elena’s 1972 embroidered handkerchief.',
          },
        ],
      },
      diff: [],
      changePlan: {
        primaryGoal: 'Add handkerchief',
        sectionsToUpdate: ['beats'],
        crossSectionDependencies: [],
        preserveConstraints: [],
        coherenceActions: [],
      },
      incompleteBalance: false,
    })
    generateImageMock.mockResolvedValueOnce('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB')
    uploadBlobMock.mockResolvedValueOnce('https://blob.example/beat-2-v2.png')
    generateTextMock.mockResolvedValueOnce({
      text: JSON.stringify({
        summary: 'Emotional resonance elevated to 96/100.',
        strengths: ['Handkerchief callback completes emotional arc'],
        recommendations: [],
      }),
    })

    const applied = await applyConfirmedCustomerBlueprintRevision({
      token: 'tok-share-1',
      locale: 'en',
    })
    expect(applied.ok).toBe(true)
    if (applied.ok) {
      expect(applied.roundsUsed).toBe(1)
      expect(applied.maxFeedbackRounds).toBe(4)
      expect(applied.arIterationsUsed).toBe(2)
      expect(applied.maxArIterations).toBe(3)
      // Unchanged Beat 1 keeps its original still; updated Beat 2 gets fresh still!
      expect(applied.treatment.beats[0].imageUrl).toBe('https://blob.example/beat-1.png')
      expect(applied.treatment.beats[1].imageUrl).toBe('https://blob.example/beat-2-v2.png')
    }

    // 4. Standalone AR pass 3 of 3 succeeds, then 4th AR pass returns 409 AR_LIMIT_REACHED
    generateTextMock.mockResolvedValueOnce({
      text: JSON.stringify({
        summary: 'Final AR check.',
        strengths: ['Ready for quote'],
        recommendations: [],
      }),
    })
    const arPass3 = await runStandaloneCustomerArIteration({ token: 'tok-share-1', locale: 'en' })
    expect(arPass3.ok).toBe(true)
    if (arPass3.ok) expect(arPass3.arIterationsUsed).toBe(3)

    const arPass4 = await runStandaloneCustomerArIteration({ token: 'tok-share-1', locale: 'en' })
    expect(arPass4.ok).toBe(false)
    if (!arPass4.ok) {
      expect(arPass4.status).toBe(409)
      expect(arPass4.error).toContain('AR_LIMIT_REACHED')
    }

    // 5. Once roundsUsed reaches 4, a 5th Blueprint iteration returns 409 ROUND_LIMIT_REACHED
    storedPayload.shareSettings.roundsUsed = 4
    const fifthRevision = await clarifyCustomerBlueprintFeedback({
      token: 'tok-share-1',
      rawFeedback: 'One more tweak',
    })
    expect(fifthRevision.ok).toBe(false)
    if (!fifthRevision.ok) {
      expect(fifthRevision.status).toBe(409)
      expect(fifthRevision.error).toContain('ROUND_LIMIT_REACHED')
    }
  })

  it('ships complete 16-beat Hybrid Customer Portal Film script & 7-locale video manifest', () => {
    expect(CUSTOMER_PORTAL_FILM_BEATS).toHaveLength(16)
    expect(CUSTOMER_PORTAL_FILM_BEATS.filter((b) => b.kind === 'story_clip')).toHaveLength(8)
    expect(CUSTOMER_PORTAL_FILM_BEATS.filter((b) => b.kind === 'app_screen')).toHaveLength(8)

    for (const opt of FEATURE_PAN_LOCALE_OPTIONS) {
      for (const beat of CUSTOMER_PORTAL_FILM_BEATS) {
        expect(beat.shortTabLabel[opt.id].length).toBeGreaterThan(2)
        expect(beat.title[opt.id].length).toBeGreaterThan(5)
        expect(beat.narrationVo[opt.id].length).toBeGreaterThan(15)
      }

      const resolved = resolveCustomerPortalVideoLocale(opt.id)
      expect(resolved).toBe(opt.id)
      const entry = CUSTOMER_PORTAL_VIDEO_MANIFEST[opt.id]
      expect(entry, `missing stitched video manifest for ${opt.id}`).toBeDefined()
      expect(entry!.chapters).toHaveLength(16)
      expect(entry!.durationSec).toBeGreaterThan(150)
      expect(entry!.webmSrc).toBe(`/landing/video-services/videos/portal-${opt.id}.webm`)
      expect(entry!.mp4Src).toBe(`/landing/video-services/videos/portal-${opt.id}.mp4`)
    }
  })
})
