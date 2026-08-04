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
    const source = 'Open Blueprint Studio and sync to Production Studio.'
    const { protectedText, map } = protectGlossary(source)
    expect(protectedText).not.toContain('Blueprint Studio')
    expect(restoreGlossary(protectedText, map)).toBe(source)
  })

  it('matches the longest term first so short terms do not shadow long ones', () => {
    const { protectedText, map } = protectGlossary('SceneFlow AI Studio is here')
    // A greedy "SceneFlow" match would leave " AI Studio" dangling as prose.
    expect(protectedText).not.toContain('AI Studio')
    expect(restoreGlossary(protectedText, map)).toBe('SceneFlow AI Studio is here')
  })

  it('survives an engine injecting whitespace into the placeholder', () => {
    const { map } = protectGlossary('Welcome to Blueprint Studio')
    const mangled = 'Bienvenido a SFAI BLUEPRINT_STUDIO TERM'
    expect(restoreGlossary(mangled, map)).toContain('Blueprint Studio')
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
    const source = 'Blueprint Studio supports {count, plural, =1 {# language} other {# languages}}'
    const { protectedText, glossary, icu } = protectAll(source)
    expect(protectedText).not.toContain('Blueprint Studio')
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
    expect(GLOSSARY_TERMS).toContain('Blueprint Studio')
    expect(GLOSSARY_TERMS).toContain('Series Studio')
    expect(GLOSSARY_TERMS).toContain('Production Studio')
  })
})
