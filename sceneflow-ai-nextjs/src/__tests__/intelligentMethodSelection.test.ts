import { describe, expect, it } from 'vitest'
import {
  getMethodWithFallback,
  promoteMethodForResolvedRefs,
  type MethodSelectionContext,
} from '@/lib/vision/intelligentMethodSelection'

function context(overrides: Partial<MethodSelectionContext> = {}): MethodSelectionContext {
  return {
    segmentIndex: 0,
    totalSegments: 3,
    hasSceneImage: true,
    hasStartFrameUrl: false,
    hasEndFrameUrl: false,
    hasCharacterRefs: false,
    hasPreviousLastFrame: false,
    hasPreviousVeoRef: false,
    isEstablishingShot: false,
    hasDialogue: false,
    hasSignificantMotion: false,
    ...overrides,
  }
}

describe('getMethodWithFallback beat-first methods', () => {
  it('keeps an explicit REF when a scene image is also present', () => {
    const result = getMethodWithFallback(
      'REF',
      context({ hasCharacterRefs: true, hasSceneImage: true })
    )
    expect(result.method).toBe('REF')
  })

  it('keeps an explicit T2V instead of animating the scene image', () => {
    const result = getMethodWithFallback(
      'T2V',
      context({ hasSceneImage: true, isEstablishingShot: true })
    )
    expect(result.method).toBe('T2V')
  })

  it('falls an invalid REF back to T2V when the only other asset is a scene image', () => {
    const result = getMethodWithFallback('REF', context({ hasSceneImage: true, hasCharacterRefs: false }))
    expect(result.method).toBe('T2V')
  })
})

describe('promoteMethodForResolvedRefs', () => {
  it('promotes T2V to REF when labeled refs were resolved', () => {
    expect(promoteMethodForResolvedRefs('T2V', 'T2V', 4)).toBe('REF')
    expect(promoteMethodForResolvedRefs(undefined, 'T2V', 4)).toBe('REF')
  })

  it('keeps frame-locked methods even when refs exist', () => {
    expect(promoteMethodForResolvedRefs('I2V', 'I2V', 3)).toBe('I2V')
    expect(promoteMethodForResolvedRefs('EXT', 'T2V', 3)).toBe('EXT')
    expect(promoteMethodForResolvedRefs('FTV', 'I2V', 3)).toBe('FTV')
  })

  it('keeps T2V when no refs were resolved', () => {
    expect(promoteMethodForResolvedRefs('T2V', 'T2V', 0)).toBe('T2V')
  })
})
