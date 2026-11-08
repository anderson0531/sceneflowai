import { NextRequest, NextResponse } from 'next/server'
import Project from '../../../../../models/Project'
import { sequelize } from '../../../../../config/database'
import { deriveSegmentsFromBeats } from '@/lib/scene/deriveSegmentsFromBeats'
import { isBeatFirstPipelineEnabled } from '@/lib/script/beatMigration'
import { resolveProjectArtStyle } from '@/lib/vision/artStyle'
import { compileBeatVideoPromptFromDirection } from '@/lib/scene/beatVideoPromptCompiler'
import { buildSceneStateLedger } from '@/lib/scene/sceneStateLedger'
import {
  parsePersistedMusicCues,
  resolveBeatMusicCue,
} from '@/lib/script/sceneMusicCues'
import type { DetailedSceneDirection } from '@/types/scene-direction'
import { getSceneBeats, isBeatExcluded } from '@/lib/script/beatMigration'
import {
  findSceneById,
  getVisionScriptScenes,
} from '@/lib/script/resolveSceneById'
import {
  resolveLiveTake,
  segmentHasPlayableVideo,
  unionRowsById,
} from '@/lib/storyboard/mediaVersions'
import { mergeScenePreservingMedia } from '@/lib/storyboard/mergeSceneMedia'
import type { SceneSegment } from '@/components/vision/scene-production/types'

export const runtime = 'nodejs'
export const maxDuration = 120

interface DeriveSegmentsBody {
  projectId: string
  /** Apply recommended split for this beat before deriving. */
  extendBeatId?: string
  /** Skip storyboard approval check (legacy / admin). */
  skipApprovalCheck?: boolean
  /** Active production language for TTS duration–aware extension planning. */
  language?: string
  /** Existing segments to merge generated assets into after re-derive. */
  existingSegments?: import('@/components/vision/scene-production/types').SceneSegment[]
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ sceneId: string }> }
) {
  try {
    const { sceneId } = await context.params
    const body = (await req.json()) as DeriveSegmentsBody
    const { projectId, extendBeatId, skipApprovalCheck, language, existingSegments } = body

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
    }

    if (!isBeatFirstPipelineEnabled() && !skipApprovalCheck) {
      return NextResponse.json(
        {
          error: 'Beat-first pipeline is disabled',
          hint: 'Set BEAT_FIRST_PIPELINE=true or NEXT_PUBLIC_BEAT_FIRST_PIPELINE=true',
        },
        { status: 403 }
      )
    }

    await sequelize.authenticate()
    const txOutcome = await sequelize.transaction(async (transaction) => {
      const project = await Project.findByPk(projectId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      })
      if (!project) {
        return { kind: 'not_found' as const }
      }

      const metadata = project.metadata || {}
      const visionPhase = { ...(metadata.visionPhase || {}) }
      const scenes = [...getVisionScriptScenes(visionPhase as Record<string, unknown>)]
      const { scene: matchedScene, index: sceneIndex } = findSceneById(scenes, sceneId)
      if (sceneIndex < 0 || !matchedScene) {
        return { kind: 'scene_not_found' as const }
      }

      const scene = matchedScene
      const artStyleId = resolveProjectArtStyle(metadata)
      const storedSegments = readStoredProductionSegments(metadata, sceneId)
      const segmentsToKeep = unionProductionSegments(storedSegments, existingSegments)

      const deriveOptions = {
        requireApproved: false,
        language: language ?? 'en',
        existingSegments: segmentsToKeep,
      }
      void skipApprovalCheck

      // extendBeatId accepted for backward compatibility but ignored (Kling-first: one beat = one segment).
      void extendBeatId
      const result = deriveSegmentsFromBeats(scene, deriveOptions)

      if (result.errors.length > 0) {
        return { kind: 'derive_errors' as const, errors: result.errors }
      }

      const rawWorkingScene = {
        ...(result.updatedScene ?? scene),
      } as Record<string, unknown>
      if (rawWorkingScene.storyboardStatus !== 'approved') {
        rawWorkingScene.storyboardStatus = 'approved'
        rawWorkingScene.storyboardApprovedAt = new Date().toISOString()
      }
      const workingScene = mergeScenePreservingMedia(
        matchedScene as Record<string, unknown>,
        rawWorkingScene
      ) as Record<string, unknown>
      scenes[sceneIndex] = workingScene
      const scriptRoot = visionPhase.script || {}
      const nested = scriptRoot.script || {}
      if (nested.scenes) {
        visionPhase.script = { ...scriptRoot, script: { ...nested, scenes } }
      } else {
        visionPhase.script = { ...scriptRoot, scenes }
      }
      if (Array.isArray(visionPhase.scenes)) {
        visionPhase.scenes = scenes
      }
      await project.update(
        {
          metadata: { ...metadata, visionPhase },
        },
        { transaction }
      )

      return {
        kind: 'ok' as const,
        sceneIndex,
        artStyleId,
        segmentsToKeep,
        result,
        workingScene,
      }
    })

    if (txOutcome.kind === 'not_found') {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }
    if (txOutcome.kind === 'scene_not_found') {
      return NextResponse.json({ error: 'Scene not found' }, { status: 404 })
    }
    if (txOutcome.kind === 'derive_errors') {
      return NextResponse.json(
        { success: false, errors: txOutcome.errors, segments: [] },
        { status: 400 }
      )
    }

    const { sceneIndex, artStyleId, segmentsToKeep, result, workingScene } = txOutcome

    const allBeats = getSceneBeats(workingScene)
    const activeBeats = allBeats.filter((b) => !isBeatExcluded(b))
    const stateLedger = buildSceneStateLedger(activeBeats)
    const musicCues = parsePersistedMusicCues(
      (workingScene as Record<string, unknown>).sceneMusicCues,
      activeBeats
    )
    const sceneDirection =
      (workingScene as { sceneDirection?: unknown; detailedDirection?: unknown })
        .sceneDirection ??
      (workingScene as { detailedDirection?: unknown }).detailedDirection ??
      null
    const compiledSegments = result.segments.map((seg) => {
      const beatIndex = activeBeats.findIndex((b) => b.beatId === seg.beatId)
      const beat = beatIndex >= 0 ? activeBeats[beatIndex] : allBeats.find((b) => b.beatId === seg.beatId)
      if (!beat) return seg
      const musicCue = beatIndex >= 0 ? resolveBeatMusicCue(musicCues, beatIndex) : undefined
      const compiled = compileBeatVideoPromptFromDirection(
        beat,
        sceneDirection as DetailedSceneDirection | null,
        {
          artStyleId,
          excerpt: seg.dialoguePortion?.excerpt,
          continuesSameLine: (seg.dialoguePortion?.partIndex ?? 0) > 0,
          previousBeat: beatIndex > 0 ? activeBeats[beatIndex - 1] : undefined,
          sceneState: beatIndex >= 0 ? stateLedger[beatIndex] : undefined,
          ...(musicCue ? { musicCue } : {}),
        }
      )
      return {
        ...seg,
        generatedPrompt: compiled.prompt,
        videoPrompt: compiled.prompt,
        userEditedPrompt: seg.userEditedPrompt ?? null,
      }
    })
    const keptIds = new Set(compiledSegments.map((segment) => segment.segmentId))
    const orphanClips = segmentsToKeep.filter(
      (segment) =>
        segment.segmentId &&
        !keptIds.has(segment.segmentId) &&
        segmentHasPlayableVideo(segment)
    )
    const segments = [...compiledSegments, ...orphanClips]

    return NextResponse.json({
      success: true,
      sceneIndex,
      sceneId,
      segments,
      segmentCount: segments.length,
      artStyleId,
      storyboardStatus: workingScene.storyboardStatus,
      storyboardApprovedAt: workingScene.storyboardApprovedAt,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[derive-segments]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

function readStoredProductionSegments(
  metadata: { visionPhase?: { production?: { scenes?: Record<string, { segments?: SceneSegment[] }> } } } | null | undefined,
  sceneId: string
): SceneSegment[] {
  const stored = metadata?.visionPhase?.production?.scenes?.[sceneId]?.segments
  return Array.isArray(stored) ? stored : []
}

/** DB rows first, then the client list. A later row fills a missing video pointer. */
function unionProductionSegments(
  stored: SceneSegment[],
  client: SceneSegment[] | undefined
): SceneSegment[] {
  const byId = new Map<string, SceneSegment>()
  for (const segment of [...stored, ...(client ?? [])]) {
    if (!segment?.segmentId) continue
    const previous = byId.get(segment.segmentId)
    if (!previous) {
      byId.set(segment.segmentId, segment)
      continue
    }
    const takes = unionRowsById(previous.takes, segment.takes, 'id')
    const preferredTakeId = segment.currentTakeId || previous.currentTakeId
    const preferredActiveUrl = segment.activeAssetUrl || previous.activeAssetUrl
    const liveTake = resolveLiveTake(takes, preferredTakeId, preferredActiveUrl)
    byId.set(segment.segmentId, {
      ...previous,
      ...segment,
      takes,
      activeAssetUrl: preferredActiveUrl || liveTake?.url,
      currentTakeId: preferredTakeId || liveTake?.id,
      assetType: segment.assetType || previous.assetType,
      status:
        segmentHasPlayableVideo(previous) && segment.status === 'PENDING'
          ? previous.status
          : (segment.status ?? previous.status),
    })
  }
  return [...byId.values()]
}
