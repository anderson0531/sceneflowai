'use client'

import React from 'react'
import { AlertTriangle, CheckCircle2, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import type { BackgroundJob } from '@/hooks/useBackgroundJob'

/**
 * Non-blocking status card for a background job.
 *
 * Replaces the full-screen processing overlay for work that no longer needs to
 * hold the UI hostage. It stays out of the way, keeps the operation visible so
 * it cannot be silently forgotten, and offers the result when it lands.
 */
export function BackgroundJobDock({
  job,
  title,
  activeLabel,
  onDismiss,
  onViewResult,
  viewResultLabel = 'View results',
}: {
  job: BackgroundJob | null
  title: string
  activeLabel?: string
  onDismiss: () => void
  onViewResult?: () => void
  viewResultLabel?: string
}) {
  if (!job) return null

  const isFailed = job.status === 'failed'
  const isCompleted = job.status === 'completed'
  const isActive = !isFailed && !isCompleted
  const progress = Math.min(100, Math.max(0, job.progress ?? 0))

  const analyzed = Number(job.result?.analyzedScenes ?? 0)
  const total = Number(job.result?.totalScenes ?? job.payload?.sceneCount ?? 0)
  const stale = job.result?.stale === true

  return (
    <div className="fixed bottom-4 right-4 z-[80] w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-700 bg-slate-900/95 p-3 shadow-2xl backdrop-blur">
      <div className="flex items-start gap-2">
        <div className="mt-0.5 shrink-0">
          {isActive ? (
            <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
          ) : isFailed ? (
            <AlertTriangle className="h-4 w-4 text-amber-400" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-white">{title}</p>

          {isActive ? (
            <p className="mt-0.5 text-[11px] text-slate-400">
              {activeLabel || 'Working…'} — you can keep editing, we&apos;ll notify you
            </p>
          ) : isFailed ? (
            <p className="mt-0.5 text-[11px] text-amber-300/90">
              {job.error || 'Something went wrong.'}
            </p>
          ) : (
            <p className="mt-0.5 text-[11px] text-slate-400">
              {total ? `${analyzed} of ${total} scenes analyzed` : 'Analysis complete'}
              {stale ? ' — script changed since it started' : ''}
            </p>
          )}

          {isActive ? (
            <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-violet-500 transition-[width] duration-500"
                style={{ width: `${Math.max(4, progress)}%` }}
              />
            </div>
          ) : null}

          {isCompleted && onViewResult ? (
            <Button
              size="sm"
              onClick={onViewResult}
              className={cn(
                'mt-2 h-7 w-full bg-gradient-to-r from-cyan-500 to-violet-500 text-[11px] text-white'
              )}
            >
              {viewResultLabel}
            </Button>
          ) : null}
        </div>

        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="shrink-0 rounded p-0.5 text-slate-500 transition-colors hover:text-slate-200"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
