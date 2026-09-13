import { describe, expect, it } from 'vitest'
import type { LocationReference, LocationVersion } from '@/types/visionReferences'
import {
  compareBeatPosition,
  locationReferenceForGeneration,
  locationVersionRequirementId,
  parseLocationVersionRequirementId,
  resolveLocationVersionForBeat,
  withStaleVersionsAfterBaseChange,
} from '@/lib/vision/locationVersionResolve'

const door: LocationVersion = {
  id: 'ver-door',
  name: 'Exploded front door',
  stateNotes: 'Front door missing, debris on the floor',
  appliesFrom: { sceneNumber: 1, beatIndex: 1, beatId: 'b1' },
  imageUrl: 'https://blob.example/door.png',
  createdAt: '2026-01-01T00:00:00.000Z',
}

const fire: LocationVersion = {
  id: 'ver-fire',
  name: 'Foyer on fire',
  stateNotes: 'Front door missing; foyer engulfed in fire',
  appliesFrom: { sceneNumber: 1, beatIndex: 3, beatId: 'b3' },
  imageUrl: 'https://blob.example/fire.png',
  createdAt: '2026-01-01T00:00:00.000Z',
}

const location: LocationReference = {
  id: 'loc-foyer',
  location: 'FOYER',
  locationDisplay: 'INT. FOYER - NIGHT',
  imageUrl: 'https://blob.example/foyer.png',
  sourceSceneIndex: 0,
  sourceSceneHeading: 'INT. FOYER - NIGHT',
  pinnedAt: '2026-01-01T00:00:00.000Z',
  versions: [door, fire],
}

describe('locationVersionResolve', () => {
  it('compares beat positions across scenes', () => {
    expect(compareBeatPosition({ sceneNumber: 1, beatIndex: 4 }, { sceneNumber: 2, beatIndex: 0 })).toBeLessThan(0)
  })

  it('falls back to the base when no version has started yet', () => {
    expect(
      resolveLocationVersionForBeat(location, { sceneNumber: 1, beatIndex: 0, beatId: 'b0' })
    ).toBeNull()
  })

  it('sticks forward from the change beat until a later version starts', () => {
    expect(
      resolveLocationVersionForBeat(location, { sceneNumber: 1, beatIndex: 1 })?.id
    ).toBe('ver-door')
    expect(
      resolveLocationVersionForBeat(location, { sceneNumber: 1, beatIndex: 2 })?.id
    ).toBe('ver-door')
    expect(
      resolveLocationVersionForBeat(location, { sceneNumber: 1, beatIndex: 3 })?.id
    ).toBe('ver-fire')
    expect(
      resolveLocationVersionForBeat(location, { sceneNumber: 2, beatIndex: 0 })?.id
    ).toBe('ver-fire')
  })

  it('honors an explicit user override', () => {
    expect(
      resolveLocationVersionForBeat(
        location,
        { sceneNumber: 1, beatIndex: 0 },
        'ver-fire'
      )?.id
    ).toBe('ver-fire')
  })

  it('swaps the generation image to the version still without changing parent id', () => {
    const mapped = locationReferenceForGeneration(location, 'ver-door')
    expect(mapped.id).toBe('loc-foyer')
    expect(mapped.imageUrl).toBe('https://blob.example/door.png')
    expect(mapped.boundVersionId).toBe('ver-door')
  })

  it('keeps the base image when the version has no still yet', () => {
    const mapped = locationReferenceForGeneration(
      { ...location, versions: [{ ...door, imageUrl: undefined }] },
      'ver-door'
    )
    expect(mapped.imageUrl).toBe(location.imageUrl)
    expect(mapped.boundVersionId).toBeUndefined()
  })

  it('marks version images stale after the base establishing shot changes', () => {
    const next = withStaleVersionsAfterBaseChange(location)
    expect(next.versions?.every((v) => v.needsImageRegen)).toBe(true)
    expect(next.imageUrl).toBe(location.imageUrl)
  })

  it('round-trips composite requirement ids', () => {
    const id = locationVersionRequirementId('loc-foyer', 'ver-door')
    expect(parseLocationVersionRequirementId(id)).toEqual({
      locationId: 'loc-foyer',
      versionId: 'ver-door',
    })
  })
})
