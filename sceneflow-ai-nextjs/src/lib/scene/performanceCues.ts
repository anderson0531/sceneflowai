/**
 * Shared parsing for bracketed performance cues in script dialogue.
 * Example: "[thoughtful, to herself] Another corporate data breach..."
 */

import { splitEmotionPrefix } from '@/lib/scene/translateGuideDialogue'

export interface ParsedPerformanceCue {
  /** Raw bracket tag text, e.g. "thoughtful, to herself" */
  emotion: string | null
  /** Addressee phrase if present, e.g. "herself", "John" */
  addressee: string | null
  /** Delivery instructions for video/audio models */
  deliveryProse: string
  /** Visual expression guidance for still frame generation */
  visualExpression: string
  /** Spoken line with bracket and parenthetical cues removed */
  spokenText: string
}

const EMOTION_DELIVERY: Record<string, string> = {
  thoughtful: 'thoughtfully, measured pace',
  urgent: 'urgently, with rising tension',
  angry: 'with anger and force',
  softly: 'softly, gentle tone',
  quietly: 'quietly, hushed delivery',
  whisper: 'in a whisper, low volume',
  sad: 'with sadness, subdued tone',
  fearful: 'fearfully, tense delivery',
  cold: 'coldly, restrained tone',
  amused: 'with amusement, light tone',
  exhausted: 'with exhaustion, weary tone',
  firm: 'firmly, decisive tone',
  direct: 'directly, clear articulation',
  sarcastic: 'with dry sarcasm',
  nervous: 'nervously, hesitant delivery',
  confident: 'confidently, steady tone',
}

const EMOTION_VISUAL: Record<string, string> = {
  thoughtful: 'thoughtful, introspective expression',
  urgent: 'urgent, tense expression',
  angry: 'angry, intense expression',
  softly: 'soft, gentle expression',
  quietly: 'quiet, subdued expression',
  whisper: 'subtle, intimate expression',
  sad: 'sad, downcast expression',
  fearful: 'fearful, anxious expression',
  cold: 'cold, detached expression',
  amused: 'amused, slight smile',
  exhausted: 'weary, tired expression',
  firm: 'firm, resolute expression',
  direct: 'focused, direct gaze',
  sarcastic: 'dry, knowing expression',
  nervous: 'nervous, uncertain expression',
  confident: 'confident, composed expression',
  crying: 'crying, tearful distressed expression',
  terrified: 'terrified, horrified expression',
  scared: 'scared, frightened expression',
  distressed: 'distressed, anguished expression',
  furious: 'furious, enraged expression',
}

/** Face or body nouns — if the author already named these, do not invent more. */
const FACE_BODY_TELL_PATTERN =
  /\b(jaw|jaws|eyes?|eye|mouth|lips?|brow|brows|forehead|shoulders?|chin|teeth|nostrils?|cheeks?|pupils?|lids?)\b/i

/**
 * Visible still tells for short emotion labels. One instant: settled face and
 * body, no motion verbs. Longest phrases first so "sudden tension" wins over
 * "tension".
 */
const STILL_EMOTION_TELLS: Array<{ pattern: RegExp; tells: string }> = [
  { pattern: /\bsudden tension\b/i, tells: 'eyes widened, jaw set, mouth tight, shoulders locked' },
  { pattern: /\bhypnotic awe\b/i, tells: 'eyes wide and still, mouth parted, face slack' },
  { pattern: /\bquiet dread\b/i, tells: 'eyes held, jaw tight, mouth closed, shoulders drawn' },
  { pattern: /\bpanicked determination\b/i, tells: 'eyes wide, jaw set, mouth a hard line' },
  { pattern: /\bwry resignation\b/i, tells: 'mouth a tight slant, eyes tired, brows lowered' },
  { pattern: /\bdesperate grounding\b/i, tells: 'jaw set, eyes locked, mouth pressed shut' },
  { pattern: /\b(awe|awed|awestruck)\b/i, tells: 'eyes wide, mouth parted, face slack' },
  { pattern: /\b(dread|dreadful)\b/i, tells: 'eyes held, jaw tight, shoulders drawn' },
  { pattern: /\b(tense|tension)\b/i, tells: 'jaw set, mouth tight, shoulders locked' },
  { pattern: /\bresolute\b/i, tells: 'jaw set, eyes steady, mouth a firm line' },
  { pattern: /\bterrified\b/i, tells: 'eyes wide, mouth open, brows raised' },
  { pattern: /\b(scared|frightened|fearful)\b/i, tells: 'eyes wide, brows raised, mouth tight' },
  { pattern: /\b(angry|furious|enraged)\b/i, tells: 'brows drawn, jaw clenched, mouth a hard line' },
  { pattern: /\b(sad|grief|grieving)\b/i, tells: 'eyes downcast, mouth slack, brows drawn' },
  { pattern: /\b(crying|tearful)\b/i, tells: 'eyes wet, mouth open, brows drawn' },
  { pattern: /\b(exhausted|weary)\b/i, tells: 'lids heavy, mouth slack, shoulders dropped' },
  { pattern: /\b(nervous|anxious)\b/i, tells: 'lips pressed, brows knit, jaw tight' },
  { pattern: /\bthoughtful\b/i, tells: 'eyes unfocused, mouth closed, brows slightly knit' },
  { pattern: /\b(cold|detached)\b/i, tells: 'eyes flat, jaw still, mouth a thin line' },
  { pattern: /\bamused\b/i, tells: 'eyes lit, mouth a slight smile' },
  { pattern: /\b(confident|composed)\b/i, tells: 'eyes steady, jaw easy, mouth closed' },
  { pattern: /\b(firm|direct)\b/i, tells: 'eyes locked, jaw set, mouth a firm line' },
]

/**
 * Turn a short directed-emotion label into face and body the still can draw.
 *
 * "sudden tension" names a feeling; the image model needs eyes, jaw, mouth,
 * shoulders. Phrases that already name those stay as written.
 */
export function expandEmotionForStill(emotion: string): string {
  const trimmed = emotion.trim().replace(/[.]+$/u, '')
  if (!trimmed) return ''
  if (FACE_BODY_TELL_PATTERN.test(trimmed)) return trimmed

  for (const { pattern, tells } of STILL_EMOTION_TELLS) {
    if (pattern.test(trimmed)) return `${trimmed} — ${tells}`
  }

  return trimmed
}

/** Action-prose keywords not always present in bracket cues. */
const ACTION_EMOTION_PATTERNS: Array<{ pattern: RegExp; visual: string }> = [
  { pattern: /\b(crying|cries|sobbing|sobs|in tears|tearful)\b/i, visual: EMOTION_VISUAL.crying },
  { pattern: /\b(terrified|horrified|petrified)\b/i, visual: EMOTION_VISUAL.terrified },
  { pattern: /\b(scared|frightened)\b/i, visual: EMOTION_VISUAL.scared },
  { pattern: /\b(distress|distressed|anguish|anguished)\b/i, visual: EMOTION_VISUAL.distressed },
  { pattern: /\b(furious|enraged|rage|raging)\b/i, visual: EMOTION_VISUAL.furious },
  { pattern: /\b(exhausted|weary|fatigued|worn out)\b/i, visual: EMOTION_VISUAL.exhausted },
  { pattern: /\b(angry|furious|livid)\b/i, visual: EMOTION_VISUAL.angry },
  { pattern: /\b(sad|grief|grieving|mourning)\b/i, visual: EMOTION_VISUAL.sad },
  { pattern: /\b(fearful|anxious|panicked|panic)\b/i, visual: EMOTION_VISUAL.fearful },
]

/** Infer facial expression from action prose when no bracket cue is present. */
export function inferEmotionFromActionProse(text: string): string {
  const trimmed = (text || '').trim()
  if (!trimmed) return ''

  for (const { pattern, visual } of ACTION_EMOTION_PATTERNS) {
    if (pattern.test(trimmed)) return visual
  }

  for (const [keyword, visual] of Object.entries(EMOTION_VISUAL)) {
    const re = new RegExp(`\\b${keyword}\\b`, 'i')
    if (re.test(trimmed)) return visual
  }

  return ''
}

export interface ResolveDirectedEmotionOptions {
  characterName?: string
  beatSpeaker?: string | null
  beatLine?: string | null
  beatAction?: string | null
  appearanceNotes?: string | null
}

function extractDirectedEmotionFromText(text: string): string {
  const trimmed = (text || '').trim()
  if (!trimmed) return ''

  const fromCue = parsePerformanceCue(trimmed).visualExpression.trim()
  if (fromCue) return fromCue

  return inferEmotionFromActionProse(trimmed)
}

const IDENTITY_OWNED_APPEARANCE_PATTERNS: RegExp[] = [
  /\b(?:pale|fair|warm|medium-tan|olive|light|dark|tan|brown|golden|ivory)\s+skin\b/gi,
  /\bskin\s+tone\b/gi,
  /\b(?:south asian|middle eastern|caucasian|asian|hispanic|latino|african|ethnicity)\b/gi,
  /\b(?:oval|round|square|heart-shaped)\s+face\b/gi,
  /\b(?:long|short|dark|light|brown|blonde|auburn|black|wavy|curly|straight)\s+(?:brown|black|blonde|auburn)?\s*\w*\s*hair\b/gi,
  /\bhair\s+styled\s+half-up\b/gi,
  /\bperfect\s+volume\b/gi,
]

/** Keep scene-state injuries/makeup/exhaustion; drop base identity traits the reference owns. */
export function extractSceneStateFromAppearanceNotes(notes: string): string {
  const trimmed = (notes || '').trim()
  if (!trimmed) return ''

  const stagingSplit = trimmed.split(/\bas\b/i)[0]?.trim() || trimmed

  const parts = stagingSplit
    .split(/[,;]+/)
    .map((part) => part.trim())
    .filter(Boolean)

  const kept = parts.filter((part) => {
    const lower = part.toLowerCase()
    if (looksLikeActionStaging(part)) return false
    if (IDENTITY_OWNED_APPEARANCE_PATTERNS.some((pattern) => {
      pattern.lastIndex = 0
      return pattern.test(part)
    })) {
      return false
    }
    return (
      /\b(bloodshot|bruises?|bruised|contusion|cut|scar|injury|wound|distress|exhaustion|exhausted|tearful|crying|makeup|mascara|smudged|messy|disheveled|anguish)\b/i.test(
        lower
      ) || /\b(losing|lost)\s+(?:its\s+)?(?:perfect\s+)?volume\b/i.test(lower)
    )
  })

  return kept.join(', ')
}

function looksLikeActionStaging(text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed) return false
  if (trimmed.split(/\s+/).length > 14) return true
  if (/\b(pulls?|toward|towards|walks?|runs?|storms?|drags?)\b/i.test(trimmed) &&
      /\b(gate|door|room|hallway|street|alley)\b/i.test(trimmed)) {
    return true
  }
  return false
}

/**
 * Scene-state continuity from wardrobe appearanceNotes (injuries, makeup wear).
 * Independent of beat emotion — always preserved across frames when present.
 */
export function resolveSceneAppearanceContinuity(appearanceNotes?: string | null): string {
  return extractSceneStateFromAppearanceNotes(appearanceNotes || '')
}

/**
 * Resolve directed facial expression for a character in a beat frame.
 * Priority: beat line (speaker only) → beat action.
 * AppearanceNotes are NOT used for emotion (they feed sceneAppearanceContinuity instead).
 */
export function resolveDirectedEmotionForCharacter(
  options: ResolveDirectedEmotionOptions
): string {
  const speaker = options.beatSpeaker?.trim()
  const isSpeaker =
    !speaker ||
    !options.characterName ||
    speaker.toLowerCase() === options.characterName.trim().toLowerCase()

  const textsInOrder: string[] = []
  if (isSpeaker && options.beatLine?.trim()) {
    textsInOrder.push(options.beatLine.trim())
  }
  if (options.beatAction?.trim()) {
    textsInOrder.push(options.beatAction.trim())
  }

  for (const text of textsInOrder) {
    const emotion = extractDirectedEmotionFromText(text)
    if (emotion) return emotion
  }

  return ''
}

/** Beat-level emotion from beat direction (preferred) or line + action. */
export function resolveBeatDirectedEmotion(options: {
  beatLine?: string | null
  beatAction?: string | null
  beatDirectionEmotion?: string | null
}): string {
  const authored = options.beatDirectionEmotion?.trim()
  if (authored) return authored
  for (const text of [options.beatLine, options.beatAction]) {
    if (!text?.trim()) continue
    const emotion = extractDirectedEmotionFromText(text.trim())
    if (emotion) return emotion
  }
  return ''
}

/** Build a single-character facial expression line for frame prompts. */
export function formatDirectedEmotionLine(
  emotion: string,
  label: 'Facial expression' | 'Directed emotion' = 'Facial expression'
): string {
  const expanded = expandEmotionForStill(emotion)
  if (!expanded) return ''
  return `${label}: ${expanded}.`
}

/** A character the composed frame actually places, with its reference token. */
export interface BeatExpressionSubject {
  name?: string
  promptToken?: string
}

export interface BeatExpressionAttribution {
  /** Line to append, empty when the expression has no face to sit on. */
  line: string
  /** The placed subject the expression was bound to, when it was bound. */
  attributedTo?: string
  /** Set when an expression was dropped because no placed subject owns it. */
  dropped?: 'ambiguous-subject'
}

/**
 * Put a beat's directed expression on every placed face.
 *
 * A bare "Facial expression: quiet dread." is unambiguous in a single. In a
 * two-shot the identity references still copy a neutral face unless each
 * visible person is named. Shared beat emotion applies to every placed
 * subject; per-character cues belong in Action/Framing via
 * `enrichActionFramingWithCastPerformance`.
 */
export function attributeBeatExpression(options: {
  emotion?: string | null
  placedSubjects: BeatExpressionSubject[]
  speakerName?: string | null
}): BeatExpressionAttribution {
  const emotion = options.emotion?.trim()
  if (!emotion || options.placedSubjects.length === 0) return { line: '' }

  if (options.placedSubjects.length === 1) {
    return { line: formatDirectedEmotionLine(emotion) }
  }

  const expanded = expandEmotionForStill(emotion)
  if (!expanded) return { line: '' }

  const lines = options.placedSubjects.map((subject) => {
    const label = [subject.promptToken?.trim(), subject.name?.trim()].filter(Boolean).join(' — ')
    return `Facial expression (${label}): ${expanded}.`
  })
  return { line: lines.join(' ') }
}

/** Per-character directed emotion block for beat frame prompts. */
export function buildBeatDirectedEmotionPromptSection(
  entries: Array<{ name: string; emotion: string }>
): string {
  const parts = entries
    .filter((entry) => entry.emotion.trim())
    .map((entry) => `${entry.name}: ${entry.emotion.trim()}`)
  if (!parts.length) return ''
  return `Directed emotion: ${parts.join('; ')}.`
}

/** Per-character scene-state continuity (injuries/makeup) for beat frame prompts. */
export function buildSceneAppearanceContinuityPromptSection(
  entries: Array<{ name: string; continuity: string }>
): string {
  const parts = entries
    .filter((entry) => entry.continuity.trim())
    .map((entry) => ({
      name: entry.name,
      continuity: entry.continuity.trim(),
    }))
  if (!parts.length) return ''

  const unique = new Set(parts.map((part) => part.continuity.toLowerCase()))
  if (unique.size === 1 && parts.length > 1) {
    return ''
  }

  return `Scene appearance continuity (preserve from wardrobe): ${parts
    .map((part) => `${part.name}: ${part.continuity}`)
    .join('; ')}.`
}

function parseAddressee(tagParts: string[]): { addressee: string | null; delivery: string; visual: string } {
  for (const part of tagParts) {
    const lower = part.trim().toLowerCase()
    const toSelf = lower.match(/^to\s+(herself|himself|themselves|myself)$/)
    if (toSelf) {
      return {
        addressee: toSelf[1],
        delivery: 'speaking to herself, introspective, minimal eye contact, low volume',
        visual: 'introspective gaze, speaking inward, minimal eye contact',
      }
    }
    const toOther = lower.match(/^to\s+(.+)$/)
    if (toOther) {
      const target = toOther[1].trim()
      return {
        addressee: target,
        delivery: `addressing ${target} directly, engaged eye contact`,
        visual: `directed gaze toward ${target}, engaged expression`,
      }
    }
  }
  return { addressee: null, delivery: '', visual: '' }
}

function matchEmotionKeywords(tagParts: string[]): { delivery: string; visual: string } {
  const deliveryParts: string[] = []
  const visualParts: string[] = []

  for (const part of tagParts) {
    const lower = part.trim().toLowerCase()
    if (/^to\s+/.test(lower)) continue

    let matched = false
    for (const [keyword, delivery] of Object.entries(EMOTION_DELIVERY)) {
      if (lower.includes(keyword)) {
        deliveryParts.push(delivery)
        visualParts.push(EMOTION_VISUAL[keyword] ?? `${keyword} expression`)
        matched = true
        break
      }
    }
    if (!matched && lower.length > 0) {
      deliveryParts.push(`with ${lower} delivery`)
      visualParts.push(`${lower} expression`)
    }
  }

  return {
    delivery: deliveryParts.join('; '),
    visual: visualParts.join('; '),
  }
}

/** Remove all bracket `[...]` and parenthetical `(...)` stage directions. */
export function stripAllCues(text: string): string {
  if (!text) return text
  return text
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/** Strip second-person meta-instructions aimed at the image generator (not scene content). */
export function stripPromptMetaInstructions(text: string): string {
  if (!text?.trim()) return text
  const patterns = [
    /\b(?:use your expertise|use your intelligence)\b[^.!?]*[.!?]?/gi,
    /\bconsider using combo references?\b[^.!?]*[.!?]?/gi,
    /\bi(?:'m| am) not sure how to\b[^.!?]*[.!?]?/gi,
    /\boptimize the prompt\b[^.!?]*[.!?]?/gi,
    /\bbalance two reference images?\b[^.!?]*[.!?]?/gi,
    /\bhow to balance\b[^.!?]*reference images?[^.!?]*[.!?]?/gi,
  ]
  let result = text
  for (const pattern of patterns) {
    result = result.replace(pattern, ' ')
  }
  return result
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.!?])/g, '$1')
    .trim()
}

/**
 * Parse leading bracket performance cue and map to delivery + visual guidance.
 */
export function parsePerformanceCue(text: string): ParsedPerformanceCue {
  const trimmed = (text || '').trim()
  const { emotion: rawTag, body } = splitEmotionPrefix(trimmed)
  const spokenText = stripAllCues(body || trimmed)

  if (!rawTag) {
    return {
      emotion: null,
      addressee: null,
      deliveryProse: '',
      visualExpression: '',
      spokenText,
    }
  }

  const tagParts = rawTag.split(/[,;]/).map((p) => p.trim()).filter(Boolean)
  const addresseeInfo = parseAddressee(tagParts)
  const emotionInfo = matchEmotionKeywords(tagParts)

  const deliveryParts = [emotionInfo.delivery, addresseeInfo.delivery].filter(Boolean)
  const visualParts = [emotionInfo.visual, addresseeInfo.visual].filter(Boolean)

  return {
    emotion: rawTag,
    addressee: addresseeInfo.addressee,
    deliveryProse: deliveryParts.join('. '),
    visualExpression: visualParts.join('; '),
    spokenText,
  }
}

/** Build a frame-image expression line from parsed cues. */
export function formatVisualExpressionCue(text: string): string {
  const parsed = parsePerformanceCue(text)
  if (!parsed.visualExpression.trim()) return ''
  return `Facial expression: ${parsed.visualExpression}.`
}
