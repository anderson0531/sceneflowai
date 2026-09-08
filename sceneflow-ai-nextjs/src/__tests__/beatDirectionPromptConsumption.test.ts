import { describe, expect, it } from 'vitest'
import { compileBeatVideoPromptFromDirection } from '@/lib/scene/beatVideoPromptCompiler'
import {
  buildSceneImageSystemPrompt,
  buildSceneImageIntelligenceUserPrompt,
  buildSceneImageCacheKey,
  type SceneImageIntelligenceRequest,
} from '@/lib/intelligence/scene-image-intelligence'
import { resolveBeatDirectedEmotion } from '@/lib/scene/performanceCues'
import type { SceneBeat, BeatDirection } from '@/lib/script/segmentTypes'
import type { DetailedSceneDirection } from '@/types/scene-direction'

const baseSceneDirection: DetailedSceneDirection = {
  camera: {
    shots: ['Wide'],
    angle: 'eye-level',
    movement: 'Slow drift',
    lensChoice: '',
    focus: '',
  },
  lighting: {
    overallMood: 'Cool blue',
    timeOfDay: '',
    keyLight: '',
    fillLight: '',
    backlight: '',
    practicals: '',
    colorTemperature: '',
  },
  scene: { location: '', keyProps: [], atmosphere: '' },
  talent: { blocking: '', keyActions: [], emotionalBeat: 'Calm' },
  audio: { priorities: '', considerations: '' },
}

function actionBeat(direction?: BeatDirection): SceneBeat {
  return {
    beatId: 'b1',
    sequenceIndex: 0,
    kind: 'action',
    actionDescription: 'Elara raises the journal.',
    beatDirection: direction,
  }
}

describe('compileBeatVideoPromptFromDirection prefers beat direction over scene direction', () => {
  it('inserts beat cameraMovement + shotType + blocking ahead of scene-level hints', () => {
    const beat = actionBeat({
      shotType: 'Insert Shot',
      cameraMovement: 'handheld push-in',
      blocking: 'she brings the journal to her chest',
    })
    const result = compileBeatVideoPromptFromDirection(beat, baseSceneDirection)
    expect(result.prompt).toContain('handheld push-in')
    expect(result.prompt).toContain('Insert Shot')
    expect(result.prompt).toContain('brings the journal to her chest')
  })

  it('adds beat emotion to dialogue beats even without a bundle match', () => {
    const beat: SceneBeat = {
      beatId: 'b_line',
      sequenceIndex: 0,
      kind: 'dialogue',
      character: 'ELARA',
      line: 'Ready.',
      beatDirection: {
        emotion: 'hypnotic awe',
        blocking: 'she leans over the console',
      },
    }
    const result = compileBeatVideoPromptFromDirection(beat, baseSceneDirection)
    expect(result.prompt).toMatch(/hypnotic awe/)
    expect(result.prompt).toMatch(/leans over the console/)
  })

  it('does not duplicate beat hints that already appear in the segment bundle prompt', () => {
    const beat: SceneBeat = {
      beatId: 'b1',
      sequenceIndex: 0,
      kind: 'dialogue',
      character: 'ELARA',
      line: 'Ready.',
      beatDirection: {
        shotType: 'Medium Close-Up',
      },
    }
    const direction: DetailedSceneDirection = {
      ...baseSceneDirection,
      segmentPromptBundle: [
        {
          timelineIndex: 0,
          kind: 'dialogue',
          character: 'ELARA',
          lineText: 'Ready.',
          segmentDirectionSummary: 'A confident readiness beat.',
          startFramePrompt: '',
          endFramePrompt: '',
          videoPrompt: 'Medium Close-Up of ELARA as she says the line calmly.',
        },
      ],
    }
    const result = compileBeatVideoPromptFromDirection(beat, direction)
    expect(result.prompt.match(/Medium Close-Up/g)?.length).toBe(1)
  })
})

describe('resolveBeatDirectedEmotion prefers explicit beat direction', () => {
  it('returns beat direction emotion when provided', () => {
    const emotion = resolveBeatDirectedEmotion({
      beatDirectionEmotion: 'hypnotic awe',
      beatLine: '[neutral] Ready.',
      beatAction: 'She stares at the pulse.',
    })
    expect(emotion).toMatch(/hypnotic awe/)
  })

  it('falls back to inferred emotion when beat direction has none', () => {
    const emotion = resolveBeatDirectedEmotion({
      beatLine: '[angry] Ready.',
    })
    expect(emotion).toMatch(/angry/i)
  })
})

describe('scene-image-intelligence prompts include beat direction authority', () => {
  const beatDirectionRequest: SceneImageIntelligenceRequest = {
    sceneHeading: 'INT. CONTROL ROOM - NIGHT',
    sceneAction: 'Elara studies the console.',
    sceneNumber: 1,
    totalScenes: 3,
    sceneType: 'action',
    beatKind: 'action',
    beatIndex: 0,
    totalBeats: 1,
    beatAction: 'Elara raises the journal.',
    characters: [
      {
        name: 'Elara',
        description: 'protagonist',
        appearanceDescription: 'red hair',
        wardrobe: 'jumpsuit',
      },
    ],
    props: [],
    referenceImageCount: 0,
    beatDirection: {
      shotType: 'Insert Shot',
      cameraAngle: 'low angle',
      blocking: 'Elara leans into the console with the journal in her left hand',
      emotion: 'hypnotic awe',
      gaze: 'toward the pulse',
      keyProps: ['Water-damaged leather journal'],
      propInteraction: 'grips journal one-handed against sternum',
      lightingAccent: 'teal accent underlighting Elara',
      frozenMoment: 'Journal pressed to the pulse, Elara mid-breath.',
    },
  }

  it('system prompt declares beat direction authoritative', () => {
    const system = buildSceneImageSystemPrompt()
    expect(system).toContain('BEAT DIRECTION IS AUTHORITATIVE')
  })

  it('user prompt inlines beat direction fields with an AUTHORITATIVE banner', () => {
    const user = buildSceneImageIntelligenceUserPrompt(beatDirectionRequest)
    expect(user).toContain('BEAT DIRECTION (AUTHORITATIVE FOR THIS BEAT')
    expect(user).toContain('Shot type: Insert Shot')
    expect(user).toContain('Camera angle: low angle')
    expect(user).toContain('Blocking: Elara leans into the console')
    expect(user).toContain('Emotion (render on primary subject): hypnotic awe')
    expect(user).toContain('Gaze: toward the pulse')
    expect(user).toContain(
      'Beat key props (subset of scene props — only show these): Water-damaged leather journal'
    )
    expect(user).toContain('Prop interaction: grips journal one-handed against sternum')
    expect(user).toContain('Lighting accent: teal accent underlighting Elara')
    expect(user).toContain('Frozen moment: Journal pressed to the pulse')
  })

  it('cache key differs when beatDirection changes', () => {
    const base: SceneImageIntelligenceRequest = {
      sceneHeading: 'INT. CONTROL ROOM - NIGHT',
      sceneAction: 'action',
      sceneNumber: 1,
      sceneType: 'action',
      characters: [],
      props: [],
      referenceImageCount: 0,
      beatKind: 'action',
      totalBeats: 1,
      beatIndex: 0,
      beatAction: 'lifts journal',
    }
    const keyA = buildSceneImageCacheKey({
      ...base,
      beatDirection: { shotType: 'Insert Shot' },
    })
    const keyB = buildSceneImageCacheKey({
      ...base,
      beatDirection: { shotType: 'Wide Shot' },
    })
    expect(keyA).not.toBe(keyB)
  })
})
