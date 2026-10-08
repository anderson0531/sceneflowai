import { describe, expect, it } from 'vitest'
import {
  GLOSSARY_TERMS,
  icuArguments,
  icuArgumentsMatch,
  protectAll,
  protectGlossary,
  protectIcu,
  restoreAll,
  restoreGlossary,
  restoreIcu,
} from '@/lib/i18n/glossary'
import { sourceHash } from '@/lib/i18n/contentHash'

describe('glossary protection', () => {
  it('round-trips product names', () => {
    const source = 'Open Blueprint Room and sync to Production Stage.'
    const { protectedText, map } = protectGlossary(source)
    expect(protectedText).not.toContain('Blueprint Room')
    expect(restoreGlossary(protectedText, map)).toBe(source)
  })

  it('matches the longest term first so short terms do not shadow long ones', () => {
    const { protectedText, map } = protectGlossary('SceneFlow Studio is here')
    // A greedy "SceneFlow" match would leave " Studio" dangling as prose.
    expect(protectedText).not.toContain(' Studio')
    expect(restoreGlossary(protectedText, map)).toBe('SceneFlow Studio is here')
  })

  it('survives an engine injecting whitespace into the placeholder', () => {
    const { map } = protectGlossary('Welcome to Blueprint Room')
    const mangled = 'Bienvenido a SFAI BLUEPRINT_ROOM TERM'
    expect(restoreGlossary(mangled, map)).toContain('Blueprint Room')
  })

  it('accepts per-request names such as series characters', () => {
    const { protectedText, map } = protectGlossary('Mira enters the Vault.', [
      'Mira',
      'the Vault',
    ])
    expect(protectedText).not.toContain('Mira')
    expect(restoreGlossary(protectedText, map)).toBe('Mira enters the Vault.')
  })
})

describe('ICU protection', () => {
  it('tokenizes simple placeholders', () => {
    const source = 'Examples for {label}:'
    const { protectedText, map } = protectIcu(source)
    expect(protectedText).not.toContain('{label}')
    expect(restoreIcu(protectedText, map)).toBe(source)
  })

  it('tokenizes a whole plural expression rather than its parts', () => {
    const source = '{count, plural, =1 {# language} other {# languages}}'
    const { protectedText, map } = protectIcu(source)
    expect(map.size).toBe(1)
    expect(protectedText).not.toContain('plural')
    expect(restoreIcu(protectedText, map)).toBe(source)
  })

  it('recovers a token an engine lower-cased or padded', () => {
    const source = 'You save {percent}% on credits'
    const { map } = protectIcu(source)
    expect(restoreIcu('Ahorras sfaiicu 0 zz% en créditos', map)).toContain('{percent}')
  })

  it('round-trips glossary and ICU together', () => {
    const source = 'Blueprint Room supports {count, plural, =1 {# language} other {# languages}}'
    const { protectedText, glossary, icu } = protectAll(source)
    expect(protectedText).not.toContain('Blueprint Room')
    expect(protectedText).not.toContain('plural')
    expect(restoreAll(protectedText, glossary, icu)).toBe(source)
  })
})

describe('icuArgumentsMatch', () => {
  it('passes when the translation kept every argument', () => {
    expect(icuArgumentsMatch('Hi {name}, you have {count} left', 'Hola {name}, te quedan {count}')).toBe(
      true
    )
  })

  it('fails when an argument was dropped or translated', () => {
    expect(icuArgumentsMatch('Hi {name}', 'Hola')).toBe(false)
    expect(icuArgumentsMatch('Hi {name}', 'Hola {nombre}')).toBe(false)
  })

  it('reports arguments in a stable order', () => {
    expect(icuArguments('{b} then {a}')).toEqual(['{a}', '{b}'])
  })
})

describe('sourceHash', () => {
  it('ignores insignificant whitespace so near-identical strings share a cache entry', () => {
    expect(sourceHash('A  hook\nline', 'en')).toBe(sourceHash('A hook line', 'en'))
  })

  it('changes when the wording changes, so an edit misses the cache', () => {
    expect(sourceHash('A hook line', 'en')).not.toBe(sourceHash('A hook line.', 'en'))
  })

  it('is scoped by source locale', () => {
    expect(sourceHash('Hola', 'es')).not.toBe(sourceHash('Hola', 'en'))
  })
})

describe('glossary contents', () => {
  it('protects the three studio names the plan calls out', () => {
    expect(GLOSSARY_TERMS).toContain('Blueprint Room')
    expect(GLOSSARY_TERMS).not.toContain('Blueprint Board')
    expect(GLOSSARY_TERMS).toContain('Series Room')
    expect(GLOSSARY_TERMS).not.toContain('Series Desk')
    expect(GLOSSARY_TERMS).toContain('Production Stage')
    expect(GLOSSARY_TERMS).toContain('Intelligent Assistant Director')
    expect(GLOSSARY_TERMS).toContain('Co-Director')
  })

  it('protects the Agent actions, whose names are product terms', () => {
    for (const term of [
      'Scene Ref Agent',
      'Library Agent',
      'Cast Agent',
      'Location Agent',
      'Object Agent',
      'Audio Agent',
      'Scene Agent',
      'Stills Agent',
      'Video Agent',
      'Promo Agent',
      'Run All Agents',
    ]) {
      expect(GLOSSARY_TERMS).toContain(term)
    }
  })

  it('keeps Blueprint Room intact rather than clipping it to Blueprint', () => {
    const { protectedText, map } = protectGlossary('Open the Blueprint Room before Production Stage.')

    expect(protectedText).not.toContain('Blueprint Room')
    expect(protectedText).not.toContain('Blueprint')
    expect(restoreGlossary(protectedText, map)).toContain('Blueprint Room')
  })

  it('keeps Co-Director intact rather than translating it as a role title', () => {
    const { protectedText, map } = protectGlossary('Use the Co-Director for targeted edits instead.')

    expect(protectedText).not.toContain('Co-Director')
    expect(restoreGlossary(protectedText, map)).toContain('Co-Director')
  })

  it('keeps "Run All Agents" intact rather than translating it as a verb phrase', () => {
    const { protectedText, map } = protectGlossary('Run All Agents — advanced (4)')

    expect(protectedText).not.toContain('Run All Agents')
    expect(restoreGlossary('SFAI RUN_ALL_AGENTS TERM — avanzado (4)', map)).toContain(
      'Run All Agents'
    )
  })
})
