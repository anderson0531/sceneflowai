/**
 * Deterministic beat keyframe planner (client-safe, no Gemini).
 */

import {
  detectSceneType,
  extractDirectionMetadata,
  type FilmContext,
  type SceneType,
} from '@/lib/intelligence/scene-direction-metadata'
import { adaptPromptForLyria } from '@/lib/audio/lyriaPromptAdapter'
import { isTitleOrCinematicScene } from '@/lib/script/sceneClassification'
import type { SceneBeat } from '@/lib/script/segmentTypes'

function getSceneDirection(scene: Record<string, unknown>): Record<string, any> | undefined {
  const d = scene.sceneDirection
  return d && typeof d === 'object' ? (d as Record<string, any>) : undefined
}

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

/** Exact library labels the planner must use — appearance comes from reference images. */
export interface BeatSequenceReferenceCatalog {
  characterNames?: string[]
  propNames?: string[]
  locationNames?: string[]
}

export interface BeatSequencePlanRequest {
  scene: Record<string, unknown>
  beats: SceneBeat[]
  sceneNumber: number
  totalScenes?: number
  filmContext?: FilmContext
  artStyle?: string
  projectId?: string
  forceFallback?: boolean
  referenceCatalog?: BeatSequenceReferenceCatalog
}

export function formatBeatPlannerReferenceCatalog(
  catalog?: BeatSequenceReferenceCatalog
): string {
  const characters = (catalog?.characterNames ?? []).map((n) => n.trim()).filter(Boolean)
  const props = (catalog?.propNames ?? []).map((n) => n.trim()).filter(Boolean)
  const locations = (catalog?.locationNames ?? []).map((n) => n.trim()).filter(Boolean)
  if (characters.length === 0 && props.length === 0 && locations.length === 0) {
    return ''
  }

  const lines = [
    'REFERENCE LIBRARY (use these exact labels; do not invent appearance — they have reference images):',
  ]
  if (characters.length) lines.push(`Characters: ${characters.join(', ')}`)
  if (props.length) lines.push(`Props: ${props.join(', ')}`)
  if (locations.length) lines.push(`Locations: ${locations.join(', ')}`)
  return lines.join('\n')
}

export function buildPlannerSystemPrompt(): string {
  return `You are a cinematic still-frame planner for an animatic. Plan DISTINCT live-action photoreal film stills — one frozen instant per beat. These stills illustrate the beat for the animatic. They are NOT Veo/F2V start frames, NOT video clips, and NOT motion direction.

CRITICAL RULES:
1. Each beat gets ONE unique frozen moment — different subject, scale, composition, or story beat. Never repeat the same visual across beats.
2. NO camera movement and NO temporal/motion verbs (pulses, glitching, flickering, walking through). Describe a single photograph.
3. Title typography ONLY on beats with beatRole "title_reveal" or "credit". All other beats: NO on-screen text.
4. Map direction.camera.shots to beats when provided (beat 0 → shot 0, etc.).
5. Follow the narrative arc: opening → progression → climax → title_reveal (if title scene) → dissolve.
6. The "prompt" field is Action/Framing ONLY: shot type, body blocking, who holds which named library prop, gaze. Do NOT write style dumps, lighting essays, exclusions, F2V, or start-frame language — code owns those.
7. Use EXACT character / prop / location labels from the REFERENCE LIBRARY. Do not invent objects that are not listed. Do not describe the visual appearance of library props or locations (reference images own appearance).
8. When art style is photorealistic, keep action language photographic (no illustration, cartoon, or anime). Populate negativeAdditions with anti-illustration terms.

Output JSON:
{
  "reasoning": "brief arc explanation",
  "beats": [
    {
      "beatIndex": 0,
      "beatRole": "opening|progression|climax|title_reveal|credit|dissolve|dialogue|narration_backdrop",
      "shotType": "Wide Shot",
      "frozenMoment": "one-sentence frozen moment description",
      "prompt": "Action/Framing only for this beat",
      "allowTypography": false,
      "durationSeconds": 4,
      "negativeAdditions": []
    }
  ]
}`
}

export function buildPlannerUserPrompt(request: BeatSequencePlanRequest): string {
  const { scene, beats, sceneNumber, totalScenes, filmContext, artStyle } = request
  const heading = String(scene.heading ?? '')
  const action = String(scene.action ?? '')
  const visualDescription = String(scene.visualDescription ?? '')
  const direction = getSceneDirection(scene)
  const sceneType = detectSceneType(heading, action || visualDescription, sceneNumber, totalScenes)
  const directionMeta = extractDirectionMetadata(direction)
  const shots = getDirectionShots(scene)

  const parts: string[] = []
  parts.push(`Plan ${beats.length} DISTINCT frozen animatic stills for this scene (Action/Framing only — not video motion).`)
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

  const catalogBlock = formatBeatPlannerReferenceCatalog(request.referenceCatalog)
  if (catalogBlock) {
    parts.push(catalogBlock)
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

function roleAllowsTypography(role: BeatRole): boolean {
  return role === 'title_reveal' || role === 'credit'
}

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

function buildTitleDirectionContext(
  scene: Record<string, unknown>,
  directionMeta: ReturnType<typeof extractDirectionMetadata>,
  shotType: string
): string {
  const parts: string[] = []
  if (directionMeta.atmosphere) parts.push(`Atmosphere: ${directionMeta.atmosphere}`)
  if (directionMeta.lightingMood) parts.push(`Lighting: ${directionMeta.lightingMood}`)
  if (directionMeta.colorTemperature) parts.push(`Color: ${directionMeta.colorTemperature}`)
  if (directionMeta.locationDescription) parts.push(`Location: ${directionMeta.locationDescription}`)
  if (directionMeta.keyProps?.length) parts.push(`Props: ${directionMeta.keyProps.join(', ')}`)
  if (shotType) parts.push(`Camera: ${shotType}`)
  const direction = getSceneDirection(scene)
  if (direction?.audio?.priorities) parts.push(`Audio mood: ${direction.audio.priorities}`)
  return parts.filter(Boolean).join('. ')
}

export function buildFallbackBeatPlans(request: BeatSequencePlanRequest): BeatKeyframePlan[] {
  const { scene, beats, sceneNumber, totalScenes, filmContext } = request
  const heading = String(scene.heading ?? '')
  const action = String(scene.action ?? scene.visualDescription ?? '')
  const sceneType = detectSceneType(heading, action, sceneNumber, totalScenes)
  const shots = getDirectionShots(scene)
  const moments = getProgressiveMoments(scene, beats.length)
  const directionMeta = extractDirectionMetadata(getSceneDirection(scene))
  const filmTitle = filmContext?.title

  return beats.map((beat, beatIndex) => {
    const beatRole = inferBeatRole(beat, beatIndex, beats.length, sceneType, filmTitle)
    const shotType = shots[beatIndex] ?? shots[shots.length - 1] ?? 'Medium shot'
    const moment =
      beat.actionDescription?.trim() ||
      (beat.kind === 'dialogue'
        ? [beat.character, beat.line].filter(Boolean).join(' — ')
        : '') ||
      (beat.kind !== 'dialogue' ? moments[beatIndex] : '') ||
      `Beat ${beatIndex + 1} visual moment`
    const setContext = buildSetContext(scene, beatIndex === 0 || beatIndex === beats.length - 1)

    const frozenParts = [`${shotType}: ${moment}`]
    if (setContext) frozenParts.push(setContext)
    if (directionMeta.atmosphere && (beatIndex === 0 || sceneType === 'title')) {
      frozenParts.push(`Atmosphere: ${directionMeta.atmosphere}`)
    }

    const frozenMoment = frozenParts.join('. ').replace(/\.\s*\./g, '.').trim()
    const allowTypography = roleAllowsTypography(beatRole)
    const titleDirectionContext =
      sceneType === 'title' ? buildTitleDirectionContext(scene, directionMeta, shotType) : ''

    let prompt = `${shotType}: ${frozenMoment}`
    if (titleDirectionContext) {
      prompt += `. ${titleDirectionContext}. Abstract digital composition, no people, no character portraits`
    }
    if (allowTypography && filmTitle) {
      prompt += `. Centered bold typography displaying "${filmTitle}" as the main visual element`
    } else if (beat.kind === 'narration') {
      prompt += '. Voiceover backdrop — environment and mood only, no narrator on screen'
    } else if (beat.kind === 'dialogue' && beat.character) {
      prompt += `. Focus on ${beat.character}${beat.line ? `: "${beat.line}"` : ''}`
    }
    if (!allowTypography) {
      prompt += '. No on-screen text, no dialogue captions'
    }
    prompt += '.'

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
    music: { description: adaptPromptForLyria(description) },
  }
}
