import { describe, expect, it } from 'vitest'
import {
  collapseObjectClusters,
  clusterObjectNames,
  duplicateObjectGroups,
  mergeObjectRows,
  nameMatchesLibrary,
  objectNamesMatch,
  pickCanonicalObject,
  rewriteKeyProps,
  rewriteObjectRefIds,
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
})
