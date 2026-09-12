import { describe, it, expect } from 'vitest'
import {
  beatHasStalePromptKey,
  countStalePromptKeys,
  isPreVisStale,
  refreshSceneBeatStillPrompts,
  sceneHasStalePromptKeys,
  stampPreVisContentHash,
} from '@/lib/storyboard/preVisSync'
import { beatStillDirectionFingerprint } from '@/lib/script/beatDirectionFingerprint'
import { getSceneBeats, mintBeatId } from '@/lib/script/beatMigration'
import type { SceneBeat } from '@/lib/script/segmentTypes'

/**
 * The state this is all about: a beat whose stored prompt key was written by an
 * older composer. Nothing about the beat changed; the key it is compared
 * against did, when STILL_FINGERPRINT_VERSION was bumped to still-v2.
 */
const PRE_BUMP_KEY = 'shotType=medium|cameraAngle=low angle|castInFrame=DR. CHEN|keyProps='

function actionBeat(overrides: Partial<SceneBeat> = {}): SceneBeat {
  return {
    beatId: mintBeatId(),
    sequenceIndex: 0,
    kind: 'action',
    actionDescription: 'A scientist tilts the glowing sample toward the light.',
    beatDirection: {
      shotType: 'medium',
      cameraAngle: 'low angle',
      castInFrame: ['DR. CHEN'],
    },
    ...overrides,
  } as SceneBeat
}

function sceneWith(beats: SceneBeat[]): Record<string, unknown> {
  return {
    sceneNumber: 4,
    heading: 'INT. LAB - DAY',
    action: 'A scientist tilts the glowing sample toward the light.',
    beats,
  }
}

describe('beatHasStalePromptKey', () => {
  it('flags a prompt whose key predates the still fingerprint bump', () => {
    const beat = actionBeat({
      storyboardImagePrompt: 'Medium shot, low angle. DR. CHEN tilts the sample.',
      storyboardImagePromptDirectionKey: PRE_BUMP_KEY,
    })

    // The beat's own direction is unchanged — only the key format moved on.
    expect(beat.storyboardImagePromptDirectionKey).not.toBe(
      beatStillDirectionFingerprint(beat.beatDirection)
    )
    expect(beatHasStalePromptKey(beat)).toBe(true)
  })

  it('leaves a prompt keyed to the current composer alone', () => {
    const beat = actionBeat()
    const current = actionBeat({
      storyboardImagePrompt: 'Medium shot, low angle. DR. CHEN tilts the sample.',
      storyboardImagePromptDirectionKey: beatStillDirectionFingerprint(beat.beatDirection),
    })

    expect(beatHasStalePromptKey(current)).toBe(false)
  })

  it('flags a beat that has direction but no prompt at all', () => {
    expect(beatHasStalePromptKey(actionBeat())).toBe(true)
  })

  it('leaves a beat with neither direction nor prompt alone', () => {
    const beat = actionBeat({ beatDirection: undefined })
    expect(beatHasStalePromptKey(beat)).toBe(false)
  })

  it('skips excluded beats, which never compose a frame', () => {
    const beat = actionBeat({
      excluded: true,
      storyboardImagePromptDirectionKey: PRE_BUMP_KEY,
      storyboardImagePrompt: 'Medium shot, low angle.',
    })

    expect(beatHasStalePromptKey(beat)).toBe(false)
  })

  it('flags a prompt written before the key field existed, when direction exists', () => {
    const beat = actionBeat({
      storyboardImagePrompt: 'Some prompt from before keys were recorded.',
    })

    expect(beatHasStalePromptKey(beat)).toBe(true)
  })
})

describe('sceneHasStalePromptKeys', () => {
  it('answers the question the pre-vis content hash cannot', () => {
    const beat = actionBeat({
      storyboardImageUrl: 'https://example.com/frame.jpg',
      storyboardImagePrompt: 'Medium shot, low angle. DR. CHEN tilts the sample.',
      storyboardImagePromptDirectionKey: PRE_BUMP_KEY,
    })
    const scene = stampPreVisContentHash(sceneWith([beat]))

    // Prose has not drifted, so the button that fixes this used to be hidden.
    expect(isPreVisStale(scene)).toBe(false)
    expect(sceneHasStalePromptKeys(scene)).toBe(true)
  })

  it('counts only the beats a refresh would touch', () => {
    const current = actionBeat()
    const scene = sceneWith([
      actionBeat({
        storyboardImagePrompt: 'Stale prompt',
        storyboardImagePromptDirectionKey: PRE_BUMP_KEY,
      }),
      actionBeat({
        sequenceIndex: 1,
        storyboardImagePrompt: 'Current prompt',
        storyboardImagePromptDirectionKey: beatStillDirectionFingerprint(
          current.beatDirection
        ),
      }),
      actionBeat({
        sequenceIndex: 2,
        excluded: true,
        storyboardImagePromptDirectionKey: PRE_BUMP_KEY,
        storyboardImagePrompt: 'Excluded beat prompt',
      }),
    ])

    expect(countStalePromptKeys(scene)).toBe(1)
  })

  it('is false for a scene with no beats', () => {
    expect(sceneHasStalePromptKeys({ sceneNumber: 1, beats: [] })).toBe(false)
  })
})

describe('refreshSceneBeatStillPrompts', () => {
  it('recomposes the stale prompt and restamps it to the current key', () => {
    const beat = actionBeat({
      storyboardImagePrompt: 'Medium shot, low angle. DR. CHEN tilts the sample.',
      storyboardImagePromptDirectionKey: PRE_BUMP_KEY,
    })
    const { scene, promptsUpdated } = refreshSceneBeatStillPrompts(sceneWith([beat]), {
      sceneNumber: 4,
    })

    expect(promptsUpdated).toBe(1)
    const refreshed = getSceneBeats(scene)[0]
    expect(refreshed.storyboardImagePromptDirectionKey).toBe(
      beatStillDirectionFingerprint(beat.beatDirection)
    )
    expect(refreshed.storyboardImagePrompt?.trim()).toBeTruthy()
    expect(sceneHasStalePromptKeys(scene)).toBe(false)
  })

  it('keeps the frame a refreshed prompt no longer describes', () => {
    const beat = actionBeat({
      storyboardImageUrl: 'https://example.com/frame.jpg',
      storyboardImageGcsPath: 'gs://bucket/frame.jpg',
      storyboardImagePrompt: 'Medium shot, low angle.',
      storyboardImagePromptDirectionKey: PRE_BUMP_KEY,
    })
    const { scene } = refreshSceneBeatStillPrompts(sceneWith([beat]), { sceneNumber: 4 })
    const refreshed = getSceneBeats(scene)[0]

    // Re-rendering costs credits, so it stays the user's call — the frame just
    // starts reading as out of sync with the prompt beside it.
    expect(refreshed.storyboardImageUrl).toBe('https://example.com/frame.jpg')
    expect(refreshed.storyboardImageGcsPath).toBe('gs://bucket/frame.jpg')
  })

  it('leaves the Director\u2019s Console segments and the pre-vis stamp in place', () => {
    const beat = actionBeat({
      storyboardImagePrompt: 'Medium shot, low angle.',
      storyboardImagePromptDirectionKey: PRE_BUMP_KEY,
    })
    const base = stampPreVisContentHash({
      ...sceneWith([beat]),
      segments: [{ segmentId: 'seg-1' }],
    })

    const { scene } = refreshSceneBeatStillPrompts(base, { sceneNumber: 4 })

    expect(scene.segments).toEqual([{ segmentId: 'seg-1' }])
    expect(scene.preVisBasedOnContentHash).toBe(base.preVisBasedOnContentHash)
    expect(scene.storyboardStatus).toBeUndefined()
  })

  it('returns the scene untouched when every prompt is already current', () => {
    const beat = actionBeat()
    const scene = sceneWith([
      actionBeat({
        storyboardImagePrompt: 'Current prompt',
        storyboardImagePromptDirectionKey: beatStillDirectionFingerprint(
          beat.beatDirection
        ),
      }),
    ])

    const result = refreshSceneBeatStillPrompts(scene, { sceneNumber: 4 })

    expect(result.promptsUpdated).toBe(0)
    expect(result.scene).toBe(scene)
  })

  it('is a no-op for a scene with no beats', () => {
    const scene = { sceneNumber: 1, beats: [] }
    expect(refreshSceneBeatStillPrompts(scene).promptsUpdated).toBe(0)
  })
})
