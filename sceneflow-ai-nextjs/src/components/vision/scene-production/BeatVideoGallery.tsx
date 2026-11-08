'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, Camera, Check, Clapperboard, Copy, Download, Film, Loader2, Maximize2, Minimize2, Pause, PlayCircle, Settings2, Subtitles, Upload, Wand2 } from 'lucide-react'
import { toast } from 'sonner'
import { saveVideoFile } from '@/lib/download/saveFile'
import { SUPPORTED_LANGUAGES } from '@/constants/languages'
import { GroupedLanguageSelector } from '@/components/vision/GroupedLanguageSelector'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { SceneImageFrame } from '@/components/vision/SceneImageFrame'
import { StatusFilterBar } from '@/components/vision/StatusFilterBar'
import {
  SceneBeatStage,
  shotKindMarker,
  type SceneBeatStageMarker,
} from '@/components/vision/scene-production/SceneBeatStage'
import type { SceneSegment } from './types'
import type { DirectorQueueItem } from '@/hooks/useVideoQueue'
import {
  clipFailureTooltip,
  isContentPolicyFailureMessage,
  videoMatchesFilters,
  videoRailStatus,
  videoRailTooltip,
  type VideoAttentionFilter,
  type VideoClipFacts,
  type VideoQualityFilter,
} from '@/lib/vision/videoClipFilters'
import {
  listPlayableTakes,
  resolveLiveTake,
  segmentHasPlayableVideo,
} from '@/lib/storyboard/mediaVersions'
import {
  isMasterStreamLanguage,
  languageClipSelectionValue,
  latestLanguageClipOption,
  listLanguageClipVersionOptions,
  normalizeStreamLanguage,
  resolveLanguageClipPlayback,
  streamLanguageLabel,
} from '@/lib/scene/languageClipVersions'

const videoShowLabels: Record<VideoAttentionFilter, string> = {
  all: 'All',
  needs_action: 'Needs action',
  in_the_can: 'In the Can',
  prompt_changed: 'Prompt changed',
  error: 'Error',
  no_clip: 'No clip',
}

const videoShowTooltips: Record<VideoAttentionFilter, string> = {
  all: 'Every clip in this scene.',
  needs_action: 'Clips that are unfinished, or whose prompt changed.',
  in_the_can: 'Clips that finished rendering.',
  prompt_changed: 'Clips whose prompt changed after the render.',
  error: 'Clips that failed to render.',
  no_clip: 'Shots that are still waiting on a clip.',
}

const videoQualityLabels: Record<VideoQualityFilter, string> = {
  all: 'All',
  final: 'Final',
  draft: 'Draft',
}

const videoQualityTooltips: Record<VideoQualityFilter, string> = {
  all: 'All clips in this scene.',
  final: 'Clips rendered in Final quality (1080p / 4K), on a Final frame, or via Standard Reference-to-Video.',
  draft: 'Clips rendered in Draft quality (720p) or whose source frame is a draft.',
}

function clipStatus(item?: DirectorQueueItem): { label: string; className: string } | null {
  if (!item) return null
  if (item.status === 'complete') {
    return { label: 'In the Can', className: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200' }
  }
  if (item.status === 'rendering') {
    return { label: 'Rolling', className: 'border-blue-500/40 bg-blue-500/15 text-blue-200' }
  }
  if (item.status === 'error') {
    return { label: 'Error', className: 'border-red-500/40 bg-red-500/15 text-red-200' }
  }
  return { label: 'Ready', className: 'border-slate-500/40 bg-slate-500/15 text-slate-300' }
}

export interface BeatVideoClip {
  key: string
  beatId?: string
  beatNumber: number
  label: string
  prompt?: string
  /** Action, dialogue, narration, or title. Omitted for clips that are not beat-backed. */
  kind?: 'action' | 'dialogue' | 'narration' | 'title'
  thumbnailUrl?: string
  hasStartFrame: boolean
  /** Dedicated frame-to-video frames. Not the beat still. */
  f2vStartUrl?: string | null
  f2vEndUrl?: string | null
  previousEndFrameUrl?: string | null
  segment?: SceneSegment
  queueItem?: DirectorQueueItem
  /** Pre-Vis frame tier for this beat. Clips do not store their own Draft | Final. */
  imageTier?: 'draft' | 'final'
  promptChanged?: boolean
  /** True when this shot requires a localized video clip in non-English streams. */
  needsLanguageClip?: boolean
  /** When true, intentionally include burned-in captions in the clip prompt (default false). */
  includeCaptions?: boolean
  /** Shared source scene badge for Promo shots (e.g. "S2 · Shot 3"). */
  sourceSceneLabel?: string
  /** Descriptive shared source label for Promo shots (e.g. "Scene 2 · Shot 3"). */
  sourceSceneLongLabel?: string
  sourceSceneIndex?: number
}

interface BeatVideoGalleryProps {
  clips: BeatVideoClip[]
  toolbar: React.ReactNode
  aspectClass: string
  isRendering?: boolean
  progress?: number
  completedCount?: number
  failedCount?: number
  isRateLimitPaused?: boolean
  rateLimitCountdown?: number
  readOnlyPrompts?: boolean
  renderedCount: number
  totalCount: number
  /** Unused. Selected-beat preview plays inline. Play Scene opens Screening Room. */
  onPlay?: (segment: SceneSegment) => void
  onTake?: (segment: SceneSegment) => void
  onUpload?: (segmentId: string, file: File) => void
  onRetake?: (segment: SceneSegment) => void
  onGenerateClip?: (segment: SceneSegment) => void
  /** Open the video pre-flight dialog (Direct Video). */
  onDirectVideo?: (segment: SceneSegment) => void
  /** Open Direct Beat so beat direction stays the source of the still and clip prompts. */
  onDirectBeat?: (beatId: string, options?: { safety?: boolean }) => void
  /** Edit a completed clip. */
  onEditClip?: (segment: SceneSegment) => void
  /** Restore a stored take as the live clip. */
  onRestoreTake?: (segmentId: string, takeId: string) => void
  onOpenPreVis?: () => void
  generatingClipId?: string | null
  /** Shared beat selection with Direction, Audio, and Pre-Vis. */
  selectedBeatId?: string | null
  onSelectBeat?: (beatId: string) => void
  /** Language stream shared with the Mixer and Streams. English is the master. */
  streamLanguage?: string
  streamLanguages?: string[]
  onStreamLanguageChange?: (language: string) => void
  onAddStreamLanguage?: (language: string) => void
  languagesNotYetGenerated?: string[]
  onGenerateLanguageVersion?: (segment: SceneSegment) => void
  onRestoreLanguageVersion?: (segmentId: string, takeId: string) => void
  generatingLanguageClipId?: string | null
  /** Toggle whether the clip prompt intentionally includes burned-in captions (default false). */
  onToggleClipCaptions?: (segmentId: string, nextIncludeCaptions: boolean) => void
  /** Whether shot/clip prompts are currently being updated or saved. */
  isUpdatingPrompts?: boolean
}

export function BeatVideoGallery({
  clips,
  toolbar,
  aspectClass,
  isRendering = false,
  progress = 0,
  completedCount = 0,
  failedCount = 0,
  isRateLimitPaused = false,
  rateLimitCountdown = 0,
  readOnlyPrompts = false,
  renderedCount,
  totalCount,
  onTake,
  onUpload,
  onRetake,
  onGenerateClip,
  onDirectVideo,
  onDirectBeat,
  onEditClip,
  onRestoreTake,
  generatingClipId,
  selectedBeatId = null,
  onSelectBeat,
  streamLanguage = 'en',
  streamLanguages = [],
  onStreamLanguageChange,
  onAddStreamLanguage,
  languagesNotYetGenerated = [],
  onGenerateLanguageVersion,
  onRestoreLanguageVersion,
  generatingLanguageClipId = null,
  onToggleClipCaptions,
  isUpdatingPrompts = false,
}: BeatVideoGalleryProps) {
  const [selectedKey, setSelectedKey] = useState<string | null>(clips[0]?.key ?? null)
  const [attention, setAttention] = useState<VideoAttentionFilter>('all')
  const [quality, setQuality] = useState<VideoQualityFilter>('all')
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false)
  const [isPreviewFullscreen, setIsPreviewFullscreen] = useState(false)
  const previewVideoRef = useRef<HTMLVideoElement>(null)
  const previewStageRef = useRef<HTMLDivElement>(null)

  const languageStream = !isMasterStreamLanguage(streamLanguage)
  const streamCode = normalizeStreamLanguage(streamLanguage)
  const languageName =
    streamLanguageLabel(
      streamCode,
      SUPPORTED_LANGUAGES.find((lang) => lang.code === streamCode)?.name
    ).replace(' (master)', '')

  const clipFacts = useMemo<VideoClipFacts[]>(
    () =>
      clips.map((clip) => {
        const masterComplete =
          clip.queueItem?.status === 'complete' || segmentHasPlayableVideo(clip.segment)
        if (!languageStream) {
          return {
            key: clip.key,
            status:
              clip.queueItem?.status === 'rendering'
                ? 'rendering'
                : masterComplete
                  ? 'complete'
                  : clip.queueItem?.status === 'error'
                    ? 'error'
                    : 'queued',
            promptChanged: !!clip.promptChanged,
            imageTier: clip.imageTier,
          }
        }
        const playback = clip.segment
          ? resolveLanguageClipPlayback(clip.segment, streamLanguage)
          : undefined
        const hasLanguageClip = !!playback?.url && !playback?.usingMaster
        const isGeneratingLang =
          !!clip.segment && generatingLanguageClipId === clip.segment.segmentId
        const langComplete = hasLanguageClip || (!clip.needsLanguageClip && masterComplete)
        return {
          key: clip.key,
          status:
            isGeneratingLang || clip.queueItem?.status === 'rendering'
              ? 'rendering'
              : langComplete
                ? 'complete'
                : clip.queueItem?.status === 'error'
                  ? 'error'
                  : 'queued',
          promptChanged: !!clip.promptChanged,
          imageTier: clip.imageTier,
        }
      }),
    [clips, languageStream, streamLanguage, generatingLanguageClipId]
  )
  const visibleClips = useMemo(
    () =>
      clips.filter((clip) => {
        const facts = clipFacts.find((entry) => entry.key === clip.key)
        return facts ? videoMatchesFilters(facts, attention, quality) : true
      }),
    [clips, clipFacts, attention, quality]
  )

  useEffect(() => {
    if (visibleClips.length === 0) {
      setSelectedKey(null)
      return
    }
    if (visibleClips.some((clip) => clip.key === selectedKey)) return
    const current = clips.find((clip) => clip.key === selectedKey)
    if (current && (current.beatId || current.key) === selectedBeatId) return
    setSelectedKey(visibleClips[0].key)
  }, [visibleClips, selectedKey, clips, selectedBeatId])

  useEffect(() => {
    if (!selectedBeatId) return
    const match = visibleClips.find((clip) => (clip.beatId || clip.key) === selectedBeatId)
    if (match && match.key !== selectedKey) setSelectedKey(match.key)
  }, [selectedBeatId, visibleClips, selectedKey])

  const preview = visibleClips.find((clip) => clip.key === selectedKey) ?? visibleClips[0]
  const previewSegment = preview?.segment
  const previewError =
    previewSegment?.errorMessage?.trim() || preview?.queueItem?.error?.trim() || ''
  const previewFailed =
    !!previewError &&
    (preview?.queueItem?.status === 'error' || previewSegment?.status === 'ERROR')
  const previewPolicy = previewFailed && isContentPolicyFailureMessage(previewError)
  const suggestedWording = [
    previewSegment?.lastContentPolicyFailure?.optionalSanitized?.prompt,
    previewSegment?.lastContentPolicyFailure?.optionalSanitized?.guidePrompt,
  ].filter((value): value is string => !!value?.trim())
  const policyHints = previewSegment?.lastContentPolicyFailure?.hints?.filter((hint) => hint.trim()) ?? []
  const languageOptions = languageStream
    ? listLanguageClipVersionOptions(previewSegment?.languageVersions?.[streamCode])
    : []
  const languagePlayback = previewSegment
    ? resolveLanguageClipPlayback(previewSegment, streamLanguage)
    : undefined
  const playableTakes = languageStream
    ? listPlayableTakes(previewSegment?.languageVersions?.[streamCode]?.takes, undefined)
    : previewSegment
      ? listPlayableTakes(previewSegment.takes, previewSegment.activeAssetUrl)
      : []
  const liveTake = languageStream
    ? playableTakes.find((take) => take.id === languagePlayback?.takeId) ??
      playableTakes[playableTakes.length - 1]
    : previewSegment
      ? resolveLiveTake(
          previewSegment.takes,
          previewSegment.currentTakeId,
          previewSegment.activeAssetUrl
        )
      : undefined
  const previewVideoUrl = languageStream ? languagePlayback?.url : liveTake?.url
  const showingMasterFallback = languageStream && !!languagePlayback?.usingMaster && !!previewVideoUrl
  const hasLocalizedPreviewClip =
    languageStream && !languagePlayback?.usingMaster && !!languagePlayback?.url
  const previewHasClip = !!previewVideoUrl
  const languageVersionValue = languageClipSelectionValue(languageOptions)
  const generatingLanguageClip = !!previewSegment && generatingLanguageClipId === previewSegment.segmentId
  const previewStatus = (() => {
    if (!languageStream) return clipStatus(preview?.queueItem)
    if (generatingLanguageClip || preview?.queueItem?.status === 'rendering') {
      return { label: 'Rolling', className: 'border-blue-500/40 bg-blue-500/15 text-blue-200' }
    }
    if (hasLocalizedPreviewClip) {
      return {
        label: 'In the Can',
        className: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200',
      }
    }
    if (preview?.needsLanguageClip && showingMasterFallback) {
      return {
        label: `Needs ${languageName} clip`,
        className: 'border-amber-500/40 bg-amber-500/15 text-amber-200',
      }
    }
    if (!preview?.needsLanguageClip && showingMasterFallback) {
      return {
        label: 'In the Can',
        className: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200',
      }
    }
    return clipStatus(preview?.queueItem)
  })()
  const formatStreamName = (lang: { code: string; name: string }) =>
    streamLanguageLabel(lang.code, lang.name)
  const versionStrip = [...playableTakes].sort((a, b) => {
    const aTime = Date.parse(a.createdAt || '')
    const bTime = Date.parse(b.createdAt || '')
    return (Number.isFinite(aTime) ? aTime : 0) - (Number.isFinite(bTime) ? bTime : 0)
  })

  useEffect(() => {
    setIsPreviewPlaying(false)
    const el = previewVideoRef.current
    if (!el) return
    el.pause()
    try {
      el.currentTime = 0
    } catch {
      /* metadata may not be ready yet */
    }
  }, [selectedKey, previewVideoUrl])

  useEffect(() => {
    const onChange = () => setIsPreviewFullscreen(document.fullscreenElement === previewStageRef.current)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const togglePreviewFullscreen = () => {
    const stage = previewStageRef.current
    if (!stage) return
    if (document.fullscreenElement === stage) {
      void document.exitFullscreen()
      return
    }
    void stage.requestFullscreen()
  }

  const togglePreviewPlayback = () => {
    const el = previewVideoRef.current
    if (!el || !previewVideoUrl) return
    if (el.paused) {
      void el.play()
      return
    }
    el.pause()
  }

  const [copiedClipKey, setCopiedClipKey] = useState<string | null>(null)

  const handleCopyClipPrompt = useCallback((promptText: string, clipKey: string) => {
    const trimmed = promptText.trim()
    if (!trimmed) return
    void navigator.clipboard.writeText(trimmed).then(() => {
      setCopiedClipKey(clipKey)
      toast.success('Clip prompt copied')
      window.setTimeout(() => {
        setCopiedClipKey((current) => (current === clipKey ? null : current))
      }, 2000)
    })
  }, [])

  return (
    <div id="beat-video-gallery" className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-[10px] text-gray-400">
          {renderedCount}/{totalCount || clips.length} clips
        </span>
        <div className="flex items-center gap-2 flex-wrap">{toolbar}</div>
      </div>

      {isRendering && (
        <div className="space-y-2">
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${isRateLimitPaused ? 'bg-amber-500 animate-pulse' : 'bg-indigo-500'}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-500">
            <span>{completedCount} completed</span>
            {isRateLimitPaused && <span className="text-amber-400">Paused ({rateLimitCountdown}s)</span>}
            {failedCount > 0 && <span className="text-red-400">{failedCount} failed</span>}
            <span>{progress}%</span>
          </div>
        </div>
      )}

      {clips.length > 0 && (
        <StatusFilterBar
          activeSummary={[
            attention === 'all' ? '' : videoShowLabels[attention],
            quality === 'all' ? '' : videoQualityLabels[quality],
          ]
            .filter(Boolean)
            .join(' · ')}
          onClear={() => {
            setAttention('all')
            setQuality('all')
          }}
          groups={[
            {
              label: 'Show',
              onSelect: (id) => setAttention(id as VideoAttentionFilter),
              chips: (
                [
                  ['all', 'All'],
                  ['needs_action', 'Needs action'],
                  ['in_the_can', 'In the Can'],
                  ['prompt_changed', 'Prompt changed'],
                  ['error', 'Error'],
                  ['no_clip', 'No clip'],
                ] as Array<[VideoAttentionFilter, string]>
              ).map(([id, label]) => ({
                id,
                label,
                tooltip: videoShowTooltips[id],
                active: attention === id,
                count:
                  id === 'all'
                    ? clipFacts.length
                    : clipFacts.filter((facts) => videoMatchesFilters(facts, id, quality)).length,
              })),
            },
            {
              label: 'Quality',
              onSelect: (id) => setQuality(id as VideoQualityFilter),
              chips: (
                [
                  ['all', 'All'],
                  ['final', 'Final'],
                  ['draft', 'Draft'],
                ] as Array<[VideoQualityFilter, string]>
              ).map(([id, label]) => ({
                id,
                label,
                tooltip: videoQualityTooltips[id],
                active: quality === id,
                count:
                  id === 'all'
                    ? clipFacts.length
                    : clipFacts.filter((facts) => videoMatchesFilters(facts, attention, id)).length,
              })),
            },
          ]}
        />
      )}

      {clips.length === 0 ? (
        <div className="text-center py-6 text-gray-500 text-sm">
          <Film className="w-8 h-8 mx-auto mb-2 text-gray-600" />
          <p>No shots to generate yet.</p>
        </div>
      ) : (
        <SceneBeatStage
          railLabel="Shot clips"
          items={visibleClips.map((clip) => {
            const facts = clipFacts.find((entry) => entry.key === clip.key)
            const rail = facts ? videoRailStatus(facts) : undefined
            const errorText = clip.segment?.errorMessage || clip.queueItem?.error
            const kind = shotKindMarker(clip.kind)
            const markers: SceneBeatStageMarker[] = kind ? [kind] : []
            return {
              id: clip.key,
              beatNumber: clip.beatNumber,
              markers,
              sourceSceneLabel: clip.sourceSceneLabel,
              status: rail?.status,
              statusLabel: rail?.label || undefined,
              statusDetail: facts ? videoRailTooltip(facts, errorText) : undefined,
              ariaLabel: clip.label || `Shot ${clip.beatNumber}`,
            }
          })}
          selectedId={selectedKey}
          onSelect={(id) => {
            setSelectedKey(id)
            const clip = visibleClips.find((entry) => entry.key === id)
            if (clip) onSelectBeat?.(clip.beatId || clip.key)
          }}
        >
          <div className="sticky top-2 flex w-full min-w-0 max-w-full flex-1 flex-col gap-2 self-start lg:min-w-[40rem]">
            {((onStreamLanguageChange && streamLanguages.length > 0) ||
              (languageStream && languageOptions.length > 0)) && (
              <div className="flex flex-wrap items-center gap-2 px-1">
                {onStreamLanguageChange && streamLanguages.length > 0 && (
                  <>
                    <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                      Stream
                    </span>
                    <GroupedLanguageSelector
                      value={streamCode}
                      onValueChange={onStreamLanguageChange}
                      filterCodes={streamLanguages}
                      size="xs"
                      intent="navigate"
                      showFlags
                      formatName={formatStreamName}
                      placeholder="Select language..."
                      className="h-7 min-w-[140px] border-slate-600 bg-slate-900/80 text-[11px]"
                    />
                    {onAddStreamLanguage && languagesNotYetGenerated.length > 0 && (
                      <GroupedLanguageSelector
                        value=""
                        onValueChange={(code) => {
                          onStreamLanguageChange(code)
                          void onAddStreamLanguage(code)
                        }}
                        filterCodes={languagesNotYetGenerated}
                        size="xs"
                        intent="generate"
                        placeholder="+ Add Language"
                        className="h-7 w-auto min-w-[110px] border-purple-500/40 bg-gray-700/30 text-[11px] text-purple-200"
                      />
                    )}
                  </>
                )}
                {languageStream && languageOptions.length > 0 && (
                  <label className="flex items-center gap-1.5 text-[10px] text-slate-400">
                    Version
                    <select
                      aria-label="Stream version"
                      className="h-7 rounded border border-slate-600 bg-slate-900 px-1.5 text-[11px] text-slate-200"
                      value={languageVersionValue}
                      onChange={(event) => {
                        if (!previewSegment) return
                        const value = event.target.value
                        const newest = latestLanguageClipOption(languageOptions)
                        const takeId = value === 'latest' ? newest?.id : value
                        if (takeId) onRestoreLanguageVersion?.(previewSegment.segmentId, takeId)
                      }}
                    >
                      <option value="latest">Latest</option>
                      {[...languageOptions].reverse().map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
            )}
            {showingMasterFallback && (
              <p className="px-1 text-[11px] text-amber-200/90">
                No {languageName} clip yet. This preview is the English master.
              </p>
            )}
            <p className="px-1 text-[10px] font-medium uppercase tracking-wide text-slate-400">
              {previewVideoUrl ? 'Clip preview' : preview?.thumbnailUrl ? 'Start frame' : 'Clip preview'}
            </p>
            <div
              ref={previewStageRef}
              className={cn(
                'relative w-full overflow-hidden rounded-lg border border-slate-700/40 bg-gray-800/50',
                isPreviewFullscreen && 'flex h-screen max-w-none items-center justify-center bg-black'
              )}
            >
              {previewVideoUrl && (
                <button
                  type="button"
                  className="absolute bottom-2 right-10 z-30 rounded-md bg-black/60 p-1.5 text-white hover:bg-black/80"
                  onClick={(event) => {
                    event.stopPropagation()
                    void saveVideoFile({
                      url: previewVideoUrl,
                      beatNumber: preview?.beatNumber,
                      label: preview?.label || 'clip',
                    })
                      .then((saved) => {
                        if (saved) toast.success('Video clip saved')
                      })
                      .catch(() => toast.error('Failed to download video clip'))
                  }}
                  title="Download clip video"
                  aria-label="Download clip video"
                >
                  <Download className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                className="absolute bottom-2 right-2 z-30 rounded-md bg-black/60 p-1.5 text-white hover:bg-black/80"
                onClick={(event) => {
                  event.stopPropagation()
                  togglePreviewFullscreen()
                }}
                aria-label={isPreviewFullscreen ? 'Exit fullscreen' : 'View fullscreen'}
              >
                {isPreviewFullscreen ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </button>
              {previewVideoUrl ? (
                <div
                  className={cn(
                    'relative mx-auto w-[80%] max-h-[42vh] bg-black',
                    aspectClass,
                    isPreviewFullscreen && 'h-screen max-h-none w-full'
                  )}
                >
                  <video
                    key={previewVideoUrl}
                    ref={previewVideoRef}
                    src={previewVideoUrl}
                    poster={preview?.thumbnailUrl}
                    className="pointer-events-none h-full w-full object-contain"
                    playsInline
                    preload="metadata"
                    onEnded={() => setIsPreviewPlaying(false)}
                    onPlay={() => setIsPreviewPlaying(true)}
                    onPause={() => setIsPreviewPlaying(false)}
                  />
                  <button
                    type="button"
                    className="absolute inset-0 z-10 flex items-center justify-center"
                    onClick={togglePreviewPlayback}
                    aria-label={isPreviewPlaying ? 'Pause clip preview' : 'Play clip preview'}
                  >
                    {!isPreviewPlaying && (
                      <span className="rounded-full bg-black/60 p-3 text-white shadow-lg">
                        <PlayCircle className="h-12 w-12" />
                      </span>
                    )}
                  </button>
                </div>
              ) : preview?.thumbnailUrl && previewSegment ? (
                <SceneImageFrame
                  sceneIdx={0}
                  sceneNumber={preview.beatNumber}
                  label="Shot still"
                  generateTitle={
                    languageStream
                      ? languageOptions.length > 0
                        ? `New ${languageName} version`
                        : `Generate ${languageName} version`
                      : previewHasClip
                        ? 'Regenerate'
                        : 'Generate clip'
                  }
                  directTitle="Direct Clip"
                  directorTitle="Shot Director"
                  uploadTitle="Upload"
                  uploadAccept="video/*"
                  className="w-full"
                  imageUrl={preview.thumbnailUrl}
                  imagePrompt={preview.prompt}
                  generateBlockedReason={
                    isUpdatingPrompts ? 'Updating shot prompts — please wait…' : undefined
                  }
                  showControls
                  controlsVariant="comfortable"
                  alwaysShowControls
                  showBorder={false}
                  containMedia
                  isGenerating={
                    generatingLanguageClip || generatingClipId === previewSegment.segmentId
                  }
                  onGenerate={() =>
                    languageStream
                      ? onGenerateLanguageVersion?.(previewSegment)
                      : onGenerateClip?.(previewSegment)
                  }
                  onDirect={onDirectVideo ? () => onDirectVideo(previewSegment) : undefined}
                  onDirector={
                    onDirectBeat && preview.beatId
                      ? () => onDirectBeat(preview.beatId)
                      : undefined
                  }
                  onUpload={
                    languageStream
                      ? undefined
                      : (file) => onUpload?.(previewSegment.segmentId, file)
                  }
                  onEdit={
                    onEditClip && previewHasClip
                      ? () => onEditClip(previewSegment)
                      : undefined
                  }
                />
              ) : (
                <div
                  className={cn(
                    'relative mx-auto w-[80%] max-h-[42vh] bg-black',
                    aspectClass,
                    isPreviewFullscreen && 'h-screen max-h-none w-full'
                  )}
                >
                  {preview?.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={preview.thumbnailUrl} alt="" className="h-full w-full object-contain" />
                  ) : (
                    <div className="flex h-full min-h-[140px] flex-col items-center justify-center px-4 text-center">
                      <Film className="mb-2 h-8 w-8 text-gray-600" />
                      <span className="text-xs text-gray-400">No clip rendered yet</span>
                      <span className="mt-1 text-[11px] text-gray-500">
                        Still frames are optional for Standard clips (only required for Creative / Kling AI)
                      </span>
                    </div>
                  )}
                </div>
              )}
              {previewSegment && versionStrip.length > 1 && (
                <div
                  className="flex gap-1 overflow-x-auto px-1.5 py-1 bg-slate-900/80 border-t border-slate-700/50"
                  onClick={(event) => event.stopPropagation()}
                >
                  {versionStrip.map((version, index) => {
                    const isCurrent = languageStream
                      ? version.id === languagePlayback?.takeId || version.url === previewVideoUrl
                      : version.id === previewSegment.currentTakeId || version.url === previewVideoUrl
                    return (
                      <button
                        key={version.id}
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          if (isCurrent) return
                          if (languageStream) {
                            onRestoreLanguageVersion?.(previewSegment.segmentId, version.id)
                            return
                          }
                          onRestoreTake?.(previewSegment.segmentId, version.id)
                        }}
                        className={`shrink-0 rounded border px-2 py-1 text-[10px] font-medium tabular-nums ${
                          isCurrent
                            ? 'border-cyan-400 bg-cyan-500/15 text-cyan-100 ring-1 ring-cyan-400/60'
                            : 'border-slate-600 text-slate-300 hover:border-slate-400'
                        }`}
                        title={`Restore version ${index + 1}`}
                        aria-label={`Restore version ${index + 1}`}
                      >
                        v{index + 1}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {preview && (
              <div className="px-1 pb-1">
                {previewSegment && (
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    {previewVideoUrl && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 text-[10px]"
                        onClick={togglePreviewPlayback}
                      >
                        {isPreviewPlaying ? (
                          <Pause className="mr-1 h-3 w-3" />
                        ) : (
                          <PlayCircle className="mr-1 h-3 w-3" />
                        )}
                        {isPreviewPlaying ? 'Pause' : 'Play'}
                      </Button>
                    )}
                    {previewVideoUrl && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 text-[10px]"
                        title="Download clip video"
                        onClick={() => {
                          void saveVideoFile({
                            url: previewVideoUrl,
                            beatNumber: preview?.beatNumber,
                            label: preview?.label || 'clip',
                          })
                            .then((saved) => {
                              if (saved) toast.success('Video clip saved')
                            })
                            .catch(() => toast.error('Failed to download video clip'))
                        }}
                      >
                        <Download className="mr-1 h-3 w-3" />
                        Download
                      </Button>
                    )}
                    {isUpdatingPrompts && (
                      <span
                        data-testid="updating-shot-prompts-badge"
                        className="inline-flex h-7 items-center gap-1.5 rounded border border-cyan-500/40 bg-cyan-500/10 px-2 text-[10px] font-medium text-cyan-200"
                      >
                        <Loader2 className="h-3 w-3 animate-spin text-cyan-400" />
                        Updating prompts…
                      </span>
                    )}
                    {onGenerateClip && !languageStream && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 border-indigo-500/40 text-[10px] text-indigo-200"
                        disabled={isUpdatingPrompts || generatingClipId === previewSegment.segmentId}
                        title={
                          isUpdatingPrompts ? 'Updating shot prompts — please wait…' : undefined
                        }
                        onClick={() => onGenerateClip(previewSegment)}
                      >
                        {isUpdatingPrompts ? (
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        ) : (
                          <Wand2 className="mr-1 h-3 w-3" />
                        )}
                        {isUpdatingPrompts
                          ? 'Updating prompts…'
                          : previewHasClip
                            ? 'Regenerate clip'
                            : 'Generate clip'}
                      </Button>
                    )}
                    {languageStream && onGenerateLanguageVersion && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 border-indigo-500/40 text-[10px] text-indigo-200"
                        disabled={generatingLanguageClip || isUpdatingPrompts}
                        title={
                          isUpdatingPrompts ? 'Updating shot prompts — please wait…' : undefined
                        }
                        onClick={() => onGenerateLanguageVersion(previewSegment)}
                      >
                        {generatingLanguageClip || isUpdatingPrompts ? (
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        ) : (
                          <Wand2 className="mr-1 h-3 w-3" />
                        )}
                        {generatingLanguageClip
                          ? `Generating ${languageName} version…`
                          : isUpdatingPrompts
                            ? 'Updating prompts…'
                            : languageOptions.length > 0
                              ? `New ${languageName} version`
                              : `Generate ${languageName} version`}
                      </Button>
                    )}
                    {onToggleClipCaptions && preview.kind !== 'title' && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className={cn(
                          'h-7 text-[10px]',
                          preview.includeCaptions
                            ? 'border-cyan-400/70 bg-cyan-500/20 text-cyan-100 hover:bg-cyan-500/30'
                            : 'border-slate-600/60 text-slate-300 hover:bg-slate-800/70'
                        )}
                        title={
                          preview.includeCaptions
                            ? 'Captions are included in this clip prompt. Click to default to no captions.'
                            : 'Default: no burned-in captions in clip prompt. Click to intentionally include captions.'
                        }
                        aria-pressed={Boolean(preview.includeCaptions)}
                        onClick={() =>
                          onToggleClipCaptions(previewSegment.segmentId, !preview.includeCaptions)
                        }
                      >
                        <Subtitles className="mr-1 h-3 w-3" />
                        {preview.includeCaptions ? 'Captions: On' : 'Captions: Off'}
                      </Button>
                    )}
                    {onDirectBeat && preview.beatId && (
                      <button
                        type="button"
                        className="inline-flex h-7 items-center gap-1 rounded border border-teal-800/80 px-2 text-[11px] text-teal-200 hover:bg-teal-950/40"
                        onClick={() => onDirectBeat(preview.beatId!)}
                      >
                        <Clapperboard className="h-3.5 w-3.5" />
                        Shot Director
                      </button>
                    )}
                    {onTake && !languageStream && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 text-[10px]"
                        disabled={isUpdatingPrompts}
                        onClick={() => onTake(previewSegment)}
                      >
                        <Settings2 className="mr-1 h-3 w-3" />
                        Take ({previewSegment.takes?.length || 1})
                      </Button>
                    )}
                    {onUpload && !languageStream && (
                      <>
                        <input
                          type="file"
                          accept="video/*"
                          className="hidden"
                          id={`upload-video-${previewSegment.segmentId}`}
                          onChange={(event) => {
                            const file = event.target.files?.[0]
                            if (file) onUpload(previewSegment.segmentId, file)
                            event.target.value = ''
                          }}
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 text-[10px]"
                          onClick={() =>
                            document.getElementById(`upload-video-${previewSegment.segmentId}`)?.click()
                          }
                        >
                          <Upload className="mr-1 h-3 w-3" />
                          Upload
                        </Button>
                      </>
                    )}
                    {onRetake && !languageStream && previewHasClip && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 border-indigo-500/40 text-[10px] text-indigo-200"
                        disabled={isUpdatingPrompts}
                        onClick={() => onRetake(previewSegment)}
                      >
                        Retake
                      </Button>
                    )}
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="shrink-0 rounded-full border border-slate-600/40 bg-slate-700/50 px-1.5 py-0.5 text-[10px] font-medium text-slate-300">
                    Shot {preview.beatNumber}
                  </span>
                  {(preview.sourceSceneLongLabel || preview.sourceSceneLabel) && (
                    <span
                      className="shrink-0 rounded-full border border-fuchsia-500/45 bg-fuchsia-500/15 px-2 py-0.5 text-[10px] font-semibold text-fuchsia-200"
                      title={`Shared shot from ${preview.sourceSceneLongLabel || preview.sourceSceneLabel} — clip & direction updates sync with ${preview.sourceSceneLongLabel || preview.sourceSceneLabel}`}
                    >
                      Shared: {preview.sourceSceneLongLabel || preview.sourceSceneLabel}
                    </span>
                  )}
                  <p className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-200" title={preview.label}>
                    {preview.label}
                  </p>
                  {previewStatus && (
                    <span className={cn('rounded border px-1.5 py-0.5 text-[10px]', previewStatus.className)}>
                      {previewStatus.label}
                    </span>
                  )}
                  {preview.promptChanged && (
                    <span
                      className="flex items-center gap-0.5 rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-300"
                      title="Action needed: Shot prompt or direction changed after this clip was rendered — run Video Agent or click Regenerate Clip to update it."
                    >
                      <AlertTriangle className="h-2.5 w-2.5" />
                      Prompt changed
                    </span>
                  )}
                  {(preview.imageTier === 'final' || (previewHasClip && !preview.imageTier)) && (
                    <span className="rounded-full bg-emerald-500/25 px-1.5 py-0.5 text-[10px] text-emerald-300">
                      Final
                    </span>
                  )}
                  {preview.imageTier === 'draft' && (
                    <span className="rounded-full bg-gray-500/25 px-1.5 py-0.5 text-[10px] text-gray-300">
                      Draft
                    </span>
                  )}
                  {previewHasClip && (liveTake?.resolution || previewSegment?.resolution) && (
                    <span className="rounded-full border border-slate-600/40 bg-slate-800/70 px-1.5 py-0.5 text-[10px] font-medium text-slate-300">
                      {String(liveTake?.resolution || previewSegment?.resolution).toUpperCase() === '4K'
                        ? '4K'
                        : String(liveTake?.resolution || previewSegment?.resolution).toLowerCase()}
                    </span>
                  )}
                  {preview.prompt?.trim() && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 shrink-0 border-slate-600/50 text-[10px] text-slate-300 hover:bg-slate-700/50"
                      title="Copy clip prompt for Google AI Studio"
                      onClick={() => handleCopyClipPrompt(preview.prompt!, preview.key)}
                    >
                      {copiedClipKey === preview.key ? (
                        <>
                          <Check className="mr-1 h-3 w-3 text-emerald-400" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="mr-1 h-3 w-3" />
                          Copy prompt
                        </>
                      )}
                    </Button>
                  )}
                </div>
                {previewFailed && (
                  <div className="mt-2 space-y-2 rounded-md border border-rose-500/40 bg-rose-950/40 p-2">
                    <p className="text-xs leading-relaxed text-rose-100">{previewError}</p>
                    {policyHints.length > 0 && (
                      <ul className="list-disc space-y-0.5 pl-4 text-[11px] text-rose-100/90">
                        {policyHints.map((hint) => (
                          <li key={hint}>{hint}</li>
                        ))}
                      </ul>
                    )}
                    {suggestedWording.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-[10px] uppercase tracking-wide text-rose-200/80">
                          Suggested wording
                        </p>
                        {suggestedWording.map((wording) => (
                          <p key={wording} className="text-[11px] leading-relaxed text-rose-50">
                            {wording}
                          </p>
                        ))}
                      </div>
                    )}
                    {previewPolicy && onDirectBeat && preview.beatId && (
                      <button
                        type="button"
                        className="inline-flex h-7 items-center gap-1 rounded bg-rose-700 px-2 text-[11px] text-white hover:bg-rose-600"
                        onClick={() => onDirectBeat(preview.beatId!, { safety: true })}
                      >
                        <Clapperboard className="h-3.5 w-3.5" />
                        Rewrite for Safety
                      </button>
                    )}
                  </div>
                )}
                {preview.prompt?.trim() && (
                  <p
                    className="mt-1.5 cursor-pointer text-xs leading-relaxed text-slate-400"
                    title={preview.prompt.trim()}
                    onClick={() => handleCopyClipPrompt(preview.prompt!, preview.key)}
                  >
                    {preview.prompt.trim()}
                  </p>
                )}
                {readOnlyPrompts && preview.segment && (
                  <p className="mt-1 text-[10px] text-slate-500">
                    Auto-derived from direction — use Shot Director to change this clip's video prompt
                  </p>
                )}
              </div>
            )}
          </div>
        </SceneBeatStage>
      )}
    </div>
  )
}
