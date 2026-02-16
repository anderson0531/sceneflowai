const SCENE_CODE_DEFINITIONS: Record<string, string> = {
  'INT': 'Interior',
  'EXT': 'Exterior',
  'INT/EXT': 'Interior/Exterior',
  'EXT/INT': 'Exterior/Interior'
}

const SCENE_CODE_REGEX = /^(INT\.\/EXT\.|EXT\.\/INT\.|INT\.\/EXT|EXT\.\/INT|INT\. |EXT\. |INT\/EXT|EXT\/INT|INT\.|EXT\.|INT|EXT)\s*(.*)$/i

export function formatSceneHeading(rawHeading?: string | null): string {
  if (!rawHeading) return ''
  const heading = rawHeading.trim()
  if (!heading) return ''

  const match = heading.match(SCENE_CODE_REGEX)
  if (!match) {
    return heading
  }

  const codeRaw = match[1]?.toUpperCase().replace(/\s+/g, '') || ''
  const normalizedCode = codeRaw.replace(/\./g, '')
  const remainder = match[2]?.trim() || ''
  const definition = SCENE_CODE_DEFINITIONS[normalizedCode]
  const prefix = definition ? `${normalizedCode} (${definition})` : normalizedCode
  const base = `${prefix}.`

  return remainder ? `${base} ${remainder}` : base
}

/**
 * Extracts a normalized location name from a scene heading.
 * Examples:
 *   "INT. LIVING ROOM - DAY" → "LIVING ROOM"
 *   "EXT. BEACH - SUNSET" → "BEACH"
 *   "INT./EXT. CAR - MOVING - NIGHT" → "CAR - MOVING"
 * 
 * This is used for matching location references across scenes.
 */
export function extractLocation(rawHeading?: string | null): string | null {
  if (!rawHeading) return null
  const heading = rawHeading.trim().toUpperCase()
  if (!heading) return null

  const match = heading.match(SCENE_CODE_REGEX)
  if (!match) {
    // If no scene code match, return the whole thing as location
    return heading || null
  }

  const remainder = match[2]?.trim() || ''
  if (!remainder) return null

  // Split by " - " to separate location from time of day
  // "LIVING ROOM - DAY" → "LIVING ROOM"
  // "CAR - MOVING - NIGHT" → "CAR - MOVING" (preserve middle segments)
  const parts = remainder.split(/\s+-\s+/)
  
  // Time indicators to strip from the end
  const timeIndicators = ['DAY', 'NIGHT', 'MORNING', 'EVENING', 'SUNSET', 'SUNRISE', 'DUSK', 'DAWN', 'CONTINUOUS', 'LATER', 'SAME', 'MOMENTS LATER']
  
  // Remove last part if it's a time indicator
  if (parts.length > 1) {
    const lastPart = parts[parts.length - 1]?.trim()
    if (lastPart && timeIndicators.includes(lastPart)) {
      parts.pop()
    }
  }

  const location = parts.join(' - ').trim()
  return location || null
}

/**
 * Checks if two scene headings refer to the same location.
 * Compares normalized location names.
 */
export function isSameLocation(heading1?: string | null, heading2?: string | null): boolean {
  const loc1 = extractLocation(heading1)
  const loc2 = extractLocation(heading2)
  
  if (!loc1 || !loc2) return false
  return loc1 === loc2
}
