import { NextRequest, NextResponse } from 'next/server'
import { sequelize } from '@/config/database'
import Project from '@/models/Project'
import { assertProjectAccess, getAuthenticatedUserId } from '@/lib/projectAccess'
import {
  buildNarrationPlanningInputsFromBeats,
  planShotAlignedNarrationCuesWithModel,
  synthesizeCuesForLanguages,
} from '@/lib/audio/narrationCueServerService'
import { getSceneBeats } from '@/lib/script/beatMigration'
import { applySceneNarrationCues } from '@/lib/script/sceneNarrationCues'
import { normalizeStreamLanguage } from '@/lib/scene/languageClipVersions'

export const dynamic = 'force-dynamic'
export const maxDuration = 120
export const runtime = 'nodejs'

function getScenesFromMetadata(metadata: Record<string, unknown>): Array<Record<string, unknown>> {
  const visionPhase = metadata.visionPhase as Record<string, unknown> | undefined
  const scriptWrapper = visionPhase?.script as
    | { script?: { scenes?: unknown[] }; scenes?: unknown[] }
    | undefined
  const raw = scriptWrapper?.script?.scenes ?? scriptWrapper?.scenes ?? []
  return Array.isArray(raw)
    ? raw.filter((s): s is Record<string, unknown> => !!s && typeof s === 'object')
    : []
}

function setScenesOnMetadata(
  metadata: Record<string, unknown>,
  scenes: unknown[]
): Record<string, unknown> {
  const visionPhase = { ...((metadata.visionPhase as Record<string, unknown>) || {}) }
  const scriptWrapper = { ...((visionPhase.script as Record<string, unknown>) || {}) }
  if (
    scriptWrapper.script &&
    typeof scriptWrapper.script === 'object' &&
    !Array.isArray(scriptWrapper.script)
  ) {
    scriptWrapper.script = {
      ...(scriptWrapper.script as Record<string, unknown>),
      scenes,
    }
  } else {
    scriptWrapper.scenes = scenes
  }
  visionPhase.script = scriptWrapper
  visionPhase.scriptUpdatedAt = new Date().toISOString()
  return { ...metadata, visionPhase }
}

function findTargetSceneIndex(
  scenes: Array<Record<string, unknown>>,
  sceneId?: string,
  sceneIndex?: number
): number {
  if (sceneId?.trim()) {
    const byId = scenes.findIndex(
      (s) => String(s.id || s.sceneId || '') === sceneId.trim()
    )
    if (byId >= 0) return byId
  }
  if (typeof sceneIndex === 'number' && sceneIndex >= 0 && sceneIndex < scenes.length) {
    return sceneIndex
  }
  return -1
}

export async function POST(request: NextRequest) {
  try {
    const ownerUserId = await getAuthenticatedUserId(request)
    if (!ownerUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await sequelize.authenticate()

    const body = (await request.json()) as {
      projectId?: string
      sceneId?: string
      sceneIndex?: number
      language?: string
      targetLanguages?: string[]
      speakerType?: 'narrator' | 'character'
      characterId?: string
      characterName?: string
      directorNotes?: string
      allowOverDialogue?: boolean
      synthesizeAudio?: boolean
      legacyOwnerId?: string
    }

    const projectId = (body.projectId || '').trim()
    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
    }

    const access = await assertProjectAccess(projectId, ownerUserId, body.legacyOwnerId)
    if (!access.ok) {
      return NextResponse.json(
        {
          error:
            access.status === 403
              ? 'You do not have permission to update this project'
              : access.error,
        },
        { status: access.status }
      )
    }

    const project = access.project
    const metadata = { ...((project.metadata as Record<string, unknown>) || {}) }
    const scenes = getScenesFromMetadata(metadata)
    const targetIdx = findTargetSceneIndex(scenes, body.sceneId, body.sceneIndex)
    if (targetIdx < 0) {
      return NextResponse.json({ error: 'Target scene not found' }, { status: 404 })
    }

    const targetScene = scenes[targetIdx]
    const beats = getSceneBeats(targetScene)
    if (beats.length === 0) {
      return NextResponse.json({ error: 'Scene has no shots/beats to narrate' }, { status: 400 })
    }

    const language = normalizeStreamLanguage(body.language)
    const isPromo = targetScene.cinematicType === 'promo'
    const shots = buildNarrationPlanningInputsFromBeats(beats, {
      promoBeatPlan: Array.isArray(targetScene.promoBeatPlan)
        ? (targetScene.promoBeatPlan as any[])
        : undefined,
    })

    const visionPhase = (metadata.visionPhase as Record<string, unknown> | undefined) ?? {}
    const characters = Array.isArray(visionPhase.characters) ? visionPhase.characters : []
    const narrationVoice = visionPhase.narrationVoice

    let cues = await planShotAlignedNarrationCuesWithModel({
      title: project.title || 'Untitled',
      logline: typeof project.description === 'string' ? project.description : undefined,
      genre: typeof project.genre === 'string' ? project.genre : undefined,
      sceneHeading:
        typeof targetScene.heading === 'string'
          ? targetScene.heading
          : typeof targetScene.heading === 'object' && targetScene.heading
            ? String((targetScene.heading as { text?: string }).text || '')
            : undefined,
      isPromo,
      campaignStrategyText:
        typeof targetScene.campaignObjective === 'string'
          ? targetScene.campaignObjective
          : undefined,
      directorNotes: body.directorNotes,
      language,
      beats,
      shots,
      speakerType: body.speakerType,
      characterId: body.characterId,
      characterName: body.characterName,
      allowOverDialogue: body.allowOverDialogue,
    })

    if (body.synthesizeAudio) {
      const langs = Array.from(
        new Set(
          [
            language,
            ...(Array.isArray(body.targetLanguages)
              ? body.targetLanguages.map((l) => normalizeStreamLanguage(l))
              : []),
          ].filter(Boolean)
        )
      )
      cues = await synthesizeCuesForLanguages({
        cues,
        languages: langs,
        beats,
        characters,
        narrationVoice,
        contextSummary: project.title || undefined,
        forceRegenerate: true,
      })
    }

    let persistedScene: Record<string, unknown> = targetScene
    const savedMetadata = await sequelize.transaction(async (transaction) => {
      const locked = await Project.findByPk(projectId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      })
      if (!locked) throw new Error('Project not found')
      const latestMeta = { ...((locked.metadata as Record<string, unknown>) || {}) }
      const latestScenes = getScenesFromMetadata(latestMeta)
      const latestIdx = findTargetSceneIndex(latestScenes, body.sceneId, targetIdx)
      if (latestIdx < 0) throw new Error('Scene not found during save')
      const updatedScene = applySceneNarrationCues(latestScenes[latestIdx], cues)
      persistedScene = updatedScene
      const nextScenes = [...latestScenes]
      nextScenes[latestIdx] = updatedScene
      const nextMeta = setScenesOnMetadata(latestMeta, nextScenes)
      locked.metadata = nextMeta as any
      locked.changed('metadata', true)
      await locked.save({ transaction })
      return nextMeta
    })

    const savedVision = savedMetadata.visionPhase as { scriptUpdatedAt?: string } | undefined

    return NextResponse.json({
      success: true,
      cues: persistedScene.sceneNarrationCues ?? cues,
      scene: persistedScene,
      scriptUpdatedAt: savedVision?.scriptUpdatedAt,
    })
  } catch (err) {
    console.error('[direct-narration-cues] Error:', err)
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : 'Failed to plan shot-aligned narration cues',
      },
      { status: 500 }
    )
  }
}
