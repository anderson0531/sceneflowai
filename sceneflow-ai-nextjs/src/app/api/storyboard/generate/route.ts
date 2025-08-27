import { NextRequest, NextResponse } from 'next/server'
import { AIProviderFactory } from '@/services/ai-providers/AIProviderFactory'
import { UserProviderConfig } from '@/models/UserProviderConfig'
import { EncryptionService } from '@/services/EncryptionService'


export interface StoryboardScene {
  scene_number: number
  description: string
  audio_cues: string
  image_prompt: string
  duration?: number
  camera_angle?: string
  lighting?: string
  mood?: string
}

export interface StoryboardGenerationRequest {
  idea: {
    id: string
    title: string
    synopsis: string
    scene_outline: string[]
    thumbnail_prompt: string
    strength_rating: number
    targetAudience?: string
    genre?: string
    tone?: string
  }
  userId: string
  projectId: string
  style?: 'cinematic' | 'documentary' | 'commercial' | 'educational' | 'artistic'
  aspectRatio?: '16:9' | '9:16' | '1:1' | '4:3'
  targetDuration?: number
  creatorTemplate?: string
}

export interface StoryboardGenerationResponse {
  success: boolean
  storyboard?: StoryboardScene[]
  error?: string
  metadata?: {
    totalScenes: number
    estimatedDuration: number
    generatedAt: Date
    llmProvider: string
    style: string
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: StoryboardGenerationRequest = await request.json()
    const { idea, userId, projectId, style = 'cinematic', aspectRatio = '16:9', targetDuration = 60, creatorTemplate } = body

    // Validate request
    if (!idea || !idea.scene_outline || idea.scene_outline.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Invalid idea data or missing scene outline'
      }, { status: 400 })
    }

    if (!userId || !projectId) {
      return NextResponse.json({
        success: false,
        error: 'Missing user ID or project ID'
      }, { status: 400 })
    }

    // Check if we have a structured template with scenes
    let templateScenes: any[] = []
    let templateUsed = false
    
    if (creatorTemplate) {
      try {
        // Try to parse the template content to see if it contains structured data
        const templateData = JSON.parse(creatorTemplate)
        if (templateData.scenes && Array.isArray(templateData.scenes)) {
          templateScenes = templateData.scenes
          templateUsed = true
          console.log(`Using template with ${templateScenes.length} scenes`)
        }
      } catch (e) {
        // If parsing fails, it's just text content, not structured
        console.log('Template is text content, not structured data')
      }
    }

    // Get user's LLM provider configuration
    let llmProvider = 'GOOGLE_GEMINI' // Default fallback
    let apiKey = process.env.GOOGLE_GEMINI_API_KEY

    try {
      const userConfig = await UserProviderConfig.findOne({
        where: {
          user_id: userId,
          provider_name: 'GOOGLE_GEMINI',
          is_valid: true
        }
      })

      if (userConfig && userConfig.encrypted_credentials) {
        const decryptedCredentials = EncryptionService.decrypt(userConfig.encrypted_credentials)
        const credentials = JSON.parse(decryptedCredentials)
        if (credentials.apiKey) {
          apiKey = credentials.apiKey
          llmProvider = 'GOOGLE_GEMINI'
        }
      }
    } catch (error) {
      console.warn('Could not retrieve user LLM config, using default:', error)
    }

    // Prepare the prompt for storyboard generation
    const systemPrompt = `You are a professional film director and storyboard artist. Your task is to transform a video concept into a detailed, cinematic storyboard.

PROJECT CONTEXT:
- Title: ${idea.title}
- Synopsis: ${idea.synopsis}
- Genre: ${idea.genre || 'General'}
- Tone: ${idea.tone || 'Professional'}
- Target Audience: ${idea.targetAudience || 'General'}
- Style: ${style}
- Aspect Ratio: ${aspectRatio}
- Target Duration: ${targetDuration} seconds

SCENE OUTLINE:
${idea.scene_outline.map((scene, index) => `${index + 1}. ${scene}`).join('\n')}

INSTRUCTIONS:
Transform each scene outline into a detailed storyboard frame. Each frame should include:
1. Visual description of what happens on screen
2. Audio cues (music, sound effects, dialogue)
3. Detailed image prompt for AI image generation
4. Camera angle and movement suggestions
5. Lighting and mood considerations
6. Estimated duration for each scene

OUTPUT FORMAT:
Return ONLY a valid JSON array with this exact structure:
[
  {
    "scene_number": 1,
    "description": "Detailed visual description of what happens on screen",
    "audio_cues": "Music/SFX/Dialogue description",
    "image_prompt": "Detailed prompt for AI image generation",
    "duration": 8,
    "camera_angle": "Medium close-up, slight tilt",
    "lighting": "Soft, warm lighting from above",
    "mood": "Intimate and engaging"
  }
]

IMPORTANT:
- Ensure total duration adds up to approximately ${targetDuration} seconds
- Make each scene visually distinct and engaging
- Consider the flow and pacing between scenes
- Provide specific, actionable image prompts for AI generation
- Maintain consistency with the overall style and tone
- Focus on cinematic quality and visual storytelling`

    let storyboard: StoryboardScene[]

    if (templateUsed && templateScenes.length > 0) {
      // Use the structured template scenes directly
      storyboard = templateScenes.map((scene: any) => ({
        scene_number: scene.scene_number || 1,
        description: scene.description || scene.scene_name || 'Scene description',
        audio_cues: scene.audio_notes || scene.audio || 'Background music',
        image_prompt: scene.visual_notes || scene.description || 'Visual scene',
        duration: scene.scene_duration || Math.ceil(targetDuration / templateScenes.length),
        camera_angle: scene.camera_details || scene.camera_angle || 'Medium shot',
        lighting: scene.lighting || 'Natural lighting',
        mood: scene.mood || 'Professional'
      }))
      
      console.log(`Generated storyboard from template: ${storyboard.length} scenes`)
    } else {
      // Generate storyboard using LLM
      const aiProvider = AIProviderFactory.createProvider(llmProvider as any)
      if (!aiProvider) {
        return NextResponse.json({
          success: false,
          error: 'No AI provider available for storyboard generation'
        }, { status: 500 })
      }

      const response = await aiProvider.generateContent(systemPrompt, {
        maxTokens: 4000,
        temperature: 0.7,
        topP: 0.9
      })

      if (!response.success || !response.content) {
        return NextResponse.json({
          success: false,
          error: 'Failed to generate storyboard content'
        }, { status: 500 })
      }

      // Parse the LLM response
      try {
        // Extract JSON from the response (handle markdown formatting)
        const jsonMatch = response.content.match(/\[[\s\S]*\]/)
        if (!jsonMatch) {
          throw new Error('No JSON array found in response')
        }

        storyboard = JSON.parse(jsonMatch[0])
        
        // Validate storyboard structure
        if (!Array.isArray(storyboard)) {
          throw new Error('Response is not an array')
        }

        // Validate each scene
        storyboard.forEach((scene, index) => {
          if (!scene.scene_number || !scene.description || !scene.audio_cues || !scene.image_prompt) {
            throw new Error(`Invalid scene structure at index ${index}`)
          }
          
          // Ensure scene numbers are sequential
          scene.scene_number = index + 1
          
          // Set default values for optional fields
          scene.duration = scene.duration || Math.ceil(targetDuration / storyboard.length)
          scene.camera_angle = scene.camera_angle || 'Medium shot'
          scene.lighting = scene.lighting || 'Natural lighting'
          scene.mood = scene.mood || 'Professional'
        })

      } catch (parseError) {
        console.error('Failed to parse LLM response:', parseError)
        console.error('Raw response:', response.content)
        
        return NextResponse.json({
          success: false,
          error: 'Failed to parse storyboard response from AI provider'
        }, { status: 500 })
      }
    }

    // Calculate metadata
    const totalScenes = storyboard.length
    const estimatedDuration = storyboard.reduce((sum, scene) => sum + (scene.duration || 0), 0)

    return NextResponse.json({
      success: true,
      storyboard,
      metadata: {
        totalScenes,
        estimatedDuration,
        generatedAt: new Date(),
        llmProvider,
        style,
        templateUsed
      }
    })

  } catch (error) {
    console.error('Storyboard generation error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 })
  }
}
