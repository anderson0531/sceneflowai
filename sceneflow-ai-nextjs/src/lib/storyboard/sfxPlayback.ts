/**
 * Beat-aligned SFX scheduling for storyboard gallery playback.
 */

import type { SceneSfxCue } from '@/lib/script/deriveSfxFromSceneContent'
import { getSceneBeats, isBeatExcluded } from '@/lib/script/beatMigration'
import type { StoryboardVisualFrame } from '@/lib/storyboard/types'

const DEFAULT_SFX_DURATION_SEC = 3

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
): Pick<SceneSfxCue, 'sourceBeatId' | 'time' | 'description'> | null {
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
      sourceBeatId: typeof o.sourceBeatId === 'string' ? o.sourceBeatId : undefined,
      time: typeof o.time === 'number' ? o.time : undefined,
      description: description || undefined,
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

function capDurationToFrameWindow(
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

/**
 * Schedule SFX clips aligned to beat visual frames when cues carry sourceBeatId.
 * Legacy cues without beat linkage keep positional even-spread fallback.
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
  const sfxArray = scene.sfxAudio
  if (!Array.isArray(sfxArray) || sfxArray.length === 0) return []

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

  const clips: BeatAlignedSfxClip[] = []

  sfxArray.forEach((entry, idx) => {
    const url = resolveSfxUrl(entry)
    if (!url) return

    const cue = parseCueAtIndex(scene, idx)
    const beatId = cue?.sourceBeatId
    if (beatId && excludedBeatIds.has(beatId)) return

    const frame = beatId ? frameByBeatId.get(beatId) : undefined

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
      startTime = resolveLegacySpreadStartTime(idx, sfxArray.length, baseDuration)
    }

    let duration = resolveClipDuration(idx, scene, frame, dynamicDurations, url)
    if (typeof entry === 'object' && typeof entry.duration === 'number' && entry.duration > 0) {
      duration = entry.duration
    }
    duration = capDurationToFrameWindow(startTime, duration, frame)

    const id = beatId ? `sfx-beat-${beatId}` : `sfx-${idx}`
    const label =
      cue?.description?.slice(0, 48) ||
      (typeof entry === 'object' && (entry as { description?: string }).description) ||
      `Sound Effect ${idx + 1}`

    clips.push({
      id,
      url,
      startTime,
      duration,
      trackType: 'sfx',
      label,
    })
  })

  return clips
}
