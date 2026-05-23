import { describe, it, expect } from 'vitest'
import {
  buildStoryboardVoiceClips,
  buildStoryboardVisualTimeline,
} from '@/lib/storyboard/types'

const NARRATION_URL = 'https://example.com/narration.mp3'
const SARAH_URL = 'https://example.com/sarah.mp3'

describe('buildStoryboardVoiceClips', () => {
  it('uses script dialogueIndex for clip ids when narrator occupies array index 0', () => {
    const scene = {
      narrationAudioUrl: NARRATION_URL,
      narrationAudio: { en: { url: NARRATION_URL, duration: 4 } },
      dialogue: [
        { character: 'Sarah', line: 'Hello there.' },
        { character: 'Bob', line: 'Hi Sarah.' },
      ],
      dialogueAudio: {
        en: [
          {
            kind: 'narration',
            characterId: 'narrator',
            audioUrl: NARRATION_URL,
          },
          {
            character: 'Sarah',
            dialogueIndex: 0,
            audioUrl: SARAH_URL,
            duration: 2.5,
          },
        ],
      },
    }

    const clips = buildStoryboardVoiceClips(scene, 'en', {
      [NARRATION_URL]: 4,
      [SARAH_URL]: 2.5,
    })

    const narrationClip = clips.find((c) => c.id === 'narration')
    expect(narrationClip?.url).toBe(NARRATION_URL)

    const dialogueClips = clips.filter((c) => c.type === 'dialogue')
    expect(dialogueClips).toHaveLength(1)
    expect(dialogueClips[0].id).toBe('dialogue-0')
    expect(dialogueClips[0].dialogueIndex).toBe(0)
    expect(dialogueClips[0].url).toBe(SARAH_URL)
    expect(dialogueClips[0].label).toBe('Sarah')

    const visualFrames = buildStoryboardVisualTimeline(scene, clips)
    const sarahFrame = visualFrames.find((f) => f.dialogueIndex === 0)
    expect(sarahFrame?.character).toBe('Sarah')
    expect(sarahFrame?.line).toBe('Hello there.')
  })

  it('sorts dialogue clips by dialogueIndex when array order differs', () => {
    const scene = {
      dialogue: [
        { character: 'Sarah', line: 'First.' },
        { character: 'Bob', line: 'Second.' },
      ],
      dialogueAudio: {
        en: [
          {
            character: 'Bob',
            dialogueIndex: 1,
            audioUrl: 'https://example.com/bob.mp3',
            duration: 2,
          },
          {
            character: 'Sarah',
            dialogueIndex: 0,
            audioUrl: SARAH_URL,
            duration: 2,
          },
        ],
      },
    }

    const clips = buildStoryboardVoiceClips(scene, 'en')
    const dialogueClips = clips.filter((c) => c.type === 'dialogue')

    expect(dialogueClips.map((c) => c.id)).toEqual(['dialogue-0', 'dialogue-1'])
    expect(dialogueClips[0].startTime).toBeLessThan(dialogueClips[1].startTime)
  })
})
