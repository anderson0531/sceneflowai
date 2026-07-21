import { describe, it, expect } from 'vitest'
import {
  applyEasing,
  clampRect,
  computeFrameKenBurnsTransform,
  computeFrameProgress,
  rectToImageTransform,
  rectToRenderKenBurns,
  resolveBeatKenBurnsSettings,
} from '@/lib/storyboard/kenBurnsFrame'

describe('kenBurnsFrame', () => {
  it('computes monotonic frame progress', () => {
    expect(computeFrameProgress(0, 10, 0)).toBe(0)
    expect(computeFrameProgress(0, 10, 5)).toBe(0.5)
    expect(computeFrameProgress(0, 10, 10)).toBe(1)
    expect(computeFrameProgress(0, 10, 15)).toBe(1)
  })

  it('maps full frame to identity transform', () => {
    const t = rectToImageTransform({ x: 0, y: 0, width: 1, height: 1 })
    expect(t.scale).toBeCloseTo(1)
    expect(t.translateX).toBeCloseTo(0)
    expect(t.translateY).toBeCloseTo(0)
  })

  it('zooms in when end rect is smaller', () => {
    const settings = {
      enabled: true,
      start: { x: 0, y: 0, width: 1, height: 1 },
      end: { x: 0.25, y: 0.25, width: 0.5, height: 0.5 },
      easing: 'linear' as const,
    }
    const start = computeFrameKenBurnsTransform(settings, 0)
    const end = computeFrameKenBurnsTransform(settings, 1)
    expect(end.scale).toBeGreaterThan(start.scale)
  })

  it('exports viewport rects for FFmpeg', () => {
    const kb = rectToRenderKenBurns({
      enabled: true,
      start: { x: 0, y: 0, width: 1, height: 1 },
      end: { x: 0.2, y: 0.2, width: 0.6, height: 0.6 },
      easing: 'smooth',
    })
    expect(kb.startRect).toEqual({ x: 0, y: 0, width: 1, height: 1 })
    expect(kb.endRect?.width).toBeCloseTo(0.6)
    expect(kb.zoomEnd).toBeGreaterThan(kb.zoomStart)
  })

  it('ignores disabled beat settings', () => {
    expect(
      resolveBeatKenBurnsSettings({
        enabled: false,
        start: clampRect({ x: 0, y: 0, width: 1, height: 1 }),
        end: clampRect({ x: 0.2, y: 0.2, width: 0.6, height: 0.6 }),
        easing: 'linear',
      })
    ).toBeUndefined()
  })

  it('applies easing curves within 0..1', () => {
    expect(applyEasing(0.5, 'smooth')).toBeGreaterThan(0)
    expect(applyEasing(0.5, 'smooth')).toBeLessThan(1)
    expect(applyEasing(1, 'dramatic')).toBe(1)
  })
})
