'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/checkbox'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Film, Loader, Zap } from 'lucide-react'
import { StatusFilterBar } from '@/components/vision/StatusFilterBar'
import { StoryboardQualityToggle } from './StoryboardQualityToggle'
import { StoryboardGenerationModeToggle } from './StoryboardGenerationModeToggle'
import {
  estimateVideoAgentCredits,
  type VideoGenerationMode,
  type VideoGenerationQuality,
} from '@/lib/video/videoGenerationPolicy'
import type { StillGenerationMode } from '@/lib/generation/stillPolicy'
import {
  videoMatchesFilters,
  type VideoAttentionFilter,
  type VideoClipFacts,
} from '@/lib/vision/videoClipFilters'

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

function numberedShotLine(number: number, description: string): { visible: string; full: string } {
  const full = description.replace(/\s+/g, ' ').trim()
  const body = full.length > 48 ? `${full.slice(0, 48)}…` : full
  return { visible: body ? `${number}: ${body}` : String(number), full }
}

export type VideoAgentScope = 'missing' | 'selected'

export interface VideoAgentConfirmOptions {
  scope: VideoAgentScope
  selectedSegmentIds: string[]
  quality: VideoGenerationQuality
  generationMode: VideoGenerationMode
}

export interface VideoAgentBeatOption {
  segmentId: string
  sequenceIndex: number
  /** Full shot description. The row shows a numbered, truncated line. */
  description?: string
  hasVideo: boolean
  isRendering: boolean
  hasError: boolean
  eligible: boolean
  promptChanged?: boolean
  imageTier?: 'draft' | 'final'
}

interface VideoAgentConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  beats: VideoAgentBeatOption[]
  isRunning?: boolean
  onConfirm: (options: VideoAgentConfirmOptions) => void
  defaultQuality?: VideoGenerationQuality
  defaultGenerationMode?: VideoGenerationMode
}

function clipFacts(beat: VideoAgentBeatOption): VideoClipFacts {
  return {
    key: beat.segmentId,
    status: beat.isRendering
      ? 'rendering'
      : beat.hasVideo
        ? 'complete'
        : beat.hasError
          ? 'error'
          : 'queued',
    promptChanged: !!beat.promptChanged,
    imageTier: beat.imageTier,
  }
}

function beatEligibleForScope(beat: VideoAgentBeatOption, scope: VideoAgentScope): boolean {
  if (!beat.eligible || beat.isRendering) return false
  if (scope === 'missing') return !beat.hasVideo
  return true
}

export function VideoAgentConfirmDialog({
  open,
  onOpenChange,
  beats,
  isRunning = false,
  onConfirm,
  defaultQuality = 'draft',
  defaultGenerationMode = 'standard',
}: VideoAgentConfirmDialogProps) {
  const t = useTranslations('production.videoAgent')
  const tCommon = useTranslations('common')
  const [scope, setScope] = useState<VideoAgentScope>('missing')
  const [quality, setQuality] = useState<VideoGenerationQuality>(defaultQuality)
  const [generationMode, setGenerationMode] =
    useState<VideoGenerationMode>(defaultGenerationMode)
  const [selectedSegmentIds, setSelectedSegmentIds] = useState<string[]>([])
  const [clipAttention, setClipAttention] = useState<VideoAttentionFilter>('all')

  useEffect(() => {
    if (!open) return
    setScope('missing')
    setQuality(defaultQuality)
    setGenerationMode(defaultGenerationMode)
    setClipAttention('all')
  }, [open, defaultQuality, defaultGenerationMode])

  const checklistBeats = useMemo(
    () => beats.filter((beat) => beat.eligible),
    [beats]
  )

  const clipFilterActive = clipAttention !== 'all'

  useEffect(() => {
    if (!open) return
    const selected = checklistBeats
      .filter((beat) =>
        clipFilterActive
          ? videoMatchesFilters(clipFacts(beat), clipAttention, 'all')
          : beatEligibleForScope(beat, scope)
      )
      .map((beat) => beat.segmentId)
    setSelectedSegmentIds(selected)
  }, [open, scope, checklistBeats, clipAttention, clipFilterActive])

  const selectedSet = useMemo(() => new Set(selectedSegmentIds), [selectedSegmentIds])

  const toggleBeat = (segmentId: string, checked: boolean) => {
    setSelectedSegmentIds((prev) => {
      if (checked) return prev.includes(segmentId) ? prev : [...prev, segmentId]
      return prev.filter((id) => id !== segmentId)
    })
  }

  const creditTotal = estimateVideoAgentCredits({
    count: selectedSegmentIds.length,
    quality,
    mode: generationMode,
  })
  const nothingSelected = selectedSegmentIds.length === 0
  const scopeBeats = checklistBeats.filter((beat) => beatEligibleForScope(beat, scope) || scope === 'selected')
  const visibleBeats = clipFilterActive
    ? checklistBeats.filter((beat) => videoMatchesFilters(clipFacts(beat), clipAttention, 'all'))
    : scopeBeats

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-gray-900 border-gray-700 text-gray-100">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-200">
            <Zap className="w-5 h-5" />
            {t('title')}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            {t('description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
              {t('quality')}
            </p>
            <StoryboardQualityToggle
              value={quality}
              onChange={setQuality}
              draftLabel={t('qualityDraft')}
              finalLabel={t('qualityFinal')}
              disabled={isRunning}
              ariaLabel="Video generation quality"
            />
            <p className="text-[11px] text-emerald-200/70 mt-2">
              {quality === 'final' ? t('qualityFinalHint') : t('qualityDraftHint')}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
              {t('generationMode')}
            </p>
            <StoryboardGenerationModeToggle
              value={generationMode}
              onChange={(mode: StillGenerationMode) => setGenerationMode(mode)}
              standardLabel={t('modeStandard')}
              creativeLabel={t('modeCreative')}
              disabled={isRunning}
              ariaLabel="Video generation mode"
            />
            <p className="text-[11px] text-teal-200/70 mt-2">
              {generationMode === 'creative' ? t('modeCreativeHint') : t('modeStandardHint')}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
              {t('scope')}
            </p>
            <div className="inline-flex rounded-md border border-amber-600/40 overflow-hidden">
              {(['missing', 'selected'] as VideoAgentScope[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  disabled={isRunning}
                  onClick={() => {
                    setClipAttention('all')
                    setScope(value)
                  }}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                    scope === value
                      ? 'bg-amber-600 text-white'
                      : 'bg-transparent text-amber-200/80 hover:bg-amber-900/30'
                  }`}
                >
                  {value === 'selected' ? t('scopeRegenerate') : t('scopeMissing')}
                </button>
              ))}
            </div>
            {scope === 'selected' && (
              <p className="text-[11px] text-amber-200/70 mt-2">
                {t('scopeRegenerateHint')}
              </p>
            )}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  {t('beats')}
                </p>
                {scope === 'selected' && (
                  <button
                    type="button"
                    disabled={isRunning || selectedSegmentIds.length === 0}
                    onClick={() => setSelectedSegmentIds([])}
                    className="text-[11px] font-medium text-amber-200/80 hover:text-amber-100 disabled:pointer-events-none disabled:opacity-40"
                  >
                    {t('clearSelections')}
                  </button>
                )}
              </div>
              <StatusFilterBar
                activeSummary={clipAttention === 'all' ? '' : videoShowLabels[clipAttention]}
                onClear={() => setClipAttention('all')}
                groups={[
                  {
                    label: 'Show',
                    onSelect: (id) => setClipAttention(id as VideoAttentionFilter),
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
                      active: clipAttention === id,
                      count:
                        id === 'all'
                          ? checklistBeats.length
                          : checklistBeats.filter((beat) =>
                              videoMatchesFilters(clipFacts(beat), id, 'all')
                            ).length,
                    })),
                  },
                ]}
              />
            </div>
            {checklistBeats.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">
                {t('noBeats')}
              </p>
            ) : visibleBeats.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">
                {t('filterEmpty')}
              </p>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                {visibleBeats.map((beat) => {
                  const line = numberedShotLine(
                    beat.sequenceIndex + 1,
                    beat.description?.trim() || t('beatLabel', { number: beat.sequenceIndex + 1 })
                  )
                  return (
                  <label
                    key={beat.segmentId}
                    className="flex items-start gap-2 rounded border border-gray-700/80 bg-gray-800/40 p-2 cursor-pointer hover:bg-gray-800/70"
                  >
                    <Checkbox
                      checked={selectedSet.has(beat.segmentId)}
                      onCheckedChange={(checked) =>
                        toggleBeat(beat.segmentId, checked === true)
                      }
                      disabled={
                        isRunning ||
                        beat.isRendering ||
                        (!clipFilterActive && !beatEligibleForScope(beat, scope))
                      }
                      className="mt-0.5"
                    />
                    <span className="min-w-0 flex-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="flex items-center gap-1.5 text-sm text-gray-100 truncate">
                              <Film className="w-3.5 h-3.5 shrink-0 text-amber-300/80" />
                              {line.visible}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-sm bg-gray-900 text-white border border-gray-700">
                            {line.full}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <span
                        className={`text-[10px] ${
                          beat.isRendering
                            ? 'text-indigo-300'
                            : beat.hasVideo
                              ? 'text-green-400'
                              : beat.hasError
                                ? 'text-rose-400'
                                : 'text-amber-400'
                        }`}
                      >
                        {beat.isRendering
                          ? t('rendering')
                          : beat.hasVideo
                            ? t('hasVideo')
                            : beat.hasError
                              ? t('failed')
                              : t('missing')}
                      </span>
                    </span>
                  </label>
                  )
                })}
              </div>
            )}
            {selectedSegmentIds.length > 0 && (
              <p className="text-[11px] text-amber-300/60 mt-2">
                {t('videoCredits', {
                  credits: creditTotal,
                  count: selectedSegmentIds.length,
                })}
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isRunning}
          >
            {tCommon('actions.cancel')}
          </Button>
          <Button
            type="button"
            onClick={() =>
              onConfirm({
                scope,
                selectedSegmentIds,
                quality,
                generationMode,
              })
            }
            disabled={isRunning || nothingSelected}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            {isRunning ? (
              <>
                <Loader className="w-4 h-4 mr-2 animate-spin" />
                {t('running')}
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                {t('confirm')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
