/**
 * Synonym object names are one physical prop. Library creation used to treat
 * "Thirty-Inch Iron Rail Spanner" and "Spud wrench" as different rows; frame
 * generation then attached every fuzzy hit. Clustering uses the same fuzzy
 * matcher Direct already uses, plus a tiny head-noun family so wrench/spanner
 * collapse even without a bridging "spanner wrench" label.
 */

import { libraryNamesFuzzyMatch } from '@/lib/character/matching'
import { mentionsWord, propHeadNoun } from '@/lib/script/propNameMatch'
import { isAlreadyInLibrary, normalizeObjectName } from '@/lib/vision/objectBeatUsage'

/**
 * Head nouns that name the same kind of tool. Only these families cluster
 * two labels that share no overlapping distinctive words. Keep this list
 * tiny — loose pairs (gun/pistol) over-merge distinct props.
 */
const PROP_HEAD_SYNONYM_FAMILIES: string[][] = [
  ['wrench', 'spanner', 'spud'],
]

const PROP_HEAD_SYNONYM_FAMILY = new Map<string, string>(
  PROP_HEAD_SYNONYM_FAMILIES.flatMap((family) =>
    family.map((head) => [head, family[0]] as const)
  )
)

function singularizeHead(token: string): string {
  if (token.length <= 3) return token
  if (token.endsWith('ies')) return `${token.slice(0, -3)}y`
  if (/(?:s|x|z|ch|sh)es$/.test(token)) return token.slice(0, -2)
  if (token.endsWith('s') && !token.endsWith('ss')) return token.slice(0, -1)
  return token
}

function synonymFamily(name: string): string | undefined {
  const head = singularizeHead(propHeadNoun(name))
  return head ? PROP_HEAD_SYNONYM_FAMILY.get(head) : undefined
}

function synonymHeadsMatch(a: string, b: string): boolean {
  const familyA = synonymFamily(a)
  const familyB = synonymFamily(b)
  return Boolean(familyA && familyB && familyA === familyB)
}

/** True when two labels refer to the same physical library object. */
export function objectNamesMatch(a: string, b: string): boolean {
  const left = String(a ?? '').trim()
  const right = String(b ?? '').trim()
  if (!left || !right) return false
  if (libraryNamesFuzzyMatch(left, right) || libraryNamesFuzzyMatch(right, left)) return true
  if (isAlreadyInLibrary(left, [right]) || isAlreadyInLibrary(right, [left])) return true
  return synonymHeadsMatch(left, right)
}

/** True when `name` is already represented in the library under any synonym. */
export function nameMatchesLibrary(name: string, existingNames: string[]): boolean {
  return existingNames.some((existing) => objectNamesMatch(name, existing))
}

function clusterItems<T>(items: T[], same: (a: T, b: T) => boolean): T[][] {
  const parent = items.map((_, index) => index)
  const find = (index: number): number => {
    let cursor = index
    while (parent[cursor] !== cursor) {
      parent[cursor] = parent[parent[cursor]]
      cursor = parent[cursor]
    }
    return cursor
  }
  const union = (i: number, j: number) => {
    const rootI = find(i)
    const rootJ = find(j)
    if (rootI !== rootJ) parent[rootI] = rootJ
  }

  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      if (same(items[i], items[j])) union(i, j)
    }
  }

  const groups = new Map<number, T[]>()
  items.forEach((item, index) => {
    const root = find(index)
    const group = groups.get(root)
    if (group) group.push(item)
    else groups.set(root, [item])
  })
  return [...groups.values()]
}

/** Cluster distinct spellings; exact normalized duplicates collapse first. */
export function clusterObjectNames(names: string[]): string[][] {
  const richest = new Map<string, string>()
  for (const raw of names) {
    const name = String(raw ?? '').trim()
    const key = normalizeObjectName(name)
    if (!key) continue
    const existing = richest.get(key)
    if (!existing || name.length > existing.length) richest.set(key, name)
  }
  return clusterItems([...richest.values()], objectNamesMatch)
}

export function clusterByObjectName<T extends { name?: string }>(items: T[]): T[][] {
  const named = items.filter((item) => String(item.name ?? '').trim())
  return clusterItems(named, (a, b) => objectNamesMatch(a.name ?? '', b.name ?? ''))
}

function modifierWords(name: string): string[] {
  const head = singularizeHead(propHeadNoun(name))
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
 * Keep one row per cluster. Beat prose, when provided, prefers the label the
 * frame actually names; otherwise an imaged row, then the richest spelling.
 */
export function pickCanonicalObject<T extends { name?: string; imageUrl?: string }>(
  cluster: T[],
  beatText?: string
): T {
  if (cluster.length === 1) return cluster[0]
  const scored = cluster.map((item, index) => {
    const name = item.name ?? ''
    const head = singularizeHead(propHeadNoun(name))
    const modifiers = modifierWords(name)
    const proseHits = beatText
      ? [
          ...modifiers.filter((word) => mentionsWord(beatText, word)),
          ...(head && mentionsWord(beatText, head) ? [head] : []),
        ]
      : []
    return {
      item,
      index,
      proseScore: proseHits.length,
      hasImage: Boolean(item.imageUrl?.trim()),
      distinctiveness: modifiers.length,
      nameLength: name.length,
    }
  })
  scored.sort((a, b) => {
    if (beatText && b.proseScore !== a.proseScore) return b.proseScore - a.proseScore
    if (a.hasImage !== b.hasImage) return a.hasImage ? -1 : 1
    if (!beatText && b.distinctiveness !== a.distinctiveness) {
      return b.distinctiveness - a.distinctiveness
    }
    if (!beatText && b.nameLength !== a.nameLength) return b.nameLength - a.nameLength
    return a.index - b.index
  })
  return scored[0].item
}

export function pickCanonicalName(names: string[]): string {
  const cluster = names.map((name) => ({ name }))
  return pickCanonicalObject(cluster).name ?? names[0]
}

/** One canonical name per synonym cluster, richest spelling first. */
export function uniqueCanonicalNames(names: string[]): string[] {
  return clusterObjectNames(names).map((cluster) => pickCanonicalName(cluster))
}

/**
 * New library rows: skip anything that already matches the catalog, then one
 * row per remaining synonym cluster.
 */
export function selectCanonicalNewObjects<T extends { name: string }>(
  candidates: T[],
  existingNames: string[]
): T[] {
  const novel = candidates.filter((item) => !nameMatchesLibrary(item.name, existingNames))
  return clusterByObjectName(novel).map((cluster) => pickCanonicalObject(cluster))
}

export function collapseObjectClusters<T extends { name?: string; imageUrl?: string }>(
  objects: T[],
  beatText?: string
): T[] {
  return clusterByObjectName(objects).map((cluster) => pickCanonicalObject(cluster, beatText))
}

export function duplicateObjectGroups<T extends { name?: string }>(items: T[]): T[][] {
  return clusterByObjectName(items).filter((group) => group.length > 1)
}

export function rewriteKeyProps(
  keyProps: string[],
  duplicateNames: string[],
  keeperName: string
): string[] {
  const aliases = [...duplicateNames, keeperName]
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of keyProps) {
    if (typeof raw !== 'string' || !raw.trim()) continue
    const replaced = aliases.some((alias) => objectNamesMatch(raw, alias))
      ? keeperName
      : raw
    const key = normalizeObjectName(replaced)
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(replaced)
  }
  return out
}

export function rewriteObjectRefIds(
  ids: string[],
  duplicateIds: string[],
  keeperId: string
): string[] {
  const dropped = new Set(duplicateIds)
  const seen = new Set<string>()
  const out: string[] = []
  for (const id of ids) {
    const next = dropped.has(id) ? keeperId : id
    if (!next || seen.has(next)) continue
    seen.add(next)
    out.push(next)
  }
  return out
}

function rewriteBeatForObjectMerge(
  beat: Record<string, unknown>,
  keeper: { id: string; name: string },
  duplicateNames: string[],
  duplicateIds: string[]
): Record<string, unknown> {
  const next = { ...beat }
  const direction = beat.beatDirection
  if (direction && typeof direction === 'object') {
    const keyProps = (direction as { keyProps?: unknown }).keyProps
    if (Array.isArray(keyProps)) {
      next.beatDirection = {
        ...(direction as Record<string, unknown>),
        keyProps: rewriteKeyProps(keyProps.map(String), duplicateNames, keeper.name),
      }
    }
  }
  const selection = beat.referenceSelection
  if (selection && typeof selection === 'object') {
    const objectRefIds = (selection as { objectRefIds?: unknown }).objectRefIds
    if (Array.isArray(objectRefIds)) {
      next.referenceSelection = {
        ...(selection as Record<string, unknown>),
        objectRefIds: rewriteObjectRefIds(objectRefIds.map(String), duplicateIds, keeper.id),
      }
    }
  }
  return next
}

/** Rewrite scene/beat keyProps and saved objectRefIds onto the kept row. */
export function rewriteScenesForObjectMerge<T>(
  scenes: T[],
  keeper: { id: string; name: string },
  duplicates: Array<{ id: string; name: string }>
): T[] {
  if (!Array.isArray(scenes) || duplicates.length === 0) return scenes
  const duplicateNames = duplicates.map((row) => row.name)
  const duplicateIds = duplicates.map((row) => row.id)

  return scenes.map((scene) => {
    if (!scene || typeof scene !== 'object') return scene
    const record = scene as Record<string, unknown>
    const next: Record<string, unknown> = { ...record }

    const sceneDirection = record.sceneDirection
    if (sceneDirection && typeof sceneDirection === 'object') {
      const direction = sceneDirection as Record<string, unknown>
      const sceneBlock = direction.scene
      if (sceneBlock && typeof sceneBlock === 'object') {
        const keyProps = (sceneBlock as { keyProps?: unknown }).keyProps
        if (Array.isArray(keyProps)) {
          next.sceneDirection = {
            ...direction,
            scene: {
              ...(sceneBlock as Record<string, unknown>),
              keyProps: rewriteKeyProps(keyProps.map(String), duplicateNames, keeper.name),
            },
          }
        }
      }
    }

    if (Array.isArray(record.beats)) {
      next.beats = record.beats.map((beat) =>
        beat && typeof beat === 'object'
          ? rewriteBeatForObjectMerge(
              beat as Record<string, unknown>,
              keeper,
              duplicateNames,
              duplicateIds
            )
          : beat
      )
    }

    return next as T
  })
}

export function mergeObjectRows<T extends { id: string; imageUrl?: string; generationPrompt?: string }>(
  objects: T[],
  primaryId: string,
  duplicateIds: string[]
): T[] {
  const primary = objects.find((row) => row.id === primaryId)
  if (!primary) return objects
  const dupes = objects.filter((row) => duplicateIds.includes(row.id))
  let merged = { ...primary }
  if (!merged.imageUrl?.trim()) {
    const donor = dupes.find((row) => row.imageUrl?.trim())
    if (donor) {
      merged = {
        ...merged,
        imageUrl: donor.imageUrl,
        generationPrompt: donor.generationPrompt ?? merged.generationPrompt,
      }
    }
  }
  const dropped = new Set(duplicateIds)
  return objects
    .filter((row) => !dropped.has(row.id))
    .map((row) => (row.id === primaryId ? merged : row))
}
