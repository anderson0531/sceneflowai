/**
 * Promo scene upsert + narration/music generation.
 *
 * POST /api/publish/promo/scene
 * body: { projectId, action: 'plan' | 'upsert' | 'narration' | 'music', beatPlan?, ... }
 */

import { NextRequest, NextResponse } from 'next/server'
import { sequelize } from '@/config/database'
import { assertProjectAccess, getAuthenticatedUserId } from '@/lib/projectAccess'
import { generateText } from '@/lib/vertexai/gemini'
import { getGeminiTextModel } from '@/lib/config/modelConfig'
import { getSceneProductionStateFromMetadata } from '@/lib/final-cut/projectProductionState'
import { clampGenerationDuration } from '@/lib/audio/lyriaClient'
import { generateMusicTrackServer } from '@/lib/audio/musicClient'
import { chunkNarrationText } from '@/lib/blueprint/sectionNarrationText'
import {
  findCachedNarrationAudio,
  hashNarrationAudio,
  narrationAudioPathname,
  storeNarrationAudio,
} from '@/lib/blueprint/narrationAudioCache'
import { buildPromoShotCatalog } from '@/lib/publish/promoShotCatalog'
import { normalizePromoModelPlan, planPromoTrailerWithModel } from '@/lib/publish/promoPlanModel'
import { promoLanguageName, promoNarrationWordBudget } from '@/lib/publish/promoLanguage'
import { upsertPublishingState } from '@/lib/publish/publishingState'
import {
  planPromoTrailer,
  DEFAULT_TRAILER_SEC,
  MAX_TRAILER_SEC,
  MIN_TRAILER_SEC,
} from '@/lib/publish/trailerPlanner'
import { normalizeStreamLanguage } from '@/lib/scene/languageClipVersions'
import {
  DEFAULT_BLUEPRINT_GEMINI_VOICE,
  DEFAULT_GEMINI_TTS_MODEL,
  NARRATION_CHUNK_BYTES,
} from '@/lib/tts/blueprintTtsConstants'
import { synthesizeGeminiFlashMp3 } from '@/lib/tts/geminiFlashTts'
import { resolveGeminiTtsLanguageCode } from '@/lib/tts/googleTtsLocale'
import {
  createAudienceDefinition,
  formatAudienceDefinitionForPrompt,
  type AudienceDefinition,
} from '@/lib/types/audienceResonance'
import type { ProjectPublishingPromo, ProjectPublishingState, PromoTrailerBeatPlan } from '@/types/publishingAssets'
import {
  buildPromoSceneFromPlan,
  findPromoSceneIndex,
  upsertPromoSceneInScenes,
} from '@/lib/publish/buildPromoScene'

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

function clampTrailerSec(value: number | undefined): number {
  const target = typeof value === 'number' && Number.isFinite(value) ? value : DEFAULT_TRAILER_SEC
  return Math.min(MAX_TRAILER_SEC, Math.max(MIN_TRAILER_SEC, Math.round(target)))
}

function audiencePromptText(raw: unknown): string | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const description = (raw as { description?: unknown }).description
  if (typeof description !== 'string' || !description.trim()) return undefined
  return formatAudienceDefinitionForPrompt(createAudienceDefinition(raw as Partial<AudienceDefinition>))
}

function readPromo(metadata: Record<string, unknown>): ProjectPublishingPromo | undefined {
  const visionPhase = metadata.visionPhase as { publishing?: ProjectPublishingState } | undefined
  return visionPhase?.publishing?.promo
}

function mergePromoPublishing(
  metadata: Record<string, unknown>,
  patch: Partial<ProjectPublishingPromo>
): Record<string, unknown> {
  const current = readPromo(metadata) || {}
  const languages = Array.from(
    new Set([...(current.languages || []), ...(patch.languages || [])].filter(Boolean))
  )
  const promo: ProjectPublishingPromo = {
    ...current,
    ...patch,
    languages: languages.length > 0 ? languages : current.languages,
    trailersByLanguage: patch.trailersByLanguage
      ? { ...current.trailersByLanguage, ...patch.trailersByLanguage }
      : current.trailersByLanguage,
  }
  return upsertPublishingState(metadata, { promo })
}

async function generatePromoNarrationScript(opts: {
  title: string
  logline?: string
  genre?: string
  beatLabels: string[]
  targetDurationSec: number
  language: string
  audienceText?: string
}): Promise<string> {
  const budget = promoNarrationWordBudget(opts.targetDurationSec)
  const languageName = promoLanguageName(opts.language)
  const prompt = `Write a captivating ${opts.targetDurationSec}-second film trailer voice-over narration (${budget.minWords}–${budget.maxWords} words).
Title: ${opts.title}
${opts.logline ? `Logline: ${opts.logline}` : ''}
${opts.genre ? `Genre: ${opts.genre}` : ''}
${opts.audienceText?.trim() ? `Target audience:\n${opts.audienceText.trim()}` : ''}
Highlight moments: ${opts.beatLabels.slice(0, 12).join('; ')}

Rules:
- Write the narration in ${languageName}
- Present tense, cinematic, urgent but not spoiler-heavy
- Shape the appeal for the target audience
- No stage directions, no character names unless essential
- Return ONLY the narration text`

  const result = await generateText(prompt, {
    model: getGeminiTextModel('flash'),
    temperature: 0.7,
    maxOutputTokens: 512,
  })
  return result.text.trim().replace(/^["']|["']$/g, '')
}

async function synthesizeNarrationTts(opts: {
  text: string
  language: string
}): Promise<string | null> {
  try {
    const languageCode = resolveGeminiTtsLanguageCode(opts.language)
    const voiceId = DEFAULT_BLUEPRINT_GEMINI_VOICE
    const model = process.env.GEMINI_TTS_MODEL?.trim() || DEFAULT_GEMINI_TTS_MODEL
    const pathname = narrationAudioPathname(
      hashNarrationAudio({
        text: opts.text,
        voiceId,
        languageCode,
        model,
      })
    )
    const cached = await findCachedNarrationAudio(pathname)
    if (cached) return cached

    const chunks = chunkNarrationText(opts.text, NARRATION_CHUNK_BYTES)
    const buffers: Buffer[] = []
    for (const chunk of chunks) {
      buffers.push(
        await synthesizeGeminiFlashMp3({
          text: chunk,
          voiceId,
          languageCode,
          audioType: 'narration',
        })
      )
    }
    const audio = buffers.length === 1 ? buffers[0]! : Buffer.concat(buffers)
    if (!audio.length) return null
    return await storeNarrationAudio(pathname, audio)
  } catch (err) {
    console.warn('[Promo Scene] TTS error:', err)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const ownerUserId = await getAuthenticatedUserId(request)
    if (!ownerUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await sequelize.authenticate()

    const body = (await request.json()) as {
      projectId?: string
      action?: 'plan' | 'upsert' | 'narration' | 'music'
      targetDurationSec?: number
      heroBeatIds?: string[]
      sceneScores?: Record<number, number>
      scenes?: unknown[]
      beatPlan?: PromoTrailerBeatPlan[]
      sceneProductionState?: Record<string, unknown>
      audienceDefinition?: Partial<AudienceDefinition>
      directorNotes?: string
      language?: string
      aspect?: '16:9' | '9:16'
    }

    const projectId = (body.projectId || '').trim()
    const action = body.action || 'upsert'
    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
    }

    const access = await assertProjectAccess(projectId, ownerUserId)
    if (!access.ok) {
      const error =
        access.status === 403
          ? 'You do not have permission to update this project'
          : access.error
      return NextResponse.json({ error }, { status: access.status })
    }
    const project = access.project

    let metadata = { ...(project.metadata || {}) } as Record<string, unknown>
    const clientScenes = Array.isArray(body.scenes) ? body.scenes : null
    let scenes = clientScenes?.length ? clientScenes : getScenesFromMetadata(metadata)
    if (!scenes.length) {
      return NextResponse.json({ error: 'Project has no scenes' }, { status: 400 })
    }

    const productionState =
      body.sceneProductionState && typeof body.sceneProductionState === 'object'
        ? body.sceneProductionState
        : getSceneProductionStateFromMetadata(metadata)
    const targetDurationSec = clampTrailerSec(body.targetDurationSec)
    const language = normalizeStreamLanguage(body.language)
    const audienceText = audiencePromptText(body.audienceDefinition)
    const url = new URL(request.url)
    const baseUrl = `${url.protocol}//${url.host}`
    const cookie = request.headers.get('cookie') || ''

    const promoOptions: Partial<ProjectPublishingPromo> = {
      targetDurationSec,
      languages: [language],
      ...(body.aspect === '16:9' || body.aspect === '9:16' ? { aspect: body.aspect } : {}),
      ...(body.audienceDefinition && audienceText
        ? { audienceDefinition: createAudienceDefinition(body.audienceDefinition) }
        : {}),
    }

    const planInput = {
      scenes,
      sceneProductionState: productionState,
      sceneScores: body.sceneScores,
      heroBeatIds: body.heroBeatIds,
      targetDurationSec,
      title: project.title,
      logline: typeof project.description === 'string' ? project.description : undefined,
      genre: typeof project.genre === 'string' ? project.genre : undefined,
      audienceText,
      directorNotes: typeof body.directorNotes === 'string' ? body.directorNotes : undefined,
      currentPlan: Array.isArray(body.beatPlan) ? body.beatPlan : undefined,
    }

    if (action === 'plan') {
      const plan = await planPromoTrailerWithModel(planInput)
      metadata = mergePromoPublishing(metadata, promoOptions)
      project.metadata = metadata
      project.changed('metadata', true)
      await project.save()
      return NextResponse.json({
        success: true,
        action: 'plan',
        beatPlan: plan.beatPlan,
        totalDurationSec: plan.totalDurationSec,
        targetDurationSec: plan.targetDurationSec,
        source: plan.source,
        metadata,
      })
    }

    if (action === 'upsert') {
      const catalog = buildPromoShotCatalog(planInput)
      const accepted =
        Array.isArray(body.beatPlan) && body.beatPlan.length
          ? normalizePromoModelPlan({
              catalog,
              picks: body.beatPlan,
              targetDurationSec,
            })
          : null
      const plan = accepted ?? (await planPromoTrailerWithModel(planInput))

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
      metadata = mergePromoPublishing(metadata, promoOptions)

      project.metadata = metadata
      project.changed('metadata', true)
      await project.save()

      return NextResponse.json({
        success: true,
        action: 'upsert',
        beatPlan: plan.beatPlan,
        totalDurationSec: plan.totalDurationSec,
        targetDurationSec: plan.targetDurationSec,
        source: plan.source,
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
        targetDurationSec,
        language,
        audienceText,
      })

      const audioUrl = await synthesizeNarrationTts({
        text: narrationText,
        language,
      })

      // Rebuild with narration beat while preserving music
      const storedPlan =
        Array.isArray(promoScene.promoBeatPlan) && promoScene.promoBeatPlan.length
          ? (promoScene.promoBeatPlan as import('@/types/publishingAssets').PromoTrailerBeatPlan[])
          : null
      const catalog = buildPromoShotCatalog({
        scenes,
        sceneProductionState: productionState,
      })
      const plan = storedPlan
        ? {
            beatPlan: storedPlan.map((beat) => {
              const shot = catalog.find(
                (entry) => entry.sceneIndex === beat.sceneIndex && entry.beatId === beat.beatId
              )
              if (!shot?.videoUrl && !shot?.frameUrl) return beat
              return {
                ...beat,
                videoUrl: shot.videoUrl || beat.videoUrl,
                frameUrl: beat.frameUrl || shot.frameUrl,
              }
            }),
            targetDurationSec,
          }
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

      const priorAudio =
        scene.dialogueAudio && typeof scene.dialogueAudio === 'object' ? { ...scene.dialogueAudio } : {}
      scene.dialogueAudio = {
        ...priorAudio,
        [language]: [
          {
            character: 'NARRATOR',
            kind: 'narration',
            line: narrationText,
            ...(audioUrl ? { audioUrl } : {}),
          },
        ],
      }
      const narrationBeat = scene.beats.find((b) => b.kind === 'narration')
      if (narrationBeat && audioUrl) narrationBeat.audioUrl = audioUrl

      scenes = upsertPromoSceneInScenes(scenes, scene)
      metadata = setScenesOnMetadata(metadata, scenes)
      metadata = seedProductionOnMetadata(
        metadata,
        scene.id,
        productionSeed as unknown as Record<string, unknown>
      )
      metadata = mergePromoPublishing(metadata, promoOptions)
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
          duration: clampGenerationDuration(targetDurationSec),
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
      metadata = mergePromoPublishing(metadata, promoOptions)
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