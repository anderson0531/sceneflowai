export type CharacterLike = {
  id?: string
  name?: string
  referenceImage?: string
  [key: string]: unknown
}

/** Stable id for vision-phase characters (matches CharacterLibrary / vision page). */
export function resolveCharacterId(char: CharacterLike, index: number): string {
  return char.id ?? String(index)
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
