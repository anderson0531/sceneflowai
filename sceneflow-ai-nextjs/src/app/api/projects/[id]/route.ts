import { NextRequest, NextResponse } from 'next/server'
import Project from '@/models/Project'
import { sequelize } from '@/config/database'

// Increase timeout for large project updates
export const maxDuration = 60 // 60 seconds timeout

// UUID v4 regex pattern for validation
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Validate UUID format - reject placeholder IDs like 'new-project'
    if (!id || !UUID_REGEX.test(id)) {
      console.warn(`[Projects GET by ID] Invalid project ID format: ${id}`)
      return NextResponse.json(
        { error: 'Invalid project ID format' },
        { status: 400 }
      )
    }
    
    await sequelize.authenticate()
    
    // Force fresh read from database - bypass any Sequelize caching
    // Use raw query to ensure we always get the latest data
    const project = await Project.findByPk(id, {
      // Disable Sequelize's internal caching
      rejectOnEmpty: false,
      // Force a fresh read
      lock: false,
      // Don't use transaction cache
      useMaster: true
    })
    
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }
    
    // Reload to get fresh data from database
    await project.reload()
    
    // Return project with formatted fields (matching /api/projects route format)
    const response = NextResponse.json({ 
      success: true, 
      project: {
        id: project.id,
        title: project.title,
        description: project.description || '',
        currentStep: project.current_step || 'ideation',
        progress: project.step_progress?.overall || 0,
        status: project.status || 'draft',
        createdAt: project.created_at,
        updatedAt: project.updated_at,
        completedSteps: Object.entries(project.step_progress || {})
          .filter(([_, v]) => v === 100)
          .map(([k]) => k),
        metadata: project.metadata || {}
      }
    })
    
    // Add cache control headers to prevent any caching
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0, private')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    response.headers.set('X-Content-Type-Options', 'nosniff')
    
    // Log direction data for debugging intermittent issues
    const visionPhase = project.metadata?.visionPhase || {}
    const scenes = visionPhase?.script?.script?.scenes || []
    const scenesWithDirection = scenes.filter((s: any) => !!s.sceneDirection)
    const characters = visionPhase?.characters || []
    
    console.log('[Projects GET] Loaded project:', {
      id: project.id,
      title: project.title,
      // Script status
      scriptGenerated: !!visionPhase.scriptGenerated,
      hasScript: !!visionPhase?.script,
      hasScriptScript: !!visionPhase?.script?.script,
      totalScenes: scenes.length,
      scenesWithDirection: scenesWithDirection.length,
      // Character status
      charactersGenerated: !!visionPhase.charactersGenerated,
      charactersCount: characters.length,
      charactersWithRefImage: characters.filter((c: any) => !!c.referenceImage).length,
      characterDetails: characters.map((c: any) => ({
        name: c.name,
        hasRefImage: !!c.referenceImage,
        refImagePrefix: c.referenceImage ? c.referenceImage.substring(0, 40) : 'none'
      })),
      timestamp: new Date().toISOString()
    })
    
    return response
  } catch (error: any) {
    console.error('[Projects GET by ID] Error:', {
      message: error?.message,
      name: error?.name,
      code: error?.code,
      stack: error?.stack?.substring(0, 500)
    })
    
    // Provide more specific error messages
    let errorMessage = 'Failed to load project'
    let statusCode = 500
    
    if (error?.name === 'SequelizeConnectionError' || error?.code === 'ECONNREFUSED') {
      errorMessage = 'Database connection failed'
    } else if (error?.name === 'SequelizeAuthenticationError') {
      errorMessage = 'Database authentication failed'
    } else if (error?.name === 'SequelizeConnectionRefusedError') {
      errorMessage = 'Database connection refused'
    } else if (error?.message?.includes('SSL')) {
      errorMessage = 'Database SSL configuration error'
    } else if (error?.message?.includes('MaxClientsInSessionMode') || error?.message?.includes('max clients reached')) {
      errorMessage = 'Database temporarily overloaded. Please try again.'
      statusCode = 503 // Service Unavailable - indicates temporary issue
    }
    
    return NextResponse.json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error?.message : undefined
    }, { status: statusCode })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    
    console.log('[Projects PUT] Request received:', {
      projectId: id,
      hasMetadata: !!body.metadata,
      hasVisionPhase: !!body.metadata?.visionPhase,
      hasCharacters: !!body.metadata?.visionPhase?.characters,
      charactersCount: body.metadata?.visionPhase?.characters?.length || 0
    })
    
    // Log character reference images if present
    if (body.metadata?.visionPhase?.characters) {
      body.metadata.visionPhase.characters.forEach((char: any, idx: number) => {
        console.log(`[Projects PUT] Character ${idx + 1}: ${char.name}, hasReferenceImage: ${!!char.referenceImage}`)
      })
    }
    
    await sequelize.authenticate()
    
    const project = await Project.findByPk(id)
    if (!project) {
      console.error('[Projects PUT] Project not found:', id)
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }
    
    // Update project fields - deep merge metadata to preserve existing nested data
    const existingMetadata = project.metadata || {}
    let mergedMetadata = body.metadata ? { ...existingMetadata } : existingMetadata
    
    if (body.metadata) {
      // Shallow merge all top-level properties
      mergedMetadata = { ...existingMetadata, ...body.metadata }
      
      // Deep merge visionPhase if it exists in both
      if (body.metadata.visionPhase && existingMetadata.visionPhase) {
        mergedMetadata.visionPhase = {
          ...existingMetadata.visionPhase,
          ...body.metadata.visionPhase
        }
        
        // CRITICAL SAFEGUARD: Prevent accidental script deletion
        // If existing has script with scenes but incoming has fewer/no scenes, preserve existing
        const existingScript = existingMetadata.visionPhase?.script
        const incomingScript = body.metadata.visionPhase?.script
        const existingSceneCount = existingScript?.script?.scenes?.length || 0
        const incomingSceneCount = incomingScript?.script?.scenes?.length || 0
        
        // Case 1: Incoming has no script at all - preserve existing
        if (existingSceneCount > 0 && !incomingScript) {
          console.warn('[Projects PUT] PREVENTED SCRIPT DELETION (no incoming script):', {
            existingSceneCount,
            preservingExistingScript: true
          })
          mergedMetadata.visionPhase.script = existingScript
        }
        // Case 2: Incoming has script but with 0 scenes when existing has scenes
        // This could be a stale client state - preserve existing
        else if (existingSceneCount > 0 && incomingSceneCount === 0) {
          console.warn('[Projects PUT] PREVENTED SCRIPT DELETION (incoming has 0 scenes):', {
            existingSceneCount,
            incomingSceneCount,
            preservingExistingScript: true
          })
          mergedMetadata.visionPhase.script = existingScript
        }
        
        // Deep merge script if it exists in both
        if (body.metadata.visionPhase.script && existingMetadata.visionPhase.script) {
          const incomingScript = body.metadata.visionPhase.script
          const existingScript = existingMetadata.visionPhase.script
          
          mergedMetadata.visionPhase.script = {
            ...existingScript,
            ...incomingScript
          }
          
          // Deep merge script.script if it exists in both
          if (incomingScript.script && existingScript.script) {
            mergedMetadata.visionPhase.script.script = {
              ...existingScript.script,
              ...incomingScript.script
            }
            
            // Deep merge scenes array - preserve fields like sceneDirection from existing scenes
            // Use ID-based matching when available, fall back to index-based for legacy scenes
            if (incomingScript.script.scenes && existingScript.script.scenes) {
              const existingScenes = existingScript.script.scenes
              const incomingScenes = incomingScript.script.scenes
              
              // Create a map of existing scenes by ID for quick lookup
              const existingScenesById = new Map(
                existingScenes
                  .filter((s: any) => s.id || s.sceneId)
                  .map((s: any) => [s.id || s.sceneId, s])
              )
              
              mergedMetadata.visionPhase.script.script.scenes = incomingScenes.map((incomingScene: any, idx: number) => {
                // For new scenes (like cinematic scenes), just return as-is
                const incomingId = incomingScene.id || incomingScene.sceneId
                
                // If incoming scene has an ID that doesn't exist in existing scenes, it's new
                if (incomingId && !existingScenesById.has(incomingId)) {
                  // Check if it's a cinematic scene (starts with 'cinematic-')
                  if (incomingId.startsWith('cinematic-')) {
                    console.log('[Projects PUT] Preserving new cinematic scene:', incomingId)
                    return incomingScene
                  }
                }
                
                // Try to find existing scene by ID first
                let existingScene = incomingId ? existingScenesById.get(incomingId) : null
                
                // Fall back to index-based matching for legacy scenes without IDs
                if (!existingScene && idx < existingScenes.length) {
                  const existingAtIdx = existingScenes[idx]
                  // Only use index match if existing scene also has no ID
                  if (!existingAtIdx.id && !existingAtIdx.sceneId) {
                    existingScene = existingAtIdx
                  }
                }
                
                if (!existingScene) return incomingScene
                
                // Merge scene data, preserving sceneDirection if not explicitly being updated
                return {
                  ...existingScene,
                  ...incomingScene,
                  // Preserve sceneDirection from either source (incoming takes precedence)
                  sceneDirection: incomingScene.sceneDirection || existingScene.sceneDirection
                }
              })
              
              // CRITICAL FIX: Also preserve existing scenes that are NOT in the incoming payload
              // This prevents cinematic scenes (or any scenes with IDs) from being deleted by stale client state
              const incomingScenesById = new Map(
                incomingScenes
                  .filter((s: any) => s.id || s.sceneId)
                  .map((s: any) => [s.id || s.sceneId, s])
              )
              
              const preservedScenes = existingScenes.filter((existingScene: any) => {
                const existingId = existingScene.id || existingScene.sceneId
                // Preserve scenes with IDs that aren't in the incoming payload
                return existingId && !incomingScenesById.has(existingId)
              })
              
              if (preservedScenes.length > 0) {
                console.log('[Projects PUT] Preserving existing scenes not in incoming payload:', 
                  preservedScenes.map((s: any) => s.id || s.sceneId || `scene-${s.sceneNumber}`))
                
                // Append preserved scenes and re-sort by sceneNumber
                mergedMetadata.visionPhase.script.script.scenes = [
                  ...mergedMetadata.visionPhase.script.script.scenes,
                  ...preservedScenes
                ].sort((a: any, b: any) => (a.sceneNumber || 0) - (b.sceneNumber || 0))
              }
              
              console.log('[Projects PUT] Deep merged scenes:', {
                existingScenesCount: existingScenes.length,
                incomingScenesCount: incomingScenes.length,
                preservedScenesCount: preservedScenes.length,
                mergedScenesCount: mergedMetadata.visionPhase.script.script.scenes.length,
                cinematicScenes: mergedMetadata.visionPhase.script.script.scenes.filter((s: any) => s.cinematicType).length,
                mergedScenesWithDirection: mergedMetadata.visionPhase.script.script.scenes.filter((s: any) => !!s.sceneDirection).length
              })
            }
          }
        }
        
        // CRITICAL: Deep merge characters to preserve referenceImage, voiceConfig, etc.
        if (body.metadata.visionPhase.characters && existingMetadata.visionPhase.characters) {
          const existingCharacters = existingMetadata.visionPhase.characters || []
          const incomingCharacters = body.metadata.visionPhase.characters || []
          
          // Create maps for quick lookup
          const existingCharMap = new Map(existingCharacters.map((c: any) => [c.name?.toLowerCase(), c]))
          const incomingCharMap = new Map(incomingCharacters.map((c: any) => [c.name?.toLowerCase(), c]))
          
          // Merge: incoming character data takes precedence, but preserve referenceImage, voiceConfig if not provided
          const mergedCharacters = incomingCharacters.map((incomingChar: any) => {
            const existingChar = existingCharMap.get(incomingChar.name?.toLowerCase())
            if (existingChar) {
              // Preserve generated/uploaded data from existing character if not in incoming
              return {
                ...existingChar,
                ...incomingChar,
                // CRITICAL: Preserve these fields unless explicitly set in incoming
                referenceImage: incomingChar.referenceImage ?? existingChar.referenceImage,
                voiceConfig: incomingChar.voiceConfig ?? existingChar.voiceConfig,
                appearanceDescription: incomingChar.appearanceDescription ?? existingChar.appearanceDescription,
                visionDescription: incomingChar.visionDescription ?? existingChar.visionDescription,
                imageApproved: incomingChar.imageApproved ?? existingChar.imageApproved,
                defaultWardrobe: incomingChar.defaultWardrobe ?? existingChar.defaultWardrobe,
                wardrobeAccessories: incomingChar.wardrobeAccessories ?? existingChar.wardrobeAccessories,
              }
            }
            return incomingChar
          })
          
          // CRITICAL FIX: Also preserve characters that exist in DB but NOT in incoming payload
          // This prevents newly added characters from being deleted by stale client state
          const preservedCharacters = existingCharacters.filter((existingChar: any) => 
            !incomingCharMap.has(existingChar.name?.toLowerCase())
          )
          
          if (preservedCharacters.length > 0) {
            console.log('[Projects PUT] Preserving characters not in incoming payload:', 
              preservedCharacters.map((c: any) => c.name))
          }
          
          mergedMetadata.visionPhase.characters = [...mergedCharacters, ...preservedCharacters]
          
          console.log('[Projects PUT] Deep merged characters:', {
            existingCount: existingCharacters.length,
            incomingCount: incomingCharacters.length,
            preservedCount: preservedCharacters.length,
            mergedCount: mergedMetadata.visionPhase.characters.length,
            withReferenceImage: mergedMetadata.visionPhase.characters.filter((c: any) => !!c.referenceImage).length
          })
        }
        
        // CRITICAL: Deep merge references (sceneReferences/backdrops and objectReferences/props)
        // This prevents accidental overwrite when other parts of the app save with stale reference data
        const existingReferences = existingMetadata.visionPhase?.references || {}
        const incomingReferences = body.metadata.visionPhase?.references
        
        if (incomingReferences || existingReferences.sceneReferences || existingReferences.objectReferences) {
          const existingSceneRefs = existingReferences.sceneReferences || []
          const existingObjectRefs = existingReferences.objectReferences || []
          const incomingSceneRefs = incomingReferences?.sceneReferences || []
          const incomingObjectRefs = incomingReferences?.objectReferences || []
          
          // Create maps for quick lookup by ID
          const existingSceneRefMap = new Map(existingSceneRefs.map((r: any) => [r.id, r]))
          const existingObjectRefMap = new Map(existingObjectRefs.map((r: any) => [r.id, r]))
          
          // Merge scene references (backdrops): incoming takes precedence, preserve existing not in incoming
          let mergedSceneRefs = incomingSceneRefs.map((incomingRef: any) => {
            const existingRef = existingSceneRefMap.get(incomingRef.id)
            if (existingRef) {
              return { ...existingRef, ...incomingRef }
            }
            return incomingRef
          })
          
          // Preserve existing scene refs not in incoming (prevents deletion by stale state)
          const incomingSceneRefIds = new Set(incomingSceneRefs.map((r: any) => r.id))
          const preservedSceneRefs = existingSceneRefs.filter((r: any) => !incomingSceneRefIds.has(r.id))
          if (preservedSceneRefs.length > 0) {
            console.log('[Projects PUT] Preserving scene references not in incoming:', preservedSceneRefs.length)
            mergedSceneRefs = [...mergedSceneRefs, ...preservedSceneRefs]
          }
          
          // Merge object references (props): same logic
          let mergedObjectRefs = incomingObjectRefs.map((incomingRef: any) => {
            const existingRef = existingObjectRefMap.get(incomingRef.id)
            if (existingRef) {
              return { ...existingRef, ...incomingRef }
            }
            return incomingRef
          })
          
          // Preserve existing object refs not in incoming
          const incomingObjectRefIds = new Set(incomingObjectRefs.map((r: any) => r.id))
          const preservedObjectRefs = existingObjectRefs.filter((r: any) => !incomingObjectRefIds.has(r.id))
          if (preservedObjectRefs.length > 0) {
            console.log('[Projects PUT] Preserving object references not in incoming:', preservedObjectRefs.length)
            mergedObjectRefs = [...mergedObjectRefs, ...preservedObjectRefs]
          }
          
          mergedMetadata.visionPhase.references = {
            sceneReferences: mergedSceneRefs,
            objectReferences: mergedObjectRefs
          }
          
          console.log('[Projects PUT] Deep merged references:', {
            existingSceneRefs: existingSceneRefs.length,
            incomingSceneRefs: incomingSceneRefs.length,
            mergedSceneRefs: mergedSceneRefs.length,
            existingObjectRefs: existingObjectRefs.length,
            incomingObjectRefs: incomingObjectRefs.length,
            mergedObjectRefs: mergedObjectRefs.length
          })
        }
      }
    }
    
    // Explicitly mark metadata as changed to ensure JSONB update is detected
    // Sequelize sometimes doesn't detect nested changes in JSONB fields
    project.set('metadata', mergedMetadata)
    project.changed('metadata', true)
    
    await project.save()
    
    // Reload to ensure the updated data is committed and fetched fresh
    await project.reload()
    
    // Log scene direction status after update
    const scenesAfterUpdate = mergedMetadata?.visionPhase?.script?.script?.scenes || []
    const scenesWithDirectionAfter = scenesAfterUpdate.filter((s: any) => !!s.sceneDirection)
    
    // DEBUG: Log character referenceImages after save
    const charactersAfterSave = (project.metadata as any)?.visionPhase?.characters || []
    console.log('[Projects PUT] Characters after save:', charactersAfterSave.map((c: any) => ({
      name: c.name,
      hasReferenceImage: !!c.referenceImage,
      referenceImageUrl: c.referenceImage ? c.referenceImage.substring(0, 60) + '...' : 'none'
    })))
    
    console.log('[Projects PUT] Project updated successfully:', {
      projectId: id,
      charactersInDb: mergedMetadata?.visionPhase?.characters?.length || 0,
      scenesWithDirection: scenesWithDirectionAfter.length,
      totalScenes: scenesAfterUpdate.length,
      timestamp: new Date().toISOString()
    })
    
    return NextResponse.json({ success: true, project })
  } catch (error: any) {
    console.error('[Projects PUT] Error:', error)
    
    // Check for pool exhaustion error
    if (error?.message?.includes('MaxClientsInSessionMode') || error?.message?.includes('max clients reached')) {
      return NextResponse.json({ 
        error: 'Database temporarily overloaded. Please try again.',
        retryable: true
      }, { status: 503 })
    }
    
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 })
  }
}

// PATCH handler for atomic audio updates
// This prevents stale client state from overwriting server-saved audio
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    
    // Validate UUID format
    if (!id || !UUID_REGEX.test(id)) {
      return NextResponse.json(
        { error: 'Invalid project ID format' },
        { status: 400 }
      )
    }
    
    await sequelize.authenticate()
    
    const project = await Project.findByPk(id)
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }
    
    // Handle atomic audio update
    if (body.atomicAudioUpdate) {
      const { sceneIndex, audioType, audioUrl, sfxIndex } = body.atomicAudioUpdate
      
      console.log('[Projects PATCH] Atomic audio update:', {
        projectId: id,
        sceneIndex,
        audioType,
        audioUrl: audioUrl?.substring(0, 60) + '...',
        sfxIndex
      })
      
      // Get fresh metadata from database
      const metadata = project.metadata || {}
      
      // Find scenes - check both possible locations
      let scenes = metadata?.visionPhase?.script?.script?.scenes
      let scenePath = 'nested' // script.script.scenes
      
      if (!scenes || !Array.isArray(scenes)) {
        scenes = metadata?.visionPhase?.script?.scenes
        scenePath = 'flat' // script.scenes
      }
      
      if (!scenes || !Array.isArray(scenes) || sceneIndex >= scenes.length) {
        return NextResponse.json({ 
          error: 'Invalid scene index or scenes not found' 
        }, { status: 400 })
      }
      
      // Update the specific audio field atomically
      const scene = scenes[sceneIndex]
      
      if (audioType === 'music') {
        scene.musicAudio = audioUrl
        console.log(`[Projects PATCH] Updated musicAudio for scene ${sceneIndex}`)
      } else if (audioType === 'sfx' && sfxIndex !== undefined) {
        // Ensure sfxAudio array exists
        if (!scene.sfxAudio) {
          scene.sfxAudio = []
        }
        scene.sfxAudio[sfxIndex] = audioUrl
        
        // Also update the sfx item if it exists
        if (scene.sfx && scene.sfx[sfxIndex]) {
          if (typeof scene.sfx[sfxIndex] === 'string') {
            scene.sfx[sfxIndex] = {
              description: scene.sfx[sfxIndex],
              audioUrl
            }
          } else {
            scene.sfx[sfxIndex].audioUrl = audioUrl
          }
        }
        console.log(`[Projects PATCH] Updated sfxAudio[${sfxIndex}] for scene ${sceneIndex}`)
      }
      
      // Update the scenes back to the correct location
      if (scenePath === 'nested') {
        metadata.visionPhase.script.script.scenes = scenes
      } else {
        metadata.visionPhase.script.scenes = scenes
      }
      
      // Save atomically
      project.set('metadata', metadata)
      project.changed('metadata', true)
      await project.save()
      
      console.log('[Projects PATCH] Atomic audio update saved successfully')
      
      return NextResponse.json({ 
        success: true, 
        message: 'Audio updated atomically',
        sceneIndex,
        audioType,
        sfxIndex
      })
    }
    
    return NextResponse.json({ 
      error: 'No valid operation specified. Use atomicAudioUpdate.' 
    }, { status: 400 })
    
  } catch (error: any) {
    console.error('[Projects PATCH] Error:', error)
    return NextResponse.json({ 
      error: 'Failed to update project',
      details: process.env.NODE_ENV === 'development' ? error?.message : undefined
    }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const timestamp = new Date().toISOString()
  
  try {
    console.log(`[${timestamp}] [DELETE /api/projects/[id]] Request received`)
    
    // Await params in Next.js 15
    const { id } = await params
    console.log(`[${timestamp}] [DELETE /api/projects/[id]] Params:`, { id })
    
    if (!id) {
      console.log(`[${timestamp}] [DELETE /api/projects/[id]] Missing project ID`)
      return NextResponse.json({ 
        success: false, 
        error: 'Project ID is required' 
      }, { status: 400 })
    }

    // Ensure database connection
    console.log(`[${timestamp}] [DELETE /api/projects/[id]] Authenticating database connection...`)
    await sequelize.authenticate()
    console.log(`[${timestamp}] [DELETE /api/projects/[id]] Database authenticated`)
    
    console.log(`[${timestamp}] [DELETE /api/projects/[id]] Attempting to delete project:`, id)

    const deleted = await Project.destroy({ where: { id } })
    console.log(`[${timestamp}] [DELETE /api/projects/[id]] Deleted count:`, deleted)
    
    if (deleted === 0) {
      console.log(`[${timestamp}] [DELETE /api/projects/[id]] Project not found:`, id)
      return NextResponse.json({ 
        success: false, 
        error: 'Project not found' 
      }, { status: 404 })
    }
    
    console.log(`[${timestamp}] [DELETE /api/projects/[id]] Project deleted successfully:`, id)
    console.log(`[${timestamp}] [DELETE /api/projects/[id]] Sending success response`)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(`[${timestamp}] [DELETE /api/projects/[id]] Error:`, error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Delete failed' 
    }, { status: 500 })
  }
}

