/**
 * Code-owned structured still prompt for beat/animatic frames.
 *
 * Planner and intelligence supply Action/Framing (and maybe style).
 * This module binds attached library images to person/prop/location tokens
 * and emits consistent section headers so Vertex does not get a run-on blob.
 */

import {
  BEAT_FRAME_CANDID_ACTION_CONSTRAINT,
  LEGACY_BEAT_FRAME_CANDID_ACTION_CONSTRAINTS,
  isWideEstablishingShotType,
} from '@/lib/character/characterReferenceAssembly'
import { isDetailShot, isInsertOrExtremeCloseUp } from '@/lib/imagen/stillFramingNormalize'
import { buildIdentityTraitsClause } from '@/lib/imagen/identityTraitsClause'
import { buildIdentityPromptToken } from '@/lib/imagen/promptOptimizer'
import {
  mentionsWord,
  propHeadNoun,
  propSignificantWords,
} from '@/lib/script/propNameMatch'
import {
  clusterByObjectName,
  nameMatchesLibrary,
  pickCanonicalObject,
} from '@/lib/vision/objectDuplicateClusters'
import {
  enrichActionFramingWithCastPerformance,
  formatExclusionParagraph,
  recoverLeakedActionFromExclusions,
} from '@/lib/scene/castPerformanceFraming'

export const STILL_SECTION_REFERENCES = '[REFERENCES]'
export const STILL_SECTION_TASK = '[TASK]'
export const STILL_SECTION_STILL = '[STILL]'
export const STILL_SECTION_STYLE = '[STYLE]'
export const STILL_SECTION_EXCLUSIONS = '[EXCLUSIONS]'

export const STILL_PURPOSE_LINE =
  'Cinematic live-action film still of this beat, photographed on 35mm. Unbroken single-camera frame, unified 16:9 cinematic perspective. Not a video start frame. No camera motion.'

export const STILL_WIDE_SPATIAL_LINE =
  'Continuous wide shot — one unified 16:9 cinematic perspective.'

/**
 * Earlier purpose/task wordings that still live on stored beat prompts.
 *
 * Assembly re-emits the current lines; parse has to strip the literals a
 * previous build wrote, or "Frozen animatic" leaks back into Action/Framing
 * and fights the photoreal style block all over again.
 */
export const LEGACY_STILL_PURPOSE_LINES = [
  'Frozen animatic film still of this beat. Not a video start frame. No camera motion.',
  'Cinematic live-action film still of this beat, photographed on 35mm. Not a video start frame. No camera motion.',
] as const

export const LEGACY_STILL_TASK_LINES = [
  'Each subject has one head, two arms and two legs, each in exactly one position. Never duplicate, blur, streak or repeat a limb to imply movement.',
] as const

/**
 * The job, stated before the content it applies to.
 *
 * A beat arrives described as a span of time — "impacts the floor, tumbling out
 * of the fog and curling into a fetal position" — and a model handed three
 * successive positions for one exposure renders them superimposed: a body off
 * the floor with a spare arm (production 2026-09-12). `[EXCLUSIONS]` already
 * names "multiple limbs" and "physically impossible anatomy" and did not
 * prevent it, because a negative cannot outvote a positive instruction that
 * asks for movement. So the instruction to pick one instant has to be positive,
 * and it has to come before the beat text rather than after it.
 *
 * The anatomy line is affirmative on purpose. "Never duplicate a limb" primed
 * Flash toward the anomaly it was trying to forbid (production 2026-09-15).
 */
export const STILL_TASK_INSTANT_LINES = [
  'Produce one photograph of a single instant — a 1/500s exposure, everything in it simultaneous.',
  'Choose the most legible instant of the described action and render only that instant: the settled pose a viewer reads the whole action from, not the movement that produced it.',
] as const

export const STILL_TASK_FULL_BODY_LINES = [
  'Each subject has one head, two arms and two legs, each in exactly one settled pose, with anatomically distinct silhouettes.',
  'A body in contact with a surface rests on it with its full weight, in contact along its length, with a matching contact shadow.',
] as const

export const STILL_TASK_INSERT_FRAMING_LINE =
  'Tight macro framing; only the specified limb/hand enters the composition.'

export const STILL_TASK_TOKEN_LINE =
  `Every token listed in ${STILL_SECTION_REFERENCES} appears in this frame and matches its reference image.`

export const STILL_TASK_DETAIL_TOKEN_LINE =
  `Every person and prop token listed in ${STILL_SECTION_REFERENCES} appears in this frame and matches its reference image. Location is ambient lighting and color in shallow-focus background bokeh, not a second subject.`

/**
 * Shot-aware TASK body. Insert/ECU replace full-body anatomy with limb framing.
 * Title/credit inserts skip the limb line so typography can be the subject.
 */
export function stillTaskLines(
  shotType?: string | null,
  options?: { allowTypography?: boolean }
): string[] {
  const lines: string[] = [...STILL_TASK_INSTANT_LINES]
  if (isInsertOrExtremeCloseUp(shotType) && !options?.allowTypography) {
    lines.push(STILL_TASK_INSERT_FRAMING_LINE)
  } else if (!isInsertOrExtremeCloseUp(shotType)) {
    lines.push(...STILL_TASK_FULL_BODY_LINES)
  }
  lines.push(
    isDetailShot(shotType) && !options?.allowTypography
      ? STILL_TASK_DETAIL_TOKEN_LINE
      : STILL_TASK_TOKEN_LINE
  )
  return lines
}

export const STILL_TASK_LINES = stillTaskLines()

export const DEFAULT_STILL_QUALITY_EXCLUSIONS =
  'Strictly Avoid: Mannequin geometry, plastic skin, cartoon style, 3D render aesthetics, canvas textures, faceless figures, extra limbs, deformed anatomy. Maintain 100% photographic realism when art style is photorealistic.'

export const DEFAULT_STILL_TEXT_EXCLUSIONS =
  'No dialogue captions, subtitles, or watermarks (except centered title typography on title beats).'

export const DEFAULT_STILL_EXCLUSIONS =
  `${DEFAULT_STILL_QUALITY_EXCLUSIONS} ${DEFAULT_STILL_TEXT_EXCLUSIONS}`

function defaultStillExclusions(allowTypography?: boolean): string {
  return allowTypography ? DEFAULT_STILL_QUALITY_EXCLUSIONS : DEFAULT_STILL_EXCLUSIONS
}

function stripTypographyExclusionLanguage(text: string): string {
  return text
    .replace(/\s*\(except centered title typography on title beats\)\.?/gi, '')
    .replace(/\bNo dialogue captions, subtitles, or watermarks\.?/gi, '')
    .replace(/\btext overlay\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+\./g, '.')
    .trim()
}

export type StillPromptRefKind = 'person' | 'prop' | 'location'

export interface StillPromptBoundRef {
  kind: StillPromptRefKind
  token: string
  name: string
  roleLabel: string
  /** Short observable traits, stated here and nowhere else in the prompt. */
  identityTraits?: string
  /** Wardrobe/fabric/fit clause, folded into the same person line. */
  wardrobeClause?: string
  /** 1-based send index of the identity portrait or identity+wardrobe composite. */
  identitySendIndex?: number
  /** 1-based send index of a separate wardrobe image, when dual refs remain. */
  wardrobeSendIndex?: number
  /** True when identity and wardrobe share one composite/diptych slot. */
  isComposite?: boolean
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

/** Keep extra still lines inside [STILL], not after [EXCLUSIONS]. */
export function injectBeforeStyleOrExclusions(prompt: string, block: string): string {
  const insertion = block.trim()
  if (!insertion) return prompt
  if (prompt.includes(insertion)) return prompt
  if (/\[STYLE\]/i.test(prompt)) {
    return prompt.replace(/\[STYLE\]/i, `${insertion}\n\n[STYLE]`)
  }
  if (/\[EXCLUSIONS/i.test(prompt)) {
    return prompt.replace(/\[EXCLUSIONS[^\]]*\]/i, `${insertion}\n\n$&`)
  }
  return joinPromptBlocks(prompt, insertion)
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
  /\[(?:REFERENCES|TASK|STILL|STYLE|EXCLUSIONS|GLOBAL STYLE ANCHOR|SCENE COMPOSITION\s*&\s*BEAT|EXCLUSIONS\s*&\s*BOUNDARIES)\]/i

/** Lines this module owns and re-emits, so they must never read back as action. */
const STILL_BOILERPLATE_LINES = [
  STILL_PURPOSE_LINE,
  STILL_WIDE_SPATIAL_LINE,
  ...LEGACY_STILL_PURPOSE_LINES,
  BEAT_FRAME_CANDID_ACTION_CONSTRAINT,
  ...LEGACY_BEAT_FRAME_CANDID_ACTION_CONSTRAINTS,
  ...STILL_TASK_LINES,
  STILL_TASK_INSERT_FRAMING_LINE,
  STILL_TASK_DETAIL_TOKEN_LINE,
  ...LEGACY_STILL_TASK_LINES,
]

/** Prefixes of code-owned lines whose tail varies with the beat's references. */
const STILL_BOILERPLATE_PREFIXES = [/^Also in frame:/i]

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
    if (!trimmed) continue
    if (STILL_BOILERPLATE_PREFIXES.some((prefix) => prefix.test(trimmed))) continue
    lines.push(trimmed)
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
      .replace(/\[REFERENCES\][\s\S]*?(?=\[TASK\]|\[STILL\]|\[STYLE\]|\[SCENE COMPOSITION|$)/i, '')
      .replace(/\[TASK\][\s\S]*?(?=\[STILL\]|\[STYLE\]|\[SCENE COMPOSITION|$)/i, '')
      .replace(/\[GLOBAL STYLE ANCHOR\][\s\S]*?(?=\[SCENE COMPOSITION|\[STILL\]|\[STYLE\]|$)/i, '')
      .replace(/\[EXCLUSIONS[^\]]*\][\s\S]*$/i, '')
      .replace(/^Subjects (?:caught mid-action|absorbed in the action)[^.]*\.\s*/i, '')
      .replace(/^Cinematic film still\.\s*/i, '')
      .replace(/person \[\d+\](?: and person \[\d+\])* performing the following moment in-scene[^:]*:\s*/i, '')
      .trim()
    actionFraming = extractActionFramingBody(withoutSections)
  }

  const recovered = recoverLeakedActionFromExclusions(
    exclusionsSection || exclusionsBoundaries
  )
  if (recovered.leakedAction) {
    actionFraming = enrichActionFramingWithCastPerformance({
      actionFraming: [actionFraming, recovered.leakedAction].filter(Boolean).join(' '),
      castNames: [],
    })
  }

  return {
    actionFraming,
    style: styleSection || globalStyle,
    exclusions: recovered.exclusions,
  }
}

const STRUCTURED_SECTION_HEADER =
  /\[(?:REFERENCES|TASK|STILL|GLOBAL STYLE ANCHOR|SCENE COMPOSITION\s*&\s*BEAT)\]/i

/**
 * Is this prompt already written in section form?
 *
 * `optimizePromptForImagen` rewrites prose into its own template: it prepends
 * "Create an image about …", strips the shot language a beat planner wrote, and
 * collapses the text to a single line. Run over a sectioned prompt that buries
 * the headers mid-sentence, and `parseStillPromptSource` can no longer find
 * Action/Framing — so a caller that already composed sections must be handed
 * straight to assembly. A header alone is not enough: a style-only stub has
 * nothing for assembly to work with and is better off re-optimized.
 */
export function isStructuredStillPrompt(text: string): boolean {
  const trimmed = (text || '').trim()
  if (!trimmed) return false
  if (!STRUCTURED_SECTION_HEADER.test(trimmed)) return false
  return Boolean(parseStillPromptSource(trimmed).actionFraming)
}

/** How a prompt turned out to reference a library item, for logging. */
export type LibraryItemMatchBasis = 'token' | 'name' | 'head-noun' | 'full-overlap' | 'none'

export interface LibraryItemPromptMatch {
  matched: boolean
  basis: LibraryItemMatchBasis
  /** The term the prompt actually used, so a log can name it. */
  matchedTerm?: string
}

/**
 * Does the prompt actually direct this library item, and on what evidence?
 *
 * A reference image is consumed as an instruction. An attached prop the
 * composition never mentions asks the model to place an object without saying
 * where, why, or who touches it — so it invents an answer. But the reverse cut
 * just as deep: a composed frame writes props the way a script does ("the
 * spanner"), not the way a prop catalog does ("Thirty-Inch Iron Rail Spanner"),
 * and demanding the full label dropped references for props the frame is built
 * around. The object's own noun settles it either way.
 */
export function resolveLibraryItemPromptMatch(
  prompt: string,
  item: { name?: string; promptToken?: string }
): LibraryItemPromptMatch {
  const text = prompt || ''
  if (!text.trim()) return { matched: false, basis: 'none' }

  const token = item.promptToken?.trim()
  if (token && text.includes(token)) {
    return { matched: true, basis: 'token', matchedTerm: token }
  }

  const name = item.name?.trim()
  if (!name) return { matched: false, basis: 'none' }
  if (new RegExp(`\\b${escapeRegExp(name)}\\b`, 'i').test(text)) {
    return { matched: true, basis: 'name', matchedTerm: name }
  }

  const head = propHeadNoun(name)
  if (head && mentionsWord(text, head)) {
    return { matched: true, basis: 'head-noun', matchedTerm: head }
  }

  // Every identifying word, in some other order or phrasing.
  const words = propSignificantWords(name)
  if (words.length > 1 && words.every((word) => mentionsWord(text, word))) {
    return { matched: true, basis: 'full-overlap', matchedTerm: words.join(' ') }
  }

  return { matched: false, basis: 'none' }
}

export function promptReferencesLibraryItem(
  prompt: string,
  item: { name?: string; promptToken?: string }
): boolean {
  return resolveLibraryItemPromptMatch(prompt, item).matched
}

/** Match library items against Action/Framing only — not [REFERENCES] or mapping copy. */
export function actionFramingForLibraryMatch(prompt: string): string {
  const action = parseStillPromptSource(prompt).actionFraming.trim()
  return action || prompt
}

function propsUsedInAction(
  refs: StillPromptBoundRef[],
  actionFraming: string
): StillPromptBoundRef[] {
  return refs.filter((ref) => {
    if (ref.kind !== 'prop') return true
    return promptReferencesLibraryItem(actionFraming, {
      name: ref.name,
      promptToken: ref.token,
    })
  })
}

/**
 * Thin out library labels that describe the same physical object.
 *
 * The head-noun rule is what keeps a reference attached when a frame writes
 * "the spanner" for a "Thirty-Inch Iron Rail Spanner". But a library holding
 * several similar objects — cylinders that share a noun, or wrench/spanner
 * synonyms — matches all of them from one mention, so a beat spent several
 * reference slots on contradictory designs of one object.
 *
 * The prose decides which one: whichever label has the most of its own
 * describing words in the text. A group where none of them do is a genuine tie,
 * and the first is kept so the object still has exactly one design.
 * Labels the frame named in full stay; those are distinct props on purpose.
 */
export function dropDuplicateHeadNounMatches<T extends { name?: string }>(
  prompt: string,
  matched: Array<{ item: T; match: LibraryItemPromptMatch }>
): { kept: T[]; dropped: Array<{ item: T; keptInstead: string }> } {
  const kept: T[] = []
  const dropped: Array<{ item: T; keptInstead: string }> = []

  const fullyNamed = matched.filter((entry) => entry.match.basis === 'name')
  const namedItems = fullyNamed.map((entry) => entry.item)
  const namedNames = namedItems.map((item) => item.name ?? '').filter(Boolean)
  kept.push(...namedItems)

  const rest = matched.filter((entry) => entry.match.basis !== 'name')
  const synonymOfNamed: T[] = []
  const clusterable: T[] = []
  for (const entry of rest) {
    if (nameMatchesLibrary(entry.item.name ?? '', namedNames)) {
      synonymOfNamed.push(entry.item)
    } else {
      clusterable.push(entry.item)
    }
  }

  for (const item of synonymOfNamed) {
    const keptInstead =
      namedItems.find((named) => nameMatchesLibrary(item.name ?? '', [named.name ?? '']))?.name ?? ''
    dropped.push({ item, keptInstead })
  }

  for (const cluster of clusterByObjectName(clusterable)) {
    if (cluster.length === 1) {
      kept.push(cluster[0])
      continue
    }
    const winner = pickCanonicalObject(cluster, prompt)
    kept.push(winner)
    for (const item of cluster) {
      if (item === winner) continue
      dropped.push({ item, keptInstead: winner.name ?? '' })
    }
  }

  return { kept, dropped }
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

/** Label words long enough to identify a prop, minus the object's own noun. */
function propModifierWords(name: string, head: string): string[] {
  return [
    ...new Set(
      name
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((word) => word.length >= 4 && word !== head)
    ),
  ]
}

/**
 * Patterns for props the frame names its own way.
 *
 * A prop catalog and a beat rarely agree on the middle word: the library holds
 * "Olive-drab aluminum cylinder" and the frame writes "Olive-drab dispatch
 * cylinder", so exact-name binding leaves `prop [6]` unused and the attached
 * image instructs nothing (production 2026-09-12).
 *
 * A modifier only anchors a pattern when no other ref with the same head noun
 * carries it. Three near-identical cylinders in one legend is exactly where a
 * loose bind would attach the wrong image, so "brass" — shared by two of them —
 * binds nothing, while "olive" binds only the one prop that owns it.
 */
function propAliasPatterns(
  refs: StillPromptBoundRef[]
): Array<{ name: string; token: string; pattern: RegExp }> {
  const props = refs
    .filter((ref) => ref.kind === 'prop' && ref.name.trim())
    .map((ref) => {
      const head = propHeadNoun(ref.name)
      return { ref, head, modifiers: propModifierWords(ref.name, head) }
    })
    .filter((entry) => entry.head && entry.modifiers.length > 0)

  const modifierOwners = new Map<string, Set<string>>()
  for (const entry of props) {
    for (const modifier of entry.modifiers) {
      const key = `${entry.head}|${modifier}`
      if (!modifierOwners.has(key)) modifierOwners.set(key, new Set())
      modifierOwners.get(key)!.add(entry.ref.token)
    }
  }

  const patterns: Array<{ name: string; token: string; pattern: RegExp }> = []
  for (const entry of props) {
    for (const modifier of entry.modifiers) {
      if (modifierOwners.get(`${entry.head}|${modifier}`)?.size !== 1) continue
      patterns.push({
        name: `${modifier} ${entry.head}`,
        token: entry.ref.token,
        // Up to three words of the frame's own wording between the two anchors.
        pattern: new RegExp(
          `\\b${escapeRegExp(modifier)}(?:[-\\s]\\w+){0,3}[-\\s]${escapeRegExp(entry.head)}s?\\b`,
          'gi'
        ),
      })
    }
  }

  return patterns
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

/**
 * Replace library names with bound tokens (longest names first).
 *
 * Full labels and person aliases go first: they are the exact thing the library
 * recorded, so anything they match is settled before the looser prop patterns
 * get a turn. Those patterns cannot then re-match, because the text already
 * holds a token where the name used to be.
 */
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

  for (const alias of propAliasPatterns(refs).sort((a, b) => b.name.length - a.name.length)) {
    result = result.replace(alias.pattern, alias.token)
  }
  return result
}

/**
 * Name references the action text never uses, so the legend is not dead weight.
 *
 * A reference image is consumed as an instruction, and a token that appears
 * only in `[REFERENCES]` instructs nothing — the model is handed a picture of a
 * cylinder and left to decide whether it is in the frame at all. Two things
 * produce that state and both shipped: prose that names a prop differently from
 * the library ("Olive-drab dispatch cylinder" against a library "Olive-drab
 * aluminum cylinder"), and location refs, whose token composed action almost
 * never mentions by name.
 *
 * Stating them keeps the legend honest without the caller having to rewrite the
 * beat. Props and people also warn, because for those a missing token usually
 * means a name mismatch worth fixing upstream.
 */
export function formatUnboundRefsInFrameLine(
  refs: StillPromptBoundRef[],
  actionFraming: string,
  shotType?: string | null
): string {
  const unbound = refs.filter((ref) => {
    if (actionFraming.includes(ref.token)) return false
    // Detail shots consume location as bokeh, not a second subject.
    if (ref.kind === 'location' && isDetailShot(shotType)) return false
    return true
  })
  if (unbound.length === 0) return ''

  const mismatched = unbound.filter((ref) => ref.kind !== 'location')
  if (mismatched.length > 0) {
    console.warn(
      `[Still Prompt] Action text never uses ${mismatched
        .map((ref) => `${ref.token} (${ref.name})`)
        .join(', ')}; stated as in-frame instead — check the beat names these the way the library does`
    )
  }

  const tokens = unbound.map((ref) => ref.token).join(', ')
  return unbound.length === 1
    ? `Also in frame: ${tokens} — match it to its reference image.`
    : `Also in frame: ${tokens} — match each to its reference image.`
}

export function formatWardrobeLegendClause(description?: string | null): string | undefined {
  const trimmed = (description || '').trim()
  if (!trimmed) return undefined
  const withoutWearing = trimmed.replace(/^wearing\s+/i, '').replace(/\s+/g, ' ').trim()
  if (!withoutWearing) return undefined
  const first = withoutWearing.split(/[.!?]/)[0]?.trim() || withoutWearing
  const words = first.split(/\s+/).filter(Boolean).slice(0, 18)
  return words.length > 0 ? words.join(' ') : undefined
}

/**
 * Bind a person token to the attached image(s) the model actually received.
 *
 * Action text uses `person [N]` only. Without this line the request never says
 * that token is Gideon Croft, or which Reference image is the face. Retry lock
 * already uses `person [N] (Name)`; the first pass has to as well.
 */
export function formatPersonReferenceLegendLine(ref: StillPromptBoundRef): string {
  const named = `${ref.token} (${ref.name})`
  const identityIdx = ref.identitySendIndex
  const wardrobeIdx = ref.wardrobeSendIndex

  const subjectParts = [named]
  if (ref.identityTraits) subjectParts.push(ref.identityTraits)
  if (ref.wardrobeClause) subjectParts.push(`wearing ${ref.wardrobeClause}`)
  const subject = subjectParts.join(', ')

  let match: string
  if (ref.isComposite && identityIdx != null) {
    match = `matches Reference image ${identityIdx}`
  } else if (identityIdx != null && wardrobeIdx != null) {
    match = `matches Reference image ${identityIdx} (Identity) and Reference image ${wardrobeIdx} (Wardrobe)`
  } else if (identityIdx != null) {
    match = `matches Reference image ${identityIdx} (Identity)`
  } else {
    match = 'matches its identity reference'
  }

  return `${subject} — ${match}`
}

export function formatStillReferencesLegend(
  refs: StillPromptBoundRef[],
  shotType?: string | null
): string {
  if (refs.length === 0) return ''
  const lines = refs.map((ref) => {
    if (ref.kind === 'person') return formatPersonReferenceLegendLine(ref)
    const entry = `${ref.token} = ${ref.name} — ${ref.roleLabel}`
    if (ref.kind === 'location' && isDetailShot(shotType)) {
      return `${entry}: match ambient lighting tone and color palette in shallow-focus background bokeh`
    }
    return ref.identityTraits ? `${entry}: ${ref.identityTraits}` : entry
  })
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
    appearanceDescription?: string | null
    visionDescription?: string | null
    hairStyle?: string
    hairColor?: string
    wardrobeDescription?: string | null
    defaultWardrobe?: string | null
  }>
  /** Widened on a likeness retry, where the short legend clause already failed. */
  identityTraitsWordCap?: number
}): StillPromptBoundRef[] {
  const refs: StillPromptBoundRef[] = []
  const seenPerson = new Set<string>()
  const personSlots = new Map<
    string,
    { identitySendIndex?: number; wardrobeSendIndex?: number; isComposite: boolean }
  >()

  for (const entry of args.selected) {
    if (!entry.characterName) continue
    const slot = personSlots.get(entry.characterName) ?? {
      identitySendIndex: undefined,
      wardrobeSendIndex: undefined,
      isComposite: false,
    }
    if (entry.refRole === 'wardrobe-diptych') {
      slot.identitySendIndex = entry.sendIndex
      slot.isComposite = true
    } else if (entry.refRole === 'identity') {
      slot.identitySendIndex = entry.sendIndex
    } else if (entry.refRole === 'wardrobe') {
      slot.wardrobeSendIndex = entry.sendIndex
    }
    personSlots.set(entry.characterName, slot)
  }

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
      const slot = personSlots.get(entry.characterName)
      refs.push({
        kind: 'person',
        token,
        name: entry.characterName,
        roleLabel: slot?.isComposite ? 'character reference' : 'identity',
        identityTraits: char
          ? buildIdentityTraitsClause({ ...char, wordCap: args.identityTraitsWordCap })
          : undefined,
        wardrobeClause: char
          ? formatWardrobeLegendClause(char.wardrobeDescription || char.defaultWardrobe)
          : undefined,
        identitySendIndex: slot?.identitySendIndex,
        wardrobeSendIndex: slot?.isComposite ? undefined : slot?.wardrobeSendIndex,
        isComposite: slot?.isComposite,
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
  const recoveredBase = recoverLeakedActionFromExclusions(base)
  const recoveredExtra = recoverLeakedActionFromExclusions(extra ?? '')
  const primary = formatExclusionParagraph(recoveredBase.exclusions)
  const addition = formatExclusionParagraph(recoveredExtra.exclusions)
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
  shotType?: string
  allowTypography?: boolean
}): string {
  const parsed = parseStillPromptSource(input.actionOrStructured)
  const tokenizedAction = replaceLibraryNamesWithTokens(parsed.actionFraming, input.refs ?? [])
  const actionFraming = enrichActionFramingWithCastPerformance({
    actionFraming: tokenizedAction,
    castNames: [],
    shotType: input.shotType,
  })
  const refs = propsUsedInAction(input.refs ?? [], actionFraming)

  const stillLines = [STILL_PURPOSE_LINE]
  if (isWideEstablishingShotType(input.shotType)) {
    stillLines.push(STILL_WIDE_SPATIAL_LINE)
  }
  if (input.includeCandid) {
    stillLines.push(BEAT_FRAME_CANDID_ACTION_CONSTRAINT)
  }
  if (actionFraming) {
    stillLines.push(`Action/Framing: ${actionFraming}`)
  }
  const inFrameLine = formatUnboundRefsInFrameLine(refs, actionFraming, input.shotType)
  if (inFrameLine) {
    stillLines.push(inFrameLine)
  }

  let style = parsed.style
  if (input.photorealisticAnchor && !styleAlreadyHasPhotoreal(style) && !styleAlreadyHasPhotoreal(actionFraming)) {
    style = joinPromptBlocks(style, input.photorealisticAnchor)
  }

  const mergedExclusions = mergeExclusions(
    parsed.exclusions || defaultStillExclusions(input.allowTypography),
    input.exclusions
  )
  const exclusions = input.allowTypography
    ? stripTypographyExclusionLanguage(mergedExclusions)
    : mergedExclusions

  return joinPromptBlocks(
    formatStillReferencesLegend(refs, input.shotType),
    `${STILL_SECTION_TASK}\n${stillTaskLines(input.shotType, {
      allowTypography: input.allowTypography,
    }).join('\n')}`,
    `${STILL_SECTION_STILL}\n${stillLines.join('\n')}`,
    style ? `${STILL_SECTION_STYLE}\n${style}` : '',
    `${STILL_SECTION_EXCLUSIONS}\n${exclusions}`
  )
}
