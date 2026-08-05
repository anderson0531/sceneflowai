import { describe, it, expect } from 'vitest'
import { classifyField } from '@/i18n/content/fieldRegistry'
import {
  applyTreatmentVariantTranslations,
  buildAudienceDefinitionDisplayFields,
  buildAudienceResonanceDisplayFields,
  buildNarrativeReasoningDisplayFields,
  buildRefineDiffDisplayFields,
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

  it('applies resolved translations onto display fields while keeping names opaque', () => {
    const source = {
      id: 'A',
      title: 'English Title',
      logline: 'English logline',
      character_descriptions: [
        { name: 'Ada', role: 'Lead', description: 'An archivist.' },
      ],
    }
    const localized = applyTreatmentVariantTranslations(source, (path) => {
      if (path.endsWith('.title')) return { text: 'Título en español' }
      if (path.endsWith('.logline')) return { text: 'Logline en español' }
      if (path.endsWith('.description')) return { text: 'Una archivista.' }
      return { text: '' }
    })

    expect(localized?.title).toBe('Título en español')
    expect(localized?.logline).toBe('Logline en español')
    expect(localized?.character_descriptions?.[0]?.name).toBe('Ada')
    expect(localized?.character_descriptions?.[0]?.description).toBe('Una archivista.')
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

describe('buildNarrativeReasoningDisplayFields', () => {
  it('flattens reasoning prose and classifies as display', () => {
    const fields = buildNarrativeReasoningDisplayFields({
      character_focus: 'Ada drives every turn.',
      story_strengths: 'Clear stakes.',
      user_adjustments: 'Lean darker.',
      key_decisions: [{ decision: 'Keep the vault', why: 'Theme', impact: 'Act two' }],
    })

    expect(fields['narrativeReasoning.character_focus']).toBe('Ada drives every turn.')
    expect(fields['narrativeReasoning.key_decisions[0].decision']).toBe('Keep the vault')
    expect(classifyField('narrativeReasoning.character_focus')).toBe('display')
    expect(classifyField('narrativeReasoning.key_decisions[0].why')).toBe('display')
  })
})

describe('buildAudienceDefinitionDisplayFields', () => {
  it('exposes description and custom direction as display fields', () => {
    const fields = buildAudienceDefinitionDisplayFields({
      description: 'Adult drama fans',
      customDirection: 'Prefer slow burn',
    })
    expect(fields['audienceDefinition.description']).toBe('Adult drama fans')
    expect(classifyField('audienceDefinition.customDirection')).toBe('display')
  })
})

describe('buildRefineDiffDisplayFields', () => {
  it('maps before/after snippets for content MT', () => {
    const fields = buildRefineDiffDisplayFields([
      { before: 'Old logline', after: 'New logline' },
    ])
    expect(fields['refineDiff[0].before']).toBe('Old logline')
    expect(fields['refineDiff[0].after']).toBe('New logline')
    expect(classifyField('refineDiff[0].after')).toBe('display')
  })
})
