'use client'

import React, { useEffect, useState, type ComponentProps } from 'react'
import { Film, Share2 } from 'lucide-react'
import { FinalCutStreamsPanel, type FinalCutStreamsPanelProps } from './FinalCutStreamsPanel'
import { ScreeningRoomDashboard } from '@/components/screening-room/ScreeningRoomDashboard'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

const LS_SECTION_SCREENINGS = 'finalCut.section.screenings'

export type FinalCutMediaBrowserTab = 'streams' | 'share'

export interface FinalCutMediaBrowserProps {
  /** Streams panel props (selection + clips + handlers). */
  streamsPanelProps: FinalCutStreamsPanelProps
  className?: string
  /** Screenings (Share tab). */
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
      <Film className="w-8 h-8 text-violet-400/80 mx-auto" aria-hidden />
      <p className="text-sm font-semibold text-zinc-100">{title}</p>
      <p className="text-xs text-zinc-500 max-w-sm mx-auto leading-relaxed">{body}</p>
    </div>
  )
}

export function FinalCutMediaBrowser({
  streamsPanelProps,
  className,
  projectId,
  projectName,
  finalCutScreenings,
  screeningCredits = 100,
  onCreateScreening,
  onUploadExternal,
}: FinalCutMediaBrowserProps) {
  const [tab, setTab] = useState<FinalCutMediaBrowserTab>('streams')

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
        'flex flex-col min-h-0 rounded-xl border border-zinc-800/70 bg-zinc-950/45 backdrop-blur-md overflow-hidden',
        className
      )}
    >
      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as FinalCutMediaBrowserTab)}
        className="flex flex-col flex-1 min-h-0"
      >
        <div className="shrink-0 border-b border-white/[0.06] bg-zinc-950/55 px-2 pt-2">
          <TabsList className="flex w-full flex-wrap h-auto gap-1 p-1 bg-zinc-950/80 border border-zinc-700/50 rounded-lg justify-start">
            <TabsTrigger
              value="streams"
              className="text-xs font-medium gap-1.5 px-2.5 py-2 data-[state=active]:bg-violet-600 data-[state=active]:text-white rounded-md text-zinc-400"
            >
              <Film className="w-3.5 h-3.5 shrink-0" />
              Streams
            </TabsTrigger>
            <TabsTrigger
              value="share"
              className="text-xs font-medium gap-1.5 px-2.5 py-2 data-[state=active]:bg-violet-600 data-[state=active]:text-white rounded-md text-zinc-400"
            >
              <Share2 className="w-3.5 h-3.5 shrink-0" />
              Share
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="streams" className="flex-1 min-h-0 overflow-y-auto mt-0 data-[state=inactive]:hidden">
          <FinalCutStreamsPanel
            {...streamsPanelProps}
            embeddedInSection
            suppressOuterTitle
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
