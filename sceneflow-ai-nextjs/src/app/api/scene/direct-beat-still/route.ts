import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Project from '../../../../models/Project'
import { sequelize } from '../../../../config/database'
import { composeBeatActionFraming } from '@/lib/intelligence/beat-sequence-planner-fallback'
import {
  mergeDirectOverlaysIntoPatch,
  parseStillDirectorPatch,
  previewActionFramingFromPatch,
  type StillDirectorMode,
  type StillDirectorOverlay,
} from '@/lib/intelligence/beat-still-director-fallback'
import { directBeatStills } from '@/lib/intelligence/beat-still-director'
import { getSceneBeats } from '@/lib/script/beatMigration'
import { englishForModel, resolveRequestStoryLocale } from '@/i18n/server/requestLocale'

export const runtime = 'nodejs'
export const maxDuration = 120

function overlayFromBody(body: Record<string, unknown>): StillDirectorOverlay | undefined {
  const visualSetup =
    body.visualSetup && typeof body.visualSetup === 'object'
      ? (body.visualSetup as Record<string, unknown>)
      : undefined
  const talentDirection =
    body.talentDirection && typeof body.talentDirection === 'object'
      ? (body.talentDirection as Record<string, unknown>)
      : undefined
  const overlay: StillDirectorOverlay = {
    shotType: typeof visualSetup?.shotType === 'string' ? visualSetup.shotType : undefined,
    cameraAngle: typeof visualSetup?.cameraAngle === 'string' ? visualSetup.cameraAngle : undefined,
    lighting: typeof visualSetup?.lighting === 'string' ? visualSetup.lighting : undefined,
    talentBlocking:
      typeof talentDirection?.talentBlocking === 'string'
        ? talentDirection.talentBlocking
        : undefined,
    emotionalBeat:
      typeof talentDirection?.emotionalBeat === 'string' ? talentDirection.emotionalBeat : undefined,
    keyProps: typeof talentDirection?.keyProps === 'string' ? talentDirection.keyProps : undefined,
  }
  return Object.values(overlay).some((value) => typeof value === 'string' && value.trim())
    ? overlay
    : undefined
}

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
    const mode = body.mode as StillDirectorMode
    const enteredUserDirection =
      typeof body.userDirection === 'string' ? body.userDirection : undefined

    if (!projectId || sceneIndex < 0 || !beatId) {
      return NextResponse.json(
        { error: 'projectId, sceneIndex, and beatId are required' },
        { status: 400 }
      )
    }
    if (mode !== 'optimize' && mode !== 'suggest' && mode !== 'rewrite') {
      return NextResponse.json({ error: 'mode must be optimize, suggest, or rewrite' }, { status: 400 })
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
    const beatIndex = beats.findIndex((beat) => beat.beatId === beatId)
    const beat = beatIndex >= 0 ? beats[beatIndex] : undefined
    if (!beat) {
      return NextResponse.json({ error: 'Beat not found' }, { status: 404 })
    }

    const { storyLocale, properNouns } = await resolveRequestStoryLocale(req, { projectId })
    const userDirection = enteredUserDirection
      ? await englishForModel(enteredUserDirection, storyLocale, properNouns)
      : undefined

    const overlay = overlayFromBody(body)
    const previous = beats[beatIndex - 1]
    const next = beats[beatIndex + 1]
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

    let result
    try {
      result = await directBeatStills({
        mode,
        beats: [
          {
            beatIndex,
            beat,
            previousMoment: previous ? composeBeatActionFraming(previous) : undefined,
            nextMoment: next ? composeBeatActionFraming(next) : undefined,
          },
        ],
        catalog,
        userDirection,
        overlay,
      })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      console.warn(`[direct-beat-still] Gemini failed: ${message}`)
      const overlayPatch = mergeDirectOverlaysIntoPatch({}, overlay)
      const fallbackPatch = parseStillDirectorPatch(overlayPatch) ?? overlayPatch
      return NextResponse.json({
        success: true,
        usedAI: false,
        fallbackReason: message,
        patch: fallbackPatch,
        actionFraming: previewActionFramingFromPatch(beat, fallbackPatch),
        suggestedNotes: userDirection?.trim() || undefined,
      })
    }

    const directed = result.patches[0]
    const patch = directed?.patch ?? mergeDirectOverlaysIntoPatch({}, overlay)
    return NextResponse.json({
      success: true,
      usedAI: result.usedAI,
      fallbackReason: result.fallbackReason,
      patch,
      actionFraming: previewActionFramingFromPatch(beat, patch),
      suggestedNotes: patch.suggestedNotes || userDirection?.trim() || undefined,
    })
  } catch (error: unknown) {
    console.error('[direct-beat-still] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
