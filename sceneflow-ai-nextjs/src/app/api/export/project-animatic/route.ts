/**
 * Project Animatic Render API
 *
 * Renders the full project as a single MP4 animatic from the shared
 * `buildProjectAnimaticTimeline` payload (matches Pre-Vis player).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isCloudRunJobsEnabled } from '@/lib/video/CloudRunJobsService'
import type { AnimaticRenderSettings } from '@/components/vision/scene-production/types'
import type { AnimaticAudioMode } from '@/lib/storyboard/animaticAudioMode'
import { enqueueProjectCinemaRender } from '@/lib/export/expressCinemaPipeline'

export interface ProjectAnimaticRequest {
  projectId: string
  projectTitle?: string
  language: string
  resolution: '720p' | '1080p' | '4K'
  scenes: Record<string, unknown>[]
  settings?: AnimaticRenderSettings
  audioMode?: AnimaticAudioMode
  clipAudioByBeatId?: Record<string, string>
}

export interface ProjectAnimaticResponse {
  success: boolean
  jobId: string
  status: 'queued' | 'error'
  message?: string
  estimatedDuration?: number
  estimatedRenderTime?: number
  sourceHash?: string
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id || session?.user?.email

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      )
    }

    const body = (await request.json()) as ProjectAnimaticRequest

    const result = await enqueueProjectCinemaRender({
      projectId: body.projectId,
      userId,
      projectTitle: body.projectTitle,
      language: body.language || 'en',
      resolution: body.resolution || '1080p',
      scenes: body.scenes,
      settings: body.settings,
      audioMode: body.audioMode,
      clipAudioByBeatId: body.clipAudioByBeatId,
    })

    if (!result.ok) {
      return NextResponse.json(
        {
          error: result.error,
          code: result.code,
          ...(result.details ? { details: result.details } : {}),
        },
        { status: result.statusCode }
      )
    }

    return NextResponse.json({
      success: true,
      jobId: result.jobId,
      status: 'queued',
      message: 'Project cinema render job queued',
      estimatedDuration: result.estimatedDuration,
      estimatedRenderTime: result.estimatedRenderTime,
      sourceHash: result.sourceHash,
    } satisfies ProjectAnimaticResponse)
  } catch (error) {
    console.error('[Project Animatic] Unexpected error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    available: isCloudRunJobsEnabled(),
    features: {
      kenBurns: ['off', 'subtle', 'medium', 'dramatic'],
      transitions: ['cut', 'crossfade', 'fade-to-black'],
      resolutions: ['720p', '1080p', '4K'],
    },
  })
}
