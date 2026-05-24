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
    const project = await Project.findByPk(projectId)
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const metadata = { ...(project.metadata || {}) }
    const visionPhase = { ...(metadata.visionPhase || {}) }
    const scenes = [...getVisionScriptScenes(visionPhase as Record<string, unknown>)]

    const { scene: matchedScene, index: sceneIndex } = findSceneById(scenes, sceneId)
    if (sceneIndex < 0 || !matchedScene) {
      return NextResponse.json({ error: 'Scene not found' }, { status: 404 })
    }

    const scene = { ...matchedScene }
    const beats = getSceneBeats(scene)
    const missing = beats.filter((b) => !b.storyboardImageUrl?.trim())
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `${missing.length} beat(s) missing storyboard frames` },
        { status: 400 }
      )
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

    await project.update({
      metadata: { ...metadata, visionPhase },
    })

    return NextResponse.json({
      success: true,
      sceneIndex,
      storyboardStatus: 'approved',
      storyboardApprovedAt: scene.storyboardApprovedAt,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
