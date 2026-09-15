import { describe, expect, it } from 'vitest'
import {
  droppedReferenceIds,
  mergeVisionPhaseReferences,
  visionReferencesPutPayload,
} from '@/lib/projects/mergeVisionPhaseReferences'

function pickIncoming(incoming: unknown, existing: unknown): string | undefined {
  const next = typeof incoming === 'string' && incoming.trim() ? incoming : undefined
  const prev = typeof existing === 'string' && existing.trim() ? existing : undefined
  return next ?? prev
}

describe('droppedReferenceIds', () => {
  it('returns ids present previously and missing from the next list', () => {
    expect(
      droppedReferenceIds(
        [{ id: 'keep' }, { id: 'drop-a' }, { id: 'drop-b' }],
        [{ id: 'keep' }, { id: 'new' }]
      )
    ).toEqual(['drop-a', 'drop-b'])
  })
})

describe('visionReferencesPutPayload', () => {
  it('adds droppedObjectReferenceIds when the object library shrank', () => {
    const payload = visionReferencesPutPayload({
      sceneReferences: [],
      objectReferences: [{ id: 'keep', name: 'Spud wrench' }],
      locationReferences: [],
      objectDuplicateIgnores: ['a::b'],
      previousObjectReferences: [{ id: 'keep' }, { id: 'drop' }],
      extraDroppedIds: ['drop'],
    })

    expect(payload.objectReferences).toEqual([{ id: 'keep', name: 'Spud wrench' }])
    expect(payload.objectDuplicateIgnores).toEqual(['a::b'])
    expect(payload.droppedObjectReferenceIds).toEqual(['drop'])
  })

  it('omits droppedObjectReferenceIds when nothing was removed', () => {
    const payload = visionReferencesPutPayload({
      sceneReferences: [],
      objectReferences: [{ id: 'keep' }, { id: 'added' }],
      locationReferences: [],
      previousObjectReferences: [{ id: 'keep' }],
    })
    expect(payload.droppedObjectReferenceIds).toBeUndefined()
  })
})

describe('mergeVisionPhaseReferences', () => {
  it('resurrects omitted object rows when drop ids are missing', () => {
    const merged = mergeVisionPhaseReferences(
      {
        objectReferences: [
          { id: 'keep', name: 'Spud wrench' },
          { id: 'drop', name: 'Thirty-Inch Iron Rail Spanner' },
        ],
      },
      {
        objectReferences: [{ id: 'keep', name: 'Spud wrench' }],
      },
      pickIncoming
    )

    expect(merged.objectReferences?.map((row) => row.id).sort()).toEqual(['drop', 'keep'])
  })

  it('keeps deleted object rows gone when droppedObjectReferenceIds is set', () => {
    const merged = mergeVisionPhaseReferences(
      {
        objectReferences: [
          { id: 'keep', name: 'Spud wrench' },
          { id: 'drop', name: 'Thirty-Inch Iron Rail Spanner' },
        ],
      },
      {
        objectReferences: [{ id: 'keep', name: 'Spud wrench' }],
        droppedObjectReferenceIds: ['drop'],
        objectDuplicateIgnores: [],
      },
      pickIncoming
    )

    expect(merged.objectReferences).toEqual([{ id: 'keep', name: 'Spud wrench' }])
    expect(merged.objectDuplicateIgnores).toEqual([])
  })

  it('does not persist droppedObjectReferenceIds on the merged slice', () => {
    const merged = mergeVisionPhaseReferences(
      { objectReferences: [{ id: 'keep' }, { id: 'drop' }] },
      {
        objectReferences: [{ id: 'keep' }],
        droppedObjectReferenceIds: ['drop'],
      },
      pickIncoming
    )
    expect(merged.droppedObjectReferenceIds).toBeUndefined()
  })

  it('drops every object id when Delete all sends an empty list plus drop ids', () => {
    const merged = mergeVisionPhaseReferences(
      {
        objectReferences: [
          { id: 'a', name: 'Spanner' },
          { id: 'b', name: 'Journal' },
        ],
      },
      {
        objectReferences: [],
        droppedObjectReferenceIds: ['a', 'b'],
      },
      pickIncoming
    )
    expect(merged.objectReferences).toEqual([])
  })
})
