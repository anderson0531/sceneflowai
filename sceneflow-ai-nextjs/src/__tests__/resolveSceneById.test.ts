import { describe, it, expect } from 'vitest'
import { findSceneById, getVisionScriptScenes } from '@/lib/script/resolveSceneById'

describe('resolveSceneById', () => {
  const scenes = [
    { id: 'abc-1', sceneNumber: 1 },
    { id: 'abc-2', sceneNumber: 2 },
    { sceneNumber: 3 },
    { id: 'abc-4', sceneNumber: 4 },
    { id: 'abc-5', sceneNumber: 5 },
  ]

  it('finds scene by direct id', () => {
    const result = findSceneById(scenes, 'abc-2')
    expect(result.index).toBe(1)
    expect(result.scene?.id).toBe('abc-2')
  })

  it('finds scene by parser-style id scene-{sceneNumber}', () => {
    const parserScenes = [{ id: 'scene-4', sceneNumber: 4 }]
    const result = findSceneById(parserScenes, 'scene-4')
    expect(result.index).toBe(0)
    expect(result.scene?.sceneNumber).toBe(4)
  })

  it('finds scene by scene-{arrayIndex} when id is absent', () => {
    const noIdScenes = scenes.map(({ sceneNumber }) => ({ sceneNumber }))
    const result = findSceneById(noIdScenes, 'scene-4')
    expect(result.index).toBe(4)
  })

  it('finds scene by bare array index', () => {
    const result = findSceneById(scenes, '4')
    expect(result.index).toBe(4)
  })

  it('reads nested vision script scenes', () => {
    const visionPhase = {
      script: {
        script: {
          scenes: [{ id: 'nested-1' }],
        },
      },
    }
    expect(getVisionScriptScenes(visionPhase)).toHaveLength(1)
    expect(getVisionScriptScenes(visionPhase)[0].id).toBe('nested-1')
  })
})
