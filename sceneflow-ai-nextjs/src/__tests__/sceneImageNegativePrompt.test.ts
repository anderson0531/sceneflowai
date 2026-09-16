import { describe, expect, it } from 'vitest'
import {
  buildSceneImageNegativePrompt,
  ESSENTIAL_QUALITY_NEGATIVE_TERMS,
  MAX_SCENE_IMAGE_NEGATIVE_TERMS,
} from '@/lib/imagen/sceneImageNegativePrompt'

describe('buildSceneImageNegativePrompt', () => {
  it('omits structural layout primes even when they are passed as extras', () => {
    const prompt = buildSceneImageNegativePrompt({
      extraTerms: ['split-screen output', 'diptych', 'two-panel layout', 'collage', 'blurry'],
    })
    expect(prompt.toLowerCase()).not.toMatch(/split-screen/)
    expect(prompt.toLowerCase()).not.toMatch(/diptych/)
    expect(prompt.toLowerCase()).not.toMatch(/two-panel/)
    expect(prompt.toLowerCase()).not.toMatch(/collage/)
    expect(prompt).toMatch(/blurry/)
    expect(prompt).toMatch(/mannequin geometry/)
  })

  it('omits typography primes when title text is allowed, even if extras name them', () => {
    const prompt = buildSceneImageNegativePrompt({
      allowTypography: true,
      extraTerms: ['text overlay', 'centered typography', 'blurry'],
    })
    expect(prompt.toLowerCase()).not.toMatch(/text overlay/)
    expect(prompt.toLowerCase()).not.toMatch(/typography/)
    expect(prompt).toMatch(/blurry/)
  })

  it('keeps text overlay when typography is not allowed', () => {
    const prompt = buildSceneImageNegativePrompt({ allowTypography: false })
    expect(prompt).toMatch(/text overlay/)
  })

  it('dedupes and caps the exclusion list', () => {
    const extras = Array.from({ length: 40 }, (_, i) => `artifact-${i}`)
    const prompt = buildSceneImageNegativePrompt({ extraTerms: extras })
    const terms = prompt.split(',').map((t) => t.trim()).filter(Boolean)
    expect(terms.length).toBeLessThanOrEqual(MAX_SCENE_IMAGE_NEGATIVE_TERMS)
    expect(new Set(terms).size).toBe(terms.length)
    expect(ESSENTIAL_QUALITY_NEGATIVE_TERMS.length).toBeLessThan(MAX_SCENE_IMAGE_NEGATIVE_TERMS)
  })
})
