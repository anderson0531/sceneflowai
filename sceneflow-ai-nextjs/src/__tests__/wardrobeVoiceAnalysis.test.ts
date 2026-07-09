import { describe, it, expect } from 'vitest'
import {
  buildWardrobeVoiceAnalysisPrompt,
  enrichVoiceDescriptionWithAttributes,
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

describe('buildWardrobeVoiceAnalysisPrompt', () => {
  it('prioritizes narrative role and personality over portrait', () => {
    const prompt = buildWardrobeVoiceAnalysisPrompt('Professor Gideon Croft', {
      characterRole: 'primary guide / narrator',
      personality: 'quiet authority, deep conviction',
      characterDescription:
        'An academic outcast who presents suppressed histories with measured gravitas.',
      hasPortrait: true,
      screenplayContext: { genre: 'Documentary', tone: 'Investigative' },
    })
    expect(prompt).toContain('CHARACTER NARRATIVE (PRIMARY')
    expect(prompt).toContain('Professor Gideon Croft')
    expect(prompt).toContain('quiet authority')
    expect(prompt).toContain('academic outcast')
    expect(prompt).not.toContain('FACE only')
    expect(prompt).not.toContain('disambiguation only')
    expect(prompt).toContain('PORTRAIT REFERENCE')
    expect(prompt).toContain('vocalAttributes')
  })

  it('supports narrative-only mode without portrait', () => {
    const prompt = buildWardrobeVoiceAnalysisPrompt('Maya Chen', {
      characterDescription: 'A determined investigator.',
      hasPortrait: false,
    })
    expect(prompt).toContain('NO PORTRAIT')
    expect(prompt).not.toContain('PORTRAIT REFERENCE')
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

  it('parses vocalAttributes and folds into voiceDescription', () => {
    const raw = JSON.stringify({
      gender: 'male',
      apparentAge: 'late 50s',
      vocalAttributes: {
        timbre: 'resonant baritone',
        pitch: 'low-mid',
        pace: 'measured',
        authority: 'quiet authority',
        warmth: 'neutral',
      },
      voiceDescription:
        'An intelligent male voice with articulate academic delivery and deep conviction for a documentary guide.',
      audioProfile:
        'A male voice in his late 50s with measured cadence and quiet authority. Resonant baritone with controlled warmth.',
    })
    const parsed = parseWardrobeVoiceAnalysisJson(raw, { confidence: 'narrative' })
    expect(parsed?.confidence).toBe('narrative')
    expect(parsed?.vocalAttributes?.authority).toBe('quiet authority')
    expect(parsed?.voiceDescription).toContain('Vocal qualities:')
    expect(parsed?.voiceDescription).toContain('quiet authority')
  })
})

describe('enrichVoiceDescriptionWithAttributes', () => {
  it('appends attribute summary when not already present', () => {
    const enriched = enrichVoiceDescriptionWithAttributes('Authoritative male voice.', {
      timbre: 'resonant baritone',
      pace: 'measured',
    })
    expect(enriched).toContain('Vocal qualities:')
    expect(enriched).toContain('resonant baritone')
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
