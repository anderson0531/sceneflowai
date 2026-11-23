import { readFileSync } from 'fs'
import path from 'path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const createSessionMock = vi.fn()
const findOneSessionMock = vi.fn()
const updateSessionStaticMock = vi.fn()
const findAllFeedbackMock = vi.fn()
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

vi.mock('@/models/CollabBlueprintFeedback', () => ({
  default: {
    findAll: (...args: unknown[]) => findAllFeedbackMock(...args),
  },
}))

vi.mock('@/lib/blueprint/ensureCollabBlueprintSchema', () => ({
  ensureCollabBlueprintFeedbackTable: vi.fn().mockResolvedValue(undefined),
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
  DEFAULT_ITERATION_PACK_AR_PASSES,
  DEFAULT_ITERATION_PACK_PRICE_USD,
  DEFAULT_ITERATION_PACK_REVISIONS,
  applyConfirmedCustomerBlueprintRevision,
  clarifyCustomerBlueprintFeedback,
  dismissGuestBlueprintFeedback,
  grantBlueprintIterationPack,
  listGuestBlueprintFeedbackForPrimaryCustomer,
  provisionAutomatedBlueprintShareFromIntake,
  runStandaloneCustomerArIteration,
} from '@/lib/intake/automatedClientBlueprint'
import {
  buildIntakeBlueprintSynthesisPrompt,
  buildNextIntakeQuestionPrompt,
  getCoverageTopicsForNarrativeMode,
} from '@/lib/intake/intakePlaybooks'
import {
  buildBlueprintFunnel,
  buildPmScorecard,
  getClientOrderRevenueUsd,
  resolveKanbanStage,
  type AgencyProjectInput,
} from '@/lib/producer/agencyOps'

describe('Self-Serve Blueprint Guest Triage, Iteration Packs, Intake Scaffolds & Conversion Funnel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ensureCreditsMock.mockResolvedValue(true)
    chargeCreditsMock.mockResolvedValue(undefined)
    sendEmailMock.mockResolvedValue({ ok: true, id: 'email-1' })
  })

  it('mints a separate guest comment-only token and blocks guests (403) from revising, running AR, or purchasing packs', async () => {
    generateImageMock.mockResolvedValue('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB')
    uploadBlobMock.mockResolvedValue('https://blob.example/beat-1.png')
    generateTextMock.mockResolvedValue({
      text: JSON.stringify({
        summary: 'Strong emotional foundation.',
        strengths: ['Clear story arc'],
        recommendations: [],
      }),
    })
    createSessionMock.mockImplementation(async (row: Record<string, unknown>) => ({
      id: 'sess-primary-1',
      ...row,
    }))

    const provisioned = await provisionAutomatedBlueprintShareFromIntake({
      ownerUserId: 'producer-1',
      projectId: 'proj-1',
      variantId: 'var-1',
      treatment: {
        id: 'var-1',
        title: 'Life of Arthur',
        beats: [{ title: '1. Roots', synopsis: 'Childhood in Ohio.' }],
      },
      locale: 'en',
      customerName: 'Clara Vance',
      customerEmail: 'clara@example.com',
      brandProfileSnapshot: { brandName: 'Legacy Studio' },
      origin: 'https://sceneflowai.studio',
    })

    expect(provisioned.guestShareToken).toBeTruthy()
    expect(provisioned.guestShareToken).not.toBe(provisioned.shareToken)
    expect(provisioned.guestShareUrl).toContain(`/blueprint/share/${provisioned.guestShareToken}`)

    // Mock DB returning null on primary token lookup and matching session on guest token lookup
    const guestSession = {
      id: 'sess-primary-1',
      owner_user_id: 'producer-1',
      project_id: 'proj-1',
      token: provisioned.shareToken,
      status: 'active',
      expires_at: null,
      payload: {
        type: 'blueprint',
        projectId: 'proj-1',
        variantId: 'var-1',
        treatment: provisioned.treatment,
        shareSettings: {
          clientMode: true,
          clientAutoReviseMode: true,
          guestShareToken: provisioned.guestShareToken,
          maxFeedbackRounds: 4,
          roundsUsed: 0,
          maxArIterations: 3,
          arIterationsUsed: 1,
        },
      },
    }

    findOneSessionMock.mockImplementation(async (query: { where?: { token?: string } }) => {
      if (query?.where?.token === provisioned.guestShareToken) return null
      return guestSession
    })

    const guestClarify = await clarifyCustomerBlueprintFeedback({
      token: provisioned.guestShareToken,
      rawFeedback: 'Change chapter 1',
    })
    expect(guestClarify.ok).toBe(false)
    if (!guestClarify.ok) {
      expect(guestClarify.status).toBe(403)
      expect(guestClarify.error).toContain('GUEST_READ_ONLY')
    }

    const guestApply = await applyConfirmedCustomerBlueprintRevision({
      token: provisioned.guestShareToken,
      confirmedIntent: 'Force apply',
    })
    expect(guestApply.ok).toBe(false)
    if (!guestApply.ok) expect(guestApply.status).toBe(403)

    const guestAr = await runStandaloneCustomerArIteration({
      token: provisioned.guestShareToken,
    })
    expect(guestAr.ok).toBe(false)
    if (!guestAr.ok) expect(guestAr.status).toBe(403)

    const guestPack = await grantBlueprintIterationPack({
      token: provisioned.guestShareToken,
    })
    expect(guestPack.ok).toBe(false)
    if (!guestPack.ok) expect(guestPack.status).toBe(403)
  })

  it('lets primary customer triage & filter family comments, bundle AR suggestions, and unlock extra iteration packs', async () => {
    let storedPayload: Record<string, any> = {
      type: 'blueprint',
      projectId: 'proj-triage',
      variantId: 'var-1',
      treatment: {
        id: 'var-1',
        title: 'The Miller Memoir',
        logline: 'A family story.',
        beats: [{ title: '1. Youth', synopsis: 'Growing up.' }],
      },
      blueprintAudienceResonance: {
        analysis: {
          overallScore: 86,
          recommendations: [
            {
              id: 'ar-rec-1',
              title: 'Add Sports Turning Point',
              text: 'Highlight the championship season to deepen character grit.',
              priority: 'medium',
              fixSection: 'beats',
            },
          ],
        },
      },
      appliedFeedbackIds: [],
      dismissedFeedbackIds: [],
      shareSettings: {
        clientMode: true,
        clientAutoReviseMode: true,
        guestShareToken: 'guest_tok_12345678',
        maxFeedbackRounds: 4,
        roundsUsed: 3,
        maxArIterations: 3,
        arIterationsUsed: 1,
        customerName: 'Brian',
        customerEmail: 'brian@example.com',
        brandProfileSnapshot: { brandName: 'Memoir Craft' },
      },
    }

    findOneSessionMock.mockImplementation(async () => ({
      id: 'sess-triage',
      owner_user_id: 'prod-1',
      project_id: 'proj-triage',
      token: 'primary_tok_12345678',
      status: 'active',
      expires_at: null,
      payload: storedPayload,
    }))
    updateSessionStaticMock.mockImplementation(async (vals: { payload?: Record<string, any> }) => {
      if (vals?.payload) storedPayload = vals.payload
      return [1]
    })
    const projectUpdateMock = vi.fn().mockResolvedValue(undefined)
    findByPkProjectMock.mockResolvedValue({
      id: 'proj-triage',
      title: 'The Miller Memoir',
      description: 'A family story.',
      metadata: { clientOrder: { isClientProject: true, blueprintDepositUsd: 29 } },
      update: projectUpdateMock,
    })

    findAllFeedbackMock.mockResolvedValue([
      {
        id: 'fb-mom',
        reviewerName: 'Aunt Maria',
        overallScore: 5,
        sections: null,
        freeformNotes: 'Please include the 1998 Chicago wedding and Uncle Marcus!',
        createdAt: new Date('2026-11-22T10:00:00Z'),
      },
      {
        id: 'fb-cousin',
        reviewerName: 'Cousin Pete',
        overallScore: 4,
        sections: null,
        freeformNotes: 'Make the whole thing a musical.',
        createdAt: new Date('2026-11-22T11:00:00Z'),
      },
    ])

    // 1. Primary customer sees both pending family comments
    const listed = await listGuestBlueprintFeedbackForPrimaryCustomer({
      token: 'primary_tok_12345678',
    })
    expect(listed.ok).toBe(true)
    if (listed.ok) {
      expect(listed.items).toHaveLength(2)
      expect(listed.items.every((i) => i.status === 'pending')).toBe(true)
    }

    // 2. Primary customer dismisses Cousin Pete's musical suggestion
    const dismissed = await dismissGuestBlueprintFeedback({
      token: 'primary_tok_12345678',
      feedbackId: 'fb-cousin',
    })
    expect(dismissed.ok).toBe(true)
    expect(storedPayload.dismissedFeedbackIds).toContain('fb-cousin')

    // 3. Primary customer approves Aunt Maria's note + AR recommendation in 1 unified clarification (even with empty freeform text)
    generateTextMock.mockResolvedValueOnce({
      text: JSON.stringify({
        clarifiedSummary: 'Add the 1998 Chicago wedding with Uncle Marcus and the championship season beat.',
        proposedChanges: [
          'Add 1998 Chicago wedding beat featuring Uncle Marcus',
          'Add college championship season turning point',
        ],
        targetSections: ['beats', 'characters'],
      }),
    })

    const clarified = await clarifyCustomerBlueprintFeedback({
      token: 'primary_tok_12345678',
      rawFeedback: '',
      selectedFeedbackIds: ['fb-mom'],
      selectedRecommendationIds: ['ar-rec-1'],
    })
    expect(clarified.ok).toBe(true)
    if (clarified.ok) {
      expect(clarified.clarification.selectedFeedbackIds).toEqual(['fb-mom'])
      expect(clarified.clarification.selectedRecommendationIds).toEqual(['ar-rec-1'])
    }

    // 4. Apply revision -> marks fb-mom as applied, increments roundsUsed to 4
    executeGuidedReviseMock.mockResolvedValueOnce({
      patch: {
        beats: [
          { title: '1. Youth', synopsis: 'Growing up.' },
          { title: '2. Championship Season', synopsis: 'College baseball triumph.' },
          { title: '3. 1998 Chicago Wedding', synopsis: 'Uncle Marcus gives a heartfelt toast.' },
        ],
      },
      diff: [],
      changePlan: {
        primaryGoal: 'Add wedding and sports',
        sectionsToUpdate: ['beats'],
        crossSectionDependencies: [],
        preserveConstraints: [],
        coherenceActions: [],
      },
      incompleteBalance: false,
    })
    generateImageMock.mockResolvedValue('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB')
    uploadBlobMock.mockResolvedValue('https://blob.example/new-beat.png')
    generateTextMock.mockResolvedValueOnce({
      text: JSON.stringify({ summary: 'Elevated to 95/100.', strengths: ['Rich life milestones'], recommendations: [] }),
    })

    const applied = await applyConfirmedCustomerBlueprintRevision({
      token: 'primary_tok_12345678',
      locale: 'en',
    })
    expect(applied.ok).toBe(true)
    expect(storedPayload.appliedFeedbackIds).toContain('fb-mom')
    expect(storedPayload.shareSettings.roundsUsed).toBe(4)

    // 5. Self-serve Iteration Pack unlocks +3 revisions & +2 AR passes and records $19 add-on revenue
    const pack = await grantBlueprintIterationPack({
      token: 'primary_tok_12345678',
      source: 'client_self_serve',
    })
    expect(pack.ok).toBe(true)
    if (pack.ok) {
      expect(pack.maxFeedbackRounds).toBe(4 + DEFAULT_ITERATION_PACK_REVISIONS)
      expect(pack.maxArIterations).toBe(3 + DEFAULT_ITERATION_PACK_AR_PASSES)
      expect(pack.extraIterationPacksPurchased).toBe(1)
      expect(pack.extraIterationRevenueUsd).toBe(DEFAULT_ITERATION_PACK_PRICE_USD)
    }
  })

  it('provides vertical memory-jogger coverage chips and non-fiction anti-fictionalization synthesis guardrails', () => {
    const memoirChips = getCoverageTopicsForNarrativeMode('biographical_memoir')
    expect(memoirChips.map((c) => c.id)).toEqual(
      expect.arrayContaining(['sports_passions', 'career_promotions', 'love_marriage', 'family_children'])
    )

    const nextQPrompt = buildNextIntakeQuestionPrompt({
      vertical: 'video_memoir',
      locale: 'en',
      brandName: 'Legacy Studio',
      turns: [{ role: 'customer', content: 'Tell my dad story.' , createdAt: '2026-11-22T00:00:00Z' }],
      customerTurnNumber: 1,
      maxCustomerTurns: 10,
      selectedCoverageTopics: ['love_marriage', 'career_promotions'],
    })
    expect(nextQPrompt).toContain('CLIENT-SELECTED PILLARS / CHAPTERS TO COVER')
    expect(nextQPrompt).toContain('Love & Marriage')
    expect(nextQPrompt).toContain('Career & Promotions')

    const memoirSynthesis = buildIntakeBlueprintSynthesisPrompt({
      vertical: 'video_memoir',
      locale: 'en',
      customerName: 'Brian',
      turns: [{ role: 'customer', content: 'Quick memoir summary.', createdAt: '2026-11-22T00:00:00Z' }],
      confirmedVision: {
        rawInput: 'Family memoir',
        clarifiedVision: 'A warm celebration-of-life memoir.',
        narrativeMode: 'biographical_memoir',
        intendedImpact: 'Honor family roots',
        targetAudience: 'Family',
        toneAndStyle: 'Warm documentary',
        assistantMessage: 'Confirmed',
        readyToConfirm: true,
        revisionCount: 1,
        maxRevisions: 3,
        confirmed: true,
        turns: [],
      },
    })
    expect(memoirSynthesis).toContain('STRICT ANTI-FICTIONALIZATION')

    const fictionSynthesis = buildIntakeBlueprintSynthesisPrompt({
      vertical: 'custom_production',
      locale: 'en',
      customerName: 'Alex',
      turns: [{ role: 'customer', content: 'A sci-fi heist on Mars.', createdAt: '2026-11-22T00:00:00Z' }],
      confirmedVision: {
        rawInput: 'Sci-fi heist',
        clarifiedVision: 'A high-stakes sci-fi thriller on Mars.',
        narrativeMode: 'fictional_narrative',
        intendedImpact: 'Thrill audiences',
        targetAudience: 'Sci-fi fans',
        toneAndStyle: 'Neo-noir',
        assistantMessage: 'Confirmed',
        readyToConfirm: true,
        revisionCount: 1,
        maxRevisions: 3,
        confirmed: true,
        turns: [],
      },
    })
    expect(fictionSynthesis).not.toContain('STRICT ANTI-FICTIONALIZATION')
  })

  it('tracks Blueprint Pass revenue, classifies Blueprint Conversion Funnel urgency, and excludes pre-approval leads from PM unassigned alerts', () => {
    const now = new Date('2026-11-23T12:00:00.000Z')
    const projects: AgencyProjectInput[] = [
      {
        id: 'bp-approved',
        title: 'Approved Memoir',
        status: 'in_progress',
        currentStep: 'ideation',
        updatedAt: '2026-11-23T10:00:00.000Z',
        metadata: {
          clientOrder: {
            isClientProject: true,
            stage: 'blueprint_approved',
            actionState: 'action_required',
            customerName: 'Elena',
            customerEmail: 'elena@example.com',
            blueprintDepositUsd: 29,
            extraIterationRevenueUsd: 19,
            blueprintRoundsUsed: 3,
            maxBlueprintRevisions: 7,
          },
        },
      },
      {
        id: 'bp-exhausted',
        title: 'Heavy Iterator Brand Film',
        status: 'in_progress',
        currentStep: 'ideation',
        updatedAt: '2026-11-23T08:00:00.000Z',
        metadata: {
          clientOrder: {
            isClientProject: true,
            stage: 'blueprint_client_iteration',
            actionState: 'waiting_on_client',
            customerName: 'Devon',
            customerEmail: 'devon@example.com',
            blueprintDepositUsd: 29,
            blueprintRoundsUsed: 4,
            maxBlueprintRevisions: 4,
            guestFeedbackCount: 3,
          },
        },
      },
      {
        id: 'bp-stale-7d',
        title: 'Stalled Family Tribute',
        status: 'in_progress',
        currentStep: 'ideation',
        updatedAt: '2026-11-12T12:00:00.000Z',
        metadata: {
          clientOrder: {
            isClientProject: true,
            stage: 'blueprint_client_iteration',
            actionState: 'waiting_on_client',
            customerName: 'Marcus',
            customerEmail: 'marcus@example.com',
            blueprintDepositUsd: 29,
            lastClientActivityAt: '2026-11-12T12:00:00.000Z',
          },
        },
      },
    ]

    expect(getClientOrderRevenueUsd(projects[0]!.metadata!.clientOrder)).toBe(48)
    expect(resolveKanbanStage(projects[1]!)).toBe('blueprint')

    const funnel = buildBlueprintFunnel(projects, now)
    expect(funnel.totalSelfServeCount).toBe(3)
    expect(funnel.approvedReadyToQuoteCount).toBe(1)
    expect(funnel.roundsExhaustedCount).toBe(1)
    expect(funnel.stale7dCount).toBe(1)
    expect(funnel.automatedBlueprintRevenueUsd).toBe(106)
    expect(funnel.items.map((i) => i.bucket)).toEqual([
      'approved_ready_to_quote',
      'rounds_exhausted',
      'stale_7d',
    ])

    // Self-serve pre-approval Blueprint Passes (bp-exhausted, bp-stale-7d) do NOT trigger unassigned PM alarms;
    // ONLY approved project (bp-approved) counts as needing a PM!
    const scorecard = buildPmScorecard({
      members: [],
      projects,
      projectAssignments: [],
      seriesAssignments: [],
      now,
    })
    expect(scorecard.unassignedActiveCount).toBe(1)
  })

  it('enforces role boundaries & funnel wiring across API routes and UI components', () => {
    const root = process.cwd()
    const approveSrc = readFileSync(
      path.join(root, 'src/app/api/blueprint/share/[token]/approve/route.ts'),
      'utf8'
    )
    expect(approveSrc).toContain("accessRole === 'guest_reviewer'")
    expect(approveSrc).toContain('autoAssignProjectByLocale')

    const feedbackSrc = readFileSync(
      path.join(root, 'src/app/api/blueprint/share/[token]/feedback/route.ts'),
      'utf8'
    )
    expect(feedbackSrc).toContain('isSelfServeClientTriage')
    expect(feedbackSrc).toContain('notifyPrimaryCustomerOfGuestFeedback')

    const clientsPageSrc = readFileSync(
      path.join(root, 'src/app/dashboard/clients/page.tsx'),
      'utf8'
    )
    expect(clientsPageSrc).toContain('Blueprint Funnel')
    expect(clientsPageSrc).toContain('/api/producer/ops/blueprint-nudge')
  })
})
