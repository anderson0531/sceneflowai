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

/**
 * Resolve directed facial expression for a character in a beat frame.
 * Priority: beat line (speaker only) → beat action → wardrobe appearanceNotes.
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

  return options.appearanceNotes?.trim() || ''
}

/** Beat-level emotion from line + action (for AI intelligence). */
export function resolveBeatDirectedEmotion(options: {
  beatLine?: string | null
  beatAction?: string | null
}): string {
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
  const trimmed = emotion.trim()
  if (!trimmed) return ''
  return `${label}: ${trimmed}.`
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
