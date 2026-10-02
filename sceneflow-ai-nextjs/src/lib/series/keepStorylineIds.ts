import { toCanonicalName } from '@/lib/character/canonical'

function sameName(a?: string, b?: string): boolean {
  const left = toCanonicalName(a || '')
  const right = toCanonicalName(b || '')
  return Boolean(left) && left === right
}

function nonempty(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined
}

/**
 * Keep an existing bible id when the model returns a new one for the same
 * location. Match returned id, then name, then list position.
 */
export function keepLocationIds(
  existing: Array<{ id?: string; name?: string }> | undefined,
  incoming: Array<Record<string, unknown>>
) {
  return incoming.map((location, index) => {
    const returnedId = typeof location.id === 'string' ? location.id : ''
    const name = typeof location.name === 'string' ? location.name : ''
    const prior =
      existing?.find((item) => item.id && item.id === returnedId) ||
      existing?.find((item) => item.name && sameName(item.name, name)) ||
      existing?.[index]
    const knownReturned = Boolean(returnedId && existing?.some((item) => item.id === returnedId))
    return {
      ...(prior || {}),
      ...location,
      id: knownReturned ? returnedId : prior?.id || returnedId || `loc_${index + 1}`,
    }
  })
}

/**
 * Keep the series character id, portrait, voice, and wardrobes when Series
 * Director rewrites the cast. Match returned id, then name, then list position.
 */
export function keepCharacterIds<T extends { id?: string; name?: string; referenceImageUrl?: string; voiceId?: string; wardrobes?: unknown[] }>(
  existing: T[] | undefined,
  incoming: Array<Record<string, unknown>>
): T[] {
  const used = new Set<string>()
  return incoming.map((character, index) => {
    const returnedId = typeof character.id === 'string' ? character.id : ''
    const name = typeof character.name === 'string' ? character.name : ''
    const prior =
      existing?.find((item) => item.id && item.id === returnedId && !used.has(item.id)) ||
      existing?.find((item) => item.id && item.name && sameName(item.name, name) && !used.has(item.id)) ||
      (existing?.[index]?.id && !used.has(existing[index].id!) ? existing[index] : undefined)
    if (prior?.id) used.add(prior.id)
    const knownReturned = Boolean(returnedId && existing?.some((item) => item.id === returnedId))
    const incomingWardrobes = Array.isArray(character.wardrobes) ? character.wardrobes : undefined
    return {
      ...(prior || {}),
      ...character,
      id: knownReturned ? returnedId : prior?.id || returnedId || `char_${index + 1}`,
      referenceImageUrl: nonempty(character.referenceImageUrl) || prior?.referenceImageUrl,
      voiceId: nonempty(character.voiceId) || prior?.voiceId,
      wardrobes: incomingWardrobes?.length ? incomingWardrobes : prior?.wardrobes,
    } as T
  })
}
