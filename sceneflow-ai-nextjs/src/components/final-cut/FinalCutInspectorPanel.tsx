'use client'

import React from 'react'
import Link from 'next/link'
import { ExternalLink, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FinalCutSceneClip } from '@/lib/types/finalCut'
import { RenderFinalCutButton } from './RenderFinalCutButton'

export interface FinalCutInspectorPanelProps {
  /** Resolved clips (scene-level). */
  clips: FinalCutSceneClip[]
  /** Currently selected scene id, when any. */
  selectedSceneId: string | null
  /** Project id used to scope render output filenames. */
  projectId: string | undefined
  /** Vision/Production hub for the project (link target). */
  productionVisionHref?: string
  /** Saved last render URL (e.g. `metadata.exportedVideoUrl`). */
  lastRenderUrl?: string | null
  /** Whether the page is busy with a save / network operation. */
  isProcessing?: boolean
  /** Callback after Render Final Cut completes (persist `exportedVideoUrl`). */
  onRendered?: (url: string) => Promise<void> | void
  /** Used for filename and to scope downloads. */
  filenameLabel?: string
  /** Format helper. */
  formatTime: (seconds: number) => string
  /** Disabled state. */
  disabled?: boolean
}

function StatusRow({ status }: { status: FinalCutSceneClip['status'] }) {
  if (status === 'ready') {
    return (
      <p className="inline-flex items-center gap-1.5 text-[11px] text-emerald-300">
        <CheckCircle2 className="w-3.5 h-3.5" /> Ready
      </p>
    )
  }
  if (status === 'pending') {
    return (
      <p className="inline-flex items-center gap-1.5 text-[11px] text-amber-300">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Render in progress
      </p>
    )
  }
  return (
    <p className="inline-flex items-center gap-1.5 text-[11px] text-rose-300">
      <AlertTriangle className="w-3.5 h-3.5" /> Not rendered yet
    </p>
  )
}

/**
 * Read-only inspector for the Final Cut viewer.
 *
 * Provides scene metadata, an "Open in Production" link for any editing, the
 * last render URL (if any), and the single Render Final Cut action. No master
 * volume, no transition / overlay edits.
 */
export function FinalCutInspectorPanel({
  clips,
  selectedSceneId,
  projectId,
  productionVisionHref,
  lastRenderUrl,
  isProcessing = false,
  onRendered,
  filenameLabel,
  formatTime,
  disabled = false,
}: FinalCutInspectorPanelProps) {
  const scene = selectedSceneId ? clips.find((c) => c.sceneId === selectedSceneId) ?? null : null

  return (
    <div
      className={cn(
        'shrink-0 w-full sm:max-w-none lg:w-64 xl:w-72 border-white/[0.08] bg-zinc-950/50 backdrop-blur-md overflow-y-auto',
        'border-t lg:border-t-0 lg:border-l max-h-[40vh] lg:max-h-none'
      )}
    >
      <div className="p-3 sm:p-4 space-y-5">
        <div>
          <h3 className="text-sm font-semibold tracking-tight text-white mb-1">Inspector</h3>
          <p className="text-[11px] text-zinc-500 uppercase tracking-wider">Program & timeline</p>
        </div>

        <div className="pb-4 border-b border-zinc-800/80 space-y-3">
          <RenderFinalCutButton
            clips={clips}
            projectId={projectId}
            filenameLabel={filenameLabel}
            onRendered={onRendered}
            disabled={disabled || isProcessing}
          />
          {lastRenderUrl ? (
            <a
              href={lastRenderUrl}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="inline-flex items-center gap-1.5 text-[11px] text-emerald-300 hover:text-emerald-200"
            >
              Open last hosted copy
              <ExternalLink className="w-3 h-3" />
            </a>
          ) : null}
        </div>

        <div className="space-y-2 pb-4 border-b border-zinc-800/80">
          <p className="text-xs text-zinc-500 leading-relaxed">
            Editing happens in the Production Scene Mixer.{' '}
            {productionVisionHref ? (
              <Link
                href={productionVisionHref}
                className="text-violet-400 hover:text-violet-300 inline-flex items-center gap-1 font-medium"
              >
                Open in Production
                <ExternalLink className="w-3 h-3 opacity-80" aria-hidden />
              </Link>
            ) : (
              <span className="text-zinc-600">use Production (Vision) for this project.</span>
            )}
          </p>
        </div>

        {scene ? (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-white tracking-tight">Selected scene</p>
            <div>
              <label className="text-[11px] text-zinc-500 uppercase tracking-wider font-medium">
                Scene
              </label>
              <p className="text-sm text-zinc-100 mt-0.5">Scene {scene.sceneNumber}</p>
            </div>
            <div>
              <label className="text-[11px] text-zinc-500 uppercase tracking-wider font-medium">
                Heading
              </label>
              <p className="text-sm text-zinc-200 mt-0.5 leading-snug">
                {scene.heading || 'No heading'}
              </p>
            </div>
            <div>
              <label className="text-[11px] text-zinc-500 uppercase tracking-wider font-medium">
                Duration
              </label>
              <p className="text-sm text-zinc-100 mt-0.5 tabular-nums">
                {formatTime(scene.duration)}
              </p>
            </div>
            <div>
              <label className="text-[11px] text-zinc-500 uppercase tracking-wider font-medium">
                Source version
              </label>
              <p className="text-sm text-zinc-100 mt-0.5 tabular-nums">
                {scene.streamVersion ? `v${scene.streamVersion}` : '—'}
              </p>
              <StatusRow status={scene.status} />
            </div>
          </div>
        ) : (
          <p className="text-xs text-zinc-500 leading-relaxed">
            Select a scene on the timeline for details.
          </p>
        )}
      </div>
    </div>
  )
}
