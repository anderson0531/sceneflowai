import { describe, it, expect } from 'vitest'
import {
  applyEasing,
  clampRect,
  computeFrameKenBurnsTransform,
  computeFrameProgress,
  imageTransformToViewportRect,
  rectToImageTransform,
  rectToRenderKenBurns,
  resolveBeatKenBurnsSettings,
  synthesizeGalleryKenBurnsSettings,
  type BeatKenBurnsSettings,
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

  it('round-trips gallery pan/zoom transforms through viewport rects without clamping loss', () => {
    const target = { scale: 1.1, translateX: -4, translateY: 2.5 }
    const rect = imageTransformToViewportRect(target)
    const recovered = rectToImageTransform(rect)
    expect(recovered.scale).toBeCloseTo(target.scale, 5)
    expect(recovered.translateX).toBeCloseTo(target.translateX, 5)
    expect(recovered.translateY).toBeCloseTo(target.translateY, 5)
  })

  it('resolves legacy directional beat kenBurns objects into active pan/zoom rects', () => {
    const legacy = {
      enabled: true,
      direction: 'left',
      intensity: 'medium',
    } as unknown as BeatKenBurnsSettings
    const resolved = resolveBeatKenBurnsSettings(legacy)
    expect(resolved?.enabled).toBe(true)
    const startT = computeFrameKenBurnsTransform(resolved!, 0)
    const endT = computeFrameKenBurnsTransform(resolved!, 1)
    expect(startT.scale).toBeCloseTo(1.1, 3)
    expect(endT.translateX).toBeGreaterThan(startT.translateX)
  })

  it('synthesizes varied gallery Ken Burns motion per directionIndex and static when off', () => {
    const shot0 = synthesizeGalleryKenBurnsSettings({
      mode: 'kenBurns',
      intensity: 'medium',
      directionIndex: 0,
    })
    const shot1 = synthesizeGalleryKenBurnsSettings({
      mode: 'kenBurns',
      intensity: 'medium',
      directionIndex: 1,
    })
    const offShot = synthesizeGalleryKenBurnsSettings({
      mode: 'off',
      intensity: 'medium',
      directionIndex: 0,
    })

    expect(shot0.enabled).toBe(true)
    expect(shot1.enabled).toBe(true)
    expect(shot0).not.toEqual(shot1)
    expect(offShot.enabled).toBe(false)
  })
})
