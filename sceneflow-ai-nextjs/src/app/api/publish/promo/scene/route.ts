/**
 * Promo scene upsert + narration/music generation.
 *
 * POST /api/publish/promo/scene
 * body: { projectId, action: 'upsert' | 'narration' | 'music', ... }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Project from '@/models/Project'
import { sequelize } from '@/config/database'
import { generateText } from '@/lib/vertexai/gemini'
import { getGeminiTextModel } from '@/lib/config/modelConfig'
import { getSceneProductionStateFromMetadata } from '@/lib/final-cut/projectProductionState'
import { planPromoTrailer, DEFAULT_TRAILER_SEC } from '@/lib/publish/trailerPlanner'
import {
  buildPromoSceneFromPlan,
  findPromoSceneIndex,
  upsertPromoSceneInScenes,
} from '@/lib/publish/buildPromoScene'
import { generateMusicTrackServer } from '@/lib/audio/musicClient'

export const dynamic = 'force-dynamic'
export const maxDuration = 120
export const runtime = 'nodejs'

function getScenesFromMetadata(metadata: Record<string, unknown>): unknown[] {
  const visionPhase = metadata.visionPhase as Record<string, unknown> | undefined
  const scriptWrapper = visionPhase?.script as
    | { script?: { scenes?: unknown[] }; scenes?: unknown[] }
    | undefined
  return scriptWrapper?.script?.scenes ?? scriptWrapper?.scenes ?? []
}

function setScenesOnMetadata(
  metadata: Record<string, unknown>,
  scenes: unknown[]
): Record<string, unknown> {
  const visionPhase = { ...((metadata.visionPhase as Record<string, unknown>) || {}) }
  const scriptWrapper = { ...((visionPhase.script as Record<string, unknown>) || {}) }
  if (
    scriptWrapper.script &&
    typeof scriptWrapper.script === 'object' &&
    !Array.isArray(scriptWrapper.script)
  ) {
    scriptWrapper.script = {
      ...(scriptWrapper.script as Record<string, unknown>),
      scenes,
    }
  } else {
    scriptWrapper.scenes = scenes
  }
  visionPhase.script = scriptWrapper
  visionPhase.scriptUpdatedAt = new Date().toISOString()
  return { ...metadata, visionPhase }
}

function seedProductionOnMetadata(
  metadata: Record<string, unknown>,
  sceneId: string,
  productionSeed: Record<string, unknown>
): Record<string, unknown> {
  const visionPhase = { ...((metadata.visionPhase as Record<string, unknown>) || {}) }
  const production = {
    ...((visionPhase.production as Record<string, unknown>) || {}),
  }
  const scenes = {
    ...((production.scenes as Record<string, unknown>) || {}),
    [sceneId]: {
      ...((scenesExisting(production, sceneId) as Record<string, unknown>) || {}),
      ...productionSeed,
      sceneId,
      updatedAt: new Date().toISOString(),
    },
  }
  production.scenes = scenes
  visionPhase.production = production
  return { ...metadata, visionPhase }
}

function scenesExisting(
  production: Record<string, unknown>,
  sceneId: string
): unknown {
  const scenes = production.scenes as Record<string, unknown> | undefined
  return scenes?.[sceneId]
}

async function generatePromoNarrationScript(opts: {
  title: string
  logline?: string
  genre?: string
  beatLabels: string[]
}): Promise<string> {
  const prompt = `Write a captivating 60-second film trailer voice-over narration (2–4 short sentences, ~35–55 words).
Title: ${opts.title}
${opts.logline ? `Logline: ${opts.logline}` : ''}
${opts.genre ? `Genre: ${opts.genre}` : ''}
Highlight moments: ${opts.beatLabels.slice(0, 8).join('; ')}

Rules:
- Present tense, cinematic, urgent but not spoiler-heavy
- No stage directions, no character names unless essential
- Return ONLY the narration text`

  const result = await generateText(prompt, {
    model: getGeminiTextModel('flash'),
    temperature: 0.7,
    maxOutputTokens: 256,
  })
  return result.text.trim().replace(/^["']|["']$/g, '')
}

async function synthesizeNarrationTts(opts: {
  text: string
  projectId: string
  baseUrl: string
  cookie: string
}): Promise<string | null> {
  try {
    const res = await fetch(`${opts.baseUrl}/api/tts/google`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: opts.cookie,
      },
      body: JSON.stringify({
        text: opts.text,
        voiceName: 'en-US-Chirp3-HD-Charon',
        speakingRate: 1.05,
        saveToBlob: true,
        projectId: opts.projectId,
      }),
    })
    if (!res.ok) {
      // Fallback: store text-only narration without audio URL
      console.warn('[Promo Scene] TTS failed:', await res.text().catch(() => ''))
      return null
    }
    const data = await res.json()
    return data.url || data.audioUrl || null
  } catch (err) {
    console.warn('[Promo Scene] TTS error:', err)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await sequelize.authenticate()

    const body = (await request.json()) as {
      projectId?: string
      action?: 'upsert' | 'narration' | 'music'
      targetDurationSec?: number
      heroBeatIds?: string[]
      sceneScores?: Record<number, number>
      scenes?: unknown[]
    }

    const projectId = (body.projectId || '').trim()
    const action = body.action || 'upsert'
    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
    }

    const project = await Project.findByPk(projectId)
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }
    if (project.user_id !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    let metadata = { ...(project.metadata || {}) } as Record<string, unknown>
    const clientScenes = Array.isArray(body.scenes) ? body.scenes : null
    let scenes = clientScenes?.length ? clientScenes : getScenesFromMetadata(metadata)
    if (!scenes.length) {
      return NextResponse.json({ error: 'Project has no scenes' }, { status: 400 })
    }

    const productionState = getSceneProductionStateFromMetadata(metadata)
    const targetDurationSec = body.targetDurationSec ?? DEFAULT_TRAILER_SEC
    const url = new URL(request.url)
    const baseUrl = `${url.protocol}//${url.host}`
    const cookie = request.headers.get('cookie') || ''

    if (action === 'upsert') {
      const plan = planPromoTrailer({
        scenes,
        sceneProductionState: productionState,
        sceneScores: body.sceneScores,
        heroBeatIds: body.heroBeatIds,
        targetDurationSec,
      })

      const existingIdx = findPromoSceneIndex(scenes)
      const existing =
        existingIdx >= 0 ? (scenes[existingIdx] as Record<string, unknown>) : null

      const { scene, productionSeed } = buildPromoSceneFromPlan({
        beatPlan: plan.beatPlan,
        targetDurationSec: plan.targetDurationSec,
        projectTitle: project.title,
        existingPromoScene: existing,
      })

      scenes = upsertPromoSceneInScenes(scenes, scene)
      metadata = setScenesOnMetadata(metadata, scenes)
      metadata = seedProductionOnMetadata(
        metadata,
        scene.id,
        productionSeed as unknown as Record<string, unknown>
      )

      project.metadata = metadata
      project.changed('metadata', true)
      await project.save()

      return NextResponse.json({
        success: true,
        action: 'upsert',
        beatPlan: plan.beatPlan,
        totalDurationSec: plan.totalDurationSec,
        targetDurationSec: plan.targetDurationSec,
        promoScene: scene,
        scenes,
        metadata,
      })
    }

    const promoIdx = findPromoSceneIndex(scenes)
    if (promoIdx < 0) {
      return NextResponse.json(
        { error: 'Create a promo scene first' },
        { status: 400 }
      )
    }
    const promoScene = { ...(scenes[promoIdx] as Record<string, unknown>) }

    if (action === 'narration') {
      const beatLabels = planLabels(promoScene)
      const narrationText = await generatePromoNarrationScript({
        title: project.title || 'Untitled',
        logline: typeof project.description === 'string' ? project.description : undefined,
        genre: typeof project.genre === 'string' ? project.genre : undefined,
        beatLabels,
      })

      const audioUrl = await synthesizeNarrationTts({
        text: narrationText,
        projectId,
        baseUrl,
        cookie,
      })

      // Rebuild with narration beat while preserving music
      const plan =
        Array.isArray(promoScene.promoBeatPlan) && promoScene.promoBeatPlan.length
          ? { beatPlan: promoScene.promoBeatPlan as import('@/types/publishingAssets').PromoTrailerBeatPlan[], targetDurationSec }
          : planPromoTrailer({
              scenes,
              sceneProductionState: productionState,
              targetDurationSec,
            })

      const { scene, productionSeed } = buildPromoSceneFromPlan({
        beatPlan: plan.beatPlan,
        targetDurationSec: plan.targetDurationSec ?? targetDurationSec,
        projectTitle: project.title,
        existingPromoScene: promoScene,
        narrationLine: narrationText,
      })

      if (audioUrl) {
        scene.dialogueAudio = {
          en: [
            {
              character: 'NARRATOR',
              kind: 'narration',
              line: narrationText,
              audioUrl,
            },
          ],
        }
        const narrationBeat = scene.beats.find((b) => b.kind === 'narration')
        if (narrationBeat) narrationBeat.audioUrl = audioUrl
      }

      scenes = upsertPromoSceneInScenes(scenes, scene)
      metadata = setScenesOnMetadata(metadata, scenes)
      metadata = seedProductionOnMetadata(
        metadata,
        scene.id,
        productionSeed as unknown as Record<string, unknown>
      )
      project.metadata = metadata
      project.changed('metadata', true)
      await project.save()

      return NextResponse.json({
        success: true,
        action: 'narration',
        narrationText,
        audioUrl,
        promoScene: scene,
        scenes,
        metadata,
      })
    }

    if (action === 'music') {
      const musicPrompt =
        typeof promoScene.music === 'string' && promoScene.music.trim()
          ? promoScene.music
          : `Cinematic promotional trailer score for "${project.title}", building tension, emotional swell, memorable theme, no vocals`

      const music = await generateMusicTrackServer(
        baseUrl,
        {
          text: musicPrompt,
          duration: Math.min(60, targetDurationSec),
          saveToBlob: true,
          projectId,
          sceneId: String(promoScene.id || 'promo'),
        },
        cookie
      )

      if (!music?.url) {
        return NextResponse.json(
          { error: 'Promo music generation failed' },
          { status: 500 }
        )
      }

      promoScene.music = musicPrompt
      promoScene.musicAudio = music.url
      scenes[promoIdx] = promoScene
      metadata = setScenesOnMetadata(metadata, scenes)
      project.metadata = metadata
      project.changed('metadata', true)
      await project.save()

      return NextResponse.json({
        success: true,
        action: 'music',
        musicUrl: music.url,
        promoScene,
        scenes,
        metadata,
      })
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
  } catch (error) {
    console.error('[Promo Scene] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Promo scene failed' },
      { status: 500 }
    )
  }
}

function planLabels(promoScene: Record<string, unknown>): string[] {
  const plan = promoScene.promoBeatPlan
  if (Array.isArray(plan)) {
    return plan
      .map((b) => (b && typeof b === 'object' ? String((b as { label?: string }).label || '') : ''))
      .filter(Boolean)
  }
  const beats = promoScene.beats
  if (Array.isArray(beats)) {
    return beats
      .map((b) =>
        b && typeof b === 'object'
          ? String(
              (b as { line?: string; actionDescription?: string }).line ||
                (b as { actionDescription?: string }).actionDescription ||
                ''
            )
          : ''
      )
      .filter(Boolean)
  }
  return []
}