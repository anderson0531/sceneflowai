/**
 * Beat Sequence Planner — one Gemini pass per scene to plan distinct F2V start-frame
 * prompts for every beat before parallel image generation.
 */

import 'server-only'

import { generateText, type TextGenerationOptions } from '@/lib/vertexai/gemini'
import { isTitleOrCinematicScene } from '@/lib/script/sceneClassification'
import {
  detectSceneType,
  extractDirectionMetadata,
  type FilmContext,
  type SceneType,
} from '@/lib/intelligence/scene-image-intelligence'
import { generateDirectionHash } from '@/lib/utils/contentHash'
import type { SceneBeat } from '@/lib/script/segmentTypes'

function getSceneDirection(scene: Record<string, unknown>): Record<string, any> | undefined {
  const d = scene.sceneDirection
  return d && typeof d === 'object' ? (d as Record<string, any>) : undefined
}

// =============================================================================
// Types
// =============================================================================

export type BeatRole =
  | 'opening'
  | 'progression'
  | 'climax'
  | 'title_reveal'
  | 'credit'
  | 'dissolve'
  | 'dialogue'
  | 'narration_backdrop'

export interface BeatKeyframePlan {
  beatIndex: number
  beatRole: BeatRole
  shotType: string
  frozenMoment: string
  prompt: string
  allowTypography: boolean
  durationSeconds?: number
  negativeAdditions?: string[]
}

export interface BeatSequencePlanRequest {
  scene: Record<string, unknown>
  beats: SceneBeat[]
  sceneNumber: number
  totalScenes?: number
  filmContext?: FilmContext
  artStyle?: string
  projectId?: string
  /** Skip Gemini and use deterministic fallback (tests / offline). */
  forceFallback?: boolean
}

export interface BeatSequencePlanResult {
  plans: BeatKeyframePlan[]
  usedAI: boolean
  reasoning?: string
}

// =============================================================================
// Cache (5-minute TTL, scene-level)
// =============================================================================

interface PlanCacheEntry {
  result: BeatSequencePlanResult
  timestamp: number
}

const planCache = new Map<string, PlanCacheEntry>()
const PLAN_CACHE_TTL_MS = 5 * 60 * 1000

export function getBeatPlanCacheKey(
  scene: Record<string, unknown>,
  beatCount: number,
  projectId?: string
): string {
  const directionHash = generateDirectionHash(scene)
  const heading = String(scene.heading ?? '').slice(0, 80)
  const actionHash = String(scene.action ?? scene.visualDescription ?? '').slice(0, 120)
  return [projectId ?? 'default', directionHash, beatCount, heading, actionHash].join('|')
}

function getCachedPlan(key: string): BeatSequencePlanResult | null {
  const entry = planCache.get(key)
  if (!entry) return null
  if (Date.now() - entry.timestamp > PLAN_CACHE_TTL_MS) {
    planCache.delete(key)
    return null
  }
  return entry.result
}

function setCachedPlan(key: string, result: BeatSequencePlanResult): void {
  if (planCache.size > 50) {
    const oldest = planCache.keys().next().value
    if (oldest) planCache.delete(oldest)
  }
  planCache.set(key, { result, timestamp: Date.now() })
}

// =============================================================================
// Beat role inference
// =============================================================================

export function inferBeatRole(
  beat: SceneBeat,
  beatIndex: number,
  totalBeats: number,
  sceneType: SceneType,
  filmTitle?: string
): BeatRole {
  if (beat.kind === 'dialogue') return 'dialogue'
  if (beat.kind === 'narration') return 'narration_backdrop'

  const text = (beat.actionDescription ?? '').toLowerCase()
  const title = (filmTitle ?? '').toLowerCase()

  if (
    sceneType === 'title' ||
    sceneType === 'credits' ||
    text.includes('title card') ||
    text.includes('centered typography')
  ) {
    if (text.includes('written by') || text.includes('credit')) return 'credit'
    if (
      text.includes('title card') ||
      text.includes('bold centered') ||
      (title && text.includes(title))
    ) {
      return 'title_reveal'
    }
    if (text.includes('dissolve') || text.includes('fade') || text.includes('hold')) {
      return beatIndex === totalBeats - 1 ? 'dissolve' : 'progression'
    }
    if (beatIndex === 0) return 'opening'
    if (beatIndex === totalBeats - 1) return 'dissolve'
    return 'progression'
  }

  if (beatIndex === 0) return 'opening'
  if (beatIndex === totalBeats - 1) return 'climax'
  return 'progression'
}

function roleAllowsTypography(role: BeatRole): boolean {
  return role === 'title_reveal' || role === 'credit'
}

// =============================================================================
// Direction helpers
// =============================================================================

function getDirectionShots(scene: Record<string, unknown>): string[] {
  const direction = getSceneDirection(scene)
  const shots = direction?.camera?.shots
  if (!Array.isArray(shots)) return []
  return shots.map((s) => String(s).trim()).filter(Boolean)
}

function getProgressiveMoments(scene: Record<string, unknown>, beatCount: number): string[] {
  const direction = getSceneDirection(scene)
  const sceneDescription = String(
    direction?.sceneDescription ?? scene.action ?? scene.visualDescription ?? ''
  ).trim()
  if (!sceneDescription) return []

  const sentences = sceneDescription.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 8)
  if (sentences.length === 0) return [sceneDescription]

  if (sentences.length >= beatCount) {
    return sentences.slice(0, beatCount)
  }

  const moments: string[] = []
  for (let i = 0; i < beatCount; i++) {
    const idx = Math.floor((i / beatCount) * sentences.length)
    moments.push(sentences[Math.min(idx, sentences.length - 1)])
  }
  return moments
}

function buildSetContext(scene: Record<string, unknown>, includeFull: boolean): string {
  const direction = getSceneDirection(scene)
  if (!includeFull) return ''
  const parts: string[] = []
  if (direction?.scene?.location) parts.push(String(direction.scene.location))
  if (direction?.scene?.atmosphere) parts.push(String(direction.scene.atmosphere))
  const props = direction?.scene?.keyProps
  if (Array.isArray(props) && props.length > 0) {
    parts.push(`Props: ${props.slice(0, 4).join(', ')}`)
  }
  const lighting = direction?.lighting
  if (lighting?.overallMood) parts.push(String(lighting.overallMood))
  if (lighting?.colorTemperature) parts.push(String(lighting.colorTemperature))
  return parts.filter(Boolean).join('. ')
}

// =============================================================================
// Fallback planner (deterministic, no Gemini)
// =============================================================================

export function buildFallbackBeatPlans(
  request: BeatSequencePlanRequest
): BeatKeyframePlan[] {
  const { scene, beats, sceneNumber, totalScenes, filmContext, artStyle } = request
  const heading = String(scene.heading ?? '')
  const action = String(scene.action ?? scene.visualDescription ?? '')
  const sceneType = detectSceneType(heading, action, sceneNumber, totalScenes)
  const shots = getDirectionShots(scene)
  const moments = getProgressiveMoments(scene, beats.length)
  const directionMeta = extractDirectionMetadata(getSceneDirection(scene))
  const filmTitle = filmContext?.title
  const style = artStyle || 'photorealistic'

  return beats.map((beat, beatIndex) => {
    const beatRole = inferBeatRole(beat, beatIndex, beats.length, sceneType, filmTitle)
    const shotType = shots[beatIndex] ?? shots[shots.length - 1] ?? 'Medium shot'
    const moment =
      beat.actionDescription?.trim() ||
      moments[beatIndex] ||
      `Beat ${beatIndex + 1} visual moment`
    const setContext = buildSetContext(scene, beatIndex === 0 || beatIndex === beats.length - 1)

    const frozenParts = [`${shotType}: ${moment}`]
    if (setContext) frozenParts.push(setContext)
    if (directionMeta.atmosphere && beatIndex === 0) {
      frozenParts.push(`Atmosphere: ${directionMeta.atmosphere}`)
    }

    const frozenMoment = frozenParts.join('. ').replace(/\.\s*\./g, '.').trim()
    const allowTypography = roleAllowsTypography(beatRole)

    let prompt = `${style} cinematic storyboard still. ${frozenMoment}.`
    if (allowTypography && filmTitle) {
      prompt += ` Centered bold typography displaying "${filmTitle}" as the main visual element.`
    } else if (beatRole === 'opening' || beatRole === 'progression' || beatRole === 'climax') {
      prompt += ' No on-screen text, no dialogue, no lip-sync. Single frozen F2V start frame.'
    } else if (beatRole === 'dissolve') {
      prompt += ' Soft transitional atmosphere, no on-screen text. Single frozen F2V start frame.'
    } else if (beat.kind === 'narration') {
      prompt += ' Voiceover backdrop — environment and mood only, no narrator on screen.'
    } else if (beat.kind === 'dialogue' && beat.character) {
      prompt += ` Focus on ${beat.character}${beat.line ? `: "${beat.line}"` : ''}.`
    }

    const durationSeconds =
      beatRole === 'climax' ? 6 : beatRole === 'title_reveal' ? 5 : beatRole === 'dissolve' ? 3 : 4

    return {
      beatIndex,
      beatRole,
      shotType,
      frozenMoment,
      prompt: prompt.trim(),
      allowTypography,
      durationSeconds,
    }
  })
}

// =============================================================================
// Validation
// =============================================================================

function validatePlans(plans: BeatKeyframePlan[], beatCount: number): BeatKeyframePlan[] | null {
  if (plans.length !== beatCount) return null
  const moments = plans.map((p) => p.frozenMoment.trim().toLowerCase())
  const uniqueMoments = new Set(moments)
  if (uniqueMoments.size < Math.min(beatCount, 2)) return null
  for (const plan of plans) {
    if (!plan.prompt || plan.prompt.trim().length < 20) return null
    if (!plan.frozenMoment || plan.frozenMoment.trim().length < 8) return null
  }
  return plans
}

// =============================================================================
// Gemini planner
// =============================================================================

function buildPlannerSystemPrompt(): string {
  return `You are a cinematic storyboard sequence planner. Plan DISTINCT frozen still-image keyframes for each beat in a scene — these are F2V (frame-to-video) START frames for Veo motion generation.

CRITICAL RULES:
1. Each beat gets ONE unique frozen moment — different subject, scale, composition, or story beat. Never repeat the same visual across beats.
2. NO camera movement in prompts — describe a single illustrative still, not motion.
3. Title typography ONLY on beats with beatRole "title_reveal" or "credit". All other beats: NO on-screen text.
4. Map direction.camera.shots to beats when provided (beat 0 → shot 0, etc.).
5. Follow the narrative arc: opening → progression → climax → title_reveal (if title scene) → dissolve.
6. Include atmosphere, lighting, and key props from direction cues where relevant.
7. Prompts must be Imagen-ready: 80-200 words, photorealistic/cinematic, art style applied.

Output JSON:
{
  "reasoning": "brief arc explanation",
  "beats": [
    {
      "beatIndex": 0,
      "beatRole": "opening|progression|climax|title_reveal|credit|dissolve|dialogue|narration_backdrop",
      "shotType": "Wide Shot",
      "frozenMoment": "one-sentence frozen moment description",
      "prompt": "full image generation prompt",
      "allowTypography": false,
      "durationSeconds": 4,
      "negativeAdditions": []
    }
  ]
}`
}

function buildPlannerUserPrompt(request: BeatSequencePlanRequest): string {
  const { scene, beats, sceneNumber, totalScenes, filmContext, artStyle } = request
  const heading = String(scene.heading ?? '')
  const action = String(scene.action ?? '')
  const visualDescription = String(scene.visualDescription ?? '')
  const direction = getSceneDirection(scene)
  const sceneType = detectSceneType(heading, action || visualDescription, sceneNumber, totalScenes)
  const directionMeta = extractDirectionMetadata(direction)
  const shots = getDirectionShots(scene)

  const parts: string[] = []
  parts.push(`Plan ${beats.length} DISTINCT keyframe prompts for this scene.`)
  parts.push('')
  parts.push(`SCENE ${sceneNumber}${totalScenes ? ` of ${totalScenes}` : ''}: ${heading}`)
  parts.push(`Scene Type: ${sceneType.toUpperCase()}`)
  if (filmContext?.title) parts.push(`Film Title: "${filmContext.title}"`)
  if (filmContext?.genre?.length) parts.push(`Genre: ${filmContext.genre.join(', ')}`)
  if (filmContext?.tone) parts.push(`Tone: ${filmContext.tone}`)
  parts.push(`Art Style: ${artStyle || 'photorealistic'}`)
  parts.push('')
  parts.push('SCENE ACTION:')
  parts.push(action || visualDescription || '(none)')
  parts.push('')

  if (shots.length > 0) {
    parts.push('CAMERA SHOTS (map to beats in order):')
    shots.forEach((shot, i) => parts.push(`  ${i + 1}. ${shot}`))
    parts.push('')
  }

  const cues: string[] = []
  if (directionMeta.atmosphere) cues.push(`Atmosphere: ${directionMeta.atmosphere}`)
  if (directionMeta.lightingMood) cues.push(`Lighting: ${directionMeta.lightingMood}`)
  if (directionMeta.colorTemperature) cues.push(`Color: ${directionMeta.colorTemperature}`)
  if (directionMeta.keyProps?.length) cues.push(`Props: ${directionMeta.keyProps.join(', ')}`)
  if (directionMeta.locationDescription) cues.push(`Location: ${directionMeta.locationDescription}`)
  if (direction?.audio?.priorities) cues.push(`Audio mood: ${direction.audio.priorities}`)
  if (cues.length > 0) {
    parts.push('DIRECTION CUES:')
    parts.push(cues.join('\n'))
    parts.push('')
  }

  parts.push('BEATS TO PLAN:')
  beats.forEach((beat, i) => {
    const label =
      beat.kind === 'action'
        ? beat.actionDescription ?? 'action beat'
        : beat.kind === 'narration'
          ? `narration: ${beat.line ?? ''}`
          : `dialogue: ${beat.character ?? ''} — ${beat.line ?? ''}`
    parts.push(`  Beat ${i} (${beat.kind}): ${label}`)
  })

  if (sceneType === 'title' && filmContext?.title) {
    parts.push('')
    parts.push(
      `TITLE SEQUENCE: Exactly ONE beat should use beatRole "title_reveal" with allowTypography true and centered "${filmContext.title}" typography. Other beats are atmospheric progression with NO text.`
    )
  }

  return parts.join('\n')
}

async function planWithGemini(
  request: BeatSequencePlanRequest
): Promise<BeatSequencePlanResult | null> {
  const systemPrompt = buildPlannerSystemPrompt()
  const userPrompt = buildPlannerUserPrompt(request)

  const options: TextGenerationOptions = {
    systemInstruction: systemPrompt,
    temperature: 0.5,
    maxOutputTokens: 4096,
    responseMimeType: 'application/json',
    thinkingLevel: 'low',
  }

  const result = await generateText(userPrompt, options)
  let cleanText = result.text.trim()
  if (cleanText.startsWith('```')) {
    cleanText = cleanText.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '')
  }

  const parsed = JSON.parse(cleanText) as {
    reasoning?: string
    beats?: Array<{
      beatIndex?: number
      beatRole?: BeatRole
      shotType?: string
      frozenMoment?: string
      prompt?: string
      allowTypography?: boolean
      durationSeconds?: number
      negativeAdditions?: string[]
    }>
  }

  if (!Array.isArray(parsed.beats) || parsed.beats.length === 0) return null

  const plans: BeatKeyframePlan[] = parsed.beats.map((b, i) => {
    const beatIndex = typeof b.beatIndex === 'number' ? b.beatIndex : i
    const beat = request.beats[beatIndex] ?? request.beats[i]
    const beatRole =
      b.beatRole ??
      inferBeatRole(
        beat,
        beatIndex,
        request.beats.length,
        detectSceneType(
          String(request.scene.heading ?? ''),
          String(request.scene.action ?? ''),
          request.sceneNumber,
          request.totalScenes
        ),
        request.filmContext?.title
      )
    const allowTypography =
      typeof b.allowTypography === 'boolean' ? b.allowTypography : roleAllowsTypography(beatRole)

    return {
      beatIndex,
      beatRole,
      shotType: b.shotType?.trim() || 'Medium shot',
      frozenMoment: b.frozenMoment?.trim() || beat?.actionDescription || `Beat ${beatIndex + 1}`,
      prompt: b.prompt?.trim() || '',
      allowTypography,
      durationSeconds: b.durationSeconds,
      negativeAdditions: b.negativeAdditions,
    }
  })

  const validated = validatePlans(plans, request.beats.length)
  if (!validated) return null

  return { plans: validated, usedAI: true, reasoning: parsed.reasoning }
}

// =============================================================================
// Main entry
// =============================================================================

export async function planBeatSequence(
  request: BeatSequencePlanRequest
): Promise<BeatSequencePlanResult> {
  const cacheKey = getBeatPlanCacheKey(
    request.scene,
    request.beats.length,
    request.projectId
  )
  const cached = getCachedPlan(cacheKey)
  if (cached) {
    console.log(`[BeatSequencePlanner] Cache hit (${request.beats.length} beats)`)
    return cached
  }

  if (!request.forceFallback) {
    try {
      const aiResult = await planWithGemini(request)
      if (aiResult) {
        setCachedPlan(cacheKey, aiResult)
        console.log(`[BeatSequencePlanner] AI planned ${aiResult.plans.length} distinct keyframes`)
        return aiResult
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      console.warn(`[BeatSequencePlanner] Gemini failed, using fallback: ${msg}`)
    }
  }

  const fallbackPlans = buildFallbackBeatPlans(request)
  const result: BeatSequencePlanResult = {
    plans: fallbackPlans,
    usedAI: false,
    reasoning: 'Deterministic fallback from direction shots and scene description',
  }
  setCachedPlan(cacheKey, result)
  return result
}

/** Apply planner output onto in-memory scene beats. */
export function applyBeatKeyframePlansToScene(
  scene: Record<string, unknown>,
  plans: BeatKeyframePlan[]
): Record<string, unknown> {
  const beats = Array.isArray(scene.beats) ? [...(scene.beats as SceneBeat[])] : []
  for (const plan of plans) {
    const beat = beats[plan.beatIndex]
    if (!beat) continue
    beats[plan.beatIndex] = {
      ...beat,
      beatRole: plan.beatRole,
      storyboardImagePrompt: plan.prompt,
      ...(plan.durationSeconds ? { durationSeconds: plan.durationSeconds } : {}),
    }
  }
  return { ...scene, beats }
}

export { isTitleOrCinematicScene } from '@/lib/script/sceneClassification'

/** Ensure scene.music.description exists from direction audio cues. */
export function ensureSceneMusicFromDirection(
  scene: Record<string, unknown>
): Record<string, unknown> {
  const existing =
    typeof scene.music === 'string'
      ? scene.music
      : (scene.music as { description?: string } | undefined)?.description
  if (existing?.trim()) return scene

  const direction = getSceneDirection(scene)
  const audioParts: string[] = []
  if (direction?.audio?.priorities) audioParts.push(String(direction.audio.priorities))
  if (direction?.audio?.considerations) audioParts.push(String(direction.audio.considerations))

  const sceneDescription = String(direction?.sceneDescription ?? '').trim()
  const audioLine = sceneDescription.match(/audio[:\s]+([^.]+(?:\.[^.]+)*)/i)?.[1]
  if (audioLine) audioParts.push(audioLine.trim())

  const description = audioParts.filter(Boolean).join('. ').trim()
  if (!description) {
    if (isTitleOrCinematicScene(scene)) {
      return {
        ...scene,
        music: {
          description:
            'Cinematic orchestral score, building ethereal tension with layered digital synthesis and atmospheric pads, suitable for a title sequence.',
        },
      }
    }
    return scene
  }

  return {
    ...scene,
    music: { description: `Cinematic score. ${description}` },
  }
}
