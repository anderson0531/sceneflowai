/**
 * Which objects the script actually touches, counted per beat.
 *
 * Object suggestions used to be filtered on scene numbers the LLM reported
 * from memory, so an object could be called recurring on the strength of one
 * mention, and a prop genuinely handled in nine beats of one scene could be
 * dropped as "single-scene". Beats are the unit that gets rendered, so beats
 * are the unit that decides whether an object needs a locked-down reference.
 *
 * The counter reads the structured `beatDirection.keyProps` tags first and
 * falls back to the beat's own prose, so it works on scripts generated before
 * per-beat direction existed.
 */

/** An object handled in this many distinct beats needs a reference image. */
export const MIN_BEATS_FOR_LIBRARY = 2

export interface ObjectBeatRef {
  /** 1-based scene number as displayed to the user. */
  sceneNumber: number
  /** 0-based index of the beat within its scene. */
  beatIndex: number
  beatId?: string
  /** True when the match came from a `beatDirection.keyProps` tag, not prose. */
  tagged: boolean
}

export interface ObjectBeatUsage {
  /** Normalized match key — stable across casing, punctuation, and articles. */
  key: string
  /** Display name, taken from the richest spelling seen. */
  name: string
  beatRefs: ObjectBeatRef[]
  beatCount: number
  sceneNumbers: number[]
  /** True when at least one beat tags this object in `beatDirection.keyProps`. */
  tagged: boolean
}

export interface ObjectUsageScene {
  sceneNumber?: number
  scene_number?: number
  beats?: unknown
}

const ARTICLES = new Set(['a', 'an', 'the'])

/**
 * Nouns too common to identify an object on their own. A name ending in one of
 * these still matches on its full form; it just cannot match on the bare noun.
 */
const GENERIC_NOUNS = new Set([
  'body',
  'ceiling',
  'chair',
  'door',
  'edge',
  'eye',
  'face',
  'floor',
  'hand',
  'head',
  'item',
  'light',
  'object',
  'piece',
  'room',
  'set',
  'side',
  'table',
  'thing',
  'wall',
  'window',
])

/** Lowercase, drop possessives and punctuation, collapse whitespace. */
export function normalizeObjectName(raw: string): string {
  return String(raw ?? '')
    .toLowerCase()
    .replace(/[\u2018\u2019']s\b/g, '')
    .replace(/[\u2018\u2019']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function significantTokens(normalized: string): string[] {
  return normalized.split(' ').filter((token) => token && !ARTICLES.has(token))
}

/** Reduce a head noun to its singular stem so "schematics" also finds "schematic". */
function singularize(token: string): string {
  if (token.length <= 3) return token
  if (token.endsWith('ies')) return `${token.slice(0, -3)}y`
  if (/(?:s|x|z|ch|sh)es$/.test(token)) return token.slice(0, -2)
  if (token.endsWith('s') && !token.endsWith('ss')) return token.slice(0, -1)
  return token
}

/** Singular stem of the term's head noun, so the matcher's `s?` covers both. */
function stemTerm(term: string): string {
  const parts = term.split(' ')
  parts[parts.length - 1] = singularize(parts[parts.length - 1])
  return parts.join(' ')
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Forms of a name worth searching for: the whole name, its trailing noun
 * phrase, and — when distinctive enough — its bare head noun, because beats
 * write "the journal" where the library says "1893 Water-Damaged Journal".
 */
export function buildObjectMatchTerms(name: string): string[] {
  const normalized = normalizeObjectName(name)
  const tokens = significantTokens(normalized)
  if (tokens.length === 0) return []

  const terms = new Set<string>([stemTerm(tokens.join(' '))])
  if (tokens.length >= 3) {
    terms.add(stemTerm(tokens.slice(-2).join(' ')))
  }
  const head = singularize(tokens[tokens.length - 1])
  if (tokens.length >= 2 && head.length >= 4 && !GENERIC_NOUNS.has(head)) {
    terms.add(head)
  }
  return [...terms]
}

function buildMatcher(name: string): RegExp | null {
  const terms = buildObjectMatchTerms(name)
  if (terms.length === 0) return null
  const alternation = terms
    .sort((a, b) => b.length - a.length)
    .map((term) => `${escapeRegExp(term)}(?:e?s)?`)
    .join('|')
  return new RegExp(`(?:^| )(?:${alternation})(?= |$)`)
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : undefined
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function keyPropStrings(beat: Record<string, unknown>): string[] {
  const direction = asRecord(beat.beatDirection)
  const keyProps = direction?.keyProps
  if (!Array.isArray(keyProps)) return []
  return keyProps.map((entry) => asString(entry)).filter(Boolean)
}

/** Prose a beat controls itself. Scene-wide blocking is excluded on purpose:
 *  it repeats across a run of beats and would inflate every count. */
function beatProse(beat: Record<string, unknown>): string {
  const direction = asRecord(beat.beatDirection)
  return [
    asString(beat.actionDescription),
    asString(beat.line),
    asString(beat.overlayText),
    asString(direction?.frozenMoment),
    asString(direction?.propInteraction),
  ]
    .filter(Boolean)
    .join(' ')
}

function sceneBeatRecords(scene: ObjectUsageScene): Record<string, unknown>[] {
  return Array.isArray(scene?.beats)
    ? (scene.beats as unknown[]).map(asRecord).filter((b): b is Record<string, unknown> => !!b)
    : []
}

function sceneNumberOf(scene: ObjectUsageScene, index: number): number {
  return scene?.sceneNumber ?? scene?.scene_number ?? index + 1
}

/**
 * A scene reduced to the fields the counter reads, so the client can post
 * beats to the suggestion route without shipping storyboard URLs and audio.
 */
export function slimSceneForObjectUsage(
  scene: ObjectUsageScene,
  index: number
): Required<Pick<ObjectUsageScene, 'sceneNumber'>> & { beats: Record<string, unknown>[] } {
  return {
    sceneNumber: sceneNumberOf(scene, index),
    beats: sceneBeatRecords(scene).map((beat) => {
      const direction = asRecord(beat.beatDirection)
      return {
        beatId: asString(beat.beatId) || undefined,
        actionDescription: asString(beat.actionDescription) || undefined,
        line: asString(beat.line) || undefined,
        overlayText: asString(beat.overlayText) || undefined,
        beatDirection: direction
          ? {
              keyProps: keyPropStrings(beat),
              frozenMoment: asString(direction.frozenMoment) || undefined,
              propInteraction: asString(direction.propInteraction) || undefined,
            }
          : undefined,
      }
    }),
  }
}

/**
 * Every object name the script's beats tag in `beatDirection.keyProps`,
 * deduplicated by normalized form and keeping the richest spelling.
 */
export function harvestKeyPropNames(scenes: ObjectUsageScene[]): string[] {
  const byKey = new Map<string, string>()
  for (const scene of scenes ?? []) {
    for (const beat of sceneBeatRecords(scene)) {
      for (const raw of keyPropStrings(beat)) {
        const name = raw.trim()
        const key = normalizeObjectName(name)
        if (!key) continue
        const existing = byKey.get(key)
        if (!existing || name.length > existing.length) byKey.set(key, name)
      }
    }
  }
  return [...byKey.values()]
}

/**
 * Count the distinct beats that reference each name.
 *
 * With no `names`, the tagged key props are used as the candidate set, which
 * makes recurrence detection a pure read of the script — no model call.
 */
export function countObjectBeatReferences(
  scenes: ObjectUsageScene[],
  names?: string[]
): ObjectBeatUsage[] {
  const candidates = names && names.length > 0 ? names : harvestKeyPropNames(scenes)
  const usageByKey = new Map<string, ObjectBeatUsage>()
  const matchers: Array<{ usage: ObjectBeatUsage; matcher: RegExp }> = []

  for (const candidate of candidates) {
    const name = String(candidate ?? '').trim()
    const key = normalizeObjectName(name)
    if (!key || usageByKey.has(key)) continue
    const matcher = buildMatcher(name)
    if (!matcher) continue
    const usage: ObjectBeatUsage = {
      key,
      name,
      beatRefs: [],
      beatCount: 0,
      sceneNumbers: [],
      tagged: false,
    }
    usageByKey.set(key, usage)
    matchers.push({ usage, matcher })
  }

  if (matchers.length === 0) return []

  ;(scenes ?? []).forEach((scene, sceneIndex) => {
    const sceneNumber = sceneNumberOf(scene, sceneIndex)
    sceneBeatRecords(scene).forEach((beat, beatIndex) => {
      // Tags are matched one at a time so a term cannot straddle two entries.
      const taggedTexts = keyPropStrings(beat).map((tag) => ` ${normalizeObjectName(tag)} `)
      const proseText = ` ${normalizeObjectName(beatProse(beat))} `
      for (const { usage, matcher } of matchers) {
        const inTags = taggedTexts.some((text) => matcher.test(text))
        if (!inTags && !matcher.test(proseText)) continue
        usage.beatRefs.push({
          sceneNumber,
          beatIndex,
          beatId: asString(beat.beatId) || undefined,
          tagged: inTags,
        })
        if (inTags) usage.tagged = true
      }
    })
  })

  const usages = [...usageByKey.values()]
  for (const usage of usages) {
    usage.beatCount = usage.beatRefs.length
    usage.sceneNumbers = [...new Set(usage.beatRefs.map((ref) => ref.sceneNumber))].sort(
      (a, b) => a - b
    )
  }

  return usages.sort((a, b) => b.beatCount - a.beatCount || a.name.localeCompare(b.name))
}

/** Objects handled in enough beats that an unreferenced look would show. */
export function selectRecurringObjects(
  usages: ObjectBeatUsage[],
  minBeats: number = MIN_BEATS_FOR_LIBRARY
): ObjectBeatUsage[] {
  return usages.filter((usage) => usage.beatCount >= minBeats)
}

/** Match names against an existing library so nothing is proposed twice. */
export function isAlreadyInLibrary(name: string, existingNames: string[]): boolean {
  const key = normalizeObjectName(name)
  if (!key) return false
  const matcher = buildMatcher(name)
  return existingNames.some((existing) => {
    const existingKey = normalizeObjectName(existing)
    if (!existingKey) return false
    if (existingKey === key) return true
    return matcher ? matcher.test(` ${existingKey} `) : false
  })
}
