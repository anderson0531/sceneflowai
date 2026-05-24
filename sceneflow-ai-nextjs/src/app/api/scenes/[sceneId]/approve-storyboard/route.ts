import { NextRequest, NextResponse } from 'next/server'
import Project from '../../../../../models/Project'
import { sequelize } from '../../../../../config/database'

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
    const scriptRoot = visionPhase.script || {}
    const nested = scriptRoot.script || {}
    const scenes = [...(nested.scenes || scriptRoot.scenes || [])]

    const sceneIndex = scenes.findIndex(
      (s: { id?: string; sceneNumber?: number }, idx: number) =>
        s?.id === sceneId || String(s?.sceneNumber) === sceneId || String(idx) === sceneId
    )
    if (sceneIndex < 0) {
      return NextResponse.json({ error: 'Scene not found' }, { status: 404 })
    }

    const scene = { ...(scenes[sceneIndex] as Record<string, unknown>) }
    const beats = Array.isArray(scene.beats) ? scene.beats : []
    const missing = beats.filter(
      (b: { storyboardImageUrl?: string }) => !b?.storyboardImageUrl?.trim()
    )
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `${missing.length} beat(s) missing storyboard frames` },
        { status: 400 }
      )
    }

    scene.storyboardStatus = 'approved'
    scene.storyboardApprovedAt = new Date().toISOString()
    scenes[sceneIndex] = scene

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
