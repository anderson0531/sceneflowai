import { describe, it, expect } from 'vitest'
import { USE_CASE_PERSONAS } from '@/config/landing/useCasePersonasCopy'
import { AUDIENCE_PATHS } from '@/config/landing/valuePropCopy'
import { USE_CASE_PERSONA_IMAGES } from '@/config/landing/landingVisualMedia'

describe('filmProduction landing persona', () => {
  it('includes filmProduction in USE_CASE_PERSONAS with required fields', () => {
    const persona = USE_CASE_PERSONAS.filmProduction
    expect(persona.label).toBe('Film Production')
    expect(persona.title).toBe('The Film Producer')
    expect(persona.solution.features.length).toBeGreaterThanOrEqual(4)
    expect(persona.keyPhrases).toContain('Audience Resonance')
  })

  it('includes matching AUDIENCE_PATHS entry with hash and icon', () => {
    const path = AUDIENCE_PATHS.find((p) => p.id === 'filmProduction')
    expect(path).toBeDefined()
    expect(path?.hash).toBe('use-cases-film-production')
    expect(path?.icon).toBe('clapperboard')
    expect(path?.defaultCategoryId).toBe('entertainment')
  })

  it('includes hero image placeholder for filmProduction', () => {
    expect(USE_CASE_PERSONA_IMAGES.filmProduction).toBeTruthy()
  })
})
