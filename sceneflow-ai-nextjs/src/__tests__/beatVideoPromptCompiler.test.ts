import { describe, expect, it } from 'vitest'
import {
  compileBeatVideoPrompt,
  compileBeatVideoPromptFromDirection,
} from '@/lib/scene/beatVideoPromptCompiler'
import type { SceneBeat } from '@/lib/script/segmentTypes'
import type { DetailedSceneDirection } from '@/types/scene-direction'

const dialogueBeat: SceneBeat = {
  beatId: 'beat_1',
  sequenceIndex: 0,
  kind: 'dialogue',
  character: 'SARAH',
  line: 'We need to leave now.',
}

const actionBeat: SceneBeat = {
  beatId: 'beat_2',
  sequenceIndex: 1,
  kind: 'action',
  actionDescription: 'Sarah slams the door and runs down the hallway.',
}

describe('compileBeatVideoPromptFromDirection', () => {
  it('uses segmentPromptBundle videoPrompt for dialogue beats', () => {
    const direction: DetailedSceneDirection = {
      camera: { shots: [], angle: '', movement: 'Dolly in', lensChoice: '', focus: '' },
      lighting: {
        overallMood: 'Low-Key',
        timeOfDay: '',
        keyLight: '',
        fillLight: '',
        backlight: '',
        practicals: '',
        colorTemperature: '',
      },
      scene: { location: '', keyProps: [], atmosphere: '' },
      talent: { blocking: '', keyActions: [], emotionalBeat: '' },
      audio: { priorities: '', considerations: '' },
      segmentPromptBundle: [
        {
          timelineIndex: 0,
          kind: 'dialogue',
          character: 'SARAH',
          lineText: 'We need to leave now.',
          segmentDirectionSummary: 'Urgent escape beat.',
          startFramePrompt: '',
          endFramePrompt: '',
          videoPrompt: 'Sarah turns sharply toward the exit with rising panic.',
        },
      ],
    }

    const result = compileBeatVideoPromptFromDirection(dialogueBeat, direction)
    expect(result.prompt).toContain('Urgent escape beat.')
    expect(result.prompt).toContain('Sarah turns sharply toward the exit with rising panic.')
    expect(result.prompt).toContain('Dolly in')
  })

  it('combines action description with scene camera hints', () => {
    const direction: DetailedSceneDirection = {
      camera: {
        shots: ['Wide Shot'],
        angle: '',
        movement: 'Handheld',
        lensChoice: '',
        focus: '',
      },
      lighting: {
        overallMood: 'Hard & Dramatic',
        timeOfDay: '',
        keyLight: '',
        fillLight: '',
        backlight: '',
        practicals: '',
        colorTemperature: '',
      },
      scene: { location: '', keyProps: [], atmosphere: '' },
      talent: { blocking: '', keyActions: [], emotionalBeat: 'Suppressed anger' },
      audio: { priorities: '', considerations: '' },
    }

    const result = compileBeatVideoPromptFromDirection(actionBeat, direction)
    expect(result.prompt).toContain('Sarah slams the door')
    expect(result.prompt).toContain('Handheld')
    expect(result.prompt).toContain('Wide Shot')
  })

  it('falls back to compileBeatVideoPrompt when no direction bundle match', () => {
    const fallback = compileBeatVideoPrompt(dialogueBeat)
    const result = compileBeatVideoPromptFromDirection(dialogueBeat, null)
    expect(result.prompt).toBe(fallback.prompt)
  })
})
