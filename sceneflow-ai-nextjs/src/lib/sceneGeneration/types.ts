/**
 * Shared types for the Storyboard Express orchestrator and the
 * underlying per-scene generation helpers.
 *
 * The helpers intentionally do NOT touch the database. The orchestrator
 * (or the existing per-scene routes) is responsible for persisting the
 * results to the project metadata.
 */

import type { DetailedSceneDirection } from '../../types/scene-direction'

export type ExpressPhase = 'direction' | 'audio' | 'image'

export interface ExpressOptions {
  /** Project to operate on. */
  projectId: string
  /** Locale for audio generation. Defaults to 'en'. */
  language?: string
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
  /** Optional image quality tier passthrough (e.g. 'draft' | 'standard'). */
  imageQuality?: string
}

export interface SceneDirectionResult {
  sceneDirection: DetailedSceneDirection
}

/**
 * Single audio asset persisted onto the scene.
 */
export interface SceneAudioAsset {
  audioType: 'narration' | 'dialogue' | 'music' | 'sfx'
  /** Index into scene.dialogue (for kind === 'dialogue'). */
  dialogueIndex?: number
  /** Index into scene.sfx (for kind === 'sfx'). */
  sfxIndex?: number
  /** Stable lineId, when available (used for dialogue/narration). */
  lineId?: string
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

export interface SceneAudioResult {
  /** Flat list of generated audio assets to merge back into the scene. */
  assets: SceneAudioAsset[]
  /** Count of each audio type generated. */
  counts: SceneAudioCounts
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
  /** Whether this phase was skipped because output already existed. */
  skipped?: boolean
}

export type ExpressEvent =
  | { type: 'start'; sceneCount: number }
  | { type: 'scene-start'; sceneIndex: number; sceneNumber: number }
  | { type: 'scene-done'; sceneIndex: number; sceneNumber: number; ok: boolean; error?: string }
  | ExpressPhaseEvent
  | { type: 'complete'; successScenes: number; failedScenes: number }
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
