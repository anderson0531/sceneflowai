import { describe, it, expect } from 'vitest'
import { runSceneExpressPreflight } from '@/lib/sceneGeneration/sceneExpressPreflight'

describe('runSceneExpressPreflight', () => {
  const characters = [
    {
      name: 'Sarah',
      referenceImageUrl: 'https://example.com/sarah.jpg',
    },
  ]

  it('skips voice checks for frames-only preflight when direction and audio are complete', () => {
    const scene = {
      characters: ['Sarah'],
      sceneDirection: {
        camera: { shots: ['Wide'] },
        scene: { location: 'Kitchen' },
        talent: { blocking: 'Sarah enters' },
        segmentPromptBundle: [],
      },
      dialogue: [{ character: 'Sarah', line: 'Hello.' }],
      dialogueAudio: {
        en: [{ character: 'Sarah', dialogueIndex: 0, audioUrl: 'https://example.com/a.mp3' }],
      },
      beats: [
        { beatId: 'bt_1', sequenceIndex: 0, kind: 'action', actionDescription: 'Wide' },
      ],
    }

    const result = runSceneExpressPreflight({
      scene,
      sceneIndex: 0,
      characters,
      language: 'en',
      framesOnly: true,
    })

    expect(result.ok).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('still requires voices when framesOnly is false', () => {
    const scene = {
      characters: ['Sarah'],
      sceneDirection: {
        camera: { shots: ['Wide'] },
        scene: { location: 'Kitchen' },
        talent: { blocking: 'Sarah enters' },
        segmentPromptBundle: [],
      },
      dialogue: [{ character: 'Sarah', line: 'Hello.' }],
      beats: [
        { beatId: 'bt_1', sequenceIndex: 0, kind: 'action', actionDescription: 'Wide' },
      ],
    }

    const result = runSceneExpressPreflight({
      scene,
      sceneIndex: 0,
      characters,
      language: 'en',
      framesOnly: false,
    })

    expect(result.ok).toBe(false)
    expect(result.errors.some((e) => e.includes('Missing voices'))).toBe(true)
  })
})
