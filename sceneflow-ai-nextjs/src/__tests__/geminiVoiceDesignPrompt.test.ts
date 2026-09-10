import { describe, it, expect } from 'vitest'
import { buildGeminiTtsPrompt } from '@/lib/tts/geminiTtsPrompt'
import {
  buildGeminiVoiceDesignPrompt,
  coerceToVoiceDesignPrompt,
  isVoiceDesignPrompt,
  parseDirectorVoiceDesignResponse,
  stripVoiceDesignTranscript,
  voiceDesignPromptFitsBudget,
  withVoiceDesignScene,
} from '@/lib/tts/geminiVoiceDesignPrompt'

const JULIAN = {
  name: 'Julian Ward',
  archetype: 'Senior Director of Corporate Risk',
  identity: 'Late 50s Caucasian male. Authoritative, clinical baritone with dry, crisp diction',
  style:
    'Flat, declarative statements. Always resolve sentences with downward pitch; never lift pitch at phrase ends. Treat catastrophic events with the quiet nonchalance of a balance sheet',
  pace: 'Slow, measured, and completely unhurried',
  accent: 'Neutral American, no regionalisms',
}

describe('buildGeminiVoiceDesignPrompt', () => {
  it('emits Audio Profile, optional Scene, and Director\'s Notes', () => {
    const prompt = buildGeminiVoiceDesignPrompt({
      ...JULIAN,
      scene: 'A quiet glass conference room. No urgency',
    })

    expect(prompt).toMatch(/^# AUDIO PROFILE: Julian Ward/)
    expect(prompt).toContain('## "Senior Director of Corporate Risk"')
    expect(prompt).toContain('Late 50s')
    expect(prompt).toContain('clinical baritone')
    expect(prompt).toContain('## THE SCENE')
    expect(prompt).toContain('glass conference room')
    expect(prompt).toContain("### DIRECTOR'S NOTES")
    expect(prompt).toContain('Style:')
    expect(prompt).toContain('Pace:')
    expect(prompt).toContain('Accent:')
    expect(isVoiceDesignPrompt(prompt)).toBe(true)
    expect(voiceDesignPromptFitsBudget(prompt)).toBe(true)
  })

  it('omits Scene and Notes sections when those fields are empty', () => {
    const prompt = buildGeminiVoiceDesignPrompt({
      name: 'Julian Ward',
      identity: 'Late 50s male baritone',
    })
    expect(prompt).toContain('# AUDIO PROFILE: Julian Ward')
    expect(prompt).not.toContain('## THE SCENE')
    expect(prompt).not.toContain("### DIRECTOR'S NOTES")
  })

  it('never includes a TRANSCRIPT — the spoken line belongs in input.text', () => {
    const prompt = buildGeminiVoiceDesignPrompt({
      ...JULIAN,
      identity: `${JULIAN.identity}. #### TRANSCRIPT The containment breach is regrettable.`,
    })
    expect(prompt).not.toMatch(/TRANSCRIPT/i)
    expect(prompt).not.toContain('containment breach')
  })

  it('stays vocal-only for a Julian Ward–style persona', () => {
    const prompt = buildGeminiVoiceDesignPrompt(JULIAN)
    expect(prompt).not.toMatch(/wardrobe|costume|outfit|hair color|eye color/i)
    expect(prompt).not.toMatch(/say this line|read the following/i)
    expect(prompt).toMatch(/baritone/)
    expect(prompt).toMatch(/Neutral American/)
  })
})

describe('stripVoiceDesignTranscript / withVoiceDesignScene', () => {
  it('drops a leaked transcript heading and everything after it', () => {
    const leaked = `${buildGeminiVoiceDesignPrompt(JULIAN)}\n\n#### TRANSCRIPT\nThe vault is empty.`
    expect(stripVoiceDesignTranscript(leaked)).not.toContain('vault')
    expect(stripVoiceDesignTranscript(leaked)).toContain('# AUDIO PROFILE')
  })

  it('inserts or replaces THE SCENE without touching Director\'s Notes', () => {
    const base = buildGeminiVoiceDesignPrompt(JULIAN)
    const withScene = withVoiceDesignScene(base, 'tired; muttering')
    expect(withScene).toContain('## THE SCENE')
    expect(withScene).toContain('Tired; muttering')
    expect(withScene).toContain("### DIRECTOR'S NOTES")

    const replaced = withVoiceDesignScene(withScene, 'coldly')
    expect(replaced).toContain('Coldly')
    expect(replaced).not.toContain('muttering')
  })
})

describe('parseDirectorVoiceDesignResponse', () => {
  it('builds the prompt from structured JSON fields', () => {
    const raw = JSON.stringify({
      name: 'Julian Ward',
      archetype: 'Senior Director of Corporate Risk',
      identity: JULIAN.identity,
      style: JULIAN.style,
      pace: JULIAN.pace,
      accent: JULIAN.accent,
      scene: '',
    })
    const prompt = parseDirectorVoiceDesignResponse(raw)!
    expect(prompt).toMatch(/^# AUDIO PROFILE: Julian Ward/)
    expect(prompt).not.toMatch(/TRANSCRIPT/i)
  })

  it('wraps legacy audio_profile prose instead of passing it through raw', () => {
    const prompt = parseDirectorVoiceDesignResponse(
      '{"audio_profile":"A warm, textured baritone with measured pacing."}',
      { name: 'Host' }
    )!
    expect(isVoiceDesignPrompt(prompt)).toBe(true)
    expect(prompt).toContain('warm, textured baritone')
  })

  it('strips TRANSCRIPT from a leaked markdown block', () => {
    const raw = `# AUDIO PROFILE: Julian Ward\n\nLate 50s baritone.\n\n#### TRANSCRIPT\nSit down.`
    expect(parseDirectorVoiceDesignResponse(raw)).toBe(
      '# AUDIO PROFILE: Julian Ward\n\nLate 50s baritone.'
    )
  })
})

describe('coerceToVoiceDesignPrompt', () => {
  it('is a no-op for an already-structured prompt', () => {
    const built = buildGeminiVoiceDesignPrompt(JULIAN)
    expect(coerceToVoiceDesignPrompt(built)).toBe(built)
  })

  it('wraps leftover prose under AUDIO PROFILE', () => {
    const coerced = coerceToVoiceDesignPrompt('Gravelly baritone, measured cadence.', {
      name: 'Harold',
    })
    expect(coerced).toMatch(/^# AUDIO PROFILE: Harold/)
    expect(coerced).toContain('Gravelly baritone')
  })
})

describe('buildGeminiTtsPrompt with Voice Design', () => {
  const design = buildGeminiVoiceDesignPrompt(JULIAN)

  it('passes the block through without 700-char truncation or monotone coaching', () => {
    const prompt = buildGeminiTtsPrompt({
      audioType: 'dialogue',
      voicePrompt: design,
      promptLevel: 0,
    })
    expect(prompt).toContain(design)
    expect(prompt).toContain("### DIRECTOR'S NOTES")
    expect(prompt).toContain('Speak only the words in the text field')
    expect(prompt).not.toMatch(/avoid flat, monotone/i)
    expect(prompt).not.toContain('Character voice profile')
  })

  it('appends per-line cues as THE SCENE at level 0 and drops them at level 1', () => {
    const level0 = buildGeminiTtsPrompt({
      audioType: 'dialogue',
      voicePrompt: design,
      deliveryCues: ['coldly', 'without looking up'],
      promptLevel: 0,
    })
    expect(level0).toContain('## THE SCENE')
    expect(level0).toMatch(/coldly/i)

    const level1 = buildGeminiTtsPrompt({
      audioType: 'dialogue',
      voicePrompt: design,
      deliveryCues: ['coldly'],
      promptLevel: 1,
    })
    expect(level1).toContain('# AUDIO PROFILE')
    expect(level1).not.toContain('coldly')
  })

  it('keeps only the guard at level 2', () => {
    const prompt = buildGeminiTtsPrompt({
      audioType: 'dialogue',
      voicePrompt: design,
      deliveryCues: ['coldly'],
      promptLevel: 2,
    })
    expect(prompt).not.toContain('# AUDIO PROFILE')
    expect(prompt).toContain('Speak only the words in the text field')
  })

  it('does not put the spoken line in the prompt', () => {
    const spoken = 'The containment breach is regrettable.'
    const prompt = buildGeminiTtsPrompt({
      audioType: 'dialogue',
      voicePrompt: `${design}\n\n#### TRANSCRIPT\n${spoken}`,
      promptLevel: 0,
    })
    expect(prompt).not.toContain(spoken)
    expect(prompt).not.toMatch(/TRANSCRIPT/i)
  })

  it('still uses the legacy prose path for unstructured profiles', () => {
    const prompt = buildGeminiTtsPrompt({
      audioType: 'dialogue',
      voicePrompt: 'A warm, engaging voice with a hint of gravel.',
    })
    expect(prompt).toMatch(/natural human prosody/i)
    expect(prompt).toContain('hint of gravel')
  })
})
