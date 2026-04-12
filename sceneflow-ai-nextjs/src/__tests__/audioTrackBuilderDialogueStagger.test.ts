import { describe, it, expect } from 'vitest'
import { buildAudioTracksForLanguage, AUDIO_ALIGNMENT_BUFFERS } from '@/components/vision/scene-production/audioTrackBuilder'

describe('buildAudioTracksForLanguage dialogue stagger after segment anchors', () => {
  it('does not overlap consecutive lines when segment windows are tighter than TTS duration', () => {
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
    expect(tracks.dialogue.length).toBe(2)
    const [a, b] = tracks.dialogue
    const buf = AUDIO_ALIGNMENT_BUFFERS.INTER_CLIP_BUFFER
    expect(a.startTime + a.duration + buf).toBeLessThanOrEqual(b.startTime + 1e-6)
  })
})
