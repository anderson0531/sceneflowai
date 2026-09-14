/**
 * Action/Framing is the section the still model illustrates. Coverage labels
 * and occupancy lists are not enough: every visible person needs a body that
 * carries weight and a face that is not copied from the identity reference.
 *
 * Generate-time used to append "Directed emotion:" after [EXCLUSIONS], which
 * the still parser then treated as a negative. This module writes performance
 * into Action/Framing instead, and is safe to run twice (persisted prompt, then
 * live refs) because each facet is skipped when it is already present.
 */

import { expandEmotionForStill } from '@/lib/scene/performanceCues'

const NAME_TITLE_PATTERN =
  /^(?:dr|doctor|prof|professor|mr|mrs|ms|miss|sir|madam|capt|captain|officer|det|detective|sgt|sergeant|lt|lieutenant|col|colonel|gen|general|father|mother|sister|brother|rev|reverend|judge|mayor|president|king|queen|lord|lady|uncle|aunt)\.?$/i

const LEAKED_PERFORMANCE_LINE =
  /^(?:Directed emotion|Facial expression|Scene appearance continuity)\b/i

const LEAKED_PERFORMANCE_CLAUSE =
  /(?:Directed emotion|Facial expression(?:\s*\([^)]+\))?|Scene appearance continuity(?:\s*\([^)]+\))?)\s*:[^.]*\.?/gi

export interface CastPerformanceInput {
  actionFraming: string
  castNames: string[]
  /** Per-character emotion keyed by any alias of the cast name. */
  emotionsByName?: Record<string, string>
  speakerName?: string | null
  /** Shared beat emotion when a character has no per-name cue. */
  defaultEmotion?: string | null
  /** person [N] tokens after still assembly, so regen can see tokenized bodies. */
  tokensByName?: Record<string, string>
}

function asSentence(value: string): string {
  const trimmed = value.trim().replace(/\s+/g, ' ')
  if (!trimmed) return ''
  return /[.!?:;]$/.test(trimmed) ? trimmed : `${trimmed}.`
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Full name plus first/last without titles, for matching "Gideon" to "Professor Gideon Croft". */
export function characterNameAliases(name: string): string[] {
  const trimmed = name.trim()
  if (!trimmed) return []
  const parts = trimmed.split(/\s+/).filter(Boolean)
  const withoutTitles = parts.filter((part) => !NAME_TITLE_PATTERN.test(part))
  const aliases = new Set<string>([trimmed])
  if (withoutTitles.length > 0) aliases.add(withoutTitles.join(' '))
  if (withoutTitles.length > 1) {
    aliases.add(withoutTitles[0])
    aliases.add(withoutTitles[withoutTitles.length - 1])
  }
  return [...aliases].filter((alias) => alias.length >= 3)
}

export function matchCastName(
  query: string | null | undefined,
  castNames: string[]
): string | undefined {
  const q = query?.trim().toLowerCase()
  if (!q) return undefined
  return (
    castNames.find((name) => name.trim().toLowerCase() === q) ??
    castNames.find((name) =>
      characterNameAliases(name).some((alias) => alias.toLowerCase() === q)
    ) ??
    castNames.find((name) => {
      const n = name.trim().toLowerCase()
      return n.includes(q) || q.includes(n)
    })
  )
}

/**
 * Split `Piper: terrified; Gideon: angry` into a map. A string with no matching
 * `Name:` labels is the shared beat emotion.
 */
export function parseNamedCastEmotions(
  emotion: string | null | undefined,
  castNames: string[]
): { byName: Record<string, string>; shared: string } {
  const trimmed = emotion?.trim() ?? ''
  if (!trimmed) return { byName: {}, shared: '' }
  if (castNames.length === 0) return { byName: {}, shared: trimmed }

  const chunks = trimmed
    .split(';')
    .map((chunk) => chunk.trim())
    .filter(Boolean)
  const byName: Record<string, string> = {}
  let named = 0
  for (const chunk of chunks) {
    const colon = chunk.indexOf(':')
    if (colon <= 0) continue
    const match = matchCastName(chunk.slice(0, colon), castNames)
    const value = chunk.slice(colon + 1).trim()
    if (!match || !value) continue
    byName[match] = value
    named += 1
  }
  return { byName, shared: named > 0 ? '' : trimmed }
}

function emotionForCastMember(
  name: string,
  emotionsByName: Record<string, string> | undefined,
  defaultEmotion: string
): string {
  if (emotionsByName) {
    const direct = emotionsByName[name]?.trim()
    if (direct) return direct
    for (const [key, value] of Object.entries(emotionsByName)) {
      if (!value.trim()) continue
      if (matchCastName(key, [name]) === name) return value.trim()
    }
  }
  return defaultEmotion
}

/** Text the still uses for bodies — occupancy, gaze, and faces are not staging. */
function bodyStagingText(actionFraming: string): string {
  return actionFraming
    .replace(/\bGaze(?:\s*\([^)]+\))?:\s*[^.]*\.?/gi, ' ')
    .replace(/\bFacial expression(?:\s*\([^)]+\))?:\s*[^.]*\.?/gi, ' ')
    .replace(/\bDirected emotion:\s*[^.]*\.?/gi, ' ')
    .replace(/\bCast in frame:\s*[^.]*\.?/gi, ' ')
    .replace(/\bNo people in frame:[^.]*\.?/gi, ' ')
    // Coverage ("both A and B fully in frame") is occupancy, not a pose.
    .replace(/[^.]*\bfully in frame\b[^.]*\.?/gi, ' ')
}

function isPromptToken(phrase: string): boolean {
  return /^(?:person|prop|location)\s*\[/i.test(phrase)
}

function phrasesForCastMember(name: string, token?: string): string[] {
  return [...characterNameAliases(name), token?.trim() ?? '']
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)
}

function mentionCount(staging: string, phrase: string): number {
  const escaped = escapeRegExp(phrase)
  const matches = staging.match(
    isPromptToken(phrase)
      ? new RegExp(`${escaped}(?!\\d)`, 'gi')
      : new RegExp(`\\b${escaped}\\b`, 'gi')
  )
  return matches?.length ?? 0
}

function stripPossessiveMentions(staging: string, phrases: string[]): string {
  let text = staging
  for (const phrase of phrases) {
    const escaped = escapeRegExp(phrase)
    const possessive = isPromptToken(phrase)
      ? new RegExp(`${escaped}(?!\\d)(?:'s|’s)`, 'gi')
      : new RegExp(`\\b${escaped}(?:'s|’s)\\b`, 'gi')
    text = text.replace(possessive, ' ')
  }
  return text
}

function tokenForName(name: string, tokensByName?: Record<string, string>): string | undefined {
  if (!tokensByName) return undefined
  const direct = tokensByName[name]?.trim()
  if (direct) return direct
  for (const [key, token] of Object.entries(tokensByName)) {
    if (!token.trim()) continue
    if (matchCastName(key, [name]) === name) return token.trim()
  }
  return undefined
}

/**
 * True when the person is doing something with their body, not merely named as
 * a landmark (`beside Piper's shoulder`, `blocks Piper's path`).
 */
export function castMemberHasBodyClause(
  actionFraming: string,
  name: string,
  token?: string
): boolean {
  const phrases = phrasesForCastMember(name, token)
  const remainder = stripPossessiveMentions(bodyStagingText(actionFraming), phrases)
  return phrases.some((phrase) => mentionCount(remainder, phrase) > 0)
}

function groundingClause(name: string): string {
  return `${name} stands on the set floor with full weight through both feet and a matching contact shadow`
}

function joinAnd(names: string[]): string {
  if (names.length === 1) return names[0]
  if (names.length === 2) return `${names[0]} and ${names[1]}`
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`
}

function expandSpatialTwoShot(actionFraming: string, castNames: string[]): string {
  if (castNames.length < 2) return actionFraming
  if (/\bfully in frame\b/i.test(actionFraming)) return actionFraming
  const match = actionFraming.match(/^(Two[-\s]?Shot(?:\s*,\s*[^.:]+)?)([.:])(\s*)/i)
  if (!match) return actionFraming
  const both =
    castNames.length === 2
      ? `both ${joinAnd(castNames)} fully in frame`
      : `${joinAnd(castNames)} fully in frame`
  return `${match[1]}: ${both}.${match[3] || ' '}${actionFraming.slice(match[0].length)}`
}

function labelGaze(actionFraming: string, castNames: string[], speakerName?: string | null): string {
  if (castNames.length < 2) return actionFraming
  if (/\bGaze\s*\(/i.test(actionFraming)) return actionFraming
  const gazeMatch = actionFraming.match(/\bGaze:\s*([^.]*)\.?/)
  if (!gazeMatch) return actionFraming

  const gazeBody = gazeMatch[1].trim()
  if (!gazeBody) return actionFraming

  const mentioned = castNames.filter((name) =>
    characterNameAliases(name).some((alias) =>
      new RegExp(`\\b${escapeRegExp(alias)}\\b`, 'i').test(gazeBody)
    )
  )
  const speaker = matchCastName(speakerName, castNames)
  const looker =
    speaker ??
    (mentioned.length === 1
      ? castNames.find((name) => name !== mentioned[0])
      : undefined)
  if (!looker) return actionFraming

  return actionFraming.replace(/\bGaze:\s*/, `Gaze (${looker}): `)
}

function alreadyHasExpressionFor(
  actionFraming: string,
  name: string,
  token?: string
): boolean {
  const haystack = actionFraming.toLowerCase()
  const labels = [
    name,
    token,
    ...characterNameAliases(name),
  ]
    .map((value) => value?.trim().toLowerCase())
    .filter(Boolean)
  return labels.some((label) => haystack.includes(`facial expression (${label})`))
}

const DIRECTED_EMOTION_FOOTER =
  /\bDirected emotion:\s*([\s\S]*?)(?=\s*(?:Gaze(?:\s*\([^)]+\))?:|Facial expression(?:\s*\([^)]+\))?:|Cast in frame:|No people in frame:|$))/i

function absorbDirectedEmotionFooter(
  actionFraming: string,
  castNames: string[]
): { framing: string; byName: Record<string, string>; shared: string } {
  const match = actionFraming.match(DIRECTED_EMOTION_FOOTER)
  if (!match) return { framing: actionFraming, byName: {}, shared: '' }
  const footer = match[1].trim().replace(/\.+$/u, '')
  const namesFromFooter = footer
    .split(';')
    .map((chunk) => {
      const colon = chunk.indexOf(':')
      if (colon <= 0) return ''
      return chunk.slice(0, colon).trim()
    })
    .filter((name) => name.length >= 3)
  const names = [...new Set([...castNames, ...namesFromFooter])]
  const parsed = parseNamedCastEmotions(footer, names)
  const stripped = actionFraming
    .replace(DIRECTED_EMOTION_FOOTER, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return { framing: stripped, byName: parsed.byName, shared: parsed.shared }
}

function appendFacet(framing: string, value: string, label?: string): string {
  const sentence = label ? `${label}: ${asSentence(value)}` : asSentence(value)
  if (!sentence) return framing
  if (framing.toLowerCase().includes(sentence.toLowerCase().replace(/\.$/, ''))) return framing
  if (label && framing.toLowerCase().includes(`${label.toLowerCase()}:`)) {
    const labeledValue = asSentence(value).toLowerCase()
    if (framing.toLowerCase().includes(labeledValue.replace(/\.$/, ''))) return framing
  }
  return `${framing.trim()} ${sentence}`.trim()
}

/**
 * Thicken Action/Framing with per-visible-person weight/contact, labeled gaze,
 * and expanded facial tells. Idempotent.
 */
export function enrichActionFramingWithCastPerformance(input: CastPerformanceInput): string {
  const castNames = input.castNames.map((name) => name.trim()).filter(Boolean)
  let framing = input.actionFraming.trim()
  if (!framing) return framing

  const absorbed = absorbDirectedEmotionFooter(framing, castNames)
  framing = absorbed.framing
  const emotionsByName = { ...absorbed.byName, ...(input.emotionsByName ?? {}) }
  const defaultEmotion = input.defaultEmotion?.trim() || absorbed.shared
  const expressionNames = castNames.length > 0 ? castNames : Object.keys(emotionsByName)

  if (castNames.length === 0 && expressionNames.length === 0) {
    if (defaultEmotion && !/\bFacial expression:/i.test(framing)) {
      const expanded = expandEmotionForStill(defaultEmotion)
      if (expanded) framing = appendFacet(framing, expanded, 'Facial expression')
    }
    return framing
  }

  // Ground before the occupancy two-shot line, which names everyone as in-frame
  // without placing their weight.
  for (const name of castNames) {
    if (castMemberHasBodyClause(framing, name, tokenForName(name, input.tokensByName))) continue
    framing = appendFacet(framing, groundingClause(name))
  }

  if (castNames.length >= 2) {
    framing = expandSpatialTwoShot(framing, castNames)
  }

  framing = labelGaze(framing, castNames, input.speakerName)

  let unlabeledFacePresent =
    /\bFacial expression:/i.test(framing) && !/\bFacial expression\s*\(/i.test(framing)
  if (expressionNames.length > 1 && unlabeledFacePresent) {
    framing = framing.replace(/\bFacial expression:\s*[^.]*\.?/i, ' ').replace(/\s+/g, ' ').trim()
    unlabeledFacePresent = false
  }

  for (const name of expressionNames) {
    const emotion = emotionForCastMember(name, emotionsByName, defaultEmotion)
    if (!emotion) continue
    const expanded = expandEmotionForStill(emotion)
    if (!expanded) continue
    if (expressionNames.length === 1) {
      if (unlabeledFacePresent || /\bFacial expression:/i.test(framing)) continue
      framing = appendFacet(framing, expanded, 'Facial expression')
      continue
    }
    if (alreadyHasExpressionFor(framing, name, tokenForName(name, input.tokensByName))) continue
    framing = appendFacet(framing, expanded, `Facial expression (${name})`)
  }

  return framing.replace(/\s+/g, ' ').trim()
}

/**
 * Replace the Action/Framing line in a (possibly sectioned) still prompt.
 * Unstructured text is enriched in place.
 */
export function applyCastPerformanceToPrompt(
  prompt: string,
  input: Omit<CastPerformanceInput, 'actionFraming'>
): string {
  const text = prompt.trim()
  if (!text) return text
  const lineMatch = text.match(/Action\/Framing:\s*([^\n]*)/)
  if (lineMatch) {
    const enriched = enrichActionFramingWithCastPerformance({
      actionFraming: lineMatch[1],
      ...input,
    })
    return text.replace(/Action\/Framing:\s*[^\n]*/, `Action/Framing: ${enriched}`)
  }
  if (/\[(?:REFERENCES|TASK|STILL|STYLE|EXCLUSIONS)\]/i.test(text)) {
    return text
  }
  return enrichActionFramingWithCastPerformance({
    actionFraming: text,
    ...input,
  })
}

export function isLeakedPerformanceLine(line: string): boolean {
  return LEAKED_PERFORMANCE_LINE.test(line.trim())
}

/**
 * Directed emotion / facial expression accidentally stored under [EXCLUSIONS].
 * Return the performance text to fold back into Action/Framing, and the
 * remaining negatives.
 */
export function recoverLeakedActionFromExclusions(exclusions: string): {
  exclusions: string
  leakedAction: string
} {
  if (!exclusions.trim()) return { exclusions: '', leakedAction: '' }
  const leaked: string[] = []
  const kept: string[] = []
  for (const raw of exclusions.split('\n')) {
    const line = raw.trim()
    if (!line) continue
    if (isLeakedPerformanceLine(line)) {
      leaked.push(line)
      continue
    }
    const inline: string[] = []
    const cleaned = line
      .replace(LEAKED_PERFORMANCE_CLAUSE, (match) => {
        inline.push(match.trim())
        return ' '
      })
      .replace(/\s+/g, ' ')
      .replace(/\s+,/g, ',')
      .trim()
    leaked.push(...inline)
    if (cleaned) kept.push(cleaned)
  }
  return {
    exclusions: kept.join('\n').trim(),
    leakedAction: leaked.join(' '),
  }
}

/** Extra terms become another Strictly Avoid paragraph, never a bare comma dump. */
export function formatExclusionParagraph(text: string): string {
  const trimmed = text.trim()
  if (!trimmed) return ''
  return trimmed
    .split(/\n+/)
    .map((para) => para.trim())
    .filter(Boolean)
    .map((para) => (/^strictly avoid:/i.test(para) ? para : `Strictly Avoid: ${para}`))
    .join('\n')
}
