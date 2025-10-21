import { NextRequest, NextResponse } from 'next/server'
import Project from '@/models/Project'
import UserProviderConfig from '@/models/UserProviderConfig'
import { sequelize } from '@/config/database'
import { callVertexAIImagen } from '@/lib/vertexai/client'
import { uploadImageToBlob } from '@/lib/storage/blob'
import { optimizePromptForImagen } from '@/lib/imagen/promptOptimizer'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const { projectId, scenes, characters, userId } = await request.json()
    
    if (!projectId || !scenes || !userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'projectId, scenes, and userId are required' 
      }, { status: 400 })
    }

    // Ensure database connection
    await sequelize.authenticate()

    // TODO: BYOK - Check user's provider when BYOK is implemented
    // For now, use platform Vertex AI service account for all scene images
    console.log(`[Scene Gen] Generating ${scenes.length} scene images with Vertex AI Imagen 3`)

    // Filter characters with GCS references
    const charactersWithGCS = (characters || []).filter((c: any) => c.referenceImageGCS)
    console.log(`[Scene Gen] Found ${charactersWithGCS.length} characters with GCS references`)

    // Generate scene images with Vertex AI
    const sceneImages = await Promise.all(
      scenes.map(async (scene: any, index: number) => {
        try {
          const prompt = buildScenePrompt(scene, characters)
          
          // Build optimized prompt with GCS references
          const sceneCharacterNames = scene.characters || []
          let finalPrompt = prompt
          
          if (charactersWithGCS.length > 0) {
            try {
              finalPrompt = await optimizePromptForImagen({
                rawPrompt: prompt,
                sceneAction: scene.action || '',
                visualDescription: scene.visualDescription || prompt,
                characterNames: sceneCharacterNames,
                hasCharacterReferences: true,
                characterMetadata: charactersWithGCS.map((char: any) => ({
                  name: char.name,
                  referenceImageGCS: char.referenceImageGCS,
                  appearanceDescription: char.appearanceDescription || `${char.ethnicity || ''} ${char.subject || 'person'}`.trim()
                }))
              })
            } catch (error) {
              console.error(`[Scene Gen] Prompt optimizer failed for scene ${index + 1}:`, error)
            }
          }
          
          // Use Vertex AI with GCS references embedded in prompt
          const base64Image = await callVertexAIImagen(finalPrompt, {
            aspectRatio: '16:9',
            numberOfImages: 1
          })
          
          const imageUrl = await uploadImageToBlob(
            base64Image,
            `scenes/${projectId}-scene-${index + 1}-${Date.now()}.png`
          )
          
          return {
            ...scene,
            sceneNumber: index + 1,
            imageUrl,
            prompt,
            generating: false
          }
        } catch (error) {
          console.error(`Failed to generate scene ${index + 1}:`, error)
          return {
            ...scene,
            sceneNumber: index + 1,
            imageUrl: null,
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
            scenes: sceneImages,
            scenesGenerated: true
          }
        }
      })
    }

    return NextResponse.json({
      success: true,
      scenes: sceneImages
    })
  } catch (error: any) {
    console.error('[Generate Scenes] Error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to generate scenes'
    }, { status: 500 })
  }
}

async function getUserImageProvider(userId: string) {
  try {
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

function buildScenePrompt(scene: any, characters: any[]): string {
  // Find character descriptions for this scene
  const sceneCharacterNames = scene.characters || []
  const sceneCharacters = sceneCharacterNames
    .map((name: string) => characters?.find((c: any) => c.name === name))
    .filter(Boolean)
  
  // Build character descriptions with reference image URLs
  let charDescriptions = ''
  if (sceneCharacters.length > 0) {
    const charParts = sceneCharacters.map((c: any) => {
      let desc = c.name
      if (c.referenceImage) {
        desc += ` (Reference Image: ${c.referenceImage})`
      }
      // Add physical attributes
      const attrs = []
      if (c.ethnicity) attrs.push(c.ethnicity)
      if (c.keyFeature) attrs.push(c.keyFeature)
      if (c.hairStyle) attrs.push(`${c.hairColor || ''} ${c.hairStyle}`.trim())
      if (c.build) attrs.push(c.build)
      
      if (attrs.length > 0) {
        desc += `: ${attrs.join(', ')}`
      } else if (c.description) {
        desc += `: ${c.description}`
      }
      return desc
    })
    charDescriptions = `, featuring ${charParts.join('; ')}`
  }
  
  const visualDesc = scene.visualDescription || scene.action || ''
  const location = scene.heading || ''
  
  const prompt = `Cinematic film still, ${visualDesc}${charDescriptions}, ${location}, professional film production, high quality cinematography, detailed, photorealistic, 8k, film grain, cinematic lighting, wide angle lens${sceneCharacters.some((c: any) => c.referenceImage) ? ', MATCH CHARACTER REFERENCE IMAGES EXACTLY' : ''}`
  
  return prompt.slice(0, 4000) // Limit for most providers
}

async function generateSceneImage(params: {
  userId: string
  provider: string
  apiKey: string
  prompt: string
}): Promise<string> {
  const { provider, apiKey, prompt } = params
  
  switch (provider) {
    case 'OPENAI':
      return await generateWithDALLE(apiKey, prompt)
    case 'GOOGLE_GEMINI':
      return await generateWithGemini(apiKey, prompt)
    case 'STABILITY_AI':
      return await generateWithStability(apiKey, prompt)
    default:
      throw new Error(`Unsupported provider: ${provider}`)
  }
}

async function generateWithDALLE(apiKey: string, prompt: string): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt: prompt.slice(0, 4000),
      size: '1792x1024', // 16:9 aspect ratio
      quality: 'hd',
      style: 'natural',
      n: 1
    })
  })
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error?.message || `DALL-E API error: ${response.status}`)
  }
  
  const data = await response.json()
  return data.data[0].url
}

async function generateWithGemini(apiKey: string, prompt: string): Promise<string> {
  // Use Vertex AI Imagen 3 (same as thumbnail generation)
  console.log('[Scene Gen] Using Vertex AI Imagen 3 for scene image')
  
  const base64Image = await callVertexAIImagen(prompt, {
    aspectRatio: '16:9',
    numberOfImages: 1
  })
  
  // Upload to Vercel Blob and return URL
  const blobUrl = await uploadImageToBlob(
    base64Image,
    `scenes/scene-${Date.now()}.png`
  )
  
  return blobUrl
}

async function generateWithStability(apiKey: string, prompt: string): Promise<string> {
  const response = await fetch(
    'https://api.stability.ai/v2beta/stable-image/generate/core',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        prompt,
        output_format: 'png',
        aspect_ratio: '16:9'
      })
    }
  )
  
  if (!response.ok) {
    throw new Error(`Stability AI API error: ${response.status}`)
  }
  
  const data = await response.json()
  return data.image ? `data:image/png;base64,${data.image}` : ''
}

