import { describe, expect, it } from 'vitest'
import {
  buildDirectorNotePrompt,
  characterVoiceProfileFromAnalysis,
  narrativeVoiceInputs,
  vocalCharacterContext,
} from '@/lib/tts/buildCharacterVoiceProfile'
import type { WardrobeVoiceAnalysisResult } from '@/lib/character/wardrobeVoiceAnalysis'

const analysis: WardrobeVoiceAnalysisResult = {
  gender: 'male',
  apparentAge: 'late 40s',
  ethnicity: 'neutral American',
  voiceDescription:
    'Authoritative, measured, resonant male voice with quiet conviction and polished academic delivery.',
  audioProfile:
    'A late-40s male baritone, warm and slightly husky. Measured pacing with quiet authority. Neutral American accent. Thoughtful, never theatrical.',
  confidence: 'narrative',
}

describe('narrativeVoiceInputs', () => {
  it('drops appearance and wardrobe, keeps role and personality', () => {
    const inputs = narrativeVoiceInputs({
      role: 'documentary guide',
      keyFeature: 'quiet authority',
      description: 'Navy overcoat, angular jaw, salt-and-pepper beard',
      appearanceDescription: 'Navy overcoat, angular jaw, salt-and-pepper beard',
      voiceDescription: 'Measured resonant baritone',
    })

    expect(inputs.role).toBe('documentary guide')
    expect(inputs.personality).toBe('quiet authority')
    expect(inputs.matchingBrief).toBe('Measured resonant baritone')
    expect(inputs.narrative).toBeUndefined()
  })

  it('keeps a story description that is not the appearance dump', () => {
    const inputs = narrativeVoiceInputs({
      description: 'An academic outcast who presents suppressed histories.',
      appearanceDescription: 'Navy overcoat, angular jaw',
    })
    expect(inputs.narrative).toContain('academic outcast')
  })
})

describe('characterVoiceProfileFromAnalysis', () => {
  it('keeps the matching brief and director notes as separate fields', () => {
    const profile = characterVoiceProfileFromAnalysis(analysis)
    expect(profile.matchingBrief).toBe(analysis.voiceDescription)
    expect(profile.directorNotes).toBe(analysis.audioProfile)
    expect(profile.identity).toEqual({
      gender: 'male',
      age: 'late 40s',
      ethnicity: 'neutral American',
    })
    expect(profile.matchingBrief).not.toBe(profile.directorNotes)
  })
})

describe('vocalCharacterContext', () => {
  it('does not copy appearanceDescription into description', () => {
    const ctx = vocalCharacterContext({
      name: 'Gideon',
      role: 'guide',
      appearanceDescription: 'Red hair, torn grey hoodie',
      description: 'Red hair, torn grey hoodie',
      keyFeature: 'measured gravitas',
    })
    expect(ctx.description).toBeUndefined()
    expect(ctx.appearanceDescription).toBe('Red hair, torn grey hoodie')
    expect(ctx.personality).toBe('measured gravitas')
    expect(ctx.role).toBe('guide')
  })
})

describe('buildDirectorNotePrompt', () => {
  it('asks for vocal-only notes and omits appearance and plot', () => {
    const prompt = buildDirectorNotePrompt({
      characterContext: {
        name: 'Gideon',
        role: 'documentary guide',
        gender: 'male',
        age: 'late 50s',
        personality: 'quiet authority',
        voiceDescription: 'Measured resonant academic baritone',
        description: 'Should not appear as a Description dump',
        backstory: 'He fled the academy after a scandal.',
      },
    })

    expect(prompt).toContain('Gemini TTS')
    expect(prompt).toContain('Matching brief')
    expect(prompt).toContain('Measured resonant academic baritone')
    expect(prompt).toContain('Do NOT mention clothing')
    expect(prompt).not.toContain('Description:')
    expect(prompt).not.toContain('Backstory:')
    expect(prompt).not.toContain('Should not appear as a Description dump')
    expect(prompt).not.toContain('fled the academy')
  })
})
