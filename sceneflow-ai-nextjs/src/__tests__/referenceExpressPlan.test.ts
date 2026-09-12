import { describe, expect, it, vi } from 'vitest'

vi.mock('@/models', () => ({}))
vi.mock('@/models/Project', () => ({ Project: { findByPk: vi.fn() } }))

import {
  castFingerprint,
  locationFingerprint,
  planReferenceExpressItems,
  planSceneReferenceExpressItems,
  propFingerprint,
  type CastSource,
  type LocationSource,
  type PropSource,
} from '@/lib/vision/referenceExpress/planItems'
import { summarizeItemResults } from '@/lib/vision/referenceExpress/types'

const cast = (over: Partial<CastSource> = {}): CastSource => ({
  id: 'c1',
  name: 'Mira',
  type: 'lead',
  description: 'A tired courier',
  ...over,
})

const location = (over: Partial<LocationSource> = {}): LocationSource => ({
  id: 'l1',
  location: 'Dockyard',
  intExt: 'EXT',
  timeOfDay: 'NIGHT',
  description: 'Rusted cranes over black water',
  ...over,
})

const prop = (over: Partial<PropSource> = {}): PropSource => ({
  id: 'p1',
  name: 'Brass key',
  description: 'Worn smooth by decades of pockets',
  ...over,
})

describe('planReferenceExpressItems', () => {
  it('plans cast before locations and props', () => {
    const items = planReferenceExpressItems({
      characters: [cast()],
      locations: [location()],
      props: [prop()],
    })

    expect(items.map((item) => item.kind)).toEqual(['cast', 'location', 'prop'])
  })

  it('skips targets that already have an image', () => {
    const items = planReferenceExpressItems({
      characters: [cast({ referenceImage: 'https://cdn/mira.png' }), cast({ id: 'c2', name: 'Bo' })],
      locations: [location({ imageUrl: 'https://cdn/dock.png' })],
      props: [prop({ imageUrl: '   ' })],
    })

    expect(items.map((item) => item.targetId)).toEqual(['c2', 'p1'])
  })

  it('excludes narrators, who have no on-screen appearance', () => {
    const items = planReferenceExpressItems({
      characters: [cast({ id: 'n1', name: 'Narrator', type: 'narrator' }), cast()],
      locations: [],
      props: [],
    })

    expect(items.map((item) => item.targetId)).toEqual(['c1'])
  })

  it('falls back to list position when a character has no id', () => {
    const items = planReferenceExpressItems({
      characters: [cast({ id: undefined, name: undefined })],
      locations: [],
      props: [],
    })

    expect(items[0]).toMatchObject({ targetId: '0', label: 'Character 1' })
  })

  it('drops references with no id, which cannot be written back', () => {
    const items = planReferenceExpressItems({
      characters: [],
      locations: [location({ id: '' })],
      props: [prop({ id: '' })],
    })

    expect(items).toEqual([])
  })
})

describe('planSceneReferenceExpressItems', () => {
  const MIRA = cast({ id: 'c1', name: 'Mira' })
  const BO = cast({ id: 'c2', name: 'Bo' })
  const DOCKYARD = location({ id: 'l1', location: 'Dockyard' })
  const ATRIUM = location({ id: 'l2', location: 'Atrium' })
  const KEY = prop({ id: 'p1', name: 'Brass key' })
  const LEDGER = prop({ id: 'p2', name: 'Leather ledger' })

  const input = {
    characters: [MIRA, BO],
    locations: [DOCKYARD, ATRIUM],
    props: [KEY, LEDGER],
    scenes: [
      { heading: 'EXT. DOCKYARD - NIGHT', sceneNumber: 1, action: 'Mira turns the brass key.' },
      { heading: 'INT. ATRIUM - DAY', sceneNumber: 2, action: 'Bo signs the leather ledger.' },
    ],
  }

  it('plans only what the named scene needs', () => {
    const items = planSceneReferenceExpressItems(input, { sceneIndices: [0] })

    expect(items.map((item) => item.targetId)).toEqual(['c1', 'l1', 'p1'])
  })

  it('unions the scenes in a multi-scene scope without repeating shared rows', () => {
    const shared = {
      ...input,
      scenes: [input.scenes[0], { ...input.scenes[0], sceneNumber: 2 }],
    }
    const items = planSceneReferenceExpressItems(shared, { sceneIndices: [0, 1] })

    expect(items.map((item) => item.targetId)).toEqual(['c1', 'l1', 'p1'])
  })

  it('keeps cast ahead of locations and props, like the project-wide plan', () => {
    const items = planSceneReferenceExpressItems(input, { sceneIndices: [0, 1] })

    expect(items.map((item) => item.kind)).toEqual([
      'cast',
      'cast',
      'location',
      'location',
      'prop',
      'prop',
    ])
  })

  it('still skips anything already drawn', () => {
    const items = planSceneReferenceExpressItems(
      { ...input, characters: [{ ...MIRA, referenceImage: 'https://cdn/mira.png' }, BO] },
      { sceneIndices: [0] }
    )

    expect(items.map((item) => item.targetId)).toEqual(['l1', 'p1'])
  })

  it('emits the same items and fingerprints the project-wide plan would', () => {
    const scoped = planSceneReferenceExpressItems(input, { sceneIndices: [0, 1] })
    const projectWide = planReferenceExpressItems(input)

    expect(scoped).toEqual(projectWide)
  })

  it('narrows to single rows when the caller names them', () => {
    const items = planSceneReferenceExpressItems(input, {
      sceneIndices: [0],
      itemKeys: ['prop:p1'],
    })

    expect(items.map((item) => item.targetId)).toEqual(['p1'])
  })

  it('matches a cast key given as the character name, since ids are optional', () => {
    const noIds = {
      ...input,
      characters: [{ ...MIRA, id: undefined }, { ...BO, id: undefined }],
    }
    const items = planSceneReferenceExpressItems(noIds, {
      sceneIndices: [0],
      itemKeys: ['cast:Mira'],
    })

    expect(items).toHaveLength(1)
    // The planner keeps owning item identity: list position, not the name.
    expect(items[0]).toMatchObject({ kind: 'cast', targetId: '0', label: 'Mira' })
  })

  it('honours the scene overrides the user made on the card', () => {
    const withOverride = {
      ...input,
      scenes: [{ ...input.scenes[0], referenceOverrides: { removed: ['prop:p1'] } }, input.scenes[1]],
    }
    const items = planSceneReferenceExpressItems(withOverride, { sceneIndices: [0] })

    expect(items.map((item) => item.targetId)).toEqual(['c1', 'l1'])
  })

  it('falls back to the project-wide plan when the scope names no real scene', () => {
    expect(planSceneReferenceExpressItems(input, {})).toEqual(planReferenceExpressItems(input))
    expect(planSceneReferenceExpressItems(input, { sceneIndices: [99] })).toEqual(
      planReferenceExpressItems(input)
    )
  })

  it('plans nothing when the scene needs nothing', () => {
    const items = planSceneReferenceExpressItems(
      { ...input, scenes: [{ heading: 'INT. VOID - DAY', sceneNumber: 1 }, input.scenes[1]] },
      { sceneIndices: [0] }
    )

    expect(items).toEqual([])
  })
})

describe('source fingerprints', () => {
  it('ignores whitespace and casing so re-saving unchanged text is not stale', () => {
    expect(castFingerprint(cast({ description: 'A  TIRED\ncourier ' }))).toBe(
      castFingerprint(cast())
    )
  })

  it('changes when a prompt input the user can edit changes', () => {
    const before = castFingerprint(cast())
    expect(castFingerprint(cast({ description: 'A cheerful courier' }))).not.toBe(before)
    expect(castFingerprint(cast({ age: 41 }))).not.toBe(before)
    expect(castFingerprint(cast({ appearance: 'Shaved head' }))).not.toBe(before)
  })

  it('reads the default wardrobe entry when no flat wardrobe is set', () => {
    const withWardrobe = cast({
      wardrobes: [
        { description: 'Grease-stained parka', accessories: 'Fingerless gloves', isDefault: true },
        { description: 'Formal dress', isDefault: false },
      ],
    })

    expect(castFingerprint(withWardrobe)).not.toBe(castFingerprint(cast()))
    // The non-default entry must not participate, or editing an unused outfit
    // would mark every generated portrait stale.
    expect(
      castFingerprint({
        ...withWardrobe,
        wardrobes: [
          withWardrobe.wardrobes![0]!,
          { description: 'Wetsuit', isDefault: false },
        ],
      })
    ).toBe(castFingerprint(withWardrobe))
  })

  it('tracks the fields each reference kind actually prompts with', () => {
    expect(locationFingerprint(location({ timeOfDay: 'DAY' }))).not.toBe(
      locationFingerprint(location())
    )
    expect(locationFingerprint(location({ imageUrl: 'https://cdn/x.png' }))).toBe(
      locationFingerprint(location())
    )

    expect(propFingerprint(prop({ category: 'weapon' }))).not.toBe(propFingerprint(prop()))
    expect(propFingerprint(prop({ imageUrl: 'https://cdn/x.png' }))).toBe(
      propFingerprint(prop())
    )
  })
})

describe('summarizeItemResults', () => {
  it('counts stale items independently of success', () => {
    const summary = summarizeItemResults([
      { kind: 'cast', targetId: 'c1', label: 'Mira', status: 'succeeded' },
      {
        kind: 'location',
        targetId: 'l1',
        label: 'Dockyard',
        status: 'succeeded',
        staleSource: true,
      },
      { kind: 'prop', targetId: 'p1', label: 'Brass key', status: 'failed', error: '429' },
      {
        kind: 'prop',
        targetId: 'p2',
        label: 'Ledger',
        status: 'skipped',
        skippedReason: 'already-generated',
      },
    ])

    expect(summary).toEqual({
      total: 4,
      succeeded: 2,
      failed: 1,
      skipped: 1,
      staleCount: 1,
    })
  })
})
