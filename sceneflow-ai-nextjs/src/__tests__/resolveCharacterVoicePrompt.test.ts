import { describe, expect, it } from 'vitest'
import { resolveCharacterVoicePrompt } from '@/lib/tts/resolveCharacterVoicePrompt'
import { readFileSync } from 'fs'
import path from 'path'

const STRUCTURED_NOTE = `ROLE: Piper Hayes, supporting.
AGE & VOCAL PROFILE: Grounded, smoky alto with a fatigue-worn rasp.
DELIVERY RULES:
- Cadence: Sharp, propulsive (~165-175 WPM).`

const CASTING_BRIEF =
  'A female voice in her late 30s to early 40s of African American descent, possessing a grounded, smoky alto pitch with a textured, fatigue-worn rasp.'

describe('resolveCharacterVoicePrompt', () => {
  it('prefers the casting brief over a structured Director\'s Note', () => {
    const resolved = resolveCharacterVoicePrompt(
      { prompt: STRUCTURED_NOTE },
      {
        voiceDescription: CASTING_BRIEF,
        voiceConfig: { prompt: STRUCTURED_NOTE },
      },
    )

    expect(resolved.prompt).toBe(CASTING_BRIEF)
    expect(resolved.source).toBe('voiceDescription')
  })

  it('uses the saved prompt when there is no casting brief', () => {
    const fromClient = resolveCharacterVoicePrompt(
      { prompt: STRUCTURED_NOTE },
      { voiceConfig: { prompt: 'ignored db note' } },
    )
    expect(fromClient.prompt).toBe(STRUCTURED_NOTE)
    expect(fromClient.source).toBe('client')

    const fromDb = resolveCharacterVoicePrompt(
      {},
      { voiceConfig: { prompt: STRUCTURED_NOTE } },
    )
    expect(fromDb.prompt).toBe(STRUCTURED_NOTE)
    expect(fromDb.source).toBe('db')
  })

  it('returns none when neither brief nor prompt exists', () => {
    expect(resolveCharacterVoicePrompt({}, {})).toEqual({
      prompt: '',
      source: 'none',
    })
  })
})

describe('VoiceDirectionEditor no longer generates ROLE notes', () => {
  it('does not call director-prompt or show Generate', () => {
    const source = readFileSync(
      path.join(process.cwd(), 'src/components/tts/VoiceDirectionEditor.tsx'),
      'utf8',
    )
    expect(source).toContain('Casting Brief')
    expect(source).not.toContain('/api/tts/google/director-prompt')
    expect(source).not.toContain('handleAutoFill')
    expect(source).not.toContain('Generate')
  })
})
