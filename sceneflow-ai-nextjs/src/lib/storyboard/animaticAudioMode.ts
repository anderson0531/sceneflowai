import type { BeatAlignedSfxClip } from '@/lib/storyboard/sfxPlayback'
import type { StoryboardAudioClip, StoryboardVisualFrame } from '@/lib/storyboard/types'

export type AnimaticAudioMode = 'lofi' | 'hifi'

export const ANIMATIC_AUDIO_MODE_STORAGE_KEY = 'sceneflow-animatic-audio-mode'
export const SHOT_CLIP_AUDIO_CACHE_KEY = 'sceneflow-shot-clip-audio'

export interface ShotClipAudioCacheEntry {
  audioUrl: string
  sourceUrl: string
}

export type ShotClipAudioCache = Record<string, ShotClipAudioCacheEntry>

export interface ShotClipSegment {
  beatId?: string
  segmentId?: string
  activeAssetUrl?: string | null
  assetType?: string
  status?: string
  clipAudioUrl?: string
  clipAudioSourceUrl?: string
  videoChain?: { partIndex?: number; chainMethod?: string }
}

export function readAnimaticAudioMode(): AnimaticAudioMode {
  if (typeof window === 'undefined') return 'lofi'
  return window.sessionStorage.getItem(ANIMATIC_AUDIO_MODE_STORAGE_KEY) === 'hifi' ? 'hifi' : 'lofi'
}

export function writeAnimaticAudioMode(mode: AnimaticAudioMode): void {
  if (typeof window === 'undefined') return
  window.sessionStorage.setItem(ANIMATIC_AUDIO_MODE_STORAGE_KEY, mode)
}

export function readShotClipAudioCache(): ShotClipAudioCache {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.sessionStorage.getItem(SHOT_CLIP_AUDIO_CACHE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as ShotClipAudioCache
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function writeShotClipAudioCache(cache: ShotClipAudioCache): void {
  if (typeof window === 'undefined') return
  window.sessionStorage.setItem(SHOT_CLIP_AUDIO_CACHE_KEY, JSON.stringify(cache))
}

function segmentVideoUrl(segment: ShotClipSegment): string {
  const url = typeof segment.activeAssetUrl === 'string' ? segment.activeAssetUrl.trim() : ''
  if (!url) return ''
  if (segment.assetType === 'image') return ''
  return url
}

function preferInitialClip(segments: ShotClipSegment[]): ShotClipSegment | undefined {
  const withVideo = segments.filter((segment) => segmentVideoUrl(segment))
  return (
    withVideo.find(
      (segment) =>
        !segment.videoChain ||
        segment.videoChain.partIndex === 0 ||
        segment.videoChain.chainMethod === 'initial'
    ) ?? withVideo[0]
  )
}

export function resolveShotClipAudioUrl(
  segment: ShotClipSegment,
  cache: ShotClipAudioCache
): string | undefined {
  const videoUrl = segmentVideoUrl(segment)
  if (!videoUrl) return undefined
  if (
    segment.clipAudioUrl &&
    (!segment.clipAudioSourceUrl || segment.clipAudioSourceUrl === videoUrl)
  ) {
    return segment.clipAudioUrl
  }
  const beatId = segment.beatId?.trim()
  const cached = beatId ? cache[beatId] : undefined
  if (cached?.audioUrl && cached.sourceUrl === videoUrl) return cached.audioUrl
  return undefined
}

export function collectClipAudioByBeat(
  segments: ShotClipSegment[] | undefined,
  cache: ShotClipAudioCache = {}
): Record<string, string> {
  const grouped = new Map<string, ShotClipSegment[]>()
  for (const segment of segments ?? []) {
    const beatId = segment.beatId?.trim()
    if (!beatId) continue
    const list = grouped.get(beatId) ?? []
    list.push(segment)
    grouped.set(beatId, list)
  }

  const audioByBeat: Record<string, string> = {}
  for (const [beatId, group] of grouped) {
    const chosen = preferInitialClip(group)
    if (!chosen) continue
    const audioUrl = resolveShotClipAudioUrl(chosen, cache)
    if (audioUrl) audioByBeat[beatId] = audioUrl
  }
  return audioByBeat
}

export interface ShotClipPendingExtract {
  beatId: string
  videoUrl: string
  segmentId?: string
}

export function collectProjectClipAudio(
  scenes: Array<Record<string, unknown>>,
  production: Record<string, { segments?: ShotClipSegment[] }> | undefined,
  cache: ShotClipAudioCache = {}
): Record<string, string> {
  const merged: Record<string, string> = {}
  scenes.forEach((scene, index) => {
    const sceneId = String(scene.id || scene.sceneId || `scene-${index}`)
    const byBeat = collectClipAudioByBeat(production?.[sceneId]?.segments, cache)
    for (const [beatId, audioUrl] of Object.entries(byBeat)) {
      merged[`${index}:${beatId}`] = audioUrl
    }
  })
  return merged
}

export function listShotClipsNeedingExtract(
  segments: ShotClipSegment[] | undefined,
  cache: ShotClipAudioCache = {}
): ShotClipPendingExtract[] {
  const grouped = new Map<string, ShotClipSegment[]>()
  for (const segment of segments ?? []) {
    const beatId = segment.beatId?.trim()
    if (!beatId) continue
    const list = grouped.get(beatId) ?? []
    list.push(segment)
    grouped.set(beatId, list)
  }

  const pending: ShotClipPendingExtract[] = []
  for (const [beatId, group] of grouped) {
    const chosen = preferInitialClip(group)
    if (!chosen) continue
    if (resolveShotClipAudioUrl(chosen, cache)) continue
    pending.push({
      beatId,
      videoUrl: segmentVideoUrl(chosen),
      segmentId: chosen.segmentId,
    })
  }
  return pending
}

export interface HifiClipAudioInput {
  voiceClips: StoryboardAudioClip[]
  sfxClips: BeatAlignedSfxClip[]
  visualFrames: StoryboardVisualFrame[]
  beats: Array<{ beatId: string; kind: string }>
  clipAudioByBeatId: Record<string, string>
}

export interface HifiClipAudioResult {
  voiceClips: StoryboardAudioClip[]
  sfxClips: BeatAlignedSfxClip[]
}

/**
 * HIFI replaces dialogue TTS and effect beds with the shot clip's audio.
 * Narration and any shot that has no clip keep the LOFI bed.
 */
export function applyHifiClipAudio(input: HifiClipAudioInput): HifiClipAudioResult {
  const kindByBeat = new Map(input.beats.map((beat) => [beat.beatId, beat.kind]))
  const frameByBeat = new Map(
    input.visualFrames.filter((frame) => frame.beatId).map((frame) => [frame.beatId!, frame])
  )
  const replaced = new Set<string>()

  for (const [beatId, audioUrl] of Object.entries(input.clipAudioByBeatId)) {
    if (!audioUrl.trim()) continue
    const kind = kindByBeat.get(beatId)
    if (!kind || kind === 'narration') continue
    if (!frameByBeat.has(beatId)) continue
    replaced.add(beatId)
  }

  if (replaced.size === 0) {
    return { voiceClips: input.voiceClips, sfxClips: input.sfxClips }
  }

  const voiceClips = input.voiceClips.filter((clip) => {
    if (!clip.beatId || !replaced.has(clip.beatId)) return true
    return kindByBeat.get(clip.beatId) === 'narration'
  })

  const sfxClips = input.sfxClips.filter((clip) => !clip.beatId || !replaced.has(clip.beatId))

  for (const beatId of replaced) {
    const frame = frameByBeat.get(beatId)
    const audioUrl = input.clipAudioByBeatId[beatId]
    if (!frame || !audioUrl) continue
    const kind = kindByBeat.get(beatId)
    if (kind === 'dialogue') {
      voiceClips.push({
        id: `shot-audio-${beatId}`,
        url: audioUrl,
        startTime: frame.startTime,
        duration: frame.duration,
        type: 'dialogue',
        label: 'Shot audio',
        beatId,
      })
    } else {
      sfxClips.push({
        id: `shot-audio-${beatId}`,
        url: audioUrl,
        startTime: frame.startTime,
        duration: frame.duration,
        trackType: 'sfx',
        label: 'Shot audio',
        beatId,
      })
    }
  }

  voiceClips.sort((a, b) => a.startTime - b.startTime)
  sfxClips.sort((a, b) => a.startTime - b.startTime)
  return { voiceClips, sfxClips }
}
