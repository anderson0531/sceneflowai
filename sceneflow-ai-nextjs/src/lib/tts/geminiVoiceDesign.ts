/**
 * Gemini 3.8 Flash TTS Voice Design.
 *
 * The persona is created once from a short description. Later lines cite the
 * `voice_...` id and only pass a short turn-level style. Permanent traits do
 * not go in the style, and there is no prebuilt base voice.
 */

export const DESIGNED_VOICE_TTS_MODEL = 'gemini-3.8-flash-tts'

/** Vertex CreateVoice enum. The string "prompted" is rejected as an unsupported type. */
export const DESIGNED_VOICE_TYPE = 'VOICE_TYPE_PROMPTED'

/** Stay well under Google's 200 stored voices per project across concurrent productions. */
export const DESIGNED_VOICE_PROJECT_CAP = 120

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

const MINOR_AGE_WORDS_RE =
  /\b(infants?|bab(?:y|ies)|toddlers?|child|children|kids?|preteens?|pre-teens?|tweens?|teens?|teenaged?|teenagers?|adolescents?|youths?|minors?|underage|juveniles?|boys?|girls?|schoolboys?|schoolgirls?|grandchild|grandchildren|granddaughters?|grandsons?|high[\s-]*school\w*|middle[\s-]*school\w*|elementary[\s-]*school\w*)\b/gi

const SAFETY_REFUSAL_WORDS_RE =
  /\b(predatory|bloodshot|furious|violent|brutal|savage|menacing|threatening|hostile|traumatized|hysterical|screaming|shrieking|crying|sobbing|weeping|choking|gasping|dying|dead|bleeding|drunk|intoxicated|slurred|seductive|sensual|erotic|abusive|terrified|panicked)\b/gi

function cleanPhrase(value: string | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').replace(/[“”"']/g, '').trim()
}

function hasUnderTwentyAge(text: string): boolean {
  const matches = text.matchAll(/\b(\d{1,3})(?:s|'s|-year-old|\s*years?\s*old|\s*yo|\s*y\/o)?\b/gi)
  for (const match of matches) {
    const numeric = Number(match[1])
    if (Number.isFinite(numeric) && numeric >= 0 && numeric < 20) {
      return true
    }
  }
  return false
}

function stripUnderTwentyTokens(text: string): string {
  return text
    .replace(/\([^)]*\)/g, (paren) =>
      hasUnderTwentyAge(paren) || new RegExp(MINOR_AGE_WORDS_RE.source, 'i').test(paren) ? ' ' : paren
    )
    .replace(/\b(?:age\s*)?\d{1,2}(?:\s*(?:to|-|–)\s*\d{1,2})?(?:-year-old|\s*years?\s*old|\s*yo|\s*y\/o)?\b/gi, (tok) =>
      hasUnderTwentyAge(tok) ? ' ' : tok
    )
}

function sanitizeVoiceDesignTrait(value: string | undefined): string {
  const cleaned = cleanPhrase(value)
  if (!cleaned) return ''
  return stripUnderTwentyTokens(cleaned)
    .replace(SAFETY_REFUSAL_WORDS_RE, ' ')
    .replace(/\s*,\s*,+/g, ', ')
    .replace(/^[\s,.;:-]+|[\s,.;:-]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function sanitizeVoiceDesignAge(value: string | undefined): string {
  const cleaned = cleanPhrase(value)
  if (!cleaned) return ''
  if (
    new RegExp(MINOR_AGE_WORDS_RE.source, 'i').test(cleaned) ||
    hasUnderTwentyAge(cleaned) ||
    /^young$/i.test(cleaned)
  ) {
    return 'young adult'
  }
  return sanitizeVoiceDesignTrait(cleaned)
}

function sanitizeVoiceDesignGender(value: string | undefined): string {
  const cleaned = cleanPhrase(value)
  if (!cleaned) return ''
  if (/^(boy|boys|young\s+man|teen\s+boy)$/i.test(cleaned)) return 'male'
  if (/^(girl|girls|young\s+woman|teen\s+girl)$/i.test(cleaned)) return 'female'
  return sanitizeVoiceDesignTrait(
    cleaned.replace(/\bboys?\b/gi, 'male').replace(/\bgirls?\b/gi, 'female')
  )
    .replace(MINOR_AGE_WORDS_RE, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function sanitizeVoiceDesignDisplayName(displayName: string | undefined): string {
  const raw = (displayName ?? '').replace(/\s+/g, ' ').trim()
  if (!raw) return 'SceneFlow character'
  const sanitized = stripUnderTwentyTokens(raw)
    .replace(MINOR_AGE_WORDS_RE, ' ')
    .replace(SAFETY_REFUSAL_WORDS_RE, ' ')
    .replace(/'s\b/gi, '')
    .replace(/[&/|+]+/g, ' ')
    .replace(/\(\s*\)/g, ' ')
    .replace(/^[\s,.;:–-]+|[\s,.;:–-]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (sanitized.length < 2) return 'SceneFlow character'
  return sanitized.slice(0, 80)
}

/** Words before a slash, without a leading article, capped so a story paragraph stays out. */
function shortRole(role: string | undefined): string {
  const head = cleanPhrase(role).split('/')[0] ?? ''
  const safeHead = sanitizeVoiceDesignTrait(head)
    .replace(MINOR_AGE_WORDS_RE, ' ')
    .replace(/\bstudents?\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return safeHead
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
  const safeFirst = stripUnderTwentyTokens(
    first.replace(/\bboys?\b/gi, 'male').replace(/\bgirls?\b/gi, 'female')
  )
    .replace(MINOR_AGE_WORDS_RE, 'young adult')
    .replace(SAFETY_REFUSAL_WORDS_RE, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (safeFirst.length < 12) return ''
  return capSentence(safeFirst)
}

/**
 * One spoken-persona sentence: age, gender, a short role, timbre, accent,
 * and how they speak. Built from the portrait analysis and the character's role.
 */
export function composeVoiceDesignDescription(input: VoiceDesignDescriptionInput): string {
  const gender = sanitizeVoiceDesignGender(input.gender)
  const age = sanitizeVoiceDesignAge(input.apparentAge)
  const role = shortRole(input.role)
  const timbre = sanitizeVoiceDesignTrait(input.timbre)
  const accent = sanitizeVoiceDesignTrait(input.accent)
  const pace = sanitizeVoiceDesignTrait(input.pace)
  const warmth = sanitizeVoiceDesignTrait(input.warmth)
  const authority = sanitizeVoiceDesignTrait(input.authority)
  const baseline = sanitizeVoiceDesignTrait(input.emotionalDefault)

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

/**
 * Pure studio-acoustic fallback sentence stripped of story roles and edge traits,
 * used when Vertex rejects both the full and shortened persona prompts.
 */
export function buildNeutralVoiceDesignFallback(description: string): string {
  const clean = cleanPhrase(description)
  const isFemale = /\b(female|woman|mezzo|soprano|contralto|actress)\b/i.test(clean)
  const isMale = !isFemale && /\b(male|man|baritone|tenor|bass|actor)\b/i.test(clean)
  const genderWord = isFemale ? 'female' : isMale ? 'male' : ''
  const registerMatch = clean.match(/\b(baritone|tenor|bass|alto|mezzo-soprano|soprano|contralto)\b/i)
  const register = registerMatch ? registerMatch[1]!.toLowerCase() : ''
  const accentMatch = clean.match(
    /\b(?:voice\s+and|with)\s+an?\s+([A-Za-z][A-Za-z\s-]{1,28}?)\s+accent\b/i
  )
  const safeAccent = accentMatch ? sanitizeVoiceDesignTrait(accentMatch[1]) : ''

  const subject = ['adult', genderWord, 'speaker'].filter(Boolean).join(' ')
  const timbre = register ? `clear, natural ${register}` : 'clear, warm, natural'
  const accentClause = safeAccent ? ` and a ${safeAccent} accent` : ''
  return capSentence(`An ${subject} with a ${timbre} voice${accentClause}, speaking at a steady conversational pace`)
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

function sanitizePromptedVoiceInput(description: string): string {
  const trimmed = description.trim()
  if (!hasUnderTwentyAge(trimmed) && !new RegExp(MINOR_AGE_WORDS_RE.source, 'i').test(trimmed)) {
    return trimmed
  }
  const replaced = trimmed
    .replace(/\b(?:age\s*)?\d{1,2}(?:\s*(?:to|-|–)\s*\d{1,2})?(?:-year-old|\s*years?\s*old|\s*yo|\s*y\/o)\b/gi, (tok) =>
      hasUnderTwentyAge(tok) ? 'young adult' : tok
    )
    .replace(/\bboys?\b/gi, 'male')
    .replace(/\bgirls?\b/gi, 'female')
    .replace(MINOR_AGE_WORDS_RE, 'young adult')
    .replace(/\byoung adult(?:\s+young adult)+\b/gi, 'young adult')
    .replace(/\s+/g, ' ')
    .trim()
  return replaced
}

export function buildVoiceDesignCreateBody(args: {
  description: string
  displayName: string
  languageCode?: string
}): Record<string, unknown> {
  return {
    store: true,
    voice: {
      displayName: sanitizeVoiceDesignDisplayName(args.displayName),
      type: DESIGNED_VOICE_TYPE,
      languageCode: args.languageCode?.trim() || 'en-US',
      prompted: { input: sanitizePromptedVoiceInput(args.description) },
    },
  }
}

/** Full persona, then the shorter retry. Both use the Vertex voice type. */
export function voiceDesignCreateAttempts(args: {
  description: string
  displayName: string
  languageCode?: string
}): Array<Record<string, unknown>> {
  const description = args.description.trim()
  const full = buildVoiceDesignCreateBody({ ...args, description })
  const shorter = shortenVoiceDesignDescription(description)
  if (!shorter || shorter === description) return [full]
  return [full, buildVoiceDesignCreateBody({ ...args, description: shorter })]
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
  /** Position in Vertex ListVoices response (0 = first returned, which is newest). */
  listIndex?: number
}

function compareStoredVoicesOldestFirst(a: StoredPromptedVoice, b: StoredPromptedVoice): number {
  const timeA = a.createTime?.trim() ?? ''
  const timeB = b.createTime?.trim() ?? ''
  if (timeA && timeB && timeA !== timeB) {
    return timeA.localeCompare(timeB)
  }
  if (typeof a.listIndex === 'number' && typeof b.listIndex === 'number' && a.listIndex !== b.listIndex) {
    return b.listIndex - a.listIndex
  }
  return timeA.localeCompare(timeB)
}

/**
 * Voices to delete so creating one more stays under the project cap.
 * Counts ALL stored designed voices (including retained ones) toward `cap`
 * while keeping `retainIds` intact during proactive cleanup.
 */
export function voicesToEvict(
  voices: StoredPromptedVoice[],
  retainIds: Iterable<string>,
  cap: number = DESIGNED_VOICE_PROJECT_CAP
): string[] {
  const retain = new Set(retainIds)
  const allDesigned = voices.filter((voice) => isDesignedGeminiVoiceId(voice.id))
  const candidates = allDesigned
    .filter((voice) => !retain.has(voice.id))
    .sort(compareStoredVoicesOldestFirst)
  const overflow = allDesigned.length + 1 - cap
  if (overflow <= 0) return []
  return candidates.slice(0, overflow).map((voice) => voice.id)
}

/**
 * Select up to `count` oldest voice slots to delete/overlay when Vertex reports
 * the voice library is full. Prefers unretained voices first, then falls back
 * to the oldest retained voices if `allowRetainedOverlay` is true so creation
 * never deadlocks at the 200-voice ceiling (overlaid voices self-heal via `designPrompt`).
 */
export function voicesToOverlay(
  voices: StoredPromptedVoice[],
  retainIds: Iterable<string>,
  count: number,
  allowRetainedOverlay: boolean = true
): string[] {
  if (count <= 0) return []
  const retain = new Set(retainIds)
  const allDesigned = voices.filter((voice) => isDesignedGeminiVoiceId(voice.id))
  const unretainedOldest = allDesigned
    .filter((voice) => !retain.has(voice.id))
    .sort(compareStoredVoicesOldestFirst)
    .map((voice) => voice.id)

  if (!allowRetainedOverlay || unretainedOldest.length >= count) {
    return unretainedOldest.slice(0, count)
  }

  const retainedOldest = allDesigned
    .filter((voice) => retain.has(voice.id))
    .sort(compareStoredVoicesOldestFirst)
    .map((voice) => voice.id)

  return [...unretainedOldest, ...retainedOldest].slice(0, count)
}

export function readDesignedVoiceId(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null
  const record = payload as Record<string, unknown>
  const nested =
    record.voice && typeof record.voice === 'object'
      ? (record.voice as Record<string, unknown>)
      : null
  const fields = [
    record.id,
    record.name,
    record.voiceId,
    record.voice_id,
    nested?.id,
    nested?.name,
    nested?.voiceId,
    nested?.voice_id,
  ]
  for (const field of fields) {
    if (typeof field !== 'string') continue
    const match = field.match(/voice_[A-Za-z0-9_-]+/)
    if (match) return match[0]
  }
  return null
}
