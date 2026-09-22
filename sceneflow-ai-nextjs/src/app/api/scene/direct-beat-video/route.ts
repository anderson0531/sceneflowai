import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Project from '../../../../models/Project'
import { sequelize } from '../../../../config/database'
import { composeBeatActionFraming } from '@/lib/intelligence/beat-sequence-planner-fallback'
import { directBeatVideo } from '@/lib/intelligence/beat-video-director'
import type { VideoDirectorMode } from '@/lib/intelligence/beat-video-director-fallback'
import { getSceneBeats } from '@/lib/script/beatMigration'
import {
  formatMusicCueSteer,
  parsePersistedMusicCues,
  resolveBeatMusicCue,
} from '@/lib/script/sceneMusicCues'
import { englishForModel, resolveRequestStoryLocale } from '@/i18n/server/requestLocale'

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
    const currentPrompt =
      typeof body.currentPrompt === 'string' ? body.currentPrompt : ''
    const mode = body.mode as VideoDirectorMode
    const enteredUserDirection =
      typeof body.userDirection === 'string' ? body.userDirection : undefined

    if (!projectId || sceneIndex < 0) {
      return NextResponse.json(
        { error: 'projectId and sceneIndex are required' },
        { status: 400 }
      )
    }
    if (mode !== 'optimize' && mode !== 'rewrite') {
      return NextResponse.json({ error: 'mode must be optimize or rewrite' }, { status: 400 })
    }
    if (mode === 'rewrite' && !enteredUserDirection?.trim() && !currentPrompt.trim()) {
      return NextResponse.json(
        { error: 'A current prompt or direction is required' },
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

    const scenes =
      project.metadata?.visionPhase?.script?.script?.scenes ||
      project.metadata?.visionPhase?.script?.scenes ||
      []
    const scene = scenes[sceneIndex]
    if (!scene) {
      return NextResponse.json({ error: 'Scene not found' }, { status: 404 })
    }

    const beats = getSceneBeats(scene as Record<string, unknown>)
    const beatIndex = beatId ? beats.findIndex((beat) => beat.beatId === beatId) : -1
    const beat = beatIndex >= 0 ? beats[beatIndex] : undefined
    if (beatId && !beat) {
      return NextResponse.json({ error: 'Beat not found' }, { status: 404 })
    }

    const { storyLocale, properNouns } = await resolveRequestStoryLocale(req, { projectId })
    const userDirection = enteredUserDirection
      ? await englishForModel(enteredUserDirection, storyLocale, properNouns)
      : undefined

    const cues = parsePersistedMusicCues(
      (scene as Record<string, unknown>).sceneMusicCues,
      beats
    )
    const scoreSteer =
      beatIndex >= 0 ? formatMusicCueSteer(resolveBeatMusicCue(cues, beatIndex)) : ''
    const beatLabel =
      beat?.kind === 'action'
        ? beat.actionDescription
        : beat?.line || beat?.kind

    try {
      const result = await directBeatVideo({
        mode: userDirection?.trim() ? 'rewrite' : 'optimize',
        currentPrompt,
        userDirection,
        beatLabel,
        actionFraming: beat ? composeBeatActionFraming(beat) : undefined,
        scoreSteer: scoreSteer || undefined,
      })
      return NextResponse.json({
        success: true,
        usedAI: result.usedAI,
        fallbackReason: result.fallbackReason,
        videoPrompt: result.videoPrompt,
      })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      console.warn(`[direct-beat-video] Gemini failed: ${message}`)
      const fallback = [currentPrompt.trim(), userDirection?.trim()].filter(Boolean).join('. ')
      return NextResponse.json({
        success: true,
        usedAI: false,
        fallbackReason: message,
        videoPrompt: fallback,
      })
    }
  } catch (error: unknown) {
    console.error('[direct-beat-video] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
