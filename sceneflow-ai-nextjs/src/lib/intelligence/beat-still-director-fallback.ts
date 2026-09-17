/**
 * Still Director — rewrite Action/Framing into beatDirection (client-safe).
 *
 * Direction is the source of truth; the assembled still is last-sent output.
 * This module patches photographic facets, then recomposes. Gemini lives in
 * the server-only sibling.
 */

import { buildPolicySafePhrasingRules } from '@/lib/generation/policySafePhrasing'
import {
  composeBeatActionFraming,
  formatBeatPlannerReferenceCatalog,
  type BeatSequenceReferenceCatalog,
} from '@/lib/intelligence/beat-sequence-planner-fallback'
import type { ProjectLookbook } from '@/lib/intelligence/project-lookbook-fallback'
import {
  applyBeatsToScene,
  getSceneBeats,
  normalizeBeatDirection,
} from '@/lib/script/beatMigration'
import type {
  BeatDirection,
  BeatDirectionSource,
  SceneBeat,
} from '@/lib/script/segmentTypes'
import { syncBeatStillPromptToDirection } from '@/lib/storyboard/syncBeatStillPrompt'

export type StillDirectorMode = 'optimize' | 'suggest' | 'rewrite'

export type StillDirectorStamp = Extract<BeatDirectionSource, 'director' | 'user'>

/** Sources the auto pass must not overwrite. */
export const STILL_DIRECTOR_PROTECTED_SOURCES: readonly BeatDirectionSource[] = [
  'user',
  'director',
]

/** Sources the planner must not clobber after a still was directed. */
export function isPlannerAuthoredDirectionSource(
  source: BeatDirectionSource | undefined
): boolean {
  return source === 'llm' || source === 'user' || source === 'director'
}

export function isProtectedStillDirectionSource(
  source: BeatDirectionSource | undefined
): boolean {
  return source === 'user' || source === 'director'
}

export function shouldSkipStillDirectorAuto(beat: SceneBeat): boolean {
  return isProtectedStillDirectionSource(beat.beatDirection?.generatedBy)
}

export function shouldRunStillDirectorAuto(
  beat: SceneBeat,
  opts: { needsNewStartFrame: boolean; reusedStoredPrompt: boolean }
): boolean {
  if (!opts.needsNewStartFrame) return false
  if (opts.reusedStoredPrompt) return false
  if (shouldSkipStillDirectorAuto(beat)) return false
  return true
}

export interface StillDirectorOverlay {
  shotType?: string
  cameraAngle?: string
  lighting?: string
  talentBlocking?: string
  emotionalBeat?: string
  keyProps?: string
}

export interface StillDirectorPatch {
  actionFraming?: string
  suggestedNotes?: string
  shotType?: string
  cameraAngle?: string
  frozenMoment?: string
  blocking?: string
  gaze?: string
  emotion?: string
  propInteraction?: string
  lightingAccent?: string
  castInFrame?: string[]
  keyProps?: string[]
}

export interface StillDirectorBeatInput {
  beatIndex: number
  beat: SceneBeat
  previousMoment?: string
  nextMoment?: string
}

export interface DirectBeatStillRequest {
  mode: StillDirectorMode
  beats: StillDirectorBeatInput[]
  catalog?: BeatSequenceReferenceCatalog
  userDirection?: string
  overlay?: StillDirectorOverlay
}

export interface ApplyStillDirectorPatchOptions {
  generatedBy: StillDirectorStamp
  /** Auto pass: leave user/director beats untouched. */
  skipIfProtected?: boolean
  lookbook?: ProjectLookbook
  sceneIndex?: number
  artStyleAnchor?: string
}

const PATCH_STRING_KEYS = [
  'shotType',
  'cameraAngle',
  'frozenMoment',
  'blocking',
  'gaze',
  'emotion',
  'propInteraction',
  'lightingAccent',
] as const

function trimOrUndef(value?: string | null): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

/**
 * Fold Direct Frame visual/talent overlays into a patch when Gemini omitted them.
 */
export function mergeDirectOverlaysIntoPatch(
  patch: StillDirectorPatch,
  overlay?: StillDirectorOverlay
): StillDirectorPatch {
  if (!overlay) return patch
  const next: StillDirectorPatch = { ...patch }
  if (!trimOrUndef(next.shotType) && trimOrUndef(overlay.shotType)) {
    next.shotType = overlay.shotType!.trim()
  }
  if (!trimOrUndef(next.cameraAngle) && trimOrUndef(overlay.cameraAngle)) {
    next.cameraAngle = overlay.cameraAngle!.trim()
  }
  if (!trimOrUndef(next.lightingAccent) && trimOrUndef(overlay.lighting)) {
    next.lightingAccent = overlay.lighting!.trim()
  }
  if (!trimOrUndef(next.blocking) && trimOrUndef(overlay.talentBlocking)) {
    next.blocking = overlay.talentBlocking!.trim()
  }
  if (!trimOrUndef(next.emotion) && trimOrUndef(overlay.emotionalBeat)) {
    next.emotion = overlay.emotionalBeat!.trim()
  }
  if ((!next.keyProps || next.keyProps.length === 0) && trimOrUndef(overlay.keyProps)) {
    next.keyProps = overlay.keyProps!.split(/[,;]+/).map((part) => part.trim()).filter(Boolean)
  }
  return next
}

export function parseStillDirectorPatch(raw: unknown): StillDirectorPatch | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const record = raw as Record<string, unknown>
  const normalized = normalizeBeatDirection({
    shotType: record.shotType,
    cameraAngle: record.cameraAngle,
    frozenMoment: record.frozenMoment,
    blocking: record.blocking,
    gaze: record.gaze,
    emotion: record.emotion,
    propInteraction: record.propInteraction,
    lightingAccent: record.lightingAccent ?? record.lighting,
    castInFrame: record.castInFrame,
    keyProps: record.keyProps,
  })
  const actionFraming = trimOrUndef(
    typeof record.actionFraming === 'string'
      ? record.actionFraming
      : typeof record.prompt === 'string'
        ? record.prompt
        : undefined
  )
  const suggestedNotes = trimOrUndef(
    typeof record.suggestedNotes === 'string' ? record.suggestedNotes : undefined
  )
  const patch: StillDirectorPatch = {
    ...(normalized ?? {}),
    ...(actionFraming ? { actionFraming } : {}),
    ...(suggestedNotes ? { suggestedNotes } : {}),
  }
  if (!normalized?.frozenMoment && actionFraming) {
    patch.frozenMoment = actionFraming
  }
  return Object.keys(patch).length > 0 ? patch : undefined
}

export function parseStillDirectorBeats(raw: unknown): Array<{
  beatIndex?: number
  beatId?: string
  patch: StillDirectorPatch
}> {
  if (!raw || typeof raw !== 'object') return []
  const record = raw as Record<string, unknown>
  const list = Array.isArray(record.beats) ? record.beats : Array.isArray(raw) ? raw : []
  const out: Array<{ beatIndex?: number; beatId?: string; patch: StillDirectorPatch }> = []
  for (const [i, entry] of list.entries()) {
    if (!entry || typeof entry !== 'object') continue
    const item = entry as Record<string, unknown>
    const patch = parseStillDirectorPatch(entry)
    if (!patch) continue
    out.push({
      beatIndex: typeof item.beatIndex === 'number' ? item.beatIndex : i,
      beatId: typeof item.beatId === 'string' ? item.beatId : undefined,
      patch,
    })
  }
  return out
}

export function applyStillDirectorPatch(
  beat: SceneBeat,
  patch: StillDirectorPatch,
  options: ApplyStillDirectorPatchOptions
): { beat: SceneBeat; skipped: boolean } {
  if (options.skipIfProtected && shouldSkipStillDirectorAuto(beat)) {
    return { beat, skipped: true }
  }

  const nextDirection: BeatDirection = { ...(beat.beatDirection ?? {}) }
  for (const key of PATCH_STRING_KEYS) {
    const value = trimOrUndef(patch[key])
    if (value) nextDirection[key] = value
  }
  if (!trimOrUndef(nextDirection.frozenMoment) && trimOrUndef(patch.actionFraming)) {
    nextDirection.frozenMoment = patch.actionFraming!.trim()
  }
  if (Array.isArray(patch.castInFrame)) {
    nextDirection.castInFrame = patch.castInFrame
  }
  if (Array.isArray(patch.keyProps) && patch.keyProps.length > 0) {
    nextDirection.keyProps = patch.keyProps
  }
  nextDirection.generatedBy = options.generatedBy
  nextDirection.updatedAt = new Date().toISOString()

  const patched: SceneBeat = { ...beat, beatDirection: nextDirection }
  return {
    beat: syncBeatStillPromptToDirection(patched, {
      force: true,
      lookbook: options.lookbook,
      sceneIndex: options.sceneIndex,
      artStyleAnchor: options.artStyleAnchor,
    }),
    skipped: false,
  }
}

export function applyStillDirectorPatchToScene(
  scene: Record<string, unknown>,
  beatId: string,
  patch: StillDirectorPatch,
  options: ApplyStillDirectorPatchOptions
): { scene: Record<string, unknown>; skipped: boolean } {
  const beats = getSceneBeats(scene)
  let skipped = true
  const nextBeats = beats.map((beat) => {
    if (beat.beatId !== beatId) return beat
    const applied = applyStillDirectorPatch(beat, patch, options)
    skipped = applied.skipped
    return applied.beat
  })
  return { scene: applyBeatsToScene(scene, nextBeats), skipped }
}

export function previewActionFramingFromPatch(
  beat: SceneBeat,
  patch: StillDirectorPatch
): string {
  const applied = applyStillDirectorPatch(beat, patch, {
    generatedBy: 'director',
    skipIfProtected: false,
  })
  return composeBeatActionFraming(applied.beat)
}

export function buildStillDirectorSystemPrompt(): string {
  return `You are a cinematographer rewriting animatic still direction so a still camera can render the beat on the first attempt.

The current Action/Framing is often photographically ambiguous: same expression on every face, contradictory prop placement, no screen-left/right, missing weight/contact, bodies cropped out of a two-shot. Rewrite so a viewer reads the whole action from one settled pose.

HARD RULES:
1. Do not change the story beat. Do not invent people, props, or locations. Use EXACT labels from the REFERENCE LIBRARY.
2. One frozen instant — a 1/500s exposure. No temporal verbs (walking, turning, slamming). Name the settled pose, not the movement that produced it.
3. Spatial: who is screen-left vs screen-right, who is nearer the camera, where each body plants weight, what each hand is doing, where each named prop sits or is held. Skip spatial body rules when castInFrame is empty.
4. Distinct acting: each visible face gets its own expression (eyes/jaw/mouth/shoulders), not a shared two-word mood. Omit emotion and gaze when castInFrame is empty. Never write "Gaze: No characters" or "Gaze: No people".
5. Two-shots and group shots must keep every directed person fully in frame unless the shot type is a close-up or insert.
6. Insert/Extreme Close-Up of a limb: only the specified limb/hand. Insert/Extreme Close-Up of an object with nobody in frame: describe the instrument's settled state, not a limb, hand, or face.
7. Do NOT write style, lighting essays, exclusions, F2V, start-frame, or appearance of library refs — code owns those.
8. ${buildPolicySafePhrasingRules()}

Output JSON only:
{
  "beats": [
    {
      "beatIndex": 0,
      "beatId": "bt_…",
      "actionFraming": "shot + spatial still of this instant (proper names, not person tokens)",
      "shotType": "Two-Shot",
      "cameraAngle": "low angle",
      "frozenMoment": "one-sentence frozen instant",
      "blocking": "body positions, weight, contact — omit for empty-cast object inserts unless it names a settled instrument pose",
      "gaze": "who looks at whom — omit when castInFrame is empty",
      "emotion": "Named: specific face/body tell; Other: different tell — omit when castInFrame is empty",
      "propInteraction": "which hand or surface holds which named prop — omit hands when nobody is in frame",
      "castInFrame": ["Exact Character Name"],
      "keyProps": ["Exact Prop Name"],
      "suggestedNotes": "bullet-like director notes a human can paste into Direction"
    }
  ]
}`
}

export function buildStillDirectorUserPrompt(request: DirectBeatStillRequest): string {
  const parts: string[] = []
  if (request.mode === 'suggest') {
    parts.push(
      'Analyze each beat still and write suggestedNotes a director can paste into Direction. Also fill the structured fields as the rewrite you would make.'
    )
  } else if (request.mode === 'rewrite') {
    parts.push(
      'Rewrite each beat so Action/Framing is photographically unambiguous. Honor USER NOTES and overlays; they override conflicting framing but not the story beat or library labels.'
    )
  } else {
    parts.push(
      'Optimize each beat still for first-try photographic legibility. Keep the story beat. Thicken blocking, gaze, prop placement, and distinct faces.'
    )
  }
  parts.push('')

  const catalog = formatBeatPlannerReferenceCatalog(request.catalog)
  if (catalog) {
    parts.push(catalog)
    parts.push('')
  }

  if (request.overlay) {
    const overlayLines = [
      trimOrUndef(request.overlay.shotType) && `Shot: ${request.overlay.shotType}`,
      trimOrUndef(request.overlay.cameraAngle) && `Camera angle: ${request.overlay.cameraAngle}`,
      trimOrUndef(request.overlay.lighting) && `Lighting: ${request.overlay.lighting}`,
      trimOrUndef(request.overlay.talentBlocking) && `Blocking: ${request.overlay.talentBlocking}`,
      trimOrUndef(request.overlay.emotionalBeat) && `Emotion: ${request.overlay.emotionalBeat}`,
      trimOrUndef(request.overlay.keyProps) && `Key props: ${request.overlay.keyProps}`,
    ].filter(Boolean)
    if (overlayLines.length > 0) {
      parts.push('VISUAL / TALENT OVERLAY (honor these):')
      parts.push(overlayLines.join('\n'))
      parts.push('')
    }
  }

  const notes = request.userDirection?.trim()
  if (notes) {
    parts.push('USER NOTES (authoritative for framing; do not replace the story beat):')
    parts.push(notes)
    parts.push('')
  }

  parts.push('BEATS:')
  for (const entry of request.beats) {
    const { beat, beatIndex } = entry
    const direction = beat.beatDirection
    parts.push(`--- Beat ${beatIndex} id=${beat.beatId} (${beat.kind}) ---`)
    if (beat.actionDescription?.trim()) {
      parts.push(`Action: ${beat.actionDescription.trim()}`)
    }
    if (beat.character || beat.line) {
      parts.push(`Spoken: ${[beat.character, beat.line].filter(Boolean).join(' — ')}`)
    }
    if (direction) {
      parts.push(`Current direction JSON: ${JSON.stringify({
        shotType: direction.shotType,
        cameraAngle: direction.cameraAngle,
        frozenMoment: direction.frozenMoment,
        blocking: direction.blocking,
        gaze: direction.gaze,
        emotion: direction.emotion,
        propInteraction: direction.propInteraction,
        castInFrame: direction.castInFrame,
        keyProps: direction.keyProps,
      })}`)
    }
    const composed = composeBeatActionFraming(beat)
    if (composed) parts.push(`Current Action/Framing: ${composed}`)
    if (entry.previousMoment) parts.push(`Previous beat: ${entry.previousMoment}`)
    if (entry.nextMoment) parts.push(`Next beat: ${entry.nextMoment}`)
    parts.push('')
  }

  return parts.join('\n')
}
