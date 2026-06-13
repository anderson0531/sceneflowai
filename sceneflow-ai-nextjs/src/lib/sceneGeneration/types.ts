/**
 * Shared types for the Storyboard Express orchestrator and the
 * underlying per-scene generation helpers.
 *
 * The helpers intentionally do NOT touch the database. The orchestrator
 * (or the existing per-scene routes) is responsible for persisting the
 * results to the project metadata.
 */

import type { DetailedSceneDirection } from '../../types/scene-direction'

export type ExpressPhase = 'direction' | 'audio' | 'image-plan' | 'image'

export type ExpressMode = 'batch' | 'scene'

export interface ExpressOptions {
  /** Project to operate on. */
  projectId: string
  /** `scene` = per-card fast path; `batch` = all-scenes toolbar (default). */
  mode?: ExpressMode
  /** When set, only run these scene indices (required for mode=scene). */
  sceneIndices?: number[]
  /** Locale for audio generation. Defaults to 'en'. */
  language?: string
  /** Art style preset id (e.g. photorealistic, anime-90s). */
  artStyle?: string
  /** Whether to generate music for each scene that has a music description. */
  includeMusic?: boolean
  /** Whether to generate SFX cues for each scene. */
  includeSFX?: boolean
  /**
   * When true, every phase is recomputed even if the scene already has
   * direction / audio / image. When false (default), each per-scene worker
   * skips a phase whose output is already present.
   */
  regenerate?: boolean
  /** Optional image quality tier passthrough (legacy 'auto' | 'max'). */
  imageQuality?: string
  /** Storyboard frame quality: draft (Express default) or final (animatic/video). */
  storyboardQuality?: 'draft' | 'final'
  /** Upgrade pass — regenerate draft/missing frames at final quality only. */
  finalizeOnly?: boolean
  /** When true, Express also generates an end frame per beat (for FTV motion). Default false. */
  includeEndFrames?: boolean
  /**
   * When true, only generate frames that have no stored image URL — never
   * re-tier or regenerate existing start/end frames. Mutually exclusive with
   * `regenerate`.
   */
  missingFramesOnly?: boolean
  /** When true, skip direction/image; translate + dub dialogue/narration only. */
  dialogueOnly?: boolean
}

export interface SceneDirectionResult {
  sceneDirection: DetailedSceneDirection
}

/**
 * Single audio asset persisted onto the scene.
 */
export interface SceneAudioAsset {
  audioType: 'narration' | 'dialogue' | 'music' | 'sfx'
  /** Index into scene.dialogue (for audioType === 'dialogue'). */
  dialogueIndex?: number
  /** Index into scene.sfx (for audioType === 'sfx'). */
  sfxIndex?: number
  /** Stable lineId, when available (used for dialogue/narration). */
  lineId?: string
  /**
   * For audioType === 'dialogue', whether this entry is a narrator line
   * (`kind: 'narration'`) that lives inside scene.dialogue under the
   * integrated narrator-as-character model. Players use this to render
   * narrator lines distinctly.
   */
  kind?: 'narration' | 'dialogue'
  /** Stable character id (e.g. 'narrator' for narrator lines). */
  characterId?: string | null
  audioUrl: string
  durationSeconds?: number | null
  voiceId?: string | null
  voiceProvider?: string | null
  character?: string | null
}

export interface SceneAudioCounts {
  narration: number
  dialogue: number
  music: number
  sfx: number
}

export interface SceneAudioFailure {
  audioType: 'narration' | 'dialogue'
  dialogueIndex?: number
  error: string
  rateLimited: boolean
}

export interface SceneAudioResult {
  /** Flat list of generated audio assets to merge back into the scene. */
  assets: SceneAudioAsset[]
  /** Count of each audio type generated. */
  counts: SceneAudioCounts
  /** Per-line failures that did not abort the whole scene. */
  failures?: SceneAudioFailure[]
}

export interface SceneImageResult {
  imageUrl: string
  gcsPath?: string | null
  imagePrompt?: string | null
}

export interface ExpressPhaseEvent {
  type: 'phase-start' | 'phase-done'
  sceneIndex: number
  sceneNumber: number
  phase: ExpressPhase
  ok?: boolean
  error?: string
  /** Audio counts when phase === 'audio' && type === 'phase-done'. */
  counts?: SceneAudioCounts
  /** Image URL when phase === 'image' && type === 'phase-done'. */
  imageUrl?: string
  /** Dialogue line index when generating a dialogue storyboard frame. */
  dialogueIndex?: number
  /** Beat index when generating a beat storyboard frame. */
  beatIndex?: number
  /** Beat frame role when phase === 'image' (start default, end for FTV pair). */
  frameRole?: 'start' | 'end'
  /** draft | final tier for storyboardImageTier on the frame. */
  imageTier?: 'draft' | 'final'
  imagePrompt?: string | null
  gcsPath?: string | null
  /** Whether this phase was skipped because output already existed. */
  skipped?: boolean
  /** True when the failure was due to rate limiting after retries were exhausted. */
  rateLimited?: boolean
}

export type ExpressThrottleLane = 'text' | 'image' | 'audio'

export interface ExpressRateLimitedFailure {
  sceneIndex: number
  sceneNumber: number
  phase: 'image' | 'audio'
  beatIndex?: number
  dialogueIndex?: number
  frameRole?: 'start' | 'end'
  error?: string
}

export type ExpressEvent =
  | { type: 'start'; sceneCount: number }
  | { type: 'scene-start'; sceneIndex: number; sceneNumber: number }
  | { type: 'scene-done'; sceneIndex: number; sceneNumber: number; ok: boolean; error?: string }
  | { type: 'preflight-failed'; sceneIndex: number; sceneNumber: number; errors: string[] }
  | { type: 'scene-persisted'; sceneIndex: number; sceneNumber: number }
  | ExpressPhaseEvent
  | {
      type: 'throttle'
      lane: ExpressThrottleLane
      max: number
      cooldownMs?: number
    }
  | {
      type: 'regulator'
      engaged: boolean
      reason?: string
      lanes: Record<ExpressThrottleLane, { max: number; inFlight: number }>
    }
  | {
      type: 'complete'
      successScenes: number
      failedScenes: number
      rateLimitedFailures?: ExpressRateLimitedFailure[]
    }
  | { type: 'error'; error: string }

export interface ExpressPerSceneSummary {
  sceneIndex: number
  sceneNumber: number
  ok: boolean
  error?: string
  phasesRun: ExpressPhase[]
  phasesSkipped: ExpressPhase[]
  phasesFailed: ExpressPhase[]
}

export interface ExpressResult {
  successScenes: number
  failedScenes: number
  perScene: ExpressPerSceneSummary[]
}

/** Callback used by the orchestrator to push SSE events to the client. */
export type ExpressEmit = (event: ExpressEvent) => void
