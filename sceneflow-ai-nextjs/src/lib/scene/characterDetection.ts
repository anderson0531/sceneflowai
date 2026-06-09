/**
 * Detect project characters mentioned in free text (scene action, beat actionDescription, etc.)
 */

export interface CharacterLike {
  name?: string
  id?: string
  type?: string
  [key: string]: unknown
}

const TITLE_SKIP = new Set(['dr', 'mr', 'mrs', 'ms', 'prof', 'sir'])

export function detectCharactersInText<T extends CharacterLike>(
  text: string,
  allCharacters: T[]
): T[] {
  const sceneText = text.toLowerCase()
  if (!sceneText.trim()) return []

  return allCharacters.filter((char) => {
    if (!char.name) return false
    const charNameLower = char.name.toLowerCase()

    if (sceneText.includes(charNameLower)) return true

    const nameParts = charNameLower.split(/[\s.]+/).filter(
      (part: string) => part.length >= 4 && !TITLE_SKIP.has(part)
    )
    return nameParts.some((part: string) => {
      const wordBoundaryRegex = new RegExp(`\\b${part}\\b`)
      return wordBoundaryRegex.test(sceneText)
    })
  })
}

export function resolveBeatSpeaker<T extends CharacterLike>(
  beat: { character?: string; characterId?: string | null },
  allCharacters: T[]
): T | undefined {
  if (beat.characterId) {
    const byId = allCharacters.find((c) => c.id === beat.characterId)
    if (byId && byId.type !== 'narrator') return byId
  }
  if (beat.character) {
    const speakerLower = beat.character.toLowerCase()
    return allCharacters.find((c) => {
      if (!c?.name) return false
      if (c.type === 'narrator') return false
      const nameLower = c.name.toLowerCase()
      return (
        nameLower === speakerLower ||
        nameLower.includes(speakerLower) ||
        speakerLower.includes(nameLower)
      )
    })
  }
  return undefined
}
