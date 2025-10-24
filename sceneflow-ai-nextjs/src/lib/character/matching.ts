interface Character {
  name: string
  role?: string
  [key: string]: any
}

/**
 * Smart character matching with fuzzy name matching and role-based prioritization
 */
export function findMatchingCharacter(
  searchName: string,
  availableCharacters: Character[]
): Character | null {

  if (!searchName || availableCharacters.length === 0) return null

  const normalized = searchName.toLowerCase().trim()
  
  // 1. Try exact match (case-insensitive)
  let exactMatch = availableCharacters.find(
    c => c.name.toLowerCase() === normalized
  )
  if (exactMatch) {
    return exactMatch
  }

  // 2. Try full name contains search (for "BRIAN" matching "Brian Anderson Sr")
  let fullNameMatches = availableCharacters.filter(
    c => c.name.toLowerCase().includes(normalized)
  )
  
  // 3. Try first name match (for "Brian" matching "Brian Anderson Sr" or "Brian Anderson Jr")
  const firstName = normalized.split(/\s+/)[0]
  let firstNameMatches = availableCharacters.filter(
    c => c.name.toLowerCase().split(/\s+/)[0] === firstName
  )
  
  // Combine matches, prioritizing fullNameMatches
  let matches = fullNameMatches.length > 0 ? fullNameMatches : firstNameMatches
  
  if (matches.length === 0) {
    return null
  }
  if (matches.length === 1) {
    return matches[0]
  }
  
  // Multiple matches - prioritize by role
  // Priority order: protagonist > main > supporting > other
  const priorityOrder = ['protagonist', 'main', 'supporting']
  
  for (const role of priorityOrder) {
    const roleMatch = matches.find(c => 
      c.role?.toLowerCase() === role
    )
    if (roleMatch) {
      return roleMatch
    }
  }
  
  // If no role-based priority, return the first match with longest name
  // (assumes more specific name is more likely correct: "Brian Anderson Sr" over "Brian")
  const bestMatch = matches.sort((a, b) => b.name.length - a.name.length)[0]
  return bestMatch
}

// Add exclusion list for common titles/words
const EXCLUDED_WORDS = new Set([
  'dr', 'doctor', 'mr', 'mrs', 'ms', 'miss', 'prof', 'professor',
  'captain', 'lieutenant', 'sergeant', 'officer', 'detective',
  'the', 'and', 'but', 'or', 'a', 'an', 'in', 'on', 'at', 'to', 'from'
])

/**
 * Find all matching characters for a scene
 */
export function findSceneCharacters(
  sceneText: string,
  availableCharacters: Character[]
): Character[] {
  if (!sceneText || availableCharacters.length === 0) return []

  const foundCharacters = new Set<Character>()
  const normalized = sceneText.toLowerCase()

  // Strategy 1: Match FULL character names only (highest confidence)
  availableCharacters.forEach(char => {
    const fullName = char.name.toLowerCase()
    if (normalized.includes(fullName)) {
      foundCharacters.add(char)
    }
  })

  // Strategy 2: Match dialogue attributions (e.g., "BRIAN:" or "Brian:")
  const dialoguePattern = /^([A-Z][A-Za-z\s]+):/gm
  const dialogueMatches = sceneText.matchAll(dialoguePattern)
  
  for (const match of dialogueMatches) {
    const speakerName = match[1].trim()
    const character = findMatchingCharacter(speakerName, availableCharacters)
    if (character) foundCharacters.add(character)
  }

  // Strategy 3: Only if no matches found, try first names (with exclusions)
  if (foundCharacters.size === 0) {
    availableCharacters.forEach(char => {
      const firstName = char.name.split(/\s+/)[0].toLowerCase()
      
      // Skip if excluded word or too short
      if (EXCLUDED_WORDS.has(firstName) || firstName.length < 3) return
      
      // Only match if first name appears as standalone word
      const wordBoundaryRegex = new RegExp(`\\b${firstName}\\b`, 'i')
      if (wordBoundaryRegex.test(sceneText)) {
        foundCharacters.add(char)
      }
    })
  }

  return Array.from(foundCharacters)
}
