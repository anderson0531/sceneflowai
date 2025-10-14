import { NextRequest, NextResponse } from 'next/server'
import Project from '@/models/Project'
import UserProviderConfig from '@/models/UserProviderConfig'
import { sequelize } from '@/config/database'

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
      prompt: prompt.slice(0, 4000), // DALL-E limit
      size: '1024x1024',
      quality: 'hd',
      style: 'vivid',
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
  // Gemini Imagen 3 API call
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{
          prompt: prompt
        }],
        parameters: {
          sampleCount: 1,
          aspectRatio: '1:1',
          safetyFilterLevel: 'block_few',
          personGeneration: 'allow_adult'
        }
      })
    }
  )
  
  if (!response.ok) {
    throw new Error(`Gemini Imagen API error: ${response.status}`)
  }
  
  const data = await response.json()
  // Return base64 or URL depending on Gemini's response format
  return data.predictions?.[0]?.bytesBase64Encoded 
    ? `data:image/png;base64,${data.predictions[0].bytesBase64Encoded}`
    : data.predictions?.[0]?.imageUrl || ''
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
        aspect_ratio: '1:1'
      })
    }
  )
  
  if (!response.ok) {
    throw new Error(`Stability AI API error: ${response.status}`)
  }
  
  const data = await response.json()
  return data.image ? `data:image/png;base64,${data.image}` : ''
}

