/**
 * Google AI Studio Voice Design prompt for Gemini-TTS.
 *
 * AI Studio steers one of the 30 prebuilt voices with a director-style block
 * (Audio Profile, Scene, Director's Notes). Cloud TTS maps that block to
 * `input.prompt` — docs call it the system instruction / Style Instructions —
 * and keeps the spoken line in `input.text`. Never put a TRANSCRIPT here;
 * the model would read it aloud or ignore the text field.
 *
 * @see https://ai.google.dev/gemini-api/docs/speech-generation
 * @see https://cloud.google.com/text-to-speech/docs/gemini-tts
 */

export type VoiceDesignPersona = {
  name?: string
  /** Short archetype, e.g. "Corporate Risk Director". */
  archetype?: string
  /** Age, gender, ethnicity, timbre in one or two sentences. */
  identity?: string
  /** Standing place and vibe. Omit when unknown. */
  scene?: string
  style?: string
  pace?: string
  accent?: string
}

const TRANSCRIPT_HEADING = /\s*#{1,6}\s*TRANSCRIPT\b[\s\S]*$/i

const FORBIDDEN_IN_NOTES =
  /\b(?:wardrobe|costume|outfit|clothing|hair color|eye color|say this line|read the following|transcript)\b/i

export const GEMINI_VOICE_DESIGN_MAX_BYTES = 4000

function sentence(text?: string): string {
  const trimmed = text?.replace(/\s+/g, ' ').trim()
  if (!trimmed) return ''
  const capitalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
  return /[.!?]$/.test(capitalized) ? capitalized : `${capitalized}.`
}

function cleanVocal(text?: string): string {
  if (!text?.trim()) return ''
  return text
    .replace(/\s+/g, ' ')
    .trim()
    .replace(FORBIDDEN_IN_NOTES, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function isVoiceDesignPrompt(text?: string): boolean {
  if (!text?.trim()) return false
  return /^\s*#\s*AUDIO PROFILE\b/im.test(text)
}

/** Drop a leaked transcript so the spoken line stays in `input.text`. */
export function stripVoiceDesignTranscript(text: string): string {
  return text.replace(TRANSCRIPT_HEADING, '').replace(/\s+$/, '').trim()
}

function byteLength(text: string): number {
  return new TextEncoder().encode(text).length
}

function fitToByteBudget(text: string, maxBytes: number): string {
  if (maxBytes <= 0) return ''
  if (byteLength(text) <= maxBytes) return text

  const lines = text.split('\n')
  while (lines.length > 1) {
    lines.pop()
    const candidate = lines.join('\n').trimEnd()
    if (byteLength(candidate) <= maxBytes) return candidate
  }

  let sliced = lines[0] ?? ''
  while (sliced.length > 0 && byteLength(sliced) > maxBytes) {
    sliced = sliced.slice(0, -1)
  }
  return sliced
}

/**
 * Build the Style Instructions block. Scene is optional; Director's Notes
 * always include at least one of style / pace / accent when provided.
 */
export function buildGeminiVoiceDesignPrompt(persona: VoiceDesignPersona): string {
  const name = persona.name?.trim() || 'Unnamed speaker'
  const archetype = persona.archetype?.trim()
  const identity = sentence(cleanVocal(stripVoiceDesignTranscript(persona.identity || '')) || undefined)
  const scene = stripVoiceDesignTranscript(persona.scene?.trim() || '')
  const style = sentence(cleanVocal(stripVoiceDesignTranscript(persona.style || '')) || undefined)
  const pace = sentence(cleanVocal(stripVoiceDesignTranscript(persona.pace || '')) || undefined)
  const accent = sentence(cleanVocal(stripVoiceDesignTranscript(persona.accent || '')) || undefined)

  const lines: string[] = [`# AUDIO PROFILE: ${name}`]
  if (archetype) lines.push(`## "${archetype.replace(/^["']|["']$/g, '')}"`)
  if (identity) {
    lines.push('')
    lines.push(identity)
  }

  if (scene) {
    lines.push('')
    lines.push('## THE SCENE')
    lines.push(sentence(scene))
  }

  const noteLines: string[] = []
  if (style) noteLines.push(`Style: ${style}`)
  if (pace) noteLines.push(`Pace: ${pace}`)
  if (accent) noteLines.push(`Accent: ${accent}`)

  if (noteLines.length > 0) {
    lines.push('')
    lines.push("### DIRECTOR'S NOTES")
    lines.push(...noteLines)
  }

  return stripVoiceDesignTranscript(lines.join('\n').trim())
}

/**
 * Replace or insert a per-line Scene. Cues from the script belong here, not
 * in the persistent Audio Profile.
 */
export function withVoiceDesignScene(prompt: string, scene?: string): string {
  const base = stripVoiceDesignTranscript(prompt.trim())
  const sceneText = scene?.replace(/\s+/g, ' ').trim()
  if (!sceneText) return base

  const sceneBlock = `## THE SCENE\n${sentence(sceneText)}`

  if (/^## THE SCENE\b/im.test(base)) {
    return base.replace(/## THE SCENE\b[\s\S]*?(?=\n### |\n# |$)/i, `${sceneBlock}\n\n`).trim()
  }

  if (/### DIRECTOR'S NOTES/i.test(base)) {
    return base.replace(/### DIRECTOR'S NOTES/i, `${sceneBlock}\n\n### DIRECTOR'S NOTES`)
  }

  return `${base}\n\n${sceneBlock}`
}

/** Wrap leftover prose so older saved notes still take the Voice Design path. */
export function coerceToVoiceDesignPrompt(
  raw: string,
  context?: { name?: string; archetype?: string }
): string {
  const trimmed = stripVoiceDesignTranscript(raw.trim())
  if (!trimmed) return ''
  if (isVoiceDesignPrompt(trimmed)) return trimmed
  return buildGeminiVoiceDesignPrompt({
    name: context?.name,
    archetype: context?.archetype,
    identity: trimmed,
  })
}

export function voiceDesignPromptFitsBudget(prompt: string): boolean {
  return byteLength(prompt) <= GEMINI_VOICE_DESIGN_MAX_BYTES
}

export function clipVoiceDesignPrompt(prompt: string, reserveBytes = 0): string {
  return fitToByteBudget(
    stripVoiceDesignTranscript(prompt),
    GEMINI_VOICE_DESIGN_MAX_BYTES - Math.max(0, reserveBytes)
  )
}

export type DirectorVoiceDesignFields = {
  name?: string
  archetype?: string
  identity?: string
  scene?: string
  style?: string
  pace?: string
  accent?: string
  /** Legacy prose field from older director-prompt responses. */
  audio_profile?: string
}

function asString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

/**
 * Turn a model JSON (or a leaked markdown block) into a Voice Design prompt.
 * Strips any TRANSCRIPT the model may have added.
 */
export function parseDirectorVoiceDesignResponse(
  raw: string,
  context?: { name?: string; archetype?: string }
): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  const jsonMatch = trimmed.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]) as DirectorVoiceDesignFields
      const identity =
        asString(parsed.identity) || asString(parsed.audio_profile)
      const built = buildGeminiVoiceDesignPrompt({
        name: asString(parsed.name) || context?.name,
        archetype: asString(parsed.archetype) || context?.archetype,
        identity,
        scene: asString(parsed.scene),
        style: asString(parsed.style),
        pace: asString(parsed.pace),
        accent: asString(parsed.accent),
      })
      if (isVoiceDesignPrompt(built) && (identity || parsed.style || parsed.pace)) {
        return built
      }
      if (asString(parsed.audio_profile)) {
        return coerceToVoiceDesignPrompt(parsed.audio_profile as string, context)
      }
    } catch {
      /* fall through to markdown / prose */
    }
  }

  if (isVoiceDesignPrompt(trimmed)) {
    return stripVoiceDesignTranscript(trimmed)
  }

  const cleaned = trimmed
    .replace(/^```[a-zA-Z]*\n?/, '')
    .replace(/\n?```$/, '')
    .replace(/^(Here is the )?(JSON|profile|note) requested:?\n?/i, '')
    .trim()

  if (!cleaned) return null
  if (isVoiceDesignPrompt(cleaned)) return stripVoiceDesignTranscript(cleaned)
  return coerceToVoiceDesignPrompt(cleaned, context)
}
