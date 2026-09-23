'use client'

import React, { useCallback, useMemo, useState } from 'react'
import { coerceSceneSfxFlatArray } from '@/lib/script/segmentScript'
import { listIncludedBeatVideos } from '@/lib/scene/mixerBeatInclude'
import { resolveMixerMusicClips } from '@/lib/scene/mixerScoreMusic'
import {
  buildSegmentAudioConfigsForSegments,
  mergeMixerSettingsForLanguage,
} from '@/lib/scene/mixerSettings'
import {
  clipMatchesDialogueLineId,
  computePlaybackSegmentDuration,
  computeSegmentContentDuration,
  MIXER_DIALOGUE_INTRA_GAP_SEC,
} from '@/lib/scene/mixerTiming'
import { resolveVideoTrimWindow } from '@/lib/video/segmentVideoTrim'
import { DEFAULT_MUSIC_FILE_DURATION_SEC } from '@/lib/storyboard/musicPlayback'
import {
  getResolvedDialogueClipsForScene,
  inferNarrationTimelinePrefixCount,
} from './audioTrackBuilder'
import { ScenePreviewPlayer } from './ScenePreviewPlayer'
import type { SceneProductionData, SceneSegment, TextOverlay } from './types'

function mixerDialogueStart(clip: { startTime?: number }, idx: number, fallbackStep: number): number {
  if (clip.startTime != null && Number.isFinite(clip.startTime)) return clip.startTime
  return idx * fallbackStep
}

function dialogueClipConfigKey(clip: { id?: string; clipId?: string }, idx: number): string {
  return clip.id ?? clip.clipId ?? `dialogue-${idx}`
}

function clampDialoguePlaybackRate(rate: number | undefined): number {
  if (rate == null || !Number.isFinite(rate) || rate <= 0) return 1
  return Math.min(1.5, Math.max(0.5, rate))
}

function dialogueClipWallDuration(sourceSeconds: number | undefined, playbackRate: number | undefined): number {
  const src = sourceSeconds ?? 3
  return src / clampDialoguePlaybackRate(playbackRate)
}

/**
 * Plays one scene's beat videos with the saved Mixer mix.
 * The Mixer keeps its own live edit path; this reads persisted production data.
 */
export function ScreeningBeatPreview({
  scene,
  productionData,
  language,
  showWatermark,
  autoPlay = false,
  onPlaybackComplete,
}: {
  scene: Record<string, unknown> | null | undefined
  productionData: SceneProductionData | null | undefined
  language: string
  showWatermark: boolean
  autoPlay?: boolean
  onPlaybackComplete?: () => boolean | void
}) {
  const [measuredSegmentDurations, setMeasuredSegmentDurations] = useState<Record<string, number>>({})
  const [isMuted, setIsMuted] = useState(false)

  const segments = useMemo(
    () => listIncludedBeatVideos(productionData?.segments),
    [productionData?.segments]
  )

  const settings = useMemo(
    () => mergeMixerSettingsForLanguage(productionData, language),
    [productionData, language]
  )

  const segmentAudioConfigs = useMemo(
    () =>
      buildSegmentAudioConfigsForSegments(
        segments.map((segment) => segment.segmentId),
        settings.segmentAudioConfigs
      ),
    [segments, settings.segmentAudioConfigs]
  )

  const normalizedSceneSfx = useMemo(
    () => coerceSceneSfxFlatArray(scene?.sfx),
    [scene]
  )

  const audioScene = useMemo(
    () => ({
      ...(scene ?? {}),
      segments,
      sfxAudio: normalizedSceneSfx
        .map((entry) => (typeof entry === 'object' && entry ? entry.audioUrl : undefined))
        .filter((url): url is string => !!url),
      sfx: normalizedSceneSfx,
    }),
    [scene, segments, normalizedSceneSfx]
  )

  const resolvedDialogueClips = useMemo(
    () =>
      getResolvedDialogueClipsForScene(audioScene, language, {
        segmentPlaybackOffsetSeconds: 1.0,
        packDialogueToSegmentTimeline: true,
      }),
    [audioScene, language]
  )

  const narrationPrefix = useMemo(
    () => inferNarrationTimelinePrefixCount(audioScene),
    [audioScene]
  )

  const getDialoguePlaybackRate = useCallback(
    (clipId: string) => clampDialoguePlaybackRate(settings.dialogueClipConfigs[clipId]?.playbackRate),
    [settings.dialogueClipConfigs]
  )

  const buildSegmentDurationInput = useCallback(
    (segment: SceneSegment) => ({
      segment,
      dialogueClips: resolvedDialogueClips,
      measuredVideoDuration: measuredSegmentDurations[segment.segmentId],
      manualPostPause: segmentAudioConfigs[segment.segmentId]?.postSegmentPause,
      dialogueEnabled: settings.audioTracks.dialogue.enabled,
      narrationPrefix,
      getPlaybackRate: getDialoguePlaybackRate,
    }),
    [
      resolvedDialogueClips,
      measuredSegmentDurations,
      segmentAudioConfigs,
      settings.audioTracks.dialogue.enabled,
      narrationPrefix,
      getDialoguePlaybackRate,
    ]
  )

  const getSegmentDuration = useCallback(
    (segment: SceneSegment) => computeSegmentContentDuration(buildSegmentDurationInput(segment)),
    [buildSegmentDurationInput]
  )

  const playbackSegmentDuration = useCallback(
    (segment: SceneSegment) => {
      const fromTiming = computePlaybackSegmentDuration(buildSegmentDurationInput(segment))
      const measured = measuredSegmentDurations[segment.segmentId]
      if (measured != null && Number.isFinite(measured) && measured > 0) {
        const trimmed = resolveVideoTrimWindow(segment, measured).playableSec
        return Math.max(trimmed, fromTiming)
      }
      return fromTiming
    },
    [buildSegmentDurationInput, measuredSegmentDurations]
  )

  const currentAudioUrls = useMemo(() => {
    const narrationAudio = scene?.narrationAudio as
      | Record<string, { url?: string; duration?: number }>
      | undefined
    const narrationUrl =
      narrationAudio?.[language]?.url ||
      narrationAudio?.en?.url ||
      (typeof scene?.narrationAudioUrl === 'string' ? scene.narrationAudioUrl : undefined)

    const rawDialogue =
      (scene?.dialogueAudio as Record<string, Array<{ audioUrl?: string; character?: string; line?: string; text?: string; dialogueIndex?: number }>> | undefined)?.[language] ||
      (scene?.dialogueAudio as Record<string, Array<{ audioUrl?: string; character?: string; line?: string; text?: string; dialogueIndex?: number }>> | undefined)?.en ||
      []

    const dialogueEntries = resolvedDialogueClips
      .filter((clip) => clip.url)
      .map((clip) => {
        const dialogueIndex = clip.dialogueIndex
        const raw =
          (Array.isArray(rawDialogue)
            ? rawDialogue.find(
                (entry) =>
                  typeof entry?.dialogueIndex === 'number' && entry.dialogueIndex === dialogueIndex
              )
            : undefined) ??
          (Array.isArray(rawDialogue)
            ? rawDialogue[typeof dialogueIndex === 'number' ? dialogueIndex : 0]
            : undefined)
        return {
          id: clip.id,
          audioUrl: clip.url ?? undefined,
          character: clip.characterName ?? raw?.character,
          text: raw?.line ?? raw?.text,
          startTime: clip.startTime,
          duration: clip.duration,
        }
      })

    const sfxEntries = normalizedSceneSfx.filter(
      (entry) => typeof entry === 'object' && entry && entry.audioUrl
    )

    return {
      narration: narrationUrl,
      narrationDuration: narrationAudio?.[language]?.duration,
      dialogue: dialogueEntries,
      music: typeof scene?.musicAudio === 'string' ? scene.musicAudio : undefined,
      sfx: sfxEntries,
    }
  }, [scene, language, resolvedDialogueClips, normalizedSceneSfx])

  const dialoguePlaybackAudioUrls = useMemo(() => {
    if (currentAudioUrls.dialogue.length === 0) return currentAudioUrls

    const clipIdToSegmentIndex = new Map<string, number>()
    segments.forEach((segment, index) => {
      const lineIds = [
        ...(segment.dialogueLineIds || []),
        ...((segment.dialogueLines || [])
          .map((line) => line?.id)
          .filter((id): id is string => typeof id === 'string' && !!id)),
      ]
      resolvedDialogueClips.forEach((clip) => {
        if (lineIds.some((lineId) => clipMatchesDialogueLineId(clip, lineId, narrationPrefix, audioScene))) {
          clipIdToSegmentIndex.set(clip.id, index)
        }
      })
    })

    const segmentTimeCursors = new Map<number, number>()
    const dialogue = currentAudioUrls.dialogue.map((clip, index) => {
      const clipKey = clip.id || `dialogue-${index}`
      const sourceDuration = clip.duration ?? 3
      const rate = getDialoguePlaybackRate(clipKey)
      const wallDuration = dialogueClipWallDuration(sourceDuration, rate)
      let startTime = clip.startTime ?? 0
      if (clip.id) {
        const segmentIndex = clipIdToSegmentIndex.get(clip.id)
        if (segmentIndex !== undefined) {
          let segmentStart = 0
          for (let i = 0; i < Math.min(segmentIndex, segments.length); i++) {
            segmentStart += playbackSegmentDuration(segments[i])
          }
          const cursor = segmentTimeCursors.get(segmentIndex) ?? segmentStart
          startTime = cursor
          segmentTimeCursors.set(segmentIndex, cursor + wallDuration + MIXER_DIALOGUE_INTRA_GAP_SEC)
        }
      }
      return { ...clip, startTime, duration: sourceDuration }
    })
    return { ...currentAudioUrls, dialogue }
  }, [
    currentAudioUrls,
    segments,
    resolvedDialogueClips,
    narrationPrefix,
    getDialoguePlaybackRate,
    playbackSegmentDuration,
    audioScene,
  ])

  const mixerMusic = useMemo(
    () =>
      resolveMixerMusicClips({
        scene: scene ?? undefined,
        segments,
        getPlaybackSegmentDuration: playbackSegmentDuration,
        musicConfig: settings.audioTracks.music,
        legacyMusicUrl: typeof scene?.musicAudio === 'string' ? scene.musicAudio : undefined,
        musicFileDuration: DEFAULT_MUSIC_FILE_DURATION_SEC,
      }),
    [scene, segments, playbackSegmentDuration, settings.audioTracks.music]
  )

  const playbackAudioUrls = useMemo(
    () => ({
      ...dialoguePlaybackAudioUrls,
      music: mixerMusic.clips[0]?.url ?? dialoguePlaybackAudioUrls.music,
      musicClips: mixerMusic.clips,
    }),
    [dialoguePlaybackAudioUrls, mixerMusic]
  )

  const videoTotalDuration = useMemo(
    () => segments.reduce((sum, segment) => sum + playbackSegmentDuration(segment), 0),
    [segments, playbackSegmentDuration]
  )

  const totalDuration = useMemo(() => {
    let maxDuration = 0
    const { audioTracks } = settings
    if (audioTracks.narration.enabled && playbackAudioUrls.narration) {
      maxDuration = Math.max(
        maxDuration,
        audioTracks.narration.startOffset + (playbackAudioUrls.narrationDuration ?? 0)
      )
    }
    if (audioTracks.dialogue.enabled && playbackAudioUrls.dialogue.length > 0) {
      const dialogueEnds = playbackAudioUrls.dialogue.map((clip, index) => {
        if (settings.dialogueClipConfigs[dialogueClipConfigKey(clip, index)]?.enabled === false) return 0
        const startTime = mixerDialogueStart(clip, index, 3)
        const rate = settings.dialogueClipConfigs[dialogueClipConfigKey(clip, index)]?.playbackRate
        return startTime + dialogueClipWallDuration(clip.duration, rate)
      })
      maxDuration = Math.max(maxDuration, ...dialogueEnds)
    }
    if (audioTracks.sfx.enabled && playbackAudioUrls.sfx.length > 0) {
      const sfxEnds = playbackAudioUrls.sfx.map((clip) => (clip.startTime ?? 0) + (clip.duration ?? 2))
      maxDuration = Math.max(maxDuration, ...sfxEnds)
    }
    return Math.max(videoTotalDuration, maxDuration)
  }, [settings, playbackAudioUrls, videoTotalDuration])

  const watermarkConfig = showWatermark
    ? settings.watermarkConfig
    : { ...settings.watermarkConfig, enabled: false }

  if (segments.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-500">
        <span className="text-sm">No beat video in this scene</span>
      </div>
    )
  }

  return (
    <ScenePreviewPlayer
      segments={segments}
      audioTracks={settings.audioTracks}
      currentAudioUrls={playbackAudioUrls}
      dialogueClipConfigs={settings.dialogueClipConfigs}
      totalDuration={totalDuration}
      isMuted={isMuted}
      onToggleMute={() => setIsMuted((prev) => !prev)}
      segmentAudioConfigs={segmentAudioConfigs}
      masterSegmentVolume={settings.masterSegmentVolume}
      getPlaybackSegmentDuration={playbackSegmentDuration}
      getSegmentDuration={getSegmentDuration}
      measuredSegmentDurations={measuredSegmentDurations}
      onMeasuredDurationsChange={setMeasuredSegmentDurations}
      textOverlays={(productionData?.textOverlays ?? []) as TextOverlay[]}
      watermarkConfig={watermarkConfig}
      musicFileDuration={
        typeof scene?.musicFileDuration === 'number' && scene.musicFileDuration > 0
          ? scene.musicFileDuration
          : DEFAULT_MUSIC_FILE_DURATION_SEC
      }
      autoPlay={autoPlay}
      onPlaybackComplete={onPlaybackComplete}
    />
  )
}
