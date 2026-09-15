import { describe, expect, it } from 'vitest'
import {
  droppedReferenceIds,
  mergeDroppedObjectReferenceIds,
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

describe('mergeDroppedObjectReferenceIds', () => {
  it('unions previous tombstones with this request', () => {
    expect(mergeDroppedObjectReferenceIds(['a'], ['b'], ['a'])).toEqual(['a', 'b'])
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

  it('keeps previous tombstones even when this write only adds rows', () => {
    const payload = visionReferencesPutPayload({
      sceneReferences: [],
      objectReferences: [{ id: 'keep' }, { id: 'added' }],
      locationReferences: [],
      previousObjectReferences: [{ id: 'keep' }],
      previousDroppedObjectReferenceIds: ['old-drop'],
      replaceObjectReferences: true,
    })
    expect(payload.droppedObjectReferenceIds).toEqual(['old-drop'])
    expect(payload.replaceObjectReferences).toBe(true)
  })
})

describe('mergeVisionPhaseReferences', () => {
  it('resurrects omitted object rows when drop ids and replace are missing', () => {
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
    expect(merged.droppedObjectReferenceIds).toEqual(['drop'])
  })

  it('persists droppedObjectReferenceIds as tombstones on the merged slice', () => {
    const merged = mergeVisionPhaseReferences(
      { objectReferences: [{ id: 'keep' }, { id: 'drop' }] },
      {
        objectReferences: [{ id: 'keep' }],
        droppedObjectReferenceIds: ['drop'],
      },
      pickIncoming
    )
    expect(merged.droppedObjectReferenceIds).toEqual(['drop'])
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
    expect(merged.droppedObjectReferenceIds).toEqual(['a', 'b'])
  })

  it('does not resurrect tombstoned ids when a later PUT sends 33 rows without drop ids', () => {
    const wiped = mergeVisionPhaseReferences(
      {
        objectReferences: Array.from({ length: 94 }, (_, index) => ({
          id: `old-${index}`,
          name: `Old ${index}`,
        })),
      },
      {
        objectReferences: [],
        droppedObjectReferenceIds: Array.from({ length: 94 }, (_, index) => `old-${index}`),
      },
      pickIncoming
    )
    expect(wiped.objectReferences).toEqual([])
    expect(wiped.droppedObjectReferenceIds).toHaveLength(94)

    const rebuilt = mergeVisionPhaseReferences(
      wiped,
      {
        objectReferences: Array.from({ length: 33 }, (_, index) => ({
          id: `new-${index}`,
          name: `New ${index}`,
        })),
      },
      pickIncoming
    )

    expect(rebuilt.objectReferences).toHaveLength(33)
    expect(rebuilt.objectReferences?.every((row) => String(row.id).startsWith('new-'))).toBe(true)
    expect(rebuilt.droppedObjectReferenceIds).toHaveLength(94)
  })

  it('treats omitted ids as dropped when replaceObjectReferences is set', () => {
    const merged = mergeVisionPhaseReferences(
      {
        objectReferences: [
          { id: 'old-a', name: 'Spanner' },
          { id: 'old-b', name: 'Journal' },
        ],
        droppedObjectReferenceIds: [],
      },
      {
        objectReferences: [{ id: 'new-1', name: 'Brass core' }],
        replaceObjectReferences: true,
      },
      pickIncoming
    )

    expect(merged.objectReferences).toEqual([{ id: 'new-1', name: 'Brass core' }])
    expect(merged.droppedObjectReferenceIds).toEqual(['old-a', 'old-b'])
    expect(merged.replaceObjectReferences).toBeUndefined()
  })
})
