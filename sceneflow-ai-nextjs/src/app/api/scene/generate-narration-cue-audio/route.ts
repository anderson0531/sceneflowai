import { NextRequest, NextResponse } from 'next/server'
import { sequelize } from '@/config/database'
import Project from '@/models/Project'
import { assertProjectAccess, getAuthenticatedUserId } from '@/lib/projectAccess'
import {
  resolveNarrationCueSpeakerVoice,
  synthesizeCuesForLanguages,
  translateNarrationCueText,
} from '@/lib/audio/narrationCueServerService'
import { getSceneBeats } from '@/lib/script/beatMigration'
import {
  applySceneNarrationCues,
  getSceneNarrationCues,
  normalizeNarrationCueShape,
  parsePersistedNarrationCues,
} from '@/lib/script/sceneNarrationCues'
import type { SceneNarrationCue } from '@/lib/script/segmentTypes'
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
      cues?: SceneNarrationCue[]
      targetCueIds?: string[]
      language?: string
      targetLanguages?: string[]
      translateOnly?: boolean
      saveOnly?: boolean
      forceRegenerate?: boolean
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
    const visionPhase = (metadata.visionPhase as Record<string, unknown> | undefined) ?? {}
    const characters = Array.isArray(visionPhase.characters) ? visionPhase.characters : []
    const narrationVoice = visionPhase.narrationVoice

    const baseCues = Array.isArray(body.cues)
      ? parsePersistedNarrationCues(body.cues, beats)
      : getSceneNarrationCues(targetScene, beats)

    const primaryLanguage = normalizeStreamLanguage(body.language)
    const languages = Array.from(
      new Set(
        [
          primaryLanguage,
          ...(Array.isArray(body.targetLanguages)
            ? body.targetLanguages.map((l) => normalizeStreamLanguage(l))
            : []),
        ].filter(Boolean)
      )
    )

    let nextCues = baseCues

    if (!body.saveOnly) {
      if (body.translateOnly) {
        const targetSet =
          body.targetCueIds && body.targetCueIds.length > 0
            ? new Set(body.targetCueIds)
            : null
        nextCues = await Promise.all(
          baseCues.map(async (cue) => {
            if (targetSet && !targetSet.has(cue.cueId)) return cue
            const byLanguage = { ...(cue.byLanguage || {}) }
            const baselineLang = byLanguage.en?.text?.trim()
              ? 'en'
              : Object.keys(byLanguage).find((k) => byLanguage[k]?.text?.trim()) || 'en'
            const sourceText = byLanguage[baselineLang]?.text?.trim() || ''
            if (!sourceText) return cue
            let spanSec = 0
            for (let i = cue.beatStart; i <= cue.beatEnd; i++) {
              spanSec += Math.max(2, beats[i]?.durationSeconds ?? 5)
            }
            const speaker = resolveNarrationCueSpeakerVoice({
              cue,
              characters,
              narrationVoice,
            })
            for (const lang of languages) {
              if (lang === baselineLang) continue
              if (!body.forceRegenerate && byLanguage[lang]?.text?.trim()) continue
              const translated = await translateNarrationCueText({
                sourceText,
                sourceLanguage: baselineLang,
                targetLanguage: lang,
                spanDurationSec: spanSec || 5,
                speakerLabel: speaker.speakerName,
                deliveryCue: cue.deliveryCue,
                contextSummary: project.title || undefined,
              })
              byLanguage[lang] = {
                ...(byLanguage[lang] || {}),
                text: translated,
              }
            }
            return normalizeNarrationCueShape({ ...cue, byLanguage }, beats)
          })
        )
      } else {
        nextCues = await synthesizeCuesForLanguages({
          cues: baseCues,
          targetCueIds: body.targetCueIds,
          languages,
          beats,
          characters,
          narrationVoice,
          contextSummary: project.title || undefined,
          forceRegenerate: body.forceRegenerate,
        })
      }
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
      const updatedScene = applySceneNarrationCues(
        latestScenes[latestIdx],
        nextCues,
        getSceneBeats(latestScenes[latestIdx])
      )
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
      cues: persistedScene.sceneNarrationCues ?? nextCues,
      scene: persistedScene,
      scriptUpdatedAt: savedVision?.scriptUpdatedAt,
    })
  } catch (err) {
    console.error('[generate-narration-cue-audio] Error:', err)
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : 'Failed to generate narration cue audio',
      },
      { status: 500 }
    )
  }
}
