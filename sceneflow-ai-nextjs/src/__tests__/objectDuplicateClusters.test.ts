import { describe, expect, it } from 'vitest'
import {
  collapseObjectClusters,
  clusterObjectNames,
  countDuplicateObjectReviewItems,
  duplicateObjectBeatGroups,
  duplicateObjectGroups,
  ignorePairsForGroup,
  ignorePairsForObject,
  mergeObjectDuplicateIgnores,
  mergeObjectRows,
  nameMatchesLibrary,
  objectDuplicatePairKey,
  objectNamesMatch,
  pickCanonicalObject,
  pruneObjectDuplicateIgnores,
  rewriteKeyProps,
  rewriteObjectRefIds,
  rewriteScenesForObjectDelete,
  rewriteScenesForObjectMerge,
  selectCanonicalNewObjects,
  uniqueCanonicalNames,
} from '@/lib/vision/objectDuplicateClusters'

const WRENCH_FAMILY = [
  'Thirty-Inch Iron Rail Spanner',
  'Heavy cast-iron spud wrench',
  'Industrial cast-iron spanner wrench',
  'Spud wrench',
]

describe('objectNamesMatch', () => {
  it('treats the wrench/spanner catalog names as the same object', () => {
    expect(objectNamesMatch('Thirty-Inch Iron Rail Spanner', 'Spud wrench')).toBe(true)
    expect(objectNamesMatch('Spud wrench', 'Heavy cast-iron spud wrench')).toBe(true)
    expect(objectNamesMatch('Thirty-Inch Iron Rail Spanner', 'Industrial cast-iron spanner wrench')).toBe(
      true
    )
  })

  it('does not match unrelated props', () => {
    expect(objectNamesMatch('Water-damaged leather journal', 'Rugged military laptop')).toBe(false)
    expect(objectNamesMatch('Iron crowbar', 'Cast-iron skillet')).toBe(false)
  })
})

describe('clusterObjectNames', () => {
  it('collapses the reported wrench/spanner synonyms into one cluster', () => {
    const clusters = clusterObjectNames([...WRENCH_FAMILY, 'Rugged military laptop'])
    const wrenchCluster = clusters.find((cluster) =>
      cluster.includes('Thirty-Inch Iron Rail Spanner')
    )
    expect(wrenchCluster?.sort()).toEqual([...WRENCH_FAMILY].sort())
    expect(clusters).toHaveLength(2)
  })

  it('clusters rail spanner and spud wrench without an industrial bridge name', () => {
    const clusters = clusterObjectNames(['Thirty-Inch Iron Rail Spanner', 'Spud wrench'])
    expect(clusters).toHaveLength(1)
    expect(clusters[0]).toHaveLength(2)
  })
})

describe('selectCanonicalNewObjects', () => {
  it('skips a synonym that is already in the library', () => {
    const added = selectCanonicalNewObjects(
      WRENCH_FAMILY.map((name) => ({ name })),
      ['Thirty-Inch Iron Rail Spanner']
    )
    expect(added).toEqual([])
  })

  it('adds one richest spelling when several new synonyms arrive together', () => {
    const added = selectCanonicalNewObjects(
      WRENCH_FAMILY.map((name) => ({ name })),
      []
    )
    expect(added).toHaveLength(1)
    expect(added[0].name).toBe('Industrial cast-iron spanner wrench')
  })
})

describe('nameMatchesLibrary', () => {
  it('treats Spud wrench as already present when the rail spanner is catalogued', () => {
    expect(nameMatchesLibrary('Spud wrench', ['Thirty-Inch Iron Rail Spanner'])).toBe(true)
  })
})

describe('collapseObjectClusters', () => {
  it('keeps one library row per physical prop, preferring the name the beat uses', () => {
    const library = WRENCH_FAMILY.map((name, index) => ({
      id: `prop-${index}`,
      name,
    }))
    const kept = collapseObjectClusters(library, 'Elara swings the iron rail spanner.')
    expect(kept).toHaveLength(1)
    expect(kept[0].name).toBe('Thirty-Inch Iron Rail Spanner')
  })

  it('prefers an imaged row when the prose cannot tell them apart', () => {
    const kept = pickCanonicalObject([
      { name: 'Spud wrench' },
      { name: 'Heavy cast-iron spud wrench', imageUrl: 'https://cdn.test/wrench.png' },
    ])
    expect(kept.imageUrl).toBe('https://cdn.test/wrench.png')
  })
})

describe('duplicateObjectGroups', () => {
  it('returns only groups with more than one row', () => {
    const groups = duplicateObjectGroups([
      { id: 'a', name: 'Spud wrench' },
      { id: 'b', name: 'Thirty-Inch Iron Rail Spanner' },
      { id: 'c', name: 'Rugged military laptop' },
    ])
    expect(groups).toHaveLength(1)
    expect(groups[0].map((row) => row.id).sort()).toEqual(['a', 'b'])
  })

  it('splits a wrench cluster so an ignored name is no longer grouped', () => {
    const items = WRENCH_FAMILY.map((name, index) => ({ id: `w${index}`, name }))
    const groups = duplicateObjectGroups(items)
    expect(groups).toHaveLength(1)

    const spud = items.find((row) => row.name === 'Spud wrench')
    expect(spud).toBeTruthy()
    const ignored = ignorePairsForObject(groups[0], spud!.id)
    expect(ignored).toContain(objectDuplicatePairKey(spud!.id, 'w0'))

    const after = duplicateObjectGroups(items, ignored)
    expect(after.every((group) => !group.some((row) => row.id === spud!.id))).toBe(true)
    expect(
      after.some((group) => group.some((row) => row.name === 'Thirty-Inch Iron Rail Spanner'))
    ).toBe(true)
  })

  it('treats unsorted persisted pair keys as ignored', () => {
    expect(
      duplicateObjectGroups(
        [
          { id: 'a', name: 'Spud wrench' },
          { id: 'b', name: 'Thirty-Inch Iron Rail Spanner' },
        ],
        ['b::a']
      )
    ).toEqual([])
  })

  it('drops a dismissed group from the review list', () => {
    const items = WRENCH_FAMILY.map((name, index) => ({ id: `w${index}`, name }))
    const groups = duplicateObjectGroups(items)
    expect(duplicateObjectGroups(items, ignorePairsForGroup(groups[0]))).toEqual([])
  })
})

describe('duplicateObjectBeatGroups', () => {
  const objects = [
    { id: 'a', name: 'Thirty-Inch Iron Rail Spanner' },
    { id: 'b', name: 'Spud wrench' },
    { id: 'c', name: 'Water-damaged leather journal' },
    { id: 'd', name: 'Leather journal' },
  ]

  it('nests colliding beats under their scenes', () => {
    const groups = duplicateObjectBeatGroups(objects, [
      {
        sceneNumber: 1,
        heading: 'INT. RAIL YARD - NIGHT',
        beats: [
          {
            actionDescription: 'Elara lifts the spanner.',
            beatDirection: {
              keyProps: ['Thirty-Inch Iron Rail Spanner', 'Spud wrench'],
            },
          },
        ],
      },
      {
        sceneNumber: 2,
        heading: 'INT. STUDY - NIGHT',
        beats: [
          { actionDescription: 'She opens the journal.' },
          {
            actionDescription: 'Ink soaks the leather journal.',
            beatDirection: {
              keyProps: ['Water-damaged leather journal', 'Leather journal'],
            },
          },
        ],
      },
    ])

    expect(groups.scenes.map((scene) => scene.heading)).toEqual([
      'INT. RAIL YARD - NIGHT',
      'INT. STUDY - NIGHT',
    ])
    expect(groups.scenes[0].beats).toHaveLength(1)
    expect(groups.scenes[0].beats[0].beatIndex).toBe(0)
    expect(groups.scenes[1].beats).toHaveLength(1)
    expect(groups.scenes[1].beats[0].beatIndex).toBe(1)
    expect(groups.scenes[0].beats[0].snippet).toBe('Elara lifts the spanner.')
    expect(groups.unreferenced).toEqual([])
    expect(countDuplicateObjectReviewItems(groups)).toBe(2)
  })

  it('does not emit a card for a beat that tags only one wrench spelling', () => {
    const groups = duplicateObjectBeatGroups(
      [
        { id: 'a', name: 'Thirty-Inch Iron Rail Spanner' },
        { id: 'b', name: 'Spud wrench' },
      ],
      [
        {
          sceneNumber: 1,
          beats: [
            {
              beatDirection: { keyProps: ['Spud wrench'] },
            },
          ],
        },
      ]
    )
    expect(groups.scenes).toEqual([])
    expect(groups.unreferenced).toHaveLength(1)
  })

  it('attaches saved objectRefIds on a beat even without matching keyProps', () => {
    const groups = duplicateObjectBeatGroups(
      [
        { id: 'a', name: 'Thirty-Inch Iron Rail Spanner' },
        { id: 'b', name: 'Spud wrench' },
      ],
      [
        {
          sceneNumber: 3,
          beats: [
            {
              referenceSelection: { objectRefIds: ['a', 'b'] },
            },
          ],
        },
      ]
    )
    expect(groups.scenes[0].beats[0].collisions[0].members.map((row) => row.id).sort()).toEqual([
      'a',
      'b',
    ])
  })

  it('drops a beat collision when the pair is ignored', () => {
    const items = [
      { id: 'a', name: 'Thirty-Inch Iron Rail Spanner' },
      { id: 'b', name: 'Spud wrench' },
    ]
    const scenes = [
      {
        sceneNumber: 1,
        heading: 'INT. RAIL YARD - NIGHT',
        beats: [
          {
            beatDirection: { keyProps: ['Thirty-Inch Iron Rail Spanner', 'Spud wrench'] },
          },
        ],
      },
    ]
    const before = duplicateObjectBeatGroups(items, scenes)
    expect(before.scenes).toHaveLength(1)
    const ignored = ignorePairsForObject(before.scenes[0].beats[0].collisions[0].members, 'b')
    const after = duplicateObjectBeatGroups(items, scenes, ignored)
    expect(after.scenes).toEqual([])
  })
})

describe('objectDuplicateIgnores', () => {
  it('unions and sorts pair keys', () => {
    expect(mergeObjectDuplicateIgnores(['b::a'], ['c::a'])).toEqual(['a::b', 'a::c'])
  })

  it('prunes pairs that mention a deleted object', () => {
    expect(pruneObjectDuplicateIgnores(['a::b', 'a::c', 'b::c'], ['a'])).toEqual(['b::c'])
  })
})

describe('uniqueCanonicalNames', () => {
  it('returns one name per physical object', () => {
    expect(uniqueCanonicalNames([...WRENCH_FAMILY, 'Rugged military laptop'])).toEqual([
      'Industrial cast-iron spanner wrench',
      'Rugged military laptop',
    ])
  })
})

describe('merge rewrites', () => {
  it('rewrites synonym keyProps onto the keeper name once', () => {
    expect(
      rewriteKeyProps(
        ['Spud wrench', 'Thirty-Inch Iron Rail Spanner', 'Violet Ink Drafting Vellum'],
        ['Spud wrench'],
        'Thirty-Inch Iron Rail Spanner'
      )
    ).toEqual(['Thirty-Inch Iron Rail Spanner', 'Violet Ink Drafting Vellum'])
  })

  it('rewrites saved objectRefIds onto the keeper', () => {
    expect(rewriteObjectRefIds(['prop-spud', 'prop-vellum'], ['prop-spud'], 'prop-spanner')).toEqual([
      'prop-spanner',
      'prop-vellum',
    ])
  })

  it('copies a still from a dropped row onto an un-imaged keeper', () => {
    const merged = mergeObjectRows(
      [
        { id: 'keep', name: 'Spud wrench' },
        {
          id: 'drop',
          name: 'Thirty-Inch Iron Rail Spanner',
          imageUrl: 'https://cdn.test/spanner.png',
          generationPrompt: 'spanner still',
        },
      ],
      'keep',
      ['drop']
    )
    expect(merged).toEqual([
      {
        id: 'keep',
        name: 'Spud wrench',
        imageUrl: 'https://cdn.test/spanner.png',
        generationPrompt: 'spanner still',
      },
    ])
  })

  it('rewrites scene and beat tags plus saved selections', () => {
    const scenes = rewriteScenesForObjectMerge(
      [
        {
          sceneDirection: {
            scene: { keyProps: ['Spud wrench', 'Journal'] },
          },
          beats: [
            {
              beatDirection: { keyProps: ['Heavy cast-iron spud wrench'] },
              referenceSelection: { objectRefIds: ['prop-spud', 'prop-journal'] },
            },
          ],
        },
      ],
      { id: 'prop-spanner', name: 'Thirty-Inch Iron Rail Spanner' },
      [{ id: 'prop-spud', name: 'Spud wrench' }]
    )

    expect(scenes[0].sceneDirection.scene.keyProps).toEqual([
      'Thirty-Inch Iron Rail Spanner',
      'Journal',
    ])
    expect(scenes[0].beats[0].beatDirection.keyProps).toEqual(['Thirty-Inch Iron Rail Spanner'])
    expect(scenes[0].beats[0].referenceSelection.objectRefIds).toEqual([
      'prop-spanner',
      'prop-journal',
    ])
  })

  it('strips deleted object ids from beat selections when no keeper remains', () => {
    const scenes = rewriteScenesForObjectDelete(
      [
        {
          beats: [
            { referenceSelection: { objectRefIds: ['prop-spud', 'prop-journal'] } },
          ],
        },
      ],
      ['prop-spud']
    )
    expect(scenes[0].beats[0].referenceSelection.objectRefIds).toEqual(['prop-journal'])
  })

  it('clears every beat objectRefId when Delete all drops the whole library', () => {
    const scenes = rewriteScenesForObjectDelete(
      [
        {
          beats: [
            { referenceSelection: { objectRefIds: ['prop-spud', 'prop-journal'] } },
            { referenceSelection: { objectRefIds: ['prop-spanner'] } },
          ],
        },
      ],
      ['prop-spud', 'prop-journal', 'prop-spanner']
    )
    expect(scenes[0].beats[0].referenceSelection.objectRefIds).toEqual([])
    expect(scenes[0].beats[1].referenceSelection.objectRefIds).toEqual([])
  })
})
