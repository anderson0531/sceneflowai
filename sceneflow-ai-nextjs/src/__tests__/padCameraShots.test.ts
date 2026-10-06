import { describe, expect, it } from 'vitest'
import {
  deriveBeatDirection,
  padCameraShotsToBeatCount,
} from '@/lib/script/beatDirectionDerive'
import type { SceneBeat } from '@/lib/script/segmentTypes'

describe('padCameraShotsToBeatCount', () => {
  it('pads a short shot list with distinct scales instead of cycling', () => {
    const padded = padCameraShotsToBeatCount(['Wide Shot'], 4)
    expect(padded).toHaveLength(4)
    expect(padded[0]).toBe('Wide Shot')
    expect(new Set(padded).size).toBeGreaterThan(1)
    expect(padded.filter((shot) => shot === 'Wide Shot')).toHaveLength(1)
  })
})

describe('deriveBeatDirection shot coverage', () => {
  it('does not cycle a short camera.shots list onto later beats', () => {
    const beat: SceneBeat = {
      beatId: 'bt_3',
      sequenceIndex: 2,
      kind: 'dialogue',
      character: 'Gideon',
      line: 'Hold still in this close-up.',
    }
    const direction = deriveBeatDirection(beat, 2, {
      sceneDirection: { camera: { shots: ['Wide Shot'] } },
    })
    expect(direction?.shotType).toMatch(/close/i)
  })
})
