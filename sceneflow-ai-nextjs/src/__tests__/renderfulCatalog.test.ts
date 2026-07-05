import { describe, expect, it, beforeEach } from 'vitest'
import {
  clearRenderfulCatalogCache,
  tryMatchCatalogModel,
  parseCatalogResponse,
} from '@/lib/aggregator/renderfulCatalog'
import { getAggregatorModel, getRefUpgradeEntryForModel } from '@/lib/aggregator/modelRegistry'

describe('renderfulCatalog', () => {
  beforeEach(() => {
    clearRenderfulCatalogCache()
  })

  it('parses models as string slugs', () => {
    const parsed = parseCatalogResponse(
      {
        models: ['kling-v2-6-text-to-video', 'wan-2.6-text-to-video'],
      },
      'text-to-video'
    )
    expect(parsed).toHaveLength(2)
    expect(parsed[0].id).toBe('kling-v2-6-text-to-video')
  })

  it('parses models as objects with id and name', () => {
    const parsed = parseCatalogResponse(
      {
        models: [
          { id: 'kling-v3-0-text-to-video', name: 'Kling v3.0', type: 'text-to-video' },
          { id: 'seedance-1-5-pro-text-to-video', name: 'Seedance 1.5 Pro', type: 'text-to-video' },
        ],
      },
      'text-to-video'
    )
    expect(parsed[0].name).toBe('Kling v3.0')
  })

  it('matches Kling 2.6 by keywords against catalog slugs', () => {
    const entry = getAggregatorModel('kling-2.6')
    expect(entry).toBeDefined()

    const slug = tryMatchCatalogModel(entry!, 'text-to-video', [
      { id: 'kling-v2-6-text-to-video', name: 'Kling v2.6', type: 'text-to-video' },
      { id: 'kling-v3-0-text-to-video', name: 'Kling v3.0', type: 'text-to-video' },
      { id: 'kling-video-o1-reference-to-video', type: 'reference-to-video' },
    ])

    expect(slug).toBe('kling-v2-6-text-to-video')
  })

  it('matches Runway Gen-4 for image-to-video only', () => {
    const entry = getAggregatorModel('runway-gen4')
    expect(entry).toBeDefined()

    const slug = tryMatchCatalogModel(entry!, 'image-to-video', [
      { id: 'runway-gen4-turbo-image-to-video', name: 'Runway Gen4 Turbo', type: 'image-to-video' },
      { id: 'runway-gen4-aleph-video-to-video', name: 'Runway Gen4 Aleph', type: 'video-to-video' },
    ])

    expect(slug).toBe('runway-gen4-turbo-image-to-video')
  })

  it('returns null when no catalog match exists', () => {
    const entry = getAggregatorModel('kling-3.0')
    expect(
      tryMatchCatalogModel(entry!, 'text-to-video', [
        { id: 'wan-2.6-text-to-video', name: 'WAN 2.6', type: 'text-to-video' },
      ])
    ).toBeNull()
  })

  it('returns null for Runway on text-to-video catalog', () => {
    const entry = getAggregatorModel('runway-gen4')
    expect(tryMatchCatalogModel(entry!, 'text-to-video', [])).toBeNull()
  })

  it('getRefUpgradeEntryForModel maps kling family to Kling Video O1', () => {
    const entry = getAggregatorModel('kling-2.6')
    expect(entry).toBeDefined()
    const upgrade = getRefUpgradeEntryForModel(entry!)
    expect(upgrade?.id).toBe('kling-video-o1')
    expect(upgrade?.supportedRenderfulTypes).toContain('reference-to-video')
  })

  it('getRefUpgradeEntryForModel maps wan family to WAN 2.7 R2V', () => {
    const entry = getAggregatorModel('wan-2.6')
    expect(entry).toBeDefined()
    const upgrade = getRefUpgradeEntryForModel(entry!)
    expect(upgrade?.id).toBe('wan-2.7-r2v')
  })

  it('getRefUpgradeEntryForModel returns undefined for families without REF upgrade', () => {
    const entry = getAggregatorModel('runway-gen4')
    expect(entry).toBeDefined()
    expect(getRefUpgradeEntryForModel(entry!)).toBeUndefined()
  })
})
