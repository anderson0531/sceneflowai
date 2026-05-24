import { describe, it, expect } from 'vitest'
import {
  deriveSegmentsFromBeats,
  applyBeatSplitAndDerive,
} from '@/lib/scene/deriveSegmentsFromBeats'
import type { SceneBeat } from '@/lib/script/segmentTypes'

const approvedScene = (beats: SceneBeat[]) => ({
  storyboardStatus: 'approved' as const,
  beats: beats.map((b) => ({
    ...b,
    storyboardImageUrl: b.storyboardImageUrl ?? 'https://example.com/frame.jpg',
  })),
})

describe('deriveSegmentsFromBeats', () => {
  it('derives one segment per beat in sequence order', () => {
    const beats: SceneBeat[] = [
      {
        beatId: 'bt_1',
        sequenceIndex: 0,
        kind: 'action',
        actionDescription: 'Establishing',
      },
      {
        beatId: 'bt_2',
        sequenceIndex: 1,
        kind: 'dialogue',
        character: 'Sarah',
        line: 'Hello there.',
        lineId: 'ln_1',
        durationSeconds: 4,
      },
    ]
    const result = deriveSegmentsFromBeats(approvedScene(beats))
    expect(result.errors).toHaveLength(0)
    expect(result.segments).toHaveLength(2)
    expect(result.segments[0].beatId).toBe('bt_1')
    expect(result.segments[0].generationMethod).toBe('I2V')
    expect(result.segments[0].references?.startFrameUrl).toContain('example.com')
    expect(result.segments[1].beatId).toBe('bt_2')
  })

  it('rejects derivation when storyboard is not approved', () => {
    const scene = approvedScene([
      {
        beatId: 'bt_1',
        sequenceIndex: 0,
        kind: 'action',
        actionDescription: 'Test',
      },
    ])
    scene.storyboardStatus = 'pending_review'
    const result = deriveSegmentsFromBeats(scene)
    expect(result.segments).toHaveLength(0)
    expect(result.errors[0]).toMatch(/approved/i)
  })

  it('splits spoken beats when needsSplit and splitRecommendation are set', () => {
    const longLine =
      'We have to move now before they find us at the warehouse loading dock tonight. '.repeat(2)
    const scene = approvedScene([
      {
        beatId: 'bt_dialogue',
        sequenceIndex: 0,
        kind: 'dialogue',
        character: 'Bob',
        line: longLine,
        lineId: 'ln_1',
        durationSeconds: 12,
      },
    ])
    const result = applyBeatSplitAndDerive(scene, 'bt_dialogue')
    expect(result.errors).toHaveLength(0)
    expect(result.segments.length).toBeGreaterThan(1)
    const continuation = result.segments.find((s) => s.veoTimelineContinuation)
    expect(continuation?.transitionType).toBe('CONTINUE')
    expect(continuation?.dialoguePortion?.partIndex).toBeGreaterThan(0)
  })

  it('applyBeatSplitAndDerive updates scene beats and returns segments', () => {
    const longLine =
      'We have to move now before they find us at the warehouse loading dock tonight. '.repeat(3)
    const scene = approvedScene([
      {
        beatId: 'bt_long',
        sequenceIndex: 0,
        kind: 'dialogue',
        character: 'Sarah',
        line: longLine,
        lineId: 'ln_long',
      },
    ])
    const result = applyBeatSplitAndDerive(scene, 'bt_long')
    expect(result.errors).toHaveLength(0)
    expect(result.segments.length).toBeGreaterThan(1)
    expect(result.updatedScene).toBeDefined()
    const updatedBeat = (result.updatedScene?.beats as SceneBeat[])?.find(
      (b) => b.beatId === 'bt_long'
    )
    expect(updatedBeat?.needsSplit).toBe(true)
    expect(updatedBeat?.splitRecommendation?.partCount).toBeGreaterThan(1)
  })
})
