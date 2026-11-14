import { existsSync, readFileSync, statSync } from 'fs'
import { join } from 'path'
import { describe, expect, it } from 'vitest'
import enMessages from '../../messages/en.json'
import {
  WORLD_CLASS_LANDING_COPY,
  WORLD_CLASS_LANDING_TRANSLATIONS,
  resolveLocalizedStudioLandingCopy,
} from '@/config/landing/worldClassLandingCopy'
import { SANDBOX_VIDEO_CAPTURE_SCRIPTS } from '@/config/landing/sandboxVideoCaptureScripts'

const ROOT = join(process.cwd())

function readSource(relPath: string): string {
  return readFileSync(join(ROOT, relPath), 'utf8')
}

describe('World-Class Creator + Video Services Landing Architecture', () => {
  it('mounts the streamlined landing journey with StudioGuidedTourSection ahead of ProductionExamplesSection', () => {
    const landing = readSource('src/app/LandingPageClient.tsx')

    const orderedMarkers = [
      '<ImaginePossibilitiesHero />',
      '<CreatorAndBusinessGatewaySection />',
      '<DirectorOperatingSystemSection />',
      '<VideoServicesSpotlightSection />',
      '<StudioGuidedTourSection />',
      '<ProductionExamplesSection />',
      '<FullStudioDirectoryDrawer>',
      '<KeyFeaturesSection />',
      '<StudioAcademyGuaranteeStrip />',
      '<PricingCredits />',
      '<InfrastructureSection />',
      '<TrustSafeguardSection />',
      '<ForFilmmakersSection />',
      '<FinalCTA />',
    ]

    let lastIndex = -1
    for (const marker of orderedMarkers) {
      const idx = landing.indexOf(marker)
      expect(idx, `expected ${marker} in LandingPageClient.tsx`).toBeGreaterThan(lastIndex)
      lastIndex = idx
    }

    // Old stacked full-bleed Ana sections are consolidated into interactive Bento + Academy strip
    expect(landing).not.toContain('<HeroSection />')
    expect(landing).not.toContain('<TwoModesSection />')
    expect(landing).not.toContain('<DirectControlSection />')
    expect(landing).not.toContain('<ProductionAgentSection />')
    expect(landing).not.toContain('<PublishCutSection />')
    expect(landing).not.toContain('<StudioAcademySection />')
  })

  it('orders Video Business -> Studio Tour -> Examples -> Features in Header, FloatingNav, and Hero dock', () => {
    const header = readSource('src/app/components/Header.tsx')
    const floatingNav = readSource('src/components/landing/FloatingNav.tsx')
    const topHero = readSource('src/components/landing/ImaginePossibilitiesHero.tsx')

    expect(header).toContain("'video-services'")
    expect(header).toContain("'studio-tour'")
    expect(header.indexOf("'video-services'")).toBeLessThan(header.indexOf("'studio-tour'"))
    expect(header.indexOf("'studio-tour'")).toBeLessThan(header.indexOf("'production-examples'"))
    expect(header.indexOf("'production-examples'")).toBeLessThan(header.indexOf("'key-features'"))

    expect(floatingNav).toContain("'video-services'")
    expect(floatingNav).toContain("'studio-tour'")
    expect(floatingNav.indexOf("'video-services'")).toBeLessThan(
      floatingNav.indexOf("'studio-tour'")
    )
    expect(floatingNav.indexOf("'studio-tour'")).toBeLessThan(
      floatingNav.indexOf("'production-examples'")
    )
    expect(floatingNav.indexOf("'production-examples'")).toBeLessThan(
      floatingNav.indexOf("'key-features'")
    )

    expect(topHero).toContain("getElementById('video-services')")
    expect(topHero).toContain("getElementById('five-superpowers')")
    expect(topHero).toContain("getSignupUrlForTier('explorer')")
  })

  it('preserves all legacy hash anchors so existing external/footer deep links resolve cleanly', () => {
    const gateway = readSource('src/components/landing/CreatorAndBusinessGatewaySection.tsx')
    const superpowers = readSource('src/components/landing/DirectorOperatingSystemSection.tsx')
    const academyStrip = readSource('src/components/landing/StudioAcademyGuaranteeStrip.tsx')

    expect(gateway).toContain('id="hero-video"')
    for (const legacyHash of [
      'two-modes',
      'core-capabilities',
      'audience-resonance',
      'pre-vis-engine',
      'direct-control',
      'production-agent',
      'publish-cut',
    ]) {
      expect(superpowers).toContain(`'${legacyHash}'`)
    }
    expect(academyStrip).toContain("'studio-academy'")
  })

  it('presents all 5 SceneFlow Studio design philosophy superpowers with on-demand 30s dubbed video triggers', () => {
    const pillars = WORLD_CLASS_LANDING_COPY.superpowers.pillars
    expect(pillars.map((p) => p.id)).toEqual([
      'baseline',
      'dialog',
      'review',
      'agents',
      'collaboration',
    ])
    expect(pillars[0].videoClipKey).toBe('comparison')
    expect(pillars[1].videoClipKey).toBe('direction')
    expect(pillars[3].videoClipKey).toBe('agent')
    expect(pillars[4].videoClipKey).toBe('publish')

    const superpowers = readSource('src/components/landing/DirectorOperatingSystemSection.tsx')
    expect(superpowers).toContain("getTwoModesMedia('comparison', locale)")
    expect(superpowers).toContain('getPrimaryValueMedia(key, locale)')
    expect(superpowers).toContain('TwoModesTheaterModal')
  })

  it('powers the Video Services Business Engine with 50%–80% lower fully-loaded cost (credits + PM time) and 65%–92% true net margins', () => {
    const services = WORLD_CLASS_LANDING_COPY.videoServices
    expect(services.verticals.map((v) => v.id)).toEqual([
      'memoir',
      'realestate',
      'training',
      'brand',
    ])
    expect(services.launchBusinessCta).toContain('$9')
    expect(services.workflowSteps).toHaveLength(4)
    expect(services.priceTierNames).toHaveLength(3)

    for (const vertical of services.verticals) {
      expect(vertical.traditionalMarketRangeLabel.startsWith('$')).toBe(true)
      expect(vertical.priceTiersUsd).toHaveLength(3)
      expect(vertical.priceTiersUsd[1]).toBe(vertical.typicalRetailUsd)
      expect(vertical.estComputeUsd).toBeGreaterThan(0)
      expect(vertical.estOperatorUsd).toBeGreaterThan(vertical.estComputeUsd)

      const fullyLoadedCost = vertical.estComputeUsd + vertical.estOperatorUsd
      for (const tierPrice of vertical.priceTiersUsd) {
        expect(tierPrice).toBeGreaterThan(fullyLoadedCost)
        for (const monthlyVolume of [4, 8, 15]) {
          const gross = tierPrice * monthlyVolume
          const net = (tierPrice - fullyLoadedCost) * monthlyVolume
          const trueMarginPct = Math.round((net / gross) * 100)
          expect(net).toBeGreaterThan(0)
          expect(trueMarginPct).toBeGreaterThanOrEqual(65)
          expect(trueMarginPct).toBeLessThanOrEqual(92)
        }
      }
    }
  })

  it('organizes all 34 KeyFeatures icons across 5 curated Use-Case Tracks and stages 6 Sandbox video capture scripts', () => {
    const rooms = (enMessages as Record<string, any>).keyFeatures.rooms as Array<Record<string, any>>
    const allCatalogIcons = new Set<string>()
    for (const room of rooms) {
      for (const f of room.spend?.features ?? []) allCatalogIcons.add(f.icon)
      for (const g of room.groups ?? []) {
        for (const f of g.features ?? []) allCatalogIcons.add(f.icon)
      }
      for (const f of room.features ?? []) allCatalogIcons.add(f.icon)
    }
    expect(allCatalogIcons.size).toBe(34)

    const tracks = WORLD_CLASS_LANDING_COPY.useCaseDirectory.tracks
    expect(tracks).toHaveLength(5)
    const coveredByTracks = new Set<string>()
    for (const track of tracks) {
      expect(track.featureIcons.length).toBeGreaterThanOrEqual(6)
      expect(track.featureIcons.length).toBeLessThanOrEqual(10)
      for (const icon of track.featureIcons) {
        expect(allCatalogIcons.has(icon), `unknown feature icon ${icon} in track ${track.id}`).toBe(
          true
        )
        coveredByTracks.add(icon)
      }
    }
    expect(coveredByTracks.size).toBe(allCatalogIcons.size)

    expect(SANDBOX_VIDEO_CAPTURE_SCRIPTS.map((s) => s.id)).toEqual([
      'baseline',
      'direction',
      'review',
      'agents',
      'collaboration',
      'four-room-tour',
    ])
    for (const script of SANDBOX_VIDEO_CAPTURE_SCRIPTS) {
      expect(script.targetDurationSeconds).toBeGreaterThanOrEqual(35)
      expect(script.targetDurationSeconds).toBeLessThanOrEqual(40)
      expect(script.beats.length).toBeGreaterThanOrEqual(4)
      for (const beat of script.beats) {
        expect(beat.sandboxRoute.startsWith('/')).toBe(true)
        expect(beat.voiceoverEn.length).toBeGreaterThan(30)
      }
    }
  })

  it('backs the 4-Room Guided Studio Tour with verified offline Sandbox assets and progressive disclosure of KeyFeaturesSection', () => {
    const tour = WORLD_CLASS_LANDING_COPY.guidedTour
    expect(tour.rooms.map((r) => r.id)).toEqual([
      'series-desk',
      'blueprint-board',
      'production-stage',
      'screening-room',
    ])

    const tourComponent = readSource('src/components/landing/StudioGuidedTourSection.tsx')
    expect(tourComponent).toContain('StudioDoorWalkthroughModal')
    expect(tourComponent).toContain('getFeatureRoomMedia')
    expect(tourComponent).toContain('ExpandedImageModal')

    const sandboxMatches = [
      ...tourComponent.matchAll(/\/images\/sandbox\/glass-ledger\/[a-z0-9-]+\.jpg/g),
    ].map((m) => m[0])
    expect(sandboxMatches.length).toBeGreaterThanOrEqual(16)

    for (const relUrl of new Set(sandboxMatches)) {
      const absPath = join(ROOT, 'public', relUrl.replace(/^\//, ''))
      expect(existsSync(absPath), `missing sandbox asset ${relUrl}`).toBe(true)
      expect(statSync(absPath).size).toBeGreaterThan(50_000)
    }

    const drawer = readSource('src/components/landing/FullStudioDirectoryDrawer.tsx')
    expect(drawer).toContain('SectionCollapseBody')
    expect(drawer).toContain("'key-features'")
  })

  it('ships complete native translations across all 7 priority locales (en, es, pt, hi, zh-CN, ar, th) and message catalogs', () => {
    expect((enMessages as Record<string, unknown>).studioLanding).toEqual(WORLD_CLASS_LANDING_COPY)

    for (const locale of ['es', 'pt', 'hi', 'zh-CN', 'ar', 'th'] as const) {
      expect(WORLD_CLASS_LANDING_TRANSLATIONS[locale]).toBeDefined()
      const localized = resolveLocalizedStudioLandingCopy(locale)

      // Top dock & Dual-Audience Gateway
      expect(localized.heroDock.tagline).not.toBe(WORLD_CLASS_LANDING_COPY.heroDock.tagline)
      expect(localized.audienceGateway.title).not.toBe(
        WORLD_CLASS_LANDING_COPY.audienceGateway.title
      )
      localized.audienceGateway.cards.forEach((card, idx) => {
        const enCard = WORLD_CLASS_LANDING_COPY.audienceGateway.cards[idx]
        expect(card.badge, `${locale} gateway card ${idx} badge`).not.toBe(enCard.badge)
        expect(card.title, `${locale} gateway card ${idx} title`).not.toBe(enCard.title)
        expect(card.description, `${locale} gateway card ${idx} desc`).not.toBe(enCard.description)
        expect(card.ctaLabel, `${locale} gateway card ${idx} cta`).not.toBe(enCard.ctaLabel)
        expect(card.highlights[0], `${locale} gateway card ${idx} highlight`).not.toBe(
          enCard.highlights[0]
        )
      })

      // 5 Studio Superpowers + Bento Micro-Visuals
      expect(localized.superpowers.pillars).toHaveLength(5)
      localized.superpowers.pillars.forEach((pillar, idx) => {
        const enPillar = WORLD_CLASS_LANDING_COPY.superpowers.pillars[idx]
        expect(pillar.badge, `${locale} pillar ${pillar.id} badge`).not.toBe(enPillar.badge)
        expect(pillar.title, `${locale} pillar ${pillar.id} title`).not.toBe(enPillar.title)
        expect(pillar.description, `${locale} pillar ${pillar.id} desc`).not.toBe(
          enPillar.description
        )
        expect(pillar.outcomeTag, `${locale} pillar ${pillar.id} outcome`).not.toBe(
          enPillar.outcomeTag
        )
      })
      expect(localized.superpowers.microVisuals.baseline.intakePrompt).not.toBe(
        WORLD_CLASS_LANDING_COPY.superpowers.microVisuals.baseline.intakePrompt
      )
      expect(localized.superpowers.microVisuals.dialog.quote).not.toBe(
        WORLD_CLASS_LANDING_COPY.superpowers.microVisuals.dialog.quote
      )
      expect(localized.superpowers.microVisuals.review.flowDirectorNote).not.toBe(
        WORLD_CLASS_LANDING_COPY.superpowers.microVisuals.review.flowDirectorNote
      )
      expect(localized.superpowers.microVisuals.agents.rows[0].status).not.toBe(
        WORLD_CLASS_LANDING_COPY.superpowers.microVisuals.agents.rows[0].status
      )
      expect(localized.superpowers.microVisuals.collaboration.approvedBadge).not.toBe(
        WORLD_CLASS_LANDING_COPY.superpowers.microVisuals.collaboration.approvedBadge
      )

      // Video Services Business Engine + Calculator + Workflow Steps
      expect(localized.videoServices.verticals).toHaveLength(4)
      expect(localized.videoServices.whoBuysLabel).not.toBe(
        WORLD_CLASS_LANDING_COPY.videoServices.whoBuysLabel
      )
      expect(localized.videoServices.marginAdvantageLabel).not.toBe(
        WORLD_CLASS_LANDING_COPY.videoServices.marginAdvantageLabel
      )
      expect(localized.videoServices.calculatorTitle).not.toBe(
        WORLD_CLASS_LANDING_COPY.videoServices.calculatorTitle
      )
      expect(localized.videoServices.monthlyNetLabel).not.toBe(
        WORLD_CLASS_LANDING_COPY.videoServices.monthlyNetLabel
      )
      localized.videoServices.verticals.forEach((vert, idx) => {
        const enVert = WORLD_CLASS_LANDING_COPY.videoServices.verticals[idx]
        expect(vert.tabLabel, `${locale} vertical ${vert.id} tab`).not.toBe(enVert.tabLabel)
        expect(vert.title, `${locale} vertical ${vert.id} title`).not.toBe(enVert.title)
        expect(vert.clientBuyer, `${locale} vertical ${vert.id} buyer`).not.toBe(enVert.clientBuyer)
        expect(vert.keyAdvantage, `${locale} vertical ${vert.id} adv`).not.toBe(enVert.keyAdvantage)
      })
      localized.videoServices.workflowSteps.forEach((step, idx) => {
        const enStep = WORLD_CLASS_LANDING_COPY.videoServices.workflowSteps[idx]
        expect(step.title, `${locale} workflowStep ${idx} title`).not.toBe(enStep.title)
        expect(step.detail, `${locale} workflowStep ${idx} detail`).not.toBe(enStep.detail)
      })

      // 4-Room Sandbox Tour + Visual Captions + Directory Drawer + Academy Strip
      expect(localized.guidedTour.rooms).toHaveLength(4)
      expect(localized.guidedTour.screeningModalTitle).not.toBe(
        WORLD_CLASS_LANDING_COPY.guidedTour.screeningModalTitle
      )
      localized.guidedTour.rooms.forEach((room, idx) => {
        const enRoom = WORLD_CLASS_LANDING_COPY.guidedTour.rooms[idx]
        expect(room.title, `${locale} room ${room.id} title`).not.toBe(enRoom.title)
        expect(room.promise, `${locale} room ${room.id} promise`).not.toBe(enRoom.promise)
        expect(room.creatorExampleNote, `${locale} room ${room.id} creatorNote`).not.toBe(
          enRoom.creatorExampleNote
        )
        expect(room.serviceExampleNote, `${locale} room ${room.id} serviceNote`).not.toBe(
          enRoom.serviceExampleNote
        )
        expect(room.callouts[0].label, `${locale} room ${room.id} callout`).not.toBe(
          enRoom.callouts[0].label
        )
        expect(room.visuals.topBadge, `${locale} room ${room.id} topBadge`).not.toBe(
          enRoom.visuals.topBadge
        )
        expect(room.visuals.bottomBadge, `${locale} room ${room.id} bottomBadge`).not.toBe(
          enRoom.visuals.bottomBadge
        )
      })
      expect(localized.guidedTour.examplesBridgeCta).not.toBe(
        WORLD_CLASS_LANDING_COPY.guidedTour.examplesBridgeCta
      )
      expect(localized.useCaseDirectory.viewByUseCaseLabel).not.toBe(
        WORLD_CLASS_LANDING_COPY.useCaseDirectory.viewByUseCaseLabel
      )
      expect(localized.useCaseDirectory.tracks).toHaveLength(5)
      localized.useCaseDirectory.tracks.forEach((track, idx) => {
        const enTrack = WORLD_CLASS_LANDING_COPY.useCaseDirectory.tracks[idx]
        expect(track.tabLabel, `${locale} track ${track.id} tab`).not.toBe(enTrack.tabLabel)
        expect(track.headline, `${locale} track ${track.id} headline`).not.toBe(enTrack.headline)
        expect(track.featureIcons).toEqual(enTrack.featureIcons)
      })
      expect(localized.directoryDrawer.expandCta).not.toBe(
        WORLD_CLASS_LANDING_COPY.directoryDrawer.expandCta
      )
      expect(localized.academyStrip.title).not.toBe(WORLD_CLASS_LANDING_COPY.academyStrip.title)

      // Message catalog parity (including Animated Series productionShowcase gap fix)
      const catalog = JSON.parse(readSource(`messages/${locale}.json`)) as Record<string, any>
      expect(catalog.studioLanding).toEqual(localized)
      expect(catalog.nav?.videoServices?.length).toBeGreaterThan(1)
      expect(catalog.nav?.videoServices).not.toBe('Video Business')
      expect(catalog.nav?.studioTour?.length).toBeGreaterThan(1)
      expect(catalog.nav?.studioTour).not.toBe('Studio Tour')
      expect(catalog.floatingNav?.videoServices?.length).toBeGreaterThan(1)
      expect(catalog.floatingNav?.studioTour?.length).toBeGreaterThan(1)
      expect(catalog.floatingNav?.studioTour).not.toBe('Tour')
      expect(catalog.productionShowcase?.cards?.[1]?.solutionPillars?.[0]?.solution).not.toBe(
        (enMessages as Record<string, any>).productionShowcase.cards[1].solutionPillars[0].solution
      )
      expect(
        catalog.productionShowcase?.seriesPanel?.inputs?.animation?.episode1Synopsis?.synopsis
      ).not.toBe(
        (enMessages as Record<string, any>).productionShowcase.seriesPanel.inputs.animation
          .episode1Synopsis.synopsis
      )
    }
  })
})
