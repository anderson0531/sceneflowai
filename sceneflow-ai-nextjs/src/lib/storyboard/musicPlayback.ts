/**
 * Beat-aligned background music scheduling for storyboard gallery playback.
 */

import { getSceneBeats } from '@/lib/script/beatMigration'
import type { SceneBeat, SceneMusicCue } from '@/lib/script/segmentTypes'
import { isMusicCueScored, parsePersistedMusicCues } from '@/lib/script/sceneMusicCues'
import type { StoryboardVisualFrame } from '@/lib/storyboard/types'

/** Fallback only when the file length was never measured or stored. */
export const DEFAULT_MUSIC_FILE_DURATION_SEC = 30

export interface BeatAlignedMusicClip {
  id: string
  url: string
  startTime: number
  duration: number
  trimStart?: number
  /** Scene timeline time when intro fade begins (earliest music-enabled beat). */
  fadeAnchorTime?: number
  trackType: 'music'
  label?: string
  loop?: boolean
}

export interface BuildBeatAlignedMusicClipsOptions {
  musicUrl: string
  sceneDuration: number
  /** Known music file length — used to wrap scene timeline offsets. Defaults to 30s. */
  musicFileDuration?: number
  /** Scored cues, each supplying its own track for the beats it covers. */
  cues?: SceneMusicCue[]
  /** Probed durations keyed by audio URL, preferred over a cue's stored length. */
  dynamicDurations?: Record<string, number>
}

/** Default off — only explicit true enables music for a beat. */
export function isBeatMusicEnabled(beat: SceneBeat | undefined): boolean {
  return beat?.musicEnabled === true
}

/**
 * Whether a beat a scored cue covers plays that cue.
 *
 * `musicEnabled` is tri-state in practice: unset means nobody has decided,
 * false means the user switched this beat off. Placing a cue over a beat is
 * itself the decision to score it, so only an explicit false opts out —
 * otherwise a scene whose cues were scored before `applySceneMusicCues` ever
 * stamped the flags plays silent with a finished track sitting on it.
 */
export function isCuedBeatMusicEnabled(beat: SceneBeat | undefined): boolean {
  return beat?.musicEnabled !== false
}

/** Wrap a scene timeline offset into the music file duration. */
export function resolveMusicTrimStart(
  sceneTimelineOffset: number,
  musicFileDuration: number = DEFAULT_MUSIC_FILE_DURATION_SEC
): number {
  if (musicFileDuration <= 0) return Math.max(0, sceneTimelineOffset)
  return sceneTimelineOffset % musicFileDuration
}

function resolveSceneMusicUrl(scene: Record<string, unknown>): string | undefined {
  const url =
    (typeof scene.musicAudio === 'string' && scene.musicAudio.trim()) ||
    (scene.music as { url?: string } | undefined)?.url?.trim()
  return url || undefined
}

const CONTIGUOUS_FRAME_TOLERANCE_SEC = 0.05

/** Group music-enabled frames into contiguous timeline runs (gaps = disabled beats). */
export function groupContiguousMusicFrames(
  frames: StoryboardVisualFrame[]
): StoryboardVisualFrame[][] {
  if (frames.length === 0) return []

  const sorted = [...frames].sort((a, b) => a.startTime - b.startTime)
  const groups: StoryboardVisualFrame[][] = []
  let current = [sorted[0]]

  for (let i = 1; i < sorted.length; i++) {
    const prev = current[current.length - 1]
    const next = sorted[i]
    const prevEnd = prev.startTime + prev.duration
    if (next.startTime <= prevEnd + CONTIGUOUS_FRAME_TOLERANCE_SEC) {
      current.push(next)
    } else {
      groups.push(current)
      current = [next]
    }
  }
  groups.push(current)
  return groups
}

/** Cue tracks are written for their own stretch, so they play from the top. */
function resolveCueFileDuration(
  cue: SceneMusicCue,
  dynamicDurations: Record<string, number>
): number {
  const probed = cue.url ? dynamicDurations[cue.url] : undefined
  if (typeof probed === 'number' && probed > 0) return probed
  if (cue.fileDuration && cue.fileDuration > 0) return cue.fileDuration
  return DEFAULT_MUSIC_FILE_DURATION_SEC
}

/**
 * Schedule background music aligned to beat visual frames when the scene has beats.
 * Legacy scenes without beats use one full-scene looping clip.
 *
 * A scene's cues each bring their own track for the beats they score, and
 * `musicEnabled` remains the gate on top: a beat the user switched off inside
 * a cue drops out of it, splitting the cue into the runs that survive. Beats
 * switched on outside every cue fall back to the scene's own track, so the
 * per-beat toggle is never a dead switch.
 */
export function buildBeatAlignedMusicClips(
  scene: Record<string, unknown>,
  visualFrames: StoryboardVisualFrame[],
  options: BuildBeatAlignedMusicClipsOptions
): BeatAlignedMusicClip[] {
  const { musicUrl, sceneDuration } = options
  const musicFileDuration = options.musicFileDuration ?? DEFAULT_MUSIC_FILE_DURATION_SEC
  const dynamicDurations = options.dynamicDurations ?? {}
  const cues = (options.cues ?? []).filter(isMusicCueScored)
  if (!musicUrl.trim() && cues.length === 0) return []

  const beats = getSceneBeats(scene)
  if (beats.length === 0) {
    if (!musicUrl.trim()) return []
    return [
      {
        id: 'music',
        url: musicUrl.trim(),
        startTime: 0,
        duration: sceneDuration,
        trackType: 'music',
        label: 'Background Music',
        loop: sceneDuration > musicFileDuration,
      },
    ]
  }

  const beatById = new Map(beats.map((beat) => [beat.beatId, beat]))
  const indexByBeatId = new Map(beats.map((beat, index) => [beat.beatId, index]))
  const clips: BeatAlignedMusicClip[] = []

  const eligibleFrames = visualFrames.filter(
    (frame) => frame.beatId && frame.duration > 0 && beatById.has(frame.beatId)
  )

  const claimed = new Set<StoryboardVisualFrame>()

  for (const cue of cues) {
    const cueFrames = eligibleFrames.filter((frame) => {
      const index = indexByBeatId.get(frame.beatId as string)
      if (index === undefined || index < cue.beatStart || index > cue.beatEnd) return false
      return isCuedBeatMusicEnabled(beatById.get(frame.beatId as string))
    })
    if (cueFrames.length === 0) continue

    const cueFileDuration = resolveCueFileDuration(cue, dynamicDurations)
    // Every run of a cue restarts its own track, and the fade is anchored to
    // where the cue first sounds rather than to the scene.
    const fadeAnchorTime = Math.min(...cueFrames.map((frame) => frame.startTime))

    for (const run of groupContiguousMusicFrames(cueFrames)) {
      const first = run[0]
      const last = run[run.length - 1]
      const startTime = first.startTime
      const duration = last.startTime + last.duration - startTime

      clips.push({
        id: `music-${cue.cueId}-${first.beatId}`,
        url: (cue.url as string).trim(),
        startTime,
        duration,
        trimStart: 0,
        fadeAnchorTime,
        trackType: 'music',
        label: cue.intent?.trim() || 'Background Music',
        loop: duration > cueFileDuration,
      })
    }

    for (const frame of cueFrames) claimed.add(frame)
  }

  // Outside every cue the flag stays an explicit opt-in: the scene's own track
  // only plays where the user asked for it.
  const looseFrames = eligibleFrames.filter(
    (frame) => !claimed.has(frame) && isBeatMusicEnabled(beatById.get(frame.beatId as string))
  )
  if (looseFrames.length > 0 && musicUrl.trim()) {
    const fadeAnchorTime = Math.min(...looseFrames.map((frame) => frame.startTime))
    const coversWholeScene =
      cues.length === 0 && looseFrames.length === eligibleFrames.length

    for (const run of groupContiguousMusicFrames(looseFrames)) {
      const first = run[0]
      const last = run[run.length - 1]
      const startTime = first.startTime
      const duration = last.startTime + last.duration - startTime

      clips.push({
        id: coversWholeScene ? 'music-scene' : `music-${first.beatId}`,
        url: musicUrl.trim(),
        startTime,
        duration,
        trimStart: resolveMusicTrimStart(startTime, musicFileDuration),
        fadeAnchorTime,
        trackType: 'music',
        label: 'Background Music',
        loop: duration > musicFileDuration,
      })
    }
  }

  return clips.sort((a, b) => a.startTime - b.startTime)
}

/** The scene's scored cues, if any, normalized against its beats. */
export function resolveSceneMusicCues(
  scene: Record<string, unknown> | null | undefined
): SceneMusicCue[] {
  if (!scene) return []
  return parsePersistedMusicCues(scene.sceneMusicCues, getSceneBeats(scene)).filter(
    isMusicCueScored
  )
}

/**
 * Every music file the scene can play, so callers can probe their real lengths
 * before building the timeline.
 */
export function collectSceneMusicUrls(
  scene: Record<string, unknown> | null | undefined
): string[] {
  if (!scene) return []
  const urls = resolveSceneMusicCues(scene).map((cue) => (cue.url as string).trim())
  const sceneUrl = resolveSceneMusicUrl(scene)
  if (sceneUrl) urls.push(sceneUrl)
  return [...new Set(urls.filter(Boolean))]
}

/** Resolve music URL from scene and build beat-aligned clips (convenience wrapper). */
export function buildStoryboardMusicClips(
  scene: Record<string, unknown>,
  visualFrames: StoryboardVisualFrame[],
  sceneDuration: number,
  musicFileDuration?: number,
  dynamicDurations?: Record<string, number>
): BeatAlignedMusicClip[] {
  const musicUrl = resolveSceneMusicUrl(scene)
  const cues = resolveSceneMusicCues(scene)
  if (!musicUrl && cues.length === 0) return []
  return buildBeatAlignedMusicClips(scene, visualFrames, {
    musicUrl: musicUrl ?? '',
    sceneDuration,
    musicFileDuration,
    cues,
    dynamicDurations,
  })
}

export function resolveSceneMusicFileDuration(
  scene: Record<string, unknown>,
  dynamicDurations: Record<string, number> = {}
): number {
  const musicUrl = resolveSceneMusicUrl(scene)
  if (!musicUrl) return DEFAULT_MUSIC_FILE_DURATION_SEC

  const probed = dynamicDurations[musicUrl]
  if (typeof probed === 'number' && probed > 0) return probed

  // Play length (`musicDuration`) is how long the mixer holds the track, not
  // how long the file is. Using it here made a 90s scene over a 30s clip look
  // like it already covered the scene.
  const stored = scene.musicFileDuration
  if (typeof stored === 'number' && stored > 0) return stored

  return DEFAULT_MUSIC_FILE_DURATION_SEC
}
