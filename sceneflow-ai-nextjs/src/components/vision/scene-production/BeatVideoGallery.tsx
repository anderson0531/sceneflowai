'use client'

import React, { useEffect, useState } from 'react'
import { Camera, Film, PlayCircle, Settings2, Upload, Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { SceneImageFrame } from '@/components/vision/SceneImageFrame'
import type { SceneSegment } from './types'
import type { DirectorQueueItem } from '@/hooks/useVideoQueue'

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
  thumbnailUrl?: string
  hasStartFrame: boolean
  segment?: SceneSegment
  queueItem?: DirectorQueueItem
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
  onPlay?: (segment: SceneSegment) => void
  onTake?: (segment: SceneSegment) => void
  onUpload?: (segmentId: string, file: File) => void
  onRetake?: (segment: SceneSegment) => void
  onGenerateClip?: (segment: SceneSegment) => void
  onOpenPreVis?: () => void
  /** Pre-Vis still actions for the selected beat image. */
  onRegenerateStill?: (beatId: string) => void
  onDirectStill?: (beatId: string) => void
  onDirectorStill?: (beatId: string) => void
  onUploadStill?: (beatId: string, file: File) => void
  onEditStill?: (beatId: string, imageUrl: string) => void
  generatingStillBeatId?: string | null
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
  onPlay,
  onTake,
  onUpload,
  onRetake,
  onGenerateClip,
  onOpenPreVis,
  onRegenerateStill,
  onDirectStill,
  onDirectorStill,
  onUploadStill,
  onEditStill,
  generatingStillBeatId,
}: BeatVideoGalleryProps) {
  const [selectedKey, setSelectedKey] = useState<string | null>(clips[0]?.key ?? null)

  useEffect(() => {
    if (clips.length === 0) {
      setSelectedKey(null)
      return
    }
    if (!clips.some((clip) => clip.key === selectedKey)) {
      setSelectedKey(clips[0].key)
    }
  }, [clips, selectedKey])

  const preview = clips.find((clip) => clip.key === selectedKey) ?? clips[0]
  const previewStatus = clipStatus(preview?.queueItem)
  const previewComplete = preview?.queueItem?.status === 'complete'
  const previewSegment = preview?.segment

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

      {clips.length === 0 ? (
        <div className="text-center py-6 text-gray-500 text-sm">
          <Film className="w-8 h-8 mx-auto mb-2 text-gray-600" />
          <p>No beats to generate yet.</p>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-0 top-0 bottom-0 w-[30%] grid grid-cols-2 content-start gap-2 overflow-y-auto overscroll-contain pr-1">
            {clips.map((clip) => {
              const complete = clip.queueItem?.status === 'complete'
              return (
                <button
                  key={clip.key}
                  type="button"
                  onClick={() => setSelectedKey(clip.key)}
                  className={cn(
                    'relative aspect-video overflow-hidden rounded border bg-slate-900 text-left',
                    selectedKey === clip.key
                      ? 'border-indigo-400 ring-2 ring-indigo-500/50'
                      : 'border-slate-700 hover:border-slate-500'
                  )}
                >
                  {clip.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={clip.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Film className="h-4 w-4 text-slate-600" />
                    </div>
                  )}
                  <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1 text-[10px] text-slate-200">
                    {clip.beatNumber}
                  </span>
                  {complete && (
                    <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-emerald-400" />
                  )}
                </button>
              )
            })}
          </div>

          <div className="ml-[calc(30%+0.75rem)] flex min-w-0 flex-col gap-2">
            <div className="overflow-hidden rounded-lg border border-slate-700/40 bg-gray-800/50">
              {preview?.beatId && (onRegenerateStill || onDirectStill || onDirectorStill || onUploadStill || onEditStill) ? (
                <SceneImageFrame
                  sceneIdx={0}
                  sceneNumber={preview.beatNumber}
                  label=""
                  imageUrl={preview.thumbnailUrl}
                  imagePrompt={preview.prompt}
                  showControls
                  controlsVariant="comfortable"
                  alwaysShowControls
                  showBorder={false}
                  isGenerating={generatingStillBeatId === preview.beatId}
                  onGenerate={() => onRegenerateStill?.(preview.beatId!)}
                  onDirect={onDirectStill ? () => onDirectStill(preview.beatId!) : undefined}
                  onDirector={onDirectorStill ? () => onDirectorStill(preview.beatId!) : undefined}
                  onUpload={(file) => onUploadStill?.(preview.beatId!, file)}
                  onEdit={
                    onEditStill && preview.thumbnailUrl
                      ? (url) => onEditStill(preview.beatId!, url)
                      : undefined
                  }
                />
              ) : (
                <div className={cn('relative bg-black', aspectClass)}>
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
            </div>

            {preview && (
              <div className="px-1 pb-1">
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
                </div>
                {preview.prompt?.trim() && (
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{preview.prompt.trim()}</p>
                )}
                {readOnlyPrompts && preview.segment && (
                  <p className="mt-1 text-[10px] text-slate-500">
                    Auto-derived from direction — edit script or Pre-Vis to change
                  </p>
                )}
                {!preview.hasStartFrame && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <p className="text-xs text-amber-300">Generate a start frame in Pre-Vis before this clip.</p>
                    {onOpenPreVis && (
                      <Button type="button" size="sm" variant="outline" className="h-7 text-[10px]" onClick={onOpenPreVis}>
                        Open Pre-Vis
                      </Button>
                    )}
                  </div>
                )}
                {previewSegment && preview.hasStartFrame && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {previewComplete && onPlay && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 text-[10px]"
                        onClick={() => onPlay(previewSegment)}
                      >
                        <PlayCircle className="mr-1 h-3 w-3" />
                        Play
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
                        {previewComplete ? 'Regenerate' : 'Generate'}
                      </Button>
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
                    {onRetake && previewComplete && previewSegment.assetType === 'video' && previewSegment.activeAssetUrl && (
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
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
