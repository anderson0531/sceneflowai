import { existsSync, readFileSync, statSync } from 'fs'
import { join } from 'path'
import { describe, expect, it } from 'vitest'
import enMessages from '../../messages/en.json'
import {
  WORLD_CLASS_LANDING_COPY,
  WORLD_CLASS_LANDING_TRANSLATIONS,
  resolveLocalizedStudioLandingCopy,
} from '@/config/landing/worldClassLandingCopy'

const ROOT = join(process.cwd())

function readSource(relPath: string): string {
  return readFileSync(join(ROOT, relPath), 'utf8')
}

describe('World-Class Creator + Video Services Landing Architecture', () => {
  it('mounts the streamlined 8-section landing journey in LandingPageClient without stacked redundant banners', () => {
    const landing = readSource('src/app/LandingPageClient.tsx')

    const orderedMarkers = [
      '<ImaginePossibilitiesHero />',
      '<CreatorAndBusinessGatewaySection />',
      '<DirectorOperatingSystemSection />',
      '<VideoServicesSpotlightSection />',
      '<ProductionExamplesSection />',
      '<StudioGuidedTourSection />',
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

  it('surfaces Video Business (#video-services) in Header, FloatingNav, and ImaginePossibilitiesHero dock', () => {
    const header = readSource('src/app/components/Header.tsx')
    const floatingNav = readSource('src/components/landing/FloatingNav.tsx')
    const topHero = readSource('src/components/landing/ImaginePossibilitiesHero.tsx')

    expect(header).toContain("'video-services'")
    expect(header.indexOf("'video-services'")).toBeLessThan(header.indexOf("'production-examples'"))
    expect(header.indexOf("'production-examples'")).toBeLessThan(header.indexOf("'key-features'"))

    expect(floatingNav).toContain("'video-services'")
    expect(floatingNav.indexOf("'video-services'")).toBeLessThan(
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

  it('powers the Video Services Business Engine with 4 verticals, transparent unit economics, and positive net margins', () => {
    const services = WORLD_CLASS_LANDING_COPY.videoServices
    expect(services.verticals.map((v) => v.id)).toEqual([
      'memoir',
      'realestate',
      'training',
      'brand',
    ])
    expect(services.launchBusinessCta).toContain('$9')
    expect(services.workflowSteps).toHaveLength(4)

    for (const vertical of services.verticals) {
      expect(vertical.typicalRetailUsd).toBeGreaterThan(200)
      expect(vertical.estComputeUsd).toBeGreaterThan(0)
      expect(vertical.typicalRetailUsd).toBeGreaterThanOrEqual(vertical.estComputeUsd * 6)

      for (const monthlyVolume of [4, 8, 15]) {
        const gross = vertical.typicalRetailUsd * monthlyVolume
        const net = gross - vertical.estComputeUsd * monthlyVolume
        const marginPct = Math.round((net / gross) * 100)
        expect(net).toBeGreaterThan(0)
        expect(marginPct).toBeGreaterThanOrEqual(80)
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
    expect(tourComponent).toContain('PipelineReviewDialog')
    expect(tourComponent).toContain('/share/screening-room/glass-ledger-screening')
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

      expect(localized.heroDock.tagline).not.toBe(WORLD_CLASS_LANDING_COPY.heroDock.tagline)
      expect(localized.audienceGateway.title).not.toBe(
        WORLD_CLASS_LANDING_COPY.audienceGateway.title
      )
      expect(localized.superpowers.pillars).toHaveLength(5)
      expect(localized.videoServices.verticals).toHaveLength(4)
      expect(localized.guidedTour.rooms).toHaveLength(4)

      const catalog = JSON.parse(readSource(`messages/${locale}.json`)) as Record<string, any>
      expect(catalog.studioLanding?.audienceGateway?.title).toBe(localized.audienceGateway.title)
      expect(catalog.nav?.videoServices?.length).toBeGreaterThan(1)
      expect(catalog.floatingNav?.videoServices?.length).toBeGreaterThan(1)
      expect(catalog.floatingNav?.studioTour?.length).toBeGreaterThan(1)
    }
  })
})
