import { resolveWardrobeForCharacter } from '@/lib/character/characterReferenceAssembly'
import {
  isCollectiveOrGroupCharacterName,
  stripScreenplayDeliveryAnnotations,
} from '@/lib/character/ageStageContinuity'
import { extractSceneWardrobeAndAppearanceNotes } from '@/lib/character/wardrobeAnalysis'
import { isWardrobeStaleForSceneScript } from '@/lib/character/wardrobeScriptSync'

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

export interface AutoSyncCharactersResult {
  characters: Character[]
  changed: boolean
  addedNames: string[]
  staledWardrobeCount: number
}

/**
 * Normalize character name for comparison
 */
export function normalizeCharacterName(name: string): string {
  if (!name) return ''
  
  // Remove voice-over/delivery indicators: (V.O.), (O.S.), (O.C.), (CONT'D) while keeping (Age 16), (1978), etc.
  let normalized = stripScreenplayDeliveryAnnotations(name)
  
  // Convert to uppercase for case-insensitive comparison
  normalized = normalized.toUpperCase()
  
  // Remove extra whitespace
  normalized = normalized.replace(/\s+/g, ' ')
  
  return normalized
}

function registerExtractedCharacter(
  charMap: Map<string, Character>,
  rawName: unknown,
  dialogueLine?: string,
  forceRole?: string
) {
  if (typeof rawName !== 'string' || !rawName.trim()) return
  const normalizedName = normalizeCharacterName(rawName)
  if (!normalizedName) return
  const cleanName = stripScreenplayDeliveryAnnotations(rawName)
  if (!cleanName) return

  if (charMap.has(normalizedName)) {
    const existing = charMap.get(normalizedName)!
    if (
      existing.role !== 'narrator' &&
      existing.name === existing.name.toUpperCase() &&
      cleanName !== cleanName.toUpperCase()
    ) {
      existing.name = cleanName
    }
    return
  }

  const isNarrator =
    forceRole === 'narrator' ||
    cleanName.toUpperCase().includes('NARRATOR') ||
    rawName.trim().toUpperCase() === 'NARRATOR'

  if (!isNarrator && isCollectiveOrGroupCharacterName(cleanName)) {
    return
  }
  const dialogueSample = dialogueLine
    ? dialogueLine.substring(0, 100) + (dialogueLine.length > 100 ? '...' : '')
    : ''

  charMap.set(normalizedName, {
    name: cleanName,
    role: isNarrator ? 'narrator' : 'supporting',
    description: isNarrator
      ? `Narrator for the scene.${dialogueSample ? ` Tone reference: "${dialogueSample}"` : ''}`
      : 'Character from script',
  })
}

/**
 * Extract unique characters from script scenes (dialogue, beats, beatDirection.castInFrame, scene.characters)
 */
export function extractCharactersFromScenes(scenes: any[]): Character[] {
  const charMap = new Map<string, Character>()
  if (!Array.isArray(scenes)) return []

  scenes.forEach(scene => {
    if (!scene || typeof scene !== 'object') return

    scene.dialogue?.forEach((d: any) => {
      if (!d?.character) return
      registerExtractedCharacter(charMap, d.character, d.line)
    })

    if (Array.isArray(scene.characters)) {
      scene.characters.forEach((entry: any) => {
        const raw = typeof entry === 'string' ? entry : entry?.name
        registerExtractedCharacter(charMap, raw)
      })
    }

    if (Array.isArray(scene.beats)) {
      scene.beats.forEach((beat: any) => {
        if (!beat || typeof beat !== 'object' || beat.excluded === true) return
        if (beat.character && beat.kind !== 'narration') {
          registerExtractedCharacter(charMap, beat.character, beat.line)
        }
        if (Array.isArray(beat.characters)) {
          beat.characters.forEach((entry: any) => {
            const raw = typeof entry === 'string' ? entry : entry?.name
            registerExtractedCharacter(charMap, raw)
          })
        }
        const castInFrame = beat.beatDirection?.castInFrame
        if (Array.isArray(castInFrame)) {
          castInFrame.forEach((castName: any) => {
            registerExtractedCharacter(charMap, castName)
          })
        }
      })
    }
  })

  return Array.from(charMap.values())
}

/**
 * Auto-push newly introduced script characters into the Continuity Library and
 * flag existing character wardrobes `needsImageRegen: true` when script edits
 * introduce new attire or appearance continuity changes.
 */
export function autoSyncCharactersFromScriptScenes(
  scriptScenes: any[],
  existingCharacters: Character[]
): AutoSyncCharactersResult {
  const safeScenes = Array.isArray(scriptScenes) ? scriptScenes : []
  const safeExisting = Array.isArray(existingCharacters) ? existingCharacters : []

  const existingNormalized = new Set<string>()
  for (const char of safeExisting) {
    const norm = normalizeCharacterName(char?.name || '')
    if (norm) existingNormalized.add(norm)
  }

  let staledWardrobeCount = 0
  let changed = false

  // 1. Check existing characters for wardrobe drift against updated script scenes
  const updatedExisting: Character[] = safeExisting.map((char) => {
    if (!char?.name || char.type === 'narrator' || char.role === 'narrator') {
      return char
    }
    const wardrobes = Array.isArray(char.wardrobes) ? char.wardrobes : []
    if (wardrobes.length === 0) return char

    const staleWardrobeIds = new Set<string>()
    const appendedAppearanceByWardrobeId = new Map<string, string[]>()

    safeScenes.forEach((scene, sceneIdx) => {
      const resolved = resolveWardrobeForCharacter(
        char as Record<string, unknown>,
        scene,
        undefined,
        sceneIdx
      )
      const wardrobeId = typeof resolved?.id === 'string' ? resolved.id : undefined
      if (!wardrobeId) return
      if (isWardrobeStaleForSceneScript(resolved, scene, char.name)) {
        if (resolved?.needsImageRegen !== true) {
          staleWardrobeIds.add(wardrobeId)
        }
        const extracted = extractSceneWardrobeAndAppearanceNotes(scene, char.name)
        if (extracted.appearanceNotes) {
          const list = appendedAppearanceByWardrobeId.get(wardrobeId) ?? []
          list.push(extracted.appearanceNotes)
          appendedAppearanceByWardrobeId.set(wardrobeId, list)
        }
      }
    })

    if (staleWardrobeIds.size === 0) return char

    changed = true
    staledWardrobeCount += staleWardrobeIds.size
    const nextWardrobes = wardrobes.map((w: any) => {
      if (!w?.id || !staleWardrobeIds.has(w.id)) return w
      const newAppNotes = appendedAppearanceByWardrobeId.get(w.id)
      const mergedAppearanceNotes = newAppNotes?.length
        ? [w.appearanceNotes?.trim(), ...newAppNotes]
            .filter(Boolean)
            .filter((val, idx, arr) => arr.indexOf(val) === idx)
            .join('; ')
        : w.appearanceNotes
      return {
        ...w,
        needsImageRegen: true,
        ...(mergedAppearanceNotes ? { appearanceNotes: mergedAppearanceNotes } : {}),
      }
    })

    return {
      ...char,
      wardrobes: nextWardrobes,
    }
  })

  // 2. Push newly introduced non-narrator cast members from the script
  const extracted = extractCharactersFromScenes(safeScenes)
  const addedCharacters: Character[] = []
  const addedNames: string[] = []

  for (const candidate of extracted) {
    if (!candidate.name || candidate.role === 'narrator' || candidate.type === 'narrator') {
      continue
    }
    const norm = normalizeCharacterName(candidate.name)
    if (!norm || existingNormalized.has(norm)) continue
    existingNormalized.add(norm)

    const slug = norm.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'cast'
    const charId = `char-${slug}-${Date.now().toString(36)}`

    // Collect any initial wardrobe/appearance notes from scenes where this character appears
    const outfitParts: string[] = []
    const appearanceParts: string[] = []
    const sceneNumbers: number[] = []

    safeScenes.forEach((scene, idx) => {
      const notes = extractSceneWardrobeAndAppearanceNotes(scene, candidate.name)
      if (notes.outfitNotes) outfitParts.push(notes.outfitNotes)
      if (notes.appearanceNotes) appearanceParts.push(notes.appearanceNotes)
      if (notes.combinedNotes) sceneNumbers.push(scene?.sceneNumber ?? idx + 1)
    })

    const initialOutfit = [...new Set(outfitParts)].join('; ')
    const initialAppearance = [...new Set(appearanceParts)].join('; ')

    const initialWardrobes =
      initialOutfit || initialAppearance
        ? [
            {
              id: `wd-${slug}-default`,
              name: 'Default',
              description: initialOutfit || 'Signature character attire from script',
              ...(initialAppearance ? { appearanceNotes: initialAppearance } : {}),
              isDefault: true,
              ...(sceneNumbers.length > 0 ? { sceneNumbers: [...new Set(sceneNumbers)] } : {}),
            },
          ]
        : []

    addedCharacters.push({
      id: charId,
      name: candidate.name,
      role: 'supporting',
      type: 'supporting',
      description: candidate.description || 'Character from script',
      ...(initialWardrobes.length > 0 ? { wardrobes: initialWardrobes } : {}),
    })
    addedNames.push(candidate.name)
  }

  if (addedCharacters.length > 0) {
    changed = true
  }

  return {
    characters: changed ? [...updatedExisting, ...addedCharacters] : safeExisting,
    changed,
    addedNames,
    staledWardrobeCount,
  }
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

