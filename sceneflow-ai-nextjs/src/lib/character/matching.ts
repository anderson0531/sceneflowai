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
  console.log(`[Character Matching] Searching for: "${searchName}"`)
  console.log(`[Character Matching] Available characters:`, 
    availableCharacters.map(c => `${c.name} (${c.role || 'no role'})`).join(', ')
  )

  if (!searchName || availableCharacters.length === 0) return null

  const normalized = searchName.toLowerCase().trim()
  
  // 1. Try exact match (case-insensitive)
  let exactMatch = availableCharacters.find(
    c => c.name.toLowerCase() === normalized
  )
  if (exactMatch) {
    console.log(`[Character Matching] ✓ Exact match: "${searchName}" → "${exactMatch.name}"`)
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
    console.log(`[Character Matching] ✗ No match found for "${searchName}"`)
    return null
  }
  if (matches.length === 1) {
    console.log(`[Character Matching] ✓ Single match: "${searchName}" → "${matches[0].name}"`)
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
      console.log(`[Character Matching] ✓ Role-based match: "${searchName}" → "${roleMatch.name}" (${roleMatch.role})`)
      return roleMatch
    }
  }
  
  // If no role-based priority, return the first match with longest name
  // (assumes more specific name is more likely correct: "Brian Anderson Sr" over "Brian")
  const bestMatch = matches.sort((a, b) => b.name.length - a.name.length)[0]
  console.log(`[Character Matching] ✓ Length-based match: "${searchName}" → "${bestMatch.name}" (longest name)`)
  return bestMatch
}

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

  // Extract potential character references from scene text
  // Look for capitalized names or character names in dialogue
  const potentialNames = new Set<string>()
  
  // Pattern 1: All caps words (BRIAN, ANDERSON)
  const capsWords = sceneText.match(/\b[A-Z]{2,}\b/g) || []
  capsWords.forEach(word => potentialNames.add(word))
  
  // Pattern 2: Capitalized words (Brian, Anderson)
  const capWords = sceneText.match(/\b[A-Z][a-z]+\b/g) || []
  capWords.forEach(word => potentialNames.add(word))
  
  // Pattern 3: Check for full character names in text
  availableCharacters.forEach(char => {
    if (normalized.includes(char.name.toLowerCase())) {
      foundCharacters.add(char)
    }
  })

  // Match potential names to characters
  potentialNames.forEach(name => {
    const match = findMatchingCharacter(name, availableCharacters)
    if (match) foundCharacters.add(match)
  })

  console.log(`[Character Matching] Found ${foundCharacters.size} characters in scene:`, 
    Array.from(foundCharacters).map(c => c.name).join(', ')
  )

  return Array.from(foundCharacters)
}
