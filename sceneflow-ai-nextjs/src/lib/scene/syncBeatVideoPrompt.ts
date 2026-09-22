/**
 * Keep a beat's stored clip prompt aligned with the video compiler.
 * A hand-edited segment prompt is left alone.
 */

import {
  beatDirectionOwnsVideoPrompt,
  compileBeatVideoPromptFromDirection,
} from '@/lib/scene/beatVideoPromptCompiler'
import { getSceneBeats } from '@/lib/script/beatMigration'
import { parsePersistedMusicCues, resolveBeatMusicCue } from '@/lib/script/sceneMusicCues'
import type { SceneBeat, SceneMusicCue } from '@/lib/script/segmentTypes'
import type { DetailedSceneDirection } from '@/types/scene-direction'

type SegmentPromptRow = {
  beatId?: string
  userEditedPrompt?: string | null
  generatedPrompt?: string
  videoPrompt?: string | null
  dialoguePortion?: { excerpt?: string }
}

export interface SyncBeatVideoPromptOptions {
  artStyleId?: string
  /** When set, every matched beat is recompiled. Otherwise only user, planner, and director writes. */
  allBeats?: boolean
  /** Limit the rewrite to one beat. Music cue lookup still uses the full beat list. */
  onlyBeatId?: string
}

function sceneDirectionOf(scene: Record<string, unknown>): DetailedSceneDirection | null {
  const direction = scene.sceneDirection ?? scene.detailedDirection
  if (!direction || typeof direction !== 'object') return null
  return direction as DetailedSceneDirection
}

function musicCueForBeat(
  scene: Record<string, unknown>,
  beats: SceneBeat[],
  beat: SceneBeat
): SceneMusicCue | undefined {
  const index = beats.findIndex((entry) => entry.beatId === beat.beatId)
  if (index < 0) return undefined
  return resolveBeatMusicCue(parsePersistedMusicCues(scene.sceneMusicCues, beats), index)
}

function refreshSegmentList<T extends SegmentPromptRow>(
  segments: T[],
  beats: SceneBeat[],
  scene: Record<string, unknown>,
  options?: SyncBeatVideoPromptOptions
): T[] | null {
  const sceneDirection = sceneDirectionOf(scene)
  let changed = false
  const next = segments.map((segment) => {
    if (!segment || typeof segment !== 'object') return segment
    if (options?.onlyBeatId && segment.beatId !== options.onlyBeatId) return segment
    const beat = beats.find((entry) => entry.beatId === segment.beatId)
    if (!beat) return segment
    if (!options?.allBeats && !beatDirectionOwnsVideoPrompt(beat)) return segment
    if (typeof segment.userEditedPrompt === 'string' && segment.userEditedPrompt.trim()) {
      return segment
    }
    const excerpt = segment.dialoguePortion?.excerpt?.trim()
    const compiled = compileBeatVideoPromptFromDirection(beat, sceneDirection, {
      ...(options?.artStyleId ? { artStyleId: options.artStyleId } : {}),
      ...(excerpt ? { excerpt } : {}),
      musicCue: musicCueForBeat(scene, beats, beat),
    })
    if (
      segment.generatedPrompt === compiled.prompt &&
      segment.videoPrompt === compiled.prompt
    ) {
      return segment
    }
    changed = true
    return {
      ...segment,
      generatedPrompt: compiled.prompt,
      videoPrompt: compiled.prompt,
    }
  })
  return changed ? next : null
}

/** Rewrite clip prompts on `scene.segments` for one beat after its direction is saved. */
export function refreshSceneSegmentVideoPrompts(
  scene: Record<string, unknown>,
  beat: SceneBeat,
  options?: SyncBeatVideoPromptOptions
): Record<string, unknown> {
  const segments = scene.segments
  if (!Array.isArray(segments)) return scene
  const beats = getSceneBeats(scene)
  const list = beats.some((entry) => entry.beatId === beat.beatId) ? beats : [beat, ...beats]
  const next = refreshSegmentList(segments, list, scene, {
    ...options,
    allBeats: true,
    onlyBeatId: beat.beatId,
  })
  if (!next) return scene
  return { ...scene, segments: next }
}

/**
 * Rewrite production clip prompts for beats whose direction owns the video.
 * Returns null when nothing changed.
 */
export function refreshProductionSegmentVideoPrompts<T extends SegmentPromptRow>(
  segments: T[],
  scene: Record<string, unknown>,
  options?: SyncBeatVideoPromptOptions
): T[] | null {
  const beats = getSceneBeats(scene)
  if (!beats.some(beatDirectionOwnsVideoPrompt)) return null
  return refreshSegmentList(segments, beats, scene, options)
}
