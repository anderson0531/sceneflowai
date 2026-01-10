/**
 * Canonical Character Name System
 * 
 * Purpose: Ensure character names are consistent across all generation and editing
 * to prevent downstream matching issues with voice, image, and video generation.
 */

export interface CanonicalCharacter {
  id: string  // UUID - primary identifier
  name: string  // Canonical name in Title Case
  aliases: string[]  // Accepted variations for matching
  role: string
  description: string
}

/**
 * Convert any character name variation to canonical format
 * 
 * Rules:
 * - Title Case (e.g., "Brian Anderson Sr")
 * - No ALL CAPS
 * - Removes screenplay annotations like (V.O.), (O.S.), (CONT'D)
 * - Removes quoted nicknames/aliases like 'ben' or "Ben"
 */
export function toCanonicalName(input: string): string {
  if (!input) return ''
  
  // Remove screenplay annotations: (V.O.), (O.S.), (O.C.), (CONT'D)
  let clean = input.replace(/\s*\([^)]*\)\s*/g, '').trim()
  
  // Remove quoted nicknames/aliases: 'ben', "Ben", 'Ben', etc.
  // This ensures "Dr. Benjamin 'ben' Anderson" matches "Dr. Benjamin Anderson"
  clean = clean.replace(/\s*['"][^'"]+['"]\s*/g, ' ').trim()
  
  // Remove ALL extra whitespace (consolidate multiple spaces into one)
  clean = clean.replace(/\s+/g, ' ').trim()
  
  // Convert to Title Case
  clean = clean
    .toLowerCase()
    .split(' ')
    .map(word => {
      // Handle special cases
      if (word === 'sr' || word === 'jr' || word === 'ii' || word === 'iii') {
        return word.charAt(0).toUpperCase() + word.slice(1)
      }
      // Capitalize first letter
      return word.charAt(0).toUpperCase() + word.slice(1)
    })
    .join(' ')
  
  return clean
}

/**
 * Generate common aliases for a character name
 * Used for fuzzy matching during dialogue
 * 
 * Examples:
 * - "Brian Anderson Sr" → ["Brian Anderson Sr", "Brian", "Anderson", "Brian Anderson"]
 * - "John Doe" → ["John Doe", "John", "Doe"]
 * - "Alice" → ["Alice"]
 * - "Dr. Benjamin 'ben' Anderson" → ["Dr. Benjamin Anderson", "Benjamin", "Anderson", "Ben"]
 */
export function generateAliases(canonicalName: string, originalName?: string): string[] {
  const aliases = [canonicalName]  // Include canonical name
  
  const parts = canonicalName.split(' ')
  
  // First name only
  if (parts.length > 1) {
    aliases.push(parts[0])
  }
  
  // Last name only (if 2+ parts)
  if (parts.length >= 2) {
    aliases.push(parts[parts.length - 1])
  }
  
  // First + Last (if middle name/suffix exists)
  if (parts.length > 2) {
    aliases.push(`${parts[0]} ${parts[parts.length - 1]}`)
  }
  
  // Extract nicknames from original name (if provided)
  // Matches: 'ben', "Ben", 'Ben', etc.
  if (originalName) {
    const nicknameMatches = originalName.match(/['"]([^'"]+)['"]/g)
    if (nicknameMatches) {
      for (const match of nicknameMatches) {
        // Remove quotes and normalize to title case
        const nickname = match.replace(/['"]/g, '').trim()
        if (nickname) {
          const normalizedNickname = nickname.charAt(0).toUpperCase() + nickname.slice(1).toLowerCase()
          aliases.push(normalizedNickname)
        }
      }
    }
  }
  
  return [...new Set(aliases)]  // Remove duplicates
}

/**
 * Match a dialogue character name to canonical characters
 * Returns the canonical character or null
 * 
 * Matching strategy:
 * 1. Exact match on canonical name
 * 2. Match against aliases
 * 3. Return null if no match
 */
export function matchCharacter(
  dialogueName: string,
  canonicalCharacters: CanonicalCharacter[]
): CanonicalCharacter | null {
  const normalized = toCanonicalName(dialogueName)
  
  // 1. Try exact match on canonical name
  const exactMatch = canonicalCharacters.find(c => c.name === normalized)
  if (exactMatch) return exactMatch
  
  // 2. Try alias matching
  for (const char of canonicalCharacters) {
    if (char.aliases.some(alias => 
      toCanonicalName(alias) === normalized
    )) {
      return char
    }
  }
  
  // 3. No match found
  return null
}

