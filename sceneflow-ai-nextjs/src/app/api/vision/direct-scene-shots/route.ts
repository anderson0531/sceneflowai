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
import {
  applyOptimizedShotPatches,
  getShotDirectionTextConcurrency,
  runShotDirectionChunks,
  shotDirectionCatalogFromPhase,
} from '@/lib/vision/shotDirectionBatch'

export const runtime = 'nodejs'
export const maxDuration = 300

/**
 * One scene of shot direction.
 *
 * Still Director runs in chunks of six, several chunks at once. The client
 * walks scenes one at a time so a long script does not multiply that fan-out.
 * Stamps `generatedBy: 'director'` and recomputes still and clip prompts.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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

    try {
      await sequelize.authenticate()
    } catch {
      // Project lookup still attempted; some environments lazy-connect.
    }

    const project = await Project.findByPk(projectId)
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
      direct: (request) => directBeatStills(request),
    })

    const fresh = await Project.findByPk(projectId)
    if (!fresh) {
      return NextResponse.json({ error: 'Project not found after shot direction' }, { status: 404 })
    }

    const freshPhase = fresh.metadata?.visionPhase || {}
    const freshScenes = readScenesFromVisionMetadata(fresh.metadata)
    if (!freshScenes[sceneIndex]) {
      return NextResponse.json({ error: 'Scene not found after shot direction' }, { status: 404 })
    }

    const characters = Array.isArray(freshPhase.characters)
      ? freshPhase.characters.map(
          (character: { id?: string; name?: string; referenceImage?: string; type?: string }) => ({
            id: character?.id,
            name: String(character?.name ?? ''),
            referenceImage: character?.referenceImage,
            type: character?.type,
          })
        )
      : []
    const objectReferences = Array.isArray(freshPhase.references?.objectReferences)
      ? freshPhase.references.objectReferences
          .map((object: { id?: string; name?: string }) => ({
            id: String(object?.id ?? ''),
            name: String(object?.name ?? ''),
          }))
          .filter((object: { id: string }) => object.id)
      : []
    const locationReferences = Array.isArray(freshPhase.references?.locationReferences)
      ? freshPhase.references.locationReferences
          .map((location: { id?: string }) => ({ id: String(location?.id ?? '') }))
          .filter((location: { id: string }) => location.id)
      : []

    const applied = applyOptimizedShotPatches({
      scenes: freshScenes,
      sceneIdx: sceneIndex,
      patches: directed.patches,
      characters,
      locationReferences,
      objectReferences,
      promptComposition: {
        artStyleAnchor: resolveProjectArtStyle(fresh.metadata),
        lookbook: freshPhase.lookbook as ProjectLookbook | undefined,
      },
      force,
    })

    if (applied.optimized > 0) {
      await fresh.update({
        metadata: writeScenesIntoVisionMetadata(fresh.metadata, applied.scenes),
      })
    }

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
