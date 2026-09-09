/**
 * Turn Audience Resonance recommendations into Assistant instruction lines.
 *
 * The analysis already authors the concrete fix on `text`. The Assistant dialog
 * was showing the short chip label instead of inserting that prose.
 */

import type {
  BlueprintAudienceRecommendation,
  BlueprintFixSection,
} from '@/lib/types/audienceResonance'
import { MAX_INTENT_CHARS } from './blueprintRevisionTypes'

export type ResonanceFixSource = Pick<
  BlueprintAudienceRecommendation,
  'text' | 'reason' | 'title'
>

export function fixInstructionForRecommendation(rec: ResonanceFixSource): string {
  return rec.text?.trim() || rec.reason?.trim() || rec.title?.trim() || ''
}

export function formatResonanceFixInstructions(
  recs: ResonanceFixSource[]
): string {
  return recs
    .map(fixInstructionForRecommendation)
    .filter(Boolean)
    .map((text, index) => `${index + 1}. ${text}`)
    .join('\n')
}

function numberedBodies(current: string): string[] {
  const bodies: string[] = []
  for (const line of current.split('\n')) {
    const match = line.match(/^\d+\.\s+(.*)$/)
    if (match) bodies.push(match[1].trim())
  }
  return bodies
}

export function appendFixInstruction(
  current: string,
  text: string,
  maxChars: number = MAX_INTENT_CHARS
): string {
  const body = text.trim()
  if (!body) return current
  if (numberedBodies(current).includes(body) || current.includes(body)) {
    return current
  }
  const nextNum = numberedBodies(current).length + 1
  const addition =
    current.trim() === '' ? `1. ${body}` : `${current.trimEnd()}\n${nextNum}. ${body}`
  if (addition.length > maxChars) return current
  return addition
}

export function removeFixInstruction(current: string, text: string): string {
  const body = text.trim()
  if (!body || !current.trim()) return current

  const kept = current.split('\n').filter((line) => {
    const match = line.match(/^\d+\.\s+(.*)$/)
    if (match) return match[1].trim() !== body
    return line.trim() !== body
  })

  let n = 1
  const renumbered = kept.map((line) =>
    /^\d+\.\s+/.test(line) ? line.replace(/^\d+\.\s+/, `${n++}. `) : line
  )

  return renumbered.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

export function focusScopeForRecommendations(
  recs: Array<
    Pick<BlueprintAudienceRecommendation, 'fixSection' | 'impactSections'>
  >
): BlueprintFixSection | 'all' {
  if (recs.length === 0) return 'all'
  const sections = new Set(recs.map((r) => r.fixSection).filter(Boolean))
  if (sections.size !== 1) return 'all'
  const shared = recs[0].fixSection
  const hasExtraImpact = recs.some((r) =>
    (r.impactSections ?? []).some((section) => section !== shared)
  )
  return hasExtraImpact ? 'all' : shared
}
