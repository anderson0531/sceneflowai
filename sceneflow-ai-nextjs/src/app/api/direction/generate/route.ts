import { NextRequest, NextResponse } from 'next/server'
import { AIProviderManager } from '@/services/ai-providers/AIProviderManager'
import { UserProviderConfig } from '@/models/UserProviderConfig'
import { EncryptionService } from '@/services/EncryptionService'

export interface SceneDirection {
  scene_number: number
  detailed_script: string
  camera_direction: string
  lighting_mood: string
  video_clip_prompt: string
  performance_notes: string
  props_set_design: string
  sound_design: string
  pacing_notes: string
  technical_requirements: string
  strength_rating: number
  quality_indicators: {
    visual_impact: number
    narrative_clarity: number
    technical_feasibility: number
    emotional_resonance: number
  }
}

export interface DirectionGenerationRequest {
  storyboard: {
    id: string
    scenes: Array<{
      id: string
      scene_number: number
      description: string
      audio_cues: string
      image_prompt: string
      duration?: number
      camera_angle?: string
      lighting?: string
      mood?: string
      image_url?: string
    }>
    metadata: {
      totalScenes: number
      estimatedDuration: number
      style: string
      aspectRatio: string
    }
  }
  userId: string
  projectId: string
  projectContext: {
    title: string
    genre: string
    tone: string
    targetAudience: string
    keyMessage: string
  }
  directionStyle?: 'cinematic' | 'documentary' | 'commercial' | 'educational' | 'artistic'
  technicalLevel?: 'beginner' | 'intermediate' | 'professional'
}

export interface DirectionGenerationResponse {
  success: boolean
  directions?: SceneDirection[]
  error?: string
  metadata?: {
    totalScenes: number
    estimatedDuration: number
    generatedAt: Date
    llmProvider: string
    directionStyle: string
    overallQuality: number
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: DirectionGenerationRequest = await request.json()
    const { 
      storyboard, 
      userId, 
      projectId, 
      projectContext,
      directionStyle = 'cinematic',
      technicalLevel = 'intermediate'
    } = body

    // Validate request
    if (!storyboard || !storyboard.scenes || storyboard.scenes.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Invalid storyboard data or missing scenes'
      }, { status: 400 })
    }

    if (!userId || !projectId) {
      return NextResponse.json({
        success: false,
        error: 'Missing user ID or project ID'
      }, { status: 400 })
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

    // Prepare the prompt for direction generation
    const systemPrompt = `You are a world-class film director and cinematographer. Your task is to transform a storyboard into a detailed production script with precise technical direction.

PROJECT CONTEXT:
- Title: ${projectContext.title}
- Genre: ${projectContext.genre}
- Tone: ${projectContext.tone}
- Target Audience: ${projectContext.targetAudience}
- Key Message: ${projectContext.keyMessage}
- Style: ${directionStyle}
- Technical Level: ${technicalLevel}
- Aspect Ratio: ${storyboard.metadata.aspectRatio}
- Total Duration: ${storyboard.metadata.estimatedDuration} seconds

STORYBOARD SCENES:
${storyboard.scenes.map((scene, index) => `
Scene ${scene.scene_number}:
- Description: ${scene.description}
- Audio Cues: ${scene.audio_cues}
- Duration: ${scene.duration || 'Not specified'}s
- Camera Angle: ${scene.camera_angle || 'Not specified'}
- Lighting: ${scene.lighting || 'Not specified'}
- Mood: ${scene.mood || 'Not specified'}
`).join('\n')}

INSTRUCTIONS:
Transform each scene into a detailed production script with:

1. DETAILED_SCRIPT: Professional script format with dialogue, action, and timing
2. CAMERA_DIRECTION: Specific camera movements, angles, and framing
3. LIGHTING_MOOD: Detailed lighting setup, color temperature, and mood
4. VIDEO_CLIP_PROMPT: Precise 10-second prompt optimized for AI video generation
5. PERFORMANCE_NOTES: Actor direction, emotion, and delivery
6. PROPS_SET_DESIGN: Set dressing, props, and production design
7. SOUND_DESIGN: Music, SFX, and audio engineering details
8. PACING_NOTES: Timing, rhythm, and flow considerations
9. TECHNICAL_REQUIREMENTS: Equipment, settings, and technical specs
10. QUALITY_INDICATORS: Rate each scene on 4 key metrics (0-10 scale)

OUTPUT FORMAT:
Return ONLY a valid JSON array with this exact structure:
[
  {
    "scene_number": 1,
    "detailed_script": "Detailed script with dialogue and action",
    "camera_direction": "Specific camera movements and framing",
    "lighting_mood": "Detailed lighting setup and mood",
    "video_clip_prompt": "Precise 10-second prompt for AI video generation",
    "performance_notes": "Actor direction and performance guidance",
    "props_set_design": "Set dressing and production design details",
    "sound_design": "Music, SFX, and audio engineering",
    "pacing_notes": "Timing and flow considerations",
    "technical_requirements": "Equipment and technical specifications",
    "strength_rating": 8.5,
    "quality_indicators": {
      "visual_impact": 9,
      "narrative_clarity": 8,
      "technical_feasibility": 7,
      "emotional_resonance": 9
    }
  }
]

QUALITY STANDARDS:
- Each scene should be production-ready with actionable direction
- Video clip prompts must be precise and optimized for AI generation
- Quality indicators should reflect professional standards
- Strength ratings should consider overall scene effectiveness
- Technical requirements should match the specified technical level

IMPORTANT:
- Maintain consistency with the overall project style and tone
- Ensure technical feasibility for the specified level
- Create engaging, emotionally resonant content
- Provide specific, actionable direction for production teams
- Optimize for the target audience and platform`

    // Generate directions using LLM
    const aiProvider = AIProviderManager.getProvider(llmProvider as any)
    if (!aiProvider) {
      return NextResponse.json({
        success: false,
        error: 'No AI provider available for direction generation'
      }, { status: 500 })
    }

    const response = await aiProvider.generateContent(systemPrompt, {
      maxTokens: 6000,
      temperature: 0.7,
      topP: 0.9
    })

    if (!response.success || !response.content) {
      return NextResponse.json({
        success: false,
        error: 'Failed to generate direction content'
      }, { status: 500 })
    }

    // Parse the LLM response
    let directions: SceneDirection[]
    try {
      // Extract JSON from the response (handle markdown formatting)
      const jsonMatch = response.content.match(/\[[\s\S]*\]/)
      if (!jsonMatch) {
        throw new Error('No JSON array found in response')
      }

      directions = JSON.parse(jsonMatch[0])
      
      // Validate directions structure
      if (!Array.isArray(directions)) {
        throw new Error('Response is not an array')
      }

      // Validate each direction
      directions.forEach((direction, index) => {
        if (!direction.scene_number || !direction.detailed_script || !direction.camera_direction) {
          throw new Error(`Invalid direction structure at index ${index}`)
        }
        
        // Ensure scene numbers match storyboard
        direction.scene_number = index + 1
        
        // Set default values for optional fields
        direction.performance_notes = direction.performance_notes || 'Natural, authentic performance'
        direction.props_set_design = direction.props_set_design || 'Minimal, clean set design'
        direction.sound_design = direction.sound_design || 'Subtle ambient music and natural sound'
        direction.pacing_notes = direction.pacing_notes || 'Maintain steady, engaging pace'
        direction.technical_requirements = direction.technical_requirements || 'Standard production equipment'
        
        // Ensure quality indicators are present
        if (!direction.quality_indicators) {
          direction.quality_indicators = {
            visual_impact: 7,
            narrative_clarity: 7,
            technical_feasibility: 7,
            emotional_resonance: 7
          }
        }
        
        // Calculate overall strength rating if not provided
        if (!direction.strength_rating) {
          const avgQuality = Object.values(direction.quality_indicators).reduce((sum, val) => sum + val, 0) / 4
          direction.strength_rating = Math.round(avgQuality * 10) / 10
        }
      })

    } catch (parseError) {
      console.error('Failed to parse LLM response:', parseError)
      console.error('Raw response:', response.content)
      
      return NextResponse.json({
        success: false,
        error: 'Failed to parse direction response from AI provider'
      }, { status: 500 })
    }

    // Calculate metadata
    const totalScenes = directions.length
    const estimatedDuration = storyboard.metadata.estimatedDuration
    const overallQuality = directions.reduce((sum, dir) => sum + dir.strength_rating, 0) / totalScenes

    return NextResponse.json({
      success: true,
      directions,
      metadata: {
        totalScenes,
        estimatedDuration,
        generatedAt: new Date(),
        llmProvider,
        directionStyle,
        overallQuality: Math.round(overallQuality * 10) / 10
      }
    })

  } catch (error) {
    console.error('Direction generation error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 })
  }
}
