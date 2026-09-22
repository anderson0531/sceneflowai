/**
 * Beat performance director — client-safe prompt, parse, and save.
 *
 * The still director rewrites photographic framing and leaves the line alone.
 * This pass rewrites the spoken line or the action, and the beat direction
 * those words sit on, so frame and video generation share one baseline.
 */

import {
  applyStillDirectorPatchToScene,
  previewActionFramingFromPatch,
  type ApplyStillDirectorPatchOptions,
  type StillDirectorPatch,
} from '@/lib/intelligence/beat-still-director-fallback'
import { formatBeatPlannerReferenceCatalog } from '@/lib/intelligence/beat-sequence-planner-fallback'
import type { BeatSequenceReferenceCatalog } from '@/lib/intelligence/beat-sequence-planner-fallback'
import {
  applyBeatsToScene,
  beatContentFingerprint,
  getSceneBeats,
} from '@/lib/script/beatMigration'
import { clearBeatStoryboardFrames } from '@/lib/script/structuredSceneRevision'
import type { SceneBeat } from '@/lib/script/segmentTypes'
import { restampPreVisHashIfScriptCurrent } from '@/lib/storyboard/preVisSync'

export type BeatPerformanceMode = 'optimize' | 'rewrite'

export interface BeatPerformancePatch {
  line?: string
  voiceDirection?: string
  actionDescription?: string
  direction: StillDirectorPatch
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

const DIRECTION_STRING_KEYS = [
  'shotType',
  'cameraAngle',
  'frozenMoment',
  'blocking',
  'gaze',
  'emotion',
  'propInteraction',
  'lightingAccent',
  'actionFraming',
  'suggestedNotes',
] as const

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

function stringList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined
  const names = value
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter(Boolean)
  return names
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase()
}

function sceneCharacterNames(scene: Record<string, unknown>): string[] {
  const raw = Array.isArray(scene.characters) ? scene.characters : []
  const names: string[] = []
  for (const entry of raw) {
    const name =
      typeof entry === 'string'
        ? entry
        : entry && typeof entry === 'object' && typeof (entry as { name?: string }).name === 'string'
          ? (entry as { name: string }).name
          : ''
    const trimmed = name.trim()
    if (trimmed) names.push(trimmed)
  }
  return names
}

/** Names the model is allowed to put in frame. Invented people are dropped. */
export function allowedCastLabels(
  beat: SceneBeat,
  scene: Record<string, unknown>,
  catalog?: BeatSequenceReferenceCatalog
): Set<string> {
  const allowed = new Set<string>()
  const add = (value?: string) => {
    const trimmed = value?.trim()
    if (trimmed) allowed.add(normalizeName(trimmed))
  }
  add(beat.character)
  for (const name of beat.beatDirection?.castInFrame ?? []) add(name)
  for (const name of sceneCharacterNames(scene)) add(name)
  for (const name of catalog?.characterNames ?? []) add(name)
  return allowed
}

function guardCast(
  beat: SceneBeat,
  scene: Record<string, unknown>,
  catalog: BeatSequenceReferenceCatalog | undefined,
  names: string[] | undefined
): string[] | undefined {
  if (!names) return undefined
  const allowed = allowedCastLabels(beat, scene, catalog)
  const kept = names.filter((name) => allowed.has(normalizeName(name)))
  if (kept.length > 0) return kept
  return undefined
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
  scene: Record<string, unknown>,
  catalog?: BeatSequenceReferenceCatalog
): BeatPerformancePatch | undefined {
  const record = asRecord(raw)
  const source = record
    ? asRecord(Array.isArray(record.beats) ? record.beats[0] : record) ?? record
    : null
  if (!source) return undefined

  const direction: StillDirectorPatch = {}
  for (const key of DIRECTION_STRING_KEYS) {
    const value = trimOrUndef(source[key])
    if (value) direction[key] = value
  }
  const cast = guardCast(beat, scene, catalog, stringList(source.castInFrame))
  if (cast) direction.castInFrame = cast
  const props = stringList(source.keyProps)
  if (props && props.length > 0) direction.keyProps = props
  if (!direction.frozenMoment && direction.actionFraming) {
    direction.frozenMoment = direction.actionFraming
  }

  const patch: BeatPerformancePatch = { direction }
  if (beat.kind === 'action') {
    const action = trimOrUndef(source.actionDescription)
    if (action) patch.actionDescription = action
  } else {
    const line = trimOrUndef(source.line)
    if (line) patch.line = line
    const voice = trimOrUndef(source.voiceDirection)
    if (voice) patch.voiceDirection = voice
  }

  const hasDirection = Object.keys(direction).length > 0
  const hasProse = !!(patch.line || patch.voiceDirection || patch.actionDescription)
  return hasDirection || hasProse ? patch : undefined
}

export function fallbackPerformancePatch(
  beat: SceneBeat,
  userDirection?: string
): BeatPerformancePatch {
  const note = userDirection?.trim()
  return {
    direction: note ? { emotion: note } : {},
  }
}

export function previewPerformanceRewrite(
  beat: SceneBeat,
  patch: BeatPerformancePatch
): { prose: string; framing: string } {
  const next = applyPerformanceProse(beat, patch)
  const prose =
    next.kind === 'action' ? (next.actionDescription ?? '').trim() : (next.line ?? '').trim()
  return {
    prose,
    framing: previewActionFramingFromPatch(next, patch.direction),
  }
}

export function applyBeatPerformanceDirectorToScene(
  scene: Record<string, unknown>,
  beatId: string,
  patch: BeatPerformancePatch,
  options: ApplyStillDirectorPatchOptions
): { scene: Record<string, unknown>; applied: boolean; proseChanged: boolean } {
  const beats = getSceneBeats(scene)
  const target = beats.find((beat) => beat.beatId === beatId)
  if (!target) return { scene, applied: false, proseChanged: false }

  const guardedCast = guardCast(target, scene, undefined, patch.direction.castInFrame)
  const safePatch: BeatPerformancePatch = {
    ...patch,
    direction: {
      ...patch.direction,
      ...(guardedCast ? { castInFrame: guardedCast } : { castInFrame: undefined }),
    },
  }
  const priorFingerprint = beatContentFingerprint(target)
  const withProse = applyPerformanceProse(target, safePatch)
  const proseChanged = beatContentFingerprint(withProse) !== priorFingerprint
  const cleared = proseChanged ? clearBeatStoryboardFrames(withProse) : withProse
  const sceneWithProse = applyBeatsToScene(
    scene,
    beats.map((beat) => (beat.beatId === beatId ? cleared : beat))
  )
  const directed = applyStillDirectorPatchToScene(
    sceneWithProse,
    beatId,
    safePatch.direction,
    options
  )
  return {
    scene: restampPreVisHashIfScriptCurrent(scene, directed.scene),
    applied: !directed.skipped,
    proseChanged,
  }
}

export function buildBeatPerformanceSystemPrompt(): string {
  return `You direct one story beat for a film scene. You rewrite the performance and the beat direction that frame and video generation use as their baseline.

USER NOTES are authoritative for the line, the action, and the emotion. Honor them when they ask for different wording, delivery, or feeling.

HARD RULES:
1. Do not change the story. Do not add plot, people, props, or locations. Keep cast labels exactly — the same character names already on the beat and in the reference library.
2. Dialogue and narration: rewrite "line" and "voiceDirection". Do not change who is speaking.
3. Action: rewrite "actionDescription". Do not invent a spoken line.
4. Emotion is required. Name the feeling the note asked for, specific enough for a face and a body.
5. Beat direction is the frozen instant a still and a clip are generated from. It must agree with the new line or action. One settled pose. No style essay.
6. Output JSON only, no markdown:
{
  "line": "spoken sentence, dialogue and narration only",
  "voiceDirection": "how the line is delivered, dialogue and narration only",
  "actionDescription": "what is seen, action beats only",
  "emotion": "the directed feeling",
  "shotType": "Medium Shot",
  "cameraAngle": "eye-level",
  "frozenMoment": "one-sentence frozen instant",
  "blocking": "where bodies are",
  "gaze": "who looks where",
  "propInteraction": "hands and named props",
  "lightingAccent": "only a deviation from the scene",
  "castInFrame": ["Exact Character Name"],
  "keyProps": ["Exact Prop Name"],
  "actionFraming": "one paragraph a still camera can shoot"
}`
}

export function buildBeatPerformanceUserPrompt(request: BeatPerformanceRequest): string {
  const { beat } = request
  const parts: string[] = []
  if (request.mode === 'rewrite') {
    parts.push(
      'Rewrite this beat. USER NOTES override the current wording and emotion. They do not override the story or the cast labels.'
    )
  } else {
    parts.push(
      'Polish this beat so the line or action and the beat direction agree. Keep the story. Make the emotion specific.'
    )
  }
  parts.push('')

  const intent = sceneIntentSummary(request.scene)
  if (intent) {
    parts.push('SCENE INTENT (do not replace this):')
    parts.push(intent)
    parts.push('')
  }

  const catalog = formatBeatPlannerReferenceCatalog(request.catalog)
  if (catalog) {
    parts.push(catalog)
    parts.push('')
  }

  const notes = request.userDirection?.trim()
  if (notes) {
    parts.push('USER NOTES (authoritative for the line, the action, and the emotion):')
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
