import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generateSegmentPrompt, enhanceKeyframePrompt } from '@/lib/intelligence/prompt-intelligence'
import type { SegmentPurpose, AdjacentSceneData, FilmContext } from '@/lib/intelligence/prompt-intelligence'
import type { DetailedSceneDirection } from '@/types/scene-direction'

export const maxDuration = 30 // 30 seconds for AI generation
export const runtime = 'nodejs'

interface GeneratePromptRequest {
  // What type of prompt to generate
  type: 'segment' | 'keyframe'
  
  // For segment prompts
  segmentPurpose?: SegmentPurpose
  adjacentScenes?: AdjacentSceneData
  
  // For keyframe prompts
  basePrompt?: string
  framePosition?: 'start' | 'end'
  duration?: number
  
  // Common context
  filmContext?: FilmContext
  sceneContext?: {
    heading?: string
    action?: string
    narration?: string
    visualDescription?: string
    sceneNumber?: number
    characters?: string[]
    location?: string
    timeOfDay?: string
  }
  sceneDirection?: DetailedSceneDirection | null
  characters?: Array<{
    name: string
    appearance?: string
    ethnicity?: string
    age?: string
    wardrobe?: string
  }>
  
  // AI settings
  thinkingLevel?: 'low' | 'high'
}

/**
 * Generate intelligent prompts using Gemini 2.5
 * 
 * Endpoints:
 * - POST /api/intelligence/generate-prompt
 * 
 * Generates context-aware prompts for:
 * - Title sequences (analyzes film title, genre, tone)
 * - Establishing shots (analyzes location, time of day)
 * - Standard segments (analyzes action, dialogue)
 * - Keyframe enhancement (enriches base prompts with cinematic details)
 */
export async function POST(req: NextRequest) {
  try {
    // Auth check
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: GeneratePromptRequest = await req.json()
    const {
      type,
      segmentPurpose,
      adjacentScenes,
      basePrompt,
      framePosition,
      duration,
      filmContext,
      sceneContext,
      sceneDirection,
      characters,
      thinkingLevel = 'low'
    } = body

    console.log(`[Generate Prompt API] Type: ${type}, Purpose: ${segmentPurpose}`)

    if (type === 'segment') {
      // Validate required fields for segment prompt
      if (!segmentPurpose || !adjacentScenes) {
        return NextResponse.json(
          { error: 'Missing required fields: segmentPurpose, adjacentScenes' },
          { status: 400 }
        )
      }

      const result = await generateSegmentPrompt({
        segmentPurpose,
        filmContext,
        adjacentScenes,
        sceneDirection,
        thinkingLevel
      })

      console.log(`[Generate Prompt API] Generated segment prompt, confidence: ${result.confidence}`)

      return NextResponse.json({
        success: true,
        ...result
      })

    } else if (type === 'keyframe') {
      // Validate required fields for keyframe prompt
      if (!basePrompt || !framePosition) {
        return NextResponse.json(
          { error: 'Missing required fields: basePrompt, framePosition' },
          { status: 400 }
        )
      }

      const result = await enhanceKeyframePrompt({
        basePrompt,
        framePosition,
        filmContext,
        sceneContext: sceneContext || { heading: 'Unknown Scene' },
        sceneDirection,
        characters,
        segmentPurpose,
        duration,
        thinkingLevel
      })

      console.log(`[Generate Prompt API] Enhanced keyframe prompt, confidence: ${result.confidence}`)

      return NextResponse.json({
        success: true,
        ...result
      })

    } else {
      return NextResponse.json(
        { error: 'Invalid type. Must be "segment" or "keyframe"' },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('[Generate Prompt API] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate prompt' },
      { status: 500 }
    )
  }
}
