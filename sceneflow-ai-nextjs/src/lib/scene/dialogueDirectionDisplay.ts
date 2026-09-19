/**
 * Split a spoken line into the compact chip, displayed body, and acting brief.
 */

import { splitEmotionPrefix } from '@/lib/scene/translateGuideDialogue'

export type DialogueDirectionDisplay = {
  /** Short UI chip: leading [emotion, delivery] or (parenthetical). */
  chip: string
  /** Spoken words with leading direction stripped. */
  spokenDisplay: string
  /** Actor-facing Gemini TTS brief from voiceDirection. */
  brief: string
}

export function dialogueDirectionDisplay(
  lineText: string | undefined,
  voiceDirection?: string | null
): DialogueDirectionDisplay {
  const trimmed = String(lineText || '').trim()
  const paren = trimmed.match(/^\(([^)]+)\)\s*([\s\S]*)$/)
  const afterParen = (paren ? paren[2] : trimmed).trim()
  const { emotion, body } = splitEmotionPrefix(afterParen)
  const spokenDisplay = (body || afterParen || trimmed).trim()
  const chip = (emotion || paren?.[1] || '').trim()
  const brief = String(voiceDirection || '').replace(/\s+/g, ' ').trim()
  return { chip, spokenDisplay, brief }
}
