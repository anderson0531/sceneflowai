import { describe, expect, it } from 'vitest'
import {
  deriveBeatDirection,
  backfillBeatDirectionsOnScene,
} from '@/lib/script/beatDirectionDerive'
import {
  isProjectBeatDirectionMigrated,
  migrateProjectBeatDirection,
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
