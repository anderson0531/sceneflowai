import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Project from '@/models/Project'
import { sequelize } from '@/config/database'
import { isBeatFirstPipelineEnabled, isStoryboardApproved, getSceneBeats } from '@/lib/script/beatMigration'
import { compileBeatVideoPrompt } from '@/lib/scene/beatVideoPromptCompiler'
import { resolveVisualGender } from '@/lib/character/visualGender'
import { resolveProjectArtStyle } from '@/lib/vision/artStyle'
import {
  findSceneById,
  getVisionScriptScenes,
} from '@/lib/script/resolveSceneById'
import type { SceneSegment } from '@/components/vision/scene-production/types'
import { getBeatChainSegments } from '@/lib/video/veoChainQueue'
import {
  generateSegmentVideoCore,
  SegmentVideoExtRefRequiredError,
  SegmentVideoRateLimitError,
} from '@/lib/video/generateSegmentVideo'

export const maxDuration = 300
export const runtime = 'nodejs'

interface GenerateContinuousBody {
  projectId: string
  guidePrompt?: string
  aspectRatio?: '16:9' | '9:16'
  qualityTier?: 'fast' | 'premium'
  videoProvider?: 'kling' | 'vertex'
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

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ sceneId: string; beatId: string }> }
) {
  try {
    const { sceneId, beatId } = await context.params
    const body = (await req.json()) as GenerateContinuousBody
    const { projectId, guidePrompt, aspectRatio, qualityTier, videoProvider } = body
    const chainVideoProvider: 'kling' | 'vertex' =
      videoProvider === 'vertex' ? 'vertex' : 'kling'

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
    }

    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await sequelize.authenticate()
    const project = await Project.findByPk(projectId)
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
        {
          error: 'Pre-vis must be approved before video generation',
          code: 'STORYBOARD_NOT_APPROVED',
        },
        { status: 403 }
      )
    }

    const beats = getSceneBeats(matchedScene as Record<string, unknown>)
    const beat = beats.find((b) => b.beatId === beatId)
    if (!beat) {
      return NextResponse.json({ error: 'Beat not found' }, { status: 404 })
    }

    const allSegments = readProductionSegments(metadata, sceneId)
    const chainSegments = getBeatChainSegments(allSegments, beatId)
    if (chainSegments.length === 0) {
      return NextResponse.json(
        {
          error:
            'No production segments for this beat. Derive segments from beats first.',
          code: 'NO_CHAIN_SEGMENTS',
        },
        { status: 400 }
      )
    }

    const artStyleId = resolveProjectArtStyle(metadata)
    const characters = (visionPhase as { characters?: Array<Record<string, unknown>> }).characters || []
    const beatCharacter = beat.character?.trim()
    const charRecord = beatCharacter
      ? characters.find((c) => {
          const name = String(c.name || '').toLowerCase()
          const target = beatCharacter.toLowerCase()
          return name === target || name.includes(target) || target.includes(name)
        })
      : undefined
    const resolvedGender = charRecord ? resolveVisualGender(charRecord as never) : null
    const compiled = compileBeatVideoPrompt(beat, {
      artStyleId,
      characterGender: resolvedGender?.isAuthoritative ? resolvedGender.gender : null,
      characterName: beatCharacter,
    })
    const sceneImageUrl =
      typeof (matchedScene as { imageUrl?: string }).imageUrl === 'string'
        ? (matchedScene as { imageUrl: string }).imageUrl.trim()
        : undefined

    const parts: Array<{
      segmentId: string
      partIndex: number
      assetUrl: string
      veoVideoRef?: string
      veoVideoRefExpiry?: string
      durationProbed?: number | null
      method: string
    }> = []

    let previousVeoRef: string | undefined
    let previousAssetUrl: string | undefined
    let previousLastFrameUrl: string | undefined

    for (let i = 0; i < chainSegments.length; i++) {
      const segment = chainSegments[i]
      const isContinuation = i > 0 || segment.veoTimelineContinuation === true
      const method =
        segment.generationMethod ||
        (isContinuation ? 'EXT' : segment.references?.endFrameUrl ? 'FTV' : 'I2V')

      const prompt =
        segment.userEditedPrompt ||
        segment.generatedPrompt ||
        (segment.dialoguePortion?.excerpt
          ? compiled.prompt.replace(beat.line ?? '', segment.dialoguePortion.excerpt)
          : compiled.prompt)

      const startFrameUrl =
        segment.startFrameUrl ||
        segment.references?.startFrameUrl ||
        (segment.sequenceIndex === 0 && sceneImageUrl ? sceneImageUrl : undefined)

      const result = await generateSegmentVideoCore({
        segmentId: segment.segmentId,
        projectId,
        sceneId,
        userId: String(session.user.id),
        prompt,
        negativePrompt: compiled.negativePrompt,
        genType: method === 'T2V' ? 'T2V' : 'I2V',
        generationMethod: method,
        startFrameUrl,
        endFrameUrl: segment.endFrameUrl || segment.references?.endFrameUrl,
        previousSegmentVeoRef: previousVeoRef,
        previousSegmentAssetUrl: previousAssetUrl,
        previousSegmentLastFrameUrl: previousLastFrameUrl,
        sceneImageUrl,
        segmentIndex: segment.sequenceIndex,
        totalSegments: allSegments.length,
        duration: Math.round(segment.endTime - segment.startTime),
        aspectRatio: aspectRatio || '16:9',
        resolution: method === 'EXT' ? '720p' : '720p',
        qualityTier,
        guidePrompt,
        requireVeoRefForExt:
          isContinuation && method === 'EXT' && chainVideoProvider === 'vertex',
        videoProvider: chainVideoProvider,
        existingStemSourceAudioUrl: segment.stemSeparation?.sourceAudioUrl,
        existingStemSourceHash: segment.stemSeparation?.sourceHash,
        existingStemStatus: segment.stemSeparation?.status,
        existingStemJobId: segment.stemSeparation?.jobId,
      })

      parts.push({
        segmentId: segment.segmentId,
        partIndex:
          segment.dialoguePortion?.partIndex ??
          segment.videoChain?.partIndex ??
          i,
        assetUrl: result.assetUrl,
        veoVideoRef: result.veoVideoRef,
        veoVideoRefExpiry: result.veoVideoRefExpiry,
        durationProbed: result.actualDurationSeconds,
        method: result.methodSelection?.method ?? method,
        generationProvider: result.generationProvider,
        fallbackModelFamily: result.fallbackModelFamily,
        wasPolicyFallback: result.wasPolicyFallback,
      })

      previousVeoRef = result.veoVideoRef
      previousAssetUrl = result.assetUrl
      previousLastFrameUrl = result.lastFrameUrl ?? undefined
    }

    const lastPart = parts[parts.length - 1]

    return NextResponse.json({
      success: true,
      beatId,
      sceneId,
      projectId,
      parts,
      combinedAssetUrl: lastPart?.assetUrl,
      extensionCount: Math.max(0, parts.length - 1),
    })
  } catch (error: unknown) {
    if (error instanceof SegmentVideoRateLimitError) {
      return NextResponse.json(
        {
          error: error.message,
          retryAfter: error.retryAfter,
          isRateLimited: true,
        },
        { status: 429 }
      )
    }
    if (error instanceof SegmentVideoExtRefRequiredError) {
      return NextResponse.json(
        { error: error.message, code: 'VEO_EXT_REF_REQUIRED' },
        { status: 400 }
      )
    }
    const message = error instanceof Error ? error.message : 'Continuous generation failed'
    console.error('[generate-continuous]', message, error)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
