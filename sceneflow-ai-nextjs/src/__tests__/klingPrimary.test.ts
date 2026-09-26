import { describe, expect, it } from 'vitest'
import { getKlingCreditsForGeneration } from '@/lib/credits/creditCosts'
import { injectElementTagsIntoPrompt, buildElementPromptTags } from '@/lib/kling/elementRegistry'

describe('Kling primary billing + elements', () => {
  it('charges more for omni pro 10s than std', () => {
    const pro = getKlingCreditsForGeneration({
      model: 'kling-v3-omni',
      quality: 'pro',
      durationSeconds: 10,
    })
    const std = getKlingCreditsForGeneration({
      model: 'kling-v3-omni',
      quality: 'std',
      durationSeconds: 10,
    })
    expect(pro).toBeGreaterThan(std)
  })

  it('builds element prompt tags', () => {
    expect(buildElementPromptTags(['elem-1', 'elem-2'])).toEqual([
      '<<<elem-1>>>',
      '<<<elem-2>>>',
    ])
    expect(
      injectElementTagsIntoPrompt('Hero enters the station', [
        { tag: '<<<elem-1>>>', token: 'person [1]', names: ['Hero'] },
        { tag: '<<<elem-2>>>', token: 'location [1]', names: ['station'] },
      ])
    ).toBe('person [1] <<<elem-1>>> enters the location [1] <<<elem-2>>>')
    expect(injectElementTagsIntoPrompt('person [1] enters', ['<<<elem-1>>>'])).toBe(
      '<<<elem-1>>>\nperson [1] enters'
    )
  })
})
