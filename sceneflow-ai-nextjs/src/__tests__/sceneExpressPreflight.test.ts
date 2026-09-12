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

describe('the scene waits for the prop and location library too', () => {
  const readyScene = {
    characters: ['Sarah'],
    sceneDirection: {
      camera: { shots: ['Wide'] },
      scene: { location: 'Kitchen' },
      talent: { blocking: 'Sarah enters' },
      segmentPromptBundle: [],
    },
    beats: [{ beatId: 'bt_1', sequenceIndex: 0, kind: 'action', actionDescription: 'Wide' }],
  }
  const readyCast = [
    {
      name: 'Sarah',
      referenceImageUrl: 'https://example.com/sarah.jpg',
      voiceConfig: { voiceId: 'gemini-achird' },
    },
  ]

  it('blocks on an object reference with no generated image', () => {
    const result = runSceneExpressPreflight({
      scene: readyScene,
      sceneIndex: 0,
      characters: readyCast,
      language: 'en',
      objectReferences: [{ name: 'Heavy iron spanner' }],
    })

    expect(result.ok).toBe(false)
    expect(result.errors.some((e) => e.includes('Heavy iron spanner'))).toBe(true)
  })

  it('blocks on a location reference with no generated image', () => {
    const result = runSceneExpressPreflight({
      scene: readyScene,
      sceneIndex: 0,
      characters: readyCast,
      language: 'en',
      locationReferences: [{ location: 'INT. RECEIVING TERMINAL', imageUrl: '  ' }],
    })

    expect(result.ok).toBe(false)
    expect(result.errors.some((e) => e.includes('RECEIVING TERMINAL'))).toBe(true)
  })

  it('blocks a frames-only pass as well — the planner still names the reference', () => {
    const result = runSceneExpressPreflight({
      scene: readyScene,
      sceneIndex: 0,
      characters: readyCast,
      language: 'en',
      framesOnly: true,
      objectReferences: [{ name: 'Heavy iron spanner' }],
    })

    expect(result.ok).toBe(false)
  })

  it('passes once every prop and location is drawn', () => {
    const result = runSceneExpressPreflight({
      scene: readyScene,
      sceneIndex: 0,
      characters: readyCast,
      language: 'en',
      objectReferences: [{ name: 'Heavy iron spanner', imageUrl: 'https://example.com/s.png' }],
      locationReferences: [
        { location: 'INT. RECEIVING TERMINAL', imageUrl: 'https://example.com/t.png' },
      ],
    })

    expect(result.errors).toHaveLength(0)
    expect(result.ok).toBe(true)
  })
})
