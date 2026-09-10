import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'
import {
  buildWardrobeDirectorPrompt,
  parseWardrobeDirectorResponse,
} from '@/lib/character/buildWardrobeDirectorPrompt'

const characterLibraryPath = path.join(
  process.cwd(),
  'src/components/vision/CharacterLibrary.tsx',
)

describe('buildWardrobeDirectorPrompt', () => {
  const base = {
    characterName: 'Maya Chen',
    characterRole: 'investigative reporter',
    appearanceDescription: 'Late 30s African American woman, athletic build',
    genre: 'thriller',
    setting: 'Chicago',
  }

  it('includes appearanceNotes in the JSON schema and split/guardrail rules', () => {
    const prompt = buildWardrobeDirectorPrompt({
      ...base,
      wardrobeDescription: 'Navy suit instead of black, keep the glasses, bloodshot eyes',
    })

    expect(prompt).toContain('"appearanceNotes"')
    expect(prompt).toContain('DIRECTOR\'S NOTES')
    expect(prompt).toContain('Navy suit instead of black, keep the glasses, bloodshot eyes')
    expect(prompt).toContain('Clothing')
    expect(prompt).toContain('wardrobeAccessories')
    expect(prompt).toContain('Never put body identity')
    expect(prompt).toContain('Never write plot beats')
    expect(prompt).toContain('formal event, public debate, or stage performance')
    expect(prompt).not.toMatch(/copy the appearance description into defaultWardrobe/i)
  })

  it('includes current-look context when editing', () => {
    const prompt = buildWardrobeDirectorPrompt({
      ...base,
      wardrobeDescription: 'Make the suit navy',
      currentOutfit: 'Charcoal grey tailored suit, white dress shirt',
      currentAccessories: 'Rectangular glasses',
      currentAppearanceNotes: 'Bruise on temple',
    })

    expect(prompt).toContain('CURRENT LOOK')
    expect(prompt).toContain('Charcoal grey tailored suit')
    expect(prompt).toContain('Rectangular glasses')
    expect(prompt).toContain('Bruise on temple')
    expect(prompt).toContain('Make the suit navy')
  })

  it('recommend mode omits director notes and still requires appearanceNotes', () => {
    const prompt = buildWardrobeDirectorPrompt({
      ...base,
      recommendMode: true,
    })

    expect(prompt).toContain('Recommend a signature wardrobe')
    expect(prompt).toContain('"appearanceNotes"')
    expect(prompt).toContain('Physical Appearance (identity context only')
    expect(prompt).not.toContain('DIRECTOR\'S NOTES')
  })
})

describe('parseWardrobeDirectorResponse', () => {
  it('parses split fields including empty appearanceNotes', () => {
    const parsed = parseWardrobeDirectorResponse(`
\`\`\`json
{
  "wardrobeName": "Office Attire",
  "defaultWardrobe": "Navy tailored suit, white shirt",
  "wardrobeAccessories": "Rectangular glasses",
  "appearanceNotes": ""
}
\`\`\`
`)
    expect(parsed.defaultWardrobe).toBe('Navy tailored suit, white shirt')
    expect(parsed.wardrobeAccessories).toBe('Rectangular glasses')
    expect(parsed.appearanceNotes).toBe('')
    expect(parsed.wardrobeName).toBe('Office Attire')
  })

  it('rejects a response with no outfit', () => {
    expect(() =>
      parseWardrobeDirectorResponse(JSON.stringify({ wardrobeAccessories: 'watch' })),
    ).toThrow('Invalid wardrobe structure')
  })
})

describe('CharacterLibrary wardrobe director UI', () => {
  it('uses Direct/Match voice labels and a dictation wardrobe prompt', () => {
    const source = readFileSync(characterLibraryPath, 'utf8')
    expect(source).toContain('Direct')
    expect(source).toContain('Match')
    expect(source).not.toContain('Select Voice')
    expect(source).not.toMatch(/>\s*Auto\s*</)
    expect(source).toContain('DictationTextarea')
    expect(source).toContain('Direct wardrobe')
    expect(source).toContain('currentOutfit')
    expect(source).toContain('appearanceNotes')
  })
})
