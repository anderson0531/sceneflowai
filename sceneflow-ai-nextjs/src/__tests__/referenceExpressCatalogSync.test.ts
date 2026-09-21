import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { LocationCatalogSyncState } from '@/lib/vision/referenceExpress/catalogSync'
import type { ReferenceExpressItem } from '@/lib/vision/referenceExpress/types'

const loadContext = vi.fn()
const persistPatch = vi.fn()
const analyze = vi.fn()

vi.mock('@/models', () => ({}))
vi.mock('@/models/Project', () => ({ Project: { findByPk: vi.fn() } }))
vi.mock('@/lib/vision/referenceExpress/planItems', async () => {
  const actual = await vi.importActual<typeof import('@/lib/vision/referenceExpress/planItems')>(
    '@/lib/vision/referenceExpress/planItems'
  )
  return {
    ...actual,
    loadReferenceExpressContext: (...args: unknown[]) => loadContext(...args),
  }
})
vi.mock('@/lib/vision/referenceExpress/persistLocationCatalog', () => ({
  persistLocationCatalogPatch: (...args: unknown[]) => persistPatch(...args),
}))
vi.mock('@/lib/vision/syncLocationVersionsFromScript', async () => {
  const actual = await vi.importActual<
    typeof import('@/lib/vision/syncLocationVersionsFromScript')
  >('@/lib/vision/syncLocationVersionsFromScript')
  return {
    ...actual,
    analyzeLocationVersionsFromScript: (...args: unknown[]) => analyze(...args),
  }
})

import { runLocationCatalogSyncStep } from '@/lib/vision/referenceExpress/catalogSync'

const pending: LocationCatalogSyncState = { status: 'pending', cursor: 0, locationIds: [] }

const DOCK = {
  id: 'l1',
  location: 'DOCKYARD',
  locationDisplay: 'EXT. DOCKYARD - NIGHT',
  imageUrl: 'https://cdn/dock.png',
  sceneNumbers: [1],
  versions: [],
}

beforeEach(() => {
  vi.clearAllMocks()
  persistPatch.mockResolvedValue({ saved: true })
  analyze.mockResolvedValue({
    diff: {
      locationId: 'l1',
      locationName: 'DOCKYARD',
      updates: [],
      creates: [
        {
          name: 'Door gone',
          stateNotes: 'Door blown out',
          sceneNumbers: [1],
          reason: 'explosion',
        },
      ],
      obsolete: [],
    },
    totals: { createCount: 1, updateCount: 0, staleImageCount: 0 },
    analyzedScenes: 1,
  })
})

describe('runLocationCatalogSyncStep', () => {
  it('extracts missing heading locations then waits to LLM-sync', async () => {
    loadContext.mockResolvedValue({
      characters: [],
      locations: [],
      props: [],
      scenes: [
        {
          heading: 'EXT. DOCKYARD - NIGHT',
          sceneDirection: { scene: { location: 'Rusted cranes' } },
        },
      ],
      screenplayContext: {},
    })

    const outcome = await runLocationCatalogSyncStep({
      projectId: 'proj-1',
      catalogSync: pending,
      items: [],
    })

    expect(persistPatch).toHaveBeenCalled()
    expect(analyze).not.toHaveBeenCalled()
    expect(outcome.kind).toBe('continue')
    if (outcome.kind !== 'continue') return
    expect(outcome.catalogSync.status).toBe('syncing')
    expect(outcome.catalogSync.locationIds.length).toBeGreaterThan(0)
  })

  it('appends set-version stills after the last location syncs', async () => {
    const withVersion = {
      ...DOCK,
      versions: [
        {
          id: 'v-door',
          name: 'Door gone',
          stateNotes: 'Door blown out',
          imageUrl: '',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    }
    loadContext
      .mockResolvedValueOnce({
        characters: [],
        locations: [DOCK],
        props: [],
        scenes: [{ heading: 'EXT. DOCKYARD - NIGHT' }],
        screenplayContext: {},
      })
      .mockResolvedValueOnce({
        characters: [],
        locations: [withVersion],
        props: [],
        scenes: [{ heading: 'EXT. DOCKYARD - NIGHT' }],
        screenplayContext: {},
      })

    const outcome = await runLocationCatalogSyncStep({
      projectId: 'proj-1',
      catalogSync: { status: 'syncing', cursor: 0, locationIds: ['l1'] },
      items: [],
    })

    expect(analyze).toHaveBeenCalledOnce()
    expect(persistPatch).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: 'proj-1', patchById: expect.objectContaining({ id: 'l1' }) })
    )
    expect(outcome.kind).toBe('continue')
    if (outcome.kind !== 'continue') return
    expect(outcome.catalogSync.status).toBe('done')
    expect(outcome.items?.some((item: ReferenceExpressItem) => item.versionId)).toBe(true)
  })

  it('completes cleanly when catalog sync finds nothing to generate', async () => {
    loadContext.mockResolvedValue({
      characters: [],
      locations: [],
      props: [],
      scenes: [],
      screenplayContext: {},
    })

    const outcome = await runLocationCatalogSyncStep({
      projectId: 'proj-1',
      catalogSync: pending,
      items: [],
    })

    expect(outcome).toMatchObject({
      kind: 'nothing-to-generate',
      catalogSync: { status: 'done' },
    })
    expect(analyze).not.toHaveBeenCalled()
  })

  it('finishes with nothing-to-generate after sync when every still already exists', async () => {
    loadContext.mockResolvedValue({
      characters: [],
      locations: [{ ...DOCK, versions: [] }],
      props: [],
      scenes: [{ heading: 'EXT. DOCKYARD - NIGHT' }],
      screenplayContext: {},
    })
    analyze.mockResolvedValue({
      diff: {
        locationId: 'l1',
        locationName: 'DOCKYARD',
        updates: [],
        creates: [],
        obsolete: [],
      },
      totals: { createCount: 0, updateCount: 0, staleImageCount: 0 },
      analyzedScenes: 1,
    })

    const outcome = await runLocationCatalogSyncStep({
      projectId: 'proj-1',
      catalogSync: { status: 'syncing', cursor: 0, locationIds: ['l1'] },
      items: [],
    })

    expect(outcome).toMatchObject({
      kind: 'nothing-to-generate',
      catalogSync: { status: 'done' },
    })
  })
})
