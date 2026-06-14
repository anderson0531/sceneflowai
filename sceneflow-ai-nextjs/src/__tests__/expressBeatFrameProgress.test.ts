import { describe, expect, it } from 'vitest'
import {
  buildExpressBeatFrameItems,
  countCompletedFrames,
  estimateRemainingSec,
  formatEta,
  slotKeyFromBeat,
  updateBeatFrameItemStatus,
} from '@/lib/storyboard/expressBeatFrameProgress'

describe('expressBeatFrameProgress', () => {
  const scene = {
    beats: [
      {
        beatId: 'b1',
        kind: 'action',
        sequenceIndex: 0,
        actionDescription: 'Wide establishing shot',
      },
      {
        beatId: 'b2',
        kind: 'dialogue',
        sequenceIndex: 1,
        character: 'Alex',
        line: 'Hello there.',
        storyboardImageUrl: 'https://example.com/b2.jpg',
      },
    ],
  }

  it('buildExpressBeatFrameItems filters by selectedFrameKeys', () => {
    const items = buildExpressBeatFrameItems(scene, {
      selectedFrameKeys: ['b1'],
      includeEndFrames: false,
    })
    expect(items).toHaveLength(1)
    expect(items[0]?.key).toBe('b1')
    expect(items[0]?.status).toBe('pending')
  })

  it('buildExpressBeatFrameItems uses missingOnly generation rules without selected keys', () => {
    const items = buildExpressBeatFrameItems(scene, {
      scope: 'missing',
      includeEndFrames: false,
      storyboardQuality: 'draft',
    })
    expect(items.map((item) => item.key)).toEqual(['b1'])
  })

  it('slotKeyFromBeat maps beat index and frame role to slot keys', () => {
    expect(slotKeyFromBeat(scene, 0, 'start')).toBe('b1')
    expect(slotKeyFromBeat(scene, 0, 'end')).toBe('b1-end')
    expect(slotKeyFromBeat(scene, 1, 'start')).toBe('b2')
  })

  it('updateBeatFrameItemStatus updates a single row', () => {
    const items = buildExpressBeatFrameItems(scene, { selectedFrameKeys: ['b1'] })
    const updated = updateBeatFrameItemStatus(items, 'b1', 'done')
    expect(updated[0]?.status).toBe('done')
  })

  it('countCompletedFrames counts done rows only', () => {
    const items = buildExpressBeatFrameItems(scene, { selectedFrameKeys: ['b1', 'b2'] })
    const updated = updateBeatFrameItemStatus(items, 'b1', 'done')
    expect(countCompletedFrames(updated)).toBe(1)
  })

  it('estimateRemainingSec uses frame rate after first completion', () => {
    expect(
      estimateRemainingSec({
        elapsedSec: 20,
        completedFrames: 2,
        totalFrames: 5,
        currentPhase: 'image',
        imagePhaseStarted: true,
      })
    ).toBe(30)
  })

  it('estimateRemainingSec returns conservative default before first frame', () => {
    expect(
      estimateRemainingSec({
        elapsedSec: 5,
        completedFrames: 0,
        totalFrames: 3,
        currentPhase: 'image',
        imagePhaseStarted: true,
      })
    ).toBe(24)
  })

  it('formatEta renders human-readable strings', () => {
    expect(formatEta(null)).toBe('Estimating…')
    expect(formatEta(0)).toBe('Almost done')
    expect(formatEta(45)).toBe('~45s remaining')
    expect(formatEta(120)).toBe('~2 min remaining')
  })
})
