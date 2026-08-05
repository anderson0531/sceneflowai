import { describe, it, expect } from 'vitest'
import { classifyField } from '@/i18n/content/fieldRegistry'
import {
  buildAudienceResonanceDisplayFields,
  buildTreatmentVariantDisplayFields,
  treatmentVariantPathPrefix,
} from '@/i18n/content/buildBlueprintDisplayFields'

describe('buildTreatmentVariantDisplayFields', () => {
  it('prefixes paths with the variant id so the registry can classify them', () => {
    const fields = buildTreatmentVariantDisplayFields({
      id: 'A',
      title: 'The Grand Illusion',
      logline: 'A deception unfolds.',
      synopsis: 'Longer synopsis.',
      beats: [{ title: 'Opening', intent: 'Hook', synopsis: 'We meet the cast.' }],
      character_descriptions: [
        {
          name: 'Ada',
          description: 'A careful archivist.',
          externalGoal: 'Protect the archive',
        },
      ],
      themes: ['truth', 'spectacle'],
    })

    expect(fields['treatmentVariants[A].title']).toBe('The Grand Illusion')
    expect(fields['treatmentVariants[A].logline']).toBe('A deception unfolds.')
    expect(fields['treatmentVariants[A].beats[0].title']).toBe('Opening')
    expect(fields['treatmentVariants[A].character_descriptions[0].description']).toBe(
      'A careful archivist.'
    )
    expect(fields['treatmentVariants[A].themes[0]']).toBe('truth')
    expect(classifyField('treatmentVariants[A].title')).toBe('display')
    expect(classifyField('treatmentVariants[A].beats[0].synopsis')).toBe('display')
    expect(classifyField('treatmentVariants[A].character_descriptions[0].name')).toBe(
      'opaque'
    )
  })

  it('returns an empty map without a variant id', () => {
    expect(buildTreatmentVariantDisplayFields({ title: 'x' })).toEqual({})
    expect(treatmentVariantPathPrefix('B')).toBe('treatmentVariants[B]')
  })
})

describe('buildAudienceResonanceDisplayFields', () => {
  it('flattens summary, strengths, deductions, and recommendations', () => {
    const fields = buildAudienceResonanceDisplayFields({
      summary: 'Resonates well with adults.',
      strengths: ['Strong hook'],
      deductions: [{ reason: 'Pacing dips in act two' }],
      recommendations: [{ id: 'r1', title: 'Tighten beats', text: 'Cut two minutes.' }],
      categories: [{ name: 'Audience Appeal' }],
    })

    expect(fields['audienceResonance.summary']).toBe('Resonates well with adults.')
    expect(fields['audienceResonance.strengths[0]']).toBe('Strong hook')
    expect(fields['audienceResonance.deductions[0].reason']).toBe('Pacing dips in act two')
    expect(fields['audienceResonance.recommendations[r1].title']).toBe('Tighten beats')
    expect(classifyField('audienceResonance.summary')).toBe('display')
    expect(classifyField('audienceResonance.recommendations[r1].text')).toBe('display')
  })
})
