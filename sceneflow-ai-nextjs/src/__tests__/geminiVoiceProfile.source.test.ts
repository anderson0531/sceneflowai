import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'

const dialogPath = path.join(
  process.cwd(),
  'src/components/tts/VoiceSelectionDialog.tsx',
)
const characterLibraryPath = path.join(
  process.cwd(),
  'src/components/vision/CharacterLibrary.tsx',
)
const seriesPagePath = path.join(
  process.cwd(),
  'src/app/dashboard/series/[seriesId]/page.tsx',
)
const visionPagePath = path.join(
  process.cwd(),
  'src/app/dashboard/workflow/vision/[projectId]/page.tsx',
)

describe('Gemini voice profile source contracts', () => {
  it('VoiceSelectionDialog no longer imports VoiceDesignPanel or ElevenLabs browse', () => {
    const source = readFileSync(dialogPath, 'utf8')
    expect(source).not.toContain('VoiceDesignPanel')
    expect(source).not.toContain('NarratorVoicePicker')
    expect(source).not.toContain('/api/tts/elevenlabs')
    expect(source).toContain("provider=\"google\"")
    expect(source).toContain('CINEMATIC_NARRATOR_PRESETS')
    expect(source).toContain('pickGeminiBaseVoice')
  })

  it('CharacterLibrary Auto writes google provider + prompt and drops the star-name picker', () => {
    const source = readFileSync(characterLibraryPath, 'utf8')
    expect(source).toContain('buildGoogleVoiceAssignment')
    expect(source).toContain('Voice profile ready.')
    expect(source).toContain('provider: "google"')
    expect(source).not.toContain('GeminiVoicePicker')
    expect(source).not.toContain('NarratorVoicePicker')
    expect(source).not.toContain('/api/tts/elevenlabs')
    expect(source).toContain('mode={isNarratorCharacter ? "narrator" : "character"}')
  })

  it('Series listen buttons use Google narrator presets', () => {
    const source = readFileSync(seriesPagePath, 'utf8')
    expect(source).toContain('DEFAULT_CINEMATIC_NARRATOR')
    expect(source).toContain('provider="google"')
    expect(source).toContain('mode="narrator"')
    expect(source).not.toContain('provider="elevenlabs"')
    expect(source).not.toContain('GEMINI_VOICES')
  })

  it('Production narrator default is a cinematic Google preset', () => {
    const source = readFileSync(visionPagePath, 'utf8')
    expect(source).toContain('DEFAULT_CINEMATIC_NARRATOR')
    expect(source).toContain("provider: 'google'")
    expect(source).not.toContain('pNInz6obpgDQGcFmaJgB')
  })
})
