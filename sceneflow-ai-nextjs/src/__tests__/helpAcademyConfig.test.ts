import { describe, it, expect } from 'vitest'
import {
  JIT_CONTEXT_GUIDES,
  INTERACTIVE_TUTORIALS,
  CREATOR_PLAYBOOKS,
  HELP_KNOWLEDGE_ARTICLES,
  getJitContextIdForPath,
  getJitContextForPath,
  calculateEstimatedCredits,
} from '@/config/help/helpAcademyConfig'

describe('helpAcademyConfig — Route-Aware JIT Help & Interactive Tutorials', () => {
  it('maps studio and dashboard routes to the correct JitContextId', () => {
    expect(getJitContextIdForPath('/dashboard')).toBe('dashboard')
    expect(getJitContextIdForPath('/dashboard/projects')).toBe('dashboard')
    expect(getJitContextIdForPath('/dashboard/series')).toBe('series')
    expect(getJitContextIdForPath('/dashboard/series/abc-123')).toBe('series')
    expect(getJitContextIdForPath('/dashboard/studio/proj-1')).toBe('blueprint')
    expect(getJitContextIdForPath('/dashboard/workflow/vision/proj-1')).toBe(
      'production'
    )
    expect(getJitContextIdForPath('/dashboard/workflow/final-cut/proj-1')).toBe(
      'final-cut'
    )
    expect(getJitContextIdForPath('/dashboard/workflow/premiere/proj-1')).toBe(
      'premiere'
    )
    expect(getJitContextIdForPath('/dashboard/settings/billing')).toBe('billing')
    expect(getJitContextIdForPath('/dashboard/settings/integrations')).toBe(
      'billing'
    )
  })

  it('provides complete annotated screenshot hotspots and 60s quickSteps for every JIT context', () => {
    const contexts = Object.values(JIT_CONTEXT_GUIDES)
    expect(contexts.length).toBeGreaterThanOrEqual(7)

    for (const ctx of contexts) {
      expect(ctx.screenshotSrc).toMatch(/^\/images\/help\/.+\.svg$/)
      expect(ctx.hotspots.length).toBeGreaterThanOrEqual(4)
      expect(ctx.quickSteps.length).toBeGreaterThanOrEqual(3)
      expect(ctx.troubleshooting.length).toBeGreaterThanOrEqual(1)

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

  it('calculates Animatic vs. Veo 3.1 credit budgets and recommends the matching tier', () => {
    const smallShort = calculateEstimatedCredits({
      sceneCount: 4,
      keyframePairsPerScene: 2,
      veoClipsPerScene: 1,
      languagesCount: 1,
    })
    expect(smallShort.animaticTotal).toBeLessThan(smallShort.fullProductionTotal)
    expect(smallShort.recommendedTier).toContain('Starter')

    const proEpisode = calculateEstimatedCredits({
      sceneCount: 12,
      keyframePairsPerScene: 3,
      veoClipsPerScene: 3,
      languagesCount: 4,
    })
    expect(proEpisode.fullProductionTotal).toBeGreaterThan(4500)
    expect(proEpisode.recommendedTier).toContain('Pro')

    const studioSeason = calculateEstimatedCredits({
      sceneCount: 80,
      keyframePairsPerScene: 3,
      veoClipsPerScene: 2,
      languagesCount: 6,
    })
    expect(studioSeason.fullProductionTotal).toBeGreaterThan(15000)
    expect(studioSeason.recommendedTier).toContain('Studio')
  })

  it('includes role-based creator playbooks and searchable knowledge base articles', () => {
    expect(CREATOR_PLAYBOOKS.length).toBe(4)
    expect(HELP_KNOWLEDGE_ARTICLES.length).toBeGreaterThanOrEqual(6)
  })
})
