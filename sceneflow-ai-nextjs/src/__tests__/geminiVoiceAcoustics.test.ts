import { describe, it, expect } from 'vitest'
import {
  GEMINI_VOICE_CATALOG,
  NEUTRAL_GEMINI_VOICE_ID,
  getGeminiVoice,
  getGeminiVoiceAcoustics,
} from '@/lib/tts/geminiVoiceCatalog'
import {
  parseAcousticTarget,
  hasAcousticSignal,
  rankVoicesByAcoustics,
  scoreVoiceAcoustics,
  selectGeminiBaseVoice,
  describeAcousticTarget,
} from '@/lib/tts/voiceAcoustics'
import { pickGeminiBaseVoice } from '@/lib/tts/pickGeminiBaseVoice'

/**
 * Google's published character labels for the 30 Gemini-TTS prebuilt voices.
 * Duplicated here on purpose: if the catalog drifts from Google's data again,
 * this table is what catches it.
 *
 * @see https://cloud.google.com/text-to-speech/docs/gemini-tts
 */
const OFFICIAL_LABELS: Record<string, string> = {
  Achernar: 'Soft',
  Achird: 'Friendly',
  Algenib: 'Gravelly',
  Algieba: 'Smooth',
  Alnilam: 'Firm',
  Aoede: 'Breezy',
  Autonoe: 'Bright',
  Callirrhoe: 'Easy-going',
  Charon: 'Informative',
  Despina: 'Smooth',
  Enceladus: 'Breathy',
  Erinome: 'Clear',
  Fenrir: 'Excitable',
  Gacrux: 'Mature',
  Iapetus: 'Clear',
  Kore: 'Firm',
  Laomedeia: 'Upbeat',
  Leda: 'Youthful',
  Orus: 'Firm',
  Pulcherrima: 'Forward',
  Puck: 'Upbeat',
  Rasalgethi: 'Informative',
  Sadachbia: 'Lively',
  Sadaltager: 'Knowledgeable',
  Schedar: 'Even',
  Sulafat: 'Warm',
  Umbriel: 'Easy-going',
  Vindemiatrix: 'Gentle',
  Zephyr: 'Bright',
  Zubenelgenubi: 'Casual',
}

describe('GEMINI_VOICE_CATALOG', () => {
  it('covers exactly Google\u2019s 30 prebuilt voices', () => {
    expect(GEMINI_VOICE_CATALOG).toHaveLength(30)
    const names = GEMINI_VOICE_CATALOG.map((v) => v.id.replace(/^gemini-/, '')).sort()
    expect(names).toEqual(Object.keys(OFFICIAL_LABELS).sort())
  })

  it('carries Google\u2019s official label for every voice', () => {
    for (const voice of GEMINI_VOICE_CATALOG) {
      const name = voice.id.replace(/^gemini-/, '')
      expect(voice.officialLabel, `${name} label`).toBe(OFFICIAL_LABELS[name])
    }
  })

  /**
   * The previous catalog described Algenib as "resonant, warm, engaging" and
   * Schedar as "gravelly, deep, authoritative" — the exact inverse of Google's
   * labels, which is what sent gravelly briefs to the flattest male voice.
   */
  it('never contradicts the official label in its UI copy', () => {
    const CONTRADICTIONS: Record<string, RegExp> = {
      Soft: /\b(?:harsh|booming|gravell?y|shout)/i,
      Gravelly: /\b(?:smooth|silky|pristine|polished)\b/i,
      Smooth: /\b(?:gravell?y|raspy|gritty|hoarse)\b/i,
      Even: /\b(?:gravell?y|raspy|gritty|excitable)\b/i,
      Clear: /\b(?:gravell?y|raspy|muffled|slurred)\b/i,
      Bright: /\b(?:gravell?y|somber|mournful)\b/i,
      Youthful: /\b(?:mature|elderly|weathered|grizzled|aged)\b/i,
      Mature: /\b(?:youthful|childlike|teenage)\b/i,
      Breathy: /\b(?:booming|stentorian)\b/i,
      Upbeat: /\b(?:mournful|somber|lifeless)\b/i,
    }

    for (const voice of GEMINI_VOICE_CATALOG) {
      const pattern = CONTRADICTIONS[voice.officialLabel]
      if (!pattern) continue
      expect(
        pattern.test(voice.archetypeDescription),
        `${voice.id} (${voice.officialLabel}): ${voice.archetypeDescription}`
      ).toBe(false)
    }
  })

  it('derives acoustics consistently: same label means same acoustics', () => {
    const byLabel = new Map<string, ReturnType<typeof getGeminiVoiceAcoustics>>()
    for (const voice of GEMINI_VOICE_CATALOG) {
      const acoustics = {
        register: voice.register,
        vocalWeight: voice.vocalWeight,
        texture: voice.texture,
        ageAffinity: voice.ageAffinity,
      }
      const seen = byLabel.get(voice.officialLabel)
      if (seen) {
        expect(acoustics, `${voice.officialLabel} acoustics`).toEqual(seen)
      } else {
        byLabel.set(voice.officialLabel, acoustics)
      }
    }
  })

  it('only claims an age affinity where Google\u2019s label states one', () => {
    for (const voice of GEMINI_VOICE_CATALOG) {
      if (voice.officialLabel === 'Youthful') {
        expect(voice.ageAffinity).toBe('young')
      } else if (voice.officialLabel === 'Mature') {
        expect(voice.ageAffinity).toBe('mature')
      } else {
        expect(voice.ageAffinity, `${voice.id}`).toBe('neutral')
      }
    }
  })

  it('exposes a neutral fallback that is not a texture-heavy voice', () => {
    const fallback = getGeminiVoice(NEUTRAL_GEMINI_VOICE_ID)
    expect(fallback).toBeDefined()
    expect(fallback?.texture).not.toBe('gravelly')
    expect(fallback?.texture).not.toBe('breathy')
  })
})

describe('parseAcousticTarget', () => {
  it('reads register from a voice-type noun relative to gender', () => {
    expect(parseAcousticTarget({ gender: 'male', brief: 'a clear baritone' }).register).toBe(
      'low-mid'
    )
    expect(parseAcousticTarget({ gender: 'male', brief: 'a booming bass' }).register).toBe('low')
    expect(parseAcousticTarget({ gender: 'male', brief: 'a bright tenor' }).register).toBe(
      'mid-high'
    )
    expect(parseAcousticTarget({ gender: 'female', brief: 'a warm alto' }).register).toBe('low-mid')
    expect(parseAcousticTarget({ gender: 'female', brief: 'a soaring soprano' }).register).toBe(
      'mid-high'
    )
  })

  it('lets structured fields override adjectives in the brief', () => {
    const target = parseAcousticTarget({
      gender: 'male',
      brief: 'a piercing, shrill, high-pitched delivery',
      vocalAttributes: { register: 'low-mid' },
    })
    expect(target.register).toBe('low-mid')
  })

  it('reads vocal weight from resonance words rather than pitch words', () => {
    expect(parseAcousticTarget({ brief: 'resonant and full-bodied' }).vocalWeight).toBe('heavy')
    expect(parseAcousticTarget({ brief: 'a thin, airy delivery' }).vocalWeight).toBe('light')
    expect(parseAcousticTarget({ brief: 'balanced and moderate' }).vocalWeight).toBe('medium')
  })

  /**
   * Age was previously inferred from the brief, where "Bold" matched a bare
   * substring search for "old" and pushed narrators into the mature band.
   */
  it('does not infer age from prose', () => {
    expect(parseAcousticTarget({ brief: 'bold cinematic adventure narrator' }).ageAffinity)
      .toBeUndefined()
    expect(parseAcousticTarget({ brief: 'a cowboy drawl' }).ageAffinity).toBeUndefined()
  })

  it('takes age only from the explicit field, and accepts a number', () => {
    expect(parseAcousticTarget({ apparentAge: 'late 50s' }).ageAffinity).toBe('mature')
    expect(parseAcousticTarget({ apparentAge: 19 }).ageAffinity).toBe('young')
  })

  it('reports no signal for a brief with no acoustic content', () => {
    const target = parseAcousticTarget({ brief: 'the protagonist of the story' })
    expect(hasAcousticSignal(target)).toBe(false)
    expect(describeAcousticTarget(target)).toBe('no acoustic signal')
  })
})

describe('scoreVoiceAcoustics', () => {
  it('penalizes register error more than any texture or age bonus can offset', () => {
    const target = { register: 'low-mid' as const, texture: 'clear' as const }
    const onRegister = scoreVoiceAcoustics(
      { ...getGeminiVoice('gemini-Charon')! },
      target
    )
    const twoBandsOff = scoreVoiceAcoustics({ ...getGeminiVoice('gemini-Zephyr')! }, target)
    expect(onRegister.score).toBeGreaterThan(twoBandsOff.score)
  })

  it('treats gravel and breath as phonation the prompt cannot change', () => {
    const clearTarget = { register: 'low-mid' as const, texture: 'clear' as const }
    const gravelly = scoreVoiceAcoustics({ ...getGeminiVoice('gemini-Algenib')! }, clearTarget)
    expect(gravelly.reasons.join(' ')).toMatch(/Phonation conflict/)

    const gravellyTarget = { register: 'low-mid' as const, texture: 'gravelly' as const }
    const clear = scoreVoiceAcoustics({ ...getGeminiVoice('gemini-Charon')! }, gravellyTarget)
    expect(clear.reasons.join(' ')).toMatch(/Phonation conflict/)
  })
})

describe('base voice selection', () => {
  /**
   * The case that prompted the rebuild. Julian Ward is a clear, resonant
   * baritone in the lower-mid range with cool, precise articulation — so the
   * pick must be a low-mid male voice, and must not be the gravelly one.
   */
  it('picks a clear low-mid male voice for the Julian Ward brief', () => {
    const brief =
      'A clear, resonant baritone, pitched in the lower-mid range. Cadence is deliberate ' +
      'and controlled. Cool precision in his articulation rather than overt aggression. ' +
      'Calm and composed, conveying unshakeable confidence. Neutral American accent.'

    const target = parseAcousticTarget({ gender: 'male', apparentAge: 'late 50s', brief })
    expect(target.register).toBe('low-mid')
    expect(target.vocalWeight).toBe('heavy')
    expect(target.texture).toBe('clear')
    expect(target.ageAffinity).toBe('mature')

    const pick = selectGeminiBaseVoice(target)
    const voice = getGeminiVoice(pick.voiceId)!
    expect(voice.gender).toBe('male')
    expect(voice.register).toBe('low-mid')
    expect(voice.texture).not.toBe('gravelly')
    expect(pick.voiceId).not.toBe('gemini-Algenib')
    expect(pick.voiceId).not.toBe('gemini-Schedar')
  })

  it('still reaches the gravelly voice when the brief actually asks for gravel', () => {
    const target = parseAcousticTarget({
      gender: 'male',
      brief: 'a gravelly, weathered baritone with a heavy rasp',
    })
    expect(target.texture).toBe('gravelly')
    expect(selectGeminiBaseVoice(target).voiceId).toBe('gemini-Algenib')
  })

  it('honors gender as a hard filter', () => {
    const ranked = rankVoicesByAcoustics(
      { gender: 'female', register: 'mid', vocalWeight: 'medium' },
      30
    )
    expect(ranked.length).toBeGreaterThan(0)
    for (const match of ranked) {
      expect(getGeminiVoice(match.voiceId)?.gender).toBe('female')
    }
  })

  it('is deterministic for the same target', () => {
    const target = parseAcousticTarget({ gender: 'female', brief: 'a warm, smooth mezzo' })
    const first = selectGeminiBaseVoice(target).voiceId
    for (let i = 0; i < 5; i++) {
      expect(selectGeminiBaseVoice(target).voiceId).toBe(first)
    }
  })
})

describe('pickGeminiBaseVoice', () => {
  it('reports acoustic selection when the brief carries physical parameters', () => {
    const pick = pickGeminiBaseVoice('a clear, resonant baritone in the lower-mid range', {
      gender: 'male',
    })
    expect(pick.selectedBy).toBe('acoustics')
    expect(getGeminiVoice(pick.voiceId)?.register).toBe('low-mid')
  })

  it('falls back to the keyword scorer when no acoustic signal is present', () => {
    const pick = pickGeminiBaseVoice('the lead character in the third act', { gender: 'female' })
    expect(pick.selectedBy).toBe('keywords')
    expect(getGeminiVoice(pick.voiceId)).toBeDefined()
  })

  it('prefers structured vocal attributes over the brief', () => {
    const pick = pickGeminiBaseVoice('a shrill, piercing shriek', {
      gender: 'male',
      vocalAttributes: { register: 'low-mid', vocalWeight: 'heavy', timbre: 'clear baritone' },
    })
    expect(getGeminiVoice(pick.voiceId)?.register).toBe('low-mid')
  })
})
