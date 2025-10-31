export interface Character {
  name: string
  role?: string
  description?: string
  [key: string]: any
}

export interface CharacterDetectionResult {
  new: Character[]
  removed: Character[]
  unchanged: Character[]
}

/**
 * Normalize character name for comparison
 */
export function normalizeCharacterName(name: string): string {
  if (!name) return ''
  
  // Remove voice-over indicators: (V.O.), (O.S.), (O.C.), (CONT'D)
  let normalized = name.replace(/\s*\([^)]*\)\s*/g, '').trim()
  
  // Convert to uppercase for case-insensitive comparison
  normalized = normalized.toUpperCase()
  
  // Remove extra whitespace
  normalized = normalized.replace(/\s+/g, ' ')
  
  return normalized
}

/**
 * Extract unique characters from script scenes
 */
export function extractCharactersFromScenes(scenes: any[]): Character[] {
  const charMap = new Map<string, Character>()
  
  scenes.forEach(scene => {
    scene.dialogue?.forEach((d: any) => {
      if (!d.character) return
      
      const normalizedName = normalizeCharacterName(d.character)
      
      if (!charMap.has(normalizedName)) {
        const cleanName = d.character.replace(/\s*\([^)]*\)\s*/g, '').trim()
        
        charMap.set(normalizedName, {
          name: cleanName,
          role: d.character === 'NARRATOR' ? 'narrator' : 'supporting',
          description: `Character from script`,
        })
      }
    })
  })
  
  return Array.from(charMap.values())
}

/**
 * Compare script characters with existing character library
 */
export function detectCharacterChanges(
  scriptScenes: any[],
  existingCharacters: Character[]
): CharacterDetectionResult {
  const scriptCharacters = extractCharactersFromScenes(scriptScenes)
  
  // Create lookup maps for normalization
  const scriptCharMap = new Map<string, Character>()
  scriptCharacters.forEach(char => {
    const normalized = normalizeCharacterName(char.name)
    scriptCharMap.set(normalized, char)
  })
  
  const existingCharMap = new Map<string, Character>()
  existingCharacters.forEach(char => {
    const normalized = normalizeCharacterName(char.name)
    existingCharMap.set(normalized, char)
  })
  
  // Find new characters (in script but not in existing)
  const newCharacters: Character[] = []
  scriptCharMap.forEach((char, normalized) => {
    if (!existingCharMap.has(normalized)) {
      newCharacters.push(char)
    }
  })
  
  // Find removed characters (in existing but not in script)
  const removedCharacters: Character[] = []
  existingCharMap.forEach((char, normalized) => {
    if (!scriptCharMap.has(normalized)) {
      removedCharacters.push(char)
    }
  })
  
  // Find unchanged characters
  const unchangedCharacters: Character[] = []
  existingCharMap.forEach((char, normalized) => {
    if (scriptCharMap.has(normalized)) {
      unchangedCharacters.push(char)
    }
  })
  
  return {
    new: newCharacters,
    removed: removedCharacters,
    unchanged: unchangedCharacters
  }
}

