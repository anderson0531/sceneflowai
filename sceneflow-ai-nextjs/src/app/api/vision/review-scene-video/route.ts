import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Project from '../../../../models/Project'
import { sequelize } from '../../../../config/database'
import { getUiSandboxProject, isDemoProjectId } from '@/lib/demo/uiSandboxProject'
import {
  reviewSceneVideoMultimodal,
  type ReviewerReferenceCatalog,
  type ReviewerSegmentInput,
  type ReviewerStreamInput,
} from '@/lib/intelligence/scene-video-reviewer'
import type { SceneVideoReviewSourceMode } from '@/lib/intelligence/scene-video-reviewer-types'

export const runtime = 'nodejs'
export const maxDuration = 120

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>
    const projectId = typeof body.projectId === 'string' ? body.projectId.trim() : ''
    const sceneIndex = typeof body.sceneIndex === 'number' ? body.sceneIndex : -1
    const sourceModeRaw = typeof body.sourceMode === 'string' ? body.sourceMode : 'auto'
    const sourceMode: SceneVideoReviewSourceMode =
      sourceModeRaw === 'rendered_mp4' || sourceModeRaw === 'shot_clips'
        ? sourceModeRaw
        : 'auto'
    const streamId = typeof body.streamId === 'string' ? body.streamId.trim() : undefined

    if (sceneIndex < 0 && !body.sceneOverride) {
      return NextResponse.json(
        { error: 'sceneIndex or sceneOverride is required' },
        { status: 400 }
      )
    }

    let dbProject: any = null
    let visionPhase: Record<string, any> = {}

    if (projectId) {
      const demoMode = isDemoProjectId(projectId)
      if (!demoMode) {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        try {
          await sequelize.authenticate()
        } catch {
          // Allow lazy connection fallback
        }
      }

      dbProject = demoMode
        ? (getUiSandboxProject() as unknown as { metadata?: Record<string, any> })
        : await Project.findByPk(projectId)

      if (!dbProject && !body.sceneOverride) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 })
      }
      visionPhase = dbProject?.metadata?.visionPhase || {}
    }

    const dbScenes =
      visionPhase?.script?.script?.scenes ||
      visionPhase?.script?.scenes ||
      []
    const dbScene = sceneIndex >= 0 ? dbScenes[sceneIndex] : undefined
    const sceneObj = (
      body.sceneOverride && typeof body.sceneOverride === 'object'
        ? body.sceneOverride
        : dbScene
    ) as Record<string, any> | undefined

    if (!sceneObj) {
      return NextResponse.json({ error: 'Scene not found' }, { status: 404 })
    }

    const effectiveSceneIndex = sceneIndex >= 0 ? sceneIndex : 0
    const sceneNumber =
      typeof sceneObj.sceneNumber === 'number'
        ? sceneObj.sceneNumber
        : effectiveSceneIndex + 1
    const sceneId =
      typeof body.sceneId === 'string' && body.sceneId.trim()
        ? body.sceneId.trim()
        : String(sceneObj.id || sceneObj.sceneId || `scene-${effectiveSceneIndex + 1}`)

    // Merge production data from request override + DB visionPhase.production + scene object
    const prodOverride =
      body.productionDataOverride && typeof body.productionDataOverride === 'object'
        ? (body.productionDataOverride as Record<string, any>)
        : undefined
    const dbProdByScene =
      visionPhase?.production?.scenes?.[sceneId] ||
      visionPhase?.sceneProductionData?.[sceneId] ||
      {}

    const segments: ReviewerSegmentInput[] = Array.isArray(body.segments)
      ? (body.segments as ReviewerSegmentInput[])
      : Array.isArray(prodOverride?.segments)
        ? (prodOverride.segments as ReviewerSegmentInput[])
        : Array.isArray(dbProdByScene?.segments)
          ? (dbProdByScene.segments as ReviewerSegmentInput[])
          : Array.isArray(sceneObj.segments)
            ? (sceneObj.segments as ReviewerSegmentInput[])
            : []

    const productionStreams: ReviewerStreamInput[] = Array.isArray(body.productionStreams)
      ? (body.productionStreams as ReviewerStreamInput[])
      : Array.isArray(prodOverride?.productionStreams)
        ? (prodOverride.productionStreams as ReviewerStreamInput[])
        : Array.isArray(dbProdByScene?.productionStreams)
          ? (dbProdByScene.productionStreams as ReviewerStreamInput[])
          : Array.isArray(sceneObj.productionStreams)
            ? (sceneObj.productionStreams as ReviewerStreamInput[])
            : []

    const renderedSceneUrl: string | null =
      (typeof body.renderedSceneUrl === 'string' && body.renderedSceneUrl) ||
      (typeof prodOverride?.renderedSceneUrl === 'string' && prodOverride.renderedSceneUrl) ||
      (typeof dbProdByScene?.renderedSceneUrl === 'string' && dbProdByScene.renderedSceneUrl) ||
      (typeof sceneObj.renderedSceneUrl === 'string' && sceneObj.renderedSceneUrl) ||
      null

    const refOverride =
      body.references && typeof body.references === 'object'
        ? (body.references as ReviewerReferenceCatalog)
        : undefined

    const references: ReviewerReferenceCatalog = {
      characters: Array.isArray(refOverride?.characters)
        ? refOverride.characters
        : Array.isArray(visionPhase?.characters)
          ? visionPhase.characters
          : [],
      locationReferences: Array.isArray(refOverride?.locationReferences)
        ? refOverride.locationReferences
        : Array.isArray(visionPhase?.references?.locationReferences)
          ? visionPhase.references.locationReferences
          : [],
      objectReferences: Array.isArray(refOverride?.objectReferences)
        ? refOverride.objectReferences
        : Array.isArray(visionPhase?.references?.objectReferences)
          ? visionPhase.references.objectReferences
          : [],
    }

    const previousArScore =
      typeof body.previousArScore === 'number'
        ? body.previousArScore
        : typeof sceneObj.videoReview?.arScore === 'number'
          ? sceneObj.videoReview.arScore
          : typeof sceneObj.scoreAnalysis?.audienceScore === 'number'
            ? sceneObj.scoreAnalysis.audienceScore
            : undefined

    const review = await reviewSceneVideoMultimodal({
      sceneId,
      sceneNumber,
      sceneIndex: effectiveSceneIndex,
      scene: sceneObj,
      sourceMode,
      streamId,
      segments,
      productionStreams,
      renderedSceneUrl,
      references,
      previousArScore,
    })

    // Persist review onto DB project scene if available and non-demo
    if (
      dbProject &&
      !isDemoProjectId(projectId) &&
      typeof dbProject.update === 'function' &&
      Array.isArray(dbScenes) &&
      dbScenes[effectiveSceneIndex]
    ) {
      try {
        const updatedScenes = [...dbScenes]
        updatedScenes[effectiveSceneIndex] = {
          ...updatedScenes[effectiveSceneIndex],
          videoReview: review,
        }
        const existingScript = visionPhase.script || {}
        const updatedVisionPhase = {
          ...visionPhase,
          script: existingScript.script
            ? {
                ...existingScript,
                script: {
                  ...existingScript.script,
                  scenes: updatedScenes,
                },
              }
            : {
                ...existingScript,
                scenes: updatedScenes,
              },
        }
        await dbProject.update({
          metadata: {
            ...(dbProject.metadata || {}),
            visionPhase: updatedVisionPhase,
          },
        })
      } catch (persistErr) {
        console.warn('[review-scene-video] Non-fatal error persisting videoReview:', persistErr)
      }
    }

    return NextResponse.json({
      success: true,
      review,
    })
  } catch (error: unknown) {
    console.error('[review-scene-video] Error:', error)
    const message = error instanceof Error ? error.message : 'Failed to review scene video'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
