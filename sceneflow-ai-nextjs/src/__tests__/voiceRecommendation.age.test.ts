import { describe, it, expect } from 'vitest'
import {
  getCharacterVoiceRecommendations,
  inferAgeFromDescription,
  normalizeCharacterAgeBand,
  type CharacterContext,
  type ElevenLabsVoice,
} from '@/lib/voiceRecommendation'
import {
  enrichGeminiVoicesForScoring,
  getGeminiVoicesForApi,
  getGeminiVoiceAgeBand,
} from '@/lib/tts/geminiVoiceCatalog'

function buildGeminiVoicePool(): ElevenLabsVoice[] {
  const apiVoices = getGeminiVoicesForApi().filter((v) => v.id.startsWith('gemini-'))
  return enrichGeminiVoicesForScoring(
    apiVoices.map((v) => ({
      id: v.id,
      name: v.name,
      gender: v.gender,
      description: v.description,
      age: v.age,
    })),
  )
}

describe('inferAgeFromDescription', () => {
  it('parses early 60s as mature', () => {
    expect(inferAgeFromDescription('early 60s')).toBe('mature')
    expect(inferAgeFromDescription('in his sixties')).toBe('mature')
    expect(inferAgeFromDescription('mid-sixties')).toBe('mature')
  })

  it('parses numeric ages', () => {
    expect(inferAgeFromDescription('62 years old')).toBe('mature')
    expect(inferAgeFromDescription('age 24')).toBe('young')
    expect(inferAgeFromDescription('45 year old')).toBe('middle')
  })

  it('parses in his 60s decade form', () => {
    expect(inferAgeFromDescription('in his 60s')).toBe('mature')
    expect(inferAgeFromDescription('in her 20s')).toBe('young')
  })
})

describe('normalizeCharacterAgeBand', () => {
  it('normalizes vision-style apparentAge phrases', () => {
    expect(normalizeCharacterAgeBand('early 60s')).toBe('mature')
    expect(normalizeCharacterAgeBand('late twenties')).toBe('young')
    expect(normalizeCharacterAgeBand('adult')).toBe('middle')
  })
})

describe('geminiVoiceCatalog age bands', () => {
  it('tags youthful and mature Gemini voices', () => {
    expect(getGeminiVoiceAgeBand('gemini-Leda')).toBe('young')
    expect(getGeminiVoiceAgeBand('gemini-Despina')).toBe('young')
    expect(getGeminiVoiceAgeBand('gemini-Schedar')).toBe('mature')
    expect(getGeminiVoiceAgeBand('gemini-Rasalgethi')).toBe('mature')
    expect(getGeminiVoiceAgeBand('gemini-Alnilam')).toBe('middle')
  })

  it('enriches Gemini voices with age for scoring', () => {
    const pool = buildGeminiVoicePool()
    const schedar = pool.find((v) => v.id === 'gemini-Schedar')
    const leda = pool.find((v) => v.id === 'gemini-Leda')
    expect(schedar?.age).toBe('mature')
    expect(leda?.age).toBe('young')
  })
})

describe('getCharacterVoiceRecommendations age matching', () => {
  const geminiVoices = buildGeminiVoicePool()

  it('prefers mature male voices for a character in his early 60s over Leda/Despina', () => {
    const character: CharacterContext = {
      name: 'Harold Grant',
      gender: 'male',
      age: 'early 60s',
      voiceDescription:
        'Gravelly, seasoned baritone with veteran authority and measured gravitas.',
      description: 'A retired detective in his early sixties navigating a cold case.',
    }

    const recs = getCharacterVoiceRecommendations(geminiVoices, character, undefined, 3)
    expect(recs.length).toBeGreaterThan(0)

    const topId = recs[0].voiceId
    const matureMaleIds = ['gemini-Schedar', 'gemini-Rasalgethi', 'gemini-Charon', 'gemini-Zubenelgenubi']
    expect(matureMaleIds).toContain(topId)
    expect(topId).not.toBe('gemini-Leda')
    expect(topId).not.toBe('gemini-Despina')
    expect(topId).not.toBe('gemini-Puck')
  })

  it('prefers youthful voices for a young female protagonist', () => {
    const character: CharacterContext = {
      name: 'Maya Chen',
      gender: 'female',
      age: 'in her 20s',
      voiceDescription: 'Bright, upbeat, youthful and energetic contemporary delivery.',
      description: 'A college student uncovering a campus mystery.',
    }

    const recs = getCharacterVoiceRecommendations(geminiVoices, character, undefined, 1)
    const top = geminiVoices.find((v) => v.id === recs[0].voiceId)
    expect(top?.age).toBe('young')
    expect(recs[0].voiceId).not.toBe('gemini-Schedar')
  })
})
