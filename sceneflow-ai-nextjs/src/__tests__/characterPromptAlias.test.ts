import { describe, expect, it } from 'vitest'
import {
  aliasCharacterVideoLabel,
  toCharacterPromptAlias,
} from '@/lib/character/characterPromptAlias'

describe('toCharacterPromptAlias', () => {
  it('prefixes a sanitized Char_ token', () => {
    expect(toCharacterPromptAlias('Winston')).toBe('Char_Winston')
    expect(toCharacterPromptAlias('Elara Vance')).toBe('Char_Elara_Vance')
    expect(toCharacterPromptAlias('Char_Winston')).toBe('Char_Winston')
  })

  it('falls back when the name is empty', () => {
    expect(toCharacterPromptAlias('')).toBe('Char_Character')
    expect(toCharacterPromptAlias(null)).toBe('Char_Character')
  })
})

describe('aliasCharacterVideoLabel', () => {
  it('aliases identity and wardrobe labels', () => {
    expect(aliasCharacterVideoLabel('Identity reference 1: Winston')).toBe(
      'Identity reference 1: Char_Winston'
    )
    expect(aliasCharacterVideoLabel('Wardrobe reference 2: Elara Vance (full-body outfit)')).toBe(
      'Wardrobe reference 2: Char_Elara_Vance (full-body outfit)'
    )
  })

  it('leaves location labels unchanged', () => {
    expect(aliasCharacterVideoLabel('Location reference 5: POLICE STATION')).toBe(
      'Location reference 5: POLICE STATION'
    )
  })
})
