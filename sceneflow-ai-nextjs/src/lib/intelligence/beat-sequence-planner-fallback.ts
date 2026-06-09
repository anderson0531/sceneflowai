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

export interface BeatSequencePlanRequest {
  scene: Record<string, unknown>
  beats: SceneBeat[]
  sceneNumber: number
  totalScenes?: number
  filmContext?: FilmContext
  artStyle?: string
  projectId?: string
  forceFallback?: boolean
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

export function buildFallbackBeatPlans(request: BeatSequencePlanRequest): BeatKeyframePlan[] {
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
