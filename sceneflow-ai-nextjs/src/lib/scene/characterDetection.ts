/**
 * Detect project characters mentioned in free text (scene action, beat actionDescription, etc.)
 */

import { extractSamePersonAgeStage } from '@/lib/character/ageStageContinuity'

export interface CharacterLike {
  name?: string
  id?: string
  type?: string
  samePersonGroupId?: string
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

const TITLE_SKIP = new Set([
  'dr',
  'mr',
  'mrs',
  'ms',
  'prof',
  'sir',
  'professor',
  'sr',
  'jr',
  'ii',
  'iii',
  'iv',
  'age',
  'aged',
])

const THREE_LETTER_STOPWORDS = new Set([
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'any', 'can',
  'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him',
  'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'way',
  'who', 'did', 'let', 'put', 'say', 'she', 'too', 'use', 'man', 'men',
  'off', 'end', 'far', 'low', 'red', 'set', 'sit', 'top', 'yet', 'old',
  'boy', 'son', 'mom', 'dad', 'sir', 'mrs', 'pro', 'cue', 'cut', 'pan',
  'pov', 'ext', 'int', 'sfx', 'vfx', ' cgi',
])

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function hasUnicodeWordMatch(text: string, term: string, caseSensitive = false): boolean {
  const trimmed = term.trim()
  if (!trimmed) return false
  const flags = caseSensitive ? 'u' : 'iu'
  return new RegExp(`(?<![\\p{L}\\p{N}_])${escapeRegExp(trimmed)}(?![\\p{L}\\p{N}_])`, flags).test(
    text
  )
}

function hasCapitalizedShortNameMatch(rawText: string, partLower: string): boolean {
  if (partLower.length !== 3 || THREE_LETTER_STOPWORDS.has(partLower)) return false
  const firstUpper = escapeRegExp(partLower[0].toUpperCase())
  const rest = partLower
    .slice(1)
    .split('')
    .map((ch) => `[${escapeRegExp(ch.toLowerCase())}${escapeRegExp(ch.toUpperCase())}]`)
    .join('')
  return new RegExp(`(?<![\\p{L}\\p{N}_])${firstUpper}${rest}(?![\\p{L}\\p{N}_])`, 'u').test(
    rawText
  )
}

function textExplicitlyMatchesAgeVariant(
  rawText: string,
  lowerText: string,
  charName: string
): boolean {
  if (hasUnicodeWordMatch(rawText, charName)) {
    const stage = extractSamePersonAgeStage(charName)
    if (stage.isAgeVariant) return true
  }
  const stage = extractSamePersonAgeStage(charName)
  if (!stage.isAgeVariant) return false
  if (stage.numericAge != null) {
    const ageNum = stage.numericAge
    const ageRe = new RegExp(
      `(?:\\(\\s*(?:age|aged)\\s*${ageNum}\\b|\\b(?:age|aged)\\s+${ageNum}\\b|\\b${ageNum}-year-old\\b)`,
      'i'
    )
    if (ageRe.test(lowerText)) return true
  }
  if (stage.ageStageLabel) {
    const qualClean = stage.ageStageLabel.replace(/^age[d]?\s+/i, '').trim()
    if (qualClean.length >= 3 && hasUnicodeWordMatch(lowerText, qualClean)) {
      return true
    }
  }
  return false
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
  const cleanLower = charNameLower.replace(/\([^)]*\)/g, ' ').trim()
  for (const raw of excludeTexts) {
    const excluded = raw.toLowerCase().trim()
    if (!excluded || !sceneText.includes(excluded)) continue

    if (excluded.includes(charNameLower) || (cleanLower && excluded.includes(cleanLower))) {
      return true
    }

    const nameParts = cleanLower
      .split(/[\s.,-]+/)
      .filter((part: string) => part.length >= 3 && !TITLE_SKIP.has(part))
    if (nameParts.some((part) => excluded.includes(part))) return true
  }
  return false
}

function disambiguateSamePersonVariants<T extends CharacterLike>(
  matched: T[],
  maskedRawText: string,
  sceneText: string
): T[] {
  if (matched.length <= 1) return matched

  const byPersonGroup = new Map<string, T[]>()
  for (const char of matched) {
    const name = (char.name || '').trim()
    if (!name) continue
    const stage = extractSamePersonAgeStage(name)
    const groupKey = (
      char.samePersonGroupId
        ? String(char.samePersonGroupId)
        : stage.baseName || name
    )
      .trim()
      .toLowerCase()
    const bucket = byPersonGroup.get(groupKey)
    if (bucket) bucket.push(char)
    else byPersonGroup.set(groupKey, [char])
  }

  const keepSet = new Set<T>()
  for (const group of byPersonGroup.values()) {
    if (group.length === 1) {
      keepSet.add(group[0])
      continue
    }
    const explicitMatches = group.filter((char) =>
      textExplicitlyMatchesAgeVariant(maskedRawText, sceneText, char.name || '')
    )
    if (explicitMatches.length > 0) {
      for (const c of explicitMatches) keepSet.add(c)
      continue
    }
    const baseEntries = group.filter(
      (char) => !extractSamePersonAgeStage(char.name || '').isAgeVariant
    )
    if (baseEntries.length > 0) {
      for (const c of baseEntries) keepSet.add(c)
      continue
    }
    for (const c of group) keepSet.add(c)
  }

  return matched.filter((char) => keepSet.has(char))
}

export function detectCharactersInText<T extends CharacterLike>(
  text: string,
  allCharacters: T[],
  options?: DetectCharactersOptions
): T[] {
  const maskedRawText = maskPhrasesInText(text, options?.maskPhrases)
  const sceneText = maskedRawText.toLowerCase()
  if (!sceneText.trim()) return []

  const excludeTexts = (options?.excludeTexts ?? []).filter((t) => t.trim())

  const matched = allCharacters.filter((char) => {
    if (!char.name) return false
    const rawName = char.name.trim()
    const charNameLower = rawName.toLowerCase()

    if (excludeTexts.length > 0 && isExcludedCharacterMatch(charNameLower, sceneText, excludeTexts)) {
      return false
    }

    if (hasUnicodeWordMatch(maskedRawText, rawName) || sceneText.includes(charNameLower)) {
      return true
    }

    const baseName = extractSamePersonAgeStage(rawName).baseName
    if (baseName && baseName.toLowerCase() !== charNameLower && hasUnicodeWordMatch(maskedRawText, baseName)) {
      return true
    }

    const cleanLower = rawName.replace(/\([^)]*\)/g, ' ').toLowerCase()
    const nameParts = cleanLower
      .split(/[\s.,-]+/)
      .filter((part: string) => part.length >= 3 && !TITLE_SKIP.has(part))

    return nameParts.some((part: string) => {
      if (excludeTexts.length > 0 && isExcludedCharacterMatch(part, sceneText, excludeTexts)) {
        return false
      }
      if (part.length === 3) {
        return hasCapitalizedShortNameMatch(maskedRawText, part)
      }
      return hasUnicodeWordMatch(sceneText, part)
    })
  })

  return disambiguateSamePersonVariants(matched, maskedRawText, sceneText)
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

  const matchedFromDetected = detectCharactersInText(directionText, detected, options)
  if (matchedFromDetected.length > 0) return matchedFromDetected

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
    const speakerRaw = beat.character.trim()
    const speakerLower = speakerRaw.toLowerCase()
    const eligible = allCharacters.filter((c) => Boolean(c?.name) && c.type !== 'narrator')

    // 1. Exact full-name match first (prevents "Brian Eric Anderson Sr." from hitting "(Age 17)" first)
    const exactMatch = eligible.find((c) => c.name!.trim().toLowerCase() === speakerLower)
    if (exactMatch) return exactMatch

    // 2. Same-person explicit age-stage match
    const speakerStage = extractSamePersonAgeStage(speakerRaw)
    if (speakerStage.isAgeVariant && speakerStage.numericAge != null) {
      const speakerBaseLower = speakerStage.baseName.toLowerCase()
      const ageMatch = eligible.find((c) => {
        const st = extractSamePersonAgeStage(c.name!)
        return (
          st.isAgeVariant &&
          st.numericAge === speakerStage.numericAge &&
          st.baseName.toLowerCase() === speakerBaseLower
        )
      })
      if (ageMatch) return ageMatch
    }

    // 3. Base-name match preferring non-age-variant when speaker has no age qualifier
    if (!speakerStage.isAgeVariant) {
      const baseMatches = eligible.filter((c) => {
        const nameLower = c.name!.trim().toLowerCase()
        const st = extractSamePersonAgeStage(c.name!)
        return (
          st.baseName.toLowerCase() === speakerLower ||
          nameLower.includes(speakerLower) ||
          speakerLower.includes(nameLower)
        )
      })
      if (baseMatches.length > 0) {
        return (
          baseMatches.find((c) => !extractSamePersonAgeStage(c.name!).isAgeVariant) ??
          baseMatches[0]
        )
      }
    }

    // 4. Legacy substring fallback
    return eligible.find((c) => {
      const nameLower = c.name!.toLowerCase()
      return nameLower.includes(speakerLower) || speakerLower.includes(nameLower)
    })
  }
  return undefined
}
