'use client'

import React from 'react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { AgentRunDock } from '@/components/vision/AgentRunDock'
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
    <AgentRunDock
      title={title}
      tone={isActive ? 'running' : isFailed || isCancelled ? 'warning' : 'success'}
      subtitle={
        isActive ? (
          <>
            {activeLabel || 'Working…'} — you can keep editing, we&apos;ll notify you
          </>
        ) : isFailed || isCancelled ? (
          job.error || (isCancelled ? 'Cancelled.' : 'Something went wrong.')
        ) : (
          (describeResult ?? describeAnalysisResult)(job)
        )
      }
      progressPct={isActive ? Math.max(4, progress) : undefined}
      onClose={handleClose}
      closeLabel={isActive && onCancel ? cancelLabel : 'Dismiss'}
      className={className}
    >
      {isActive && onCancel ? (
        <Button
          size="sm"
          variant="destructive"
          onClick={onCancel}
          className="h-8 w-full text-[11px] font-semibold"
        >
          {cancelLabel}
        </Button>
      ) : null}

      {isCompleted && onViewResult ? (
        <Button
          size="sm"
          onClick={onViewResult}
          className={cn(
            'h-7 w-full bg-gradient-to-r from-cyan-500 to-violet-500 text-[11px] text-white'
          )}
        >
          {viewResultLabel}
        </Button>
      ) : null}
    </AgentRunDock>
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
