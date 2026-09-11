/**
 * Code-owned structured still prompt for beat/animatic frames.
 *
 * Planner and intelligence supply Action/Framing (and maybe style).
 * This module binds attached library images to person/prop/location tokens
 * and emits consistent section headers so Vertex does not get a run-on blob.
 */

import { BEAT_FRAME_CANDID_ACTION_CONSTRAINT } from '@/lib/character/characterReferenceAssembly'
import { buildIdentityPromptToken } from '@/lib/imagen/promptOptimizer'

export const STILL_SECTION_REFERENCES = '[REFERENCES]'
export const STILL_SECTION_STILL = '[STILL]'
export const STILL_SECTION_STYLE = '[STYLE]'
export const STILL_SECTION_EXCLUSIONS = '[EXCLUSIONS]'

export const STILL_PURPOSE_LINE =
  'Frozen animatic film still of this beat. Not a video start frame. No camera motion.'

export const DEFAULT_STILL_EXCLUSIONS =
  'Strictly Avoid: Mannequin geometry, plastic skin, cartoon style, 3D render aesthetics, canvas textures, turnaround sheet layout, 2x2 grid output, 4-panel layout, split-screen output, multi-panel layout, diptych, reference sheet collage, faceless figures, or artistic blending of reference mediums. Maintain 100% photographic realism when art style is photorealistic. No dialogue captions, subtitles, or watermarks (except centered title typography on title beats).'

export type StillPromptRefKind = 'person' | 'prop' | 'location'

export interface StillPromptBoundRef {
  kind: StillPromptRefKind
  token: string
  name: string
  roleLabel: string
}

export function buildPropPromptToken(sendIndex: number): string {
  return `prop [${sendIndex}]`
}

export function buildLocationPromptToken(sendIndex: number): string {
  return `location [${sendIndex}]`
}

/** Assign stable 1-based prop/location tokens independent of image send index. */
export function assignStableLibraryTokens<T extends { name?: string }>(
  items: T[],
  kind: 'prop' | 'location'
): Array<T & { promptToken: string }> {
  return items.map((item, index) => ({
    ...item,
    promptToken: kind === 'prop' ? buildPropPromptToken(index + 1) : buildLocationPromptToken(index + 1),
  }))
}

export function bindLibraryNamesToTokens(
  text: string,
  named: Array<{ name?: string; promptToken?: string }>
): string {
  if (!text) return text
  const refs: StillPromptBoundRef[] = named
    .filter((item): item is { name: string; promptToken: string } =>
      Boolean(item.name?.trim() && item.promptToken?.trim())
    )
    .map((item) => ({
      kind: item.promptToken.startsWith('location') ? 'location' : 'prop',
      token: item.promptToken,
      name: item.name,
      roleLabel: item.promptToken.startsWith('location') ? 'library location' : 'library prop',
    }))
  return replaceLibraryNamesWithTokens(text, refs)
}

export function joinPromptBlocks(...blocks: Array<string | false | null | undefined>): string {
  return blocks
    .map((block) => (typeof block === 'string' ? block.trim() : ''))
    .filter(Boolean)
    .join('\n\n')
}

function extractSection(text: string, header: RegExp, nextHeaders: RegExp): string {
  const match = text.match(header)
  if (!match || match.index == null) return ''
  const start = match.index + match[0].length
  const rest = text.slice(start)
  const next = rest.search(nextHeaders)
  return (next === -1 ? rest : rest.slice(0, next)).trim()
}

const NEXT_SECTION =
  /\[(?:REFERENCES|STILL|STYLE|EXCLUSIONS|GLOBAL STYLE ANCHOR|SCENE COMPOSITION\s*&\s*BEAT|EXCLUSIONS\s*&\s*BOUNDARIES)\]/i

/** Lines this module owns and re-emits, so they must never read back as action. */
const STILL_BOILERPLATE_LINES = [STILL_PURPOSE_LINE, BEAT_FRAME_CANDID_ACTION_CONSTRAINT]

/**
 * Recover the beat action from a `[STILL]` or `[SCENE COMPOSITION & BEAT]` body.
 *
 * An assembled still is persisted as the beat's stored prompt and read back on
 * the next generation, so parsing has to be the exact inverse of assembly.
 * Prompts stored before this was true carry one `Action/Framing:` wrapper per
 * regeneration around the code-owned purpose and candid lines; those layers are
 * unwrapped here rather than left for a human to clean up.
 */
export function extractActionFramingBody(section: string): string {
  if (!section) return ''

  const lines: string[] = []
  for (const rawLine of section.split('\n')) {
    if (!rawLine.trim()) {
      lines.push('')
      continue
    }

    let value = rawLine
    for (const boilerplate of STILL_BOILERPLATE_LINES) {
      value = value.split(boilerplate).join(' ')
    }

    let previous = ''
    while (previous !== value) {
      previous = value
      value = value.replace(/^\s*Action\/Framing:\s*/i, '')
    }

    const trimmed = value.trim()
    if (trimmed) lines.push(trimmed)
  }

  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

export function parseStillPromptSource(text: string): {
  actionFraming: string
  style: string
  exclusions: string
} {
  const trimmed = (text || '').trim()
  if (!trimmed) {
    return { actionFraming: '', style: '', exclusions: '' }
  }

  const composition = extractSection(
    trimmed,
    /\[SCENE COMPOSITION\s*&\s*BEAT\]/i,
    NEXT_SECTION
  )
  const globalStyle = extractSection(trimmed, /\[GLOBAL STYLE ANCHOR\]/i, NEXT_SECTION)
  const styleSection = extractSection(trimmed, /\[STYLE\]/i, NEXT_SECTION)
  const exclusionsBoundaries = extractSection(
    trimmed,
    /\[EXCLUSIONS\s*&\s*BOUNDARIES\]/i,
    NEXT_SECTION
  )
  const exclusionsSection = extractSection(trimmed, /\[EXCLUSIONS\]/i, NEXT_SECTION)
  const stillSection = extractSection(trimmed, /\[STILL\]/i, NEXT_SECTION)

  let actionFraming = extractActionFramingBody(composition || stillSection)

  if (!actionFraming) {
    const withoutSections = trimmed
      .replace(/\[REFERENCES\][\s\S]*?(?=\[STILL\]|\[STYLE\]|\[SCENE COMPOSITION|$)/i, '')
      .replace(/\[GLOBAL STYLE ANCHOR\][\s\S]*?(?=\[SCENE COMPOSITION|\[STILL\]|\[STYLE\]|$)/i, '')
      .replace(/\[EXCLUSIONS[^\]]*\][\s\S]*$/i, '')
      .replace(/^Subjects caught mid-action[^.]*\.\s*/i, '')
      .replace(/^Cinematic film still\.\s*/i, '')
      .replace(/person \[\d+\](?: and person \[\d+\])* performing the following moment in-scene[^:]*:\s*/i, '')
      .trim()
    actionFraming = extractActionFramingBody(withoutSections)
  }

  return {
    actionFraming,
    style: styleSection || globalStyle,
    exclusions: exclusionsSection || exclusionsBoundaries,
  }
}

/**
 * Does the prompt actually direct this library item?
 *
 * A reference image is consumed as an instruction. An attached prop that the
 * composition never mentions asks the model to place an object without saying
 * where, why, or who touches it — so it invents an answer. Props are matched
 * by bound token or by name, since the name is only rewritten to a token
 * during assembly.
 */
export function promptReferencesLibraryItem(
  prompt: string,
  item: { name?: string; promptToken?: string }
): boolean {
  const text = prompt || ''
  if (!text.trim()) return false

  const token = item.promptToken?.trim()
  if (token && text.includes(token)) return true

  const name = item.name?.trim()
  if (!name) return false
  return new RegExp(`\\b${escapeRegExp(name)}\\b`, 'i').test(text)
}

/**
 * Beat action from a stored prompt, whether that prompt is a full assembled
 * still or plain action text. Consumers (video prompts, seed prompts, re-runs)
 * want the beat, never the code-owned still boilerplate around it.
 */
export function actionFramingFromStoredPrompt(stored?: string | null): string {
  const text = stored?.trim()
  if (!text) return ''
  return parseStillPromptSource(text).actionFraming.trim()
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const NAME_TITLE_PATTERN =
  /^(?:dr|doctor|prof|professor|mr|mrs|ms|miss|sir|madam|capt|captain|officer|det|detective|sgt|sergeant|lt|lieutenant|col|colonel|gen|general|father|mother|sister|brother|rev|reverend|judge|mayor|president|king|queen|lord|lady|uncle|aunt)\.?$/i

/**
 * Shorter forms a script actually uses for a cast member — "Piper Hayes" is
 * written as "Piper", and "Professor Gideon Croft" as "Gideon". Without these
 * the composed action keeps display names instead of person tokens.
 */
function personNameAliases(name: string): string[] {
  const parts = name.split(/\s+/).filter(Boolean)
  const withoutTitles = parts.filter((part) => !NAME_TITLE_PATTERN.test(part))
  const aliases = new Set<string>()

  if (withoutTitles.length > 0 && withoutTitles.length !== parts.length) {
    aliases.add(withoutTitles.join(' '))
  }
  if (withoutTitles.length > 1) {
    aliases.add(withoutTitles[0])
    aliases.add(withoutTitles[withoutTitles.length - 1])
  }

  return [...aliases].filter(
    (alias) => alias.length >= 3 && alias.toLowerCase() !== name.toLowerCase()
  )
}

/** Ref names plus unambiguous person aliases, as name/token pairs. */
function bindableNameTokenPairs(
  refs: StillPromptBoundRef[]
): Array<{ name: string; token: string }> {
  const pairs = refs
    .filter((ref) => ref.name.trim())
    .map((ref) => ({ name: ref.name, token: ref.token }))

  const aliasOwners = new Map<string, Set<string>>()
  for (const ref of refs) {
    if (ref.kind !== 'person') continue
    for (const alias of personNameAliases(ref.name)) {
      const key = alias.toLowerCase()
      if (!aliasOwners.has(key)) aliasOwners.set(key, new Set())
      aliasOwners.get(key)!.add(ref.token)
    }
  }

  const reservedNames = new Set(refs.map((ref) => ref.name.toLowerCase()))
  const added = new Set<string>()
  for (const ref of refs) {
    if (ref.kind !== 'person') continue
    for (const alias of personNameAliases(ref.name)) {
      const key = alias.toLowerCase()
      // An alias shared by two cast members cannot be bound to either token.
      if (aliasOwners.get(key)?.size !== 1) continue
      if (reservedNames.has(key) || added.has(key)) continue
      added.add(key)
      pairs.push({ name: alias, token: ref.token })
    }
  }

  return pairs
}

/** Replace library names with bound tokens (longest names first). */
export function replaceLibraryNamesWithTokens(
  text: string,
  refs: StillPromptBoundRef[]
): string {
  if (!text || refs.length === 0) return text

  const sorted = bindableNameTokenPairs(refs).sort((a, b) => b.name.length - a.name.length)
  let result = text
  for (const pair of sorted) {
    const pattern = new RegExp(`\\b${escapeRegExp(pair.name)}\\b`, 'gi')
    result = result.replace(pattern, pair.token)
  }
  return result
}

export function formatStillReferencesLegend(refs: StillPromptBoundRef[]): string {
  if (refs.length === 0) return ''
  const lines = refs.map((ref) => `${ref.token} = ${ref.name} — ${ref.roleLabel}`)
  return `${STILL_SECTION_REFERENCES}\n${lines.join('\n')}`
}

export function stillRefsFromAttachedImages(args: {
  selected: Array<{
    sendIndex?: number
    propName?: string
    locationName?: string
    characterName?: string
    refRole?: string
    role?: string
    promptToken?: string
  }>
  characterReferences: Array<{
    name: string
    promptToken?: string
    subjectOrdinal?: number
  }>
}): StillPromptBoundRef[] {
  const refs: StillPromptBoundRef[] = []
  const seenPerson = new Set<string>()

  for (const entry of args.selected) {
    const sendIndex = entry.sendIndex
    if (entry.characterName && (entry.refRole === 'identity' || entry.refRole === 'wardrobe-diptych')) {
      if (seenPerson.has(entry.characterName)) continue
      seenPerson.add(entry.characterName)
      const char = args.characterReferences.find((c) => c.name === entry.characterName)
      const token =
        char?.promptToken ||
        (char?.subjectOrdinal != null
          ? buildIdentityPromptToken(char.subjectOrdinal)
          : sendIndex != null
            ? buildIdentityPromptToken(sendIndex)
            : '')
      if (!token) continue
      refs.push({
        kind: 'person',
        token,
        name: entry.characterName,
        roleLabel: 'identity',
      })
      continue
    }

    if (entry.propName && (entry.promptToken || sendIndex != null)) {
      refs.push({
        kind: 'prop',
        token: entry.promptToken || buildPropPromptToken(sendIndex as number),
        name: entry.propName,
        roleLabel: 'library prop',
      })
      continue
    }

    if ((entry.locationName || entry.role === 'location') && (entry.promptToken || sendIndex != null)) {
      refs.push({
        kind: 'location',
        token: entry.promptToken || buildLocationPromptToken(sendIndex as number),
        name: entry.locationName || 'Location',
        roleLabel: 'library location',
      })
    }
  }

  return refs
}

function styleAlreadyHasPhotoreal(style: string): boolean {
  return /photorealistic|live-action|live action|photographed on real camera/i.test(style)
}

/**
 * Fold caller exclusions into the section, skipping what is already stated.
 *
 * An assembled still is persisted and re-assembled, so the parsed section
 * already carries everything a previous pass added; the containment check is
 * what keeps re-assembly byte-stable.
 */
function mergeExclusions(base: string, extra?: string): string {
  const primary = base.trim()
  const addition = extra?.trim()
  if (!addition) return primary
  if (!primary) return addition
  if (primary.toLowerCase().includes(addition.toLowerCase())) return primary
  return `${primary}\n${addition}`
}

export function assembleStructuredStillPrompt(input: {
  actionOrStructured: string
  refs?: StillPromptBoundRef[]
  photorealisticAnchor?: string
  includeCandid?: boolean
  exclusions?: string
}): string {
  const refs = input.refs ?? []
  const parsed = parseStillPromptSource(input.actionOrStructured)
  const actionFraming = replaceLibraryNamesWithTokens(parsed.actionFraming, refs)

  const stillLines = [STILL_PURPOSE_LINE]
  if (input.includeCandid) {
    stillLines.push(BEAT_FRAME_CANDID_ACTION_CONSTRAINT)
  }
  if (actionFraming) {
    stillLines.push(`Action/Framing: ${actionFraming}`)
  }

  let style = parsed.style
  if (input.photorealisticAnchor && !styleAlreadyHasPhotoreal(style) && !styleAlreadyHasPhotoreal(actionFraming)) {
    style = joinPromptBlocks(style, input.photorealisticAnchor)
  }

  const exclusions = mergeExclusions(
    parsed.exclusions || DEFAULT_STILL_EXCLUSIONS,
    input.exclusions
  )

  return joinPromptBlocks(
    formatStillReferencesLegend(refs),
    `${STILL_SECTION_STILL}\n${stillLines.join('\n')}`,
    style ? `${STILL_SECTION_STYLE}\n${style}` : '',
    `${STILL_SECTION_EXCLUSIONS}\n${exclusions}`
  )
}
