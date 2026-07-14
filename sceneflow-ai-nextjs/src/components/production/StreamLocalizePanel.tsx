'use client'

import React, { useEffect, useMemo } from 'react'
import { Coins, Loader2, Mic, Sparkles, Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import {
  clampStreamLocalizeSpeed,
  readScriptScenesFromProject,
} from '@/lib/streams/streamLocalize'
import {
  getLocalizeState,
  type ProjectStream,
  type StreamLocalizeMode,
  type StreamStemMode,
} from '@/lib/streams/projectStreams'
import { useStreamLocalize } from '@/hooks/streams/useStreamLocalize'
import type { SceneProductionData } from '@/components/vision/scene-production/types'
import type { FinalCutSelection } from '@/lib/types/finalCut'

export interface StreamLocalizePanelProps {
  projectId: string
  projectTitle?: string
  script?: unknown
  metadata: unknown
  stream: ProjectStream
  allStreams: ProjectStream[]
  sceneProductionState: Record<string, SceneProductionData>
  finalCutSelection: FinalCutSelection
  onSaveStreams: (
    streams: ProjectStream[],
    compat?: { exportedVideoUrl?: string; exportedAnimaticUrl?: string }
  ) => Promise<void>
  onPersistSceneProduction: (
    sceneId: string,
    updater: (current: SceneProductionData | undefined) => SceneProductionData | undefined
  ) => void
  reloadSceneProduction: () => Promise<Record<string, SceneProductionData>>
}

function sceneStatusLabel(status: string): string {
  if (status === 'complete') return 'Complete'
  if (status === 'rendering') return 'Rendering'
  if (status === 'lipsyncing' || status.startsWith('lipsyncing:')) return 'Lip-syncing'
  if (status === 'preparing-stems') return 'Preparing stems'
  if (status === 'skipped') return 'Skipped'
  if (status === 'error') return 'Error'
  return status
}

function localizeStatusBadge(status: string | undefined): string {
  const styles: Record<string, string> = {
    idle: 'bg-zinc-700/60 text-zinc-300',
    preparing: 'bg-amber-500/15 text-amber-200',
    lipsyncing: 'bg-violet-500/15 text-violet-200',
    rendering: 'bg-amber-500/15 text-amber-200',
    stitching: 'bg-cyan-500/15 text-cyan-200',
    ready: 'bg-emerald-500/15 text-emerald-200',
    error: 'bg-red-500/15 text-red-200',
  }
  return styles[String(status)] || styles.idle
}

export function StreamLocalizePanel({
  projectId,
  projectTitle,
  script,
  metadata,
  stream,
  allStreams,
  sceneProductionState,
  finalCutSelection,
  onSaveStreams,
  onPersistSceneProduction,
  reloadSceneProduction,
}: StreamLocalizePanelProps) {
  const persisted = getLocalizeState(stream)
  const {
    running,
    localizeDraft,
    setMode,
    setSpeed,
    setStemMode,
    runLocalize,
    estimatedLipsyncCredits,
  } = useStreamLocalize({
    projectId,
    projectTitle,
    script,
    metadata,
    stream,
    allStreams,
    sceneProductionState,
    finalCutSelection,
    onSaveStreams,
    onPersistSceneProduction,
    reloadSceneProduction,
  })

  useEffect(() => {
    if (!running) {
      setMode(persisted.mode)
      setSpeed(persisted.speed)
      setStemMode(persisted.stemMode)
    }
  }, [persisted.mode, persisted.speed, persisted.stemMode, running, setMode, setSpeed, setStemMode])

  const scriptScenes = useMemo(() => readScriptScenesFromProject(script), [script])
  const activeLocalize = running ? localizeDraft : persisted

  const tier: StreamLocalizeMode = localizeDraft.mode === 'off' ? 'dub' : localizeDraft.mode

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium mr-1">
          Tier
        </span>
        <Button
          size="sm"
          type="button"
          variant={tier === 'dub' ? 'default' : 'outline'}
          className={cn(
            tier === 'dub'
              ? 'bg-violet-600 hover:bg-violet-500 text-white'
              : 'border-zinc-700 text-zinc-200'
          )}
          disabled={running}
          onClick={() => setMode('dub')}
        >
          <Volume2 className="w-3.5 h-3.5 mr-1.5" />
          Dub
        </Button>
        <Button
          size="sm"
          type="button"
          variant={tier === 'lipsync' ? 'default' : 'outline'}
          className={cn(
            tier === 'lipsync'
              ? 'bg-violet-600 hover:bg-violet-500 text-white'
              : 'border-zinc-700 text-zinc-200'
          )}
          disabled={running}
          onClick={() => setMode('lipsync')}
        >
          <Mic className="w-3.5 h-3.5 mr-1.5" />
          Lip-sync
        </Button>
        {tier === 'lipsync' ? (
          <span className="inline-flex items-center gap-1 text-xs text-amber-200/90 ml-1">
            <Coins className="w-3.5 h-3.5" />
            ~{estimatedLipsyncCredits} credits
          </span>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-3">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs text-zinc-300">Global dialogue speed</span>
            <span className="text-xs font-mono text-violet-300">
              {clampStreamLocalizeSpeed(localizeDraft.speed).toFixed(2)}×
            </span>
          </div>
          <input
            type="range"
            min={0.5}
            max={1.5}
            step={0.05}
            value={localizeDraft.speed}
            disabled={running}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="w-full accent-violet-500"
          />
          <p className="text-[11px] text-zinc-500 mt-1.5">Adjust dubbed dialogue playback rate (0.5–1.5×).</p>
        </div>

        <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-zinc-300">Keep original background</p>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Remove on-video voice only; keep SFX/music via stem separation.
              </p>
            </div>
            <Switch
              checked={localizeDraft.stemMode === 'keep-background'}
              disabled={running}
              onCheckedChange={(checked) =>
                setStemMode((checked ? 'keep-background' : 'mute-all') as StreamStemMode)
              }
            />
          </div>
          {localizeDraft.stemMode === 'keep-background' ? (
            <p className="text-[11px] text-amber-300/80 mt-2">
              If stem separation is unavailable, segments fall back to full mute.
            </p>
          ) : null}
        </div>
      </div>

      <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/30 overflow-hidden">
        <div className="px-3 py-2 border-b border-zinc-800/80 flex items-center justify-between gap-2">
          <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium">
            Scene progress
          </span>
          <span
            className={cn(
              'text-[10px] uppercase tracking-wider px-2 py-0.5 rounded',
              localizeStatusBadge(activeLocalize.status)
            )}
          >
            {activeLocalize.status}
          </span>
        </div>
        <ul className="divide-y divide-zinc-800/60 max-h-48 overflow-y-auto">
          {scriptScenes.map(({ sceneId, sceneNumber, scene }) => {
            const sceneStatus = activeLocalize.sceneStatuses?.[sceneId]
            const heading =
              typeof (scene as { heading?: unknown }).heading === 'string'
                ? (scene as { heading: string }).heading
                : `Scene ${sceneNumber}`
            return (
              <li key={sceneId} className="px-3 py-2 flex items-center justify-between gap-2 text-xs">
                <span className="text-zinc-300 truncate">{heading}</span>
                <span
                  className={cn(
                    'shrink-0 text-[10px] uppercase tracking-wide',
                    sceneStatus?.status === 'complete'
                      ? 'text-emerald-300'
                      : sceneStatus?.error
                        ? 'text-red-300'
                        : 'text-zinc-500'
                  )}
                >
                  {sceneStatus
                    ? sceneStatusLabel(sceneStatus.status)
                    : activeLocalize.status === 'idle'
                      ? 'Pending'
                      : '—'}
                </span>
              </li>
            )
          })}
        </ul>
      </div>

      {activeLocalize.error ? (
        <p className="text-xs text-red-300">{activeLocalize.error}</p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          className="bg-sf-primary hover:bg-sf-accent text-white"
          disabled={running || scriptScenes.length === 0}
          onClick={() => void runLocalize()}
        >
          {running ? (
            <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4 mr-1.5" />
          )}
          {running
            ? 'Localizing…'
            : activeLocalize.status === 'ready'
              ? 'Re-run localize'
              : 'Run localize'}
        </Button>
        {activeLocalize.status === 'ready' && stream.mp4Url ? (
          <span className="text-xs text-emerald-300">Master updated — Preview or Publish above.</span>
        ) : null}
      </div>
    </div>
  )
}
