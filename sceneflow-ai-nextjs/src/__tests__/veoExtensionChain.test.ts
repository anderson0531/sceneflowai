import { describe, expect, it } from 'vitest'
import {
  extensionCountForSpokenSeconds,
  planContinuousDialogueBeat,
  planVeoExtensionChain,
  totalVideoSecondsForChain,
  VEO_EXTENSION_DELTA_SEC,
  VEO_SPOKEN_CHUNK_SEC,
} from '@/lib/scene/veoExtensionChain'

describe('veoExtensionChain', () => {
  it('returns 0 extensions for dialogue within 6s chunk', () => {
    expect(extensionCountForSpokenSeconds(6)).toBe(0)
    expect(extensionCountForSpokenSeconds(5)).toBe(0)
  })

  it('returns 1 extension for ~7s spoken', () => {
    expect(extensionCountForSpokenSeconds(7)).toBe(1)
  })

  it('plans 1 extension for ~15s spoken', () => {
    expect(extensionCountForSpokenSeconds(15)).toBe(2)
    const plan = planVeoExtensionChain(15, ['first chunk', 'second chunk'])
    expect(plan.extensionCount).toBe(2)
    expect(plan.parts).toHaveLength(3)
    expect(plan.parts[0].method).toBe('I2V')
    expect(plan.parts[0].requestedDurationSeconds).toBe(8)
    expect(plan.parts[1].method).toBe('EXT')
    expect(plan.parts[1].chainMethod).toBe('extension')
    expect(plan.totalVideoSeconds).toBe(6 + 2 * VEO_EXTENSION_DELTA_SEC)
  })

  it('plans multiple extensions for ~30s spoken', () => {
    expect(extensionCountForSpokenSeconds(30)).toBe(4)
    const plan = planVeoExtensionChain(29)
    expect(plan.parts).toHaveLength(5)
    expect(plan.parts.filter((p) => p.method === 'EXT')).toHaveLength(4)
    expect(plan.totalVideoSeconds).toBe(6 + 4 * VEO_EXTENSION_DELTA_SEC)
  })

  it('single part for 6s or less', () => {
    const plan = planVeoExtensionChain(6)
    expect(plan.usesExtensionChain).toBe(false)
    expect(plan.parts).toHaveLength(1)
    expect(plan.parts[0].method).toBe('I2V')
  })

  it('totalVideoSecondsForChain matches initial + extensions', () => {
    expect(totalVideoSecondsForChain(6, 1)).toBe(6 + VEO_EXTENSION_DELTA_SEC)
    expect(totalVideoSecondsForChain(6, 3)).toBe(6 + 3 * VEO_EXTENSION_DELTA_SEC)
  })

  it('planContinuousDialogueBeat uses extension chain for long line', () => {
    const longLine =
      'We have to move now before they find us at the warehouse loading dock tonight. '.repeat(3)
    const plan = planContinuousDialogueBeat(longLine)
    expect(plan.usesExtensionChain).toBe(true)
    expect(plan.parts.length).toBeGreaterThan(1)
    expect(plan.parts[0].excerpt.length).toBeGreaterThan(0)
  })

  it('planContinuousDialogueBeat respects spokenSeconds override', () => {
    const shortLine = 'Hello.'
    const plan = planContinuousDialogueBeat(shortLine, { spokenSeconds: 14 })
    expect(plan.usesExtensionChain).toBe(true)
    expect(plan.extensionCount).toBeGreaterThan(0)
  })

  it('respects preferFtv on initial part', () => {
    const plan = planVeoExtensionChain(15, ['a', 'b'], { preferFtv: true })
    expect(plan.parts[0].method).toBe('FTV')
  })

  it('caps extension count at API max', () => {
    const count = extensionCountForSpokenSeconds(200)
    expect(count).toBeLessThanOrEqual(20)
  })

  it('spoken chunk constant is 6 seconds', () => {
    expect(VEO_SPOKEN_CHUNK_SEC).toBe(6)
  })
})
