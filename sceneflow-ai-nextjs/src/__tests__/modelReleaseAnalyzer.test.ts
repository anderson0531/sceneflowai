import { describe, expect, it } from 'vitest'
import { GEMINI_PRODUCT_MODELS, VEO_MODELS } from '@/lib/config/modelConfig'
import { MODEL_REGISTRY, type ModelRegistryEntry } from '@/lib/models/modelRegistry'
import {
  analyzeModelReleases,
  newestGaFlash,
  parseCatalogModelIds,
  type ModelCatalogSnapshot,
} from '@/lib/models/modelReleaseAnalyzer'

function catalogs(partial: Partial<Record<ModelCatalogSnapshot['source'], string[]>>): ModelCatalogSnapshot[] {
  return (['vertex', 'gemini_developer', 'gateway'] as const).map((source) => {
    const modelIds = partial[source]
    if (!modelIds) return { source, status: 'unavailable' as const, error: 'missing', modelIds: [] }
    return { source, status: 'ok' as const, modelIds }
  })
}

function entry(id: string): ModelRegistryEntry {
  const found = MODEL_REGISTRY.find((row) => row.id === id)
  if (!found) throw new Error(`missing registry row ${id}`)
  return found
}

function actionFor(id: string, snapshot: ModelCatalogSnapshot[]) {
  return analyzeModelReleases([entry(id)], snapshot).find((row) => row.entryId === id)
}

describe('catalog parsing', () => {
  it('reads gateway, gemini, and vertex list shapes', () => {
    expect(parseCatalogModelIds(['google/gemini-3.8-flash'])).toEqual(['gemini-3.8-flash'])
    expect(parseCatalogModelIds({ data: [{ id: 'google/gemini-3.9-flash' }] })).toEqual([
      'gemini-3.9-flash',
    ])
    expect(parseCatalogModelIds({ models: [{ name: 'models/gemini-omni-1.1-flash' }] })).toEqual([
      'gemini-omni-1.1-flash',
    ])
    expect(
      parseCatalogModelIds({
        publisherModels: [{ name: 'publishers/google/models/gemini-omni-1.1-flash-preview' }],
      })
    ).toEqual(['gemini-omni-1.1-flash-preview'])
  })

  it('picks the highest GA Flash and ignores lite, preview, and image ids', () => {
    expect(
      newestGaFlash([
        'gemini-3.8-flash',
        'gemini-3.10-flash',
        'gemini-3.11-flash-lite',
        'gemini-3.12-flash-preview',
        'gemini-4-flash-image',
        'gemini-3.9-flash',
      ])
    ).toBe('gemini-3.10-flash')
  })
})

describe('analyzeModelReleases', () => {
  it('renames a preview pin when the same API lists the stable id', () => {
    const result = actionFor(
      'text-pro',
      catalogs({
        vertex: ['gemini-3.1-pro', GEMINI_PRODUCT_MODELS.pro],
        gemini_developer: [],
        gateway: [GEMINI_PRODUCT_MODELS.workhorse],
      })
    )
    expect(result?.action).toBe('rename')
    expect(result?.proposedModelId).toBe('gemini-3.1-pro')
    expect(result?.cursorPrompt).toContain('gemini-3.1-pro-preview')
    expect(result?.cursorPrompt).toContain('src/lib/config/modelConfig.ts')
  })

  it('holds Omni when only the Gemini Developer API lists the GA id', () => {
    const result = actionFor(
      'video-omni',
      catalogs({
        vertex: [VEO_MODELS.omni, VEO_MODELS.fast],
        gemini_developer: ['gemini-omni-1.1-flash'],
        gateway: ['gemini-omni-flash-preview', GEMINI_PRODUCT_MODELS.workhorse],
      })
    )
    expect(result?.action).toBe('hold')
    expect(result?.proposedModelId).toBe('gemini-omni-1.1-flash')
    expect(result?.cursorPrompt).toContain('Do not change VEO_MODELS.omni from gemini-omni-1.1-flash-preview')
    expect(result?.cursorPrompt).toContain('$0.10/s at 720p')
    expect(result?.cursorPrompt).toContain('src/__tests__/omniVideoInteractions.test.ts')
  })

  it('bumps the workhorse when Gateway lists a higher GA Flash', () => {
    const result = actionFor(
      'text-workhorse',
      catalogs({
        vertex: [GEMINI_PRODUCT_MODELS.workhorse],
        gemini_developer: [GEMINI_PRODUCT_MODELS.workhorse],
        gateway: [GEMINI_PRODUCT_MODELS.workhorse, 'gemini-3.9-flash', 'gemini-3.9-flash-lite'],
      })
    )
    expect(result?.action).toBe('workhorse_bump')
    expect(result?.proposedModelId).toBe('gemini-3.9-flash')
    expect(result?.cursorPrompt).toContain('aiGatewayGeminiModelIds.json')
  })

  it('does not upgrade when the catalog for that pin is missing', () => {
    const results = analyzeModelReleases(
      [entry('video-omni'), entry('text-workhorse'), entry('text-pro')],
      catalogs({})
    )
    for (const result of results) {
      expect(['unavailable', 'cleanup', 'catalog_only']).toContain(result.action)
      expect(result.action).not.toBe('rename')
      expect(result.action).not.toBe('hold')
      expect(result.action).not.toBe('workhorse_bump')
      expect(result.proposedModelId).toBeNull()
    }
  })

  it('does not invent a successor for an unlisted non-flash pin', () => {
    const result = actionFor(
      'video-fast',
      catalogs({
        vertex: [VEO_MODELS.lite],
        gemini_developer: [],
        gateway: [],
      })
    )
    expect(result?.action).toBe('unlisted')
    expect(result?.proposedModelId).toBeNull()
    expect(result?.cursorPrompt).toBeNull()
  })

  it('renames a missing GA Flash to the newer id on the same API', () => {
    const result = actionFor(
      'text-prior',
      catalogs({
        vertex: ['gemini-3.8-flash'],
        gemini_developer: [],
        gateway: ['gemini-3.8-flash'],
      })
    )
    expect(result?.action).toBe('rename')
    expect(result?.proposedModelId).toBe('gemini-3.8-flash')
  })

  it('asks Cursor to clean up retired Imagen pins', () => {
    const result = actionFor('image-retired-imagen-3-fast', catalogs({}))
    expect(result?.action).toBe('cleanup')
    expect(result?.cursorPrompt).toContain('Do not send')
    expect(result?.currentModelId).toContain('imagen-3.0')
  })
})
