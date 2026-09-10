import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'
import { isShortCharacterRole } from '@/components/ui/ExpandableText'

const characterLibraryPath = path.join(
  process.cwd(),
  'src/components/vision/CharacterLibrary.tsx',
)

describe('isShortCharacterRole', () => {
  it('treats catalog labels and one-word roles as short', () => {
    expect(isShortCharacterRole('lead')).toBe(true)
    expect(isShortCharacterRole('Supporting')).toBe(true)
    expect(isShortCharacterRole('narrator')).toBe(true)
    expect(isShortCharacterRole('Guide')).toBe(true)
    expect(isShortCharacterRole('')).toBe(true)
  })

  it('treats story-role sentences as long', () => {
    expect(isShortCharacterRole('corporate fixer for the board')).toBe(false)
    expect(isShortCharacterRole('primary guide / narrator')).toBe(false)
  })
})

describe('CharacterLibrary expandable descriptions', () => {
  it('uses ExpandableText for description, long role, and Casting Brief', () => {
    const source = readFileSync(characterLibraryPath, 'utf8')
    expect(source).toContain('ExpandableText')
    expect(source).toContain('isShortCharacterRole')
    expect(source).toContain('text={character.description}')
    expect(source).toContain('text={character.voiceDescription}')
    expect(source).toContain('text={character.role}')
    expect(source).not.toContain('line-clamp-2">\n          {character.description}')
    expect(source).not.toContain('italic line-clamp-3')
  })
})
