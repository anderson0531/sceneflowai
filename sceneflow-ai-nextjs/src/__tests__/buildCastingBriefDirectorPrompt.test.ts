import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'
import {
  buildCastingBriefDirectorPrompt,
  parseCastingBriefDirectorResponse,
} from '@/lib/character/buildCastingBriefDirectorPrompt'

const requestCastingBriefPath = path.join(
  process.cwd(),
  'src/lib/character/requestCastingBrief.ts',
)
const characterLibraryPath = path.join(
  process.cwd(),
  'src/components/vision/CharacterLibrary.tsx',
)
const visionPagePath = path.join(
  process.cwd(),
  'src/app/dashboard/workflow/vision/[projectId]/page.tsx',
)

describe('buildCastingBriefDirectorPrompt', () => {
  const base = {
    characterName: 'Julian Ward',
    characterRole: 'corporate fixer',
    gender: 'male',
    age: 'late 50s',
    ethnicity: 'Caucasian',
    genre: 'thriller',
    appearanceDescription:
      'Late 50s Caucasian man, tall lean build, deep-set eyes, salt-and-pepper hair.',
  }

  it('includes appearance and role, and forbids clothing and plot', () => {
    const prompt = buildCastingBriefDirectorPrompt({
      ...base,
      directorNotes: 'Older, drier, keep the quiet authority',
      currentBrief: 'A polished corporate baritone.',
    })

    expect(prompt).toContain('"voiceDescription"')
    expect(prompt).toContain("DIRECTOR'S NOTES")
    expect(prompt).toContain('Older, drier, keep the quiet authority')
    expect(prompt).toContain('PHYSICAL IDENTITY')
    expect(prompt).toContain('salt-and-pepper hair')
    expect(prompt).toContain('corporate fixer')
    expect(prompt).toContain('Clothing, wardrobe')
    expect(prompt).toContain('Plot beats')
    expect(prompt).toContain('combination of detailed physical appearance and casting role')
  })

  it('recommend mode omits director notes and still forbids clothing', () => {
    const prompt = buildCastingBriefDirectorPrompt({
      ...base,
      recommendMode: true,
    })

    expect(prompt).toContain('Recommend a full Casting Brief')
    expect(prompt).toContain('"voiceDescription"')
    expect(prompt).not.toContain("DIRECTOR'S NOTES")
    expect(prompt).toContain('Do not describe clothing')
    expect(prompt).toContain('PHYSICAL IDENTITY')
  })
})

describe('parseCastingBriefDirectorResponse', () => {
  it('parses voiceDescription from fenced JSON', () => {
    const parsed = parseCastingBriefDirectorResponse(`
\`\`\`json
{
  "voiceDescription": "Late 50s male, weathered face, dry gravelly baritone, unhurried corporate detachment."
}
\`\`\`
`)
    expect(parsed.voiceDescription).toContain('gravelly baritone')
  })

  it('rejects a response with no voiceDescription', () => {
    expect(() => parseCastingBriefDirectorResponse(JSON.stringify({}))).toThrow(
      'Invalid casting brief structure',
    )
  })
})

describe('CharacterLibrary casting director UI', () => {
  it('uses a dictation casting prompt instead of the old textarea editor', () => {
    const source = readFileSync(characterLibraryPath, 'utf8')
    expect(source).toContain('Direct casting')
    expect(source).toContain('castingDirectorText')
    expect(source).toContain('requestCastingBrief')
    expect(source).toContain("from \"@/lib/character/requestCastingBrief\"")
    expect(readFileSync(requestCastingBriefPath, 'utf8')).toContain(
      '/api/character/generate-casting-brief',
    )
    expect(source).toContain('syncCastingBriefFromAppearance')
    expect(source).toContain('DictationTextarea')
    expect(source).not.toContain('setVoiceDescriptionText(character.voiceDescription')
    expect(source).not.toContain('Casting brief updated";')
  })
})

describe('vision appearance sync', () => {
  it('regenerates the casting brief after image upload, generate, and enhance', () => {
    const source = readFileSync(visionPagePath, 'utf8')
    expect(source).toContain('refreshCastingBriefForAppearance')
    expect(source).toContain('castingBriefFieldsFromAppearance')
    expect(source).toContain('voiceDescription: applied.voiceDescription')
  })
})
