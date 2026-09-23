import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Project from '../../../../models/Project'
import { sequelize } from '../../../../config/database'
import { getSceneBeats } from '@/lib/script/beatMigration'
import { englishForModel, resolveRequestStoryLocale } from '@/i18n/server/requestLocale'
import { directBeatPerformance } from '@/lib/intelligence/beat-performance-director'
import {
  beatMomentSummary,
  fallbackPerformancePatch,
  previewPerformanceRewrite,
  type BeatPerformanceMode,
} from '@/lib/intelligence/beat-performance-director-fallback'

export const runtime = 'nodejs'
export const maxDuration = 120

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await req.json()) as Record<string, unknown>
    const projectId = typeof body.projectId === 'string' ? body.projectId : ''
    const sceneIndex = typeof body.sceneIndex === 'number' ? body.sceneIndex : -1
    const beatId = typeof body.beatId === 'string' ? body.beatId.trim() : ''
    const mode = body.mode as BeatPerformanceMode
    const enteredUserDirection =
      typeof body.userDirection === 'string' ? body.userDirection : undefined

    if (!projectId || sceneIndex < 0 || !beatId) {
      return NextResponse.json(
        { error: 'projectId, sceneIndex, and beatId are required' },
        { status: 400 }
      )
    }
    if (mode !== 'optimize' && mode !== 'rewrite') {
      return NextResponse.json({ error: 'mode must be optimize or rewrite' }, { status: 400 })
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

    const scenes =
      project.metadata?.visionPhase?.script?.script?.scenes ||
      project.metadata?.visionPhase?.script?.scenes ||
      []
    const scene = scenes[sceneIndex] as Record<string, unknown> | undefined
    if (!scene) {
      return NextResponse.json({ error: 'Scene not found' }, { status: 404 })
    }

    const beats = getSceneBeats(scene)
    const beatIndex = beats.findIndex((beat) => beat.beatId === beatId)
    const beat = beatIndex >= 0 ? beats[beatIndex] : undefined
    if (!beat) {
      return NextResponse.json({ error: 'Beat not found' }, { status: 404 })
    }

    const { storyLocale, properNouns } = await resolveRequestStoryLocale(req, { projectId })
    const userDirection = enteredUserDirection
      ? await englishForModel(enteredUserDirection, storyLocale, properNouns)
      : undefined

    const visionPhase = project.metadata?.visionPhase || {}
    const catalog = {
      characterNames: Array.isArray(visionPhase.characters)
        ? visionPhase.characters
            .map((c: { name?: string }) => String(c?.name ?? '').trim())
            .filter(Boolean)
        : [],
      propNames: Array.isArray(visionPhase.references?.objectReferences)
        ? visionPhase.references.objectReferences
            .map((o: { name?: string }) => String(o?.name ?? '').trim())
            .filter(Boolean)
        : [],
      locationNames: Array.isArray(visionPhase.references?.locationReferences)
        ? visionPhase.references.locationReferences
            .map((l: { location?: string; name?: string }) =>
              String(l?.location || l?.name || '').trim()
            )
            .filter(Boolean)
        : [],
    }

    const request = {
      mode,
      beat,
      beatIndex,
      scene,
      previousMoment: beatMomentSummary(beats[beatIndex - 1]),
      nextMoment: beatMomentSummary(beats[beatIndex + 1]),
      catalog,
      userDirection,
    }

    let patch = fallbackPerformancePatch(beat, userDirection)
    let usedAI = false
    let fallbackReason: string | undefined
    try {
      const result = await directBeatPerformance(request)
      if (result.patch) {
        patch = result.patch
        usedAI = result.usedAI
      }
      fallbackReason = result.fallbackReason
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      console.warn(`[direct-beat] Gemini failed: ${message}`)
      fallbackReason = message
    }

    const preview = previewPerformanceRewrite(beat, patch)
    return NextResponse.json({
      success: true,
      usedAI,
      fallbackReason,
      patch,
      prose: preview.prose,
    })
  } catch (error: unknown) {
    console.error('[direct-beat] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
