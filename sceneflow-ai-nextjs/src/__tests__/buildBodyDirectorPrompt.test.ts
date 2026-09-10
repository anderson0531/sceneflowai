import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'
import {
  buildBodyDirectorPrompt,
  parseBodyDirectorResponse,
} from '@/lib/character/buildBodyDirectorPrompt'

const characterLibraryPath = path.join(
  process.cwd(),
  'src/components/vision/CharacterLibrary.tsx',
)

describe('buildBodyDirectorPrompt', () => {
  const base = {
    characterName: 'Piper Hayes',
    characterRole: 'investigative reporter',
    gender: 'female',
    age: 'late 30s',
    ethnicity: 'African American',
    genre: 'thriller',
    setting: 'Chicago',
  }

  it('includes appearanceDescription schema and identity-only guardrails', () => {
    const prompt = buildBodyDirectorPrompt({
      ...base,
      directorNotes: 'Taller, keep the cheekbones, late 40s',
      currentAppearance: 'Late 30s African American woman, athletic build, sharp cheekbones',
    })

    expect(prompt).toContain('"appearanceDescription"')
    expect(prompt).toContain("DIRECTOR'S NOTES")
    expect(prompt).toContain('Taller, keep the cheekbones, late 40s')
    expect(prompt).toContain('CURRENT APPEARANCE')
    expect(prompt).toContain('sharp cheekbones')
    expect(prompt).toContain('Clothing, wardrobe')
    expect(prompt).toContain('plot')
    expect(prompt).toContain('Scene makeup')
  })

  it('recommend mode omits director notes and still forbids clothing', () => {
    const prompt = buildBodyDirectorPrompt({
      ...base,
      recommendMode: true,
    })

    expect(prompt).toContain('Recommend a specific physical identity')
    expect(prompt).toContain('"appearanceDescription"')
    expect(prompt).not.toContain("DIRECTOR'S NOTES")
    expect(prompt).toContain('Do not describe clothing')
  })
})

describe('parseBodyDirectorResponse', () => {
  it('parses appearanceDescription from fenced JSON', () => {
    const parsed = parseBodyDirectorResponse(`
\`\`\`json
{
  "appearanceDescription": "Late 40s African American woman, tall athletic build, sharp cheekbones, dark brown eyes."
}
\`\`\`
`)
    expect(parsed.appearanceDescription).toContain('tall athletic build')
  })

  it('rejects a response with no appearanceDescription', () => {
    expect(() => parseBodyDirectorResponse(JSON.stringify({}))).toThrow(
      'Invalid body description structure',
    )
  })
})

describe('CharacterLibrary body director UI', () => {
  it('uses a dictation body prompt instead of the old textarea editor', () => {
    const source = readFileSync(characterLibraryPath, 'utf8')
    expect(source).toContain('Direct body')
    expect(source).toContain('bodyDirectorText')
    expect(source).toContain('/api/character/generate-body-description')
    expect(source).toContain('DictationTextarea')
    expect(source).not.toContain('Athletic build, tall, muscular, slim figure')
    expect(source).not.toContain('bodyDescriptionText')
  })
})
