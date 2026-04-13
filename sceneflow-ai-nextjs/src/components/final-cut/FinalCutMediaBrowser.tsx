'use client'

import React, { useEffect, useState, type ComponentProps } from 'react'
import { Film, Music, Type, Shuffle, Share2, Sparkles } from 'lucide-react'
import { FinalCutStreamsPanel } from './FinalCutStreamsPanel'
import { ScreeningRoomDashboard } from '@/components/screening-room/ScreeningRoomDashboard'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import type { FinalCutStream, ProductionFormat, ProductionLanguage } from '@/lib/types/finalCut'

const LS_SECTION_SCREENINGS = 'finalCut.section.screenings'

export type FinalCutMediaBrowserTab = 'media' | 'audio' | 'titles' | 'transitions' | 'share'

export interface FinalCutMediaBrowserProps {
  streams: FinalCutStream[]
  selectedStreamId: string | null
  onSelectStream: (streamId: string) => void
  onCreateStream: (language: ProductionLanguage, format: ProductionFormat) => Promise<void>
  disabled?: boolean
  productionHref?: string
  showProductionLink?: boolean
  className?: string
  /** Screenings (Share tab) */
  projectId?: string
  projectName?: string
  finalCutScreenings: NonNullable<ComponentProps<typeof ScreeningRoomDashboard>['finalCutScreenings']>
  screeningCredits?: number
  onCreateScreening: NonNullable<ComponentProps<typeof ScreeningRoomDashboard>['onCreateScreening']>
  onUploadExternal: NonNullable<ComponentProps<typeof ScreeningRoomDashboard>['onUploadExternal']>
}

function PlaceholderTab({ title, body }: { title: string; body: string }) {
  return (
    <div className="px-4 py-8 sm:px-5 text-center space-y-2">
      <Sparkles className="w-8 h-8 text-violet-400/80 mx-auto" aria-hidden />
      <p className="text-sm font-medium text-zinc-200">{title}</p>
      <p className="text-xs text-zinc-500 max-w-sm mx-auto leading-relaxed">{body}</p>
    </div>
  )
}

export function FinalCutMediaBrowser({
  streams,
  selectedStreamId,
  onSelectStream,
  onCreateStream,
  disabled = false,
  productionHref,
  showProductionLink = true,
  className,
  projectId,
  projectName,
  finalCutScreenings,
  screeningCredits = 100,
  onCreateScreening,
  onUploadExternal,
}: FinalCutMediaBrowserProps) {
  const [tab, setTab] = useState<FinalCutMediaBrowserTab>('media')

  useEffect(() => {
    try {
      const scr = localStorage.getItem(LS_SECTION_SCREENINGS)
      if (scr === 'true') setTab('share')
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(LS_SECTION_SCREENINGS, tab === 'share' ? 'true' : 'false')
    } catch {
      /* ignore */
    }
  }, [tab])

  return (
    <div
      className={cn(
        'flex flex-col min-h-0 rounded-xl border border-slate-700/60 bg-slate-900/40 overflow-hidden',
        className
      )}
    >
      <Tabs value={tab} onValueChange={(v) => setTab(v as FinalCutMediaBrowserTab)} className="flex flex-col flex-1 min-h-0">
        <div className="shrink-0 border-b border-white/[0.06] bg-slate-900/60 px-2 pt-2">
          <TabsList className="flex w-full flex-wrap h-auto gap-1 p-1 bg-slate-900/90 border border-slate-600/60 rounded-lg justify-start">
            <TabsTrigger
              value="media"
              className="text-[11px] sm:text-xs gap-1.5 px-2.5 py-2 data-[state=active]:bg-purple-600 data-[state=active]:text-white rounded-md"
            >
              <Film className="w-3.5 h-3.5 shrink-0" />
              Media
            </TabsTrigger>
            <TabsTrigger
              value="audio"
              className="text-[11px] sm:text-xs gap-1.5 px-2.5 py-2 data-[state=active]:bg-slate-700 data-[state=active]:text-white rounded-md text-slate-400"
            >
              <Music className="w-3.5 h-3.5 shrink-0" />
              Audio
            </TabsTrigger>
            <TabsTrigger
              value="titles"
              className="text-[11px] sm:text-xs gap-1.5 px-2.5 py-2 data-[state=active]:bg-slate-700 data-[state=active]:text-white rounded-md text-slate-400"
            >
              <Type className="w-3.5 h-3.5 shrink-0" />
              Titles
            </TabsTrigger>
            <TabsTrigger
              value="transitions"
              className="text-[11px] sm:text-xs gap-1.5 px-2.5 py-2 data-[state=active]:bg-slate-700 data-[state=active]:text-white rounded-md text-slate-400"
            >
              <Shuffle className="w-3.5 h-3.5 shrink-0" />
              Transitions
            </TabsTrigger>
            <TabsTrigger
              value="share"
              className="text-[11px] sm:text-xs gap-1.5 px-2.5 py-2 data-[state=active]:bg-indigo-600 data-[state=active]:text-white rounded-md text-slate-400"
            >
              <Share2 className="w-3.5 h-3.5 shrink-0" />
              Share
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="media" className="flex-1 min-h-0 overflow-y-auto mt-0 data-[state=inactive]:hidden">
          <FinalCutStreamsPanel
            streams={streams}
            selectedStreamId={selectedStreamId}
            onSelectStream={onSelectStream}
            onCreateStream={onCreateStream}
            disabled={disabled}
            productionHref={productionHref}
            showProductionLink={showProductionLink}
            suppressOuterTitle
            embeddedInSection
          />
        </TabsContent>

        <TabsContent value="audio" className="flex-1 min-h-0 mt-0 data-[state=inactive]:hidden">
          <PlaceholderTab
            title="Audio browser"
            body="Browse music, SFX, and voice tracks here in a future update. Use Production for dialogue and stems today."
          />
        </TabsContent>

        <TabsContent value="titles" className="flex-1 min-h-0 mt-0 data-[state=inactive]:hidden">
          <PlaceholderTab
            title="Titles & backgrounds"
            body="Lower thirds, credits, and generators will live here. Coming soon."
          />
        </TabsContent>

        <TabsContent value="transitions" className="flex-1 min-h-0 mt-0 data-[state=inactive]:hidden">
          <PlaceholderTab
            title="Transitions library"
            body="Drag transitions from a shared library onto edit points. Scene transitions are available from the timeline inspector and Production."
          />
        </TabsContent>

        <TabsContent value="share" className="flex-1 min-h-0 overflow-y-auto mt-0 data-[state=inactive]:hidden">
          {projectId ? (
            <div className="p-4 sm:p-5">
              <ScreeningRoomDashboard
                variant="finalCutOnly"
                hideFinalCutChrome
                projectId={projectId}
                projectName={projectName}
                finalCutScreenings={finalCutScreenings}
                screeningCredits={screeningCredits}
                onCreateScreening={onCreateScreening}
                onUploadExternal={onUploadExternal}
              />
            </div>
          ) : (
            <PlaceholderTab
              title="Screenings"
              body="Open a saved project to create and manage screenings from Final Cut."
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
