import { describe, it, expect } from 'vitest'
import {
  generatePreVisContentHash,
  generateLegacyPreVisContentHash,
  isPreVisStale,
  syncPreVisToScript,
  stampPreVisContentHash,
  restampPreVisHashIfScriptCurrent,
  PRE_VIS_CONTENT_HASH_FIELD,
} from '@/lib/storyboard/preVisSync'
import { mergeScenePreservingMedia } from '@/lib/storyboard/mergeSceneMedia'
import { sceneNeedsExpressWork } from '@/lib/sceneGeneration/sceneExpressPreflight'
import { mintBeatId } from '@/lib/script/beatMigration'

const baseScene = {
  sceneNumber: 1,
  heading: 'INT. LAB - DAY',
  action: 'A scientist examines a glowing sample.',
  dialogue: [
    { character: 'DR. CHEN', line: 'The readings are off the charts.' },
  ],
  beats: [
    {
      beatId: mintBeatId(),
      sequenceIndex: 0,
      kind: 'action',
      actionDescription: 'A scientist examines a glowing sample.',
      storyboardImageUrl: 'https://example.com/frame-1.jpg',
      storyboardImagePrompt: 'Old prompt about sample',
    },
    {
      beatId: mintBeatId(),
      sequenceIndex: 1,
      kind: 'dialogue',
      character: 'DR. CHEN',
      line: 'The readings are off the charts.',
      storyboardImageUrl: 'https://example.com/frame-2.jpg',
      storyboardImagePrompt: 'Old dialogue prompt',
    },
  ],
  dialogueAudio: {
    en: [
      {
        dialogueIndex: 0,
        character: 'DR. CHEN',
        audioUrl: 'https://example.com/audio-1.mp3',
      },
    ],
  },
}

describe('preVisSync', () => {
  it('isPreVisStale is true when script changed after pre-vis hash was stored', () => {
    const scene = {
      ...baseScene,
      [PRE_VIS_CONTENT_HASH_FIELD]: generatePreVisContentHash({
        ...baseScene,
        dialogue: [{ character: 'DR. CHEN', line: 'Original line.' }],
        beats: baseScene.beats.map((beat, i) =>
          i === 1 ? { ...beat, line: 'Original line.' } : beat
        ),
      }),
    }

    expect(isPreVisStale(scene)).toBe(true)
  })

  it('isPreVisStale is false when hash matches current content', () => {
    const scene = {
      ...baseScene,
      [PRE_VIS_CONTENT_HASH_FIELD]: generatePreVisContentHash(baseScene),
    }

    expect(isPreVisStale(scene)).toBe(false)
  })

  it('syncPreVisToScript updates prompts and clears changed beat images', () => {
    const staleBeatId = baseScene.beats[1].beatId
    const scene = {
      ...baseScene,
      dialogue: [{ character: 'DR. CHEN', line: 'The readings are off the charts.' }],
      beats: [
        {
          ...baseScene.beats[0],
          actionDescription: undefined,
          description: 'A scientist drops the glowing sample.',
        },
        {
          ...baseScene.beats[1],
          beatId: staleBeatId,
          line: 'Original line.',
          storyboardImagePrompt: 'Old dialogue prompt',
        },
      ],
      [PRE_VIS_CONTENT_HASH_FIELD]: generatePreVisContentHash({
        ...baseScene,
        dialogue: [{ character: 'DR. CHEN', line: 'Original line.' }],
        beats: [
          baseScene.beats[0],
          { ...baseScene.beats[1], line: 'Original line.' },
        ],
      }),
    }

    const { scene: synced, promptsUpdated, imagesCleared } = syncPreVisToScript(scene, {
      sceneNumber: 1,
      filmTitle: 'Test Film',
    })

    const actionBeat = (synced.beats as typeof baseScene.beats)[0]
    const dialogueBeat = (synced.beats as typeof baseScene.beats)[1]
    expect(promptsUpdated).toBe(2)
    expect(imagesCleared).toBeGreaterThan(0)
    expect(actionBeat.storyboardImageUrl).toBeUndefined()
    expect(dialogueBeat.storyboardImagePrompt).toContain('Original line')
    expect(synced.storyboardStatus).toBe('pending_review')
    expect(synced[PRE_VIS_CONTENT_HASH_FIELD]).toBeUndefined()
  })

  it('sceneNeedsExpressWork returns true after sync on previously-complete scene', () => {
    const completeScene = {
      ...baseScene,
      [PRE_VIS_CONTENT_HASH_FIELD]: generatePreVisContentHash({
        ...baseScene,
        dialogue: [{ character: 'DR. CHEN', line: 'Old line.' }],
      }),
    }

    const { scene: synced } = syncPreVisToScript(completeScene, { sceneNumber: 1 })
    expect(sceneNeedsExpressWork(synced, 'en', false)).toBe(true)
  })

  it('stampPreVisContentHash stores current content hash', () => {
    const stamped = stampPreVisContentHash(baseScene)
    expect(stamped[PRE_VIS_CONTENT_HASH_FIELD]).toBe(generatePreVisContentHash(baseScene))
  })

  it('isPreVisStale is false for a direction-only edit after a prose hash stamp', () => {
    const stamped = stampPreVisContentHash(baseScene)
    const directionOnly = {
      ...stamped,
      beats: stamped.beats.map((beat, index) =>
        index === 0
          ? {
              ...beat,
              beatDirection: { shotType: 'Insert Shot', cameraMovement: 'push-in' },
            }
          : beat
      ),
    }

    expect(isPreVisStale(directionOnly)).toBe(false)
  })

  it('isPreVisStale stays false when a legacy direction-mixed hash still matches', () => {
    const withDirection = {
      ...baseScene,
      beats: baseScene.beats.map((beat, index) =>
        index === 0
          ? { ...beat, beatDirection: { shotType: 'Wide Shot', emotion: 'wary' } }
          : beat
      ),
    }
    const scene = {
      ...withDirection,
      [PRE_VIS_CONTENT_HASH_FIELD]: generateLegacyPreVisContentHash(withDirection),
    }

    expect(isPreVisStale(scene)).toBe(false)
  })

  it('restampPreVisHashIfScriptCurrent upgrades a current hash and leaves script-stale alone', () => {
    const current = stampPreVisContentHash(baseScene)
    const restamped = restampPreVisHashIfScriptCurrent(current, {
      ...current,
      beats: current.beats.map((beat, index) =>
        index === 0 ? { ...beat, beatDirection: { shotType: 'Close-Up' } } : beat
      ),
    })
    expect(restamped[PRE_VIS_CONTENT_HASH_FIELD]).toBe(generatePreVisContentHash(restamped))

    const stale = {
      ...baseScene,
      [PRE_VIS_CONTENT_HASH_FIELD]: generatePreVisContentHash({
        ...baseScene,
        dialogue: [{ character: 'DR. CHEN', line: 'Original line.' }],
        beats: baseScene.beats.map((beat, i) =>
          i === 1 ? { ...beat, line: 'Original line.' } : beat
        ),
      }),
    }
    const leftAlone = restampPreVisHashIfScriptCurrent(stale, { ...stale, heading: 'INT. LAB - NIGHT' })
    expect(leftAlone[PRE_VIS_CONTENT_HASH_FIELD]).toBe(stale[PRE_VIS_CONTENT_HASH_FIELD])
  })
})

describe('mergeScenePreservingMedia prompt text', () => {
  it('preserves storyboardImagePrompt text across merges', () => {
    const canonical = {
      beats: [
        {
          beatId: 'bt_1',
          storyboardImagePrompt: 'Canonical prompt text',
        },
      ],
    }
    const incoming = {
      beats: [
        {
          beatId: 'bt_1',
          actionDescription: 'Updated action',
        },
      ],
    }

    const merged = mergeScenePreservingMedia(canonical, incoming)
    expect(merged.beats[0].storyboardImagePrompt).toBe('Canonical prompt text')
  })
})
