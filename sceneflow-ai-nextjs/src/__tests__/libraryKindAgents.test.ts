import { describe, expect, it } from 'vitest'
import {
  applyLocationUpdateFromSyncDiff,
  collectMissingExtractedLocations,
  countCastAgentItems,
  countLocationAgentItems,
  countObjectAgentItems,
  firstLibraryTabWithRequiredWork,
  idsMissingLocationBase,
  kindAgentToolbarLabel,
  libraryTabForPrimaryAction,
  locationVersionNeedsGeneration,
  locationsThatGainedBase,
  pendingKindAgentRunForAction,
  referenceExpressAgentLabel,
  summarizeLibraryRequiredActions,
  toLocationReferenceFromExtracted,
} from '@/lib/vision/libraryKindAgents'
import {
  buildLocationVersionSyncDiff,
} from '@/lib/vision/locationScriptSync'
import type { LocationReference } from '@/types/visionReferences'

describe('referenceExpressAgentLabel', () => {
  it('names Library Agent when kinds are omitted', () => {
    expect(referenceExpressAgentLabel()).toBe('Library Agent')
    expect(referenceExpressAgentLabel(['cast', 'location', 'prop'])).toBe('Library Agent')
  })

  it('names the kind agents', () => {
    expect(referenceExpressAgentLabel(['cast'])).toBe('Cast Agent')
    expect(referenceExpressAgentLabel(['location'])).toBe('Location Agent')
    expect(referenceExpressAgentLabel(['prop'])).toBe('Object Agent')
  })
})

describe('kind agent counts', () => {
  it('counts missing cast identity plus stale wardrobes', () => {
    expect(
      countCastAgentItems([
        { type: 'lead', referenceImage: '', wardrobes: [{ needsImageRegen: true }] },
        { type: 'narrator', referenceImage: '' },
        { type: 'lead', referenceImage: 'https://cdn/mira.png', wardrobes: [] },
      ])
    ).toBe(2)
  })

  it('counts missing location bases plus nested stale or missing versions', () => {
    expect(
      countLocationAgentItems([
        { imageUrl: '' },
        {
          imageUrl: 'https://cdn/dock.png',
          versions: [
            { stateNotes: 'Door blown out', imageUrl: '', needsImageRegen: true },
            { stateNotes: 'Flooded', imageUrl: 'https://cdn/flood.png' },
          ],
        },
      ])
    ).toBe(2)
  })

  it('counts missing object stills', () => {
    expect(
      countObjectAgentItems([{ imageUrl: '' }, { imageUrl: 'https://cdn/key.png' }])
    ).toBe(1)
  })
})

describe('summarizeLibraryRequiredActions', () => {
  it('picks Library Agent for missing bases that still gate frames', () => {
    const summary = summarizeLibraryRequiredActions({
      characters: [{ type: 'lead', name: 'Mira', referenceImage: '' }],
      locationReferences: [
        {
          location: 'DOCK',
          imageUrl: '',
          versions: [{ stateNotes: 'Door gone', imageUrl: '', needsImageRegen: true }],
        },
      ],
      objectReferences: [{ name: 'Key', imageUrl: '' }],
    })
    expect(summary.primaryAction).toBe('library')
    expect(summary.reason).toBe('missing-library-bases')
    expect(summary.libraryMissingTotal).toBe(3)
    expect(summary.locations).toEqual({
      missingBases: 1,
      missingVersions: 1,
      staleVersions: 0,
    })
    expect(summary.tabAttention).toEqual({
      cast: 'missing',
      locations: 'missing',
      object: 'missing',
    })
    expect(firstLibraryTabWithRequiredWork(summary)).toBe('cast')
  })

  it('names only the missing location bases when that is the library work', () => {
    const summary = summarizeLibraryRequiredActions({
      characters: [{ type: 'lead', name: 'Mira', referenceImage: 'https://cdn/mira.png' }],
      locationReferences: [{ location: 'FOYER', imageUrl: '' }],
      objectReferences: [{ name: 'Key', imageUrl: 'https://cdn/key.png' }],
    })
    expect(summary.primaryAction).toBe('library')
    expect(summary.reason).toBe('missing-location-bases')
    expect(summary.reasonCount).toBe(1)
    expect(firstLibraryTabWithRequiredWork(summary)).toBe('locations')
  })

  it('picks Location Agent for stale set versions after bases exist', () => {
    const summary = summarizeLibraryRequiredActions({
      characters: [{ type: 'lead', name: 'Mira', referenceImage: 'https://cdn/mira.png' }],
      locationReferences: [
        {
          location: 'FOYER',
          imageUrl: 'https://cdn/foyer.png',
          versions: [
            {
              stateNotes: 'Door blown out',
              imageUrl: 'https://cdn/door.png',
              needsImageRegen: true,
            },
            { stateNotes: 'Flooded', imageUrl: '' },
          ],
        },
      ],
      objectReferences: [],
    })
    expect(summary.libraryMissingTotal).toBe(0)
    expect(summary.primaryAction).toBe('location')
    expect(summary.reason).toBe('stale-location-versions')
    expect(summary.locations).toEqual({
      missingBases: 0,
      missingVersions: 1,
      staleVersions: 1,
    })
    expect(summary.tabAttention.locations).toBe('missing')
    expect(firstLibraryTabWithRequiredWork(summary)).toBe('locations')
    expect(pendingKindAgentRunForAction(summary.primaryAction)).toBe('location')
    expect(libraryTabForPrimaryAction(summary.primaryAction, summary)).toBe('locations')
  })

  it('marks the Locations tab amber when only set stills are stale', () => {
    const summary = summarizeLibraryRequiredActions({
      characters: [{ type: 'lead', name: 'Mira', referenceImage: 'https://cdn/mira.png' }],
      locationReferences: [
        {
          location: 'FOYER',
          imageUrl: 'https://cdn/foyer.png',
          versions: [
            {
              stateNotes: 'Door blown out',
              imageUrl: 'https://cdn/door.png',
              needsImageRegen: true,
            },
          ],
        },
      ],
      objectReferences: [],
    })
    expect(summary.primaryAction).toBe('location')
    expect(summary.reason).toBe('stale-location-versions')
    expect(summary.tabAttention.locations).toBe('stale')
  })

  it('picks Cast Agent for stale wardrobes after identity stills exist', () => {
    const summary = summarizeLibraryRequiredActions({
      characters: [
        {
          type: 'lead',
          name: 'Mira',
          referenceImage: 'https://cdn/mira.png',
          wardrobes: [{ needsImageRegen: true }],
        },
      ],
      locationReferences: [{ location: 'FOYER', imageUrl: 'https://cdn/foyer.png' }],
      objectReferences: [],
    })
    expect(summary.primaryAction).toBe('cast')
    expect(summary.reason).toBe('stale-cast-wardrobes')
    expect(summary.cast).toEqual({ missingIdentity: 0, staleWardrobes: 1 })
    expect(summary.tabAttention.cast).toBe('stale')
    expect(summary.tabAttention.locations).toBe('ready')
    expect(firstLibraryTabWithRequiredWork(summary)).toBe('cast')
  })

  it('hides the next action when nothing remains', () => {
    const summary = summarizeLibraryRequiredActions({
      characters: [{ type: 'lead', name: 'Mira', referenceImage: 'https://cdn/mira.png' }],
      locationReferences: [{ location: 'FOYER', imageUrl: 'https://cdn/foyer.png' }],
      objectReferences: [{ name: 'Key', imageUrl: 'https://cdn/key.png' }],
    })
    expect(summary.primaryAction).toBeNull()
    expect(summary.reason).toBeNull()
    expect(summary.tabAttention).toEqual({
      cast: 'ready',
      locations: 'ready',
      object: 'ready',
    })
    expect(pendingKindAgentRunForAction(summary.primaryAction)).toBeNull()
    expect(firstLibraryTabWithRequiredWork(summary)).toBe('cast')
  })

  it('maps Library Agent to a parent run rather than a kind-tab pending flag', () => {
    expect(pendingKindAgentRunForAction('library')).toBeNull()
    expect(pendingKindAgentRunForAction('object')).toBe('prop')
  })
})

describe('kindAgentToolbarLabel', () => {
  it('promotes a count into a Run CTA and stays quiet at 0', () => {
    expect(kindAgentToolbarLabel('Location Agent', 3)).toBe('Run Location Agent — 3 needed')
    expect(kindAgentToolbarLabel('Location Agent', 0)).toBe('Location Agent (0)')
  })
})

describe('location Update uses sync merge', () => {
  const existingVersions = [
    {
      id: 'ver-door',
      name: 'Exploded front door',
      stateNotes: 'Front door blown out, splinters on the floor',
      sceneNumbers: [1],
      imageUrl: 'https://blob.example/door.png',
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'ver-flood',
      name: 'Flooded kitchen',
      stateNotes: 'Kitchen standing water around the island',
      sceneNumbers: [4],
      imageUrl: 'https://blob.example/flood.png',
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  ]

  const location = {
    id: 'loc-1',
    location: 'FOYER',
    locationDisplay: 'INT. FOYER - DAY',
    imageUrl: 'https://cdn/foyer.png',
    sourceSceneIndex: 0,
    sourceSceneHeading: 'INT. FOYER - DAY',
    pinnedAt: '2026-01-01T00:00:00.000Z',
    versions: existingVersions,
  } as LocationReference

  it('creates, patches, and soft-obsoletes instead of suggest-only append', () => {
    const diff = buildLocationVersionSyncDiff('loc-1', 'FOYER', existingVersions, [
      {
        name: 'Exploded front door',
        stateNotes: 'Front door blown out, foyer on fire, ceiling collapsed',
        sceneNumbers: [1],
        reason: 'Fire after the blast',
      },
      {
        name: 'Boarded windows',
        stateNotes: 'Windows boarded with plywood',
        sceneNumbers: [3],
        reason: 'Time jump',
      },
    ])

    const applied = applyLocationUpdateFromSyncDiff(location, diff)
    expect(applied.created).toBe(1)
    expect(applied.updated).toBe(1)
    expect(applied.stale).toBeGreaterThan(0)

    const door = applied.location.versions?.find((v) => v.id === 'ver-door')
    expect(door?.needsImageRegen).toBe(true)
    expect(door?.stateNotes).toMatch(/fire/i)

    const flood = applied.location.versions?.find((v) => v.id === 'ver-flood')
    expect(flood?.sceneNumbers).toEqual([])
    expect(flood?.imageUrl).toBe('https://blob.example/flood.png')

    const boarded = applied.location.versions?.find((v) => v.name === 'Boarded windows')
    expect(boarded?.needsImageRegen).toBe(true)
    expect(applied.location.versions?.map((v) => v.id)).toEqual(
      expect.arrayContaining(['ver-door', 'ver-flood'])
    )
    expect(applied.location.versions).toHaveLength(3)
  })

  it('extracts only heading locations that are not already in the library', () => {
    const missing = collectMissingExtractedLocations(
      [
        {
          location: 'DOCKYARD',
          headings: ['EXT. DOCKYARD - NIGHT'],
          sceneNumbers: [1],
          description: '',
        },
        {
          location: 'ATRIUM',
          headings: ['INT. ATRIUM - DAY'],
          sceneNumbers: [2],
          description: '',
        },
      ],
      [{ location: 'DOCKYARD' }]
    )
    expect(missing.map((row) => row.location)).toEqual(['ATRIUM'])
    const row = toLocationReferenceFromExtracted(missing[0], 'loc-new')
    expect(row.imageUrl).toBe('')
    expect(row.autoExtracted).toBe(true)
  })

  it('treats locations extracted in Update as missing bases for the later version pass', () => {
    const afterExtract = [
      { id: 'existing-empty', imageUrl: '' },
      { id: 'just-extracted', imageUrl: '' },
      { id: 'already-based', imageUrl: 'https://cdn/foyer.png' },
    ]
    const ids = idsMissingLocationBase(afterExtract)
    expect(ids).toEqual(['existing-empty', 'just-extracted'])

    const afterExpress = [
      { id: 'existing-empty', imageUrl: 'https://cdn/old.png' },
      { id: 'just-extracted', imageUrl: 'https://cdn/new.png' },
      { id: 'already-based', imageUrl: 'https://cdn/foyer.png' },
    ]
    expect(locationsThatGainedBase(afterExpress, ids).map((row) => row.id)).toEqual([
      'existing-empty',
      'just-extracted',
    ])
  })

  it('only generates versions that have notes, a parent still, and missing or stale images', () => {
    expect(
      locationVersionNeedsGeneration(
        { imageUrl: 'https://cdn/base.png' },
        { stateNotes: 'Door gone', imageUrl: '', needsImageRegen: true }
      )
    ).toBe(true)
    expect(
      locationVersionNeedsGeneration(
        { imageUrl: '' },
        { stateNotes: 'Door gone', imageUrl: '', needsImageRegen: true }
      )
    ).toBe(false)
    expect(
      locationVersionNeedsGeneration(
        { imageUrl: 'https://cdn/base.png' },
        { stateNotes: '', imageUrl: '' }
      )
    ).toBe(false)
  })
})
