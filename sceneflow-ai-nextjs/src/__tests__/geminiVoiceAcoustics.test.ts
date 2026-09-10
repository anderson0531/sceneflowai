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

  it('gives every voice a resting cadence', () => {
    for (const voice of GEMINI_VOICE_CATALOG) {
      expect(['deliberate', 'steady', 'dynamic', 'volatile']).toContain(voice.cadence)
    }
  })

  it('applies the reference-matrix row for the twelve named voices', () => {
    const matrix: Record<string, { register: string; texture: string; cadence: string }> = {
      'gemini-Algenib': { register: 'low', texture: 'gravelly', cadence: 'deliberate' },
      'gemini-Charon': { register: 'low', texture: 'smooth', cadence: 'steady' },
      'gemini-Algieba': { register: 'low', texture: 'smooth', cadence: 'steady' },
      'gemini-Enceladus': { register: 'low', texture: 'breathy', cadence: 'deliberate' },
      'gemini-Orus': { register: 'low-mid', texture: 'even', cadence: 'steady' },
      'gemini-Schedar': { register: 'low-mid', texture: 'even', cadence: 'steady' },
      'gemini-Alnilam': { register: 'low-mid', texture: 'clear', cadence: 'steady' },
      'gemini-Fenrir': { register: 'low-mid', texture: 'gravelly', cadence: 'volatile' },
      'gemini-Gacrux': { register: 'mid', texture: 'warm', cadence: 'steady' },
      'gemini-Kore': { register: 'mid', texture: 'even', cadence: 'steady' },
      'gemini-Erinome': { register: 'mid', texture: 'clear', cadence: 'steady' },
      'gemini-Vindemiatrix': { register: 'low-mid', texture: 'soft', cadence: 'deliberate' },
    }

    for (const [id, expected] of Object.entries(matrix)) {
      const voice = getGeminiVoice(id)
      expect(voice, id).toBeDefined()
      expect(voice?.register, `${id} register`).toBe(expected.register)
      expect(voice?.texture, `${id} texture`).toBe(expected.texture)
      expect(voice?.cadence, `${id} cadence`).toBe(expected.cadence)
    }
  })

  it('lets matrix voices diverge from a shared Google label', () => {
    const orus = getGeminiVoiceAcoustics('gemini-Orus')
    const kore = getGeminiVoiceAcoustics('gemini-Kore')
    expect(getGeminiVoice('gemini-Orus')?.officialLabel).toBe('Firm')
    expect(getGeminiVoice('gemini-Kore')?.officialLabel).toBe('Firm')
    expect(orus?.register).toBe('low-mid')
    expect(kore?.register).toBe('mid')
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

  it('does not treat vocal weight alone as an acoustic signal', () => {
    const target = parseAcousticTarget({ brief: 'resonant and full-bodied' })
    expect(target.vocalWeight).toBe('heavy')
    expect(target.register).toBeUndefined()
    expect(target.texture).toBeUndefined()
    expect(target.cadence).toBeUndefined()
    expect(hasAcousticSignal(target)).toBe(false)
  })

  it('deepens baritone to low when the brief is late-50s or deep', () => {
    expect(
      parseAcousticTarget({
        gender: 'male',
        apparentAge: 'late 50s',
        brief: 'a clinical baritone',
      }).register,
    ).toBe('low')
    expect(
      parseAcousticTarget({ gender: 'male', brief: 'a deep baritone' }).register,
    ).toBe('low')
  })

  it('lets gravel and dry win over clinical or clear', () => {
    const target = parseAcousticTarget({
      brief: 'clinical baritone with a dry, gravelly edge',
    })
    expect(target.texture).toBe('gravelly')
  })

  it('reads resting cadence from delivery words', () => {
    expect(parseAcousticTarget({ brief: 'unhurried, measured, methodical' }).cadence).toBe(
      'deliberate',
    )
    expect(parseAcousticTarget({ brief: 'steady informative delivery' }).cadence).toBe('steady')
    expect(parseAcousticTarget({ brief: 'energetic and projected' }).cadence).toBe('dynamic')
    expect(parseAcousticTarget({ brief: 'erratic, frantic, volatile' }).cadence).toBe('volatile')
  })
})

describe('scoreVoiceAcoustics', () => {
  it('penalizes register error more than any texture or age bonus can offset', () => {
    const target = { register: 'low-mid' as const, texture: 'clear' as const }
    const onRegister = scoreVoiceAcoustics({ ...getGeminiVoice('gemini-Alnilam')! }, target)
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

  it('cannot let vocal weight flip a register or gravel mismatch', () => {
    const gravelTarget = {
      register: 'low' as const,
      texture: 'gravelly' as const,
      vocalWeight: 'heavy' as const,
    }
    const gravel = scoreVoiceAcoustics({ ...getGeminiVoice('gemini-Algenib')! }, gravelTarget)
    const smoothHeavy = scoreVoiceAcoustics(
      { ...getGeminiVoice('gemini-Charon')!, vocalWeight: 'heavy' },
      gravelTarget,
    )
    expect(gravel.score).toBeGreaterThan(smoothHeavy.score)
  })
})

describe('base voice selection', () => {
  /**
   * Matrix Julian: late-50s clinical baritone, dry/gravelly edge, unhurried.
   * Algenib is the gravelly low deliberate voice; Charon is the smooth counterpart.
   */
  it('picks Algenib, then Charon, for the Julian Ward brief', () => {
    const brief =
      'A male voice in his late 50s. Clinical baritone with a dry, gravelly edge. ' +
      'Unhurried, measured delivery. Corporate detachment; cool and composed.'

    const target = parseAcousticTarget({ gender: 'male', apparentAge: 'late 50s', brief })
    expect(target.register).toBe('low')
    expect(target.texture).toBe('gravelly')
    expect(target.cadence).toBe('deliberate')
    expect(target.ageAffinity).toBe('mature')
    expect(hasAcousticSignal(target)).toBe(true)

    const ranked = rankVoicesByAcoustics(target, 5)
    expect(ranked[0]?.voiceId).toBe('gemini-Algenib')
    expect(ranked[1]?.voiceId).toBe('gemini-Charon')
    expect(ranked.slice(0, 2).map((row) => row.voiceId)).not.toContain('gemini-Fenrir')
    expect(ranked.slice(0, 2).map((row) => row.voiceId)).not.toContain('gemini-Orus')

    expect(selectGeminiBaseVoice(target).voiceId).toBe('gemini-Algenib')
  })

  it('still reaches the gravelly voice when the brief actually asks for gravel', () => {
    const target = parseAcousticTarget({
      gender: 'male',
      brief: 'a gravelly, weathered baritone with a heavy rasp',
    })
    expect(target.texture).toBe('gravelly')
    expect(getGeminiVoice(selectGeminiBaseVoice(target).voiceId)?.texture).toBe('gravelly')
  })

  it('picks Fenrir for a raspy, frantic male brief', () => {
    const target = parseAcousticTarget({
      gender: 'male',
      brief: 'a raspy, frantic delivery — erratic and volatile',
    })
    expect(target.texture).toBe('gravelly')
    expect(target.cadence).toBe('volatile')
    expect(selectGeminiBaseVoice(target).voiceId).toBe('gemini-Fenrir')
  })

  it('picks Kore for a female middle firm, decisive brief', () => {
    const target = parseAcousticTarget({
      gender: 'female',
      brief: 'a middle, firm, decisive voice',
    })
    expect(target.register).toBe('mid')
    expect(target.texture).toBe('even')
    expect(selectGeminiBaseVoice(target).voiceId).toBe('gemini-Kore')
  })

  it('keeps a gravelly female alto in the female pool', () => {
    const target = parseAcousticTarget({
      gender: 'female',
      brief: 'a gravelly alto with a dry rasp',
    })
    expect(target.register).toBe('low-mid')
    expect(target.texture).toBe('gravelly')

    const ranked = rankVoicesByAcoustics(target, 30)
    expect(ranked.length).toBeGreaterThan(0)
    for (const match of ranked) {
      expect(getGeminiVoice(match.voiceId)?.gender).toBe('female')
    }
    expect(selectGeminiBaseVoice(target).voiceId).not.toBe('gemini-Algenib')
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
