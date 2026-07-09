import { describe, it, expect } from 'vitest'
import {
  getCharacterVoiceRecommendations,
  type CharacterContext,
  type ElevenLabsVoice,
} from '@/lib/voiceRecommendation'
import {
  enrichGeminiVoicesForScoring,
  getGeminiVoicesForApi,
} from '@/lib/tts/geminiVoiceCatalog'

const GIDEON_CROFT_DESCRIPTION =
  "The series' primary guide, an academic outcast who has dedicated his life to uncovering suppressed histories. He presents the case files with an air of quiet authority and deep conviction."

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

describe('Gideon Croft-style authoritative academic male', () => {
  const geminiVoices = buildGeminiVoicePool()

  it('selects authoritative resonant male over youthful bright voices', () => {
    const character: CharacterContext = {
      name: 'Professor Gideon Croft',
      gender: 'male',
      role: 'primary guide / narrator',
      age: 'late 50s',
      personality: 'quiet authority, deep conviction, intellectual',
      description: GIDEON_CROFT_DESCRIPTION,
      voiceDescription:
        'Intelligent male voice with measured pace, resonant baritone, quiet authority, deep conviction, articulate academic delivery. Vocal qualities: resonant baritone timbre, low-mid pitch, measured pace, quiet authority authority, neutral warmth.',
    }

    const recs = getCharacterVoiceRecommendations(geminiVoices, character, undefined, 3)
    expect(recs.length).toBeGreaterThan(0)

    const topId = recs[0].voiceId
    const authoritativeMale = [
      'gemini-Alnilam',
      'gemini-Algieba',
      'gemini-Sadaltager',
      'gemini-Schedar',
      'gemini-Charon',
      'gemini-Rasalgethi',
      'gemini-Zubenelgenubi',
      'gemini-Achird',
    ]
    const youthfulFemale = ['gemini-Leda', 'gemini-Despina', 'gemini-Zephyr', 'gemini-Puck']

    expect(authoritativeMale).toContain(topId)
    expect(youthfulFemale).not.toContain(topId)

    const voice = geminiVoices.find((v) => v.id === topId)
    expect(voice?.gender?.toLowerCase()).toBe('male')
  })
})
