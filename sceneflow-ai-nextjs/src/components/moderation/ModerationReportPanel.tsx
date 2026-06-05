'use client'

import React, { useState } from 'react'
import { AlertTriangle, ChevronDown, ChevronUp, Shield, ShieldAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ModerationReport } from '@/lib/moderation/moderationPipeline'

interface ModerationReportPanelProps {
  report: ModerationReport | null | undefined
  className?: string
  onDismiss?: () => void
}

function hasWarnings(report: ModerationReport): boolean {
  return (
    report.action === 'warning' ||
    report.checks.some((c) => c.severity === 'warn' && c.categories.length > 0)
  )
}

export function ModerationReportPanel({
  report,
  className,
  onDismiss,
}: ModerationReportPanelProps) {
  const [expanded, setExpanded] = useState(false)

  if (!report || (!hasWarnings(report) && report.allowed)) {
    return null
  }

  const blockChecks = report.checks.filter((c) => c.severity === 'block')
  const warnChecks = report.checks.filter((c) => c.severity === 'warn')
  const isBlocked = !report.allowed

  return (
    <div
      className={cn(
        'rounded-lg border p-4 text-sm',
        isBlocked
          ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/30'
          : 'border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30',
        className
      )}
      role="alert"
    >
      <div className="flex items-start gap-3">
        {isBlocked ? (
          <ShieldAlert className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
        ) : (
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 opacity-60" />
            <p className="font-medium">
              {isBlocked ? 'Content blocked' : 'Content policy notice'}
            </p>
            <span className="rounded bg-black/5 px-2 py-0.5 text-xs capitalize dark:bg-white/10">
              {report.stage.replace('_', ' ')}
            </span>
          </div>
          <p className="mt-1 text-muted-foreground">{report.summary}</p>

          <button
            type="button"
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium underline-offset-2 hover:underline"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {expanded ? 'Hide details' : 'View check details'}
          </button>

          {expanded && (
            <ul className="mt-2 space-y-2 text-xs">
              {blockChecks.map((check) => (
                <li key={check.check} className="rounded border border-red-200 bg-white/60 p-2 dark:border-red-900 dark:bg-black/20">
                  <span className="font-medium text-red-700 dark:text-red-300">Blocked — {check.check}</span>
                  {check.categories.length > 0 && (
                    <p className="mt-1 text-muted-foreground">{check.categories.join(', ')}</p>
                  )}
                </li>
              ))}
              {warnChecks.map((check) => (
                <li key={check.check} className="rounded border border-amber-200 bg-white/60 p-2 dark:border-amber-900 dark:bg-black/20">
                  <span className="font-medium text-amber-800 dark:text-amber-200">Warning — {check.check}</span>
                  {check.categories.length > 0 && (
                    <p className="mt-1 text-muted-foreground">{check.categories.join(', ')}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
        {onDismiss && (
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground"
            onClick={onDismiss}
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  )
}

export default ModerationReportPanel
