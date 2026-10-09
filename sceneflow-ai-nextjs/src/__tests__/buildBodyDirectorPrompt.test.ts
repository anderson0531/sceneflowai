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
const generateBodyRoutePath = path.join(
  process.cwd(),
  'src/app/api/character/generate-body-description/route.ts',
)
const visionPagePath = path.join(
  process.cwd(),
  'src/app/dashboard/workflow/vision/[projectId]/page.tsx',
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
    expect(prompt).toContain("Director's notes outrank")
    expect(prompt).toContain('handsome')
    expect(prompt).toContain('oval face')
    expect(prompt).not.toContain('do not invent a replacement')
  })

  it('recommend mode omits director notes and still forbids clothing', () => {
    const prompt = buildBodyDirectorPrompt({
      ...base,
      recommendMode: true,
      currentAppearance: 'Late 30s African American woman, oval face',
    })

    expect(prompt).toContain('Recommend a specific physical identity')
    expect(prompt).toContain('fits the character\'s role and screenplay')
    expect(prompt).toContain('"appearanceDescription"')
    expect(prompt).not.toContain("DIRECTOR'S NOTES")
    expect(prompt).not.toContain("Director's notes outrank")
    expect(prompt).not.toContain('do not invent a replacement')
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

  it('applies director notes at a lower temperature than Recommend', () => {
    const route = readFileSync(generateBodyRoutePath, 'utf8')
    expect(route).toContain('body.recommendMode ? 0.7 : 0.4')
  })

  it('saves the body description before refreshing the casting brief', () => {
    const library = readFileSync(characterLibraryPath, 'utf8')
    const apply = library.indexOf('await onUpdateAppearance(characterId, nextDescription)')
    const brief = library.indexOf('await syncCastingBriefFromAppearance(nextDescription)')
    expect(apply).toBeGreaterThan(-1)
    expect(brief).toBeGreaterThan(apply)
  })

  it('patches the live cast list when saving a voice', () => {
    const page = readFileSync(visionPagePath, 'utf8')
    const voiceStart = page.indexOf('const handleUpdateCharacterVoice')
    const voiceEnd = page.indexOf('const handleUpdateCharacterEdgeVoice')
    const voice = page.slice(voiceStart, voiceEnd)
    expect(voice).toContain('const sourceCharacters = charactersRef.current')
    expect(voice).toContain('charactersRef.current = updatedCharacters')
    expect(voice).not.toContain('characters.map')
    expect(voice).not.toContain('characters.findIndex')
  })
})
