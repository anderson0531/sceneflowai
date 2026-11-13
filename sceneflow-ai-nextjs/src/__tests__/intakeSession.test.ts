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
}))

vi.mock('@/lib/jobs/jobService', () => ({
  notifyUser: (...args: unknown[]) => notifyUserMock(...args),
}))

import {
  createClientIntakeLink,
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
    }

    expect(updateProjectMock).toHaveBeenCalledTimes(1)
    const savedArgs = updateProjectMock.mock.calls[0][0]
    expect(savedArgs.title).toBe('Harbor Books: Arthur & Clara')
    expect(savedArgs.metadata.clientOrder.actionState).toBe('action_required')
    expect(savedArgs.metadata.clientOrder.continuityChecklist.characters).toHaveLength(2)
    expect(notifyUserMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'producer-1',
        projectId: 'proj-draft-1',
        type: 'client_intake_submitted',
      })
    )
  })

  it('opens video_memoir intake with a story-first ("tell me your story") invitation across all 7 locales', () => {
    const locales = ['en', 'es', 'pt', 'hi', 'zh-CN', 'ar', 'th'] as const
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
  })
})
