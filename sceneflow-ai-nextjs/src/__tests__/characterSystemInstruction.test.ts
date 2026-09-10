import { describe, it, expect } from 'vitest'
import {
  buildCharacterSystemInstruction,
  buildSceneDirection,
  isStructuredSystemInstruction,
  personaFromVocalAttributes,
  wpmForPace,
} from '@/lib/tts/characterSystemInstruction'
import {
  buildGeminiTtsPrompt,
  GEMINI_TTS_MAX_PROMPT_BYTES,
} from '@/lib/tts/geminiTtsPrompt'
import { characterStateHash } from '@/lib/tts/characterStateHash'

const JULIAN = {
  name: 'Julian Ward',
  role: 'Senior Director of Corporate Risk at Vane-Calhoun Energy',
  age: 'Late 50s',
  ethnicity: 'Caucasian',
  gender: 'male',
  timbre: 'authoritative, clinical baritone',
  diction: 'dry, crisp diction',
  accent: 'General American',
  cadence: 'slow, impeccably measured, and completely unhurried',
  emotionalState:
    'absolute bureaucratic detachment; do not express panic, indignation, excitement, or moral hesitation',
  inflection:
    'flat, declarative statements; always resolve sentences with downward pitch shifts and never lift pitch at phrase ends',
  tone:
    'treat catastrophic events and corporate risk with the quiet nonchalance of an ordinary balance sheet',
}

describe('buildCharacterSystemInstruction', () => {
  it('emits the documented ROLE / AGE & VOCAL PROFILE / DELIVERY RULES shape', () => {
    const instruction = buildCharacterSystemInstruction(JULIAN)

    expect(instruction).toMatch(/^ROLE: Julian Ward, Senior Director of Corporate Risk/)
    expect(instruction).toContain('AGE & VOCAL PROFILE:')
    expect(instruction).toContain('DELIVERY RULES:')
    for (const rule of ['- Cadence:', '- Emotional State:', '- Inflection:', '- Tone:']) {
      expect(instruction).toContain(rule)
    }
  })

  it('states cadence in WPM so the model has a number to hold', () => {
    const instruction = buildCharacterSystemInstruction(JULIAN)
    expect(instruction).toMatch(/- Cadence:.*\(~110-120 WPM\)\./)
  })

  it('prefers an explicit WPM over the pace phrase', () => {
    const instruction = buildCharacterSystemInstruction({ ...JULIAN, wpm: 118 })
    expect(instruction).toMatch(/\(~118-128 WPM\)/)
  })

  /**
   * Gemini-TTS ignores temperature, top_k, and top_p, so run-to-run stability
   * can only be requested inside the instruction.
   */
  it('carries a consistency rule in place of the unavailable temperature knob', () => {
    const instruction = buildCharacterSystemInstruction(JULIAN)
    expect(instruction).toContain('- Consistency:')
    expect(instruction).toMatch(/constant across every take/i)
  })

  it('places age, ethnicity, gender, timbre, diction, and accent in the vocal profile', () => {
    const profile = buildCharacterSystemInstruction(JULIAN)
      .split('\n')
      .find((line) => line.startsWith('AGE & VOCAL PROFILE:'))!

    expect(profile).toContain('Late 50s')
    expect(profile).toContain('Caucasian')
    expect(profile).toContain('baritone')
    expect(profile).toContain('crisp diction')
    expect(profile).toContain('General American accent')
  })

  it('stays well inside the prompt byte budget for a full persona', () => {
    const bytes = new TextEncoder().encode(buildCharacterSystemInstruction(JULIAN)).length
    expect(bytes).toBeLessThan(GEMINI_TTS_MAX_PROMPT_BYTES)
  })

  it('produces every rule even from an empty persona', () => {
    const instruction = buildCharacterSystemInstruction({})
    expect(instruction).toContain('ROLE:')
    expect(instruction).toContain('- Cadence:')
    expect(instruction).toContain('- Inflection:')
    expect(isStructuredSystemInstruction(instruction)).toBe(true)
  })
})

describe('wpmForPace', () => {
  it('maps pace language onto real tempos around a 150 WPM conversational centre', () => {
    expect(wpmForPace('slow and deliberate')).toBe(110)
    expect(wpmForPace('measured and controlled')).toBe(130)
    expect(wpmForPace('conversational')).toBe(150)
    expect(wpmForPace('brisk')).toBe(170)
    expect(wpmForPace('rapid, urgent')).toBe(185)
  })

  it('falls back to a neutral tempo for unknown or missing pace', () => {
    expect(wpmForPace(undefined)).toBe(145)
    expect(wpmForPace('purple')).toBe(145)
  })
})

describe('isStructuredSystemInstruction', () => {
  it('recognizes a built instruction and rejects prose', () => {
    expect(isStructuredSystemInstruction(buildCharacterSystemInstruction(JULIAN))).toBe(true)
    expect(
      isStructuredSystemInstruction('A warm, engaging voice with a hint of gravel.')
    ).toBe(false)
    expect(isStructuredSystemInstruction('')).toBe(false)
    expect(isStructuredSystemInstruction(undefined)).toBe(false)
  })
})

describe('buildSceneDirection', () => {
  it('carries only the per-line state, leaving identity to the persona', () => {
    const direction = buildSceneDirection({
      urgency: 'high',
      emotion: 'suppressed anger',
      recipient: 'the board',
      location: 'a glass conference room',
      cues: ['coldly', 'without looking up'],
    })

    expect(direction).toMatch(/^SCENE DIRECTION:/)
    expect(direction).toContain('Addressing the board')
    expect(direction).toContain('Urgency: high')
    expect(direction).toContain('Emotional state for this line: suppressed anger')
    expect(direction).toContain('Delivery cues: coldly; without looking up')
  })

  it('is empty when the scene supplies nothing, so the persona is sent unchanged', () => {
    expect(buildSceneDirection()).toBe('')
    expect(buildSceneDirection({})).toBe('')
    expect(buildSceneDirection({ cues: ['', '   '] })).toBe('')
  })
})

describe('personaFromVocalAttributes', () => {
  it('maps analysis fields onto persona fields without inventing prose', () => {
    const persona = personaFromVocalAttributes({
      name: 'Julian Ward',
      role: 'Director of Corporate Risk',
      age: 'late 50s',
      vocalAttributes: {
        timbre: 'clinical baritone',
        pitch: 'lower-mid',
        pace: 'deliberate',
        accent: 'General American',
        wpm: 115,
        inflection: 'flat and declarative',
        emotionalDefault: 'detached',
      },
      personality: 'strategic and unmoved',
    })

    expect(persona.timbre).toContain('clinical baritone')
    expect(persona.timbre).toContain('lower-mid')
    expect(persona.wpm).toBe(115)
    expect(persona.inflection).toBe('flat and declarative')
    expect(persona.emotionalState).toBe('detached')
    expect(persona.tone).toBe('strategic and unmoved')
  })
})

describe('buildGeminiTtsPrompt', () => {
  const instruction = buildCharacterSystemInstruction(JULIAN)

  /**
   * The previous implementation truncated the profile to 700 characters against
   * Google's 4,000-byte allowance, which cut the delivery rules off entirely.
   */
  it('passes a structured instruction through without truncation', () => {
    const prompt = buildGeminiTtsPrompt({ audioType: 'dialogue', voicePrompt: instruction })
    expect(prompt).toContain(instruction)
    expect(prompt).toContain('- Tone:')
    expect(prompt).toContain('- Consistency:')
  })

  it('appends scene direction after the persona', () => {
    const sceneDirection = buildSceneDirection({ emotion: 'suppressed anger' })
    const prompt = buildGeminiTtsPrompt({
      audioType: 'dialogue',
      voicePrompt: instruction,
      sceneDirection,
    })

    expect(prompt.indexOf('ROLE:')).toBeLessThan(prompt.indexOf('SCENE DIRECTION:'))
    expect(prompt).toContain('suppressed anger')
  })

  it('withholds generic prosody coaching that would fight the delivery rules', () => {
    const prompt = buildGeminiTtsPrompt({ audioType: 'dialogue', voicePrompt: instruction })
    expect(prompt).not.toMatch(/avoid flat, monotone/i)
  })

  it('always keeps the guard, even against an oversized persona', () => {
    const oversized = `${instruction}\n${'- Tone: padding padding padding.\n'.repeat(400)}`
    const prompt = buildGeminiTtsPrompt({ audioType: 'dialogue', voicePrompt: oversized })

    expect(new TextEncoder().encode(prompt).length).toBeLessThanOrEqual(
      GEMINI_TTS_MAX_PROMPT_BYTES
    )
    expect(prompt).toMatch(/Speak only the words in the text field/)
  })

  it('drops scene direction before the persona when both cannot fit', () => {
    const oversized = `${instruction}\n${'- Tone: padding padding padding.\n'.repeat(400)}`
    const prompt = buildGeminiTtsPrompt({
      audioType: 'dialogue',
      voicePrompt: oversized,
      sceneDirection: buildSceneDirection({ emotion: 'suppressed anger' }),
    })

    expect(prompt).not.toContain('SCENE DIRECTION:')
    expect(prompt).toContain('ROLE:')
  })

  it('drops scene direction at prompt level 1 and the profile at level 2', () => {
    const sceneDirection = buildSceneDirection({ emotion: 'suppressed anger' })

    const level1 = buildGeminiTtsPrompt({
      audioType: 'dialogue',
      voicePrompt: instruction,
      sceneDirection,
      promptLevel: 1,
    })
    expect(level1).toContain('ROLE:')
    expect(level1).not.toContain('SCENE DIRECTION:')

    const level2 = buildGeminiTtsPrompt({
      audioType: 'dialogue',
      voicePrompt: instruction,
      sceneDirection,
      promptLevel: 2,
    })
    expect(level2).not.toContain('ROLE:')
    expect(level2).not.toContain('SCENE DIRECTION:')
    expect(level2).toMatch(/Speak only the words in the text field/)
  })

  it('keeps unstructured profiles on the legacy prose path', () => {
    const prompt = buildGeminiTtsPrompt({
      audioType: 'dialogue',
      voicePrompt: 'A warm, engaging voice with a hint of gravel.',
    })
    expect(prompt).toMatch(/natural human prosody/i)
    expect(prompt).toContain('hint of gravel')
  })
})

describe('characterStateHash', () => {
  const base = {
    text: 'The containment breach is regrettable.',
    voiceId: 'gemini-Charon',
    systemInstruction: buildCharacterSystemInstruction(JULIAN),
    sceneDirection: buildSceneDirection({ emotion: 'detached' }),
    language: 'en',
    provider: 'google',
  }

  it('is stable for identical state', () => {
    expect(characterStateHash(base)).toBe(characterStateHash({ ...base }))
  })

  it('ignores whitespace differences that do not change the audio', () => {
    expect(characterStateHash({ ...base, text: '  The containment breach is regrettable.  ' }))
      .toBe(characterStateHash(base))
  })

  it('changes when any field that affects the waveform changes', () => {
    const baseline = characterStateHash(base)
    const variants = [
      { ...base, text: 'The containment breach is not regrettable.' },
      { ...base, voiceId: 'gemini-Iapetus' },
      { ...base, systemInstruction: buildCharacterSystemInstruction({ ...JULIAN, wpm: 180 }) },
      { ...base, sceneDirection: buildSceneDirection({ emotion: 'furious' }) },
      { ...base, language: 'es' },
      { ...base, provider: 'elevenlabs' },
    ]

    for (const variant of variants) {
      expect(characterStateHash(variant)).not.toBe(baseline)
    }
  })

  it('cannot be collided by shifting content across field boundaries', () => {
    expect(characterStateHash({ text: 'ab', voiceId: 'c' })).not.toBe(
      characterStateHash({ text: 'a', voiceId: 'bc' })
    )
  })

  it('is a short lowercase hex digest suitable for a blob path', () => {
    expect(characterStateHash(base)).toMatch(/^[0-9a-f]{16}$/)
  })
})
