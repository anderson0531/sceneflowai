'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, Camera, Clapperboard, Film, Maximize2, Minimize2, Pause, PlayCircle, Settings2, Upload, Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { SceneImageFrame } from '@/components/vision/SceneImageFrame'
import { StatusFilterBar } from '@/components/vision/StatusFilterBar'
import { SceneBeatStage } from '@/components/vision/scene-production/SceneBeatStage'
import type { SceneSegment } from './types'
import type { DirectorQueueItem } from '@/hooks/useVideoQueue'
import {
  videoMatchesFilters,
  type VideoAttentionFilter,
  type VideoClipFacts,
  type VideoQualityFilter,
} from '@/lib/vision/videoClipFilters'
import {
  isVideoLikeUrl,
  listPlayableTakes,
  resolveLiveTake,
  segmentHasPlayableVideo,
  type PlayableTake,
} from '@/lib/storyboard/mediaVersions'

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
  no_clip: 'Beats that are still waiting on a clip.',
}

const videoQualityLabels: Record<VideoQualityFilter, string> = {
  all: 'All',
  final: 'Final',
  draft: 'Draft',
}

const videoQualityTooltips: Record<VideoQualityFilter, string> = {
  all: 'Final and draft pre-vis frames.',
  final: 'Clips whose pre-vis frame is final.',
  draft: 'Clips whose pre-vis frame is a draft.',
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

function TakeVersionThumb({ version }: { version: PlayableTake }) {
  const thumb = version.thumbnailUrl?.trim()
  if (thumb && !isVideoLikeUrl(thumb)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={thumb} alt="" className="h-full w-full object-cover" />
    )
  }
  return (
    <video
      src={version.url}
      className="pointer-events-none h-full w-full object-cover"
      muted
      playsInline
      preload="metadata"
    />
  )
}

export interface BeatVideoClip {
  key: string
  beatId?: string
  beatNumber: number
  label: string
  prompt?: string
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
  onDirectBeat?: (beatId: string) => void
  /** Edit a completed clip. */
  onEditClip?: (segment: SceneSegment) => void
  /** Restore a stored take as the live clip. */
  onRestoreTake?: (segmentId: string, takeId: string) => void
  onOpenPreVis?: () => void
  generatingClipId?: string | null
  /** Shared beat selection with Direction, Audio, and Pre-Vis. */
  selectedBeatId?: string | null
  onSelectBeat?: (beatId: string) => void
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
}: BeatVideoGalleryProps) {
  const [selectedKey, setSelectedKey] = useState<string | null>(clips[0]?.key ?? null)
  const [attention, setAttention] = useState<VideoAttentionFilter>('all')
  const [quality, setQuality] = useState<VideoQualityFilter>('all')
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false)
  const [isPreviewFullscreen, setIsPreviewFullscreen] = useState(false)
  const previewVideoRef = useRef<HTMLVideoElement>(null)
  const previewStageRef = useRef<HTMLDivElement>(null)

  const clipFacts = useMemo<VideoClipFacts[]>(
    () =>
      clips.map((clip) => ({
        key: clip.key,
        status:
          clip.queueItem?.status === 'rendering'
            ? 'rendering'
            : clip.queueItem?.status === 'complete' || segmentHasPlayableVideo(clip.segment)
              ? 'complete'
              : clip.queueItem?.status === 'error'
                ? 'error'
                : 'queued',
        promptChanged: !!clip.promptChanged,
        imageTier: clip.imageTier,
      })),
    [clips]
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
  const previewStatus = clipStatus(preview?.queueItem)
  const previewSegment = preview?.segment
  const playableTakes = previewSegment
    ? listPlayableTakes(previewSegment.takes, previewSegment.activeAssetUrl)
    : []
  const liveTake = previewSegment
    ? resolveLiveTake(
        previewSegment.takes,
        previewSegment.currentTakeId,
        previewSegment.activeAssetUrl
      )
    : undefined
  const previewVideoUrl = liveTake?.url
  const previewHasClip = !!previewVideoUrl
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
          <p>No beats to generate yet.</p>
        </div>
      ) : (
        <SceneBeatStage
          railLabel="Beat clips"
          items={visibleClips.map((clip) => {
            const complete =
              clip.queueItem?.status === 'complete' || segmentHasPlayableVideo(clip.segment)
            return {
              id: clip.key,
              beatNumber: clip.beatNumber,
              imageUrl: clip.thumbnailUrl,
              status: complete ? 'ready' as const : clip.queueItem?.status === 'error' ? 'attention' as const : 'idle' as const,
              ariaLabel: clip.label || `Beat ${clip.beatNumber}`,
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
            <p className="px-1 text-[10px] font-medium uppercase tracking-wide text-slate-400">
              {previewVideoUrl ? 'Clip preview' : 'Start frame'}
            </p>
            <div
              ref={previewStageRef}
              className={cn(
                'relative w-full overflow-hidden rounded-lg border border-slate-700/40 bg-gray-800/50',
                isPreviewFullscreen && 'flex h-screen max-w-none items-center justify-center bg-black'
              )}
            >
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
                    'relative mx-auto w-[80%] bg-black',
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
                  label="Beat still"
                  generateTitle={previewHasClip ? 'Regenerate' : 'Generate video'}
                  directTitle="Direct Video"
                  directorTitle="Direct Beat"
                  uploadTitle="Upload"
                  uploadAccept="video/*"
                  className="w-full"
                  imageUrl={preview.thumbnailUrl}
                  imagePrompt={preview.prompt}
                  showControls
                  controlsVariant="comfortable"
                  alwaysShowControls
                  showBorder={false}
                  containMedia
                  isGenerating={generatingClipId === previewSegment.segmentId}
                  onGenerate={() => onGenerateClip?.(previewSegment)}
                  onDirect={onDirectVideo ? () => onDirectVideo(previewSegment) : undefined}
                  onDirector={
                    onDirectBeat && preview.beatId
                      ? () => onDirectBeat(preview.beatId)
                      : undefined
                  }
                  onUpload={(file) => onUpload?.(previewSegment.segmentId, file)}
                  onEdit={
                    onEditClip && previewHasClip
                      ? () => onEditClip(previewSegment)
                      : undefined
                  }
                />
              ) : (
                <div
                  className={cn(
                    'relative mx-auto w-[80%] bg-black',
                    aspectClass,
                    isPreviewFullscreen && 'h-screen max-h-none w-full'
                  )}
                >
                  {preview?.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={preview.thumbnailUrl} alt="" className="h-full w-full object-contain" />
                  ) : (
                    <div className="flex h-full min-h-[140px] flex-col items-center justify-center">
                      <Camera className="mb-2 h-8 w-8 text-gray-600" />
                      <span className="text-xs text-gray-500">No start frame</span>
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
                    const isCurrent =
                      version.id === previewSegment.currentTakeId || version.url === previewVideoUrl
                    return (
                      <button
                        key={version.id}
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          if (!isCurrent) onRestoreTake?.(previewSegment.segmentId, version.id)
                        }}
                        className={`relative h-8 w-12 shrink-0 overflow-hidden rounded border ${
                          isCurrent
                            ? 'border-cyan-400 ring-1 ring-cyan-400/60'
                            : 'border-slate-600 hover:border-slate-400'
                        }`}
                        title={`Restore version ${index + 1}`}
                      >
                        <TakeVersionThumb version={version} />
                        <span className="absolute bottom-0 right-0 bg-black/70 px-0.5 text-[8px] text-white">
                          v{index + 1}
                        </span>
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
                    {onGenerateClip && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 border-indigo-500/40 text-[10px] text-indigo-200"
                        onClick={() => onGenerateClip(previewSegment)}
                      >
                        <Wand2 className="mr-1 h-3 w-3" />
                        {previewHasClip ? 'Regenerate video' : 'Generate video'}
                      </Button>
                    )}
                    {onDirectBeat && preview.beatId && (
                      <button
                        type="button"
                        className="inline-flex h-7 items-center gap-1 rounded border border-teal-800/80 px-2 text-[11px] text-teal-200 hover:bg-teal-950/40"
                        onClick={() => onDirectBeat(preview.beatId!)}
                      >
                        <Clapperboard className="h-3.5 w-3.5" />
                        Direct Beat
                      </button>
                    )}
                    {onTake && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 text-[10px]"
                        onClick={() => onTake(previewSegment)}
                      >
                        <Settings2 className="mr-1 h-3 w-3" />
                        Take ({previewSegment.takes?.length || 1})
                      </Button>
                    )}
                    {onUpload && (
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
                    {onRetake && previewHasClip && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 border-indigo-500/40 text-[10px] text-indigo-200"
                        onClick={() => onRetake(previewSegment)}
                      >
                        Retake
                      </Button>
                    )}
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="shrink-0 rounded-full border border-slate-600/40 bg-slate-700/50 px-1.5 py-0.5 text-[10px] font-medium text-slate-300">
                    Beat {preview.beatNumber}
                  </span>
                  <p className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-200" title={preview.label}>
                    {preview.label}
                  </p>
                  {previewStatus && (
                    <span className={cn('rounded border px-1.5 py-0.5 text-[10px]', previewStatus.className)}>
                      {previewStatus.label}
                    </span>
                  )}
                  {preview.promptChanged && (
                    <span className="flex items-center gap-0.5 rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-300">
                      <AlertTriangle className="h-2.5 w-2.5" />
                      Prompt changed
                    </span>
                  )}
                  {preview.imageTier === 'final' && (
                    <span className="rounded-full bg-emerald-500/25 px-1.5 py-0.5 text-[10px] text-emerald-300">
                      Final
                    </span>
                  )}
                  {preview.imageTier === 'draft' && (
                    <span className="rounded-full bg-gray-500/25 px-1.5 py-0.5 text-[10px] text-gray-300">
                      Draft
                    </span>
                  )}
                </div>
                {preview.prompt?.trim() && (
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{preview.prompt.trim()}</p>
                )}
                {readOnlyPrompts && preview.segment && (
                  <p className="mt-1 text-[10px] text-slate-500">
                    Auto-derived from direction — use Direct Beat to change this clip's video prompt
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
