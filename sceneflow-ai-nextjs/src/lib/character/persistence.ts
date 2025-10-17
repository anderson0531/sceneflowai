import Project from '../../models/Project'

export interface EnhancedCharacter {
  // Core Identity
  name: string
  role: string  // protagonist, antagonist, supporting
  age?: string
  gender?: string
  ethnicity?: string
  
  // Physical Appearance
  appearance: string
  hairStyle?: string
  hairColor?: string
  eyeColor?: string
  build?: string
  height?: string
  distinctiveFeatures?: string
  
  // Personality & Demeanor
  demeanor: string
  personality?: string
  voiceCharacteristics?: string
  
  // Visual Presentation
  clothing: string
  clothingStyle?: string
  accessories?: string
  
  // Reference & Generation
  description: string
  imagePrompt?: string
  referenceImage?: string | null
  generating?: boolean
  
  // Metadata
  firstAppearance?: number
  lastModified?: string
  version?: number
}

/**
 * Save character attributes to project metadata
 */
export async function saveCharacterAttributes(
  projectId: string,
  characterName: string,
  attributes: Partial<EnhancedCharacter>
): Promise<void> {
  const project = await Project.findByPk(projectId)
  if (!project) {
    throw new Error('Project not found')
  }

  const metadata = project.metadata || {}
  const visionPhase = metadata.visionPhase || {}
  const characters = visionPhase.characters || []
  
  // Find existing character or add new one
  const existingIndex = characters.findIndex(
    (c: any) => c.name?.toLowerCase() === characterName.toLowerCase()
  )
  
  if (existingIndex >= 0) {
    // Update existing character
    characters[existingIndex] = {
      ...characters[existingIndex],
      ...attributes,
      lastModified: new Date().toISOString(),
      version: (characters[existingIndex].version || 1) + 1,
    }
  } else {
    // Add new character
    characters.push({
      ...attributes,
      name: characterName,
      version: 1,
      lastModified: new Date().toISOString(),
    })
  }
  
  // Save to database
  await project.update({
    metadata: {
      ...metadata,
      visionPhase: {
        ...visionPhase,
        characters,
      },
    },
  })
  
  console.log(`[Character Persistence] Saved character: ${characterName}`)
}

/**
 * Get character attributes from project metadata
 */
export async function getCharacterAttributes(
  projectId: string,
  characterName: string
): Promise<EnhancedCharacter | null> {
  const project = await Project.findByPk(projectId)
  if (!project) {
    return null
  }

  const metadata = project.metadata || {}
  const visionPhase = metadata.visionPhase || {}
  const characters = visionPhase.characters || []
  
  const character = characters.find(
    (c: any) => c.name?.toLowerCase() === characterName.toLowerCase()
  )
  
  return character || null
}

/**
 * Get all characters for a project
 */
export async function getAllCharacters(
  projectId: string
): Promise<EnhancedCharacter[]> {
  const project = await Project.findByPk(projectId)
  if (!project) {
    return []
  }

  const metadata = project.metadata || {}
  const visionPhase = metadata.visionPhase || {}
  
  return visionPhase.characters || []
}

/**
 * Sync characters from Film Treatment to Vision Phase
 */
export async function syncCharactersFromTreatment(
  projectId: string
): Promise<void> {
  const project = await Project.findByPk(projectId)
  if (!project) {
    throw new Error('Project not found')
  }

  const metadata = project.metadata || {}
  const filmTreatment = metadata.filmTreatmentVariant
  const treatmentCharacters = filmTreatment?.character_descriptions || []
  
  if (treatmentCharacters.length === 0) {
    return
  }
  
  const visionPhase = metadata.visionPhase || {}
  const existingCharacters = visionPhase.characters || []
  
  // Merge treatment characters with existing, preserving any user modifications
  const mergedCharacters = treatmentCharacters.map((tc: any) => {
    const existing = existingCharacters.find(
      (ec: any) => ec.name?.toLowerCase() === tc.name?.toLowerCase()
    )
    
    if (existing) {
      // Preserve user modifications, only update if fields are empty
      return {
        ...tc,
        ...existing,
        // Always update metadata from treatment if not modified by user
        version: existing.version || 1,
        lastModified: existing.lastModified || new Date().toISOString(),
      }
    } else {
      // New character from treatment
      return {
        ...tc,
        version: 1,
        lastModified: new Date().toISOString(),
      }
    }
  })
  
  await project.update({
    metadata: {
      ...metadata,
      visionPhase: {
        ...visionPhase,
        characters: mergedCharacters,
      },
    },
  })
  
  console.log(`[Character Sync] Synced ${mergedCharacters.length} characters from treatment`)
}

