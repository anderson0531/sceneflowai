import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'
import {
  JIT_CONTEXT_GUIDES,
  JIT_CONTEXT_TO_FEATURE_ROOM,
  INTERACTIVE_TUTORIALS,
  CREATOR_PLAYBOOKS,
  HELP_KNOWLEDGE_ARTICLES,
  getJitContextIdForPath,
  getJitContextForPath,
  getFallbackHrefForContext,
  calculateEstimatedCredits,
} from '@/config/help/helpAcademyConfig'
import { productionWorkflowGroups } from '@/config/nav/workflowGuideConfig'
import { TIER_CATALOG } from '@/lib/billing/tierCatalog'

const RETIRED_DEAD_EVENTS = new Set([
  'production:generate-characters',
  'production:generate-video',
  'production:generate-audio',
  'production:generate-frames',
  'production:edit-video',
  'production:generate-references',
  'production:create-objects',
  'production:share-link',
  'production:mark-complete',
  'production:edit-frames',
  'production:audio-timeline',
])

describe('helpAcademyConfig — Route-Aware JIT Help, Pricing Parity & Dead-Event Prevention', () => {
  it('maps studio, dashboard, query-view, agency-ops, and producer routes to the correct JitContextId', () => {
    expect(getJitContextIdForPath('/dashboard')).toBe('dashboard')
    expect(getJitContextIdForPath('/dashboard/projects')).toBe('dashboard')
    expect(getJitContextIdForPath('/dashboard/clients')).toBe('agency-ops')
    expect(getJitContextIdForPath('/dashboard/settings/producer')).toBe('producer')
    expect(getJitContextIdForPath('/dashboard/series')).toBe('series')
    expect(getJitContextIdForPath('/dashboard/series/abc-123')).toBe('series')
    expect(getJitContextIdForPath('/dashboard/studio/proj-1')).toBe('blueprint')
    expect(getJitContextIdForPath('/dashboard/workflow/vision/proj-1')).toBe('production')
    expect(getJitContextIdForPath('/dashboard/workflow/vision/proj-1', '?view=streams')).toBe(
      'final-cut'
    )
    expect(getJitContextIdForPath('/dashboard/workflow/vision/proj-1', '?view=screening')).toBe(
      'premiere'
    )
    expect(getJitContextIdForPath('/dashboard/workflow/final-cut/proj-1')).toBe('final-cut')
    expect(getJitContextIdForPath('/dashboard/workflow/premiere/proj-1')).toBe('premiere')
    expect(getJitContextIdForPath('/dashboard/settings/billing')).toBe('billing')
    expect(getJitContextIdForPath('/dashboard/settings/byok')).toBe('billing')
  })

  it('provides complete annotated screenshot hotspots, fallback routes, and 60s quickSteps for every JIT context', () => {
    const contexts = Object.values(JIT_CONTEXT_GUIDES)
    expect(contexts.length).toBeGreaterThanOrEqual(9)

    for (const ctx of contexts) {
      expect(ctx.screenshotSrc).toMatch(/^\/images\/help\/.+\.svg$/)
      expect(ctx.hotspots.length).toBeGreaterThanOrEqual(4)
      expect(ctx.quickSteps.length).toBeGreaterThanOrEqual(3)
      expect(ctx.troubleshooting.length).toBeGreaterThanOrEqual(1)
      expect(getFallbackHrefForContext(ctx.id)).toMatch(/^\/dashboard/)

      for (const h of ctx.hotspots) {
        expect(h.x).toBeGreaterThanOrEqual(0)
        expect(h.x).toBeLessThanOrEqual(100)
        expect(h.y).toBeGreaterThanOrEqual(0)
        expect(h.y).toBeLessThanOrEqual(100)
        expect(h.spotlight.width).toBeGreaterThan(0)
        expect(h.spotlight.height).toBeGreaterThan(0)
      }
    }
  })

  it('dispatches zero retired/unhandled production:* events across JIT guides, tutorials, and workflow guides', () => {
    const dispatchedEvents: string[] = []
    for (const ctx of Object.values(JIT_CONTEXT_GUIDES)) {
      ctx.hotspots.forEach((h) => h.actionEvent && dispatchedEvents.push(h.actionEvent))
      ctx.quickSteps.forEach((s) => s.actionEvent && dispatchedEvents.push(s.actionEvent))
      ctx.troubleshooting.forEach((t) => t.fixActionEvent && dispatchedEvents.push(t.fixActionEvent))
    }
    for (const course of INTERACTIVE_TUTORIALS) {
      course.steps.forEach((s) => s.tryActionEvent && dispatchedEvents.push(s.tryActionEvent))
    }
    for (const group of productionWorkflowGroups) {
      group.steps.forEach((s) => s.actionEventName && dispatchedEvents.push(s.actionEventName))
    }

    for (const ev of dispatchedEvents) {
      expect(RETIRED_DEAD_EVENTS.has(ev), `Dead unhandled event found: ${ev}`).toBe(false)
    }
  })

  it('validates all interactive tutorial courses and step hotspot references', () => {
    expect(INTERACTIVE_TUTORIALS.length).toBeGreaterThanOrEqual(4)
    for (const course of INTERACTIVE_TUTORIALS) {
      expect(course.steps.length).toBeGreaterThanOrEqual(2)
      for (const step of course.steps) {
        const guide = getJitContextForPath(`/dashboard/${step.contextId}`)
        expect(guide).toBeDefined()
        const targetContext = JIT_CONTEXT_GUIDES[step.contextId]
        expect(targetContext).toBeDefined()
        const matchingHotspot = targetContext.hotspots.find(
          (h) => h.number === step.focusHotspotNumber
        )
        expect(matchingHotspot).toBeDefined()
      }
    }
  })

  it('stays strictly synced with live TIER_CATALOG pricing, 12-month add-on expiry, BYOK route, and excludes internal admin FAQs', () => {
    const serialized = JSON.stringify({
      JIT_CONTEXT_GUIDES,
      CREATOR_PLAYBOOKS,
      HELP_KNOWLEDGE_ARTICLES,
    })

    // Zero leaked internal admin mode or stale BYOK route or false never-expiring claim
    expect(serialized).not.toContain('Admin Test Mode')
    expect(serialized).not.toContain('Instant Test Activation')
    expect(serialized).not.toContain('/dashboard/settings/integrations')
    expect(serialized.toLowerCase()).not.toContain('never expire')

    // Canonical BYOK route & live prices present
    expect(serialized).toContain('/dashboard/settings/byok')
    expect(serialized).toContain(`$${TIER_CATALOG.hobbyist.priceUsd}/mo`)
    expect(serialized).toContain(`$${TIER_CATALOG.starter.priceUsd}/mo`)
    expect(serialized).toContain(`$${TIER_CATALOG.pro.priceUsd}/mo`)
    expect(serialized).toContain(`$${TIER_CATALOG.studio.priceUsd}/mo`)
  })

  it('calculates Animatic vs. Motion Video credit budgets and recommends the live TIER_CATALOG tier', () => {
    const hobbyistShort = calculateEstimatedCredits({
      sceneCount: 4,
      keyframePairsPerScene: 2,
      videoClipsPerScene: 1,
      languagesCount: 1,
    })
    expect(hobbyistShort.animaticTotal).toBeLessThan(hobbyistShort.fullProductionTotal)
    expect(hobbyistShort.fullProductionTotal).toBeGreaterThan(TIER_CATALOG.explorer.credits)
    expect(hobbyistShort.fullProductionTotal).toBeLessThanOrEqual(TIER_CATALOG.hobbyist.credits)
    expect(hobbyistShort.recommendedTier).toContain('Hobbyist')
    expect(hobbyistShort.recommendedTier).toContain(`$${TIER_CATALOG.hobbyist.priceUsd}/mo`)

    const starterChapter = calculateEstimatedCredits({
      sceneCount: 8,
      keyframePairsPerScene: 3,
      videoClipsPerScene: 2,
      languagesCount: 2,
    })
    expect(starterChapter.fullProductionTotal).toBeGreaterThan(TIER_CATALOG.hobbyist.credits)
    expect(starterChapter.fullProductionTotal).toBeLessThanOrEqual(TIER_CATALOG.starter.credits)
    expect(starterChapter.recommendedTier).toContain('Starter')
    expect(starterChapter.recommendedTier).toContain(`$${TIER_CATALOG.starter.priceUsd}/mo`)

    const proEpisode = calculateEstimatedCredits({
      sceneCount: 12,
      keyframePairsPerScene: 3,
      videoClipsPerScene: 3,
      languagesCount: 4,
    })
    expect(proEpisode.fullProductionTotal).toBeGreaterThan(TIER_CATALOG.starter.credits)
    expect(proEpisode.fullProductionTotal).toBeLessThanOrEqual(TIER_CATALOG.pro.credits)
    expect(proEpisode.recommendedTier).toContain('Operator Pro')
    expect(proEpisode.recommendedTier).toContain(`$${TIER_CATALOG.pro.priceUsd}/mo`)

    const studioSeason = calculateEstimatedCredits({
      sceneCount: 80,
      keyframePairsPerScene: 3,
      videoClipsPerScene: 2,
      languagesCount: 6,
    })
    expect(studioSeason.fullProductionTotal).toBeGreaterThan(TIER_CATALOG.pro.credits)
    expect(studioSeason.recommendedTier).toContain('Studio')
    expect(studioSeason.recommendedTier).toContain(`$${TIER_CATALOG.studio.priceUsd}/mo`)
  })

  it('locks down /api/cue/* with session auth & rate limits and removes orphaned DOL endpoints', () => {
    const root = process.cwd()
    const cueRespond = readFileSync(join(root, 'src/app/api/cue/respond/route.ts'), 'utf8')
    expect(cueRespond).toContain('getServerSession')
    expect(cueRespond).toContain('checkCueRateLimit')
    expect(cueRespond).toContain("getGeminiTextModel('flash')")
    expect(cueRespond).not.toContain("model: 'gemini-2.5-flash'")

    const ideationCue = readFileSync(join(root, 'src/app/api/ideation/cue/route.ts'), 'utf8')
    expect(ideationCue).toContain('getServerSession')
    expect(ideationCue).toContain('checkIdeationCueRate')

    expect(existsSync(join(root, 'src/app/api/cue/respond-dol/route.ts'))).toBe(false)
    expect(existsSync(join(root, 'src/app/api/cue/respond-dol-integrated/route.ts'))).toBe(false)
  })

  it('includes role-based creator playbooks, 7-language room video mappings, and Agency/PWA/FlowDirector KB coverage', () => {
    expect(CREATOR_PLAYBOOKS.length).toBe(4)
    expect(INTERACTIVE_TUTORIALS.length).toBeGreaterThanOrEqual(5)
    expect(INTERACTIVE_TUTORIALS.some((c) => c.id === 'white-label-agency-scale')).toBe(true)

    expect(HELP_KNOWLEDGE_ARTICLES.length).toBeGreaterThanOrEqual(11)
    const kbIds = HELP_KNOWLEDGE_ARTICLES.map((a) => a.id)
    expect(kbIds).toContain('kb-agency-scale-ops')
    expect(kbIds).toContain('kb-flowdirector-qa')
    expect(kbIds).toContain('kb-white-label-portals')
    expect(kbIds).toContain('kb-mobile-companion-pwa')

    expect(JIT_CONTEXT_TO_FEATURE_ROOM.series).toBe('series-desk')
    expect(JIT_CONTEXT_TO_FEATURE_ROOM.blueprint).toBe('blueprint-board')
    expect(JIT_CONTEXT_TO_FEATURE_ROOM.production).toBe('production-stage')
    expect(JIT_CONTEXT_TO_FEATURE_ROOM['final-cut']).toBe('screening-room')
    expect(JIT_CONTEXT_TO_FEATURE_ROOM.premiere).toBe('screening-room')
  })
})
