/**
 * Per-line Gemini TTS Director's Notes.
 *
 * Character persona (ROLE / DELIVERY RULES) is the standing voice.
 * These notes are this take only: inner state, breath, pace, emphasis.
 *
 * @see https://cloud.google.com/text-to-speech/docs/gemini-tts
 */

export type DirectorNoteCueExpansion = {
  style?: string
  pace?: string
  breath?: string
  emphasis?: string
}

const CUE_LEXICON: Array<{ pattern: RegExp; expansion: DirectorNoteCueExpansion }> = [
  {
    pattern: /\bobsessive\b/i,
    expansion: {
      style: 'Obsessive, locked on the thought; do not sound casual or composed',
    },
  },
  {
    pattern: /\bbreathless\b/i,
    expansion: {
      pace: 'Pressed pace as if air is running out',
      breath: 'Strain in the throat; catch air between clauses',
    },
  },
  {
    pattern: /\bwhisper/i,
    expansion: { style: 'Whispered, close-mic, private; almost confidential' },
  },
  {
    pattern: /\b(?:shout|yell)/i,
    expansion: { style: 'Full voice, unrestrained; do not swallow the line' },
  },
  {
    pattern: /\bsigh/i,
    expansion: { breath: 'Lead with an audible sigh before the words' },
  },
  {
    pattern: /\blaugh/i,
    expansion: { style: 'React with an amused laugh that belongs to this line' },
  },
  {
    pattern: /\bcry|tearful|weep/i,
    expansion: {
      style: 'Voice catching; grief in the throat, not a composed report',
    },
  },
  {
    pattern: /\bsarcas/i,
    expansion: { style: 'Dry sarcasm; the opposite of the literal words' },
  },
  {
    pattern: /\bcold|detached|flat\b/i,
    expansion: { style: 'Cold, restrained; no warmth or apology' },
  },
  {
    pattern: /\bmeasured|controlled|deliberate\b/i,
    expansion: { pace: 'Measured and unhurried; let each clause land' },
  },
  {
    pattern: /\bslow(?:ly)?\b/i,
    expansion: { pace: 'Slow, unhurried; do not rush the last word' },
  },
  {
    pattern: /\b(?:quick(?:ly)?|fast|rapid|hurried)\b/i,
    expansion: { pace: 'Forward-moving, clipped; air running just ahead of the words' },
  },
  {
    pattern: /\bhesitant/i,
    expansion: {
      pace: 'Hesitant; leave air in the gaps',
      breath: 'Catch before committing to the next clause',
    },
  },
  {
    pattern: /\burgent|desperate\b/i,
    expansion: { pace: 'Urgent, pressed; stakes in the tempo' },
  },
  {
    pattern: /\bexhausted|weary|tired\b/i,
    expansion: {
      style: 'Weary; effort in every phrase',
      breath: 'Thin breath; do not energize the line',
    },
  },
  {
    pattern: /\bdefeated|resigned\b/i,
    expansion: { style: 'Defeated; the fight has already gone out of the voice' },
  },
  {
    pattern: /\bangry|furious|enraged\b/i,
    expansion: { style: 'Anger held just under the words; do not play it as volume alone' },
  },
  {
    pattern: /\bsad(?:ly)?|grief|sorrow\b/i,
    expansion: { style: 'Quiet sadness; let the weight sit, do not announce it' },
  },
  {
    pattern: /\bnervous|anxious\b/i,
    expansion: { style: 'Nervous, slightly unsteady; do not smooth the edges' },
  },
  {
    pattern: /\bexcited|eager\b/i,
    expansion: { style: 'Genuine excitement in the body of the voice, not a pasted-on smile' },
  },
  {
    pattern: /\bconfident|firm|direct\b/i,
    expansion: { style: 'Confident, decisive; downward resolution, no up-speak' },
  },
  {
    pattern: /\bsoft(?:ly)?|gentle|quiet(?:ly)?\b/i,
    expansion: { style: 'Soft, close; keep the intensity, drop the volume' },
  },
  {
    pattern: /\bthoughtful|pensive\b/i,
    expansion: { pace: 'Thoughtful, searching; think the clause before releasing it' },
  },
  {
    pattern: /\bcalm|composed|neutral\b/i,
    expansion: { style: 'Calm and even; still human, not robotic' },
  },
  {
    pattern: /\bscared|fearful|afraid|terrified\b/i,
    expansion: { style: 'Fear in the breath and pitch; do not narrate the fear' },
  },
  {
    pattern: /\bmumbling|muttering\b/i,
    expansion: { style: 'Half to himself; not a public announcement' },
  },
]

function capitalizePhrase(text: string): string {
  const trimmed = text.trim()
  if (!trimmed) return ''
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
}

function uniqueJoin(parts: string[]): string {
  const seen = new Set<string>()
  const out: string[] = []
  for (const part of parts) {
    const normalized = part.replace(/\s+/g, ' ').trim().replace(/\.+$/, '')
    if (!normalized) continue
    const key = normalized.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(normalized)
  }
  return out.join('; ')
}

function matchCueExpansion(cue: string): DirectorNoteCueExpansion | null {
  for (const { pattern, expansion } of CUE_LEXICON) {
    if (pattern.test(cue)) return expansion
  }
  return null
}

/**
 * Turn legacy 1–4 word delivery tags into actor-facing Director's Notes.
 * Existing scripts keep their short prefixes; TTS still gets a usable brief.
 */
export function expandShortDeliveryCues(cues: string[]): string {
  const cleaned = cues.map((c) => c.replace(/\s+/g, ' ').trim()).filter(Boolean)
  if (cleaned.length === 0) return ''

  const style: string[] = []
  const pace: string[] = []
  const breath: string[] = []
  const emphasis: string[] = []
  const unmatched: string[] = []

  for (const cue of cleaned) {
    const hit = matchCueExpansion(cue)
    if (!hit) {
      unmatched.push(cue)
      continue
    }
    if (hit.style) style.push(hit.style)
    if (hit.pace) pace.push(hit.pace)
    if (hit.breath) breath.push(hit.breath)
    if (hit.emphasis) emphasis.push(hit.emphasis)
  }

  if (unmatched.length > 0) {
    style.push(
      `${capitalizePhrase(unmatched.join(', '))} delivery. Do not flatten into a composed read`
    )
  }

  const lines: string[] = []
  const styleText = uniqueJoin(style)
  const paceText = uniqueJoin(pace)
  const breathText = uniqueJoin(breath)
  const emphasisText = uniqueJoin(emphasis)
  if (styleText) lines.push(`Style: ${styleText}.`)
  if (paceText) lines.push(`Pace: ${paceText}.`)
  if (breathText) lines.push(`Breath: ${breathText}.`)
  if (emphasisText) lines.push(`Emphasis: ${emphasisText}.`)
  return lines.join('\n')
}

export function formatDirectorNotes(input: {
  voiceDirection?: string
  cues?: string[]
  emotion?: string
}): string {
  const brief = input.voiceDirection?.replace(/\s+/g, ' ').trim()
  if (brief) {
    return `DIRECTOR'S NOTES:\n${brief}`
  }

  const fromCues = expandShortDeliveryCues(input.cues ?? [])
  const emotion = input.emotion?.replace(/\s+/g, ' ').trim()
  if (fromCues) {
    const emotionLine = emotion
      ? `\nEmotional state for this line: ${capitalizePhrase(emotion)}.`
      : ''
    return `DIRECTOR'S NOTES:\n${fromCues}${emotionLine}`
  }

  if (emotion) {
    return `DIRECTOR'S NOTES:\nEmotional state for this line: ${capitalizePhrase(emotion)}.`
  }

  return ''
}

/** Prefer the line's own brief, then the matching beat. */
export function resolveLineVoiceDirection(
  dialogueLine: { voiceDirection?: string; lineId?: string } | null | undefined,
  scene?: { beats?: Array<{ lineId?: string; voiceDirection?: string }> } | null
): string | undefined {
  const fromLine = dialogueLine?.voiceDirection?.trim()
  if (fromLine) return fromLine
  const lineId = dialogueLine?.lineId?.trim()
  if (!lineId || !Array.isArray(scene?.beats)) return undefined
  const beat = scene.beats.find((b) => b.lineId === lineId)
  const fromBeat = beat?.voiceDirection?.trim()
  return fromBeat || undefined
}
