import { describe, it, expect } from 'vitest'
import {
  buildAudioTracksForLanguage,
  buildDialogueLineIdToCumulativeTimelineStart,
} from '@/components/vision/scene-production/audioTrackBuilder'

describe('dialogue audio vs video segment alignment (cumulative timeline)', () => {
  it('snaps dialogue starts to cumulative segment boundaries, not raw scene startTime', () => {
    const scene = {
      dialogue: [
        { character: 'DOC', text: 'First' },
        { character: 'DOC', text: 'Second' },
      ],
      dialogueAudio: {
        en: [
          { audioUrl: 'https://example.com/d0.mp3', duration: 25, dialogueIndex: 0 },
          { audioUrl: 'https://example.com/d1.mp3', duration: 31, dialogueIndex: 1 },
        ],
      },
      segments: [
        {
          sequenceIndex: 0,
          startTime: 15,
          endTime: 23,
          dialogueLineIds: ['dialogue-0'],
        },
        {
          sequenceIndex: 1,
          startTime: 18,
          endTime: 26,
          dialogueLineIds: ['dialogue-1'],
        },
      ],
    }

    const tracks = buildAudioTracksForLanguage(scene, 'en', {
      packDialogueToSegmentTimeline: true,
    })
    expect(tracks.dialogue.length).toBe(2)
    const byIdx = [...tracks.dialogue].sort(
      (a, b) => (a.dialogueIndex ?? 0) - (b.dialogueIndex ?? 0)
    )
    // Segment durations 8s + 8s → line0 at 0s, line1 at 8s (matches purple video row)
    expect(byIdx[0].startTime).toBeCloseTo(0, 5)
    expect(byIdx[1].startTime).toBeCloseTo(8, 5)
  })

  it('baseline language keeps sequential dialogue starts when pack is off (generation timing)', () => {
    const scene = {
      dialogue: [
        { character: 'DOC', text: 'First' },
        { character: 'DOC', text: 'Second' },
      ],
      dialogueAudio: {
        en: [
          { audioUrl: 'https://example.com/d0.mp3', duration: 25, dialogueIndex: 0 },
          { audioUrl: 'https://example.com/d1.mp3', duration: 31, dialogueIndex: 1 },
        ],
      },
      segments: [
        {
          sequenceIndex: 0,
          startTime: 15,
          endTime: 23,
          dialogueLineIds: ['dialogue-0'],
        },
        {
          sequenceIndex: 1,
          startTime: 18,
          endTime: 26,
          dialogueLineIds: ['dialogue-1'],
        },
      ],
    }

    const tracks = buildAudioTracksForLanguage(scene, 'en')
    const byIdx = [...tracks.dialogue].sort(
      (a, b) => (a.dialogueIndex ?? 0) - (b.dialogueIndex ?? 0)
    )
    expect(byIdx[0].startTime).toBeCloseTo(0, 5)
    // 25s first clip + INTER_CLIP_BUFFER (2s) from AUDIO_ALIGNMENT_BUFFERS
    expect(byIdx[1].startTime).toBeCloseTo(27, 5)
  })

  it('remaps legacy dialogueLineIds that used combined-timeline indices (after narration sentences)', () => {
    const scene = {
      narration: 'First sentence. Second sentence.',
      dialogue: [{ character: 'DOC', text: 'Line' }],
      dialogueAudio: {
        en: [{ audioUrl: 'https://example.com/d0.mp3', duration: 10, dialogueIndex: 0 }],
      },
      segments: [
        { sequenceIndex: 0, startTime: 0, endTime: 8, dialogueLineIds: [] },
        {
          sequenceIndex: 1,
          startTime: 8,
          endTime: 16,
          // Buggy persistence: timeline index 2 for first script line (2 VO lines precede dialogue in combined timeline)
          dialogueLineIds: ['dialogue-2'],
        },
      ],
    }
    const tracks = buildAudioTracksForLanguage(scene, 'en', {
      packDialogueToSegmentTimeline: true,
    })
    const d0 = tracks.dialogue.find(c => c.dialogueIndex === 0)
    expect(d0?.startTime).toBeCloseTo(8, 5)
  })

  it('buildDialogueLineIdToCumulativeTimelineStart adds playback offset per segment', () => {
    const scene = {
      segments: [
        { sequenceIndex: 0, startTime: 0, endTime: 4, dialogueLineIds: ['dialogue-0'] },
        { sequenceIndex: 1, startTime: 4, endTime: 8, dialogueLineIds: ['dialogue-1'] },
      ],
    }
    const map = buildDialogueLineIdToCumulativeTimelineStart(scene, 0.5)
    expect(map.get('dialogue-0')).toBe(0)
    expect(map.get('dialogue-1')).toBeCloseTo(4.5, 5)
  })
})
