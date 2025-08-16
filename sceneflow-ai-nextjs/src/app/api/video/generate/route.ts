import { NextRequest, NextResponse } from 'next/server'
import { UserProviderConfig } from '@/models/UserProviderConfig'
import { EncryptionService } from '@/services/EncryptionService'

export interface VideoGenerationRequest {
  sceneDirections: Array<{
    scene_number: number
    video_clip_prompt: string
    duration: number
    strength_rating: number
  }>
  userId: string
  projectId: string
  projectContext: {
    title: string
    genre: string
    tone: string
    targetAudience: string
  }
  generationSettings: {
    quality: 'standard' | 'high' | 'ultra'
    format: 'mp4' | 'mov' | 'webm'
    aspectRatio: '16:9' | '9:16' | '1:1' | '4:3'
    frameRate: '24' | '30' | '60'
  }
}

export interface VideoGenerationResponse {
  success: boolean
  generationId?: string
  clips?: Array<{
    scene_number: number
    clip_id: string
    status: 'queued' | 'rendering' | 'done' | 'failed'
    progress?: number
    estimated_completion?: Date
    error?: string
  }>
  error?: string
  metadata?: {
    totalClips: number
    estimatedTotalDuration: number
    provider: string
    generationStartedAt: Date
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: VideoGenerationRequest = await request.json()
    const { sceneDirections, userId, projectId, projectContext, generationSettings } = body

    // Validate request
    if (!sceneDirections || sceneDirections.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No scene directions provided'
      }, { status: 400 })
    }

    if (!userId || !projectId) {
      return NextResponse.json({
        success: false,
        error: 'Missing user ID or project ID'
      }, { status: 400 })
    }

    // Check for valid Video Generation BYOK configuration
    let videoProvider = null
    let apiKey = null
    let providerName = null

    try {
      // Check for RunwayML first (preferred)
      const runwayConfig = await UserProviderConfig.findOne({
        where: {
          user_id: userId,
          provider_name: 'RUNWAY_ML',
          is_valid: true
        }
      })

      if (runwayConfig && runwayConfig.encrypted_credentials) {
        const decryptedCredentials = EncryptionService.decrypt(runwayConfig.encrypted_credentials)
        const credentials = JSON.parse(decryptedCredentials)
        if (credentials.apiKey) {
          videoProvider = 'RUNWAY_ML'
          apiKey = credentials.apiKey
          providerName = 'RunwayML'
        }
      }

      // Fallback to Stability AI if RunwayML not available
      if (!videoProvider) {
        const stabilityConfig = await UserProviderConfig.findOne({
          where: {
            user_id: userId,
            provider_name: 'STABILITY_AI',
            is_valid: true
          }
        })

        if (stabilityConfig && stabilityConfig.encrypted_credentials) {
          const decryptedCredentials = EncryptionService.decrypt(stabilityConfig.encrypted_credentials)
          const credentials = JSON.parse(decryptedCredentials)
          if (credentials.apiKey) {
            videoProvider = 'STABILITY_AI'
            apiKey = credentials.apiKey
            providerName = 'Stability AI'
          }
        }
      }

      // Final fallback to Google Veo
      if (!videoProvider) {
        const veoConfig = await UserProviderConfig.findOne({
          where: {
            user_id: userId,
            provider_name: 'GOOGLE_VEO',
            is_valid: true
          }
        })

        if (veoConfig && veoConfig.encrypted_credentials) {
          const decryptedCredentials = EncryptionService.decrypt(veoConfig.encrypted_credentials)
          const credentials = JSON.parse(decryptedCredentials)
          if (credentials.apiKey) {
            videoProvider = 'GOOGLE_VEO'
            apiKey = credentials.apiKey
            providerName = 'Google Veo'
          }
        }
      }

    } catch (error) {
      console.warn('Could not retrieve video generation config:', error)
    }

    // Hard gate: No valid video generation provider found
    if (!videoProvider || !apiKey) {
      return NextResponse.json({
        success: false,
        error: 'No valid video generation API key configured. Please configure your BYOK settings for video generation (RunwayML, Stability AI, or Google Veo) before proceeding.',
        requiresConfiguration: true,
        availableProviders: ['RUNWAY_ML', 'STABILITY_AI', 'GOOGLE_VEO']
      }, { status: 403 })
    }

    // Generate unique generation ID
    const generationId = `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Initialize clips with queued status
    const clips = sceneDirections.map(scene => ({
      scene_number: scene.scene_number,
      clip_id: `clip_${generationId}_${scene.scene_number}`,
      status: 'queued' as const,
      progress: 0,
      estimated_completion: null,
      error: null
    }))

    // Calculate metadata
    const totalClips = clips.length
    const estimatedTotalDuration = sceneDirections.reduce((sum, scene) => sum + scene.duration, 0)

    // Start asynchronous video generation for each clip
    // In production, this would be handled by a background job queue
    clips.forEach(async (clip) => {
      try {
        await startVideoGeneration(
          clip.clip_id,
          sceneDirections.find(s => s.scene_number === clip.scene_number)!.video_clip_prompt,
          videoProvider,
          apiKey,
          generationSettings
        )
      } catch (error) {
        console.error(`Error starting generation for clip ${clip.clip_id}:`, error)
        // Update clip status to failed
        // In production, this would update the database
      }
    })

    return NextResponse.json({
      success: true,
      generationId,
      clips,
      metadata: {
        totalClips,
        estimatedTotalDuration,
        provider: providerName,
        generationStartedAt: new Date()
      }
    })

  } catch (error) {
    console.error('Video generation error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 })
  }
}

// Simulated video generation function
async function startVideoGeneration(
  clipId: string,
  prompt: string,
  provider: string,
  apiKey: string,
  settings: any
): Promise<void> {
  // In production, this would:
  // 1. Call the actual video generation API
  // 2. Set up webhook endpoints or polling
  // 3. Update database with status changes
  // 4. Handle progress tracking
  
  console.log(`Starting video generation for clip ${clipId} with provider ${provider}`)
  console.log(`Prompt: ${prompt}`)
  console.log(`Settings:`, settings)
  
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  // For demo purposes, we'll simulate the generation process
  // In production, this would be handled by the actual video generation service
}
