/**
 * Live-audio window for timeline playback.
 *
 * A 22-beat scene builds one dialogue/VO clip plus one SFX clip per beat, plus
 * the score. Creating an HTMLAudioElement with preload='auto' for every clip
 * at mount is the resource cliff between a 15-beat and a 22-beat scene. Keep
 * only the clips that can actually play in the next few seconds.
 */

export const MAX_LIVE_AUDIO_CLIPS = 10
export const AUDIO_WINDOW_LOOKAHEAD_SEC = 8

export interface WindowedClip {
  id: string
  url: string
  startTime: number
  duration: number
  trackType: string
  loop?: boolean
}

/** A clip's URL can change under a stable id, so both belong in the key. */
export function audioClipKey(clip: Pick<WindowedClip, 'id' | 'url'>): string {
  return `${clip.id}:${clip.url}`
}

/** Whether a clip should be playing at the given timeline position. */
export function isClipPlaybackActive(
  clip: Pick<WindowedClip, 'id' | 'startTime' | 'duration' | 'trackType' | 'loop'>,
  elapsed: number,
  sceneDuration: number
): boolean {
  if (elapsed < clip.startTime) return false

  const clipEnd = clip.startTime + clip.duration
  if (clip.loop && clip.trackType === 'music') {
    // Merged scene music: keep looping for the full scene (matches FullscreenPlayer).
    if (clip.id === 'music-scene' || clip.id === 'music') {
      return elapsed < sceneDuration
    }
    // Split runs (disabled beat gap): still respect the run window.
    return elapsed < clipEnd
  }

  return elapsed < clipEnd
}

export interface SelectLiveAudioClipsOptions {
  max?: number
  lookaheadSec?: number
}

/**
 * Clips that need a live element now: playing, looping score, then nearest
 * upcoming. Active and looping music always stay so a playing clip is never
 * torn down; the cap trims the lookahead.
 */
export function selectLiveAudioClips<T extends WindowedClip>(
  clips: readonly T[],
  elapsed: number,
  sceneDuration: number,
  opts?: SelectLiveAudioClipsOptions
): T[] {
  const max = opts?.max ?? MAX_LIVE_AUDIO_CLIPS
  const lookahead = opts?.lookaheadSec ?? AUDIO_WINDOW_LOOKAHEAD_SEC
  const selected: T[] = []
  const seen = new Set<string>()

  const take = (clip: T): void => {
    const key = audioClipKey(clip)
    if (seen.has(key)) return
    seen.add(key)
    selected.push(clip)
  }

  for (const clip of clips) {
    if (isClipPlaybackActive(clip, elapsed, sceneDuration)) take(clip)
  }

  for (const clip of clips) {
    if (clip.loop && clip.trackType === 'music') take(clip)
  }

  const upcoming = clips
    .filter((clip) => clip.startTime > elapsed && clip.startTime <= elapsed + lookahead)
    .sort((a, b) => a.startTime - b.startTime || a.id.localeCompare(b.id))

  for (const clip of upcoming) {
    if (selected.length >= max) break
    take(clip)
  }

  return selected
}
