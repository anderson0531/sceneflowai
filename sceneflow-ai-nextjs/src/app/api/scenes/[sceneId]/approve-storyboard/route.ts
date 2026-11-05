import { NextRequest, NextResponse } from 'next/server'
import Project from '../../../../../models/Project'
import { sequelize } from '../../../../../config/database'
import { getSceneBeats } from '@/lib/script/beatMigration'
import {
  findSceneById,
  getVisionScriptScenes,
} from '@/lib/script/resolveSceneById'

export const runtime = 'nodejs'

interface ApproveStoryboardBody {
  projectId: string
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ sceneId: string }> }
) {
  try {
    const { sceneId } = await context.params
    const body = (await req.json()) as ApproveStoryboardBody
    const { projectId } = body

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
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

      const metadata = { ...(project.metadata || {}) }
      const visionPhase = { ...(metadata.visionPhase || {}) }
      const scenes = [...getVisionScriptScenes(visionPhase as Record<string, unknown>)]

      const { scene: matchedScene, index: sceneIndex } = findSceneById(scenes, sceneId)
      if (sceneIndex < 0 || !matchedScene) {
        return { kind: 'scene_not_found' as const }
      }

      const scene = { ...matchedScene }
      const beats = getSceneBeats(scene)
      const missing = beats.filter((b) => !b.storyboardImageUrl?.trim())
      if (missing.length > 0) {
        return { kind: 'missing_frames' as const, missingCount: missing.length }
      }

      scene.storyboardStatus = 'approved'
      scene.storyboardApprovedAt = new Date().toISOString()
      scenes[sceneIndex] = scene

      const scriptRoot = (visionPhase.script || {}) as Record<string, unknown>
      const nested = (scriptRoot.script || {}) as Record<string, unknown>
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
        storyboardApprovedAt: scene.storyboardApprovedAt as string,
      }
    })

    if (txOutcome.kind === 'not_found') {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }
    if (txOutcome.kind === 'scene_not_found') {
      return NextResponse.json({ error: 'Scene not found' }, { status: 404 })
    }
    if (txOutcome.kind === 'missing_frames') {
      return NextResponse.json(
        { error: `${txOutcome.missingCount} beat(s) missing storyboard frames` },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      sceneIndex: txOutcome.sceneIndex,
      storyboardStatus: 'approved',
      storyboardApprovedAt: txOutcome.storyboardApprovedAt,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
