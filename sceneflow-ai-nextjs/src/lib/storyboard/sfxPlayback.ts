/**
 * Beat-aligned SFX scheduling for storyboard gallery playback.
 */

import type { SceneSfxCue } from '@/lib/script/deriveSfxFromSceneContent'
import { readBeatSfxAudio } from '@/lib/script/deriveSfxFromSceneContent'
import { getSceneBeats, isBeatExcluded } from '@/lib/script/beatMigration'
import type { SceneBeat } from '@/lib/script/segmentTypes'
import type { StoryboardVisualFrame } from '@/lib/storyboard/types'

const DEFAULT_SFX_DURATION_SEC = 3

/** Default on — only explicit true mutes SFX for a beat. */
export function isBeatSfxMuted(beat: SceneBeat | undefined): boolean {
  return beat?.sfxMuted === true
}

export interface BeatAlignedSfxClip {
  id: string
  url: string
  startTime: number
  duration: number
  trackType: 'sfx'
  label?: string
}

function parseCueAtIndex(
  scene: Record<string, unknown>,
  idx: number
): Partial<Pick<SceneSfxCue, 'sourceBeatId' | 'time' | 'description'>> | null {
  const arr = Array.isArray(scene.sfx) ? scene.sfx : []
  if (idx >= arr.length) return null

  const raw = arr[idx]
  if (typeof raw === 'string') {
    const description = raw.trim()
    return description ? { description } : null
  }
  if (raw && typeof raw === 'object') {
    const o = raw as Record<string, unknown>
    const description = String(o.description ?? o.text ?? o.name ?? '').trim()
    return {
      ...(typeof o.sourceBeatId === 'string' ? { sourceBeatId: o.sourceBeatId } : {}),
      ...(typeof o.time === 'number' ? { time: o.time } : {}),
      ...(description ? { description } : {}),
    }
  }
  return null
}

function resolveSfxUrl(entry: unknown): string | undefined {
  if (typeof entry === 'string' && entry.trim()) return entry.trim()
  if (entry && typeof entry === 'object') {
    const url = (entry as { url?: string }).url
    if (typeof url === 'string' && url.trim()) return url.trim()
  }
  return undefined
}

function resolveEntrySourceBeatId(entry: unknown): string | undefined {
  if (entry && typeof entry === 'object') {
    const beatId = (entry as { sourceBeatId?: unknown }).sourceBeatId
    if (typeof beatId === 'string' && beatId.trim()) return beatId.trim()
  }
  return undefined
}

function resolveLegacySpreadStartTime(
  idx: number,
  slotCount: number,
  baseDuration: number
): number {
  return idx * (baseDuration / Math.max(slotCount, 1))
}

function resolveClipDuration(
  idx: number,
  scene: Record<string, unknown>,
  frame: StoryboardVisualFrame | undefined,
  dynamicDurations: Record<string, number>,
  url: string
): number {
  const metaList = Array.isArray(scene.sfxSourceMeta) ? scene.sfxSourceMeta : []
  const meta = metaList[idx] as Record<string, unknown> | null | undefined
  const metaDuration = meta?.clipDurationSeconds
  if (typeof metaDuration === 'number' && metaDuration > 0) {
    return metaDuration
  }

  const probed = dynamicDurations[url]
  if (typeof probed === 'number' && probed > 0) {
    return probed
  }

  if (frame && frame.duration > 0) {
    return frame.duration
  }

  return DEFAULT_SFX_DURATION_SEC
}

/** Cap clip so it cannot ring into the next visual frame. */
export function capDurationToFrameWindow(
  startTime: number,
  duration: number,
  frame: StoryboardVisualFrame | undefined
): number {
  if (!frame || frame.duration <= 0) return duration
  const frameEnd = frame.startTime + frame.duration
  const clipEnd = startTime + duration
  if (clipEnd <= frameEnd) return duration
  return Math.max(0.1, frameEnd - startTime)
}

/** Visual frame whose window contains timeline time `t`. */
export function findFrameContainingTime(
  frames: StoryboardVisualFrame[],
  t: number
): StoryboardVisualFrame | undefined {
  for (const frame of frames) {
    if (frame.duration <= 0) continue
    if (t >= frame.startTime && t < frame.startTime + frame.duration) {
      return frame
    }
  }
  return undefined
}

/**
 * Resolve which beat owns an SFX slot.
 * Order: cue.sourceBeatId → sfxAudio.sourceBeatId → reverse index map from linked cues.
 */
export function resolveSfxSlotBeatId(
  scene: Record<string, unknown>,
  idx: number,
  cue: Partial<Pick<SceneSfxCue, 'sourceBeatId'>> | null,
  entry: unknown,
  beatIdBySfxIndex: Map<number, string>
): string | undefined {
  if (cue?.sourceBeatId?.trim()) return cue.sourceBeatId.trim()
  const fromEntry = resolveEntrySourceBeatId(entry)
  if (fromEntry) return fromEntry
  return beatIdBySfxIndex.get(idx)
}

function buildBeatIdBySfxIndex(scene: Record<string, unknown>): Map<number, string> {
  const map = new Map<number, string>()
  const sfxArray = Array.isArray(scene.sfxAudio) ? scene.sfxAudio : []
  const slotCount = Math.max(
    sfxArray.length,
    Array.isArray(scene.sfx) ? scene.sfx.length : 0
  )

  for (let idx = 0; idx < slotCount; idx++) {
    const cue = parseCueAtIndex(scene, idx)
    if (cue?.sourceBeatId?.trim()) {
      map.set(idx, cue.sourceBeatId.trim())
      continue
    }
    const fromEntry = resolveEntrySourceBeatId(sfxArray[idx])
    if (fromEntry) map.set(idx, fromEntry)
  }

  return map
}

/**
 * Schedule SFX clips aligned to beat visual frames when cues carry sourceBeatId.
 * Legacy cues without beat linkage keep positional even-spread fallback, but still
 * respect sfxMuted (via resolved beat or containing frame) and duration caps.
 */
export function buildBeatAlignedStoryboardSfxClips(
  scene: Record<string, unknown>,
  visualFrames: StoryboardVisualFrame[],
  options?: {
    voiceEndTime?: number
    sceneDuration?: number
    dynamicDurations?: Record<string, number>
  }
): BeatAlignedSfxClip[] {
  const sfxArray = Array.isArray(scene.sfxAudio) ? scene.sfxAudio : []
  const sfxDefs = Array.isArray(scene.sfx) ? scene.sfx : []
  const slotCount = Math.max(sfxArray.length, sfxDefs.length)
  if (slotCount === 0) return []

  const dynamicDurations = options?.dynamicDurations ?? {}
  const baseDuration =
    options?.voiceEndTime ??
    options?.sceneDuration ??
    (visualFrames.length > 0
      ? visualFrames[visualFrames.length - 1].startTime +
        visualFrames[visualFrames.length - 1].duration
      : 5)

  const frameByBeatId = new Map(
    visualFrames
      .filter((frame) => frame.beatId)
      .map((frame) => [frame.beatId!, frame])
  )

  const excludedBeatIds = new Set(
    getSceneBeats(scene)
      .filter((beat) => isBeatExcluded(beat))
      .map((beat) => beat.beatId)
  )

  const beatById = new Map(getSceneBeats(scene).map((beat) => [beat.beatId, beat]))
  const beatIdBySfxIndex = buildBeatIdBySfxIndex(scene)

  const clips: BeatAlignedSfxClip[] = []

  for (let idx = 0; idx < slotCount; idx++) {
    const entry = sfxArray[idx]
    const cue = parseCueAtIndex(scene, idx)
    const url =
      resolveSfxUrl(entry) ||
      readBeatSfxAudio(scene, {
        sfxIndex: idx,
        sourceBeatId: cue?.sourceBeatId ?? '',
      })
    if (!url) continue

    const beatId = resolveSfxSlotBeatId(scene, idx, cue, entry, beatIdBySfxIndex)
    if (beatId && excludedBeatIds.has(beatId)) continue
    if (beatId && isBeatSfxMuted(beatById.get(beatId))) continue

    let frame = beatId ? frameByBeatId.get(beatId) : undefined

    let startTime: number
    if (
      entry &&
      typeof entry === 'object' &&
      typeof (entry as { startTime?: number }).startTime === 'number'
    ) {
      startTime = (entry as { startTime: number }).startTime
    } else if (frame) {
      startTime = frame.startTime
    } else if (typeof cue?.time === 'number') {
      startTime = cue.time
    } else {
      startTime = resolveLegacySpreadStartTime(idx, Math.max(sfxArray.length, 1), baseDuration)
    }

    // Unlinked cues that still land inside a muted beat's visual window.
    const containing = findFrameContainingTime(visualFrames, startTime)
    if (containing?.beatId && isBeatSfxMuted(beatById.get(containing.beatId))) {
      continue
    }
    if (!frame && containing) {
      frame = containing
    }

    let duration = resolveClipDuration(idx, scene, frame, dynamicDurations, url)
    if (
      entry != null &&
      typeof entry === 'object' &&
      typeof (entry as { duration?: number }).duration === 'number' &&
      (entry as { duration: number }).duration > 0
    ) {
      duration = (entry as { duration: number }).duration
    }
    duration = capDurationToFrameWindow(startTime, duration, frame)

    const id = beatId ? `sfx-beat-${beatId}` : `sfx-${idx}`
    const label =
      cue?.description?.slice(0, 48) ||
      (entry != null &&
        typeof entry === 'object' &&
        (entry as { description?: string }).description) ||
      `Sound Effect ${idx + 1}`

    clips.push({
      id,
      url,
      startTime,
      duration,
      trackType: 'sfx',
      label,
    })
  }

  return clips
}
