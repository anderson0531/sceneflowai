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

// Common titles to handle in name normalization
const COMMON_TITLES = ['dr', 'dr.', 'doctor', 'prof', 'prof.', 'professor', 'mr', 'mr.', 'mrs', 'mrs.', 'ms', 'ms.', 'miss', 'sir', 'rev', 'rev.', 'reverend', 'capt', 'capt.', 'captain', 'sgt', 'sgt.', 'sergeant', 'lt', 'lt.', 'lieutenant', 'col', 'col.', 'colonel', 'gen', 'gen.', 'general', 'judge', 'sen', 'sen.', 'senator', 'rep', 'rep.', 'representative']

/**
 * Generate comprehensive aliases for a character name
 * Used for fuzzy matching during dialogue - handles common AI generation variations
 * 
 * Examples:
 * - "Dr. Ben Anderson" → ["Dr. Ben Anderson", "DR. BEN ANDERSON", "Ben Anderson", "BEN ANDERSON", "Dr. Ben", "Dr. Anderson", "Ben", "BEN", "Anderson", "ANDERSON", "Doctor Ben Anderson"]
 * - "John Doe" → ["John Doe", "JOHN DOE", "John", "JOHN", "Doe", "DOE"]
 * - "Alice" → ["Alice", "ALICE"]
 */
export function generateAliases(canonicalName: string, originalName?: string): string[] {
  const aliases = new Set<string>()
  
  // Add canonical name and ALL CAPS variant
  aliases.add(canonicalName)
  aliases.add(canonicalName.toUpperCase())
  
  const parts = canonicalName.split(' ')
  
  // Check if first part is a title
  const firstPartLower = parts[0]?.toLowerCase().replace('.', '')
  const hasTitle = COMMON_TITLES.includes(firstPartLower) || COMMON_TITLES.includes(firstPartLower + '.')
  
  if (hasTitle && parts.length > 1) {
    // Name without title (e.g., "Dr. Ben Anderson" → "Ben Anderson")
    const nameWithoutTitle = parts.slice(1).join(' ')
    aliases.add(nameWithoutTitle)
    aliases.add(nameWithoutTitle.toUpperCase())
    
    // Title + first name only (e.g., "Dr. Ben")
    if (parts.length > 2) {
      aliases.add(`${parts[0]} ${parts[1]}`)
      aliases.add(`${parts[0]} ${parts[1]}`.toUpperCase())
    }
    
    // Title + last name only (e.g., "Dr. Anderson")
    if (parts.length > 2) {
      aliases.add(`${parts[0]} ${parts[parts.length - 1]}`)
      aliases.add(`${parts[0]} ${parts[parts.length - 1]}`.toUpperCase())
    }
    
    // First name without title (e.g., "Ben")
    aliases.add(parts[1])
    aliases.add(parts[1].toUpperCase())
    
    // Last name without title (e.g., "Anderson")
    if (parts.length > 2) {
      aliases.add(parts[parts.length - 1])
      aliases.add(parts[parts.length - 1].toUpperCase())
    }
    
    // Expanded title variations (e.g., "Dr." → "Doctor")
    const titleExpansions: Record<string, string[]> = {
      'dr': ['Doctor', 'Dr'],
      'dr.': ['Doctor', 'Dr'],
      'prof': ['Professor', 'Prof'],
      'prof.': ['Professor', 'Prof'],
      'capt': ['Captain', 'Capt'],
      'capt.': ['Captain', 'Capt'],
      'sgt': ['Sergeant', 'Sgt'],
      'sgt.': ['Sergeant', 'Sgt'],
      'lt': ['Lieutenant', 'Lt'],
      'lt.': ['Lieutenant', 'Lt'],
      'col': ['Colonel', 'Col'],
      'col.': ['Colonel', 'Col'],
      'gen': ['General', 'Gen'],
      'gen.': ['General', 'Gen'],
      'rev': ['Reverend', 'Rev'],
      'rev.': ['Reverend', 'Rev'],
      'sen': ['Senator', 'Sen'],
      'sen.': ['Senator', 'Sen'],
      'rep': ['Representative', 'Rep'],
      'rep.': ['Representative', 'Rep'],
    }
    
    const expansions = titleExpansions[firstPartLower]
    if (expansions) {
      for (const expanded of expansions) {
        const fullExpanded = [expanded, ...parts.slice(1)].join(' ')
        aliases.add(fullExpanded)
        aliases.add(fullExpanded.toUpperCase())
      }
    }
  } else {
    // No title - standard name handling
    
    // First name only
    if (parts.length > 1) {
      aliases.add(parts[0])
      aliases.add(parts[0].toUpperCase())
    }
    
    // Last name only (if 2+ parts)
    if (parts.length >= 2) {
      aliases.add(parts[parts.length - 1])
      aliases.add(parts[parts.length - 1].toUpperCase())
    }
    
    // First + Last (if middle name/suffix exists)
    if (parts.length > 2) {
      const firstLast = `${parts[0]} ${parts[parts.length - 1]}`
      aliases.add(firstLast)
      aliases.add(firstLast.toUpperCase())
    }
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
          aliases.add(normalizedNickname)
          aliases.add(normalizedNickname.toUpperCase())
        }
      }
    }
  }
  
  return [...aliases]  // Convert Set to array
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

