import { describe, expect, it } from 'vitest'
import {
  isUnconfirmedScriptShrink,
  scenesAfterUnconfirmedShrinkGuard,
} from '@/lib/script/scriptShrinkGuard'

function storyScene(index: number) {
  return {
    id: `scene-${index}`,
    sceneNumber: index,
    heading: `INT. ROOM ${index} - DAY`,
    beats: Array.from({ length: index === 1 ? 6 : 2 }, (_, beat) => ({
      beatId: `beat-${index}-${beat}`,
      sequenceIndex: beat,
      kind: 'action',
      actionDescription: `Story beat ${index}.${beat}`,
    })),
  }
}

describe('scriptShrinkGuard', () => {
  it('rejects a drop from 26 scenes to a 3-scene title payload', () => {
    expect(isUnconfirmedScriptShrink(26, 3)).toBe(true)
    expect(isUnconfirmedScriptShrink(26, 3, { confirmScriptReplace: true })).toBe(false)
    expect(isUnconfirmedScriptShrink(26, 20)).toBe(false)
    expect(isUnconfirmedScriptShrink(8, 2)).toBe(false)
    expect(isUnconfirmedScriptShrink(26, 6, { deletedSceneCount: 20 })).toBe(false)
  })

  it('keeps a 26-scene script when the payload is a 3-beat title sequence', () => {
    const existing = Array.from({ length: 26 }, (_, i) => storyScene(i + 1))
    const incoming = [
      existing[0],
      {
        id: 'cinematic-title-fallback-1',
        sceneNumber: 2,
        heading: 'INT. TITLE SEQUENCE - DAY',
        cinematicType: 'title',
        beats: [
          { beatId: 't0', sequenceIndex: 0, kind: 'action', actionDescription: 'Wide opening.' },
          {
            beatId: 't1',
            sequenceIndex: 1,
            kind: 'action',
            actionDescription: 'Secondary title card: elegant credit text "Written by Ada Lovelace".',
          },
          { beatId: 't2', sequenceIndex: 2, kind: 'action', actionDescription: 'Title dissolves.' },
        ],
      },
      {
        id: 'cinematic-title-merged',
        sceneNumber: 3,
        heading: existing[0].heading,
        beats: [...existing[0].beats, { beatId: 'mix', kind: 'action', actionDescription: 'Written by Ada Lovelace' }],
      },
    ]

    const kept = scenesAfterUnconfirmedShrinkGuard(
      existing.map(({ id: _id, ...scene }) => scene),
      incoming
    )
    expect(kept.rejectedShrink).toBe(true)
    expect(kept.scenes).toHaveLength(26)
    expect(kept.scenes[0].beats).toHaveLength(6)
    expect(JSON.stringify(kept.scenes)).not.toContain('Written by')
  })

  it('preserves all 23 scenes across sequential partialSceneBatch PUTs even when DB story scenes lack explicit ids', () => {
    // Reproduces the 23 -> 16 scene loss: bookend scenes 1 and 23 have cinematic IDs,
    // while story scenes 2..22 in the DB were saved without .id / .sceneId.
    const existingDbScenes = Array.from({ length: 23 }, (_, i) => {
      const sceneNumber = i + 1
      const base = {
        sceneNumber,
        heading: `INT. VAULT ${sceneNumber} - NIGHT`,
        beats: [
          {
            beatId: `beat-${sceneNumber}-0`,
            sequenceIndex: 0,
            kind: 'action',
            actionDescription: `Original beat for scene ${sceneNumber}`,
          },
        ],
      }
      if (sceneNumber === 1) return { ...base, id: 'cinematic-title-1' }
      if (sceneNumber === 23) return { ...base, id: 'cinematic-outro-23' }
      return base
    })

    const revisedAll23 = existingDbScenes.map((scene) => ({
      ...scene,
      id: (scene as { id?: string }).id || `scene-${scene.sceneNumber}`,
      sceneId: (scene as { id?: string }).id || `scene-${scene.sceneNumber}`,
      beats: [
        {
          ...scene.beats[0],
          actionDescription: `Revised beat for scene ${scene.sceneNumber}`,
        },
      ],
    }))

    // Batch 1: scenes 1..15 (15 scenes)
    const batch1 = revisedAll23.slice(0, 15)
    const afterBatch1 = scenesAfterUnconfirmedShrinkGuard(existingDbScenes, batch1, {
      partialSceneBatch: true,
    })
    expect(afterBatch1.rejectedShrink).toBe(false)
    expect(afterBatch1.scenes).toHaveLength(23)
    expect(afterBatch1.scenes[14].beats[0].actionDescription).toBe('Revised beat for scene 15')
    expect(afterBatch1.scenes[15].beats[0].actionDescription).toBe('Original beat for scene 16')

    // Batch 2: scenes 16..23 (8 scenes)
    const batch2 = revisedAll23.slice(15)
    const afterBatch2 = scenesAfterUnconfirmedShrinkGuard(afterBatch1.scenes, batch2, {
      partialSceneBatch: true,
    })
    expect(afterBatch2.rejectedShrink).toBe(false)
    expect(afterBatch2.scenes).toHaveLength(23)
    for (let i = 0; i < 23; i++) {
      expect(afterBatch2.scenes[i].sceneNumber).toBe(i + 1)
      expect(afterBatch2.scenes[i].beats[0].actionDescription).toBe(
        `Revised beat for scene ${i + 1}`
      )
    }
  })
})
