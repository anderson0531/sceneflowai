import { describe, it, expect, vi, beforeEach } from 'vitest'

const createSessionMock = vi.fn()
const findOneSessionMock = vi.fn()
const createProjectMock = vi.fn()
const findByPkProjectMock = vi.fn()
const getProducerProfileMock = vi.fn()
const getConsentMock = vi.fn()
const ensureCreditsMock = vi.fn()
const chargeCreditsMock = vi.fn()
const generateTextMock = vi.fn()
const notifyUserMock = vi.fn()
const userIncrementMock = vi.fn()

vi.mock('@/lib/database/migrateProducerPlatform', () => ({
  ensureProducerPlatformSchema: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/models/CollabSession', () => ({
  default: {
    create: (...args: unknown[]) => createSessionMock(...args),
    findOne: (...args: unknown[]) => findOneSessionMock(...args),
  },
}))

vi.mock('@/models/Project', () => ({
  default: {
    create: (...args: unknown[]) => createProjectMock(...args),
    findByPk: (...args: unknown[]) => findByPkProjectMock(...args),
  },
}))

vi.mock('@/models/User', () => ({
  default: {
    increment: (...args: unknown[]) => userIncrementMock(...args),
  },
}))

vi.mock('@/lib/producer/producerProfileService', () => ({
  getOrCreateProducerProfile: (...args: unknown[]) => getProducerProfileMock(...args),
  getLatestCustomerConsent: (...args: unknown[]) => getConsentMock(...args),
  toBrandProfileSnapshot: (p: any, fallback: string) => ({
    brandName: p?.brand_name || fallback,
    hideSceneFlowBranding: Boolean(p?.hide_sceneflow_branding),
  }),
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
  generateImageWithGemini: vi.fn().mockResolvedValue('data:image/png;base64,iVBORw0KGgo='),
}))

vi.mock('@/lib/storage/blob', () => ({
  uploadImageToBlob: vi.fn().mockResolvedValue('https://blob.vercel-storage.com/beat-still.png'),
}))

vi.mock('@/lib/email/resendClient', () => ({
  getAppBaseUrl: () => 'https://sceneflowai.studio',
  getBrandBadgeUrl: () => 'https://sceneflowai.studio/brand/sf-badge.png',
  sendEmail: vi.fn().mockResolvedValue({ from: 'SceneFlow Studio <support@sceneflowai.studio>', usedFallback: false }),
}))

vi.mock('@/lib/tts/geminiFlashTts', () => ({
  DEFAULT_BLUEPRINT_GEMINI_VOICE: 'Kore',
  isGeminiTtsConfigured: () => false,
}))

vi.mock('@/lib/jobs/jobService', () => ({
  notifyUser: (...args: unknown[]) => notifyUserMock(...args),
}))

import {
  createClientIntakeLink,
  clarifyCustomerIntakeVision,
  confirmCustomerIntakeVision,
  reopenCustomerIntakeVision,
  submitCustomerIntakeTurn,
  completeClientIntakeToBlueprint,
} from '@/lib/intake/intakeService'
import { INTAKE_PLAYBOOKS } from '@/lib/intake/intakePlaybooks'

describe('Embeddable Client Intake Interview, Consent Shield & Blueprint Synthesis', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('requires Commercial Producer Addendum acceptance before creating an intake link', async () => {
    getProducerProfileMock.mockResolvedValue({
      id: 'prof-1',
      commercial_addendum_accepted_at: null,
    })

    await expect(
      createClientIntakeLink({
        ownerUserId: 'producer-1',
        vertical: 'video_memoir',
        origin: 'https://sceneflowai.studio',
      })
    ).rejects.toThrow(/COMMERCIAL_ADDENDUM_REQUIRED/)
  })

  it('creates a hosted URL and iframe embed snippet once Commercial Addendum is active', async () => {
    getProducerProfileMock.mockResolvedValue({
      id: 'prof-1',
      brand_name: 'Legacy Films Co',
      hide_sceneflow_branding: true,
      default_max_rounds: 2,
      commercial_addendum_accepted_at: new Date(),
    })
    createProjectMock.mockResolvedValue({ id: 'proj-draft-1' })
    createSessionMock.mockResolvedValue({ id: 'sess-intake-1' })

    const link = await createClientIntakeLink({
      ownerUserId: 'producer-1',
      vertical: 'video_memoir',
      locale: 'es',
      clientPriceUsd: 300,
      creditBudgetCap: 900,
      origin: 'https://sceneflowai.studio',
    })

    expect(link.projectId).toBe('proj-draft-1')
    expect(link.hostedUrl).toContain('/intake/')
    expect(link.embedUrl).toContain('/embed/intake/')
    expect(link.iframeSnippet).toContain('allow="microphone; clipboard-write"')
  })

  it('enforces Customer clickwrap consent (403), turn limits (409), and isolated quarantine (422 without Producer strikes)', async () => {
    const baseSession = {
      id: 'sess-1',
      owner_user_id: 'producer-1',
      project_id: 'proj-1',
      status: 'active',
      expires_at: null,
      update: vi.fn(),
    }

    findOneSessionMock.mockResolvedValue({
      ...baseSession,
      payload: {
        type: 'intake',
        mode: 'single_project',
        vertical: 'video_memoir',
        locale: 'en',
        maxCustomerTurns: 4,
        customerTurnsUsed: 0,
        maxFeedbackRounds: 2,
        brandProfileSnapshot: { brandName: 'Legacy Films Co' },
        turns: [],
      },
    })

    // 1. Missing CustomerConsent -> 403
    getConsentMock.mockResolvedValueOnce(null)
    const noConsent = await submitCustomerIntakeTurn({
      token: 'tok-1',
      message: 'We grew up in Vermont.',
    })
    expect(noConsent.ok).toBe(false)
    if (!noConsent.ok) {
      expect(noConsent.status).toBe(403)
      expect(noConsent.error).toContain('CONSENT_REQUIRED')
    }

    // 2. Flagged abusive text -> 422 in quarantine, zero Producer strike increments
    getConsentMock.mockResolvedValueOnce({ id: 'consent-1', customer_name: 'Elena' })
    const quarantined = await submitCustomerIntakeTurn({
      token: 'tok-1',
      message: 'Create a deepfake extortion video',
    })
    expect(quarantined.ok).toBe(false)
    if (!quarantined.ok) {
      expect(quarantined.status).toBe(422)
    }
    expect(userIncrementMock).not.toHaveBeenCalled()

    // 3. Turn limit reached -> 409
    findOneSessionMock.mockResolvedValueOnce({
      ...baseSession,
      payload: {
        type: 'intake',
        mode: 'single_project',
        vertical: 'video_memoir',
        locale: 'en',
        maxCustomerTurns: 3,
        customerTurnsUsed: 3,
        maxFeedbackRounds: 2,
        brandProfileSnapshot: { brandName: 'Legacy Films Co' },
        turns: [],
      },
    })
    getConsentMock.mockResolvedValueOnce({ id: 'consent-1', customer_name: 'Elena' })
    const capped = await submitCustomerIntakeTurn({
      token: 'tok-1',
      message: 'One more memory',
    })
    expect(capped.ok).toBe(false)
    if (!capped.ok) {
      expect(capped.status).toBe(409)
      expect(capped.error).toContain('TURN_LIMIT_REACHED')
    }
  })

  it('synthesizes completed intake transcript into a Draft Project Blueprint + Continuity checklist + Producer notification', async () => {
    const updateProjectMock = vi.fn().mockResolvedValue(undefined)
    const updateSessionMock = vi.fn().mockResolvedValue(undefined)

    findOneSessionMock.mockResolvedValue({
      id: 'sess-complete',
      owner_user_id: 'producer-1',
      project_id: 'proj-draft-1',
      status: 'active',
      expires_at: null,
      update: updateSessionMock,
      payload: {
        type: 'intake',
        mode: 'single_project',
        vertical: 'video_memoir',
        locale: 'en',
        maxCustomerTurns: 6,
        customerTurnsUsed: 2,
        maxFeedbackRounds: 2,
        brandProfileSnapshot: { brandName: 'Legacy Films Co' },
        turns: [
          { role: 'assistant', content: 'Welcome!', createdAt: new Date().toISOString() },
          {
            role: 'customer',
            content: 'My parents Arthur and Clara opened Harbor Books in Seattle in 1974.',
            createdAt: new Date().toISOString(),
          },
        ],
      },
    })
    getConsentMock.mockResolvedValue({
      id: 'consent-9',
      customer_name: 'Elena Vance',
      customer_email: 'elena@example.com',
    })
    ensureCreditsMock.mockResolvedValue(true)
    chargeCreditsMock.mockResolvedValue(undefined)
    findByPkProjectMock.mockResolvedValue({
      id: 'proj-draft-1',
      user_id: 'producer-1',
      title: 'Draft Client Order',
      description: '',
      metadata: { clientOrder: { isClientProject: true } },
      update: updateProjectMock,
    })
    generateTextMock.mockResolvedValue({
      text: JSON.stringify({
        title: 'Harbor Books: Arthur & Clara',
        logline: 'A 50-year family memoir of love and independent bookselling in Seattle.',
        synopsis: 'Arthur and Clara founded Harbor Books in 1974 and raised three children.',
        genre: 'Documentary / Memoir',
        tone: 'Warm, nostalgic, cinematic',
        visualStyle: 'Warm archival documentary with golden-hour Seattle harbor reenactments',
        characters: [
          { name: 'Arthur Vance', role: 'protagonist', description: 'Co-founder, warm storyteller' },
          { name: 'Clara Vance', role: 'protagonist', description: 'Co-founder, avid curator' },
        ],
        locations: [{ name: 'Harbor Books Storefront', description: '1974 brick bookshop by Pike Place' }],
        props: [{ name: 'Brass Cash Register', description: 'Original 1974 counter register' }],
        beats: [
          {
            title: 'Opening the Doors (1974)',
            summary: 'Arthur and Clara unlock Harbor Books on a rainy Seattle morning.',
            durationSeconds: 180,
          },
        ],
      }),
    })

    const completed = await completeClientIntakeToBlueprint({ token: 'tok-complete' })
    expect(completed.ok).toBe(true)
    if (completed.ok) {
      expect(completed.projectId).toBe('proj-draft-1')
      expect(typeof completed.blueprintShareToken).toBe('string')
      expect(completed.blueprintShareUrl).toContain('/blueprint/share/')
    }

    expect(updateProjectMock).toHaveBeenCalledTimes(1)
    const savedArgs = updateProjectMock.mock.calls[0][0]
    expect(savedArgs.title).toBe('Harbor Books: Arthur & Clara')
    expect(savedArgs.metadata.clientOrder.stage).toBe('blueprint_client_iteration')
    expect(savedArgs.metadata.clientOrder.actionState).toBe('waiting_on_client')
    expect(savedArgs.metadata.clientOrder.blueprintShareUrl).toContain('/blueprint/share/')
    expect(savedArgs.metadata.clientOrder.continuityChecklist.characters).toHaveLength(2)
    expect(notifyUserMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'producer-1',
        projectId: 'proj-draft-1',
        type: 'client_intake_submitted',
      })
    )
  })

  it('opens video_memoir intake with a story-first ("tell me your story") invitation across all 14 locales', () => {
    const locales = ['en', 'es', 'pt', 'hi', 'zh-CN', 'ar', 'th', 'ja', 'ko', 'de', 'fr', 'it', 'nl', 'ru'] as const
    for (const locale of locales) {
      const greeting = INTAKE_PLAYBOOKS.video_memoir.welcomeByLocale[locale]
      expect(typeof greeting).toBe('string')
      expect(greeting.trim().length).toBeGreaterThan(40)
    }
    expect(INTAKE_PLAYBOOKS.video_memoir.welcomeByLocale.en.toLowerCase()).toContain(
      'tell me your story'
    )
  })

  it('extracts resonatingBeats during customer turns while filtering group names into individual keyCharacters', async () => {
    const updateSessionMock = vi.fn().mockResolvedValue(undefined)
    findOneSessionMock.mockResolvedValue({
      id: 'sess-beats-1',
      owner_user_id: 'producer-1',
      project_id: 'proj-beats-1',
      status: 'active',
      expires_at: null,
      update: updateSessionMock,
      payload: {
        type: 'intake',
        mode: 'single_project',
        vertical: 'video_memoir',
        locale: 'en',
        maxCustomerTurns: 6,
        customerTurnsUsed: 0,
        maxFeedbackRounds: 2,
        brandProfileSnapshot: { brandName: 'Legacy Films Co' },
        turns: [
          {
            role: 'assistant',
            content: INTAKE_PLAYBOOKS.video_memoir.welcomeByLocale.en,
            createdAt: new Date().toISOString(),
          },
        ],
      },
    })
    getConsentMock.mockResolvedValue({ id: 'consent-beats', customer_name: 'John Miller' })
    ensureCreditsMock.mockResolvedValue(true)
    chargeCreditsMock.mockResolvedValue(undefined)
    generateTextMock.mockResolvedValue({
      text: JSON.stringify({
        reply:
          'What a vivid arc from the 1978 Ohio shipyard to opening your workshop at 32. Who was the single mentor beside you on that first shift at age 16?',
        readyToComplete: false,
        resonatingBeats: [
          {
            title: '1. First Spark at the Lorain Shipyard',
            eraOrAge: '1978 • Age 16',
            summary: 'Sixteen-year-old John learns welding beside his uncle Frank.',
            keyCharacters: ['John Miller (Age 16)', 'Frank Miller', "John's Friends", 'Factory Workers'],
          },
          {
            title: '2. Opening the Foundry Doors',
            eraOrAge: '1994 • Age 32',
            summary: 'John and Claire mortgage their starter home to open Miller Ironworks.',
            keyCharacters: ['John & Claire Miller', 'The Neighbors'],
          },
        ],
      }),
    })

    // Also verify long life-story descriptions (> 4,000 chars) are accepted cleanly
    const detailedLifeStory = `${'In 1978 when I was 16 in Lorain, Ohio, Uncle Frank taught me to weld. '.repeat(70)}`
    expect(detailedLifeStory.length).toBeGreaterThan(4500)

    const turnResult = await submitCustomerIntakeTurn({
      token: 'tok-beats-1',
      message: detailedLifeStory,
    })

    expect(turnResult.ok).toBe(true)
    if (turnResult.ok) {
      expect(turnResult.resonatingBeats).toHaveLength(2)
      expect(turnResult.resonatingBeats[0].eraOrAge).toBe('1978 • Age 16')
      expect(turnResult.resonatingBeats[0].keyCharacters).toEqual([
        'John Miller (Age 16)',
        'Frank Miller',
      ])
      expect(turnResult.resonatingBeats[1].keyCharacters).toEqual([
        'John Miller',
        'Claire Miller',
      ])
    }
  })

  it('splits multi-age memoir characters into separate (Age NN) continuity cards and strips group entries on Blueprint completion', async () => {
    const updateProjectMock = vi.fn().mockResolvedValue(undefined)
    const updateSessionMock = vi.fn().mockResolvedValue(undefined)

    findOneSessionMock.mockResolvedValue({
      id: 'sess-multi-age',
      owner_user_id: 'producer-1',
      project_id: 'proj-multi-age',
      status: 'active',
      expires_at: null,
      update: updateSessionMock,
      payload: {
        type: 'intake',
        mode: 'single_project',
        vertical: 'video_memoir',
        locale: 'en',
        maxCustomerTurns: 6,
        customerTurnsUsed: 3,
        maxFeedbackRounds: 2,
        brandProfileSnapshot: { brandName: 'Legacy Films Co' },
        turns: [
          { role: 'assistant', content: 'Tell me your story.', createdAt: new Date().toISOString() },
          {
            role: 'customer',
            content:
              'John Miller started working at 16, opened his studio at 32, and retired at 62 handing the keys to his daughter Sarah.',
            createdAt: new Date().toISOString(),
          },
        ],
      },
    })
    getConsentMock.mockResolvedValue({
      id: 'consent-ma',
      customer_name: 'Sarah Miller',
      customer_email: 'sarah@example.com',
    })
    ensureCreditsMock.mockResolvedValue(true)
    chargeCreditsMock.mockResolvedValue(undefined)
    findByPkProjectMock.mockResolvedValue({
      id: 'proj-multi-age',
      user_id: 'producer-1',
      title: 'Draft Memoir',
      description: '',
      metadata: { clientOrder: { isClientProject: true } },
      update: updateProjectMock,
    })
    generateTextMock.mockResolvedValue({
      text: JSON.stringify({
        title: 'The Iron & Cedar Years',
        logline: 'Three chapters of John Miller’s craft from apprentice to patriarch.',
        synopsis: 'Spanning 1978, 1994, and 2024, John Miller builds a family workshop.',
        genre: 'Documentary / Memoir',
        tone: 'Warm, grounded, reflective',
        visualStyle: 'Kodak 16mm archival warmth transitioning to crisp contemporary cinema',
        characters: [
          {
            name: 'John Miller',
            role: 'protagonist',
            age: '16, 32, 62',
            ethnicity: 'Irish-American',
            description: 'Master metalworker seen at age 16, age 32, and age 62.',
            appearance: 'Hazel eyes, silver hair, weathered workshop apron.',
          },
          {
            name: 'Sarah Miller (Age 28)',
            role: 'supporting',
            age: '28',
            ethnicity: 'Irish-American',
            description: 'John’s daughter taking over the studio.',
          },
          {
            name: "John's Friends",
            role: 'supporting',
            description: 'A group of childhood friends from Lorain.',
          },
        ],
        locations: [{ name: 'Miller Ironworks', description: 'Brick riverside foundry' }],
        props: [{ name: 'Brass Calipers', description: '1978 apprentice calipers' }],
        beats: [
          {
            title: '1. Apprentice Sparks',
            eraOrAge: '1978 • Age 16',
            summary: 'John at age 16 learns his first weld.',
            characters: ['John Miller', "John's Friends"],
            durationSeconds: 180,
          },
          {
            title: '2. Raising the Sign',
            eraOrAge: '1994 • Age 32',
            summary: 'At age 32, John opens Miller Ironworks.',
            characters: ['John Miller'],
            durationSeconds: 180,
          },
          {
            title: '3. Passing the Torch',
            eraOrAge: '2024 • Age 62',
            summary: 'John at age 62 hands the brass calipers to Sarah.',
            characters: ['John Miller', 'Sarah Miller (Age 28)'],
            durationSeconds: 180,
          },
        ],
      }),
    })

    const completed = await completeClientIntakeToBlueprint({ token: 'tok-multi-age' })
    expect(completed.ok).toBe(true)

    const savedArgs = updateProjectMock.mock.calls[0][0]
    const checklistChars = savedArgs.metadata.clientOrder.continuityChecklist.characters
    const charNames = checklistChars.map((c: { name: string }) => c.name)

    // Separate character entries per life stage, zero group characters!
    expect(charNames).toEqual([
      'John Miller (Age 16)',
      'John Miller (Age 32)',
      'John Miller (Age 62)',
      'Sarah Miller (Age 28)',
    ])

    const savedBeats = savedArgs.metadata.filmTreatmentVariant.beats
    expect(savedBeats[0].characters).toEqual(['John Miller (Age 16)'])
    expect(savedBeats[1].characters).toEqual(['John Miller (Age 32)'])
    expect(savedBeats[2].characters).toEqual(['John Miller (Age 62)', 'Sarah Miller (Age 28)'])
    // Also verify locations & props are mapped to scene_descriptions and prop_descriptions
    expect(savedArgs.metadata.filmTreatmentVariant.scene_descriptions).toHaveLength(1)
    expect(savedArgs.metadata.filmTreatmentVariant.prop_descriptions).toHaveLength(1)
  })

  it('clarifies, iterates up to 3 passes, confirms, and reopens Customer Vision Statement before starting the interview', async () => {
    let storedPayload: Record<string, any> = {
      type: 'intake',
      mode: 'single_project',
      vertical: 'brand_story',
      locale: 'en',
      phase: 'vision_clarification',
      maxVisionRevisions: 3,
      maxCustomerTurns: 10,
      customerTurnsUsed: 0,
      maxFeedbackRounds: 2,
      brandProfileSnapshot: { brandName: 'Apex Studio' },
      turns: [],
    }
    const updateSessionMock = vi.fn().mockImplementation(async (patch: any) => {
      if (patch?.payload) storedPayload = patch.payload
    })

    findOneSessionMock.mockImplementation(async () => ({
      id: 'sess-vision-1',
      owner_user_id: 'producer-1',
      project_id: 'proj-vision-1',
      status: 'active',
      expires_at: null,
      payload: storedPayload,
      update: updateSessionMock,
    }))
    getConsentMock.mockResolvedValue({ id: 'consent-v1', customer_name: 'Maya Lin' })
    ensureCreditsMock.mockResolvedValue(true)
    chargeCreditsMock.mockResolvedValue(undefined)

    // Pass 1: Clarify customer vision
    generateTextMock.mockResolvedValueOnce({
      text: JSON.stringify({
        clarifiedVision:
          'A 3-minute founder documentary tracing Solara Ceramics from Maya’s garage kiln to opening her Portland flagship.',
        intendedImpact: 'Inspire design-conscious buyers to trust handcrafted heritage.',
        targetAudience: 'Design-conscious homeowners and boutique hospitality buyers.',
        toneAndStyle: 'Warm tactile daylight cinematography with artisan studio sound.',
        openQuestionsToConfirm: ['Should we feature co-founder Leo Chen on camera?'],
      }),
    })

    const pass1 = await clarifyCustomerIntakeVision({
      token: 'tok-vision-1',
      message:
        'I want a founder story about how I started Solara Ceramics in my garage and opened our Portland studio.',
    })
    expect(pass1.ok).toBe(true)
    if (pass1.ok) {
      expect(pass1.visionProposal.revisionCount).toBe(1)
      expect(pass1.visionProposal.confirmed).toBe(false)
      expect(pass1.visionProposal.clarifiedVision).toContain('Solara Ceramics')
    }

    // Pass 2 & Pass 3 succeed, Pass 4 hits VISION_REVISION_LIMIT (409)
    for (let i = 2; i <= 3; i++) {
      generateTextMock.mockResolvedValueOnce({
        text: JSON.stringify({
          clarifiedVision: `Refined vision v${i}`,
          intendedImpact: 'Build lasting brand trust.',
          targetAudience: 'Homeowners',
          toneAndStyle: 'Warm documentary',
        }),
      })
      const p = await clarifyCustomerIntakeVision({
        token: 'tok-vision-1',
        message: `Include detail ${i}`,
      })
      expect(p.ok).toBe(true)
    }

    const pass4 = await clarifyCustomerIntakeVision({
      token: 'tok-vision-1',
      message: 'One too many revisions',
    })
    expect(pass4.ok).toBe(false)
    if (!pass4.ok) {
      expect(pass4.status).toBe(409)
      expect(pass4.error).toContain('VISION_REVISION_LIMIT')
    }

    // Confirm Vision -> locks visionProposal.confirmed=true, transitions phase='structured_interview', appends targeted kickoff question
    generateTextMock.mockResolvedValueOnce({
      text: JSON.stringify({
        openingQuestion:
          'Your vision is locked! Let’s map the key people first: besides you, who played a pivotal role in launching Solara Ceramics, and what was their impact?',
      }),
    })
    const confirmed = await confirmCustomerIntakeVision({ token: 'tok-vision-1' })
    expect(confirmed.ok).toBe(true)
    if (confirmed.ok) {
      expect(confirmed.phase).toBe('structured_interview')
      expect(confirmed.visionProposal.confirmed).toBe(true)
      expect(confirmed.turns).toHaveLength(1)
      expect(confirmed.turns[0].content).toContain('Solara Ceramics')
    }

    // Reopen Vision -> returns to vision_clarification while keeping turns intact
    const reopened = await reopenCustomerIntakeVision({ token: 'tok-vision-1' })
    expect(reopened.ok).toBe(true)
    if (reopened.ok) {
      expect(reopened.phase).toBe('vision_clarification')
      expect(reopened.visionProposal?.confirmed).toBe(false)
    }
  })

  it('tracks extractedCharacters (role + impact), beat impacts, and completenessChecklist during the interview', async () => {
    const updateSessionMock = vi.fn().mockResolvedValue(undefined)
    findOneSessionMock.mockResolvedValue({
      id: 'sess-comp-1',
      owner_user_id: 'producer-1',
      project_id: 'proj-comp-1',
      status: 'active',
      expires_at: null,
      update: updateSessionMock,
      payload: {
        type: 'intake',
        mode: 'single_project',
        vertical: 'brand_story',
        locale: 'en',
        phase: 'structured_interview',
        visionProposal: {
          rawInput: 'Founder story',
          clarifiedVision: 'Solara Ceramics founder documentary',
          intendedImpact: 'Inspire buyers',
          targetAudience: 'Design lovers',
          toneAndStyle: 'Warm documentary',
          deliverableScope: '~3 min production',
          assistantMessage: 'Confirmed',
          readyToConfirm: true,
          revisionCount: 1,
          maxRevisions: 3,
          confirmed: true,
          turns: [],
        },
        maxCustomerTurns: 10,
        customerTurnsUsed: 2,
        maxFeedbackRounds: 2,
        brandProfileSnapshot: { brandName: 'Apex Studio' },
        turns: [
          { role: 'assistant', content: 'Who are the key people?', createdAt: new Date().toISOString() },
        ],
      },
    })
    getConsentMock.mockResolvedValue({ id: 'consent-c1', customer_name: 'Maya Lin' })
    ensureCreditsMock.mockResolvedValue(true)
    chargeCreditsMock.mockResolvedValue(undefined)
    generateTextMock.mockResolvedValue({
      text: JSON.stringify({
        reply: 'Wonderful — we now have a complete cast and chapter arc ready to build your Blueprint!',
        readyToComplete: true,
        extractedCharacters: [
          {
            name: 'Maya Lin',
            role: 'Founder & Master Ceramist',
            impact: 'Risked her savings to build the first neighborhood kiln.',
          },
          {
            name: 'Leo Chen',
            role: 'Head Glaze Chemist',
            impact: 'Invented the signature Pacific ash glaze that saved the studio.',
          },
        ],
        resonatingBeats: [
          {
            title: '1. The Garage Kiln',
            summary: 'Maya fires her first 100 bowls through a winter blackout.',
            impact: 'Establishes grit and authentic craft.',
            keyCharacters: ['Maya Lin'],
          },
          {
            title: '2. The Ash Glaze Breakthrough',
            summary: 'Leo formulates the coastal ash glaze after 40 failed tests.',
            impact: 'Turning point that wins their first boutique hotel order.',
            keyCharacters: ['Maya Lin', 'Leo Chen'],
          },
          {
            title: '3. Opening Doors in Portland',
            summary: 'Community gathers as Solara opens its sunlit flagship workshop.',
            impact: 'Emotional payoff celebrating shared craftsmanship.',
            keyCharacters: ['Maya Lin', 'Leo Chen'],
          },
        ],
        completenessChecklist: {
          visionConfirmed: true,
          charactersComplete: true,
          beatsComplete: true,
          closingImpactComplete: true,
          completenessScore: 95,
          missingGaps: [],
        },
      }),
    })

    const turn = await submitCustomerIntakeTurn({
      token: 'tok-comp-1',
      message: 'Leo Chen is my glaze chemist; our three moments are the garage blackout, the ash glaze breakthrough, and opening day.',
    })
    expect(turn.ok).toBe(true)
    if (turn.ok) {
      expect(turn.readyToComplete).toBe(true)
      expect(turn.extractedCharacters).toHaveLength(2)
      expect(turn.extractedCharacters[0].impact).toContain('kiln')
      expect(turn.resonatingBeats).toHaveLength(3)
      expect(turn.resonatingBeats[1].impact).toContain('Turning point')
      expect(turn.completenessChecklist.charactersComplete).toBe(true)
      expect(turn.completenessChecklist.beatsComplete).toBe(true)
      expect(turn.completenessChecklist.closingImpactComplete).toBe(true)
    }
  })

  it('uses generous 16k maxOutputTokens on Blueprint synthesis and backfills truncated multi-era characters & locations', async () => {
    const updateProjectMock = vi.fn().mockResolvedValue(undefined)
    const updateSessionMock = vi.fn().mockResolvedValue(undefined)

    const interviewCharacters = [
      { id: 'c1', name: 'Mateo Morales (Age 12)', role: 'Protagonist', eraOrAge: '1958 (Age 12)', impact: 'Boyhood in Oaxaca' },
      { id: 'c2', name: 'Don Rafael Morales (Age 50)', role: 'Mentor', eraOrAge: '1958 (Age 50)', impact: 'Gifts cedar compass box' },
      { id: 'c3', name: 'Mateo Morales (Early Twenties)', role: 'Protagonist', eraOrAge: '1966', impact: 'San Diego boatyard arrival' },
      { id: 'c4', name: 'Hank Lindqvist (Age 58)', role: 'Mentor', eraOrAge: '1966', impact: 'Master shipwright' },
      { id: 'c5', name: 'Mateo Morales (Age 26-30)', role: 'Protagonist', eraOrAge: '1972-1976', impact: 'Founds Morales Marine Joinery' },
      { id: 'c6', name: 'Elena Ruiz Morales (Age 24-28)', role: 'Co-Founder & Spouse', eraOrAge: '1972-1976', impact: 'Heart of the shop' },
      { id: 'c7', name: 'Marco Morales (Baby)', role: 'Son', eraOrAge: '1976', impact: 'Firstborn child' },
      { id: 'c8', name: 'Mateo Morales (Age 45)', role: 'Protagonist', eraOrAge: '1991', impact: 'Rebuilds after shop fire' },
      { id: 'c9', name: 'Elena Ruiz Morales (Age 43)', role: 'Co-Founder & Spouse', eraOrAge: '1991', impact: 'Rallies harbor families' },
      { id: 'c10', name: 'Arthur Sato (Age 64)', role: 'Community Ally', eraOrAge: '1991', impact: 'Leads dawn harbor rebuild' },
      { id: 'c11', name: 'Marco Morales (Age 15)', role: 'Son', eraOrAge: '1991', impact: 'Helps rebuild workshop' },
      { id: 'c12', name: 'Mateo Morales (Age 80)', role: 'Protagonist / Honoree', eraOrAge: '2026', impact: 'Passes heirloom compass box' },
      { id: 'c13', name: 'Sofia Morales (Age 26)', role: 'Narrator & Granddaughter', eraOrAge: '2026', impact: 'Receives cedar compass box' },
      { id: 'c14', name: 'Marco Morales (Age 50)', role: 'Son', eraOrAge: '2026', impact: 'Toasts his father at 80' },
    ]

    findOneSessionMock.mockResolvedValue({
      id: 'sess-mateo',
      owner_user_id: 'producer-1',
      project_id: 'proj-mateo',
      status: 'active',
      expires_at: null,
      update: updateSessionMock,
      payload: {
        type: 'intake',
        mode: 'single_project',
        vertical: 'video_memoir',
        locale: 'en',
        maxCustomerTurns: 6,
        customerTurnsUsed: 3,
        maxFeedbackRounds: 2,
        brandProfileSnapshot: { brandName: 'Legacy Films Co' },
        visionProposal: {
          clarifiedVision: 'A warm 12-minute 80th birthday memoir for Mateo Morales.',
          intendedImpact: 'Celebrate resilience and intergenerational craft.',
          targetAudience: '45 family members at San Diego harbor dinner',
          toneAndStyle: '35mm Kodachrome + cinematic AI re-enactment',
          deliverableScope: '12 minutes',
          narrativeMode: 'biographical_memoir',
          confirmed: true,
        },
        extractedCharacters: interviewCharacters,
        turns: [
          { role: 'customer', content: 'Full 5-era Mateo Morales family story...', createdAt: new Date().toISOString() },
        ],
      },
    })
    getConsentMock.mockResolvedValue({
      id: 'consent-sofia',
      customer_name: 'Sofia Morales',
      customer_email: 'sofia@example.com',
    })
    ensureCreditsMock.mockResolvedValue(true)
    chargeCreditsMock.mockResolvedValue(undefined)
    findByPkProjectMock.mockResolvedValue({
      id: 'proj-mateo',
      user_id: 'producer-1',
      title: 'Mateo Tribute',
      description: '',
      metadata: { clientOrder: { isClientProject: true } },
      update: updateProjectMock,
    })

    // Simulate a response where characters 10-14 and locations were truncated out of character_descriptions,
    // while beats (earlier in JSON) + props survived or were partially recovered:
    generateTextMock.mockResolvedValue({
      finishReason: 'MAX_TOKENS',
      text: JSON.stringify({
        title: 'The Cedar Compass: Mateo Morales at 80',
        logline: 'Across seven decades from Oaxaca to San Diego, a master shipwright passes his scorched cedar compass box to the next generation.',
        synopsis: 'Five chapters spanning 1958 to 2026.',
        genre: 'Biographical Video Memoir',
        beats: [
          {
            title: '1. Oaxaca Storm & Cedar Box',
            eraOrAge: '1958 — Age 12',
            characters: ['Mateo Morales (Age 12)', 'Don Rafael Morales (Age 50)'],
            synopsis: 'At age 12, Mateo receives the hand-carved cedar compass box.',
            minutes: 2,
            settingHint: 'Puerto Ángel, Oaxaca Beachfront',
            deliveryFormat: 'ai_reenactment',
          },
          {
            title: '2. Shelter Island Tiller',
            eraOrAge: '1966 — Early Twenties',
            characters: ['Mateo Morales (Early Twenties)', 'Hank Lindqvist (Age 58)'],
            synopsis: 'Mateo in his early twenties earns his place at Harbor Boatyard.',
            minutes: 2,
            settingHint: 'Shelter Island Harbor Boatyard (1966)',
            deliveryFormat: 'ai_reenactment',
          },
          {
            title: '3. Fiesta, Marriage & Joinery',
            eraOrAge: '1972–1976 — Age 26-30',
            characters: ['Mateo Morales (Age 26-30)', 'Elena Ruiz Morales (Age 24-28)', 'Marco Morales (Baby)'],
            synopsis: 'Mateo and Elena marry and welcome baby Marco.',
            minutes: 3,
            settingHint: 'Morales Marine Joinery Workshop',
            deliveryFormat: 'archival_photo',
          },
          {
            title: '4. 1991 Fire & Dawn Rebuild',
            eraOrAge: '1991 — Age 45',
            characters: ['Mateo Morales (Age 45)', 'Elena Ruiz Morales (Age 43)', 'Arthur Sato (Age 64)', 'Marco Morales (Age 15)'],
            synopsis: 'Neighbors led by Arthur Sato help 45-year-old Mateo and 15-year-old Marco rebuild.',
            minutes: 3,
            settingHint: 'Charred Joinery & Dawn Dock',
            deliveryFormat: 'archival_photo',
          },
          {
            title: '5. 80th Birthday Harbor Blessing',
            eraOrAge: '2026 — Age 80',
            characters: ['Mateo Morales (Age 80)', 'Sofia Morales (Age 26)', 'Marco Morales (Age 50)'],
            synopsis: 'At his 80th birthday dinner, Mateo hands the scorched cedar compass box to Sofia.',
            minutes: 2,
            settingHint: 'San Diego Harbor Dining Room',
            deliveryFormat: 'archival_photo',
          },
        ],
        character_descriptions: [
          { name: 'Mateo Morales (Age 12)', role: 'protagonist', age: '12', ethnicity: 'Mexican (Oaxacan)', description: 'Boy in Oaxaca', needsClientPhoto: false },
          { name: 'Don Rafael Morales (Age 50)', role: 'supporting', age: '50', ethnicity: 'Mexican (Oaxacan)', description: 'Uncle', needsClientPhoto: false },
          { name: 'Mateo Morales (Early Twenties)', role: 'protagonist', ethnicity: 'Mexican (Oaxacan)', description: 'Young boatbuilder', needsClientPhoto: false },
          { name: 'Hank Lindqvist (Age 58)', role: 'supporting', age: '58', ethnicity: 'Scandinavian-American', description: 'Master shipwright', needsClientPhoto: false },
          { name: 'Mateo Morales (Age 26-30)', role: 'protagonist', ethnicity: 'Mexican (Oaxacan)', description: 'Shop founder', needsClientPhoto: true },
          { name: 'Elena Ruiz Morales (Age 24-28)', role: 'supporting', ethnicity: 'Mexican-American', description: 'Co-founder', needsClientPhoto: true },
          { name: 'Marco Morales (Baby)', role: 'supporting', ethnicity: 'Mexican-American', description: 'Infant son', needsClientPhoto: true },
          { name: 'Mateo Morales (Age 45)', role: 'protagonist', age: '45', ethnicity: 'Mexican (Oaxacan)', description: 'Midlife craftsman', needsClientPhoto: true },
          { name: 'Elena Ruiz Morales (Age 43)', role: 'supporting', age: '43', ethnicity: 'Mexican-American', description: 'Shop co-owner', needsClientPhoto: true },
          // Truncated right after #9!
        ],
        locations: [],
        props: [
          {
            name: 'Hand-Carved Scorched Cedar Compass Box',
            description: '1958 cedar compass box holding Elena’s 1972 embroidered handkerchief.',
            needsClientPhoto: true,
          },
        ],
      }),
    })

    const res = await completeClientIntakeToBlueprint({ token: 'tok-mateo' })
    expect(res.ok).toBe(true)

    // Verify 16,384 token budget + 512 thinking cap were passed to generateText
    expect(generateTextMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        maxOutputTokens: 16384,
        thinkingBudget: 512,
      })
    )

    if (res.ok) {
      const charNames = res.extracted.character_descriptions.map((c) => c.name)
      // All 14 characters recovered (including #10-#14!)
      expect(charNames).toContain('Arthur Sato (Age 64)')
      expect(charNames).toContain('Marco Morales (Age 15)')
      expect(charNames).toContain('Mateo Morales (Age 80)')
      expect(charNames).toContain('Sofia Morales (Age 26)')
      expect(charNames).toContain('Marco Morales (Age 50)')
      expect(res.extracted.character_descriptions).toHaveLength(14)

      // Locations recovered from beat settingHints instead of staying []
      expect(res.extracted.locations.length).toBe(5)
      expect(res.extracted.locations[0]!.name).toBe('Puerto Ángel, Oaxaca Beachfront')
      expect(res.extracted.props[0]!.name).toContain('Cedar Compass Box')

      // Beat 5 features 80-year-old Mateo (NEVER downgraded to Age 45!) and excludes Baby Marco
      const beat5Chars = res.extracted.beats[4]!.characters || []
      expect(beat5Chars).toContain('Mateo Morales (Age 80)')
      expect(beat5Chars).not.toContain('Mateo Morales (Age 45)')
      expect(beat5Chars).toContain('Marco Morales (Age 50)')
      expect(beat5Chars).not.toContain('Marco Morales (Baby)')
      expect(beat5Chars).toContain('Sofia Morales (Age 26)')
    }
  })
})
