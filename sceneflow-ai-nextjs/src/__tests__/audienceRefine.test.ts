import { describe, it, expect } from 'vitest'
import {
  validateAudienceDescription,
  coerceDerivedProfile,
  parseRefineResult,
  buildRefinePrompt,
} from '@/lib/audience/refineAudience'
import {
  createAudienceDefinition,
  formatAudienceDefinitionForPrompt,
  formatCulturalSignalsForPrompt,
  buildCulturalAnalysisDirective,
  normalizeCulturalSignals,
  hasCulturalSignals,
  DEFAULT_TARGET_AUDIENCE,
} from '@/lib/types/audienceResonance'

describe('validateAudienceDescription', () => {
  it('flags too-short descriptions', () => {
    const { valid, issues } = validateAudienceDescription('men')
    expect(valid).toBe(false)
    expect(issues.some((i) => i.code === 'too-short')).toBe(true)
  })

  it('flags overly-broad descriptions', () => {
    const { valid, issues } = validateAudienceDescription('everyone')
    expect(valid).toBe(false)
    expect(issues.some((i) => i.code === 'too-vague' || i.code === 'too-short')).toBe(true)
  })

  it('accepts a specific description', () => {
    const { valid } = validateAudienceDescription(
      'Thai millennials in Bangkok who love Muay Thai and Buddhist-influenced drama'
    )
    expect(valid).toBe(true)
  })
})

describe('coerceDerivedProfile', () => {
  it('keeps valid enum values and defaults unknowns', () => {
    const profile = coerceDerivedProfile({
      region: 'southeast-asia',
      ageRange: 'young-adult-18-24',
      gender: 'not-a-real-value',
    })
    expect(profile.region).toBe('southeast-asia')
    expect(profile.ageRange).toBe('young-adult-18-24')
    expect(profile.gender).toBe(DEFAULT_TARGET_AUDIENCE.gender)
    expect(profile.educationLevel).toBe(DEFAULT_TARGET_AUDIENCE.educationLevel)
  })
})

describe('parseRefineResult', () => {
  it('normalizes a full model response', () => {
    const result = parseRefineResult(
      {
        valid: true,
        issues: [],
        enhancedDescription: 'Thai adults in Bangkok, Buddhist, love regional drama.',
        summary: 'Urban Thai adults',
        derivedProfile: { region: 'southeast-asia', ageRange: 'millennials-25-34' },
        culturalSignals: {
          cultures: ['Thai'],
          locales: ['Thailand', 'Bangkok'],
          languages: ['Thai'],
          faith: ['Theravada Buddhism'],
          values: [],
        },
      },
      'thai audience'
    )
    expect(result.valid).toBe(true)
    expect(result.enhancedDescription).toContain('Thai')
    expect(result.derivedProfile.region).toBe('southeast-asia')
    expect(result.culturalSignals?.cultures).toEqual(['Thai'])
    // empty arrays stripped
    expect(result.culturalSignals?.values).toBeUndefined()
  })

  it('falls back to the original description when model output is empty', () => {
    const result = parseRefineResult({}, 'Nigerian Gen Z gamers')
    expect(result.enhancedDescription).toBe('Nigerian Gen Z gamers')
    expect(result.derivedProfile).toBeDefined()
  })
})

describe('buildRefinePrompt', () => {
  it('includes the raw description and project context', () => {
    const prompt = buildRefinePrompt('Korean teens who love K-pop', {
      title: 'Idol Dreams',
      genre: 'drama',
    })
    expect(prompt).toContain('Korean teens who love K-pop')
    expect(prompt).toContain('Idol Dreams')
    expect(prompt).toContain('culturalSignals')
  })
})

describe('cultural signals + prompt formatting', () => {
  it('normalizeCulturalSignals dedupes and strips empties', () => {
    const signals = normalizeCulturalSignals({
      cultures: ['Thai', 'Thai', ' '],
      values: [],
      locales: ['Thailand'],
    })
    expect(signals?.cultures).toEqual(['Thai'])
    expect(signals?.locales).toEqual(['Thailand'])
    expect(signals?.values).toBeUndefined()
    expect(hasCulturalSignals(signals)).toBe(true)
  })

  it('formatAudienceDefinitionForPrompt prefers the free-text description', () => {
    const def = createAudienceDefinition({
      description: 'Thai families who enjoy warm, values-driven stories',
      culturalSignals: { cultures: ['Thai'], languages: ['Thai'] },
      source: 'blueprint',
    })
    const block = formatAudienceDefinitionForPrompt(def)
    expect(block).toContain('Audience description: Thai families')
    expect(block).toContain('Cultural specificity:')
    expect(block).toContain('Cultures: Thai')
  })

  it('falls back to profile labels when no description', () => {
    // createAudienceDefinition synthesizes a description from the profile, so
    // format still yields region/age labels for a plain profile.
    const def = createAudienceDefinition({ profile: { region: 'global' }, description: '' })
    const block = formatAudienceDefinitionForPrompt(def)
    expect(block.toLowerCase()).toContain('region')
  })
})

describe('buildCulturalAnalysisDirective', () => {
  it('returns a culture-specific checklist when signals are present', () => {
    const def = createAudienceDefinition({
      description: 'Thai audience',
      culturalSignals: {
        cultures: ['Thai'],
        languages: ['Thai'],
        faith: ['Theravada Buddhism'],
        locales: ['Thailand'],
      },
      source: 'blueprint',
    })
    const directive = buildCulturalAnalysisDirective(def)
    expect(directive).toContain('CULTURAL AUTHENTICITY REQUIREMENTS')
    expect(directive).toContain('Thai')
    expect(directive).toContain('Character names')
    expect(directive).toContain('Theravada Buddhism')
  })

  it('returns empty string for a generic audience', () => {
    const def = createAudienceDefinition({
      description: 'general audience of all ages',
      source: 'blueprint',
    })
    expect(buildCulturalAnalysisDirective(def)).toBe('')
    expect(formatCulturalSignalsForPrompt(def.culturalSignals)).toBe('')
  })
})
