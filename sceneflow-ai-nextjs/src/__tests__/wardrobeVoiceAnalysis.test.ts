import { describe, it, expect } from 'vitest'
import {
  getDefaultWardrobeForVoice,
  getWardrobeVoiceImageForCharacter,
  getWardrobeVoiceImageUrl,
  parseWardrobeVoiceAnalysisJson,
  resolveCharacterWardrobes,
} from '@/lib/character/wardrobeVoiceAnalysis'
import {
  getCharacterVoiceRecommendations,
  resolveCharacterGender,
} from '@/lib/voiceRecommendation'
import {
  enrichGeminiVoicesForScoring,
  getGeminiVoicesForApi,
} from '@/lib/tts/geminiVoiceCatalog'

describe('resolveCharacterWardrobes', () => {
  it('synthesizes legacy default wardrobe when wardrobes array is empty', () => {
    const wardrobes = resolveCharacterWardrobes({
      defaultWardrobe: 'Navy suit',
      wardrobeAccessories: 'watch',
    })
    expect(wardrobes).toHaveLength(1)
    expect(wardrobes[0].isDefault).toBe(true)
    expect(wardrobes[0].description).toBe('Navy suit')
  })
})

describe('getWardrobeVoiceImageForCharacter', () => {
  it('returns default wardrobe fullBodyUrl when present', () => {
    const result = getWardrobeVoiceImageForCharacter({
      wardrobes: [
        {
          id: 'w1',
          name: 'Default',
          description: 'Suit',
          isDefault: true,
          createdAt: '2026-01-01',
          fullBodyUrl: 'https://example.com/turnaround.jpg',
        },
      ],
    })
    expect(result?.imageUrl).toBe('https://example.com/turnaround.jpg')
    expect(result?.wardrobe.id).toBe('w1')
  })

  it('returns null when default wardrobe lacks fullBodyUrl', () => {
    const result = getWardrobeVoiceImageForCharacter({
      wardrobes: [
        {
          id: 'w1',
          name: 'Default',
          description: 'Suit',
          isDefault: true,
          createdAt: '2026-01-01',
        },
      ],
    })
    expect(result).toBeNull()
  })

  it('prefers isDefault wardrobe over others', () => {
    const wardrobe = getDefaultWardrobeForVoice({
      wardrobes: [
        {
          id: 'other',
          name: 'Casual',
          description: 'Jeans',
          isDefault: false,
          createdAt: '2026-01-01',
          fullBodyUrl: 'https://example.com/casual.jpg',
        },
        {
          id: 'default',
          name: 'Formal',
          description: 'Suit',
          isDefault: true,
          createdAt: '2026-01-01',
        },
      ],
    })
    expect(wardrobe?.id).toBe('default')
    expect(getWardrobeVoiceImageUrl(wardrobe)).toBeNull()
  })
})

describe('parseWardrobeVoiceAnalysisJson', () => {
  it('parses valid vision JSON', () => {
    const raw = `\`\`\`json
{
  "gender": "male",
  "apparentAge": "late 40s",
  "ethnicity": "Caucasian",
  "voiceDescription": "A confident, authoritative male voice with a resonant baritone and polished corporate delivery suited for a seasoned defense attorney.",
  "audioProfile": "A male voice in his late 40s with a warm, textured baritone. The delivery is measured and authoritative with crisp articulation."
}
\`\`\``
    const parsed = parseWardrobeVoiceAnalysisJson(raw)
    expect(parsed?.gender).toBe('male')
    expect(parsed?.apparentAge).toBe('late 40s')
    expect(parsed?.confidence).toBe('vision')
    expect(parsed?.voiceDescription).toContain('authoritative')
  })

  it('returns null for invalid gender', () => {
    const parsed = parseWardrobeVoiceAnalysisJson(
      JSON.stringify({
        gender: 'unknown',
        apparentAge: '30s',
        voiceDescription: 'x'.repeat(30),
        audioProfile: 'y'.repeat(30),
      }),
    )
    expect(parsed).toBeNull()
  })
})

describe('vision gender persistence for recommendations', () => {
  const geminiVoices = enrichGeminiVoicesForScoring(
    getGeminiVoicesForApi()
      .filter((v) => v.id.startsWith('gemini-'))
      .map((v) => ({
        id: v.id,
        name: v.name,
        gender: v.gender,
        description: v.description,
      })),
  )

  it('excludes female voices after vision male gender is applied', () => {
    const character = {
      name: 'Marcus Thorne',
      gender: 'male',
      voiceDescription:
        'A confident, corporate, authoritative male voice with crisp professional delivery and resonant baritone quality.',
      description: 'A seasoned defense attorney.',
    }
    expect(resolveCharacterGender(character).confidence).toBe('explicit')

    const recs = getCharacterVoiceRecommendations(geminiVoices, character, undefined, 1)
    expect(recs[0].voiceId).not.toBe('gemini-Achernar')
    const voice = geminiVoices.find((v) => v.id === recs[0].voiceId)
    expect(voice?.gender?.toLowerCase()).toBe('male')
  })

  it('boosts authoritative corporate male voices from vision voiceDescription', () => {
    const character = {
      name: 'Marcus Thorne',
      gender: 'male',
      voiceDescription:
        'Confident, corporate, and highly stable authoritative male voice with polished executive delivery and crisp professional articulation.',
      description: 'Defense attorney.',
    }
    const recs = getCharacterVoiceRecommendations(geminiVoices, character, undefined, 3)
    const topIds = recs.map((r) => r.voiceId)
    expect(
      topIds.some((id) =>
        ['gemini-Sadaltager', 'gemini-Alnilam', 'gemini-Schedar', 'gemini-Algieba'].includes(id),
      ),
    ).toBe(true)
  })
})
