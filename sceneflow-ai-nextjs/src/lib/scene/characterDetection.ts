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
  /**
   * Library prop/location names to blank before matching.
   * Unlike excludeTexts, this does not drop a character who also appears independently
   * (e.g. "Arthur enters and lifts Arthur Pendelton's 1893 Journal").
   */
  maskPhrases?: string[]
}

const TITLE_SKIP = new Set(['dr', 'mr', 'mrs', 'ms', 'prof', 'sir', 'professor'])

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Blank known library names so possessive prop titles cannot look like character presence. */
export function maskPhrasesInText(text: string, phrases: string[] | undefined): string {
  if (!text || !phrases?.length) return text
  const sorted = [...phrases]
    .map((phrase) => phrase.trim())
    .filter((phrase) => phrase.length >= 3)
    .sort((a, b) => b.length - a.length)
  let result = text
  for (const phrase of sorted) {
    const pattern = new RegExp(escapeRegExp(phrase), 'gi')
    result = result.replace(pattern, ' ')
  }
  return result
}

export function collectEntityMaskPhrases(args: {
  objectNames?: Array<string | undefined | null>
  locationNames?: Array<string | undefined | null>
}): string[] {
  const phrases: string[] = []
  const seen = new Set<string>()
  for (const name of [...(args.objectNames ?? []), ...(args.locationNames ?? [])]) {
    const trimmed = (name || '').trim()
    if (trimmed.length < 3) continue
    const key = trimmed.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    phrases.push(trimmed)
  }
  return phrases
}

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
  const sceneText = maskPhrasesInText(text, options?.maskPhrases).toLowerCase()
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

/**
 * If scene direction names a visible cast, drop detected characters who are not in that set.
 * Falls back to `detected` when direction text names nobody (pronouns / "they").
 */
export function intersectDetectedCharactersWithDirectionText<T extends CharacterLike>(
  detected: T[],
  directionText: string,
  allCharacters: T[],
  options?: DetectCharactersOptions
): T[] {
  if (detected.length === 0 || !directionText?.trim()) return detected
  const namedInDirection = detectCharactersInText(directionText, allCharacters, options)
  if (namedInDirection.length === 0) return detected

  const directionKeys = new Set(
    namedInDirection.map((char) => String(char.id || char.name || '').toLowerCase())
  )
  const filtered = detected.filter((char) =>
    directionKeys.has(String(char.id || char.name || '').toLowerCase())
  )
  return filtered.length > 0 ? filtered : detected
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
