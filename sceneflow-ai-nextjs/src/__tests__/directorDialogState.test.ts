import { describe, it, expect } from 'vitest'
import { shouldInitializeDirectorDialogState } from '@/lib/vision/directorDialogState'

describe('shouldInitializeDirectorDialogState', () => {
  it('does not initialize while closed', () => {
    expect(
      shouldInitializeDirectorDialogState({
        isOpen: false,
        wasOpen: false,
        currentSegmentId: 'seg-1',
        lastInitializedSegmentId: null,
      })
    ).toBe(false)
  })

  it('initializes on closed-to-open transition', () => {
    expect(
      shouldInitializeDirectorDialogState({
        isOpen: true,
        wasOpen: false,
        currentSegmentId: 'seg-1',
        lastInitializedSegmentId: null,
      })
    ).toBe(true)
  })

  it('does not reinitialize for same segment while open', () => {
    expect(
      shouldInitializeDirectorDialogState({
        isOpen: true,
        wasOpen: true,
        currentSegmentId: 'seg-1',
        lastInitializedSegmentId: 'seg-1',
      })
    ).toBe(false)
  })

  it('reinitializes when segment changes while open', () => {
    expect(
      shouldInitializeDirectorDialogState({
        isOpen: true,
        wasOpen: true,
        currentSegmentId: 'seg-2',
        lastInitializedSegmentId: 'seg-1',
      })
    ).toBe(true)
  })
})
