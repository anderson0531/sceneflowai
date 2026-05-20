import { describe, it, expect } from 'vitest'
import { computeDashboardProjectStats, getProjectResumeUrl } from '@/lib/dashboardStats'
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
    expect(getProjectResumeUrl(baseProject({ currentStep: 'vision' }))).toContain('final-cut')
    expect(getProjectResumeUrl(baseProject({ currentStep: 'blueprint' }))).toContain('/vision/')
  })
})
