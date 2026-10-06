import { describe, expect, it } from 'vitest'
import { mergeSceneForDirection } from '@/lib/sceneGeneration/mergeSceneForDirection'

describe('mergeSceneForDirection', () => {
  it('keeps stored beats when the client omits them', () => {
    const merged = mergeSceneForDirection(
      {
        heading: 'INT. VAULT',
        beats: [{ beatId: 'bt_1', kind: 'action', actionDescription: 'He waits.' }],
        sceneMovements: [{ index: 0, summary: 'He waits.' }],
      },
      {
        heading: 'INT. VAULT - NIGHT',
        action: 'Gideon rests against the stone.',
      }
    )
    expect(merged.heading).toBe('INT. VAULT - NIGHT')
    expect(merged.beats).toHaveLength(1)
    expect(merged.sceneMovements).toHaveLength(1)
    expect(merged.action).toBe('Gideon rests against the stone.')
  })
})
