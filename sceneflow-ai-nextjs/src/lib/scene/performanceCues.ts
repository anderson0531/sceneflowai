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
