import { describe, it, expect } from 'vitest'
import {
  buildIdentityPromptToken,
  optimizePromptForImagen,
  sanitizePromptForIdentityRefs,
} from '@/lib/imagen/promptOptimizer'

describe('promptOptimizer reference-first binding', () => {
  it('buildIdentityPromptToken returns person [N] token', () => {
    expect(buildIdentityPromptToken(1)).toBe('person [1]')
    expect(buildIdentityPromptToken(2)).toBe('person [2]')
  })

  it('dual-ref optimize path uses person [N] without demographic text', () => {
    const prompt = optimizePromptForImagen({
      sceneAction: 'Maria sits at her desk reviewing data on a monitor.',
      visualDescription: 'Maria sits at her desk reviewing data on a monitor.',
      artStyle: 'photorealistic',
      characterReferences: [
        {
          referenceId: 1,
          name: 'Maria',
          description: 'Hispanic woman in her late 20s',
          identityReferenceId: 1,
          wardrobeReferenceId: 2,
          hasDualReferences: true,
          promptToken: 'person [1]',
          linkingDescription: 'person [1]',
          appearanceDescription: 'Hispanic woman in her late 20s with dark hair',
        },
      ],
    })

    expect(prompt).toContain('Create an image about person [1]')
    expect(prompt).toContain('person [1]')
    expect(prompt).toContain('wardrobe reference [2]')
    expect(prompt.toLowerCase()).not.toContain('hispanic')
    expect(prompt.toLowerCase()).not.toContain('late 20s')
  })

  it('sanitizePromptForIdentityRefs replaces character names with person tokens', () => {
    const sanitized = sanitizePromptForIdentityRefs(
      'Cinematic medium close-up of Maria, a young woman with calm expression.',
      [{ name: 'Maria', promptToken: 'person [1]', identityReferenceId: 1 }]
    )
    expect(sanitized).toContain('person [1]')
    expect(sanitized).not.toContain('Maria')
  })
})
