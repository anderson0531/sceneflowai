/**
 * Long-Form Editorial Stitcher (45m–60m Episode Assembly Engine)
 *
 * Solves the "stitched 10s AI clip" problem across 270–360 consecutive cuts by:
 * 1. Dynamic Narrative Clip Trimming: trims raw 8s/10s generated clips to match
 *    actual spoken dialogue + reaction beats (3.2s–8.8s) so characters don't
 *    stare silently for 3–4 seconds after finishing a line.
 * 2. Automated J-Cuts & L-Cuts: pre-rolls incoming speaker audio by 0.25s across
 *    reaction cuts (J-cut) and trails outgoing audio by 0.20s (L-cut), matching
 *    professional television drama editing.
 * 3. Continuous Scene Room-Tone Bed: generates a continuous, low-floor ambient
 *    stem (-22 dB) across all cuts in a scene with smooth fade-in/out so the
 *    noise floor never drops to digital zero at 10s segment boundaries.
 */

export interface NarrativeClipTrimInput {
  /** Raw video duration from Veo/Omni/Kling (typically 8 or 10 seconds). */
  rawDurationSec: number
  /** Total spoken dialogue/narration duration assigned to this beat/segment. */
  spokenDurationSec?: number
  /** Explicit action duration hint when no dialogue is present. */
  actionDurationSec?: number
  /** True when this clip is part of a multi-part Veo EXT continuation chain. */
  isExtensionContinuation?: boolean
  /** True when the next part continues the same split dialogue line. */
  continuesIntoNextPart?: boolean
  /** Existing manual user trim-in override (if set, preserved). */
  existingTrimInSec?: number
  /** Existing manual user trim-out override (if set, preserved). */
  existingTrimOutSec?: number
  /** Lead-in reaction padding before speech begins (default: 0.25s). */
  reactionLeadInSec?: number
  /** Trail-out reaction beat after speech finishes (default: 0.65s). */
  reactionTrailOutSec?: number
  /** Minimum narrative cut length to prevent jarring flash cuts (default: 3.2s). */
  minCutSec?: number
}

export interface NarrativeClipTrimResult {
  trimInSec: number
  trimOutSec: number
  effectiveDurationSec: number
  wasAutoTrimmed: boolean
  trimReason: 'manual_preserved' | 'ext_chain_locked' | 'dialogue_paced' | 'action_paced' | 'full_clip'
}

export interface EditorialSegmentTiming {
  segmentId: string
  sequenceIndex: number
  startTime: number
  duration: number
  speaker?: string
  hasDialogue?: boolean
  transitionIn?: 'cut' | 'dissolve' | 'fade'
}

export interface EditorialAudioClip {
  id: string
  url: string
  type: 'dialogue' | 'narration' | 'sfx' | 'music'
  startTime: number
  duration: number
  volume: number
  speaker?: string
  segmentId?: string
  fadeInSec?: number
  fadeOutSec?: number
  editorialCutType?: 'straight' | 'j_cut' | 'l_cut'
  editorialOffsetSec?: number
}

export interface JLCutOptions {
  /** Seconds incoming dialogue leads the visual cut (default: 0.25s). */
  jCutPreRollSec?: number
  /** Seconds outgoing dialogue trails across the next visual cut (default: 0.20s). */
  lCutPostRollSec?: number
  /** Minimum breathing gap between consecutive dialogue clips (default: 0.12s). */
  minDialogueGapSec?: number
}

export interface SceneRoomToneBedConfig {
  sceneId: string
  sceneDurationSec: number
  roomToneUrl?: string
  /** Default 0.08 (~ -22 dB) so room tone glues cuts without masking speech. */
  baseVolume?: number
  fadeInSec?: number
  fadeOutSec?: number
}

const DEFAULT_REACTION_LEAD_IN_SEC = 0.25
const DEFAULT_REACTION_TRAIL_OUT_SEC = 0.65
const DEFAULT_MIN_CUT_SEC = 3.2
const DEFAULT_J_CUT_PRE_ROLL_SEC = 0.25
const DEFAULT_L_CUT_POST_ROLL_SEC = 0.20
const DEFAULT_MIN_DIALOGUE_GAP_SEC = 0.12

function roundMillis(sec: number): number {
  return Math.round(sec * 1000) / 1000
}

/**
 * Compute optimal narrative trim points for a raw generated video clip (e.g. 10s).
 * Prevents dead-air staring at the tail of dialogue shots while preserving
 * manual trims and Veo EXT continuation chains.
 */
export function computeNarrativeClipTrim(
  input: NarrativeClipTrimInput
): NarrativeClipTrimResult {
  const rawDuration = Math.max(1, Number.isFinite(input.rawDurationSec) ? input.rawDurationSec : 10)
  const minCut = Math.min(rawDuration, Math.max(1.5, input.minCutSec ?? DEFAULT_MIN_CUT_SEC))

  // 1. Respect explicit user manual trims if already set
  if (
    input.existingTrimInSec != null ||
    (input.existingTrimOutSec != null && input.existingTrimOutSec < rawDuration - 0.05)
  ) {
    const trimIn = Math.max(0, Math.min(rawDuration - 0.5, input.existingTrimInSec ?? 0))
    const trimOut = Math.max(
      trimIn + 0.5,
      Math.min(rawDuration, input.existingTrimOutSec ?? rawDuration)
    )
    return {
      trimInSec: roundMillis(trimIn),
      trimOutSec: roundMillis(trimOut),
      effectiveDurationSec: roundMillis(trimOut - trimIn),
      wasAutoTrimmed: false,
      trimReason: 'manual_preserved',
    }
  }

  // 2. Do not trim the tail of a clip that feeds an EXT continuation (next part starts at last frame)
  if (input.continuesIntoNextPart) {
    return {
      trimInSec: 0,
      trimOutSec: roundMillis(rawDuration),
      effectiveDurationSec: roundMillis(rawDuration),
      wasAutoTrimmed: false,
      trimReason: 'ext_chain_locked',
    }
  }

  const leadIn = input.reactionLeadInSec ?? DEFAULT_REACTION_LEAD_IN_SEC
  const trailOut = input.reactionTrailOutSec ?? DEFAULT_REACTION_TRAIL_OUT_SEC

  // 3. Dialogue-paced trim: trim dead air when speech is significantly shorter than the 10s clip
  if (input.spokenDurationSec != null && input.spokenDurationSec > 0) {
    const targetDuration = input.spokenDurationSec + leadIn + trailOut
    const clampedOut = Math.max(minCut, Math.min(rawDuration, targetDuration))
    const isTrimmed = clampedOut < rawDuration - 0.25
    return {
      trimInSec: 0,
      trimOutSec: roundMillis(isTrimmed ? clampedOut : rawDuration),
      effectiveDurationSec: roundMillis(isTrimmed ? clampedOut : rawDuration),
      wasAutoTrimmed: isTrimmed,
      trimReason: isTrimmed ? 'dialogue_paced' : 'full_clip',
    }
  }

  // 4. Action-paced trim: when beat planner specifies a brisk action duration (< raw clip)
  if (input.actionDurationSec != null && input.actionDurationSec > 0) {
    const clampedOut = Math.max(minCut, Math.min(rawDuration, input.actionDurationSec))
    const isTrimmed = clampedOut < rawDuration - 0.25
    return {
      trimInSec: 0,
      trimOutSec: roundMillis(isTrimmed ? clampedOut : rawDuration),
      effectiveDurationSec: roundMillis(isTrimmed ? clampedOut : rawDuration),
      wasAutoTrimmed: isTrimmed,
      trimReason: isTrimmed ? 'action_paced' : 'full_clip',
    }
  }

  return {
    trimInSec: 0,
    trimOutSec: roundMillis(rawDuration),
    effectiveDurationSec: roundMillis(rawDuration),
    wasAutoTrimmed: false,
    trimReason: 'full_clip',
  }
}

/**
 * Apply J-cut and L-cut audio overlaps across segment boundaries so dialogue
 * edits feel like a human-cut television drama rather than butt-joined 10s clips.
 */
export function applyEditorialJLCuts(
  segments: EditorialSegmentTiming[],
  audioClips: EditorialAudioClip[],
  options: JLCutOptions = {}
): EditorialAudioClip[] {
  const jPreRoll = Math.max(0, options.jCutPreRollSec ?? DEFAULT_J_CUT_PRE_ROLL_SEC)
  const lPostRoll = Math.max(0, options.lCutPostRollSec ?? DEFAULT_L_CUT_POST_ROLL_SEC)
  const minGap = Math.max(0.04, options.minDialogueGapSec ?? DEFAULT_MIN_DIALOGUE_GAP_SEC)

  if (segments.length < 2 || audioClips.length === 0) {
    return audioClips.map((c) => ({ ...c, editorialCutType: c.editorialCutType ?? 'straight' }))
  }

  const segmentById = new Map<string, EditorialSegmentTiming>()
  for (const seg of segments) {
    segmentById.set(seg.segmentId, seg)
  }

  // Sort a working copy of audio clips by startTime
  const result = audioClips.map((c) => ({ ...c }))
  const dialogueIndices = result
    .map((clip, index) => ({ clip, index }))
    .filter(({ clip }) => clip.type === 'dialogue')
    .sort((a, b) => a.clip.startTime - b.clip.startTime)

  for (let i = 0; i < dialogueIndices.length; i++) {
    const { clip, index } = dialogueIndices[i]
    const seg = clip.segmentId ? segmentById.get(clip.segmentId) : undefined

    // J-Cut: If this dialogue clip starts right at a visual cut (index > 0 in scene)
    // and there is headroom after the previous dialogue clip, pre-roll by jPreRoll
    if (seg && seg.sequenceIndex > 0 && Math.abs(clip.startTime - seg.startTime) <= 0.35) {
      const prevDialogue = i > 0 ? dialogueIndices[i - 1].clip : undefined
      const earliestAllowedStart = prevDialogue
        ? prevDialogue.startTime + prevDialogue.duration + minGap
        : Math.max(0, seg.startTime - jPreRoll)
      const desiredStart = Math.max(0, clip.startTime - jPreRoll)

      if (desiredStart >= earliestAllowedStart && desiredStart < clip.startTime - 0.05) {
        const shift = roundMillis(clip.startTime - desiredStart)
        result[index] = {
          ...clip,
          startTime: roundMillis(desiredStart),
          fadeInSec: clip.fadeInSec ?? 0.08,
          editorialCutType: 'j_cut',
          editorialOffsetSec: -shift,
        }
        dialogueIndices[i].clip = result[index]
        continue
      }
    }

    // L-Cut: If a dialogue clip ends right at the end of its visual segment and
    // the next dialogue clip starts later, add a smooth post-roll fade tail
    if (seg) {
      const segEnd = seg.startTime + seg.duration
      const clipEnd = clip.startTime + clip.duration
      if (Math.abs(clipEnd - segEnd) <= 0.25 && lPostRoll > 0) {
        result[index] = {
          ...clip,
          fadeOutSec: clip.fadeOutSec ?? Math.min(0.25, lPostRoll),
          editorialCutType: 'l_cut',
          editorialOffsetSec: roundMillis(lPostRoll),
        }
        dialogueIndices[i].clip = result[index]
        continue
      }
    }

    result[index] = {
      ...clip,
      editorialCutType: clip.editorialCutType ?? 'straight',
      editorialOffsetSec: 0,
    }
  }

  return result
}

/**
 * Build a continuous per-scene room-tone / ambience audio bed clip that spans
 * all cuts in the scene so segment boundaries never drop to digital silence.
 */
export function buildSceneRoomToneBed(
  config: SceneRoomToneBedConfig
): EditorialAudioClip | null {
  if (!config.roomToneUrl?.trim() || config.sceneDurationSec <= 0) {
    return null
  }
  const duration = roundMillis(config.sceneDurationSec)
  return {
    id: `room-tone-${config.sceneId}`,
    url: config.roomToneUrl.trim(),
    type: 'sfx',
    startTime: 0,
    duration,
    volume: config.baseVolume ?? 0.08,
    fadeInSec: config.fadeInSec ?? Math.min(0.5, duration * 0.1),
    fadeOutSec: config.fadeOutSec ?? Math.min(0.6, duration * 0.1),
    editorialCutType: 'straight',
    editorialOffsetSec: 0,
  }
}
