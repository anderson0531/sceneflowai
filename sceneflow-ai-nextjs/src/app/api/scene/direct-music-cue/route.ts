import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Project from '../../../../models/Project'
import { sequelize } from '../../../../config/database'
import { getSceneBeats } from '@/lib/script/beatMigration'
import { englishForModel, resolveRequestStoryLocale } from '@/i18n/server/requestLocale'
import { estimateMusicCueDuration, parsePersistedMusicCues } from '@/lib/script/sceneMusicCues'
import { directMusicCue } from '@/lib/intelligence/music-cue-director'
import type { MusicCueDirectorMode } from '@/lib/intelligence/music-cue-director-fallback'

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
    const cueId = typeof body.cueId === 'string' ? body.cueId.trim() : ''
    const mode = body.mode as MusicCueDirectorMode
    const enteredUserDirection =
      typeof body.userDirection === 'string' ? body.userDirection : undefined

    if (!projectId || sceneIndex < 0 || !cueId) {
      return NextResponse.json(
        { error: 'projectId, sceneIndex, and cueId are required' },
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
    const cue = parsePersistedMusicCues(scene.sceneMusicCues, beats).find(
      (entry) => entry.cueId === cueId
    )
    if (!cue) {
      return NextResponse.json({ error: 'Music cue not found' }, { status: 404 })
    }

    const { storyLocale, properNouns } = await resolveRequestStoryLocale(req, { projectId })
    const userDirection = enteredUserDirection
      ? await englishForModel(enteredUserDirection, storyLocale, properNouns)
      : undefined

    const playSeconds = estimateMusicCueDuration(cue, beats, scene)

    try {
      const result = await directMusicCue({
        mode,
        cue,
        beats,
        scene,
        userDirection,
        playSeconds,
      })
      if (!result.patch) {
        return NextResponse.json(
          { error: result.fallbackReason || 'No rewrite returned' },
          { status: 502 }
        )
      }
      return NextResponse.json({
        success: true,
        usedAI: result.usedAI,
        patch: result.patch,
        playSeconds,
      })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      console.warn(`[direct-music-cue] Gemini failed: ${message}`)
      return NextResponse.json({ error: message || 'Rewrite failed' }, { status: 502 })
    }
  } catch (error: unknown) {
    console.error('[direct-music-cue] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
