import { describe, it, expect } from 'vitest'
import {
  generatePreVisContentHash,
  isPreVisStale,
  syncPreVisToScript,
  stampPreVisContentHash,
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
        baseScene.beats[0],
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

    const dialogueBeat = (synced.beats as typeof baseScene.beats)[1]
    expect(promptsUpdated).toBe(2)
    expect(imagesCleared).toBeGreaterThan(0)
    expect(dialogueBeat.storyboardImageUrl).toBeUndefined()
    expect(dialogueBeat.storyboardImagePrompt).toContain('readings are off the charts')
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
