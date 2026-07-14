/**
 * Build scene dub render payloads for stream localization (per-language).
 * Mirrors SceneProductionMixer server-render semantics.
 */

import { buildAudioTracksWithBaselineTiming } from '@/components/vision/scene-production/audioTrackBuilder'
import type {
  ProductionStream,
  SceneProductionData,
  SceneSegment,
} from '@/components/vision/scene-production/types'
import { getNextProductionStreamVersion } from '@/components/vision/scene-production/defaults'
import { resolveSegmentEmbedAudioForRender } from '@/lib/scene/segmentAudioPreview'
import type { CreateSceneRenderJobRequest } from '@/lib/video/renderTypes'
import type { StreamStemMode } from '@/lib/streams/projectStreams'

const SEGMENT_PLAYBACK_OFFSET_SEC = 1.0

export function clampStreamLocalizeSpeed(speed: number): number {
  if (!Number.isFinite(speed)) return 1
  return Math.min(1.5, Math.max(0.5, speed))
}

export interface BuildSceneDubRenderRequestArgs {
  projectId: string
  sceneId: string
  sceneNumber: number
  scriptScene: Record<string, unknown>
  sceneProduction: SceneProductionData
  language: string
  speed: number
  stemMode: StreamStemMode
  lipsyncedVideoBySegment?: Record<string, string>
  resolution?: '720p' | '1080p' | '4K'
}

function videoSegmentsForRender(sceneProduction: SceneProductionData): SceneSegment[] {
  return (sceneProduction.segments || []).filter(
    (seg) =>
      seg.status === 'COMPLETE' &&
      !!seg.activeAssetUrl &&
      (seg.assetType === 'video' || !seg.assetType) &&
      seg.mixerBeatIncluded !== false
  )
}

function segmentDurationSec(seg: SceneSegment): number {
  const span = Math.max(0, (seg.endTime ?? 0) - (seg.startTime ?? 0))
  if (span > 0) return span
  return Math.max(3, seg.actualVideoDuration ?? 8)
}

function dialogueClipConfigKey(clip: { id?: string; lineId?: string }, idx: number): string {
  return clip.id || clip.lineId || `dialogue-${idx}`
}

/**
 * Build POST body for `/api/scene/[sceneId]/render` for a dubbed language stream.
 */
export function buildSceneDubRenderRequest({
  projectId,
  sceneId,
  sceneNumber,
  scriptScene,
  sceneProduction,
  language,
  speed,
  stemMode,
  lipsyncedVideoBySegment = {},
  resolution = '1080p',
}: BuildSceneDubRenderRequestArgs): CreateSceneRenderJobRequest | null {
  const segments = videoSegmentsForRender(sceneProduction)
  if (segments.length === 0) return null

  const playbackRate = clampStreamLocalizeSpeed(speed)
  const useStemDubbingPolicy = stemMode === 'keep-background' && language !== 'en'
  const includeSpeechStem = false
  const masterSegmentVolume = 0.8

  const audioTracksV2 = buildAudioTracksWithBaselineTiming(
    scriptScene,
    language,
    'en',
    {
      packDialogueToSegmentTimeline: true,
      segmentPlaybackOffsetSeconds: SEGMENT_PLAYBACK_OFFSET_SEC,
    }
  )

  const segmentData = segments.map((seg) => {
    const embedAudio = resolveSegmentEmbedAudioForRender(
      { includeAudio: true, volume: 1 },
      masterSegmentVolume,
      {
        useStemDubbingPolicy,
        includeSpeechStem,
        hasBackgroundStem: !!seg.stemSeparation?.backgroundStemUrl,
      }
    )
    const dur = segmentDurationSec(seg)
    return {
      segmentId: seg.segmentId,
      sequenceIndex: seg.sequenceIndex,
      videoUrl: lipsyncedVideoBySegment[seg.segmentId] || seg.activeAssetUrl!,
      startTime: seg.startTime ?? 0,
      endTime: (seg.startTime ?? 0) + dur,
      audioSource: embedAudio.audioSource,
      audioVolume: embedAudio.audioVolume,
      pauseDuration: 0,
    }
  })

  const totalDuration = segmentData.reduce(
    (sum, s) => sum + Math.max(0, s.endTime - s.startTime),
    0
  )

  const audioTracksPayload: CreateSceneRenderJobRequest['audioTracks'] = {}

  if (audioTracksV2.dialogue.length > 0) {
    audioTracksPayload.dialogue = audioTracksV2.dialogue
      .filter((d) => d.url)
      .map((d, i) => ({
        url: d.url!,
        startTime: d.startTime,
        duration: d.duration,
        character: d.characterName,
        playbackRate,
      }))
  }

  if (!useStemDubbingPolicy && audioTracksV2.sfx.length > 0) {
    audioTracksPayload.sfx = audioTracksV2.sfx
      .filter((s) => s.url)
      .map((s) => ({
        url: s.url!,
        startTime: s.startTime,
        duration: s.duration,
        volume: s.volume ?? 0.6,
      }))
  }

  if (audioTracksV2.music?.url) {
    audioTracksPayload.music = [
      {
        url: audioTracksV2.music.url,
        startTime: audioTracksV2.music.startTime,
        duration: audioTracksV2.music.duration || totalDuration,
        loop: true,
      },
    ]
  }

  if (useStemDubbingPolicy) {
    const stemClips = segments
      .filter((seg) => !!seg.stemSeparation?.backgroundStemUrl)
      .map((seg) => ({
        url: seg.stemSeparation!.backgroundStemUrl!,
        startTime: seg.startTime ?? 0,
        duration: segmentDurationSec(seg),
        volume: 1,
      }))
    if (stemClips.length > 0) {
      audioTracksPayload.sfx = [...(audioTracksPayload.sfx || []), ...stemClips]
    }
  }

  const hasDialogue = (audioTracksPayload.dialogue?.length ?? 0) > 0
  const hasSfx = (audioTracksPayload.sfx?.length ?? 0) > 0
  const hasMusic = (audioTracksPayload.music?.length ?? 0) > 0

  return {
    projectId,
    sceneId,
    sceneNumber,
    resolution,
    audioConfig: {
      includeNarration: false,
      includeDialogue: hasDialogue,
      includeMusic: hasMusic,
      includeSfx: hasSfx,
      includeSegmentAudio: useStemDubbingPolicy
        ? segments.some((s) => !!s.stemSeparation?.backgroundStemUrl)
        : false,
      language,
      narrationVolume: 0,
      dialogueVolume: 0.9,
      musicVolume: 0.4,
      sfxVolume: 0.6,
      segmentAudioVolume: masterSegmentVolume,
    },
    segments: segmentData,
    audioTracks: audioTracksPayload,
  }
}

export function appendLocalizedProductionStream(
  existing: ProductionStream[],
  language: string,
  mp4Url: string,
  durationSeconds?: number
): ProductionStream[] {
  const v = getNextProductionStreamVersion(existing, language, 'video')
  const id = `stream-video-${language}-v${v}-${Date.now()}`
  return [
    ...existing,
    {
      id,
      language,
      languageLabel: language,
      status: 'complete' as const,
      streamType: 'video' as const,
      streamVersion: v,
      mp4Url,
      completedAt: new Date().toISOString(),
      duration:
        typeof durationSeconds === 'number' && durationSeconds > 0
          ? durationSeconds
          : undefined,
    },
  ]
}

export interface ScriptSceneRef {
  sceneId: string
  sceneNumber: number
  scene: Record<string, unknown>
}

export function readScriptScenesFromProject(script: unknown): ScriptSceneRef[] {
  const candidates: unknown[] = [
    (script as { script?: { scenes?: unknown } } | null)?.script?.scenes,
    (script as { scenes?: unknown } | null)?.scenes,
  ]
  let scenes: unknown[] = []
  for (const c of candidates) {
    if (Array.isArray(c) && c.length > 0) {
      scenes = c
      break
    }
  }
  return scenes.map((raw, index) => {
    const scene = raw as Record<string, unknown>
    const sceneId =
      (typeof scene.id === 'string' && scene.id) ||
      (typeof scene.sceneId === 'string' && scene.sceneId) ||
      `scene-${index}`
    const sceneNumber =
      typeof scene.sceneNumber === 'number' ? scene.sceneNumber : index + 1
    return { sceneId, sceneNumber, scene }
  })
}

/** Map dialogue clip URL to the segment whose timeline contains the clip start. */
export function mapDialogueUrlToSegment(
  segments: SceneSegment[],
  dialogueClips: Array<{ url?: string | null; startTime: number }>
): Map<string, string> {
  const out = new Map<string, string>()
  for (const seg of segments) {
    const segStart = seg.startTime ?? 0
    const segEnd = seg.endTime ?? segStart + segmentDurationSec(seg)
    const clip = dialogueClips.find(
      (c) => c.url && c.startTime >= segStart && c.startTime < segEnd
    )
    if (clip?.url) {
      out.set(seg.segmentId, clip.url)
    }
  }
  return out
}

export function collectLipsyncSegmentInputs(
  scriptScene: Record<string, unknown>,
  sceneProduction: SceneProductionData,
  language: string
): Array<{ segmentId: string; videoUrl: string; dialogueAudioUrl?: string; audioDurationSeconds?: number }> {
  const segments = videoSegmentsForRender(sceneProduction)
  const tracks = buildAudioTracksWithBaselineTiming(scriptScene, language, 'en', {
    packDialogueToSegmentTimeline: true,
    segmentPlaybackOffsetSeconds: SEGMENT_PLAYBACK_OFFSET_SEC,
  })
  const dialogueBySegment = mapDialogueUrlToSegment(segments, tracks.dialogue)

  return segments
    .filter((seg) => dialogueBySegment.has(seg.segmentId))
    .map((seg) => {
      const dialogueUrl = dialogueBySegment.get(seg.segmentId)!
      const clip = tracks.dialogue.find((d) => d.url === dialogueUrl)
      const rawDur = clip?.actualDuration ?? clip?.duration ?? segmentDurationSec(seg)
      const audioDurationSeconds = rawDur
      return {
        segmentId: seg.segmentId,
        videoUrl: seg.activeAssetUrl!,
        dialogueAudioUrl: dialogueUrl,
        audioDurationSeconds,
      }
    })
}
