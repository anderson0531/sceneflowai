import { describe, expect, it } from 'vitest'
import {
  filterLocationReferences,
  filterObjectReferences,
} from '@/lib/vision/referenceLibraryLookup'
import type { LocationReference, VisualReference } from '@/types/visionReferences'

const location = (id: string, sceneNumbers?: number[]): LocationReference =>
  ({
    id,
    location: id === 'hall' ? 'HALL' : 'KITCHEN',
    locationDisplay: id,
    imageUrl: '',
    sourceSceneIndex: 0,
    sourceSceneHeading: '',
    pinnedAt: '',
    sceneNumbers,
  }) as LocationReference

const object = (id: string, name: string): VisualReference => ({
  id,
  type: 'object',
  name,
})

const scenes = [
  {
    sceneNumber: 1,
    beats: [
      {
        beatId: 'b1',
        actionDescription: 'She studies the framed photo.',
        beatDirection: { keyProps: ['Framed photo'] },
      },
    ],
  },
  {
    sceneNumber: 2,
    beats: [{ beatId: 'b2', actionDescription: 'Rain on the window.' }],
  },
]

describe('reference library scene filter', () => {
  it('keeps a location by sceneNumbers and an object by beat usage', () => {
    const locations = [location('hall', [1]), location('kitchen', [2])]
    const objects = [object('photo', 'Framed photo'), object('cup', 'Tea cup')]

    expect(filterLocationReferences(locations, '', 1).map((row) => row.id)).toEqual(['hall'])
    expect(filterObjectReferences(objects, scenes, '', 1).map((row) => row.id)).toEqual(['photo'])
  })

  it('excludes assigned rows from Unassigned', () => {
    const locations = [location('hall', [1]), location('kitchen')]
    const objects = [object('photo', 'Framed photo'), object('cup', 'Tea cup')]

    expect(filterLocationReferences(locations, '', 'unassigned').map((row) => row.id)).toEqual([
      'kitchen',
    ])
    expect(filterObjectReferences(objects, scenes, '', 'unassigned').map((row) => row.id)).toEqual([
      'cup',
    ])
  })
})
