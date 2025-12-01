import { NextRequest, NextResponse } from 'next/server'
import Project from '@/models/Project'
import UserProviderConfig from '@/models/UserProviderConfig'
import { sequelize } from '@/config/database'
import { generateImageWithGemini } from '@/lib/gemini/imageClient'
import { uploadImageToBlob } from '@/lib/storage/blob'

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
            prompt
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
  const baseDescription = character.description || ''
  const age = character.age ? `, ${character.age}` : ''
  const personality = character.personality ? `, ${character.personality} expression` : ''
  
  return `Professional character reference sheet, full body portrait, ${baseDescription}${age}${personality}, neutral gray background, high detail, consistent lighting, front facing view, character design, concept art style, photorealistic, 8k quality`
}

async function generateCharacterImage(params: {
  userId: string
  provider: string
  apiKey: string
  prompt: string
}): Promise<string> {
  // Use Gemini API for character generation (platform API key)
  console.log('[Character Gen] Using Gemini 3 Pro Image (platform API key)')
  
  const base64Image = await generateImageWithGemini(params.prompt, {
    aspectRatio: '1:1', // Portrait aspect ratio
    numberOfImages: 1,
    imageSize: '2K' // Higher quality for character references
  })
  
  const blobUrl = await uploadImageToBlob(
    base64Image,
    `characters/char-${Date.now()}.png`
  )
  
  return blobUrl
}

// Old provider functions removed - now using Gemini API for all character images
// BYOK will be re-implemented later with user's Gemini API keys

