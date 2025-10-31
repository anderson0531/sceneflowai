import { NextRequest, NextResponse } from 'next/server'
import { saveCharacterAttributes } from '../../../../lib/character/persistence'
import Project from '../../../../models/Project'

export const maxDuration = 30
export const runtime = 'nodejs'

interface AddCharacterRequest {
  projectId: string
  character: {
    name: string
    [key: string]: any
  }
}

interface UpdateCharacterRequest {
  projectId: string
  characterName: string
  attributes: {
    [key: string]: any
  }
}

interface DeleteCharacterRequest {
  projectId: string
  characterName: string
}

/**
 * Add a new character to the project
 */
export async function POST(req: NextRequest) {
  try {
    const { projectId, character }: AddCharacterRequest = await req.json()
    
    if (!projectId || !character?.name) {
      return NextResponse.json(
        { error: 'Missing required fields: projectId and character.name' },
        { status: 400 }
      )
    }
    
    console.log('[Character API] Adding character:', character.name)
    
    // Save character attributes using existing persistence layer
    await saveCharacterAttributes(projectId, character.name, character)
    
    return NextResponse.json({
      success: true,
      character: character.name,
      generatedAt: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('[Character API] POST Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to add character' },
      { status: 500 }
    )
  }
}

/**
 * Update an existing character
 */
export async function PUT(req: NextRequest) {
  try {
    const { projectId, characterName, attributes }: UpdateCharacterRequest = await req.json()
    
    if (!projectId || !characterName || !attributes) {
      return NextResponse.json(
        { error: 'Missing required fields: projectId, characterName, and attributes' },
        { status: 400 }
      )
    }
    
    console.log('[Character API] Updating character:', characterName)
    
    // Update character attributes using existing persistence layer
    await saveCharacterAttributes(projectId, characterName, attributes)
    
    return NextResponse.json({
      success: true,
      character: characterName,
      generatedAt: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('[Character API] PUT Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update character' },
      { status: 500 }
    )
  }
}

/**
 * Delete a character from the project
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('projectId')
    const characterName = searchParams.get('characterName')
    
    if (!projectId || !characterName) {
      return NextResponse.json(
        { error: 'Missing required fields: projectId and characterName' },
        { status: 400 }
      )
    }
    
    console.log('[Character API] Deleting character:', characterName)
    
    // Get project
    const project = await Project.findByPk(projectId)
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }
    
    const metadata = project.metadata || {}
    const visionPhase = metadata.visionPhase || {}
    const characters = visionPhase.characters || []
    
    // Remove character by name (case-insensitive)
    const filteredCharacters = characters.filter(
      (c: any) => normalizeCharacterName(c.name) !== normalizeCharacterName(characterName)
    )
    
    // Update project
    await project.update({
      metadata: {
        ...metadata,
        visionPhase: {
          ...visionPhase,
          characters: filteredCharacters,
        },
      },
    })
    
    console.log(`[Character API] Deleted character: ${characterName}`)
    
    return NextResponse.json({
      success: true,
      character: characterName,
      generatedAt: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('[Character API] DELETE Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete character' },
      { status: 500 }
    )
  }
}

/**
 * Normalize character name for comparison
 */
function normalizeCharacterName(name: string): string {
  if (!name) return ''
  
  // Remove voice-over indicators: (V.O.), (O.S.), (O.C.), (CONT'D)
  let normalized = name.replace(/\s*\([^)]*\)\s*/g, '').trim()
  
  // Convert to uppercase for case-insensitive comparison
  normalized = normalized.toUpperCase()
  
  // Remove extra whitespace
  normalized = normalized.replace(/\s+/g, ' ')
  
  return normalized
}

