import { describe, it, expect } from 'vitest'
import {
  sceneHasPlayablePreVisContent,
  sceneHasPlayablePreVisAudio,
  countPlayablePreVisScenes,
  getScenePlayableThumbnailUrl,
} from '@/lib/storyboard/types'

describe('playable pre-vis scene helpers', () => {
  it('marks scene with owned beat image as playable (images only)', () => {
    const scene = {
      beats: [
        {
          beatId: 'bt_dialogue',
          sequenceIndex: 0,
          kind: 'dialogue',
          character: 'ALICE',
          line: 'Hello.',
          storyboardImageUrl: 'https://example.com/beat.jpg',
        },
      ],
    }

    expect(sceneHasPlayablePreVisContent(scene)).toBe(true)
    expect(sceneHasPlayablePreVisAudio(scene)).toBe(false)
    expect(getScenePlayableThumbnailUrl(scene)).toBe('https://example.com/beat.jpg')
  })

  it('marks scene with establishing image as playable', () => {
    const scene = {
      imageUrl: 'https://example.com/establishing.jpg',
      beats: [
        {
          beatId: 'bt_action',
          sequenceIndex: 0,
          kind: 'action',
          actionDescription: 'Wide shot',
        },
      ],
    }

    expect(sceneHasPlayablePreVisContent(scene)).toBe(true)
    expect(getScenePlayableThumbnailUrl(scene)).toBe('https://example.com/establishing.jpg')
  })

  it('marks scene with dialogue audio as playable (audio only)', () => {
    const scene = {
      dialogue: [{ character: 'Alice', line: 'Hello.' }],
      dialogueAudio: {
        en: [
          {
            character: 'Alice',
            dialogueIndex: 0,
            audioUrl: 'https://example.com/alice.mp3',
          },
        ],
      },
    }

    expect(sceneHasPlayablePreVisContent(scene)).toBe(true)
    expect(sceneHasPlayablePreVisAudio(scene, 'en')).toBe(true)
    expect(getScenePlayableThumbnailUrl(scene)).toBeUndefined()
  })

  it('uses selected language for audio detection', () => {
    const scene = {
      dialogue: [{ character: 'Alice', line: 'Hola.' }],
      dialogueAudio: {
        es: [
          {
            character: 'Alice',
            dialogueIndex: 0,
            audioUrl: 'https://example.com/hola.mp3',
          },
        ],
      },
    }

    expect(sceneHasPlayablePreVisAudio(scene, 'es')).toBe(true)
    expect(sceneHasPlayablePreVisAudio(scene, 'en')).toBe(false)
    expect(sceneHasPlayablePreVisContent(scene, 'es')).toBe(true)
    expect(sceneHasPlayablePreVisContent(scene, 'en')).toBe(false)
  })

  it('detects intentional standalone narrator audio', () => {
    const scene = {
      narration: 'Opening voiceover for the scene.',
      narrationAudio: { en: { url: 'https://example.com/narration.mp3' } },
    }

    expect(sceneHasPlayablePreVisAudio(scene, 'en')).toBe(true)
    expect(sceneHasPlayablePreVisContent(scene, 'en')).toBe(true)
  })

  it('marks empty scene as not playable', () => {
    const scene = {
      beats: [
        {
          beatId: 'bt_action',
          sequenceIndex: 0,
          kind: 'action',
          actionDescription: 'Wide shot',
        },
      ],
    }

    expect(sceneHasPlayablePreVisContent(scene)).toBe(false)
    expect(sceneHasPlayablePreVisAudio(scene)).toBe(false)
  })

  it('counts playable scenes across a script by language', () => {
    const scenes = [
      { imageUrl: 'https://example.com/s1.jpg' },
      {
        dialogue: [{ character: 'Marie', line: 'Bonjour.' }],
        dialogueAudio: {
          fr: [
            {
              character: 'Marie',
              dialogueIndex: 0,
              audioUrl: 'https://example.com/fr.mp3',
            },
          ],
        },
      },
      { beats: [{ beatId: 'bt1', sequenceIndex: 0, kind: 'action', actionDescription: 'Empty' }] },
    ]

    expect(countPlayablePreVisScenes(scenes, 'en')).toBe(1)
    expect(countPlayablePreVisScenes(scenes, 'fr')).toBe(2)
  })
})
