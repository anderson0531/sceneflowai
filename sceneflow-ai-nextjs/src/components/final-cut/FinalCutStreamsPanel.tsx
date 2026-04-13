'use client'

import React, { useMemo, useState, useCallback } from 'react'
import {
  Film,
  Clapperboard,
  Video as VideoIcon,
  Plus,
  Check,
  Clock,
  Layers,
  ExternalLink,
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import type { FinalCutStream, ProductionFormat, ProductionLanguage } from '@/lib/types/finalCut'
import { FORMAT_CONFIGS, LANGUAGE_CONFIGS } from '@/lib/types/finalCut'
import { FLAG_EMOJIS } from '@/constants/languages'
import { GroupedLanguageSelector } from '@/components/vision/GroupedLanguageSelector'

export interface FinalCutStreamsPanelProps {
  streams: FinalCutStream[]
  selectedStreamId: string | null
  onSelectStream: (streamId: string) => void
  onCreateStream: (language: ProductionLanguage, format: ProductionFormat) => Promise<void>
  disabled?: boolean
  /** Vision / Production hub for scene renders and segment work */
  productionHref?: string
  showProductionLink?: boolean
  /** Hide the large “Final Cut Streams” title when the page supplies a section header */
  suppressOuterTitle?: boolean
  /** Inside a parent card: drop duplicate border/background */
  embeddedInSection?: boolean
}

function streamDurationSec(stream: FinalCutStream): number {
  if (stream.scenes.length === 0) return 0
  return Math.max(...stream.scenes.map((s) => s.endTime), 0)
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function FinalCutStreamsPanel({
  streams,
  selectedStreamId,
  onSelectStream,
  onCreateStream,
  disabled = false,
  productionHref,
  showProductionLink = true,
  suppressOuterTitle = false,
  embeddedInSection = false,
}: FinalCutStreamsPanelProps) {
  const [tab, setTab] = useState<'animatic' | 'full-video'>('full-video')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newLanguage, setNewLanguage] = useState<ProductionLanguage>('en')
  const [newFormat, setNewFormat] = useState<ProductionFormat>('full-video')
  const [isCreating, setIsCreating] = useState(false)

  const animaticStreams = useMemo(
    () => streams.filter((s) => s.format === 'animatic'),
    [streams]
  )
  const videoStreams = useMemo(
    () => streams.filter((s) => s.format === 'full-video'),
    [streams]
  )

  const currentList = tab === 'animatic' ? animaticStreams : videoStreams

  const sortedList = useMemo(() => {
    return [...currentList].sort((a, b) => {
      const lang = a.language.localeCompare(b.language)
      if (lang !== 0) return lang
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    })
  }, [currentList])

  const handleCreate = useCallback(async () => {
    setIsCreating(true)
    try {
      await onCreateStream(newLanguage, newFormat)
      setShowCreateDialog(false)
    } catch (e) {
      console.error(e)
    } finally {
      setIsCreating(false)
    }
  }, [onCreateStream, newLanguage, newFormat])

  return (
    <div
      className={cn(
        'space-y-4',
        embeddedInSection
          ? 'px-4 py-4 sm:px-5 sm:py-5'
          : 'rounded-xl border border-slate-700/60 bg-slate-900/40 p-4 sm:p-5'
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-2 min-w-0">
          {!suppressOuterTitle ? (
            <Film className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" aria-hidden />
          ) : null}
          <div className="min-w-0">
            {!suppressOuterTitle ? (
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm font-semibold text-white tracking-tight">Final Cut streams</h2>
                {streams.length > 0 && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-purple-500/20 text-purple-200 rounded-md border border-purple-500/25">
                    {streams.length} total
                  </span>
                )}
              </div>
            ) : null}
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Assembly timelines by language and format. For new scene renders and segment edits, use Production
              (Vision). Select a stream to edit assembly in the mixer below.
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
          {showProductionLink && productionHref ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={disabled}
              className="border-purple-500/40 text-purple-200 hover:bg-purple-500/10"
              asChild
            >
              <Link href={productionHref}>
                <ExternalLink className="w-4 h-4 mr-2" />
                Open Production
              </Link>
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={disabled}
            className="border-purple-500/40 text-purple-200 hover:bg-purple-500/10 shrink-0"
            onClick={() => setShowCreateDialog(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add assembly stream
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as 'animatic' | 'full-video')} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 h-10 p-1 bg-slate-900/80 border border-slate-600/80 rounded-lg">
          <TabsTrigger
            value="animatic"
            className="gap-2 data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=inactive]:text-slate-400 rounded-md text-xs sm:text-sm"
          >
            <Clapperboard className="w-4 h-4" />
            Animatic
            <span className="text-[10px] opacity-80 tabular-nums">({animaticStreams.length})</span>
          </TabsTrigger>
          <TabsTrigger
            value="full-video"
            className="gap-2 data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=inactive]:text-slate-400 rounded-md text-xs sm:text-sm"
          >
            <VideoIcon className="w-4 h-4" />
            Video
            <span className="text-[10px] opacity-80 tabular-nums">({videoStreams.length})</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex items-center gap-2 text-xs text-slate-400">
        {tab === 'animatic' ? (
          <>
            <Clapperboard className="w-3.5 h-3.5 text-purple-400" />
            <span>
              Showing <span className="text-purple-200 font-medium">Animatic</span> assembly streams
            </span>
          </>
        ) : (
          <>
            <VideoIcon className="w-3.5 h-3.5 text-indigo-400" />
            <span>
              Showing <span className="text-indigo-200 font-medium">Video</span> assembly streams
            </span>
          </>
        )}
      </div>

      {sortedList.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {sortedList.map((stream) => {
            const selected = stream.id === selectedStreamId
            const dur = streamDurationSec(stream)
            return (
              <button
                key={stream.id}
                type="button"
                disabled={disabled}
                onClick={() => onSelectStream(stream.id)}
                className={cn(
                  'text-left rounded-xl border p-4 transition-all',
                  selected
                    ? 'border-violet-500 bg-violet-500/10 ring-1 ring-violet-500/30'
                    : 'border-slate-700 bg-slate-800/40 hover:border-slate-600 hover:bg-slate-800/70'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-lg shrink-0">{FLAG_EMOJIS[stream.language] ?? '🌐'}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{stream.name}</p>
                      <p className="text-[11px] text-slate-500 capitalize mt-0.5">{stream.status.replace('-', ' ')}</p>
                    </div>
                  </div>
                  {selected && <Check className="w-4 h-4 text-violet-400 shrink-0" />}
                </div>
                <div className="flex items-center gap-3 mt-3 text-[11px] text-slate-400">
                  <span className="inline-flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5" />
                    {stream.scenes.length} scenes
                  </span>
                  <span className="inline-flex items-center gap-1 tabular-nums">
                    <Clock className="w-3.5 h-3.5" />
                    {formatDuration(dur)}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      ) : (
        <div
          className={cn(
            'rounded-lg border p-6 text-center text-sm',
            tab === 'animatic'
              ? 'border-purple-700/40 bg-purple-950/20 text-purple-200/80'
              : 'border-indigo-700/40 bg-indigo-950/20 text-indigo-200/80'
          )}
        >
          No {tab === 'animatic' ? 'Animatic' : 'Video'} streams yet. Use <strong>Add assembly stream</strong> or refine
          scenes in Production.
        </div>
      )}

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-700 text-zinc-100">
          <DialogHeader>
            <DialogTitle>Add assembly stream</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Add a language and format for this project&apos;s assembly timeline. For new scene renders, use Open
              Production.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Language</Label>
              <GroupedLanguageSelector
                value={newLanguage}
                onValueChange={(code) => setNewLanguage(code as ProductionLanguage)}
                size="md"
                className="w-full bg-zinc-800 border-zinc-700"
              />
            </div>
            <div className="space-y-2">
              <Label>Format</Label>
              <div className="grid grid-cols-2 gap-3">
                {(Object.keys(FORMAT_CONFIGS) as ProductionFormat[]).map((format) => {
                  const config = FORMAT_CONFIGS[format]
                  return (
                    <button
                      key={format}
                      type="button"
                      onClick={() => setNewFormat(format)}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-lg border transition-colors text-left',
                        newFormat === format
                          ? 'border-violet-500 bg-violet-500/10'
                          : 'border-zinc-700 hover:border-zinc-600 bg-zinc-800/50'
                      )}
                    >
                      {format === 'full-video' ? (
                        <Film className="w-6 h-6 text-indigo-400" />
                      ) : (
                        <Clapperboard className="w-6 h-6 text-purple-400" />
                      )}
                      <div>
                        <div className="font-medium text-zinc-200">{config.name}</div>
                        <div className="text-xs text-zinc-500">{config.description}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700">
              <Label className="text-xs text-zinc-500">Stream name</Label>
              <p className="text-zinc-200 text-sm">
                {LANGUAGE_CONFIGS[newLanguage].name} ({FORMAT_CONFIGS[newFormat].name})
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreateDialog(false)} disabled={isCreating}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isCreating} className="bg-violet-600 hover:bg-violet-500">
              {isCreating ? 'Creating…' : 'Add stream'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
