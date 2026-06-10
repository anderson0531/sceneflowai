/**
 * Detect project characters mentioned in free text (scene action, beat actionDescription, etc.)
 */

export interface CharacterLike {
  name?: string
  id?: string
  type?: string
  [key: string]: unknown
}

export interface DetectCharactersOptions {
  /** Phrases that should not trigger a match (e.g. film title "AURA'S ECHO"). */
  excludeTexts?: string[]
}

const TITLE_SKIP = new Set(['dr', 'mr', 'mrs', 'ms', 'prof', 'sir'])

function isExcludedCharacterMatch(
  charNameLower: string,
  sceneText: string,
  excludeTexts: string[]
): boolean {
  for (const raw of excludeTexts) {
    const excluded = raw.toLowerCase().trim()
    if (!excluded || !sceneText.includes(excluded)) continue

    if (excluded.includes(charNameLower)) return true

    const nameParts = charNameLower.split(/[\s.]+/).filter(
      (part: string) => part.length >= 3 && !TITLE_SKIP.has(part)
    )
    if (nameParts.some((part) => excluded.includes(part))) return true
  }
  return false
}

export function detectCharactersInText<T extends CharacterLike>(
  text: string,
  allCharacters: T[],
  options?: DetectCharactersOptions
): T[] {
  const sceneText = text.toLowerCase()
  if (!sceneText.trim()) return []

  const excludeTexts = (options?.excludeTexts ?? []).filter((t) => t.trim())

  return allCharacters.filter((char) => {
    if (!char.name) return false
    const charNameLower = char.name.toLowerCase()

    if (excludeTexts.length > 0 && isExcludedCharacterMatch(charNameLower, sceneText, excludeTexts)) {
      return false
    }

    if (sceneText.includes(charNameLower)) return true

    const nameParts = charNameLower.split(/[\s.]+/).filter(
      (part: string) => part.length >= 4 && !TITLE_SKIP.has(part)
    )
    return nameParts.some((part: string) => {
      if (excludeTexts.length > 0 && isExcludedCharacterMatch(part, sceneText, excludeTexts)) {
        return false
      }
      const wordBoundaryRegex = new RegExp(`\\b${part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`)
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
