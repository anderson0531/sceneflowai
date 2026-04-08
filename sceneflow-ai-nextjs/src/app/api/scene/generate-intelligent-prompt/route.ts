import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Project from '../../../../models/Project'
import { sequelize } from '../../../../config/database'
import { extractLocation } from '@/lib/script/formatSceneHeading'
import {
  generateSceneImagePrompt,
  detectSceneType,
  extractDirectionMetadata,
  type CharacterContext,
  type PropContext,
  type LocationContext,
} from '@/lib/intelligence/scene-image-intelligence'
import { stripEmotionalDescriptors } from '@/lib/imagen/promptOptimizer'

export const runtime = 'nodejs'
export const maxDuration = 120

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const {
      projectId,
      sceneIndex,
      scenePrompt,
      customPrompt,
      characters,
      selectedCharacters,
      artStyle,
      objectReferences = [],
      locationReferences = [],
      skipObjectAutoDetection = false,
      excludeCharacters = false
    } = body

    const characterArray = excludeCharacters ? [] : (characters || selectedCharacters || [])
    let characterObjects = characterArray.filter((c: any) => c != null)

    if (!projectId || typeof sceneIndex !== 'number') {
      return NextResponse.json({ error: 'Missing projectId or sceneIndex' }, { status: 400 })
    }

    let project = null
    try {
      project = await Project.findByPk(projectId)
    } catch (dbError) {
      console.error('[Generate Intelligent Prompt] Database error:', dbError)
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 })
    }

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // 1. Establish full scene context
    let fullSceneContext = scenePrompt || ''
    let sceneData: any = null
    const scenes = project.metadata?.visionPhase?.script?.script?.scenes || []
    const scene = scenes[sceneIndex]
    
    if (scene) {
      sceneData = scene
      const sceneDirectionText = scene.sceneDirectionText || ''
      if (customPrompt && customPrompt.trim()) {
        fullSceneContext = customPrompt
      } else if (sceneDirectionText && sceneDirectionText.trim()) {
        fullSceneContext = sceneDirectionText
      } else if (scenePrompt && scenePrompt.trim()) {
        fullSceneContext = scenePrompt
      } else {
        fullSceneContext = scene.action || scene.visualDescription || scene.heading || ''
        if (scene.action && scene.visualDescription && scene.action !== scene.visualDescription) {
          fullSceneContext = `${scene.action} ${scene.visualDescription}`
        }
      }
    } else {
      return NextResponse.json({ error: 'Scene not found' }, { status: 404 })
    }

    // 2. Gather available references
    let detectedObjectReferences = objectReferences || []
    let matchedLocationReference: any = locationReferences.length > 0 ? locationReferences[0] : null
    
    const projectObjectRefs = project.metadata?.visionPhase?.references?.objectReferences || []
    const projectLocationRefs = project.metadata?.visionPhase?.references?.locationReferences || []
    
    const autoDetectObjects = detectedObjectReferences.length === 0 && !skipObjectAutoDetection
    const autoDetectLocations = !matchedLocationReference

    // 3. Build character contexts
    let gcsRefIndex = 0
    const characterContexts: CharacterContext[] = characterObjects.map((char: any) => {
      const rawDescription = char.visionDescription || char.appearanceDescription || 
        `${char.ethnicity || ''} ${char.subject || 'person'}`.trim()
      const description = stripEmotionalDescriptors(rawDescription)

      let referenceId
      if (char.referenceImage && char.referenceImage.startsWith('https://')) {
        gcsRefIndex++
        referenceId = gcsRefIndex
      }

      return {
        name: char.name,
        linkingDescription: `person [${referenceId || 1}]: ${description}`,
        appearanceDescription: description,
        wardrobeDescription: char.defaultWardrobe,
        wardrobeAccessories: char.wardrobeAccessories,
        hasReferenceImage: !!referenceId,
        referenceIndex: referenceId,
        hasCostumeReference: !!char.hasCostumeReference,
      }
    })

    // 4. Build available prop and location contexts
    const propsToPassToAI = autoDetectObjects 
      ? projectObjectRefs.map((obj: any) => ({
          name: obj.name,
          description: obj.description,
          category: obj.category,
          importance: obj.importance,
          hasReferenceImage: !!obj.imageUrl,
        }))
      : detectedObjectReferences.map((obj: any) => ({
          name: obj.name,
          description: obj.description,
          category: obj.category,
          importance: obj.importance,
          hasReferenceImage: !!obj.imageUrl,
        }))

    const availableLocationsContext: LocationContext[] = projectLocationRefs.map((locRef: any) => ({
      name: locRef.location || locRef.name || 'Unknown location',
      hasReferenceImage: !!locRef.imageUrl,
    }))

    const locationsToPassToAI = autoDetectLocations ? availableLocationsContext : (matchedLocationReference ? [{
      name: matchedLocationReference.location || matchedLocationReference.name || 'Unknown location',
      hasReferenceImage: !!matchedLocationReference.imageUrl,
    }] : [])

    const totalAvailableRefImages = 
      characterContexts.filter(r => r.hasReferenceImage).length +
      propsToPassToAI.filter((o: any) => o.hasReferenceImage).length +
      locationsToPassToAI.filter((l: any) => l.hasReferenceImage).length

    // 5. Film Context and Scene Type
    const treatment = project.metadata?.visionPhase?.treatment || project.metadata?.treatmentPhase
    const filmContext = {
      title: project.metadata?.title || project.title || undefined,
      logline: treatment?.logline || treatment?.synopsis || undefined,
      genre: treatment?.genre ? (Array.isArray(treatment.genre) ? treatment.genre : [treatment.genre]) : undefined,
      tone: treatment?.tone || undefined,
      visualStyle: treatment?.visualStyle || undefined,
    }
    const sceneType = detectSceneType(sceneData.heading || '', fullSceneContext, sceneIndex + 1, scenes.length)
    const directionMetadata = extractDirectionMetadata(sceneData.sceneDirection)

    // 6. Call Gemini intelligence
    const aiResult = await generateSceneImagePrompt({
      sceneHeading: sceneData.heading || '',
      sceneAction: fullSceneContext,
      sceneNumber: sceneIndex + 1,
      totalScenes: scenes.length,
      filmContext,
      sceneType,
      directionMetadata,
      characters: characterContexts,
      props: propsToPassToAI,
      availableLocations: locationsToPassToAI,
      artStyle: artStyle || 'photorealistic',
      referenceImageCount: totalAvailableRefImages,
      projectId
    })

    return NextResponse.json({
      success: true,
      result: aiResult
    })

  } catch (error: any) {
    console.error('[Generate Intelligent Prompt] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' }, 
      { status: 500 }
    )
  }
}
