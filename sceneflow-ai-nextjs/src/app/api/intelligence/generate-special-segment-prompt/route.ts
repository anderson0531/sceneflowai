import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generateSpecialSegmentPrompt } from '@/lib/intelligence/special-segment-prompts'

export const maxDuration = 30 // 30 seconds for AI generation
export const runtime = 'nodejs'

interface GenerateSpecialSegmentPromptRequest {
  segmentType: 'title' | 'match-cut' | 'establishing' | 'broll' | 'outro'
  filmContext: {
    title?: string
    logline?: string
    genre?: string[]
    tone?: string
    visualStyle?: string
    targetAudience?: string
  }
  credits?: {
    title?: string
    director?: string
    writer?: string
    producer?: string
    customText?: string
  }
  adjacentScenes?: {
    previousScene?: {
      heading?: string
      action?: string
    }
    currentScene: {
      heading?: string
      action?: string
      narration?: string
    }
    nextScene?: {
      heading?: string
      action?: string
    }
  }
  typeConfig: {
    name: string
    aiHint: string
    styleKeywords: string[]
  }
}

/**
 * Generate intelligent prompts for special video segments
 * 
 * POST /api/intelligence/generate-special-segment-prompt
 * 
 * Generates cinematic, context-aware prompts for:
 * - Title Sequences (high-concept, genre-appropriate openings)
 * - Match Cut Bridges (visual transitions between scenes)
 * - Establishing Shots (location/atmosphere setters)
 * - B-Roll (atmospheric detail shots)
 * - Outro/Credits (professional closings)
 */
export async function POST(req: NextRequest) {
  try {
    // Auth check
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: GenerateSpecialSegmentPromptRequest = await req.json()
    const { segmentType, filmContext, credits, adjacentScenes, typeConfig } = body

    // Validate required fields
    if (!segmentType) {
      return NextResponse.json(
        { error: 'Missing required field: segmentType' },
        { status: 400 }
      )
    }

    console.log(`[Special Segment Prompt API] Type: ${segmentType}, Film: ${filmContext?.title || 'Untitled'}`)

    const result = await generateSpecialSegmentPrompt({
      segmentType,
      filmContext,
      credits,
      adjacentScenes,
      typeConfig,
    })

    console.log(`[Special Segment Prompt API] Generated prompt, confidence: ${result.confidence}`)

    return NextResponse.json({
      success: true,
      ...result
    })

  } catch (error) {
    console.error('[Special Segment Prompt API] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate prompt' },
      { status: 500 }
    )
  }
}
