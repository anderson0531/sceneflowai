import { describe, it, expect } from 'vitest'
import {
  getCharacterVoiceRecommendations,
  normalizeGender,
  resolveCharacterGender,
  type CharacterContext,
  type ElevenLabsVoice,
} from '@/lib/voiceRecommendation'
import {
  enrichGeminiVoicesForScoring,
  getGeminiVoicesForApi,
} from '@/lib/tts/geminiVoiceCatalog'

const MARCUS_THORNE_DESCRIPTION =
  "A seasoned defense attorney, initially dismissive of Maya's outlandish claims, but quickly drawn into the terrifying reality of her situation. He represents the audience's initial skepticism and gradual realization of the threat."

function buildGeminiVoicePool(): ElevenLabsVoice[] {
  const apiVoices = getGeminiVoicesForApi().filter((v) => v.id.startsWith('gemini-'))
  return enrichGeminiVoicesForScoring(
    apiVoices.map((v) => ({
      id: v.id,
      name: v.name,
      gender: v.gender,
      description: v.description,
    })),
  )
}

describe('normalizeGender', () => {
  it('normalizes API and character gender strings', () => {
    expect(normalizeGender('MALE')).toBe('male')
    expect(normalizeGender('Female')).toBe('female')
    expect(normalizeGender('man')).toBe('male')
    expect(normalizeGender('woman')).toBe('female')
    expect(normalizeGender('')).toBeNull()
  })
})

describe('resolveCharacterGender', () => {
  it('returns ambiguous when description has no reliable gender signals', () => {
    const result = resolveCharacterGender({
      name: 'Alex Morgan',
      description:
        'A seasoned mediator navigating a tense legal dispute between rival factions.',
    })
    expect(result.confidence).toBe('ambiguous')
    expect(result.gender).toBeNull()
  })

  it('returns explicit when character.gender is set', () => {
    const result = resolveCharacterGender({
      name: 'Marcus Thorne',
      gender: 'male',
      description: MARCUS_THORNE_DESCRIPTION,
    })
    expect(result).toEqual({ gender: 'male', confidence: 'explicit' })
  })

  it('infers male for Marcus Thorne via weighted pronouns and name', () => {
    const result = resolveCharacterGender({
      name: 'Marcus Thorne',
      description: MARCUS_THORNE_DESCRIPTION,
    })
    expect(result.confidence).toBe('inferred')
    expect(result.gender).toBe('male')
  })
})

describe('getCharacterVoiceRecommendations gender hard filter', () => {
  const geminiVoices = buildGeminiVoicePool()

  it('selects a male Gemini voice for explicit male defense attorney, not Achernar', () => {
    const character: CharacterContext = {
      name: 'Marcus Thorne',
      gender: 'male',
      description: MARCUS_THORNE_DESCRIPTION,
      role: 'supporting',
    }

    const recs = getCharacterVoiceRecommendations(geminiVoices, character, undefined, 1)
    expect(recs).toHaveLength(1)
    expect(recs[0].voiceId).not.toBe('gemini-Achernar')

    const voice = geminiVoices.find((v) => v.id === recs[0].voiceId)
    expect(voice?.gender?.toLowerCase()).toBe('male')
  })

  it('never returns a male voice for an explicit female character when female voices exist', () => {
    const character: CharacterContext = {
      name: 'Maya Chen',
      gender: 'female',
      description: 'A determined investigator uncovering a supernatural conspiracy.',
      role: 'protagonist',
    }

    const recs = getCharacterVoiceRecommendations(geminiVoices, character, undefined, 5)
    expect(recs.length).toBeGreaterThan(0)
    for (const rec of recs) {
      const voice = geminiVoices.find((v) => v.id === rec.voiceId)
      expect(voice?.gender?.toLowerCase()).toBe('female')
    }
  })

  it('prefers authoritative male voices for defense attorney when gender is confirmed male', () => {
    const character: CharacterContext = {
      name: 'Marcus Thorne',
      gender: 'male',
      description: MARCUS_THORNE_DESCRIPTION,
    }

    const recs = getCharacterVoiceRecommendations(geminiVoices, character, undefined, 3)
    const topIds = recs.map((r) => r.voiceId)
    const authoritativeMale = [
      'gemini-Sadaltager',
      'gemini-Alnilam',
      'gemini-Schedar',
      'gemini-Algieba',
      'gemini-Achird',
    ]
    expect(topIds.some((id) => authoritativeMale.includes(id))).toBe(true)
  })
})
