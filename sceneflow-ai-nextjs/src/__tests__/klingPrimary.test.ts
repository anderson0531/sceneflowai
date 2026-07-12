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
    expect(injectElementTagsIntoPrompt('Hero enters', ['<<<elem-1>>>'])).toBe(
      'Hero enters <<<elem-1>>>'
    )
  })
})
