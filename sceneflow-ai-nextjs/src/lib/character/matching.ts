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

/**
 * Object reference interface (matches VisualReference structure)
 */
interface ObjectReference {
  id: string
  name: string
  description?: string
  category?: 'prop' | 'vehicle' | 'set-piece' | 'costume' | 'technology' | 'other'
  importance?: 'critical' | 'important' | 'background'
  sceneNumbers?: number[]  // From ObjectSuggestion - scenes where object appears
  [key: string]: any
}

/**
 * Find matching object reference by name
 * Uses fuzzy matching similar to character matching
 */
export function findMatchingObject(
  searchName: string,
  availableObjects: ObjectReference[]
): ObjectReference | null {
  if (!searchName || availableObjects.length === 0) return null

  const normalized = searchName.toLowerCase().trim()

  // 1. Exact match (case-insensitive)
  const exactMatch = availableObjects.find(
    obj => obj.name.toLowerCase() === normalized
  )
  if (exactMatch) return exactMatch

  // 2. Full name contains search
  const containsMatches = availableObjects.filter(
    obj => obj.name.toLowerCase().includes(normalized)
  )
  if (containsMatches.length === 1) return containsMatches[0]

  // 3. Search contains object name (for compound references)
  const reverseMatches = availableObjects.filter(
    obj => normalized.includes(obj.name.toLowerCase())
  )
  if (reverseMatches.length === 1) return reverseMatches[0]

  // If multiple matches, prioritize by importance
  const allMatches = [...new Set([...containsMatches, ...reverseMatches])]
  if (allMatches.length > 0) {
    const priorityOrder = ['critical', 'important', 'background']
    for (const importance of priorityOrder) {
      const importanceMatch = allMatches.find(obj => obj.importance === importance)
      if (importanceMatch) return importanceMatch
    }
    return allMatches[0]
  }

  return null
}

/**
 * Find all matching objects for a scene
 * Matches object names against scene text (heading, action, visualDescription, keyProps)
 * Also checks if scene number is in object's sceneNumbers array
 */
export function findSceneObjects(
  sceneText: string,
  availableObjects: ObjectReference[],
  sceneNumber?: number
): ObjectReference[] {
  if (!sceneText || availableObjects.length === 0) return []

  const foundObjects = new Set<ObjectReference>()
  const normalized = sceneText.toLowerCase()

  // Strategy 1: Check sceneNumbers array first (highest confidence - from script analysis)
  if (sceneNumber !== undefined) {
    availableObjects.forEach(obj => {
      if (obj.sceneNumbers && obj.sceneNumbers.includes(sceneNumber)) {
        foundObjects.add(obj)
      }
    })
  }

  // Strategy 2: Match FULL object names against scene text
  availableObjects.forEach(obj => {
    const objName = obj.name.toLowerCase()
    
    // Skip very short names to avoid false positives
    if (objName.length < 3) return
    
    // Word boundary matching to avoid partial matches
    const wordBoundaryRegex = new RegExp(`\\b${escapeRegex(objName)}\\b`, 'i')
    if (wordBoundaryRegex.test(sceneText)) {
      foundObjects.add(obj)
    }
  })

  // Strategy 3: Match object descriptions for critical/important objects
  availableObjects.forEach(obj => {
    if (!obj.description) return
    if (obj.importance !== 'critical' && obj.importance !== 'important') return
    
    // Check if any significant word from description appears
    const descWords = obj.description.toLowerCase().split(/\s+/)
      .filter(w => w.length > 4 && !EXCLUDED_WORDS.has(w))
    
    const matchCount = descWords.filter(word => 
      new RegExp(`\\b${escapeRegex(word)}\\b`, 'i').test(normalized)
    ).length
    
    // Require at least 2 matching words for description-based matching
    if (matchCount >= 2) {
      foundObjects.add(obj)
    }
  })

  // Sort by importance: critical > important > background
  const importanceOrder: Record<string, number> = { 'critical': 0, 'important': 1, 'background': 2 }
  return Array.from(foundObjects).sort((a, b) => {
    const aOrder = importanceOrder[a.importance || 'background'] ?? 3
    const bOrder = importanceOrder[b.importance || 'background'] ?? 3
    return aOrder - bOrder
  })
}

/**
 * Helper to escape regex special characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
