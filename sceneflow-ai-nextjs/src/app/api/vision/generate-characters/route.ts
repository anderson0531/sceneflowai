import { NextRequest, NextResponse } from 'next/server'
import Project from '@/models/Project'
import UserProviderConfig from '@/models/UserProviderConfig'
import { sequelize } from '@/config/database'
import { generateImageWithGeminiStudio } from '@/lib/gemini/geminiStudioImageClient'
import { uploadReferenceLibraryBase64Image } from '@/lib/storage/referenceLibraryStorage'
import { buildCharacterIdentityReferencePromptFromCharacter } from '@/lib/character/characterReferencePrompts'
import {
  ENHANCE_IDENTITY_ASPECT_RATIO,
  ENHANCE_IDENTITY_IMAGE_SIZE,
  ENHANCE_IDENTITY_MODEL_TIER,
  enhanceIdentityImage,
} from '@/lib/character/enhanceIdentityImage'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const { projectId, characters, userId } = await request.json()
    
    if (!projectId || !characters || !userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'projectId, characters, and userId are required' 
      }, { status: 400 })
    }

    // Ensure database connection
    await sequelize.authenticate()

    // Check user's BYOK image provider
    const provider = await getUserImageProvider(userId)
    
    if (!provider) {
      return NextResponse.json({
        success: false,
        error: 'No image generation provider configured. Please configure BYOK in settings.',
        requiresBYOK: true
      }, { status: 400 })
    }

    console.log(`[Character Gen] Generating ${characters.length} character references with ${provider.providerName}`)

    // Generate character reference images in parallel
    const characterRefs = await Promise.all(
      characters.map(async (char: any, index: number) => {
        try {
          const prompt = buildCharacterPrompt(char)
          
          const imageUrl = await generateCharacterImage({
            userId,
            provider: provider.providerName,
            apiKey: provider.apiKey,
            prompt,
            projectId,
            characterName: char.name,
            characterId: char.id,
          })
          
          return {
            ...char,
            id: char.id || `char-${index}`,
            referenceImage: imageUrl,
            prompt,
            generating: false
          }
        } catch (error) {
          console.error(`Failed to generate character ${char.name}:`, error)
          return {
            ...char,
            id: char.id || `char-${index}`,
            referenceImage: null,
            error: error instanceof Error ? error.message : 'Generation failed',
            generating: false
          }
        }
      })
    )

    // Save to project metadata
    const project = await Project.findByPk(projectId)
    if (project) {
      const metadata = project.metadata || {}
      const visionPhase = metadata.visionPhase || {}
      
      await project.update({
        metadata: {
          ...metadata,
          visionPhase: {
            ...visionPhase,
            characters: characterRefs,
            charactersGenerated: true
          }
        }
      })
    }

    return NextResponse.json({
      success: true,
      characters: characterRefs
    })
  } catch (error: any) {
    console.error('[Generate Characters] Error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to generate characters'
    }, { status: 500 })
  }
}

async function getUserImageProvider(userId: string) {
  try {
    // Check for image generation providers in priority order
    const imageProviders = ['OPENAI', 'GOOGLE_GEMINI', 'STABILITY_AI']
    
    for (const providerName of imageProviders) {
      const config = await UserProviderConfig.findOne({
        where: {
          user_id: userId,
          provider_name: providerName as any,
          is_valid: true
        }
      })
      
      if (config && config.encrypted_credentials) {
        // Decrypt credentials (simplified - in production use proper encryption service)
        const creds = JSON.parse(config.encrypted_credentials)
        const apiKey = creds.apiKey || creds.api_key || creds.key
        
        return {
          providerName,
          apiKey,
          config
        }
      }
    }
    
    return null
  } catch (error) {
    console.error('Error checking image generation providers:', error)
    return null
  }
}

function buildCharacterPrompt(character: any): string {
  return buildCharacterIdentityReferencePromptFromCharacter(character)
}

async function generateCharacterImage(params: {
  userId: string
  provider: string
  apiKey: string
  prompt: string
  projectId: string
  characterName?: string
  characterId?: string
}): Promise<string> {
  console.log('[Character Gen] Using designer-tier identity headshot (2K) + auto-enhance')

  const draftResult = await generateImageWithGeminiStudio({
    prompt: params.prompt,
    aspectRatio: ENHANCE_IDENTITY_ASPECT_RATIO,
    imageSize: ENHANCE_IDENTITY_IMAGE_SIZE,
    modelTier: ENHANCE_IDENTITY_MODEL_TIER,
  })

  const draftBase64 = `data:${draftResult.mimeType};base64,${draftResult.imageBase64}`
  const draftUrl = await uploadReferenceLibraryBase64Image(
    draftBase64,
    `characters/char-${Date.now()}.png`,
    params.projectId
  )

  const enhanced = await enhanceIdentityImage({
    sourceImageUrl: draftUrl,
    characterName: params.characterName || 'Character',
    appearanceDescription: params.prompt,
    characterId: params.characterId,
    projectId: params.projectId,
    iterationCount: 0,
    skipIterationGuard: true,
    skipPreAnalysis: true,
  })

  return enhanced.enhancedImageUrl
}

// Old provider functions removed - now using Gemini API for all character images
// BYOK will be re-implemented later with user's Gemini API keys

