/**
 * Provider-facing rewrite of assembled still prompts.
 *
 * Internal assembly keeps `person [N]` tokens, a `[REFERENCES]` legend, and
 * layout-ban exclusions so gates and Studio storage stay stable. Gemini Image
 * reads those numbered brackets and banned-layout words as a contact-sheet
 * brief, so this module rewrites only the Vertex payload: names, one frozen
 * instant, one lens, no model-sheet vocabulary.
 */

import {
  WARDROBE_DIPTYCH_CONSUMPTION_INSTRUCTION,
  buildWardrobeDiptychCharacterConsumptionLine,
} from '@/lib/character/sceneCharacterHeadshot'
import { LOCATION_TURNAROUND_CONSUMPTION_INSTRUCTION } from '@/lib/vision/locationReferencePrompts'
import { WARDROBE_TURNAROUND_CONSUMPTION_INSTRUCTION } from '@/lib/character/wardrobeReferencePrompts'
import {
  STILL_SECTION_STILL,
  type StillPromptBoundRef,
} from '@/lib/imagen/structuredStillPrompt'

export const SINGLE_FRAME_LOCK =
  'single unified film frame, one camera, no borders, no inset panels'

/** Phrases that teach Gemini to draw a reference sheet when placed in exclusions. */
export const LAYOUT_TRIGGER_TERMS = [
  'reference sheet collage',
  'reference-sheet layout',
  'side-by-side panels',
  'turnaround sheet layout',
  'turnaround sheet',
  'multi-panel layout',
  'multi-panel reference layout',
  'two-panel layout',
  'two-panel split',
  '4-panel layout',
  '2x2 grid output',
  '2x2 grid',
  'split-screen output',
  'split-screen',
  'multi-panel',
  'two-panel',
  '4-panel',
  'contact sheet',
  'diptych',
  'collage',
] as const

const TOKEN_PATTERN = /\b(?:person|prop|location) \[(\d+)\]/gi
const INSERT_SHOT_PATTERN =
  /\b(extreme\s+close[- ]?up|ecu|insert|macro|detail shot|cutaway)\b/i
const NARRATIVE_SHOT_PATTERN =
  /\b(two[- ]?shot|medium(?:\s+close[- ]?up|\s+shot)?|wide(?:\s+shot)?|establishing|ots|over[- ]the[- ]shoulder|long shot|full[- ]?body|master)\b/i
const INSERT_LENS_CUE = /\b(macro|100mm|extreme detail|sensory insert)\b/i
const WIDE_LENS_CUE = /\b(14mm|16mm|18mm|21mm|24mm|wide[- ]angle)\b/i
const INFERRED_SHOT_PATTERN =
  /\b(two[- ]?shot|extreme close[- ]?up|medium(?: close[- ]?up)?|wide shot|establishing|insert|close[- ]?up)\b/i

export interface ProviderImageBinding {
  sendIndex: number
  name: string
}

export interface ProviderStillEmitInput {
  refs?: StillPromptBoundRef[]
  imageBindings?: ProviderImageBinding[]
  shotType?: string
}

export function emitProviderStillPrompt(
  prompt: string,
  input: ProviderStillEmitInput = {}
): string {
  if (!prompt.trim()) return prompt

  const refs = input.refs ?? []
  let text = rewriteProviderConsumptionLanguage(prompt, refs)
  text = dropReferencesSection(text)
  text = injectBoundRefLines(text, refs)
  text = replaceTokensWithLibraryNames(text, refs)
  text = replaceUnboundLibraryTokens(text)
  text = replaceReferenceImageMentions(text, input.imageBindings ?? [])
  text = freezeActionFramingLines(text)
  text = reconcileStyleLens(text, inferShotType(text, input.shotType))
  text = stripLayoutTriggerTerms(text)
  text = injectSingleFrameLock(text)
  return collapseBlankLines(text).trim()
}

export function replaceTokensWithLibraryNames(
  text: string,
  refs: StillPromptBoundRef[]
): string {
  if (!text || refs.length === 0) return text
  const sorted = [...refs].sort((a, b) => b.token.length - a.token.length)
  let result = text
  for (const ref of sorted) {
    if (!ref.token || !ref.name) continue
    result = result.split(ref.token).join(ref.name)
  }
  return result
}

export function freezeStillActionToInstant(text: string): string {
  if (!text) return text
  const withoutShift = text.replace(/\bshifting from\s+.+?\s+to\s+/gi, '')
  const sentences = withoutShift.split(/(?<=[.!?])\s+/)
  const frozen = sentences
    .map((sentence) => collapseThenSequence(sentence) ?? sentence)
    .join(' ')
  return tidyClause(frozen)
}

export function collapseThenSequence(
  text?: string,
  frozenMoment?: string
): string | undefined {
  if (!text?.trim()) return text
  if (!/\b(?:and\s+)?then\b/i.test(text)) return text.trim()

  const parts = text
    .split(/\b(?:and\s+)?then\b/i)
    .map((part) => part.replace(/^[\s,;]+|[\s,;]+$/g, '').trim())
    .filter(Boolean)
  if (parts.length < 2) return text.trim()

  if (frozenMoment) {
    const frozenLower = frozenMoment.toLowerCase()
    const match = [...parts].reverse().find((part) => {
      const words = part
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((word) => word.length > 3)
      return words.some((word) => frozenLower.includes(word))
    })
    if (match) return match
  }

  return parts[parts.length - 1]
}

export function collapseCameraAngleProgression(
  angle?: string,
  frozenMoment?: string
): string | undefined {
  const trimmed = angle?.trim()
  if (!trimmed) return trimmed
  if (!/\bshifting from\b/i.test(trimmed) && !/\b(?:and\s+)?then\b/i.test(trimmed)) {
    return trimmed
  }
  const collapsed = freezeStillActionToInstant(trimmed)
  if (frozenMoment && collapsed) {
    const preferred = collapseThenSequence(collapsed, frozenMoment)
    return preferred || collapsed
  }
  return collapsed || trimmed
}

export function reconcileLensWithShotType(lensLine: string, shotType?: string): string {
  if (!lensLine.trim()) return lensLine

  const dropInsert = shouldDropInsertLenses(shotType)
  const dropWide = shouldDropWideLenses(shotType)
  const segments = lensLine.split(/\s*;\s*/).map((part) => part.trim()).filter(Boolean)
  const kept: string[] = []

  for (const segment of segments) {
    if (dropInsert && INSERT_LENS_CUE.test(segment)) {
      const filtered = segment
        .split(/\s*,\s*/)
        .filter((part) => !INSERT_LENS_CUE.test(part))
        .join(', ')
        .trim()
      if (filtered) kept.push(filtered)
      continue
    }
    if (dropWide && WIDE_LENS_CUE.test(segment) && !INSERT_LENS_CUE.test(segment)) {
      continue
    }
    kept.push(segment)
  }

  if (kept.length === 0 && dropInsert) {
    kept.push('35mm')
  }

  return dedupeLightingCues(kept.join('; '))
}

export function dedupeLightingCues(line: string): string {
  const parts = line.split(/\s*;\s*/).map((part) => part.trim()).filter(Boolean)
  const seen = new Set<string>()
  const out: string[] = []
  for (const part of parts) {
    const key = part.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(part)
  }
  return out.join('; ')
}

export function stripLayoutTriggerTerms(text: string): string {
  if (!text) return text
  const sorted = [...LAYOUT_TRIGGER_TERMS].sort((a, b) => b.length - a.length)
  let result = text
  for (const term of sorted) {
    const pattern = new RegExp(`\\b${escapeRegExp(term)}\\b`, 'gi')
    result = result.replace(pattern, '')
  }
  return result
    .replace(/(?:,\s*){2,}/g, ', ')
    .replace(/:\s*,/g, ': ')
    .replace(/,\s*or\s*,/gi, ', ')
    .replace(/\bor\s*,/gi, '')
    .replace(/,\s*or\s*$/gim, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/[ \t]+,/g, ',')
    .replace(/,\s*\./g, '.')
    .replace(/\(\s*\)/g, '')
    .replace(/\n,\s*/g, '\n')
    .replace(/\s+\n/g, '\n')
}

function rewriteProviderConsumptionLanguage(
  prompt: string,
  refs: StillPromptBoundRef[]
): string {
  let result = prompt

  if (result.includes(WARDROBE_DIPTYCH_CONSUMPTION_INSTRUCTION)) {
    result = result.split(WARDROBE_DIPTYCH_CONSUMPTION_INSTRUCTION).join(
      'Each attached character photo supplies that person\'s face and clothes. Render one continuous scene.'
    )
  }

  if (result.includes(LOCATION_TURNAROUND_CONSUMPTION_INSTRUCTION)) {
    result = result.split(LOCATION_TURNAROUND_CONSUMPTION_INSTRUCTION).join(
      'LOCATION REFERENCE: Match architectural layout, furniture placement, color palette, and spatial geometry from the attached location photo. Render one unified cinematic frame.'
    )
  }

  if (result.includes(WARDROBE_TURNAROUND_CONSUMPTION_INSTRUCTION)) {
    result = result.split(WARDROBE_TURNAROUND_CONSUMPTION_INSTRUCTION).join(
      'COSTUME REFERENCE: Use the attached outfit photo for fabric, color, fit, and accessories only. Identity comes from the separate identity photo.'
    )
  }

  for (const ref of refs) {
    if (ref.kind !== 'person') continue
    const tokenIndex = parseTokenIndex(ref.token)
    const original = buildWardrobeDiptychCharacterConsumptionLine(ref.name, tokenIndex)
    const replacement =
      `${ref.name}: use the face from the attached ${ref.name} photo and the clothes from that same photo. Render one continuous scene.`
    result = result.split(original).join(replacement)
  }

  result = result.replace(
    /person \[\d+\] = ([^:\n]+): face\/identity from[^\n]+/gi,
    (_match, name: string) =>
      `${name.trim()}: face and clothes from the attached ${name.trim()} photo`
  )
  result = result.replace(
    /Each person \[\d+\] must use ONLY their paired identity and wardrobe reference images\./gi,
    'Each named character must use only their own attached identity and wardrobe photos.'
  )
  result = result.replace(
    /Each person \[\d+\] must match ONLY their paired refs\.[^\n]*/gi,
    'Each named character must match only their own attached photos. Never swap identity or wardrobe between people.'
  )

  return result
}

function dropReferencesSection(text: string): string {
  return text.replace(
    /\[REFERENCES\]\s*\n[\s\S]*?(?=\n\[(?:STILL|STYLE|EXCLUSIONS|SCENE COMPOSITION|GLOBAL STYLE)|$)/i,
    ''
  )
}

function injectBoundRefLines(text: string, refs: StillPromptBoundRef[]): string {
  const lines: string[] = []
  for (const ref of refs) {
    const name = ref.name.trim()
    if (!name) continue
    if (ref.kind === 'person' && ref.identityTraits?.trim()) {
      if (!text.toLowerCase().includes(ref.identityTraits.trim().toLowerCase())) {
        lines.push(`${name} — ${ref.identityTraits.trim()}`)
      }
      continue
    }
    if (!new RegExp(`\\b${escapeRegExp(name)}\\b`, 'i').test(text)) {
      lines.push(ref.roleLabel ? `${name} — ${ref.roleLabel}` : name)
    }
  }
  if (lines.length === 0) return text

  const block = lines.join('\n')
  if (text.includes(STILL_SECTION_STILL)) {
    return text.replace(STILL_SECTION_STILL, `${block}\n\n${STILL_SECTION_STILL}`)
  }
  return `${block}\n\n${text}`
}

function replaceUnboundLibraryTokens(text: string): string {
  return text.replace(TOKEN_PATTERN, (match) => {
    if (/^person /i.test(match)) return 'the subject'
    if (/^prop /i.test(match)) return 'the prop'
    return 'the location'
  })
}

function replaceReferenceImageMentions(
  text: string,
  bindings: ProviderImageBinding[]
): string {
  if (!text) return text
  const byIndex = new Map(bindings.map((binding) => [binding.sendIndex, binding.name]))
  const named = (index: number) => {
    const name = byIndex.get(index)
    return name ? `the attached ${name} photo` : 'the attached photo'
  }

  return text
    .replace(/\bReference image (\d+)\b/gi, (_match, raw: string) => named(Number(raw)))
    .replace(/\bRef(?:erence)?(?: image)? \[(\d+)\]/gi, (_match, raw: string) => named(Number(raw)))
    .replace(/\bRefs (\d+(?:\s*-\s*\d+)?(?:,\s*\d+)*)\b/gi, 'the attached photos')
    .replace(/\bRef (\d+)\b/gi, (_match, raw: string) => named(Number(raw)))
}

function freezeActionFramingLines(text: string): string {
  return text.replace(
    /((?:Action\/Framing|Prop handling|Blocking):\s*)([^\n]+)/gi,
    (_match, label: string, value: string) => `${label}${freezeStillActionToInstant(value)}`
  )
}

function reconcileStyleLens(text: string, shotType?: string): string {
  return text.replace(
    /((?:Lighting & Camera|Lens & Format):\s*)([^\n]+)/gi,
    (_match, label: string, value: string) =>
      `${label}${reconcileLensWithShotType(value, shotType)}`
  )
}

function injectSingleFrameLock(text: string): string {
  if (text.includes(SINGLE_FRAME_LOCK)) return text
  if (text.includes(STILL_SECTION_STILL)) {
    return text.replace(
      /(\[STILL\]\n[^\n]*)/,
      `$1\n${SINGLE_FRAME_LOCK}`
    )
  }
  return `${SINGLE_FRAME_LOCK}\n\n${text}`
}

function inferShotType(prompt: string, explicit?: string): string | undefined {
  if (explicit?.trim()) return explicit.trim()
  const action = prompt.match(/Action\/Framing:\s*([^\n]+)/i)?.[1] || prompt
  return action.match(INFERRED_SHOT_PATTERN)?.[0]
}

function shouldDropInsertLenses(shotType?: string): boolean {
  if (!shotType) return false
  if (INSERT_SHOT_PATTERN.test(shotType)) return false
  return NARRATIVE_SHOT_PATTERN.test(shotType)
}

function shouldDropWideLenses(shotType?: string): boolean {
  return Boolean(shotType && INSERT_SHOT_PATTERN.test(shotType))
}

function parseTokenIndex(token: string): number | undefined {
  const match = token.match(/\[(\d+)\]/)
  return match ? Number(match[1]) : undefined
}

function tidyClause(value: string): string {
  return value
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+,/g, ',')
    .replace(/,\s*,+/g, ', ')
    .replace(/^\s*,\s*/, '')
    .trim()
}

function collapseBlankLines(text: string): string {
  return text.replace(/\n{3,}/g, '\n\n')
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
