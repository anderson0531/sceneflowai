/**
 * Segmented script types.
 *
 * This is the creative source of truth for a scene: each scene is composed of
 * Veo-quantized segments (4 / 6 / 8 / 10 / 12 seconds). Each segment owns its
 * own direction, dialogue lines (one sentence per line), SFX, and frame
 * description hints. Narration is folded into dialogue as a reserved character
 * called NARRATOR with kind: 'narration'.
 *
 * Production state (assets, takes, prompts, generated URLs) lives in
 * production.scenes[sceneId].segments[] under the same `segmentId`.
 */

export const NARRATOR_CHARACTER = 'NARRATOR'
export const NARRATOR_CHARACTER_ID = 'narrator'

export type DialogueKind = 'narration' | 'dialogue'
export type SegmentTransitionType = 'CUT' | 'CONTINUE' | 'DISSOLVE' | 'FADE'

/**
 * A single sentence of dialogue (or narration). One sentence per DialogueLine
 * is enforced by the splitter; multi-sentence lines are split on save.
 */
export interface DialogueLine {
  /** Stable id, e.g. "ln_<nanoid>" — survives reorders, edits, regenerations. */
  lineId: string
  /** Display name (e.g. "ASHLEY", "NARRATOR"). */
  character: string
  /** Resolved character id when known. NARRATOR resolves to "narrator". */
  characterId?: string
  /** The single-sentence line text. */
  line: string
  /** "narration" for narrator lines, "dialogue" otherwise. */
  kind: DialogueKind
  /** Optional voice direction / emotion ("[frustrated, low]"). */
  voiceDirection?: string
}

/**
 * A SFX cue assigned to a specific segment.
 */
export interface SegmentSFX {
  /** Stable id, e.g. "sfx_<nanoid>". */
  sfxId: string
  /** Plain-text description of the effect. */
  description: string
  /** Optional offset in seconds within the segment. */
  time?: number
  /** Optional dialogue lineId this SFX is anchored to (e.g. for ducking). */
  sourceLineId?: string
  /**
   * Position of this cue in the legacy positional `scene.sfx[]` /
   * `scene.sfxAudio[]` arrays. Maintained during the back-compat window so
   * existing per-index audio handlers keep working.
   */
  legacyIndex?: number
}

export interface ScriptSegmentReferences {
  /** Visual description of the segment's start frame (for image generation). */
  startFrameDescription?: string | null
  /** Visual description of the segment's end frame (lookahead for next seg). */
  endFrameDescription?: string | null
  /** Character ids present in this segment. */
  characterIds?: string[]
}

/**
 * A creative segment of a scene. Veo timing is captured as `endTime - startTime`
 * which must always be one of the VEO_VALID_DURATIONS values for new content.
 */
export interface ScriptSegment {
  /** Stable id, e.g. "seg_<nanoid>" — survives edits and timing changes. */
  segmentId: string
  /** Position within the scene. 0-based. */
  sequenceIndex: number
  /** Cumulative seconds within the scene (relative to scene start). */
  startTime: number
  endTime: number
  /** Performance/transition direction for this ~10s beat. */
  segmentDirection: string
  /** Transition into this segment from the previous one. */
  transitionType?: SegmentTransitionType
  /** Ordered dialogue + narrator lines. One sentence per element. */
  dialogue: DialogueLine[]
  /** SFX cues assigned to this segment. */
  sfx: SegmentSFX[]
  /** Optional frame-description hints. */
  references?: ScriptSegmentReferences
  /** Optional emotional beat label. */
  emotionalBeat?: string
}

/**
 * Scene-level fields that remain at the scene (not segment) level.
 * Music, wardrobe, and visual description stay scene-scoped.
 */
export interface SegmentedSceneFields {
  segments: ScriptSegment[]
}

// ---------------------------------------------------------------------------
// Audio storage shapes (back-compat aware)
// ---------------------------------------------------------------------------

/**
 * One persisted dialogue audio entry. Both `lineId` and `dialogueIndex` are
 * stored during the migration window so legacy consumers keep working.
 */
export interface DialogueAudioEntry {
  /** Preferred lookup key. */
  lineId?: string
  /** Legacy positional key (index into the flat scene.dialogue list). */
  dialogueIndex?: number
  character: string
  characterId?: string
  kind?: DialogueKind
  audioUrl: string
  duration?: number
  voiceId?: string
  voiceProvider?: string
  generatedAt?: string
  /** Set when entry is no longer referenced by any segment. */
  orphan?: boolean
}

/**
 * One persisted SFX audio entry, keyed by sfxId.
 */
export interface SfxAudioEntry {
  sfxId: string
  audioUrl: string
  duration?: number
  generatedAt?: string
}
