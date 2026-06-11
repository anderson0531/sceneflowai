import { describe, it, expect } from 'vitest'
import {
  resolveStoryboardGeneration,
  beatFrameNeedsGeneration,
  collectDraftStoryboardFrameWarnings,
  resolveEffectiveStoryboardTier,
  getPhotorealisticPromptAnchor,
  getFinalPhotorealisticPromptAnchor,
} from '@/lib/storyboard/storyboardQuality'

describe('storyboardQuality', () => {
  it('maps draft to eco + 1K', () => {
    const gen = resolveStoryboardGeneration({ storyboardQuality: 'draft' })
    expect(gen).toEqual({
      storyboardQuality: 'draft',
      modelTier: 'eco',
      quality: 'auto',
      imageSize: '1K',
      imagenQuality: 'fast',
    })
  })

  it('maps final to designer + 2K', () => {
    const gen = resolveStoryboardGeneration({ storyboardQuality: 'final' })
    expect(gen).toEqual({
      storyboardQuality: 'final',
      modelTier: 'designer',
      quality: 'max',
      imageSize: '2K',
      imagenQuality: 'standard',
    })
  })

  it('maps legacy max imageQuality to final', () => {
    const gen = resolveStoryboardGeneration({ legacyImageQuality: 'max' })
    expect(gen.storyboardQuality).toBe('final')
    expect(gen.modelTier).toBe('designer')
  })

  it('treats missing tier as draft', () => {
    expect(resolveEffectiveStoryboardTier(undefined)).toBe('draft')
    expect(resolveEffectiveStoryboardTier('final')).toBe('final')
  })

  it('skips final beats on finalizeOnly pass', () => {
    expect(
      beatFrameNeedsGeneration(
        {
          storyboardImageUrl: 'https://example.com/a.jpg',
          storyboardImageTier: 'final',
        },
        { finalizeOnly: true, storyboardQuality: 'final' }
      )
    ).toBe(false)
  })

  it('regenerates draft beats on finalizeOnly pass', () => {
    expect(
      beatFrameNeedsGeneration(
        {
          storyboardImageUrl: 'https://example.com/a.jpg',
          storyboardImageTier: 'draft',
        },
        { finalizeOnly: true, storyboardQuality: 'final' }
      )
    ).toBe(true)
  })

  it('warns when draft frames exist on approved scene', () => {
    const warnings = collectDraftStoryboardFrameWarnings({
      beats: [
        {
          beatId: 'bt_1',
          sequenceIndex: 0,
          kind: 'action',
          actionDescription: 'Test',
          storyboardImageUrl: 'https://example.com/frame.jpg',
          storyboardImageTier: 'draft',
        },
      ],
    })
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toMatch(/Finalize/i)
  })

  it('returns draft photorealistic anchor for draft tier', () => {
    const anchor = getPhotorealisticPromptAnchor('draft', 'photorealistic')
    expect(anchor).toContain('live-action')
    expect(anchor).toContain('no cartoon')
    expect(anchor).not.toContain('natural skin texture and pores')
  })

  it('returns stronger final photorealistic anchor', () => {
    const anchor = getPhotorealisticPromptAnchor('final', 'photorealistic')
    expect(anchor).toContain('natural skin texture and pores')
    expect(anchor).toContain('no anime')
    expect(getFinalPhotorealisticPromptAnchor('photorealistic')).toBe(anchor)
  })

  it('returns empty anchor for non-photorealistic art styles', () => {
    expect(getPhotorealisticPromptAnchor('final', 'anime-90s')).toBe('')
  })
})
