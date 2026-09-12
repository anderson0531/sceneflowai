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

describe('a scene waits only for the references it uses', () => {
  const readyScene = {
    sceneNumber: 1,
    heading: 'INT. RECEIVING TERMINAL - DAY',
    action: 'Sarah lifts the heavy iron spanner.',
    characters: ['Sarah'],
    sceneDirection: {
      camera: { shots: ['Wide'] },
      scene: { location: 'Receiving Terminal' },
      talent: { blocking: 'Sarah enters' },
      segmentPromptBundle: [],
    },
    beats: [{ beatId: 'bt_1', sequenceIndex: 0, kind: 'action', actionDescription: 'Wide' }],
  }
  const readyCast = [
    {
      id: 'char-sarah',
      name: 'Sarah',
      referenceImageUrl: 'https://example.com/sarah.jpg',
      voiceConfig: { voiceId: 'gemini-achird' },
    },
  ]
  const SPANNER = { id: 'obj-spanner', name: 'heavy iron spanner' }
  const TERMINAL = {
    id: 'loc-terminal',
    location: 'RECEIVING TERMINAL',
    locationDisplay: 'INT. RECEIVING TERMINAL - DAY',
    imageUrl: '  ',
    sceneNumbers: [1],
  }

  it('blocks on a prop this scene names that has never been drawn', () => {
    const result = runSceneExpressPreflight({
      scene: readyScene,
      sceneIndex: 0,
      characters: readyCast,
      language: 'en',
      objectReferences: [SPANNER],
    })

    expect(result.ok).toBe(false)
    expect(result.errors.some((e) => e.includes('heavy iron spanner'))).toBe(true)
  })

  /**
   * The distinction Express Frames depends on: a reference gap is a step it can
   * take itself, so the scene card offers the run instead of refusing it.
   */
  it('reports a reference gap as the only blocker, so Express can draw it first', () => {
    const result = runSceneExpressPreflight({
      scene: readyScene,
      sceneIndex: 0,
      characters: readyCast,
      language: 'en',
      objectReferences: [SPANNER],
    })

    expect(result.blockedOnlyByReferences).toBe(true)
  })

  it('blocks on a location assigned to this scene with no generated image', () => {
    const result = runSceneExpressPreflight({
      scene: readyScene,
      sceneIndex: 0,
      characters: readyCast,
      language: 'en',
      locationReferences: [TERMINAL],
    })

    expect(result.ok).toBe(false)
    expect(result.errors.some((e) => e.includes('RECEIVING TERMINAL'))).toBe(true)
  })

  it('ignores an undrawn prop and location belonging to other scenes', () => {
    const result = runSceneExpressPreflight({
      scene: readyScene,
      sceneIndex: 0,
      characters: readyCast,
      language: 'en',
      objectReferences: [{ id: 'obj-ledger', name: 'leather ledger' }],
      locationReferences: [
        {
          id: 'loc-gantry',
          location: 'GANTRY',
          locationDisplay: 'EXT. GANTRY - NIGHT',
          sceneNumbers: [4],
        },
      ],
    })

    expect(result.errors).toHaveLength(0)
    expect(result.ok).toBe(true)
  })

  it('blocks a frames-only pass as well — the planner still names the reference', () => {
    const result = runSceneExpressPreflight({
      scene: readyScene,
      sceneIndex: 0,
      characters: readyCast,
      language: 'en',
      framesOnly: true,
      objectReferences: [SPANNER],
    })

    expect(result.ok).toBe(false)
  })

  it('passes once the references this scene uses are drawn', () => {
    const result = runSceneExpressPreflight({
      scene: readyScene,
      sceneIndex: 0,
      characters: readyCast,
      language: 'en',
      objectReferences: [{ ...SPANNER, imageUrl: 'https://example.com/s.png' }],
      locationReferences: [{ ...TERMINAL, imageUrl: 'https://example.com/t.png' }],
    })

    expect(result.errors).toHaveLength(0)
    expect(result.ok).toBe(true)
  })

  it('names a voice problem ahead of a reference gap, and does not call it references-only', () => {
    const result = runSceneExpressPreflight({
      scene: { ...readyScene, dialogue: [{ character: 'Sarah', line: 'Hello.' }] },
      sceneIndex: 0,
      characters: [{ id: 'char-sarah', name: 'Sarah', referenceImageUrl: 'https://example.com/sarah.jpg' }],
      language: 'en',
      objectReferences: [SPANNER],
    })

    expect(result.ok).toBe(false)
    expect(result.errors[0]).toContain('Missing voices')
    expect(result.blockedOnlyByReferences).toBe(false)
  })

  /**
   * The scene card resolves requirements once for its References tab. Passing
   * them straight through is what keeps the tab, this gate and the auto-chain
   * from reaching three different verdicts.
   */
  it('trusts pre-resolved requirements over re-deriving them from the library', () => {
    const result = runSceneExpressPreflight({
      scene: readyScene,
      sceneIndex: 0,
      characters: readyCast,
      language: 'en',
      objectReferences: [SPANNER],
      sceneRequirements: [
        {
          kind: 'prop',
          id: 'obj-spanner',
          name: 'heavy iron spanner',
          imageUrl: 'https://example.com/s.png',
          source: 'beat-plan',
        },
      ],
    })

    expect(result.ok).toBe(true)
  })
})
