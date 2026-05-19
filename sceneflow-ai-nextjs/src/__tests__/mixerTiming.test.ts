import { describe, it, expect } from 'vitest'
import {
  alignSegmentsToDialogueTimeline,
  clipMatchesDialogueLineId,
  computePlaybackSegmentDuration,
  computeSegmentContentDuration,
  MIXER_DIALOGUE_INTRA_GAP_SEC,
  MIXER_SEGMENT_DIALOGUE_PAUSE_SEC,
} from '@/lib/scene/mixerTiming'
import type { AudioTrackClipV2, SceneSegment } from '@/components/vision/scene-production/types'

function makeSegment(overrides: Partial<SceneSegment> = {}): SceneSegment {
  return {
    segmentId: 'seg-1',
    sequenceIndex: 0,
    startTime: 0,
    endTime: 4,
    imageDuration: 4,
    dialogueLineIds: ['dialogue-0'],
    status: 'COMPLETE',
    ...overrides,
  } as SceneSegment
}

describe('mixerTiming', () => {
  const dialogueClips: AudioTrackClipV2[] = [
    {
      id: 'dialogue-0',
      lineId: 'dialogue-0',
      dialogueIndex: 0,
      duration: 5,
      url: 'https://example.com/a.mp3',
    },
  ]

  it('matches clips by line id or dialogue index', () => {
    expect(clipMatchesDialogueLineId({ id: 'dialogue-0', dialogueIndex: 0 }, 'dialogue-0')).toBe(true)
    expect(clipMatchesDialogueLineId({ id: 'dialogue-0', dialogueIndex: 0 }, 'other')).toBe(false)
  })

  it('extends segment content to dialogue duration', () => {
    const content = computeSegmentContentDuration({
      segment: makeSegment(),
      dialogueClips,
      probedDurations: { 'dialogue-0': 6 },
    })
    expect(content).toBeGreaterThanOrEqual(6)
  })

  it('adds post-dialogue pause on playback duration', () => {
    const playback = computePlaybackSegmentDuration({
      segment: makeSegment(),
      dialogueClips,
      probedDurations: { 'dialogue-0': 5 },
    })
    expect(playback).toBeGreaterThanOrEqual(5 + MIXER_SEGMENT_DIALOGUE_PAUSE_SEC)
  })

  it('rebuilds segment start/end from dialogue', () => {
    const aligned = alignSegmentsToDialogueTimeline({
      segments: [makeSegment()],
      dialogueClips,
      probedDurations: { 'dialogue-0': 5 },
    })
    expect(aligned[0].startTime).toBe(0)
    expect(aligned[0].endTime).toBeGreaterThanOrEqual(5 + MIXER_SEGMENT_DIALOGUE_PAUSE_SEC)
    expect(aligned[0].imageDuration).toBeGreaterThanOrEqual(5)
  })

  it('staggers multiple dialogue lines within a segment', () => {
    const multi = alignSegmentsToDialogueTimeline({
      segments: [
        makeSegment({
          dialogueLineIds: ['dialogue-0', 'dialogue-1'],
        }),
      ],
      dialogueClips: [
        { id: 'dialogue-0', lineId: 'dialogue-0', dialogueIndex: 0, duration: 3 },
        { id: 'dialogue-1', lineId: 'dialogue-1', dialogueIndex: 1, duration: 4 },
      ],
      probedDurations: { 'dialogue-0': 3, 'dialogue-1': 4 },
    })
    const content =
      3 + 4 + MIXER_DIALOGUE_INTRA_GAP_SEC
    expect(multi[0].imageDuration).toBeGreaterThanOrEqual(content)
  })
})
