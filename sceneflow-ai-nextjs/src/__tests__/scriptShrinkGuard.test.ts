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
})
