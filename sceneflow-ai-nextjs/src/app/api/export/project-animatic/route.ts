/**
 * Project Animatic Render API
 *
 * Renders the full project as a single MP4 animatic from the shared
 * `buildProjectAnimaticTimeline` payload (matches Pre-Vis player).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { uploadJobSpec, getOutputPath } from '@/lib/gcs/renderStorage'
import { triggerCloudRunJob, isCloudRunJobsEnabled } from '@/lib/video/CloudRunJobsService'
import {
  RenderJobSpec,
  RenderSegment,
  RenderAudioClip,
  KenBurnsSettings,
} from '@/lib/video/renderTypes'
import RenderJob from '@/models/RenderJob'
import { v4 as uuidv4 } from 'uuid'
import type {
  AnimaticRenderSettings,
  KenBurnsIntensity,
} from '@/components/vision/scene-production/types'
import { calculateSourceHash } from '@/types/productionStreams'
import { buildProjectAnimaticTimeline } from '@/lib/storyboard/types'

export interface ProjectAnimaticRequest {
  projectId: string
  projectTitle?: string
  language: string
  resolution: '720p' | '1080p' | '4K'
  scenes: Record<string, unknown>[]
  settings?: AnimaticRenderSettings
}

export interface ProjectAnimaticResponse {
  success: boolean
  jobId: string
  status: 'queued' | 'error'
  message?: string
  estimatedDuration?: number
  sourceHash?: string
}

function getKenBurnsSettings(intensity: KenBurnsIntensity): KenBurnsSettings {
  switch (intensity) {
    case 'off':
      return { zoomStart: 1.0, zoomEnd: 1.0, panX: 0, panY: 0 }
    case 'subtle':
      return { zoomStart: 1.0, zoomEnd: 1.05, panX: 0, panY: 0 }
    case 'medium':
      return { zoomStart: 1.0, zoomEnd: 1.1, panX: 0, panY: 0 }
    case 'dramatic':
      return { zoomStart: 1.0, zoomEnd: 1.2, panX: 0, panY: 0 }
    default:
      return { zoomStart: 1.0, zoomEnd: 1.05, panX: 0, panY: 0 }
  }
}

function buildProjectAnimaticJobSpec(
  jobId: string,
  request: ProjectAnimaticRequest,
  timeline: ReturnType<typeof buildProjectAnimaticTimeline>
): RenderJobSpec {
  const settings: AnimaticRenderSettings = request.settings ?? {
    kenBurnsIntensity: 'subtle',
    transitionStyle: 'crossfade',
    transitionDuration: 0.5,
    includeSubtitles: false,
    type: 'animatic',
  }

  const kenBurns = getKenBurnsSettings(settings.kenBurnsIntensity)

  const renderSegments: RenderSegment[] = timeline.segments.map((seg, index) => ({
    segmentId: seg.segmentId,
    imageUrl: seg.imageUrl,
    startTime: seg.startTime,
    duration: seg.duration,
    kenBurns: {
      ...kenBurns,
      panX: index % 2 === 0 ? 0 : (index % 4 < 2 ? 1 : -1) * 0.1,
      panY: index % 3 === 0 ? 0 : (index % 3 === 1 ? 1 : -1) * 0.1,
    },
  }))

  const renderAudioClips: RenderAudioClip[] = timeline.audioClips.map((clip) => ({
    url: clip.url,
    startTime: clip.startTime,
    duration: clip.duration,
    volume: clip.volume ?? 1.0,
    type: clip.type,
  }))

  const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://sceneflowai.studio'}/api/export/render-callback`

  return {
    jobId,
    projectId: request.projectId,
    projectTitle: request.projectTitle || 'Project Animatic',
    renderType: 'project_animatic',
    streamType: 'animatic',
    resolution: request.resolution,
    fps: 24,
    segments: renderSegments,
    audioClips: renderAudioClips,
    outputPath: getOutputPath(jobId),
    callbackUrl,
    createdAt: new Date().toISOString(),
    language: request.language,
    includeSubtitles: settings.includeSubtitles,
    kenBurnsConfig: {
      intensity: settings.kenBurnsIntensity,
      transitionStyle: settings.transitionStyle,
      transitionDuration: settings.transitionDuration,
    },
  }
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

    if (!body.projectId) {
      return NextResponse.json({ error: 'Missing required field: projectId' }, { status: 400 })
    }

    if (!Array.isArray(body.scenes) || body.scenes.length === 0) {
      return NextResponse.json({ error: 'Missing required field: scenes' }, { status: 400 })
    }

    const timeline = buildProjectAnimaticTimeline(body.scenes, body.language || 'en')
    if (timeline.segments.length === 0) {
      return NextResponse.json(
        { error: 'No storyboard frames with images found for animatic export' },
        { status: 400 }
      )
    }

    if (!isCloudRunJobsEnabled()) {
      return NextResponse.json(
        {
          error: 'Cloud Run rendering not configured',
          code: 'RENDER_NOT_CONFIGURED',
        },
        { status: 503 }
      )
    }

    const jobId = uuidv4()
    const audioUrls = timeline.audioClips.map((c) => c.url).filter(Boolean)
    const sourceHash = calculateSourceHash(
      timeline.segments.map((s) => ({
        segmentId: s.segmentId,
        imageUrl: s.imageUrl,
        startTime: s.startTime,
        duration: s.duration,
      })),
      audioUrls
    )

    const jobSpec = buildProjectAnimaticJobSpec(jobId, body, timeline)
    const specPath = await uploadJobSpec(jobSpec)

    const totalDuration = timeline.totalDuration
    const estimatedRenderTime = 15 + totalDuration * 0.5

    try {
      await RenderJob.create({
        id: jobId,
        project_id: body.projectId,
        user_id: userId,
        status: 'QUEUED',
        progress: 0,
        resolution: body.resolution || '1080p',
        language: body.language || 'en',
        include_subtitles: body.settings?.includeSubtitles ?? false,
        render_type: 'project_animatic',
        stream_type: 'animatic',
        estimated_duration: totalDuration,
      })
    } catch (dbError) {
      console.error('[Project Animatic] Failed to create RenderJob record:', dbError)
    }

    try {
      await triggerCloudRunJob(jobId, specPath)
    } catch (triggerError) {
      await RenderJob.update(
        { status: 'FAILED', error: String(triggerError) },
        { where: { id: jobId } }
      )
      return NextResponse.json(
        { error: 'Failed to start render job', details: String(triggerError) },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      jobId,
      status: 'queued',
      message: 'Project animatic render job queued',
      estimatedDuration: totalDuration,
      estimatedRenderTime,
      sourceHash,
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
