import { NextRequest, NextResponse } from 'next/server'
import { saveCharacterAttributes } from '../../../../lib/character/persistence'
import { normalizeCharacterName } from '@/lib/character/detection'
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
 * Delete a single character from the project (never cascades to base or sibling age characters)
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('projectId')
    const characterId = searchParams.get('characterId')
    const characterName = searchParams.get('characterName')
    
    if (!projectId || (!characterId && !characterName)) {
      return NextResponse.json(
        { error: 'Missing required fields: projectId and (characterId or characterName)' },
        { status: 400 }
      )
    }
    
    console.log('[Character API] Deleting character:', { characterId, characterName })
    
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
    const characters: any[] = Array.isArray(visionPhase.characters) ? visionPhase.characters : []

    const targetNormName = characterName ? normalizeCharacterName(characterName) : ''
    const hasExactIdMatch =
      Boolean(characterId) && characters.some((c: any) => String(c?.id || '') === characterId)

    const removedIds = new Set<string>()
    const filteredCharacters = characters.filter((c: any) => {
      if (hasExactIdMatch) {
        const keep = String(c?.id || '') !== characterId
        if (!keep && c?.id) removedIds.add(String(c.id))
        return keep
      }
      if (targetNormName) {
        const keep = normalizeCharacterName(c?.name || '') !== targetNormName
        if (!keep && c?.id) removedIds.add(String(c.id))
        return keep
      }
      return true
    })

    // Detach any likeness reference pointing at the deleted character without deleting other characters
    const cleanedCharacters = filteredCharacters.map((c: any) => {
      if (c?.likenessCharacterId && removedIds.has(String(c.likenessCharacterId))) {
        const next = { ...c }
        delete next.likenessCharacterId
        if (next.likenessSourceType === 'character') {
          next.likenessSourceType = 'none'
        }
        return next
      }
      return c
    })
    
    // Update project
    await project.update({
      metadata: {
        ...metadata,
        visionPhase: {
          ...visionPhase,
          characters: cleanedCharacters,
        },
      },
    })
    
    console.log(`[Character API] Deleted character:`, { characterId, characterName, remaining: cleanedCharacters.length })
    
    return NextResponse.json({
      success: true,
      character: characterName || characterId,
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

