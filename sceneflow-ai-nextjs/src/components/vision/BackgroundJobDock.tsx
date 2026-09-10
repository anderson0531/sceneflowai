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
  onCancel,
  onViewResult,
  viewResultLabel = 'View results',
  cancelLabel = 'Cancel analysis',
  describeResult,
  className,
}: {
  job: BackgroundJob | null
  title: string
  activeLabel?: string
  onDismiss: () => void
  /** Cancel an in-flight job (queued/processing). Distinct from dismiss. */
  onCancel?: () => void
  onViewResult?: () => void
  viewResultLabel?: string
  cancelLabel?: string
  /** Completion summary line. Defaults to Audience Resonance's scene coverage. */
  describeResult?: (job: BackgroundJob) => string
  /** Override the anchor so two concurrent docks do not sit on top of each other. */
  className?: string
}) {
  if (!job) return null

  const isFailed = job.status === 'failed'
  const isCompleted = job.status === 'completed'
  const isCancelled = job.status === 'cancelled'
  const isActive = !isFailed && !isCompleted && !isCancelled
  const progress = Math.min(100, Math.max(0, job.progress ?? 0))

  const handleClose = () => {
    // Active jobs must be cancelled — bare dismiss orphans the server job
    // and can leave the UI stuck with no cancel affordance.
    if (isActive && onCancel) {
      onCancel()
      return
    }
    onDismiss()
  }

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-[80] w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-700 bg-slate-900/95 p-3 shadow-2xl backdrop-blur',
        className
      )}
    >
      <div className="flex items-start gap-2">
        <div className="mt-0.5 shrink-0">
          {isActive ? (
            <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
          ) : isFailed || isCancelled ? (
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
          ) : isFailed || isCancelled ? (
            <p className="mt-0.5 text-[11px] text-amber-300/90">
              {job.error || (isCancelled ? 'Cancelled.' : 'Something went wrong.')}
            </p>
          ) : (
            <p className="mt-0.5 text-[11px] text-slate-400">
              {(describeResult ?? describeAnalysisResult)(job)}
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

          {isActive && onCancel ? (
            <Button
              size="sm"
              variant="destructive"
              onClick={onCancel}
              className="mt-2 h-8 w-full text-[11px] font-semibold"
            >
              {cancelLabel}
            </Button>
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
          onClick={handleClose}
          aria-label={isActive && onCancel ? cancelLabel : 'Dismiss'}
          className="shrink-0 rounded p-0.5 text-slate-500 transition-colors hover:text-slate-200"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

function describeAnalysisResult(job: BackgroundJob): string {
  const analyzed = Number(job.result?.analyzedScenes ?? 0)
  const total = Number(job.result?.totalScenes ?? job.payload?.sceneCount ?? 0)
  const stale = job.result?.stale === true
  return `${total ? `${analyzed} of ${total} scenes analyzed` : 'Analysis complete'}${
    stale ? ' — script changed since it started' : ''
  }`
}

/** Completion line for a Reference Express batch. */
export function describeReferenceExpressResult(job: BackgroundJob): string {
  const result = (job.result ?? {}) as {
    succeeded?: number
    total?: number
    failed?: number
    skipped?: number
    staleCount?: number
  }
  const total = Number(result.total ?? job.payload?.itemCount ?? 0)
  const succeeded = Number(result.succeeded ?? 0)

  if (!total) return 'Reference generation complete'

  const parts = [`${succeeded} of ${total} references generated`]
  if (result.failed) parts.push(`${result.failed} failed`)
  if (result.skipped) parts.push(`${result.skipped} skipped`)
  if (result.staleCount) parts.push(`${result.staleCount} changed while running`)
  return parts.join(' — ')
}
