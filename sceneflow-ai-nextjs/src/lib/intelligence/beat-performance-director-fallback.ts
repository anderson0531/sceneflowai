/**
 * Beat performance director — client-safe prompt, parse, and save.
 *
 * This pass rewrites one spoken line (and how it is delivered) or one action
 * description. Frame direction, still prompts, and video prompts belong to the
 * frame director and are left where they are.
 */

import type { BeatSequenceReferenceCatalog } from '@/lib/intelligence/beat-sequence-planner-fallback'
import {
  applyBeatsToScene,
  beatContentFingerprint,
  getSceneBeats,
} from '@/lib/script/beatMigration'
import type { SceneBeat } from '@/lib/script/segmentTypes'

export type BeatPerformanceMode = 'optimize' | 'rewrite'

export interface BeatPerformancePatch {
  line?: string
  voiceDirection?: string
  actionDescription?: string
}

export interface BeatPerformanceRequest {
  mode: BeatPerformanceMode
  beat: SceneBeat
  beatIndex: number
  scene: Record<string, unknown>
  previousMoment?: string
  nextMoment?: string
  catalog?: BeatSequenceReferenceCatalog
  userDirection?: string
}

function trimOrUndef(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

export function sceneIntentSummary(scene: Record<string, unknown>): string {
  const direction = asRecord(scene.sceneDirection) ?? asRecord(scene.detailedDirection)
  const parts = [
    trimOrUndef(scene.heading) ?? trimOrUndef(scene.slugline),
    trimOrUndef(scene.purpose),
    trimOrUndef(scene.description) ?? trimOrUndef(scene.summary),
    trimOrUndef(direction?.sceneDescription),
    trimOrUndef(direction?.emotionalBeat),
  ].filter((part): part is string => !!part)
  return parts.slice(0, 4).join('\n')
}

export function beatMomentSummary(beat: SceneBeat | undefined): string | undefined {
  if (!beat) return undefined
  if (beat.kind === 'action') {
    const action = beat.actionDescription?.trim()
    return action ? `Action: ${action}` : undefined
  }
  const spoken = [beat.character, beat.line].filter(Boolean).join(': ')
  return spoken ? `${beat.kind}: ${spoken}` : undefined
}

export function applyPerformanceProse(beat: SceneBeat, patch: BeatPerformancePatch): SceneBeat {
  const next: SceneBeat = { ...beat }
  if (beat.kind === 'action') {
    const action = patch.actionDescription?.trim()
    if (action) next.actionDescription = action
    return next
  }
  const line = patch.line?.trim()
  if (line) next.line = line
  const voice = patch.voiceDirection?.trim()
  if (voice) next.voiceDirection = voice
  return next
}

export function parseBeatPerformancePatch(
  raw: unknown,
  beat: SceneBeat,
  _scene?: Record<string, unknown>,
  _catalog?: BeatSequenceReferenceCatalog
): BeatPerformancePatch | undefined {
  const record = asRecord(raw)
  const source = record
    ? asRecord(Array.isArray(record.beats) ? record.beats[0] : record) ?? record
    : null
  if (!source) return undefined

  const patch: BeatPerformancePatch = {}
  if (beat.kind === 'action') {
    const action = trimOrUndef(source.actionDescription)
    if (action) patch.actionDescription = action
  } else {
    const line = trimOrUndef(source.line)
    if (line) patch.line = line
    const voice = trimOrUndef(source.voiceDirection)
    if (voice) patch.voiceDirection = voice
  }

  return patch.line || patch.voiceDirection || patch.actionDescription ? patch : undefined
}

export function fallbackPerformancePatch(
  _beat: SceneBeat,
  _userDirection?: string
): BeatPerformancePatch {
  return {}
}

export function previewPerformanceRewrite(
  beat: SceneBeat,
  patch: BeatPerformancePatch
): { prose: string } {
  const next = applyPerformanceProse(beat, patch)
  const prose =
    next.kind === 'action' ? (next.actionDescription ?? '').trim() : (next.line ?? '').trim()
  return { prose }
}

export function applyBeatPerformanceDirectorToScene(
  scene: Record<string, unknown>,
  beatId: string,
  patch: BeatPerformancePatch
): { scene: Record<string, unknown>; applied: boolean; proseChanged: boolean } {
  const beats = getSceneBeats(scene)
  const target = beats.find((beat) => beat.beatId === beatId)
  if (!target) return { scene, applied: false, proseChanged: false }

  const priorFingerprint = beatContentFingerprint(target)
  const withProse = applyPerformanceProse(target, patch)
  const proseChanged = beatContentFingerprint(withProse) !== priorFingerprint
  return {
    scene: applyBeatsToScene(
      scene,
      beats.map((beat) => (beat.beatId === beatId ? withProse : beat))
    ),
    applied: true,
    proseChanged,
  }
}

export function buildBeatPerformanceSystemPrompt(): string {
  return `You direct one story beat for a film scene. You rewrite only the spoken line and its delivery, or only the action description. You do not write the shot, the still, or who is in frame.

USER NOTES are authoritative for the wording and the delivery. Honor them when they ask for different words or a different way of saying the line.

HARD RULES:
1. Do not change the story. Do not add plot, people, props, or locations. Do not rename the speaker.
2. Dialogue and narration: rewrite "line" and "voiceDirection". Do not change who is speaking. Do not write an action description.
3. Action: rewrite "actionDescription". Do not invent a spoken line. Do not write "line" or "voiceDirection".
4. Do not return shot type, camera, frozen moment, cast, props, or framing. Those belong to the frame director.
5. Output JSON only, no markdown:
{
  "line": "spoken sentence, dialogue and narration only",
  "voiceDirection": "how the line is delivered, dialogue and narration only",
  "actionDescription": "what happens, action beats only"
}`
}

export function buildBeatPerformanceUserPrompt(request: BeatPerformanceRequest): string {
  const { beat } = request
  const parts: string[] = []
  if (request.mode === 'rewrite') {
    parts.push(
      'Rewrite this beat. USER NOTES override the current wording and delivery. They do not override the story or who is speaking.'
    )
  } else {
    parts.push(
      'Polish this beat’s line or action. Keep the story and who is speaking. Make the wording specific.'
    )
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
    parts.push('USER NOTES (authoritative for the wording and the delivery):')
    parts.push(notes)
    parts.push('')
  }

  parts.push(`BEAT ${request.beatIndex} id=${beat.beatId} kind=${beat.kind}`)
  if (beat.character) parts.push(`Speaker (do not rename): ${beat.character}`)
  if (beat.kind === 'action') {
    parts.push(`Current action: ${beat.actionDescription?.trim() || '(none)'}`)
  } else {
    parts.push(`Current line: ${beat.line?.trim() || '(none)'}`)
    if (beat.voiceDirection?.trim()) parts.push(`Current delivery: ${beat.voiceDirection.trim()}`)
  }
  if (beat.beatDirection?.emotion) parts.push(`Current emotion: ${beat.beatDirection.emotion}`)
  if (request.previousMoment) parts.push(`Previous beat: ${request.previousMoment}`)
  if (request.nextMoment) parts.push(`Next beat: ${request.nextMoment}`)
  return parts.join('\n')
}
