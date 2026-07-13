import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Project from '@/models/Project'
import { sequelize } from '@/config/database'
import { isBeatFirstPipelineEnabled, isStoryboardApproved, getSceneBeats } from '@/lib/script/beatMigration'
import { compileBeatVideoPromptFromDirection } from '@/lib/scene/beatVideoPromptCompiler'
import { resolveProjectArtStyle } from '@/lib/vision/artStyle'
import {
  findSceneById,
  getVisionScriptScenes,
} from '@/lib/script/resolveSceneById'
import type { SceneSegment } from '@/components/vision/scene-production/types'
import { createGenerationJob } from '@/lib/jobs/jobService'
import {
  applySpokenDurationMargin,
  estimateSpokenDurationSeconds,
} from '@/lib/scene/dialogueSegmentSplit'
import {
  KLING_LIPSYNC_MAX_SEC,
  KLING_SINGLE_CLIP_MAX_SEC,
} from '@/lib/kling/types'
import { shouldUseKlingLongTake, planKlingLongTake } from '@/lib/kling/longTakePlanner'
import { isKlingConfigured, isKlingAsyncEnabled } from '@/lib/kling/config'
import {
  collectKlingElementSources,
  injectElementTagsIntoPrompt,
  persistKlingElementIdsToProject,
  resolveKlingElementsFromSources,
} from '@/lib/kling/elementRegistry'
import type { KlingLongTakeJobPayload } from '@/lib/kling/longTakeOrchestrator'

export const maxDuration = 60
export const runtime = 'nodejs'

interface GenerateLongTakeBody {
  projectId: string
  segmentId: string
  language?: string
  klingModel?: string
  klingQuality?: 'std' | 'pro' | '4k'
  cfgScale?: number
  prompt?: string
  negativePrompt?: string
  startFrameUrl?: string
  aspectRatio?: string
  resolution?: '720p' | '1080p' | '4k'
  faceConsistency?: boolean
}

function readProductionSegments(
  metadata: Record<string, unknown>,
  sceneId: string
): SceneSegment[] {
  const visionPhase = (metadata.visionPhase || {}) as Record<string, unknown>
  const production = (visionPhase.production || {}) as Record<string, unknown>
  const scenes = (production.scenes || {}) as Record<string, { segments?: SceneSegment[] }>
  const sceneProd = scenes[sceneId]
  return Array.isArray(sceneProd?.segments) ? sceneProd.segments : []
}

function resolveDialogueAudioUrl(
  scene: Record<string, unknown>,
  beatLineId: string | undefined,
  language: string
): string | undefined {
  const da = scene.dialogueAudio
  let entries: Array<{ lineId?: string; audioUrl?: string; url?: string; duration?: number }> = []
  if (Array.isArray(da)) {
    entries = da
  } else if (da && typeof da === 'object') {
    const langArr = (da as Record<string, unknown>)[language]
    if (Array.isArray(langArr)) entries = langArr
  }

  if (beatLineId) {
    const match = entries.find((e) => e.lineId === beatLineId)
    if (match?.audioUrl || match?.url) return match.audioUrl || match.url
  }

  const dialogue = Array.isArray(scene.dialogue) ? scene.dialogue : []
  if (beatLineId) {
    const idx = dialogue.findIndex((d: { lineId?: string }) => d?.lineId === beatLineId)
    if (idx >= 0) {
      const entry = dialogue[idx] as { audioUrl?: string; url?: string }
      return entry.audioUrl || entry.url
    }
  }

  return undefined
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ sceneId: string; beatId: string }> }
) {
  try {
    const { sceneId, beatId } = await context.params
    const body = (await req.json()) as GenerateLongTakeBody

    if (!body.projectId || !body.segmentId) {
      return NextResponse.json(
        { error: 'projectId and segmentId are required' },
        { status: 400 }
      )
    }

    if (!isKlingConfigured()) {
      return NextResponse.json(
        { error: 'Kling direct API is not configured', code: 'KLING_NOT_CONFIGURED' },
        { status: 503 }
      )
    }

    if (!isKlingAsyncEnabled()) {
      return NextResponse.json(
        {
          error: 'Long-take pipeline requires KLING_ASYNC=true and webhook configuration',
          code: 'KLING_ASYNC_REQUIRED',
        },
        { status: 503 }
      )
    }

    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await sequelize.authenticate()
    const project = await Project.findByPk(body.projectId)
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const metadata = (project.metadata || {}) as Record<string, unknown>
    const visionPhase = metadata.visionPhase || {}
    const scenes = [...getVisionScriptScenes(visionPhase as Record<string, unknown>)]
    const { scene: matchedScene } = findSceneById(scenes, sceneId)
    if (!matchedScene) {
      return NextResponse.json({ error: 'Scene not found' }, { status: 404 })
    }

    if (isBeatFirstPipelineEnabled() && !isStoryboardApproved(matchedScene as Record<string, unknown>)) {
      return NextResponse.json(
        { error: 'Pre-vis must be approved before video generation', code: 'STORYBOARD_NOT_APPROVED' },
        { status: 403 }
      )
    }

    const beats = getSceneBeats(matchedScene as Record<string, unknown>)
    const beat = beats.find((b) => b.beatId === beatId)
    if (!beat) {
      return NextResponse.json({ error: 'Beat not found' }, { status: 404 })
    }

    const segments = readProductionSegments(metadata, sceneId)
    const segment = segments.find((s) => s.segmentId === body.segmentId)
    if (!segment) {
      return NextResponse.json({ error: 'Segment not found' }, { status: 404 })
    }

    const spokenText = beat.line?.trim() || segment.dialogueLines?.[0]?.line || ''
    const estimatedSeconds = applySpokenDurationMargin(
      estimateSpokenDurationSeconds(spokenText)
    )

    if (!shouldUseKlingLongTake(estimatedSeconds)) {
      return NextResponse.json(
        {
          error: `Dialogue (${estimatedSeconds}s) is within the ${KLING_SINGLE_CLIP_MAX_SEC}s single-clip ceiling — use standard generate-asset`,
          code: 'DIALOGUE_TOO_SHORT',
          estimatedSeconds,
        },
        { status: 400 }
      )
    }

    const language = body.language || 'en'
    const dialogueAudioUrl = resolveDialogueAudioUrl(
      matchedScene as Record<string, unknown>,
      beat.lineId,
      language
    )

    if (!dialogueAudioUrl) {
      return NextResponse.json(
        { error: 'Generate dialogue audio for this beat before long-take rendering', code: 'DIALOGUE_AUDIO_MISSING' },
        { status: 400 }
      )
    }

    const targetSeconds = Math.min(estimatedSeconds, KLING_LIPSYNC_MAX_SEC)
    const model = body.klingModel || 'kling-v3-omni'
    const plan = planKlingLongTake({ targetSeconds, model })

    const artStyleId = resolveProjectArtStyle(metadata)
    const visionMeta = (metadata.visionPhase || {}) as Record<string, unknown>
    const sceneDirection = (matchedScene as { direction?: unknown }).direction
    const compiled = compileBeatVideoPromptFromDirection(beat, sceneDirection as never, {
      artStyleId,
    })
    const sceneImageUrl =
      typeof (matchedScene as { imageUrl?: string }).imageUrl === 'string'
        ? (matchedScene as { imageUrl: string }).imageUrl.trim()
        : undefined

    const startFrameUrl =
      body.startFrameUrl?.trim() ||
      segment.startFrameUrl?.trim() ||
      segment.references?.startFrameUrl?.trim() ||
      (segment.sequenceIndex === 0 ? sceneImageUrl : undefined)

    const elementSources = collectKlingElementSources({
      characters: (visionMeta.characters as never[]) || [],
      characterIds: beat.referenceSelection?.characterIds || [],
      characterWardrobes: beat.referenceSelection?.characterWardrobes || [],
      objectReferences:
        ((visionMeta.references as { objectReferences?: unknown })?.objectReferences as never[]) ||
        [],
      objectRefIds: beat.referenceSelection?.objectRefIds || [],
      locationReferences:
        ((visionMeta.references as { locationReferences?: unknown })?.locationReferences as never[]) ||
        [],
      locationRefId: beat.referenceSelection?.locationRefId,
    })
    const resolvedElements = await resolveKlingElementsFromSources(elementSources, model)
    if (resolvedElements.newRegistrations.length) {
      await persistKlingElementIdsToProject(projectId, resolvedElements.newRegistrations)
    }
    const elementList = resolvedElements.elementIds
    const basePrompt = body.prompt?.trim() || compiled.prompt
    const prompt =
      resolvedElements.promptTags.length > 0
        ? injectElementTagsIntoPrompt(basePrompt, resolvedElements.promptTags)
        : basePrompt

    const hasCharacterRefs = elementSources.length > 0 || !!startFrameUrl
    const faceConsistency = body.faceConsistency ?? hasCharacterRefs

    const payload: Omit<KlingLongTakeJobPayload, 'generationJobId' | 'userId' | 'projectId'> = {
      sceneId,
      beatId,
      segmentId: body.segmentId,
      model,
      quality: body.klingQuality || 'pro',
      targetSeconds,
      prompt,
      negativePrompt: body.negativePrompt || compiled.negativePrompt,
      cfgScale: body.cfgScale,
      startFrameUrl,
      elementList,
      dialogueAudioUrl,
      resolution: body.resolution || '1080p',
      faceConsistency,
      aspectRatio: body.aspectRatio || '16:9',
    }

    const job = await createGenerationJob({
      userId: String(session.user.id),
      projectId: body.projectId,
      jobType: 'kling_long_take',
      payload: payload as unknown as Record<string, unknown>,
    })

    return NextResponse.json(
      {
        success: true,
        status: 'QUEUED',
        jobId: job.id,
        plan,
        estimatedSeconds,
        warnings: plan.warnings,
      },
      { status: 202 }
    )
  } catch (error) {
    console.error('[GenerateLongTake] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to enqueue long-take job' },
      { status: 500 }
    )
  }
}
