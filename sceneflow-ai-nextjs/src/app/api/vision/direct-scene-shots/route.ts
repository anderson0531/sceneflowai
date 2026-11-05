import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Project from '../../../../models/Project'
import { sequelize } from '../../../../config/database'
import { directBeatStills } from '@/lib/intelligence/beat-still-director'
import type { ProjectLookbook } from '@/lib/intelligence/project-lookbook-fallback'
import {
  readScenesFromVisionMetadata,
  writeScenesIntoVisionMetadata,
} from '@/lib/sceneGeneration/attachSceneDirectionsToScript'
import { resolveProjectArtStyle } from '@/lib/vision/artStyle'
import { generateSceneContentHash } from '@/lib/utils/contentHash'
import {
  applyOptimizedShotPatches,
  getShotDirectionTextConcurrency,
  runShotDirectionChunks,
  shotDirectionCatalogFromPhase,
} from '@/lib/vision/shotDirectionBatch'
import { syncSceneDirectionToContinuityCatalog } from '@/lib/vision/saveBeatDirection'
import { mergeScenePreservingMedia } from '@/lib/storyboard/mergeSceneMedia'
import type { LocationReference, VisualReference } from '@/types/visionReferences'
import {
  directSandboxBeatStillsFallback,
  getUiSandboxProject,
  isDemoProjectId,
} from '@/lib/demo/uiSandboxProject'

export const runtime = 'nodejs'
export const maxDuration = 300

/**
 * One scene of concurrent single-shot optimization.
 *
 * Still Director runs per single shot (`SHOT_DIRECTION_BEAT_CHUNK = 1`) with
 * 5 concurrent workers (`DEFAULT_SHOT_DIRECTION_TEXT_CONCURRENCY = 5`). The client
 * walks scenes one at a time so a long script does not multiply that fan-out.
 * Stamps `generatedBy: 'director'` and recomputes still and clip prompts.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>
    const projectId = typeof body.projectId === 'string' ? body.projectId : ''
    const sceneIndex = typeof body.sceneIndex === 'number' ? body.sceneIndex : -1
    const force = body.force === true
    if (!projectId || sceneIndex < 0) {
      return NextResponse.json(
        { error: 'projectId and sceneIndex are required' },
        { status: 400 }
      )
    }

    const demoMode = isDemoProjectId(projectId)
    if (!demoMode) {
      const session = await getServerSession(authOptions)
      if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      try {
        await sequelize.authenticate()
      } catch {
        // Project lookup still attempted; some environments lazy-connect.
      }
    }

    const project = demoMode
      ? (getUiSandboxProject() as unknown as { metadata?: Record<string, any> })
      : await Project.findByPk(projectId)
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const visionPhase = project.metadata?.visionPhase || {}
    const scenes = readScenesFromVisionMetadata(project.metadata)
    const scene = scenes[sceneIndex]
    if (!scene) {
      return NextResponse.json({ error: 'Scene not found' }, { status: 404 })
    }

    const directed = await runShotDirectionChunks({
      scene: scene as Record<string, unknown>,
      catalog: shotDirectionCatalogFromPhase(visionPhase),
      concurrency: getShotDirectionTextConcurrency(),
      force,
      signal: req.signal,
      direct: async (request) => {
        try {
          return await directBeatStills(request)
        } catch (err) {
          if (demoMode) {
            return directSandboxBeatStillsFallback(request as any)
          }
          throw err
        }
      },
    })

    const applyAndPersist = async (
      fresh: {
        metadata?: Record<string, any>
        update?: (values: Record<string, unknown>, options?: { transaction?: any }) => Promise<unknown>
      },
      transaction?: any
    ) => {
      const freshPhase = fresh.metadata?.visionPhase || {}
      const freshScenes = readScenesFromVisionMetadata(fresh.metadata)
      if (!freshScenes[sceneIndex]) {
        return { kind: 'scene_not_found' as const }
      }

      const characters = Array.isArray(freshPhase.characters)
        ? freshPhase.characters
            .filter((character: unknown) => Boolean(character && typeof character === 'object'))
            .map(
              (
                character: {
                  id?: string
                  name?: string
                  referenceImage?: string
                  type?: string
                  [key: string]: unknown
                }
              ) => ({
                ...character,
                id: character?.id,
                name: String(character?.name ?? ''),
                referenceImage: character?.referenceImage,
                type: character?.type,
              })
            )
        : []
      const rawObjectReferences: VisualReference[] = Array.isArray(
        freshPhase.references?.objectReferences
      )
        ? freshPhase.references.objectReferences
            .filter(
              (object: { id?: string }) =>
                Boolean(object && typeof object === 'object' && String(object?.id ?? ''))
            )
            .map((object: Record<string, unknown>) => ({
              ...(object as unknown as VisualReference),
              id: String(object?.id ?? ''),
              name: String(object?.name ?? ''),
            }))
        : []
      const rawLocationReferences: LocationReference[] = Array.isArray(
        freshPhase.references?.locationReferences
      )
        ? freshPhase.references.locationReferences
            .filter(
              (location: { id?: string }) =>
                Boolean(location && typeof location === 'object' && String(location?.id ?? ''))
            )
            .map((location: Record<string, unknown>) => ({
              ...(location as unknown as LocationReference),
              id: String(location?.id ?? ''),
            }))
        : []

      const syncedCatalog = syncSceneDirectionToContinuityCatalog({
        scenes: freshScenes,
        sceneIdx: sceneIndex,
        characters,
        locationReferences: rawLocationReferences,
        objectReferences: rawObjectReferences,
      })

      const applied = applyOptimizedShotPatches({
        scenes: syncedCatalog.scenes,
        sceneIdx: sceneIndex,
        patches: directed.patches,
        characters,
        locationReferences: syncedCatalog.locationReferences,
        objectReferences: syncedCatalog.objectReferences,
        promptComposition: {
          artStyleAnchor: resolveProjectArtStyle(fresh.metadata),
          lookbook: freshPhase.lookbook as ProjectLookbook | undefined,
        },
        force,
      })

      if (applied.scenes[sceneIndex] && typeof applied.scenes[sceneIndex] === 'object') {
        const targetScene = mergeScenePreservingMedia(
          freshScenes[sceneIndex] as Record<string, unknown>,
          applied.scenes[sceneIndex] as Record<string, unknown>
        ) as Record<string, unknown>
        targetScene.shotDirectionNeedsRefresh = false
        if (targetScene.sceneDirection && typeof targetScene.sceneDirection === 'object') {
          ;(targetScene.sceneDirection as Record<string, unknown>).basedOnContentHash =
            generateSceneContentHash(targetScene)
        }
        applied.scenes[sceneIndex] = targetScene
      }

      const shouldPersist =
        !demoMode &&
        (applied.optimized > 0 || syncedCatalog.locationsChanged || syncedCatalog.objectsChanged) &&
        typeof fresh.update === 'function'
      if (shouldPersist) {
        let nextMetadata = writeScenesIntoVisionMetadata(fresh.metadata, applied.scenes)
        if (syncedCatalog.locationsChanged || syncedCatalog.objectsChanged) {
          const nextVisionPhase = { ...(nextMetadata.visionPhase || {}) }
          const nextReferences = { ...(nextVisionPhase.references || {}) }
          if (syncedCatalog.locationsChanged) {
            nextReferences.locationReferences = syncedCatalog.locationReferences
          }
          if (syncedCatalog.objectsChanged) {
            nextReferences.objectReferences = syncedCatalog.objectReferences
          }
          nextVisionPhase.references = nextReferences
          nextMetadata = { ...nextMetadata, visionPhase: nextVisionPhase }
        }
        await fresh.update(
          {
            metadata: nextMetadata,
          },
          transaction ? { transaction } : undefined
        )
      }

      return { kind: 'ok' as const, applied }
    }

    const persistOutcome = demoMode
      ? await applyAndPersist(
          getUiSandboxProject() as unknown as {
            metadata?: Record<string, any>
            update?: (values: Record<string, unknown>) => Promise<unknown>
          }
        )
      : typeof (sequelize as { transaction?: unknown })?.transaction === 'function'
        ? await sequelize.transaction(async (transaction) => {
            const fresh = await Project.findByPk(projectId, {
              transaction,
              lock: transaction.LOCK?.UPDATE,
            })
            if (!fresh) return { kind: 'project_not_found' as const }
            return applyAndPersist(fresh as any, transaction)
          })
        : await (async () => {
            const fresh = await Project.findByPk(projectId)
            if (!fresh) return { kind: 'project_not_found' as const }
            return applyAndPersist(fresh as any)
          })()

    if (persistOutcome.kind === 'project_not_found') {
      return NextResponse.json({ error: 'Project not found after shot direction' }, { status: 404 })
    }
    if (persistOutcome.kind === 'scene_not_found') {
      return NextResponse.json({ error: 'Scene not found after shot direction' }, { status: 404 })
    }

    const { applied } = persistOutcome

    return NextResponse.json({
      success: true,
      optimized: applied.optimized,
      failed: directed.failed,
      skipped: applied.skipped,
      requested: directed.requested,
      scene: applied.scenes[sceneIndex],
    })
  } catch (error: unknown) {
    console.error('[direct-scene-shots] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
