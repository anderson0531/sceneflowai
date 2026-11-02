import { describe, it, expect } from 'vitest'
import { computeDashboardProjectStats, getProjectResumeUrl } from '@/lib/dashboardStats'
import {
  getProjectAudienceResonanceScore,
  getProjectBudgetStatus,
  getProjectEstimatedRemainingCredits,
  getProjectSceneCount,
} from '@/lib/credits/projectBudgetShared'
import { getStepNumber } from '@/hooks/useDashboardData'
import type { DashboardProject } from '@/hooks/useDashboardData'

const baseProject = (overrides: Partial<DashboardProject>): DashboardProject => ({
  id: 'p1',
  title: 'Test',
  description: '',
  currentStep: 'blueprint',
  progress: 10,
  status: 'draft',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  completedSteps: [],
  metadata: {},
  ...overrides,
})

describe('dashboardStats', () => {
  it('counts active vs archived and phases', () => {
    const stats = computeDashboardProjectStats(
      [
        baseProject({ id: '1', currentStep: 'vision', status: 'active' }),
        baseProject({ id: '2', currentStep: 'blueprint', status: 'archived' }),
        baseProject({ id: '3', currentStep: 'creation', progress: 100, status: 'active' }),
      ],
      3
    )
    expect(stats.total).toBe(3)
    expect(stats.active).toBe(2)
    expect(stats.archived).toBe(1)
    expect(stats.inProduction).toBe(2)
    expect(stats.completed).toBe(1)
  })

  it('builds resume URLs by workflow step', () => {
    expect(getProjectResumeUrl(baseProject({ currentStep: 'blueprint' }))).toBe(
      '/dashboard/studio/p1'
    )
    expect(getProjectResumeUrl(baseProject({ currentStep: 'vision' }))).toBe(
      '/dashboard/workflow/vision/p1'
    )
    expect(getProjectResumeUrl(baseProject({ currentStep: 'creation' }))).toBe(
      '/dashboard/workflow/vision/p1'
    )
    expect(getProjectResumeUrl(baseProject({ currentStep: 'final-cut' }))).toBe(
      '/dashboard/workflow/vision/p1'
    )
  })

  it('normalizes step numbers across blueprint and production aliases', () => {
    expect(getStepNumber('blueprint')).toBe(1)
    expect(getStepNumber('the-blueprint')).toBe(1)
    expect(getStepNumber('ideation')).toBe(1)
    expect(getStepNumber('vision')).toBe(2)
    expect(getStepNumber('creation')).toBe(2)
  })

  it('returns null Audience Resonance score when unanalyzed instead of fabricating 75', () => {
    expect(getProjectAudienceResonanceScore({})).toBeNull()
    expect(getProjectAudienceResonanceScore(null)).toBeNull()
    expect(
      getProjectAudienceResonanceScore({
        visionPhase: { scenes: [{ id: 's1' }, { id: 's2' }] },
      })
    ).toBeNull()
  })

  it('extracts truthful Audience Resonance score from blueprint or vision reviews', () => {
    expect(
      getProjectAudienceResonanceScore({
        blueprintAudienceResonance: { analysis: { overallScore: 84 } },
      })
    ).toBe(84)
    expect(
      getProjectAudienceResonanceScore({
        visionPhase: { reviews: { audience: { overallScore: 91 } } },
      })
    ).toBe(91)
    expect(
      getProjectAudienceResonanceScore({
        visionPhase: { scenes: [{ score: 80 }, { score: 90 }] },
      })
    ).toBe(85)
  })

  it('computes unified scene count, remaining credits, and budget status', () => {
    const metadata = {
      creditsUsed: 400,
      creditsBudget: 500,
      visionPhase: { scenes: [{}, {}, {}, {}, {}] },
    }
    expect(getProjectSceneCount(metadata)).toBe(5)
    expect(getProjectBudgetStatus(metadata)).toBe('near-limit')
    expect(getProjectEstimatedRemainingCredits(metadata, 50)).toBe(250)
    expect(getProjectEstimatedRemainingCredits(metadata, 100)).toBe(0)
  })
})
