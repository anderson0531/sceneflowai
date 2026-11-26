import { describe, expect, it, vi, beforeEach } from 'vitest'

const mockNotifyUser = vi.fn().mockResolvedValue({ ok: true })
const mockSendEmail = vi.fn().mockResolvedValue(true)
const mockGetProducerProfile = vi.fn().mockResolvedValue({
  brand_name: 'Golden Hour Films',
  primary_color: '#06b6d4',
  logo_url: null,
})

vi.mock('@/lib/jobs/jobService', () => ({
  notifyUser: (...args: unknown[]) => mockNotifyUser(...args),
}))

vi.mock('@/lib/intake/automatedClientBlueprint', () => ({
  sendAutomatedClientPortalEmail: (...args: unknown[]) => mockSendEmail(...args),
}))

vi.mock('@/lib/producer/producerProfileService', () => ({
  getOrCreateProducerProfile: (...args: unknown[]) => mockGetProducerProfile(...args),
  toBrandProfileSnapshot: () => ({
    brandName: 'Golden Hour Films',
    primaryColor: '#06b6d4',
    logoUrl: null,
  }),
}))

import {
  computeDocumentaryKenBurns,
  extractRenderableScenesFromMetadata,
  handleExpress4kRenderCompletedCallback,
  handleExpressContinuityApproved,
  parsePronunciationGuideNotes,
  resolveExpressDeliveryTier,
  resolveExpressReleaseMode,
  shouldAutoTrigger4kRenderOnApproval,
} from '@/lib/export/expressCinemaPipeline'
import { CLIENT_PORTAL_COPY, SUPPORTED_CLIENT_PORTAL_LOCALES } from '@/lib/intake/clientPortalCopy'
import { SERVICE_IN_A_BOX_PLAYBOOKS } from '@/config/producer/serviceInABoxPlaybooks'
import { calculateClientQuoteMargin } from '@/lib/credits/projectCalculator'
import {
  WORLD_CLASS_LANDING_COPY,
  WORLD_CLASS_LANDING_TRANSLATIONS,
} from '@/config/landing/worldClassLandingCopy'
import { CUSTOMER_PORTAL_ANIMATIC_COPY } from '@/config/landing/customerPortalAnimaticCopy'

function createMockProject(initialMetadata: Record<string, unknown>) {
  const project: any = {
    id: 'proj-express-1',
    user_id: 'owner-1',
    title: 'Mateo 80th Tribute',
    metadata: structuredClone(initialMetadata),
    update: vi.fn(async (patch: Record<string, unknown>) => {
      if (patch.metadata) {
        project.metadata = structuredClone(patch.metadata)
      }
      return project
    }),
  }
  return project
}

describe('Express 4K Cinema Pipeline & Guardrails', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('parses phonetic pronunciation notes and strips control characters', () => {
    const parsed = parsePronunciationGuideNotes(
      'Kowalski = koh-VAHL-skee\nSiobhan: shih-VAWN; Oaxacan - wah-HAH-kahn\u0007'
    )
    expect(parsed.rawText).not.toContain('\u0007')
    expect(parsed.entries).toEqual([
      { term: 'Kowalski', phonetic: 'koh-VAHL-skee' },
      { term: 'Siobhan', phonetic: 'shih-VAWN' },
      { term: 'Oaxacan', phonetic: 'wah-HAH-kahn' },
    ])
  })

  it('provides localized 10-second pronunciation guide copy across all 7 client portal locales', () => {
    for (const localeEntry of SUPPORTED_CLIENT_PORTAL_LOCALES) {
      const dict = CLIENT_PORTAL_COPY[localeEntry.code]
      expect(dict.pronunciationGuideLabel.trim().length).toBeGreaterThan(8)
      expect(dict.pronunciationGuidePlaceholder.trim().length).toBeGreaterThan(10)
    }
  })

  it('defaults release mode to supervised_pm_release and resolves Express delivery tier accurately', () => {
    expect(resolveExpressReleaseMode(undefined)).toBe('supervised_pm_release')
    expect(resolveExpressReleaseMode({})).toBe('supervised_pm_release')
    expect(resolveExpressReleaseMode({ expressReleaseMode: 'full_autopilot' })).toBe('full_autopilot')

    expect(resolveExpressDeliveryTier({})).toBe('full_motion_cinema')
    expect(resolveExpressDeliveryTier({ deliveryTier: 'express_cinema_4k' })).toBe('express_cinema_4k')
    expect(resolveExpressDeliveryTier({}, 'voice_over_cinema')).toBe('express_cinema_4k')
  })

  it('varies documentary Ken Burns camera motion across consecutive segments', () => {
    const seg0 = computeDocumentaryKenBurns(0, 'subtle')
    const seg1 = computeDocumentaryKenBurns(1, 'subtle')
    const seg2 = computeDocumentaryKenBurns(2, 'subtle')
    const seg3 = computeDocumentaryKenBurns(3, 'subtle')

    expect(seg0.zoomEnd).toBeGreaterThan(seg0.zoomStart) // push-in
    expect(seg1.panX).toBeGreaterThan(0) // pan right
    expect(seg2.zoomStart).toBeGreaterThan(seg2.zoomEnd) // pull-back
    expect(seg3.panX).toBeLessThan(0) // pan left

    const off = computeDocumentaryKenBurns(1, 'off')
    expect(off).toEqual({ zoomStart: 1.0, zoomEnd: 1.0, panX: 0, panY: 0 })
  })

  it('guards auto-4K render trigger on Express tier and available storyboard visuals', () => {
    const metadataWithScenes = {
      visionPhase: {
        script: {
          script: {
            scenes: [{ sceneNumber: 1, imageUrl: 'https://cdn.example.com/scene1.jpg' }],
          },
        },
      },
    }
    expect(extractRenderableScenesFromMetadata(metadataWithScenes)).toHaveLength(1)
    expect(
      shouldAutoTrigger4kRenderOnApproval({ deliveryTier: 'express_cinema_4k' }, metadataWithScenes)
    ).toBe(true)
    expect(
      shouldAutoTrigger4kRenderOnApproval(
        { deliveryTier: 'express_cinema_4k', autoRender4kOnApproval: false },
        metadataWithScenes
      )
    ).toBe(false)
    expect(
      shouldAutoTrigger4kRenderOnApproval({ deliveryTier: 'express_cinema_4k' }, {})
    ).toBe(false)
    expect(
      shouldAutoTrigger4kRenderOnApproval({ deliveryTier: 'full_motion_cinema' }, metadataWithScenes)
    ).toBe(false)
  })

  it('Supervised PM Release: pings PM for 1-tap release and saves pronunciation notes without emailing client yet', async () => {
    const project = createMockProject({
      clientOrder: {
        isClientProject: true,
        deliveryTier: 'express_cinema_4k',
        expressReleaseMode: 'supervised_pm_release',
        customerName: 'Elena Morales',
        customerEmail: 'elena@example.com',
      },
    })

    const result = await handleExpressContinuityApproved({
      project,
      ownerUserId: 'owner-1',
      reviewerName: 'Elena Morales',
      pronunciationNotes: 'Oaxaca = wah-HAH-kah',
      baseUrl: 'https://sceneflowai.studio',
    })

    expect(result.deliveryTier).toBe('express_cinema_4k')
    expect(result.releaseMode).toBe('supervised_pm_release')
    expect(result.pipelineStatus).toBe('ready_for_pm_release')
    expect(result.customerEmailSent).toBe(false)
    expect(result.screeningRoomUrl).toContain('/share/screening-room/')
    expect(mockSendEmail).not.toHaveBeenCalled()
    expect(mockNotifyUser).toHaveBeenCalledTimes(1)
    expect(project.metadata.pronunciationGuide.entries).toEqual([
      { term: 'Oaxaca', phonetic: 'wah-HAH-kah' },
    ])
    expect(project.metadata.clientOrder.expressPipelineStatus).toBe('ready_for_pm_release')
  })

  it('Full Auto-Pilot: auto-provisions Screening Room link and emails client directly upon Continuity approval', async () => {
    const project = createMockProject({
      clientOrder: {
        isClientProject: true,
        deliveryTier: 'express_cinema_4k',
        expressReleaseMode: 'full_autopilot',
        customerName: 'Elena Morales',
        customerEmail: 'elena@example.com',
      },
    })

    const result = await handleExpressContinuityApproved({
      project,
      ownerUserId: 'owner-1',
      reviewerName: 'Elena Morales',
      baseUrl: 'https://sceneflowai.studio',
    })

    expect(result.releaseMode).toBe('full_autopilot')
    expect(result.pipelineStatus).toBe('screening_sent')
    expect(result.customerEmailSent).toBe(true)
    expect(mockSendEmail).toHaveBeenCalledTimes(1)
    expect(mockSendEmail.mock.calls[0][0].toEmail).toBe('elena@example.com')
    expect(mockSendEmail.mock.calls[0][0].ctaUrl).toContain('/share/screening-room/')
    expect(project.metadata.clientOrder.stage).toBe('screening_sent')
  })

  it('Render Callback: saves 4K master URL, emails client download link once, and stays idempotent on duplicate callbacks', async () => {
    const project = createMockProject({
      clientOrder: {
        isClientProject: true,
        deliveryTier: 'express_cinema_4k',
        customerName: 'Elena Morales',
        customerEmail: 'elena@example.com',
      },
    })

    const first = await handleExpress4kRenderCompletedCallback({
      project,
      jobId: 'job-4k-99',
      downloadUrl: 'https://storage.googleapis.com/renders/job-4k-99.mp4',
      language: 'en',
      resolution: '4K',
    })

    expect(first.emailSent).toBe(true)
    expect(first.alreadyNotified).toBe(false)
    expect(project.metadata.exportedMasterUrl).toBe(
      'https://storage.googleapis.com/renders/job-4k-99.mp4'
    )
    expect(project.metadata.clientOrder.stage).toBe('delivered')
    expect(project.metadata.clientOrder.expressPipelineStatus).toBe('delivered')
    expect(mockSendEmail).toHaveBeenCalledTimes(1)

    // Duplicate webhook callback for the same jobId must NOT email the client twice
    const second = await handleExpress4kRenderCompletedCallback({
      project,
      jobId: 'job-4k-99',
      downloadUrl: 'https://storage.googleapis.com/renders/job-4k-99.mp4',
      language: 'en',
      resolution: '4K',
    })
    expect(second.alreadyNotified).toBe(true)
    expect(second.emailSent).toBe(false)
    expect(mockSendEmail).toHaveBeenCalledTimes(1)
  })
})

describe('Track A — Express 4K Cinema Tier Economics & Terminology Hygiene', () => {
  it('offers healthy-margin Same-Day Express 4K Cinema tiers ($149–$249) across all 4 service playbooks', () => {
    const playbooks = Object.values(SERVICE_IN_A_BOX_PLAYBOOKS)
    expect(playbooks).toHaveLength(4)

    for (const pb of playbooks) {
      const expressTier = pb.rateCardTiers[0]
      expect(expressTier.name.toLowerCase()).toContain('express 4k')
      expect(expressTier.suggestedPriceUsd).toBeGreaterThanOrEqual(149)
      expect(expressTier.suggestedPriceUsd).toBeLessThanOrEqual(249)
      const margin = calculateClientQuoteMargin({
        baseProjectCredits: expressTier.estCredits,
        clientPriceUsd: expressTier.suggestedPriceUsd,
        includedRevisionRounds: pb.defaultMaxRounds,
      })
      expect(margin.healthyMargin).toBe(true)
      expect(margin.providerGrossMarginPercent).toBeGreaterThanOrEqual(85)
    }
  })

  it('syncs Express 4K Cinema pricing tiers across English and all 6 priority landing locales with zero Pre-Vis Animatic leaks', () => {
    const expectedTiers = [
      [149, 599, 1250],
      [149, 699, 1650],
      [249, 950, 1800],
      [199, 650, 1200],
    ]

    const allPacks = [
      { locale: 'en', copy: WORLD_CLASS_LANDING_COPY },
      ...Object.entries(WORLD_CLASS_LANDING_TRANSLATIONS).map(([locale, copy]) => ({
        locale,
        copy,
      })),
    ]

    for (const { locale, copy } of allPacks) {
      expect(copy.videoServices.priceTierNames, `${locale} priceTierNames`).toHaveLength(3)
      copy.videoServices.verticals.forEach((v, idx) => {
        expect(v.priceTiersUsd, `${locale} vertical ${v.id}`).toEqual(expectedTiers[idx])
      })
      const serialized = JSON.stringify(copy.videoServices)
      expect(serialized, `${locale} videoServices should not mention Animatic`).not.toMatch(
        /\bAnimatic\b/i
      )
    }

    for (const [locale, portalCopy] of Object.entries(CUSTOMER_PORTAL_ANIMATIC_COPY)) {
      const serialized = JSON.stringify(portalCopy)
      expect(serialized, `${locale} customerPortalAnimaticCopy should not mention Pre-Vis Animatic`).not.toMatch(
        /Pre-Vis Animatic/i
      )
    }
  })
})
