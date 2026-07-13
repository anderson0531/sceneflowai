import { describe, it, expect } from 'vitest'
import { getProductionRoute, getResumeRouteForStep } from '@/constants/workflowRoutes'

describe('workflowRoutes', () => {
  it('getProductionRoute returns vision path with optional panel', () => {
    expect(getProductionRoute('abc')).toBe('/dashboard/workflow/vision/abc')
    expect(getProductionRoute('abc', 'publish')).toBe(
      '/dashboard/workflow/vision/abc?panel=publish'
    )
  })

  it('getResumeRouteForStep routes blueprint to studio and post-blueprint to production', () => {
    expect(getResumeRouteForStep('p1', 'blueprint')).toBe('/dashboard/studio/p1')
    expect(getResumeRouteForStep('p1', 'ideation')).toBe('/dashboard/studio/p1')
    expect(getResumeRouteForStep('p1', 'vision')).toBe('/dashboard/workflow/vision/p1')
    expect(getResumeRouteForStep('p1', 'creation')).toBe('/dashboard/workflow/vision/p1')
    expect(getResumeRouteForStep('p1', 'final-cut')).toBe('/dashboard/workflow/vision/p1')
    expect(getResumeRouteForStep('p1', 'premiere')).toBe('/dashboard/workflow/vision/p1')
    expect(getResumeRouteForStep('p1', null)).toBe('/dashboard/studio/p1')
  })
})
