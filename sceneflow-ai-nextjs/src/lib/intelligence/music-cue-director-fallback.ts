/**
 * Music cue director — client-safe prompt, parse, and save.
 *
 * Rewrites the cue brief and the emotion it is there to trigger. It does not
 * call Lyria and it does not move the beats the cue covers.
 */

import {
  applySceneMusicCues,
  parsePersistedMusicCues,
} from '@/lib/script/sceneMusicCues'
import { getSceneBeats } from '@/lib/script/beatMigration'
import type { SceneBeat, SceneMusicCue } from '@/lib/script/segmentTypes'
import { sceneIntentSummary } from '@/lib/intelligence/beat-performance-director-fallback'
import { beatMomentSummary } from '@/lib/intelligence/beat-performance-director-fallback'

const MAX_DESCRIPTION_LENGTH = 240
const MAX_INTENT_LENGTH = 120

export type MusicCueDirectorMode = 'optimize' | 'rewrite'

export interface MusicCueDirectionPatch {
  description: string
  intent: string
}

export interface MusicCueDirectorRequest {
  mode: MusicCueDirectorMode
  cue: SceneMusicCue
  beats: SceneBeat[]
  scene: Record<string, unknown>
  userDirection?: string
  /** Seconds the score will be asked to cover. Informs the brief, not Lyria. */
  playSeconds?: number
}

function trimTo(value: string, max: number): string {
  const trimmed = value.replace(/\s+/g, ' ').trim()
  if (trimmed.length <= max) return trimmed
  return trimmed.slice(0, max).replace(/\s+\S*$/, '').trim()
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

export function parseMusicCueDirectionPatch(raw: unknown): MusicCueDirectionPatch | undefined {
  const record = asRecord(raw)
  if (!record) return undefined
  const description = typeof record.description === 'string' ? record.description.trim() : ''
  const intent = typeof record.intent === 'string' ? record.intent.trim() : ''
  if (!description || !intent) return undefined
  return {
    description: trimTo(description, MAX_DESCRIPTION_LENGTH),
    intent: trimTo(intent, MAX_INTENT_LENGTH),
  }
}

export function applyMusicCueDirection(
  scene: Record<string, unknown>,
  cueId: string,
  patch: MusicCueDirectionPatch
): { scene: Record<string, unknown>; cue?: SceneMusicCue } {
  const beats = getSceneBeats(scene)
  const cues = parsePersistedMusicCues(scene.sceneMusicCues, beats)
  let updated: SceneMusicCue | undefined
  const nextCues = cues.map((cue) => {
    if (cue.cueId !== cueId) return cue
    updated = {
      ...cue,
      description: patch.description,
      intent: patch.intent,
      generatedBy: 'user',
      updatedAt: new Date().toISOString(),
    }
    return updated
  })
  if (!updated) return { scene }
  const applied = applySceneMusicCues(scene, nextCues, beats)
  return {
    scene: { ...applied.scene, beats: applied.beats },
    cue: updated,
  }
}

function coveredMoments(cue: SceneMusicCue, beats: SceneBeat[]): string[] {
  const lines: string[] = []
  for (let index = cue.beatStart; index <= cue.beatEnd; index++) {
    const moment = beatMomentSummary(beats[index])
    if (moment) lines.push(`Beat ${index + 1}: ${moment}`)
  }
  return lines
}

export function buildMusicCueDirectorSystemPrompt(): string {
  return `You direct one film underscore cue. You rewrite the music brief and the emotion the cue exists to trigger. You do not write the audio.

USER NOTES are authoritative for mood, instrumentation, tempo, and the feeling of the cue. Balance them with the scene intent and the beats the cue already covers.

HARD RULES:
1. Do not change which beats the cue covers, and do not retell the plot.
2. description is a short instrumental brief: genre, mood, instruments, tempo. No lyrics. No vocals. No artist names.
3. intent is the viewer emotion this cue triggers, one short phrase.
4. Output JSON only:
{
  "description": "Cinematic instrumental score, ...",
  "intent": "rising dread"
}`
}

export function buildMusicCueDirectorUserPrompt(request: MusicCueDirectorRequest): string {
  const { cue } = request
  const parts: string[] = []
  if (request.mode === 'rewrite') {
    parts.push(
      'Rewrite this cue. USER NOTES override the current mood and instrumentation. They do not override the scene intent or the beats covered.'
    )
  } else {
    parts.push('Polish this cue so the brief and the intent agree with the scene.')
  }
  parts.push('')

  const intent = sceneIntentSummary(request.scene)
  if (intent) {
    parts.push('SCENE INTENT (do not replace this):')
    parts.push(intent)
    parts.push('')
  }

  const notes = request.userDirection?.trim()
  if (notes) {
    parts.push('USER NOTES (authoritative for mood, instrumentation, and emotion):')
    parts.push(notes)
    parts.push('')
  }

  parts.push(
    `CUE beats ${cue.beatStart + 1}-${cue.beatEnd + 1}` +
      (request.playSeconds ? ` playing ${request.playSeconds} seconds` : '')
  )
  parts.push(`Current brief: ${cue.description}`)
  parts.push(`Current intent: ${cue.intent}`)
  const moments = coveredMoments(cue, request.beats)
  if (moments.length > 0) {
    parts.push('BEATS COVERED:')
    parts.push(moments.join('\n'))
  }
  return parts.join('\n')
}
