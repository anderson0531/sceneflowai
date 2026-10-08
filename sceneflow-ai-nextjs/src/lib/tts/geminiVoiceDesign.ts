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

/** A turn tweak, not a second persona. Long direction replaces the stored voice. */
export const DESIGNED_VOICE_TURN_STYLE_MAX = 80

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

const VOICE_DESIGN_PROMPT_MAX = 220

function cleanPhrase(value: string | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').replace(/[“”"']/g, '').trim()
}

/** Words before a slash, without a leading article, capped so a story paragraph stays out. */
function shortRole(role: string | undefined): string {
  const head = cleanPhrase(role).split('/')[0] ?? ''
  return head
    .replace(/^(the|a|an)\s+/i, '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 4)
    .join(' ')
}

function articleFor(subject: string): 'A' | 'An' {
  return /^[aeiou]/i.test(subject) ? 'An' : 'A'
}

function capSentence(text: string): string {
  const sentence = text.replace(/\s+/g, ' ').trim().replace(/[.,;:\s]+$/, '')
  if (!sentence) return ''
  if (sentence.length + 1 <= VOICE_DESIGN_PROMPT_MAX) return `${sentence}.`
  const cut = sentence.slice(0, VOICE_DESIGN_PROMPT_MAX - 1)
  const lastSpace = cut.lastIndexOf(' ')
  const trimmed = (lastSpace > 40 ? cut.slice(0, lastSpace) : cut).replace(/[.,;:\s]+$/, '')
  return `${trimmed}.`
}

/** First vocal clause of a casting brief, without the attribute tail. */
function vocalLineFromBrief(brief: string | undefined): string {
  const head = cleanPhrase(brief).split(/vocal qualities:/i)[0] ?? ''
  const first = head.split(/[.!?]/)[0]?.trim() ?? ''
  if (first.length < 12) return ''
  return capSentence(first)
}

/**
 * One spoken-persona sentence: age, gender, a short role, timbre, accent,
 * and how they speak. Built from the portrait analysis and the character's role.
 */
export function composeVoiceDesignDescription(input: VoiceDesignDescriptionInput): string {
  const gender = cleanPhrase(input.gender)
  const age = cleanPhrase(input.apparentAge)
  const role = shortRole(input.role)
  const timbre = cleanPhrase(input.timbre)
  const accent = cleanPhrase(input.accent)
  const pace = cleanPhrase(input.pace)
  const warmth = cleanPhrase(input.warmth)
  const authority = cleanPhrase(input.authority)
  const baseline = cleanPhrase(input.emotionalDefault)

  const subject = [age, gender, role].filter(Boolean).join(' ') || 'speaker'
  const voice = [warmth, timbre].filter(Boolean).join(', ')
  let sentence = `${articleFor(subject)} ${subject}`
  if (voice && accent) sentence += ` with a ${voice} voice and a ${accent} accent`
  else if (voice) sentence += ` with a ${voice} voice`
  else if (accent) sentence += ` with a ${accent} accent`

  const standing = [authority, baseline].filter(
    (item, index, items) =>
      !!item && items.findIndex((entry) => entry.toLowerCase() === item.toLowerCase()) === index
  )
  const speaking: string[] = []
  if (pace) {
    const bare = pace.replace(/\s+pace$/i, '')
    speaking.push(`at a ${bare} pace`)
  }
  if (standing.length > 0) speaking.push(`with ${standing.join(' and ')}`)
  if (speaking.length > 0) sentence += `, speaking ${speaking.join(' ')}`

  const description = capSentence(sentence)
  if (description.length >= 24) return description
  return vocalLineFromBrief(input.voiceDescription)
}

/** Drop the speaking clause for a second attempt after Google asks for a rephrase. */
export function shortenVoiceDesignDescription(description: string): string {
  const current = description.replace(/\s+/g, ' ').trim()
  const core = current.split(/,\s*speaking\b/i)[0]?.trim().replace(/[.\s]+$/, '') ?? ''
  if (core.length < 12) return current
  const shorter = capSentence(core)
  return shorter === current ? current : shorter
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

/** Sustained delivery. Gemini 3.8 speaks these if they stay in the transcript. */
const DESIGNED_STYLE_TAGS = ['extremely fast', 'whispering', 'shouting', 'sarcasm'] as const

/** Point-in-time events. Gemini 3.8 wants these as angle brackets, not square ones. */
const DESIGNED_EVENT_TAGS = ['short pause', 'medium pause', 'long pause', 'sigh', 'uhm', 'laughing'] as const

const DESIGNED_CUE_MAX = 40

function normalizedBracket(inner: string): string {
  return inner.replace(/\s+/g, ' ').trim().toLowerCase()
}

function isListedTag(tag: string, tags: readonly string[]): boolean {
  return tags.includes(tag)
}

/**
 * One short style phrase. The last item is joined with "and" so
 * "whispering" plus "fragile" and "intimate" reads as a single tweak.
 */
function joinTurnStyle(parts: string[]): string | undefined {
  const seen = new Set<string>()
  const unique: string[] = []
  for (const part of parts) {
    const cleaned = part.replace(/\s+/g, ' ').trim().toLowerCase()
    if (!cleaned || cleaned.length > DESIGNED_CUE_MAX) continue
    if (seen.has(cleaned)) continue
    seen.add(cleaned)
    unique.push(cleaned)
  }
  const last = unique[unique.length - 1]
  if (!last) return undefined
  const phrase = unique.length === 1 ? last : `${unique.slice(0, -1).join(', ')} and ${last}`
  if (phrase.length <= DESIGNED_VOICE_TURN_STYLE_MAX) return phrase
  const cut = phrase.slice(0, DESIGNED_VOICE_TURN_STYLE_MAX)
  const lastSpace = cut.lastIndexOf(' ')
  const trimmed = (lastSpace > 24 ? cut.slice(0, lastSpace) : cut).replace(/[,\s]+$/, '')
  return trimmed || undefined
}

/**
 * Gemini 3.8 speaks the transcript verbatim. Square-bracket style tags
 * (`[whispering]`) are lifted into `speechMetadata.style`. Sighs and pauses
 * stay inline as angle brackets.
 */
export function prepareDesignedVoiceLine(args: {
  text: string
  cues?: Array<string | undefined | null>
}): { text: string; style?: string } {
  const lifted: string[] = []
  const text = args.text
    .replace(/\[([^\]]+)\]/g, (_match, inner: string) => {
      const tag = normalizedBracket(inner)
      if (!tag) return ' '
      if (isListedTag(tag, DESIGNED_STYLE_TAGS)) {
        lifted.push(tag)
        return ' '
      }
      if (isListedTag(tag, DESIGNED_EVENT_TAGS)) return ` <${tag}> `
      return ' '
    })
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;!?])/g, '$1')
    .trim()

  return {
    text,
    style: joinTurnStyle([...lifted, ...(args.cues ?? []).map((cue) => cue ?? '')]),
  }
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
