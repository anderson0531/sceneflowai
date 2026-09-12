import { describe, expect, it } from 'vitest'
import {
  deriveBeatDirection,
  backfillBeatDirectionsOnScene,
} from '@/lib/script/beatDirectionDerive'
import {
  isProjectBeatDirectionMigrated,
  migrateProjectBeatDirection,
  migrateProjectBeatSetContext,
} from '@/lib/script/beatMigration'
import type { SceneBeat } from '@/lib/script/segmentTypes'

const sceneDirection = {
  sceneDescription: 'An abandoned control room hums back to life.',
  camera: {
    shots: ['Wide Establishing', 'Medium Close-Up', 'Insert Shot'],
    angle: 'eye-level',
    movement: 'slow push-in',
  },
  scene: {
    location: 'Abandoned Control Room',
    atmosphere: 'anxious',
    keyProps: ['Water-damaged leather journal', 'Brass energy core'],
  },
  lighting: {
    overallMood: 'cold, teal-cyan accents',
    colorTemperature: 'cool',
  },
  talent: {
    blocking: 'Elara faces the console, Gideon watches from behind',
    emotionalBeat: 'wary determination',
  },
  audio: {
    priorities: 'low hum + proximity timer chirps',
  },
  keyProps: ['Water-damaged leather journal', 'Brass energy core'],
} as const

function actionBeat(overrides: Partial<SceneBeat> = {}): SceneBeat {
  return {
    beatId: 'b1',
    sequenceIndex: 0,
    kind: 'action',
    actionDescription: 'Elara lifts the Water-damaged leather journal toward the console.',
    ...overrides,
  }
}

describe('deriveBeatDirection', () => {
  it('fills shotType from scene direction camera shots by beat index', () => {
    const derived = deriveBeatDirection(actionBeat(), 1, { sceneDirection })
    expect(derived?.shotType).toBe('Medium Close-Up')
  })

  it('fills blocking/emotion/lighting from scene direction metadata', () => {
    const derived = deriveBeatDirection(actionBeat(), 0, { sceneDirection })
    expect(derived?.blocking).toMatch(/Elara faces the console/i)
    expect(derived?.emotion).toBeTruthy()
    expect(derived?.lightingAccent).toMatch(/teal|cold/i)
  })

  it('extracts keyProps mentioned in beat action from the scene prop catalog', () => {
    const derived = deriveBeatDirection(actionBeat(), 0, { sceneDirection })
    expect(derived?.keyProps).toEqual(['Water-damaged leather journal'])
  })

  it('derives castInFrame from the scene cast the beat names', () => {
    const scene = { sceneDirection, characters: ['Elara', 'Gideon', 'NARRATOR'] }
    const derived = deriveBeatDirection(
      actionBeat({ actionDescription: 'Elara lifts the journal while Gideon watches.' }),
      0,
      scene
    )
    expect(derived?.castInFrame).toEqual(['Elara', 'Gideon'])
  })

  it('takes a dialogue beat’s cast from its speaker', () => {
    const scene = { sceneDirection, characters: ['Elara', 'Gideon'] }
    const derived = deriveBeatDirection(
      { beatId: 'b2', sequenceIndex: 1, kind: 'dialogue', character: 'ELARA', line: 'Ready.' },
      1,
      scene
    )
    expect(derived?.castInFrame).toEqual(['Elara'])
  })

  it('leaves castInFrame unstated rather than asserting nobody', () => {
    // A backfill cannot tell "no people in this frame" from "the beat used a
    // pronoun". Guessing [] here would strip the cast off every such beat, so
    // an unnamed beat stays on the old heuristics until someone states it.
    const scene = { sceneDirection, characters: ['Elara', 'Gideon'] }
    const derived = deriveBeatDirection(
      actionBeat({ actionDescription: 'She reaches for the lever.' }),
      0,
      scene
    )
    expect(derived?.castInFrame).toBeUndefined()
  })

  it('does not overwrite a stated empty castInFrame', () => {
    const scene = { sceneDirection, characters: ['Elara'] }
    const derived = deriveBeatDirection(
      actionBeat({
        actionDescription: 'Elara’s abandoned console blinks.',
        beatDirection: { castInFrame: [], generatedBy: 'llm' },
      }),
      0,
      scene
    )
    expect(derived?.castInFrame).toEqual([])
  })

  it('does not derive a key prop from a single coincidental word', () => {
    const derived = deriveBeatDirection(
      actionBeat({
        actionDescription: 'Violet light washes over the console as the brass fittings rattle.',
      }),
      0,
      {
        sceneDirection: {
          ...sceneDirection,
          scene: {
            ...sceneDirection.scene,
            keyProps: ['Violet Ink Drafting Vellum', 'Thirty-Inch Iron Rail Spanner'],
          },
          keyProps: ['Violet Ink Drafting Vellum', 'Thirty-Inch Iron Rail Spanner'],
        },
      }
    )
    expect(derived?.keyProps).toBeUndefined()
  })

  it('derives a key prop when the beat action hits several of its words', () => {
    const derived = deriveBeatDirection(
      actionBeat({
        actionDescription: 'Elara unrolls the violet drafting vellum across the console.',
      }),
      0,
      {
        sceneDirection: {
          ...sceneDirection,
          scene: { ...sceneDirection.scene, keyProps: ['Violet Ink Drafting Vellum'] },
          keyProps: ['Violet Ink Drafting Vellum'],
        },
      }
    )
    expect(derived?.keyProps).toEqual(['Violet Ink Drafting Vellum'])
  })

  it('defaults transition to CUT when scene direction is silent', () => {
    const derived = deriveBeatDirection(actionBeat(), 0, { sceneDirection: {} })
    expect(derived?.transition).toBe('CUT')
  })

  it('marks derived provenance when nothing was previously authored', () => {
    const derived = deriveBeatDirection(actionBeat(), 0, { sceneDirection })
    expect(derived?.generatedBy).toBe('derived')
    expect(derived?.updatedAt).toBeTruthy()
  })

  it('preserves LLM-authored fields and only fills gaps', () => {
    const beat = actionBeat({
      beatDirection: {
        shotType: 'Custom Cinematic Insert',
        blocking: 'authored blocking',
        generatedBy: 'llm',
      },
    })
    const derived = deriveBeatDirection(beat, 0, { sceneDirection })
    expect(derived?.shotType).toBe('Custom Cinematic Insert')
    expect(derived?.blocking).toBe('authored blocking')
    expect(derived?.generatedBy).toBe('llm')
    expect(derived?.cameraAngle).toBe('eye-level')
    expect(derived?.cameraMovement).toBe('slow push-in')
  })

  it('does not overwrite user-authored fields', () => {
    const beat = actionBeat({
      beatDirection: {
        shotType: 'Handpicked Wide',
        generatedBy: 'user',
      },
    })
    const derived = deriveBeatDirection(beat, 1, { sceneDirection })
    expect(derived?.shotType).toBe('Handpicked Wide')
    expect(derived?.generatedBy).toBe('user')
  })

  it('parses gaze from action verbs like "looks toward the door"', () => {
    const beat = actionBeat({
      actionDescription: 'Elara looks toward the console.',
    })
    const derived = deriveBeatDirection(beat, 0, { sceneDirection: {} })
    expect(derived?.gaze).toMatch(/toward the console/i)
  })
})

describe('backfillBeatDirectionsOnScene', () => {
  it('applies derived direction to every beat missing one', () => {
    const scene = {
      sceneDirection,
      beats: [
        actionBeat(),
        {
          beatId: 'b2',
          sequenceIndex: 1,
          kind: 'dialogue',
          character: 'ELARA',
          line: 'It still works.',
        } as SceneBeat,
      ],
    }
    const beats = backfillBeatDirectionsOnScene(scene)
    expect(beats[0].beatDirection).toBeDefined()
    expect(beats[1].beatDirection).toBeDefined()
    expect(beats[0].beatDirection?.shotType).toBe('Wide Establishing')
    expect(beats[1].beatDirection?.shotType).toBe('Medium Close-Up')
  })

  it('leaves already-authored direction fields untouched', () => {
    const scene = {
      sceneDirection,
      beats: [
        actionBeat({
          beatDirection: {
            shotType: 'Authored Close-Up',
            blocking: 'authored blocking',
            generatedBy: 'user',
          },
        }),
      ],
    }
    const [beat] = backfillBeatDirectionsOnScene(scene)
    expect(beat.beatDirection?.shotType).toBe('Authored Close-Up')
    expect(beat.beatDirection?.blocking).toBe('authored blocking')
    expect(beat.beatDirection?.generatedBy).toBe('user')
  })
})

describe('migrateProjectBeatDirection', () => {
  function buildMetadata(): Record<string, unknown> {
    return {
      visionPhase: {
        script: {
          script: {
            scenes: [
              {
                heading: 'INT. CONTROL ROOM - NIGHT',
                sceneDirection,
                beats: [actionBeat()],
              },
            ],
          },
        },
      },
    }
  }

  it('backfills direction across all scenes and stamps a migration flag', () => {
    const meta = buildMetadata()
    const result = migrateProjectBeatDirection(meta)

    expect(result.changed).toBe(true)
    expect(result.migratedSceneCount).toBe(1)
    expect(isProjectBeatDirectionMigrated(result.metadata)).toBe(true)

    const nextScene =
      (result.metadata as any).visionPhase.script.script.scenes[0]
    expect(nextScene.beats[0].beatDirection).toBeDefined()
    expect(nextScene.beats[0].beatDirection.shotType).toBe('Wide Establishing')
  })

  it('is idempotent — running again does not change beats', () => {
    const once = migrateProjectBeatDirection(buildMetadata())
    const twice = migrateProjectBeatDirection(once.metadata)
    expect(twice.changed).toBe(false)
    expect(twice.migratedSceneCount).toBe(0)
  })

  it('returns an empty result when metadata has no scenes', () => {
    const result = migrateProjectBeatDirection({ visionPhase: {} })
    expect(result.changed).toBe(false)
    expect(result.migratedSceneCount).toBe(0)
    expect(isProjectBeatDirectionMigrated(result.metadata)).toBe(false)
  })
})

describe('migrateProjectBeatSetContext', () => {
  /** A beat as an earlier bookend dump left it. */
  function dumpedBeat(): SceneBeat {
    return {
      beatId: 'b1',
      sequenceIndex: 0,
      kind: 'action',
      actionDescription:
        'Insert Shot: The console housing sits open, wiring exposed. Abandoned Control Room. anxious. Props: Water-damaged leather journal, Brass energy core. cold, teal-cyan accents, cool',
      beatDirection: {
        shotType: 'Insert Shot',
        frozenMoment:
          'The console housing sits open, wiring exposed. Abandoned Control Room. anxious. Props: Water-damaged leather journal, Brass energy core. anxious',
        keyProps: ['Water-damaged leather journal', 'Brass energy core'],
      },
      storyboardImagePrompt: 'Insert Shot. The console housing sits open. Props in frame: Brass energy core.',
      storyboardImagePromptDirectionKey: 'stale-key',
    }
  }

  function buildMetadata(beats: SceneBeat[]): Record<string, unknown> {
    return {
      visionPhase: {
        script: {
          script: {
            scenes: [{ heading: 'INT. CONTROL ROOM - NIGHT', sceneDirection, beats }],
          },
        },
      },
    }
  }

  function firstBeat(metadata: unknown): SceneBeat {
    return (metadata as any).visionPhase.script.script.scenes[0].beats[0]
  }

  it('drops the scene prop catalog and the lighting grammar from the beat', () => {
    const result = migrateProjectBeatSetContext(buildMetadata([dumpedBeat()]))
    const beat = firstBeat(result.metadata)

    expect(result.changed).toBe(true)
    expect(result.migratedSceneCount).toBe(1)
    expect(beat.actionDescription).not.toMatch(/Props:/)
    expect(beat.actionDescription).not.toMatch(/teal-cyan/)
    expect(beat.beatDirection?.frozenMoment).not.toMatch(/Props:/)
    expect(beat.beatDirection?.keyProps).toEqual([])
  })

  it('keeps the beat action and the set it stands in', () => {
    const beat = firstBeat(migrateProjectBeatSetContext(buildMetadata([dumpedBeat()])).metadata)

    expect(beat.actionDescription).toContain('The console housing sits open, wiring exposed')
    expect(beat.actionDescription).toContain('Abandoned Control Room')
  })

  it('states a repeated clause once', () => {
    const beat = firstBeat(migrateProjectBeatSetContext(buildMetadata([dumpedBeat()])).metadata)

    expect(beat.beatDirection?.frozenMoment?.match(/anxious/g)).toHaveLength(1)
  })

  // The stored prompt was composed from the dumped text, so it no longer
  // describes the direction and has to be recomposed on the next pass.
  it('clears a still prompt composed from the dumped text', () => {
    const beat = firstBeat(migrateProjectBeatSetContext(buildMetadata([dumpedBeat()])).metadata)

    expect(beat.storyboardImagePrompt).toBeUndefined()
    expect(beat.storyboardImagePromptDirectionKey).toBeUndefined()
  })

  it('is idempotent', () => {
    const once = migrateProjectBeatSetContext(buildMetadata([dumpedBeat()]))
    const twice = migrateProjectBeatSetContext(once.metadata)

    expect(twice.changed).toBe(false)
    expect(twice.migratedSceneCount).toBe(0)
  })

  it('leaves a beat that was never dumped on alone', () => {
    const clean: SceneBeat = {
      beatId: 'b2',
      sequenceIndex: 0,
      kind: 'action',
      actionDescription: 'Elara lifts the Water-damaged leather journal toward the console.',
      beatDirection: {
        shotType: 'Medium Close-Up',
        frozenMoment: 'Elara lifts the journal toward the console',
        keyProps: ['Water-damaged leather journal'],
      },
      storyboardImagePrompt: 'Medium Close-Up. Elara lifts the journal.',
    }
    const result = migrateProjectBeatSetContext(buildMetadata([clean]))

    expect(result.changed).toBe(false)
    expect(firstBeat(result.metadata).storyboardImagePrompt).toBe(clean.storyboardImagePrompt)
  })

  it('keeps an atmosphere a writer put in the beat action', () => {
    const authored: SceneBeat = {
      beatId: 'b3',
      sequenceIndex: 0,
      kind: 'action',
      actionDescription: 'Elara scans the room, anxious about what the readout will say.',
    }
    const result = migrateProjectBeatSetContext(buildMetadata([authored]))

    expect(result.changed).toBe(false)
    expect(firstBeat(result.metadata).actionDescription).toBe(authored.actionDescription)
  })
})
