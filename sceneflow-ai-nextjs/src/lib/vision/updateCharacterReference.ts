import type { CharacterWardrobe } from '@/types/vision'

export type CharacterLike = {
  id?: string
  name?: string
  referenceImage?: string
  wardrobes?: CharacterWardrobe[]
  defaultWardrobe?: string
  wardrobeAccessories?: string
  [key: string]: unknown
}

export const LEGACY_WARDROBE_ID = 'legacy-wardrobe'

/** Deterministic wardrobe ID used when materializing a legacy `defaultWardrobe` string. */
export function defaultCharacterWardrobeId(characterId: string): string {
  return `wardrobe-default-${characterId}`
}

export function isSyntheticDefaultWardrobeId(
  wardrobeId: string | undefined,
  characterId?: string
): boolean {
  if (!wardrobeId) return false
  if (wardrobeId === LEGACY_WARDROBE_ID) return true
  if (characterId && wardrobeId === defaultCharacterWardrobeId(characterId)) return true
  return wardrobeId.startsWith('wardrobe-default-')
}

/** Stable id for vision-phase characters (matches CharacterLibrary / vision page). */
export function resolveCharacterId(
  char: { id?: string | null } | null | undefined,
  index: number
): string {
  return char?.id || String(index)
}

/**
 * Patch one character in a list by id. Reads from the provided list (use charactersRef.current
 * in batch flows so prior referenceImage values are preserved).
 */
export function updateCharacterInList<T extends CharacterLike>(
  characters: T[],
  characterId: string,
  patch: Partial<T> | ((char: T) => T)
): T[] {
  return characters.map((char, index) => {
    const charId = resolveCharacterId(char, index)
    if (charId !== characterId) return char
    return typeof patch === 'function' ? patch(char) : { ...char, ...patch }
  })
}

/**
 * Patch character attributes by `characterId` (falling back to case-insensitive name match),
 * stripping `undefined` keys so unset fields never clobber existing `referenceImage`, `wardrobes`,
 * `voiceConfig`, `name`, or `description`.
 */
export function updateCharacterAttributesInList<T extends CharacterLike>(
  characters: T[],
  characterId: string,
  attributes: Record<string, unknown>
): T[] {
  const cleanAttributes: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(attributes || {})) {
    if (val !== undefined && key !== 'name') {
      cleanAttributes[key] = val
    }
  }

  const targetIndex = characters.findIndex(
    (char, idx) => resolveCharacterId(char, idx) === characterId
  )
  const fallbackName =
    typeof attributes?.name === 'string' && attributes.name.trim()
      ? attributes.name.trim().toLowerCase()
      : characterId.trim().toLowerCase()
  const resolvedIndex =
    targetIndex >= 0
      ? targetIndex
      : characters.findIndex(
          (char) => typeof char.name === 'string' && char.name.trim().toLowerCase() === fallbackName
        )

  if (resolvedIndex < 0) return characters

  return characters.map((char, idx) => {
    if (idx !== resolvedIndex) return char
    return {
      ...char,
      ...cleanAttributes,
      name: char.name,
      role: (cleanAttributes.role as T['role']) ?? char.role,
      description: (cleanAttributes.description as string | undefined) ?? char.description,
      referenceImage:
        (cleanAttributes.referenceImage as string | undefined) ?? char.referenceImage,
      wardrobes: (cleanAttributes.wardrobes as CharacterWardrobe[] | undefined) ?? char.wardrobes,
    }
  })
}

export interface CharacterWardrobeMutation {
  defaultWardrobe?: string
  wardrobeAccessories?: string
  wardrobeId?: string
  wardrobeName?: string
  previewImageUrl?: string
  headshotUrl?: string
  fullBodyUrl?: string
  combinedCharacterRefUrl?: string
  sceneNumbers?: number[]
  appearanceNotes?: string
  reason?: string
  needsImageRegen?: boolean
  generationPrompt?: string
  action?: 'add' | 'update' | 'delete'
}

function applyPatchToWardrobeEntry(
  existing: CharacterWardrobe,
  mutation: CharacterWardrobeMutation,
  resolvedId?: string
): CharacterWardrobe {
  return {
    ...existing,
    ...(resolvedId ? { id: resolvedId } : {}),
    ...(mutation.wardrobeName ? { name: mutation.wardrobeName } : {}),
    description: mutation.defaultWardrobe || existing.description,
    accessories:
      mutation.wardrobeAccessories !== undefined
        ? mutation.wardrobeAccessories || undefined
        : existing.accessories,
    ...(mutation.previewImageUrl ? { previewImageUrl: mutation.previewImageUrl } : {}),
    ...(mutation.headshotUrl ? { headshotUrl: mutation.headshotUrl } : {}),
    ...(mutation.fullBodyUrl
      ? { fullBodyUrl: mutation.fullBodyUrl, needsImageRegen: false }
      : {}),
    ...(mutation.combinedCharacterRefUrl
      ? { combinedCharacterRefUrl: mutation.combinedCharacterRefUrl }
      : mutation.fullBodyUrl || mutation.needsImageRegen === true
        ? { combinedCharacterRefUrl: undefined }
        : {}),
    ...(mutation.sceneNumbers ? { sceneNumbers: mutation.sceneNumbers } : {}),
    ...(mutation.appearanceNotes !== undefined
      ? { appearanceNotes: mutation.appearanceNotes || undefined }
      : {}),
    ...(mutation.reason ? { reason: mutation.reason } : {}),
    ...(mutation.needsImageRegen !== undefined
      ? { needsImageRegen: mutation.needsImageRegen }
      : {}),
    ...(mutation.generationPrompt !== undefined
      ? { generationPrompt: mutation.generationPrompt.trim() || undefined }
      : {}),
  }
}

/**
 * Pure wardrobe mutation helper for `handleUpdateCharacterWardrobe`.
 * Guarantees first-time wardrobe image generation saves even when the UI synthesized
 * `'legacy-wardrobe'` from `char.defaultWardrobe` or when `char.wardrobes` was empty.
 */
export function applyCharacterWardrobeMutation<T extends CharacterLike>(
  characters: T[],
  characterId: string,
  mutation: CharacterWardrobeMutation,
  nowMs: number = Date.now()
): T[] {
  const nowIso = new Date(nowMs).toISOString()

  return characters.map((char, index) => {
    const charId = resolveCharacterId(char, index)
    if (charId !== characterId) return char

    let wardrobes: CharacterWardrobe[] = Array.isArray(char.wardrobes) ? [...char.wardrobes] : []

    // Materialize legacy `defaultWardrobe` string into a deterministic default entry when empty
    if (
      wardrobes.length === 0 &&
      mutation.action !== 'add' &&
      mutation.action !== 'delete' &&
      (Boolean(char.defaultWardrobe) ||
        (Boolean(mutation.defaultWardrobe) &&
          (!mutation.wardrobeId || isSyntheticDefaultWardrobeId(mutation.wardrobeId, charId))))
    ) {
      const legacyDescription = String(char.defaultWardrobe || mutation.defaultWardrobe || '').trim()
      const legacyAccessories = String(
        char.wardrobeAccessories || mutation.wardrobeAccessories || ''
      ).trim()
      if (legacyDescription) {
        wardrobes = [
          {
            id: defaultCharacterWardrobeId(charId),
            name: mutation.wardrobeName || 'Default Outfit',
            description: legacyDescription,
            ...(legacyAccessories ? { accessories: legacyAccessories } : {}),
            isDefault: true,
            createdAt: nowIso,
          },
        ]
      }
    }

    if (mutation.action === 'add' && mutation.wardrobeName && mutation.defaultWardrobe) {
      const newWardrobe: CharacterWardrobe = {
        id: `wardrobe-${nowMs}`,
        name: mutation.wardrobeName,
        description: mutation.defaultWardrobe,
        accessories: mutation.wardrobeAccessories,
        sceneNumbers: mutation.sceneNumbers,
        appearanceNotes: mutation.appearanceNotes,
        reason: mutation.reason,
        isDefault: wardrobes.length === 0,
        createdAt: nowIso,
      }
      wardrobes = [...wardrobes, newWardrobe]
    } else if (mutation.action === 'update' && mutation.wardrobeId) {
      const exactIdx = wardrobes.findIndex((w) => w.id === mutation.wardrobeId)
      if (exactIdx >= 0) {
        const nextId =
          mutation.wardrobeId === LEGACY_WARDROBE_ID
            ? defaultCharacterWardrobeId(charId)
            : undefined
        wardrobes = wardrobes.map((w, i) =>
          i === exactIdx ? applyPatchToWardrobeEntry(w, mutation, nextId) : w
        )
      } else if (
        isSyntheticDefaultWardrobeId(mutation.wardrobeId, charId) &&
        wardrobes.length > 0
      ) {
        const defaultIdx = wardrobes.findIndex((w) => w.isDefault)
        const targetIdx = defaultIdx >= 0 ? defaultIdx : 0
        const target = wardrobes[targetIdx]!
        const nextId =
          target.id === LEGACY_WARDROBE_ID ? defaultCharacterWardrobeId(charId) : target.id
        wardrobes = wardrobes.map((w, i) =>
          i === targetIdx ? applyPatchToWardrobeEntry(w, mutation, nextId) : w
        )
      } else {
        // Upsert so generated media is never silently dropped if `wardrobeId` was missing
        const upsertedId =
          mutation.wardrobeId === LEGACY_WARDROBE_ID
            ? defaultCharacterWardrobeId(charId)
            : mutation.wardrobeId
        const baseEntry: CharacterWardrobe = {
          id: upsertedId,
          name: mutation.wardrobeName || (wardrobes.length === 0 ? 'Default Outfit' : 'Outfit'),
          description:
            mutation.defaultWardrobe ||
            (typeof char.defaultWardrobe === 'string' ? char.defaultWardrobe : ''),
          accessories:
            mutation.wardrobeAccessories ||
            (typeof char.wardrobeAccessories === 'string' ? char.wardrobeAccessories : undefined),
          isDefault: wardrobes.length === 0,
          createdAt: nowIso,
        }
        wardrobes = [...wardrobes, applyPatchToWardrobeEntry(baseEntry, mutation, upsertedId)]
      }
    } else if (mutation.action === 'delete' && mutation.wardrobeId) {
      wardrobes = wardrobes.filter((w) => {
        if (w.id === mutation.wardrobeId) return false
        if (
          isSyntheticDefaultWardrobeId(mutation.wardrobeId, charId) &&
          isSyntheticDefaultWardrobeId(w.id, charId)
        ) {
          return false
        }
        return true
      })
    } else if (!mutation.action) {
      const firstWardrobe = wardrobes[0]
      if (firstWardrobe) {
        wardrobes = wardrobes.map((w, idx) =>
          idx === 0
            ? {
                ...w,
                description: mutation.defaultWardrobe || w.description,
                accessories: mutation.wardrobeAccessories || w.accessories,
              }
            : w
        )
      } else if (mutation.defaultWardrobe) {
        wardrobes = [
          {
            id: defaultCharacterWardrobeId(charId),
            name: 'Default Outfit',
            description: mutation.defaultWardrobe,
            accessories: mutation.wardrobeAccessories,
            isDefault: true,
            createdAt: nowIso,
          },
        ]
      }
    }

    const firstWardrobe = wardrobes[0]
    return {
      ...char,
      wardrobes,
      defaultWardrobe: firstWardrobe?.description,
      wardrobeAccessories: firstWardrobe?.accessories,
    }
  })
}

export function applyBatchWardrobeSuggestions<T extends CharacterLike>(
  characters: T[],
  characterId: string,
  suggestions: Array<{
    name: string
    description: string
    accessories?: string
    sceneNumbers: number[]
    appearanceNotes?: string
    reason: string
  }>,
  nowMs: number = Date.now()
): T[] {
  const nowIso = new Date(nowMs).toISOString()

  return characters.map((char, index) => {
    const charId = resolveCharacterId(char, index)
    if (charId !== characterId) return char

    const existingWardrobes = Array.isArray(char.wardrobes) ? char.wardrobes : []
    const existingByName = new Map(
      existingWardrobes
        .filter((w) => w?.name)
        .map((w) => [w.name.trim().toLowerCase(), w])
    )

    const newWardrobes: CharacterWardrobe[] = suggestions.map((w, idx) => {
      const matched =
        existingByName.get(w.name.trim().toLowerCase()) ||
        (idx === 0 && existingWardrobes.length === 1 && existingWardrobes[0]?.isDefault
          ? existingWardrobes[0]
          : undefined)
      const sameDesc =
        matched &&
        (matched.description || '').trim().toLowerCase() === (w.description || '').trim().toLowerCase()

      return {
        ...(matched
          ? {
              previewImageUrl: matched.previewImageUrl,
              headshotUrl: matched.headshotUrl,
              fullBodyUrl: matched.fullBodyUrl,
              combinedCharacterRefUrl: sameDesc ? matched.combinedCharacterRefUrl : undefined,
              needsImageRegen:
                Boolean(matched.fullBodyUrl || matched.headshotUrl) && !sameDesc
                  ? true
                  : Boolean(matched.needsImageRegen),
              generationPrompt: sameDesc ? matched.generationPrompt : undefined,
              klingElementId: sameDesc ? matched.klingElementId : undefined,
            }
          : {}),
        id: matched?.id || `wardrobe-${nowMs}-${idx}`,
        name: w.name,
        description: w.description,
        accessories: w.accessories,
        sceneNumbers: w.sceneNumbers,
        appearanceNotes: w.appearanceNotes,
        reason: w.reason,
        isDefault: idx === 0,
        createdAt: matched?.createdAt || nowIso,
      }
    })

    const firstWardrobe = newWardrobes[0]
    return {
      ...char,
      wardrobes: newWardrobes,
      defaultWardrobe: firstWardrobe?.description,
      wardrobeAccessories: firstWardrobe?.accessories,
    }
  })
}

export type PickMediaUrlFn = (incoming: unknown, existing: unknown) => string | undefined

const defaultPickMediaUrl: PickMediaUrlFn = (incoming, existing) => {
  if (typeof incoming === 'string' && incoming.trim().length > 0) return incoming
  if (typeof existing === 'string' && existing.trim().length > 0) return existing
  return undefined
}

function mergeCharacterWardrobesForPut(
  existingWardrobes: unknown,
  incomingWardrobes: unknown,
  incomingDefaultWardrobe: unknown,
  pickMediaUrl: PickMediaUrlFn
): unknown {
  if (!Array.isArray(incomingWardrobes)) {
    return Array.isArray(existingWardrobes) ? existingWardrobes : incomingWardrobes
  }
  if (!Array.isArray(existingWardrobes) || existingWardrobes.length === 0) {
    return incomingWardrobes
  }
  // Distinguish stale unmigrated client (`wardrobes: []`, `defaultWardrobe: '...'`)
  // from intentional deletion of all wardrobes (`wardrobes: []`, `defaultWardrobe: undefined`)
  if (
    incomingWardrobes.length === 0 &&
    typeof incomingDefaultWardrobe === 'string' &&
    incomingDefaultWardrobe.trim().length > 0
  ) {
    return existingWardrobes
  }

  const existingTyped = existingWardrobes.filter(
    (w): w is Record<string, unknown> => Boolean(w && typeof w === 'object')
  )
  const existingById = new Map<string, Record<string, unknown>>()
  let existingDefault: Record<string, unknown> | undefined
  for (const w of existingTyped) {
    if (typeof w.id === 'string' && w.id) existingById.set(w.id, w)
    if (w.isDefault && !existingDefault) existingDefault = w
  }
  if (!existingDefault && existingTyped.length === 1) {
    existingDefault = existingTyped[0]
  }

  return incomingWardrobes.map((inc) => {
    if (!inc || typeof inc !== 'object') return inc
    const incRec = inc as Record<string, unknown>
    const incId = typeof incRec.id === 'string' ? incRec.id : undefined
    const extRec =
      (incId ? existingById.get(incId) : undefined) ||
      (incId && isSyntheticDefaultWardrobeId(incId) ? existingDefault : undefined) ||
      (incRec.isDefault && existingDefault && isSyntheticDefaultWardrobeId(String(existingDefault.id ?? ''))
        ? existingDefault
        : undefined)

    if (!extRec) return inc

    const mergedFullBodyUrl = pickMediaUrl(incRec.fullBodyUrl, extRec.fullBodyUrl)
    const fullBodyChanged =
      typeof incRec.fullBodyUrl === 'string' &&
      Boolean(incRec.fullBodyUrl.trim()) &&
      typeof extRec.fullBodyUrl === 'string' &&
      Boolean(extRec.fullBodyUrl.trim()) &&
      incRec.fullBodyUrl.trim() !== extRec.fullBodyUrl.trim()
    const shouldDropStaleCombined =
      incRec.needsImageRegen === true ||
      (fullBodyChanged && !incRec.combinedCharacterRefUrl)

    return {
      ...extRec,
      ...incRec,
      fullBodyUrl: mergedFullBodyUrl,
      headshotUrl: pickMediaUrl(incRec.headshotUrl, extRec.headshotUrl),
      previewImageUrl: pickMediaUrl(incRec.previewImageUrl, extRec.previewImageUrl),
      combinedCharacterRefUrl: shouldDropStaleCombined
        ? (typeof incRec.combinedCharacterRefUrl === 'string'
            ? incRec.combinedCharacterRefUrl
            : undefined)
        : pickMediaUrl(incRec.combinedCharacterRefUrl, extRec.combinedCharacterRefUrl),
    }
  })
}

/**
 * Server-side character merge for `PUT /api/projects/[id]`.
 * Matches by `id` first, then case-insensitive `name`, preserving `referenceImage`,
 * `voiceConfig`, and nested `wardrobes` media URLs across stale client writes and renames.
 */
export function mergeVisionPhaseCharactersForPut(
  existingCharacters: any[],
  incomingCharacters: any[],
  pickMediaUrl: PickMediaUrlFn = defaultPickMediaUrl
): any[] {
  const existingList = Array.isArray(existingCharacters) ? existingCharacters : []
  const incomingList = Array.isArray(incomingCharacters) ? incomingCharacters : []

  const existingById = new Map<string, any>()
  const existingByName = new Map<string, any>()
  for (const c of existingList) {
    if (!c || typeof c !== 'object') continue
    if (typeof c.id === 'string' && c.id) existingById.set(c.id, c)
    if (typeof c.name === 'string' && c.name.trim()) {
      existingByName.set(c.name.trim().toLowerCase(), c)
    }
  }

  const matchedExistingSet = new Set<any>()

  const mergedCharacters = incomingList.map((incomingChar: any) => {
    if (!incomingChar || typeof incomingChar !== 'object') return incomingChar
    const byId =
      typeof incomingChar.id === 'string' && incomingChar.id
        ? existingById.get(incomingChar.id)
        : undefined
    const byName =
      typeof incomingChar.name === 'string' && incomingChar.name.trim()
        ? existingByName.get(incomingChar.name.trim().toLowerCase())
        : undefined
    const existingChar = byId || byName
    if (!existingChar) return incomingChar

    matchedExistingSet.add(existingChar)

    return {
      ...existingChar,
      ...incomingChar,
      referenceImage: pickMediaUrl(incomingChar.referenceImage, existingChar.referenceImage),
      voiceConfig: incomingChar.voiceConfig ?? existingChar.voiceConfig,
      appearanceDescription:
        incomingChar.appearanceDescription ?? existingChar.appearanceDescription,
      visionDescription: incomingChar.visionDescription ?? existingChar.visionDescription,
      imageApproved: incomingChar.imageApproved ?? existingChar.imageApproved,
      defaultWardrobe: incomingChar.defaultWardrobe ?? existingChar.defaultWardrobe,
      wardrobeAccessories:
        incomingChar.wardrobeAccessories ?? existingChar.wardrobeAccessories,
      wardrobes: mergeCharacterWardrobesForPut(
        existingChar.wardrobes,
        incomingChar.wardrobes,
        incomingChar.defaultWardrobe,
        pickMediaUrl
      ),
    }
  })

  const preservedCharacters = existingList.filter(
    (existingChar: any) => existingChar && !matchedExistingSet.has(existingChar)
  )

  return [...mergedCharacters, ...preservedCharacters]
}
