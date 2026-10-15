/** Resolve an episode character id to the series library name, role, and description. */

export function resolveFeaturedCharacter(
  episodeCharacter: { characterId?: string; role?: string },
  library: Array<{ id: string; name?: string; role?: string; description?: string }> | undefined
): { name: string; role: string; description: string } {
  const match = library?.find((character) => character.id === episodeCharacter.characterId)
  return {
    name: match?.name?.trim() || episodeCharacter.characterId || 'Character',
    role: match?.role || episodeCharacter.role || 'supporting',
    description: match?.description?.trim() || '',
  }
}
