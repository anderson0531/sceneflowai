/**
 * Gemini 3.8 Flash TTS Voice Design.
 *
 * The persona is created once from a short description. Later lines cite the
 * `voice_...` id and only pass a short turn-level style. Permanent traits do
 * not go in the style, and there is no prebuilt base voice.
 */

export const DESIGNED_VOICE_TTS_MODEL = 'gemini-3.8-flash-tts'

/** Stay under Google's 200 stored voices per project. */
export const DESIGNED_VOICE_PROJECT_CAP = 180

export const DESIGNED_VOICE_STYLE_MAX = 160

export function isDesignedGeminiVoiceId(voiceId: string | null | undefined): boolean {
  return !!voiceId?.trim().startsWith('voice_')
}

export interface VoiceDesignDescriptionInput {
  role?: string
  gender?: string
  apparentAge?: string
  accent?: string
  timbre?: string
  pace?: string
  warmth?: string
  authority?: string
  emotionalDefault?: string
  /** Fallback when the structured traits are too thin. */
  voiceDescription?: string
}

/**
 * One concise Voice Design description: age, gender, timbre, accent, baseline
 * delivery. Built from the portrait analysis and the character's role.
 */
export function composeVoiceDesignDescription(input: VoiceDesignDescriptionInput): string {
  const gender = input.gender?.trim()
  const age = input.apparentAge?.trim()
  const role = input.role?.trim()
  const timbre = input.timbre?.trim()
  const accent = input.accent?.trim()
  const pace = input.pace?.trim()
  const warmth = input.warmth?.trim()
  const authority = input.authority?.trim()
  const baseline = input.emotionalDefault?.trim()

  const who = [age, gender].filter(Boolean).join(' ')
  const clauses: string[] = []
  if (who && role) clauses.push(`A ${who} ${role}`)
  else if (who) clauses.push(`A ${who} speaker`)
  else if (role) clauses.push(`A ${role}`)

  const vocal: string[] = []
  if (timbre) vocal.push(timbre)
  if (warmth) vocal.push(`${warmth} tone`)
  if (authority) vocal.push(authority)
  if (vocal.length > 0) clauses.push(`with a ${vocal.join(', ')} voice`)
  if (accent) clauses.push(`${accent} accent`)

  const delivery: string[] = []
  if (pace) delivery.push(`${pace} pace`)
  if (baseline) delivery.push(baseline)
  if (delivery.length > 0) clauses.push(`Baseline delivery: ${delivery.join(', ')}`)

  let description = clauses.join('. ').replace(/\.\./g, '.').trim()
  if (description && !description.endsWith('.')) description += '.'

  if (description.length < 24) {
    const fallback = input.voiceDescription?.trim().split(/(?<=\.)\s+/)[0]?.trim() ?? ''
    description = fallback
  }

  return description.replace(/\s+/g, ' ').trim().slice(0, 400)
}

export function designedVoiceStyle(cues: Array<string | undefined | null>): string | undefined {
  const style = cues
    .map((cue) => cue?.trim())
    .filter((cue): cue is string => !!cue)
    .join(', ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!style) return undefined
  return style.slice(0, DESIGNED_VOICE_STYLE_MAX)
}

export function buildVoiceDesignCreateBody(args: {
  description: string
  displayName: string
  languageCode?: string
}): Record<string, unknown> {
  return {
    store: true,
    voice: {
      displayName: args.displayName.slice(0, 80),
      model: DESIGNED_VOICE_TTS_MODEL,
      type: 'prompted',
      languageCode: args.languageCode?.trim() || 'en-US',
      prompted: { input: args.description.trim() },
    },
  }
}

export function buildDesignedVoiceSynthesisBody(args: {
  text: string
  voiceId: string
  style?: string
}): Record<string, unknown> {
  const style = args.style?.trim()
  return {
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: args.text,
            ...(style ? { speechMetadata: { style } } : {}),
          },
        ],
      },
    ],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: { voice: args.voiceId },
      },
    },
  }
}

export interface StoredPromptedVoice {
  id: string
  createTime?: string
}

/**
 * Voices to delete so creating one more stays under the project cap.
 * Retained ids (voices still assigned to characters) are kept.
 */
export function voicesToEvict(
  voices: StoredPromptedVoice[],
  retainIds: Iterable<string>,
  cap: number = DESIGNED_VOICE_PROJECT_CAP
): string[] {
  const retain = new Set(retainIds)
  const candidates = voices
    .filter((voice) => isDesignedGeminiVoiceId(voice.id) && !retain.has(voice.id))
    .sort((a, b) => (a.createTime ?? '').localeCompare(b.createTime ?? ''))
  const overflow = candidates.length + 1 - cap
  if (overflow <= 0) return []
  return candidates.slice(0, overflow).map((voice) => voice.id)
}

export function readDesignedVoiceId(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null
  const record = payload as Record<string, unknown>
  const fields = [record.id, record.name, record.voiceId]
  for (const field of fields) {
    if (typeof field !== 'string') continue
    const match = field.match(/voice_[A-Za-z0-9_-]+/)
    if (match) return match[0]
  }
  return null
}
