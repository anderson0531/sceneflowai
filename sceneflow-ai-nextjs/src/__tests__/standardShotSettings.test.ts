import { describe, expect, it } from 'vitest'
import {
  optimizeStandardOmniSettings,
  STANDARD_TAKE_DURATION_SECONDS,
} from '@/lib/intelligence/standard-shot-settings'

describe('optimizeStandardOmniSettings', () => {
  it('defaults to ingredients (REF) when refs resolve', () => {
    const result = optimizeStandardOmniSettings({
      segment: { shotType: 'medium shot' },
      ingredientCount: 2,
    })
    expect(result.method).toBe('REF')
    expect(result.resolution).toBe('720p')
  })

  it('uses T2V when no ingredients', () => {
    const result = optimizeStandardOmniSettings({
      segment: {},
      ingredientCount: 0,
    })
    expect(result.method).toBe('T2V')
  })

  it('picks 1080p for dialogue close-ups', () => {
    const result = optimizeStandardOmniSettings({
      segment: {
        shotType: 'close-up',
        dialogueLines: [{ line: 'Hello there.' }],
      },
      ingredientCount: 1,
    })
    expect(result.resolution).toBe('1080p')
  })

  it('enables multi-shot and high think for montage', () => {
    const result = optimizeStandardOmniSettings({
      segment: { action: 'A montage series of shots across the city.' },
      sceneHeading: 'MONTAGE',
      ingredientCount: 0,
    })
    expect(result.omniMultiShot).toBe(true)
    expect(result.thinkingLevel).toBe('high')
  })

  it('routes continuation to EXT at 10s', () => {
    const result = optimizeStandardOmniSettings({
      segment: {},
      ingredientCount: 0,
      isContinuation: true,
      hasOmniInteractionRef: true,
    })
    expect(result.method).toBe('EXT')
    expect(result.duration).toBe(10)
  })

  it('defaults Draft/Final Standard takes to 10s even for quiet or short dialogue beats', () => {
    expect(STANDARD_TAKE_DURATION_SECONDS).toBe(10)
    const quiet = optimizeStandardOmniSettings({
      segment: { shotType: 'medium shot' },
      ingredientCount: 0,
    })
    const shortDialogue = optimizeStandardOmniSettings({
      segment: { dialogueLines: [{ line: 'Hi.' }] },
      ingredientCount: 1,
      spokenDurationSeconds: 2,
    })
    const action = optimizeStandardOmniSettings({
      segment: { action: 'A chase through the streets.', cameraMovement: 'tracking' },
      ingredientCount: 0,
    })
    expect(quiet.duration).toBe(10)
    expect(shortDialogue.duration).toBe(10)
    expect(action.duration).toBe(10)
  })
})
