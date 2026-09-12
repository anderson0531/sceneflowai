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
export type BeatKind = 'dialogue' | 'action' | 'narration'
export type BeatOverlayType = 'title' | 'signage' | 'lower_third'
export type StoryboardStatus = 'none' | 'pending_review' | 'approved'
export type SegmentTransitionType = 'CUT' | 'CONTINUE' | 'DISSOLVE' | 'FADE'

/** Recommended split for dialogue beats exceeding Veo clip budget. */
export interface BeatSplitRecommendation {
  partCount: number
  excerpts: string[]
}

/** User-verified reference images for beat storyboard generation. */
export interface BeatReferenceSelection {
  characterIds: string[]
  locationRefId?: string | null
  objectRefIds: string[]
  characterWardrobes?: Array<{ characterId: string; wardrobeId: string }>
  resolvedAt?: string
  /** `user` = Direct/prompt dialog; `auto` = Express auto-resolve (do not lock). */
  source?: 'auto' | 'user'
}

export type BeatDirectionTransition = 'CUT' | 'CONTINUE' | 'DISSOLVE' | 'FADE' | 'MATCH_CUT'
export type BeatDirectionSource = 'llm' | 'planner' | 'derived' | 'user'
export type SceneMovementSource = 'llm' | 'derived' | 'user'
export type SceneMusicCueSource = 'llm' | 'derived' | 'user'

/** How a cue arrives. */
export type MusicCueEntry = 'fade' | 'hard' | 'swell'
/** How a cue leaves. */
export type MusicCueExit = 'fade' | 'hard' | 'tail'

/**
 * One dramatic movement inside a scene, covering a contiguous run of beats.
 *
 * A scene of up to `MAX_BEATS_PER_SCENE` beats reads as a single continuous
 * story only when each beat knows which part of the scene it illustrates.
 * Movements carry that mapping: `summary` is the sentence of the scene
 * description this run of beats dramatizes, and `beatStart`/`beatEnd` are
 * inclusive indices into `scene.beats`.
 */
export interface SceneMovement {
  /** Position in the scene, 0-based. */
  index: number
  /** One sentence of the scene description that this run of beats dramatizes. */
  summary: string
  /** What changes dramatically across this movement (optional, LLM-authored). */
  intent?: string
  /** Inclusive first beat index covered by this movement. */
  beatStart: number
  /** Inclusive last beat index covered by this movement. */
  beatEnd: number
  /** Provenance of this movement record. */
  generatedBy?: SceneMovementSource
}

/**
 * One stretch of a scene that plays scored, and the emotion it is scored for.
 *
 * A scene used to hold a single music file looped end to end, which cannot
 * follow a scene that swings from dread to violence to revelation. A cue names
 * the contiguous run of beats it underscores, so a scene can carry a few
 * distinct pieces of music — and, just as deliberately, stretches with none.
 * Cues are placed by the script LLM when available and derived from the
 * scene's movements otherwise.
 */
export interface SceneMusicCue {
  cueId: string
  /** Inclusive first beat index this cue scores. */
  beatStart: number
  /** Inclusive last beat index this cue scores. */
  beatEnd: number
  /** Lyria brief: genre, mood, instruments, tempo. Obeys LYRIA_MUSIC_PROMPT_RULES. */
  description: string
  /** The viewer emotion this cue exists to trigger; drives the video-prompt steer. */
  intent: string
  entry?: MusicCueEntry
  exit?: MusicCueExit
  /** Generated track. Absent until the cue is scored. */
  url?: string
  /** Timeline length the cue plays for, looping the file as needed. */
  duration?: number
  /** Real length of the generated file (Lyria 3 writes up to ~184s). */
  fileDuration?: number
  /** Provenance of this cue record. */
  generatedBy?: SceneMusicCueSource
  /** ISO timestamp of last write. */
  updatedAt?: string
}

/**
 * Structured, per-beat direction produced during script generation.
 *
 * Persisted on `SceneBeat` so downstream prompt builders (still, video, pre-vis,
 * segment) can read structured fields directly instead of reinterpreting prose
 * from `actionDescription`/`line`. Fields are OPTIONAL: absent fields fall
 * back to the pre-existing prose/heuristic logic in each consumer.
 */
export interface BeatDirection {
  /** Named shot (e.g., "Medium Wide Shot", "Extreme Close-Up"). */
  shotType?: string
  /** Camera angle (e.g., "eye-level", "low", "high", "Dutch"). */
  cameraAngle?: string
  /** Camera movement (e.g., "static", "handheld push-in", "Steadicam creep"). */
  cameraMovement?: string
  /**
   * Exactly who is on camera in this beat, by character name.
   *
   * The one statement of frame occupancy: an empty array means nobody, which is
   * different from the field being absent. Absent is a legacy record, and cast
   * for those is still guessed from prose. Guessing is what put a character in
   * an extreme close-up of a pressure gauge.
   */
  castInFrame?: string[]
  /** Per-beat blocking: where subjects are and what their bodies do. */
  blocking?: string
  /** Directed emotion / expression for this beat. */
  emotion?: string
  /** Who or what the subject looks at (target of gaze). */
  gaze?: string
  /** Subset of scene `Key Props` that are visible/relevant in this beat. */
  keyProps?: string[]
  /** How characters interact with props (which hand, what motion). */
  propInteraction?: string
  /** Per-beat lighting deviation from scene lighting (e.g., "teal accent on core"). */
  lightingAccent?: string
  /** One-sentence description of the frozen still moment. */
  frozenMoment?: string
  /** Per-beat diegetic audio cue (e.g., "glitching proximity timer"). */
  audioCue?: string
  /** Transition INTO the next beat. */
  transition?: BeatDirectionTransition
  /** Provenance of this direction record. */
  generatedBy?: BeatDirectionSource
  /** ISO timestamp of last write. */
  updatedAt?: string
}

/**
 * Atomic visual moment in a scene — source of truth for storyboard → segments.
 * Spoken beats (dialogue | narration) carry TTS; action beats are silent visuals.
 */
export interface SceneBeat {
  beatId: string
  sequenceIndex: number
  kind: BeatKind
  /** Spoken line (dialogue or narration). */
  character?: string
  characterId?: string
  line?: string
  voiceDirection?: string
  /** Silent visual beat description. */
  actionDescription?: string
  /** Sequence role for keyframe planning (opening, title_reveal, etc.). */
  beatRole?: string
  /** Index into `scene.sceneMovements` — which part of the scene this beat tells. */
  movementIndex?: number
  storyboardImageUrl?: string
  storyboardImagePrompt?: string
  /**
   * `beatStillDirectionFingerprint` of the direction `storyboardImagePrompt`
   * was composed from. A mismatch means the still-relevant direction moved on
   * and the stored prompt must not be reused as this beat's action/framing.
   */
  storyboardImagePromptDirectionKey?: string
  /**
   * `beatStillDirectionFingerprint` of the direction the current
   * `storyboardImageUrl` was generated from. A mismatch means the frame is
   * optional-regen stale (prompt may already have been auto-updated).
   */
  storyboardImageDirectionKey?: string
  storyboardImageGcsPath?: string
  /** draft = Express layout pass; final = hi-res for animatic & video */
  storyboardImageTier?: 'draft' | 'final'
  /** Optional end frame for in-beat motion and FTV interpolation. */
  storyboardEndImageUrl?: string
  storyboardEndImagePrompt?: string
  storyboardEndImageGcsPath?: string
  storyboardEndImageTier?: 'draft' | 'final'
  audioUrl?: string
  durationSeconds?: number
  needsSplit?: boolean
  splitRecommendation?: BeatSplitRecommendation
  /** Stable line id when this beat maps to a dialogue/narration line. */
  lineId?: string
  /** When true, background music plays for this beat's timeline window. Default: off. */
  musicEnabled?: boolean
  /** When true, SFX linked to this beat is skipped during playback. Default: play. */
  sfxMuted?: boolean
  /** Saved character/location/prop references for storyboard generation. */
  referenceSelection?: BeatReferenceSelection
  /** Last Express/manual generation error for the start frame (cleared on success). */
  storyboardImageError?: string
  /** Last generation error for the optional end frame (cleared on success). */
  storyboardEndImageError?: string
  /**
   * When true, skip storyboard image, video/segment, and final render for this beat.
   * Dialogue/narration audio is preserved. Default: included.
   */
  excluded?: boolean
  /** English on-screen caption for signage/titles (separate from spoken line). */
  overlayText?: string
  /** Auto-positioned caption style in the Screening Room animatic. */
  overlayType?: BeatOverlayType
  /** Per-beat Ken Burns pan-from / pan-to for Pre-Vis frames and animatic export. */
  kenBurns?: import('@/lib/storyboard/kenBurnsFrame').BeatKenBurnsSettings
  /**
   * Structured cinematographer/director direction for this specific beat.
   * Populated by the script LLM (or derived/planner backfill) and used as the
   * authoritative source by downstream prompt builders.
   */
  beatDirection?: BeatDirection
}

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
  /** Per-line storyboard frame (speaker-focused cut). */
  storyboardImageUrl?: string
  storyboardImagePrompt?: string
  storyboardImageGcsPath?: string
  /** draft = Express layout pass; final = hi-res for animatic & video */
  storyboardImageTier?: 'draft' | 'final'
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
  /** Optional storyboard beat this SFX is anchored to (beat-first pipeline). */
  sourceBeatId?: string
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
  /** Canonical start frame prompt for this segment. */
  startFramePrompt?: string | null
  /** Canonical end frame prompt for this segment. */
  endFramePrompt?: string | null
  /** Canonical F2V/video prompt for this segment. */
  videoPrompt?: string | null
  videoPromptElements?: {
    camera?: string
    character?: string
    action?: string
    dialogue?: string
    camera_movement?: string
    lighting?: string
    visual_style?: string
  } | null
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
  /** beatContentFingerprint of the line at generation time. */
  sourceFingerprint?: string
  /** True when the script prompt changed after this clip was generated. */
  audioStale?: boolean
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
  sourceFingerprint?: string
  audioStale?: boolean
}
