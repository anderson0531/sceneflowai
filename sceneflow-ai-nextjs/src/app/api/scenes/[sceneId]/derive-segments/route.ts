import { NextRequest, NextResponse } from 'next/server'
import Project from '../../../../../models/Project'
import { sequelize } from '../../../../../config/database'
import {
  applyBeatSplitAndDerive,
  deriveSegmentsFromBeats,
} from '@/lib/scene/deriveSegmentsFromBeats'
import { isBeatFirstPipelineEnabled } from '@/lib/script/beatMigration'
import { resolveProjectArtStyle } from '@/lib/vision/artStyle'
import { compileBeatVideoPrompt } from '@/lib/scene/beatVideoPromptCompiler'
import { getSceneBeats } from '@/lib/script/beatMigration'

export const runtime = 'nodejs'
export const maxDuration = 120

interface DeriveSegmentsBody {
  projectId: string
  /** Apply recommended split for this beat before deriving. */
  extendBeatId?: string
  /** Skip storyboard approval check (legacy / admin). */
  skipApprovalCheck?: boolean
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ sceneId: string }> }
) {
  try {
    const { sceneId } = await context.params
    const body = (await req.json()) as DeriveSegmentsBody
    const { projectId, extendBeatId, skipApprovalCheck } = body

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
    const project = await Project.findByPk(projectId)
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const metadata = project.metadata || {}
    const visionPhase = metadata.visionPhase || {}
    const scenes =
      visionPhase?.script?.script?.scenes || visionPhase?.script?.scenes || []
    const sceneIndex = scenes.findIndex(
      (s: { id?: string; sceneNumber?: number }, idx: number) =>
        s?.id === sceneId || String(s?.sceneNumber) === sceneId || String(idx) === sceneId
    )
    if (sceneIndex < 0) {
      return NextResponse.json({ error: 'Scene not found' }, { status: 404 })
    }

    const scene = scenes[sceneIndex] as Record<string, unknown>
    const artStyleId = resolveProjectArtStyle(metadata)

    const result = extendBeatId
      ? applyBeatSplitAndDerive(scene, extendBeatId)
      : deriveSegmentsFromBeats(scene, {
          requireApproved: !skipApprovalCheck,
        })

    if (result.errors.length > 0) {
      return NextResponse.json(
        { success: false, errors: result.errors, segments: [] },
        { status: 400 }
      )
    }

    const workingScene = result.updatedScene ?? scene
    if (result.updatedScene) {
      scenes[sceneIndex] = workingScene
      const scriptRoot = visionPhase.script || {}
      const nested = scriptRoot.script || {}
      if (nested.scenes) {
        visionPhase.script = { ...scriptRoot, script: { ...nested, scenes } }
      } else {
        visionPhase.script = { ...scriptRoot, scenes }
      }
      await project.update({
        metadata: { ...metadata, visionPhase },
      })
    }

    const beats = getSceneBeats(workingScene)
    const segments = result.segments.map((seg) => {
      const beat = beats.find((b) => b.beatId === seg.beatId)
      if (!beat) return seg
      const compiled = compileBeatVideoPrompt(beat, {
        artStyleId,
        excerpt: seg.dialoguePortion?.excerpt,
      })
      return {
        ...seg,
        generatedPrompt: compiled.prompt,
        videoPrompt: compiled.prompt,
        userEditedPrompt: null,
      }
    })

    return NextResponse.json({
      success: true,
      sceneIndex,
      sceneId,
      segments,
      segmentCount: segments.length,
      artStyleId,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[derive-segments]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
