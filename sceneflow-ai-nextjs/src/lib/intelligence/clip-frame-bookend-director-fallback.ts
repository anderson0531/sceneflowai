/**
 * Client-safe helpers and prompt builders for deriving Start (t=0s) and End (t=T)
 * still frame prompts directly from a shot's compiled Clips prompt.
 */

import {
  compileBeatVideoPromptFromDirection,
  isStaleSavedVideoPrompt,
} from '@/lib/scene/beatVideoPromptCompiler'
import { getSceneBeats } from '@/lib/script/beatMigration'
import { parsePersistedMusicCues, resolveBeatMusicCue } from '@/lib/script/sceneMusicCues'
import type { SceneBeat } from '@/lib/script/segmentTypes'
import type { DetailedSceneDirection } from '@/types/scene-direction'

export interface ExtractedClipPromptFacets {
  lead: string
  startFrame?: string
  clipAction?: string
  coverage?: string
  lens?: string
  space?: string
  shot?: string
  angle?: string
  camera?: string
  blocking?: string
  emotion?: string
  gaze?: string
  propInteraction?: string
  props?: string
  lighting?: string
  endOn?: string
  statedAction?: string
  noPeopleInFrame: boolean
  visiblePeople?: string
}

export interface ResolveBeatClipPromptOptions {
  scene?: Record<string, unknown> | null
  sceneDirection?: DetailedSceneDirection | null
  previousBeat?: SceneBeat | null
  artStyleId?: string
  clipPrompt?: string | null
}

export interface ClipBookendDirectorRequest {
  clipPrompt: string
  shotStillPrompt?: string | null
  beat?: SceneBeat | null
  durationSeconds?: number
}

export interface ClipBookendPrompts {
  startFramePrompt: string
  endFramePrompt: string
}

const STRUCTURED_LABELS = [
  '0s–2s (Start frame)',
  '0s-2s (Start frame)',
  'Start frame',
  '2s–5s (Action)',
  '2s-5s (Action)',
  '5s–8s (Action progression)',
  '5s-8s (Action progression)',
  '2s–8s (Action)',
  '2s-8s (Action)',
  'Action',
  '8s–10s (End frame): End on',
  '8s-10s (End frame): End on',
  '8s–10s (End frame)',
  '8s-10s (End frame)',
  'Coverage',
  'Lens',
  'Space',
  'Shot',
  'Angle',
  'Camera',
  'Blocking',
  'Emotion',
  'Gaze',
  'Prop interaction',
  'Props',
  'props remain',
  'Lighting',
  'End on',
  'Sound',
  'Only these people are visible',
  'Only these objects',
  'Hold the 0s–2s start state before initiating the 2s–8s progression, and settle cleanly into the 8s–10s end frame without inventing unstated events or extra cuts',
  'The only action is',
  'The only spoken line is',
] as const

/** Strip trailing periods and excess whitespace from a clause. */
export function cleanPromptClause(value?: string | null): string {
  if (!value) return ''
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\.+$/, '')
    .trim()
}

/** Collapse double periods (`..`) and normalize spacing in a full prompt. */
export function normalizeSinglePeriods(text: string): string {
  return text
    .replace(/\.\.+/g, '.')
    .replace(/\s+\./g, '.')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/** True when a direction value is a real description rather than a placeholder like "N/A" or "None". */
export function isMeaningfulDirectionFacet(value?: string | null): boolean {
  const cleaned = cleanPromptClause(value)
  if (!cleaned) return false
  if (/^(?:n\/a|na|none|null|nil|undefined|not applicable|-|—)$/i.test(cleaned)) {
    return false
  }
  if (/^no (?:characters|people|one|person|cast)(?:\s+in\s+frame)?$/i.test(cleaned)) {
    return false
  }
  return true
}

/**
 * Parse a compiled Clips prompt into its lead description and labeled clauses.
 */
export function extractClipPromptFacets(clipPrompt?: string | null): ExtractedClipPromptFacets {
  const raw = (clipPrompt || '').trim()
  if (!raw) {
    return { lead: '', noPeopleInFrame: false }
  }

  const labelPattern = new RegExp(
    `(?:^|\\.\\s+)(${STRUCTURED_LABELS.map((l) => l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')}):\\s*`,
    'gi'
  )

  const matches: Array<{ label: string; start: number; valueStart: number }> = []
  for (const match of raw.matchAll(labelPattern)) {
    const full = match[0]
    const label = match[1]
    const index = match.index ?? 0
    const labelOffset = full.toLowerCase().indexOf(label.toLowerCase())
    const start = index + (labelOffset >= 0 ? labelOffset : 0)
    const valueStart = index + full.length
    matches.push({ label, start, valueStart })
  }

  const leadEnd = matches.length > 0 ? matches[0].start : raw.length
  const lead = cleanPromptClause(raw.slice(0, leadEnd))

  const clauseMap = new Map<string, string>()
  for (let i = 0; i < matches.length; i++) {
    const current = matches[i]
    const nextStart = i + 1 < matches.length ? matches[i + 1].start : raw.length
    let slice = raw.slice(current.valueStart, nextStart).trim()

    // Stop at known unlabeled sentinel sentences when at the tail of a clause
    const sentinelMatch = slice.match(
      /\.\s+(?:Incoming continuity from|No people in frame|Do not add objects|Do not add other objects|No other people|No spoken dialogue|photorealistic,\s*cinematic motion|Film Noir\b)/i
    )
    if (sentinelMatch && sentinelMatch.index !== undefined) {
      slice = slice.slice(0, sentinelMatch.index)
    }
    const key = current.label.toLowerCase()
    const cleaned = cleanPromptClause(slice)
    if (cleaned && !clauseMap.has(key)) {
      clauseMap.set(key, cleaned)
    }
  }

  const noPeopleInFrame = /\bno people in frame\b/i.test(raw)
  const propsPrimary = clauseMap.get('props')
  const propsRemain = clauseMap.get('props remain')
  const combinedProps = [propsPrimary, propsRemain]
    .filter((v): v is string => isMeaningfulDirectionFacet(v))
    .filter((v, idx, arr) => arr.findIndex((other) => other.toLowerCase() === v.toLowerCase()) === idx)
    .join(', ')

  const startFrameRaw =
    clauseMap.get('0s–2s (start frame)') ||
    clauseMap.get('0s-2s (start frame)') ||
    clauseMap.get('start frame')
  const actionParts = [
    clauseMap.get('2s–5s (action)'),
    clauseMap.get('2s-5s (action)'),
    clauseMap.get('5s–8s (action progression)'),
    clauseMap.get('5s-8s (action progression)'),
    clauseMap.get('2s–8s (action)'),
    clauseMap.get('2s-8s (action)'),
    clauseMap.get('action'),
  ]
    .filter((v): v is string => isMeaningfulDirectionFacet(v))
    .filter((v, idx, arr) => arr.findIndex((other) => other.toLowerCase() === v.toLowerCase()) === idx)
  const combinedClipAction = actionParts.join('. ')
  const endOnRaw = (
    clauseMap.get('8s–10s (end frame): end on') ||
    clauseMap.get('8s-10s (end frame): end on') ||
    clauseMap.get('8s–10s (end frame)') ||
    clauseMap.get('8s-10s (end frame)') ||
    clauseMap.get('end on') ||
    ''
  )
    .replace(/^end\s+on:\s*/i, '')
    .trim()

  const resolvedStartFrame = isMeaningfulDirectionFacet(startFrameRaw)
    ? startFrameRaw
    : undefined
  const resolvedClipAction = isMeaningfulDirectionFacet(combinedClipAction)
    ? combinedClipAction
    : undefined
  const resolvedEndOn = isMeaningfulDirectionFacet(endOnRaw) ? endOnRaw : undefined

  return {
    lead: lead || resolvedClipAction || resolvedStartFrame || '',
    startFrame: resolvedStartFrame,
    clipAction: resolvedClipAction,
    coverage: isMeaningfulDirectionFacet(clauseMap.get('coverage'))
      ? clauseMap.get('coverage')
      : undefined,
    lens: isMeaningfulDirectionFacet(clauseMap.get('lens')) ? clauseMap.get('lens') : undefined,
    space: isMeaningfulDirectionFacet(clauseMap.get('space')) ? clauseMap.get('space') : undefined,
    shot: isMeaningfulDirectionFacet(clauseMap.get('shot')) ? clauseMap.get('shot') : undefined,
    angle: isMeaningfulDirectionFacet(clauseMap.get('angle')) ? clauseMap.get('angle') : undefined,
    camera: isMeaningfulDirectionFacet(clauseMap.get('camera'))
      ? clauseMap.get('camera')
      : undefined,
    blocking: isMeaningfulDirectionFacet(clauseMap.get('blocking'))
      ? clauseMap.get('blocking')
      : undefined,
    emotion: isMeaningfulDirectionFacet(clauseMap.get('emotion'))
      ? clauseMap.get('emotion')
      : undefined,
    gaze: isMeaningfulDirectionFacet(clauseMap.get('gaze')) ? clauseMap.get('gaze') : undefined,
    propInteraction: isMeaningfulDirectionFacet(clauseMap.get('prop interaction'))
      ? clauseMap.get('prop interaction')
      : undefined,
    props: combinedProps || undefined,
    lighting: isMeaningfulDirectionFacet(clauseMap.get('lighting'))
      ? clauseMap.get('lighting')
      : undefined,
    endOn: resolvedEndOn,
    statedAction: isMeaningfulDirectionFacet(clauseMap.get('the only action is'))
      ? clauseMap.get('the only action is')
      : undefined,
    noPeopleInFrame,
    visiblePeople: isMeaningfulDirectionFacet(clauseMap.get('only these people are visible'))
      ? clauseMap.get('only these people are visible')
      : undefined,
  }
}

/**
 * Resolve the canonical Clips prompt for a beat so Start Frame, End Frame,
 * and Clips tab share a single source of truth.
 */
export function resolveBeatClipPrompt(
  beat: SceneBeat,
  options?: ResolveBeatClipPromptOptions
): string {
  if (options?.clipPrompt?.trim()) {
    return options.clipPrompt.trim()
  }

  const scene = options?.scene ?? null
  const segments = Array.isArray(scene?.segments)
    ? (scene.segments as Array<{
        beatId?: string
        userEditedPrompt?: string | null
        generatedPrompt?: string | null
        videoPrompt?: string | null
        prompt?: string | null
      }>)
    : []
  const matchingSegment = segments.find((seg) => seg && seg.beatId === beat.beatId)

  if (
    matchingSegment?.userEditedPrompt?.trim() &&
    !isStaleSavedVideoPrompt(beat, matchingSegment.userEditedPrompt.trim(), beat.line?.trim())
  ) {
    return matchingSegment.userEditedPrompt.trim()
  }

  const storedVideoPrompt = beat.beatDirection?.videoPrompt?.trim()
  if (
    storedVideoPrompt &&
    !isStaleSavedVideoPrompt(beat, storedVideoPrompt, beat.line?.trim())
  ) {
    return storedVideoPrompt
  }

  const generatedBy = beat.beatDirection?.generatedBy
  const beatWasManuallyDirected = generatedBy === 'user' || generatedBy === 'director'
  if (!beatWasManuallyDirected) {
    const segPrompt =
      matchingSegment?.videoPrompt?.trim() ||
      matchingSegment?.generatedPrompt?.trim() ||
      matchingSegment?.prompt?.trim()
    if (segPrompt) {
      return segPrompt
    }
  }

  const sceneDirection =
    options?.sceneDirection ??
    ((scene?.sceneDirection ?? scene?.detailedDirection ?? null) as DetailedSceneDirection | null)
  const allBeats = scene ? getSceneBeats(scene) : []
  const beatIndex = allBeats.findIndex((entry) => entry.beatId === beat.beatId)
  const previousBeat =
    options?.previousBeat ?? (beatIndex > 0 ? allBeats[beatIndex - 1] : undefined)
  const musicCue =
    scene && beatIndex >= 0
      ? resolveBeatMusicCue(parsePersistedMusicCues(scene.sceneMusicCues, allBeats), beatIndex)
      : undefined

  return compileBeatVideoPromptFromDirection(beat, sceneDirection, {
    ...(options?.artStyleId ? { artStyleId: options.artStyleId } : {}),
    ...(previousBeat ? { previousBeat } : {}),
    ...(musicCue ? { musicCue } : {}),
  }).prompt
}

export function buildClipBookendDirectorSystemPrompt(): string {
  return `You are a cinematic Frame-to-Video (F2V) keyframe director (optimized for Kling F2V and Veo first-to-last-frame interpolation). You receive a shot's compiled CLIP PROMPT (and optional Shot Still context) and write two still-image prompts that bookend the video clip with a clear visual motion vector between t=0s and t=T:
1. "startFramePrompt": The opening still frame at t=0s (the exact instant before the clip's camera movement and physical action unfold).
2. "endFramePrompt": The concluding still frame at t=T (the destination frame after the clip's full camera movement, perspective shift, and physical or environmental action have completed).

HARD RULES:
1. F2V MOTION PROGRESSION & VISUAL DELTA (CRITICAL FOR END FRAME):
   - In Frame-to-Video (F2V) generation, if the End Frame looks like the Start Frame, the generated video will be frozen and static. Determine the End Frame (t=T) directly from the motion and changes across the CLIP PROMPT so it shows an unmistakable visual progression from t=0s:
   - CAMERA MOVEMENT DELTA:
     * Push-in / Dolly-in / Zoom-in: At t=0s, establish the wider initial vantage point before the move. At t=T, advance the camera noticeably deeper into the space—near-field foreground elements from t=0s have passed out of the frame edges, the central focal subject or vanishing-point architecture fills a significantly larger scale in a tighter terminal framing, and 3D perspective/parallax has shifted forward.
     * Pull-back / Dolly-out / Crane-up: At t=T, widen the field of view to reveal surrounding architecture and environment beyond the t=0s crop, reducing the relative scale of the initial focal area.
     * Pan / Tilt / Track / Orbit: At t=T, shift the background perspective, wall/horizon angles, and 3D parallax in the direction of camera travel, revealing new adjacent space while trailing t=0s elements exit the opposite frame edge.
     * Static camera: Keep the camera lens locked, but clearly advance the physical action, subject position, light beam sweep, shadow angle, or atmospheric/particulate progression from its initial t=0s state to its completed t=T state.
   - SUBJECT & ENVIRONMENT DELTA:
     * Advance all character blocking, body orientation, gestures, prop interactions, and environmental dynamics to their completed t=T terminal state (honoring the CLIP PROMPT's "End on:" clause). Do not leave subjects or movable elements frozen in their t=0s pose.
   - Do NOT repeat the t=0s static scene description verbatim in endFramePrompt. Write endFramePrompt to explicitly direct how the camera vantage point, background perspective/scale, and subject/environment state have transformed by t=T.
2. ALIGNMENT WITH CLIP PROMPT:
   - Treat the CLIP PROMPT as the authoritative source of truth for world architecture, lighting atmosphere, key props, and the motion arc from t=0s to t=T.
   - Preserve any quoted on-screen typography or title text verbatim (e.g. "Episode 1: The White City Current") in both prompts whenever it is part of the shot.
3. CAST & OCCUPANCY:
   - If the CLIP PROMPT contains "No people in frame" (or Gaze: N/A with no characters), DO NOT mention characters, facial expressions, gaze, body posture, or wardrobe. Explicitly include "No people in frame." in both prompts.
   - If the CLIP PROMPT names specific people, use their exact names and describe their initial opening pose/staging at t=0s vs their relocated or completed terminal pose/expression at t=T.
4. CLEAN STILL PROSE:
   - Omit audio cues ("Sound:", "No spoken dialogue", audio frequencies) and video suffixes ("cinematic motion").
   - Never output placeholder tokens like "N/A" or double periods ("..").
   - Do not include "Edit the reference shot still..." or "Edit the start frame image..." wrapper preambles in the JSON values; code wraps those automatically.

Output JSON only:
{
  "startFramePrompt": "2-5 sentences describing the t=0s opening composition, initial shot framing and camera starting position before movement, opening blocking, lighting, and occupancy aligned with the clip prompt.",
  "endFramePrompt": "2-5 sentences directing the t=T destination frame after the clip's camera movement and action complete—explicitly describing the shifted camera perspective/scale, evolved background framing and parallax, completed subject/prop/environment state ('End on'), lighting, and occupancy for F2V interpolation."
}`
}

export function buildClipBookendDirectorUserPrompt(request: ClipBookendDirectorRequest): string {
  const parts: string[] = [
    'Create the aligned t=0s Start Frame still prompt and the F2V-progressed t=T End Frame still prompt based on the motion and changes across this CLIP PROMPT:',
    '',
    'CLIP PROMPT:',
    request.clipPrompt.trim(),
  ]

  if (request.shotStillPrompt?.trim()) {
    parts.push('', 'SHOT STILL CONTEXT:', request.shotStillPrompt.trim())
  }

  if (typeof request.durationSeconds === 'number' && request.durationSeconds > 0) {
    parts.push('', `CLIP DURATION: ${request.durationSeconds}s`)
  }

  return parts.join('\n')
}

export function parseClipBookendDirectorResponse(
  raw: unknown,
  request: ClipBookendDirectorRequest
): ClipBookendPrompts | null {
  let parsedObj: unknown = raw
  if (typeof raw === 'string') {
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim()
    try {
      parsedObj = JSON.parse(cleaned)
    } catch {
      return null
    }
  }
  if (!parsedObj || typeof parsedObj !== 'object') return null
  const record = parsedObj as Record<string, unknown>
  let startFramePrompt =
    typeof record.startFramePrompt === 'string' ? normalizeSinglePeriods(record.startFramePrompt) : ''
  let endFramePrompt =
    typeof record.endFramePrompt === 'string' ? normalizeSinglePeriods(record.endFramePrompt) : ''

  if (startFramePrompt.length < 20 || endFramePrompt.length < 20) {
    return null
  }

  const facets = extractClipPromptFacets(request.clipPrompt)
  if (facets.noPeopleInFrame) {
    // Strip any accidental character expression/gaze hallucinations if no people are in frame
    if (!/\bno people in frame\b/i.test(startFramePrompt)) {
      startFramePrompt = normalizeSinglePeriods(`${ cleanPromptClause(startFramePrompt) }. No people in frame.`)
    }
    if (!/\bno people in frame\b/i.test(endFramePrompt)) {
      endFramePrompt = normalizeSinglePeriods(`${ cleanPromptClause(endFramePrompt) }. No people in frame.`)
    }
  }

  return {
    startFramePrompt,
    endFramePrompt,
  }
}
