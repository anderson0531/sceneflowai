'use client'

import React from 'react'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import type { PublishingReadiness } from '@/types/publishingAssets'

export interface PublishingReadinessBannerProps {
  readiness: PublishingReadiness
  onOpenStreamsTab?: () => void
}

export function PublishingReadinessBanner({
  readiness,
  onOpenStreamsTab,
}: PublishingReadinessBannerProps) {
  if (readiness.blockers.length === 0 && readiness.readyStreamCount > 0) {
    return (
      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 flex items-start gap-2 shrink-0">
        <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
        <div className="text-xs text-emerald-100">
          {readiness.readyStreamCount} of {readiness.totalStreamCount} language stream
          {readiness.totalStreamCount !== 1 ? 's' : ''} ready for publishing.
        </div>
      </div>
    )
  }

  if (readiness.blockers.length === 0) return null

  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 flex items-start gap-2 shrink-0">
      <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-amber-100 mb-1">
          {readiness.blockers.length} blocker{readiness.blockers.length !== 1 ? 's' : ''} before
          publishing
        </p>
        <ul className="text-[11px] text-amber-200/80 space-y-0.5">
          {readiness.blockers.slice(0, 3).map((blocker) => (
            <li key={blocker}>• {blocker}</li>
          ))}
          {readiness.blockers.length > 3 ? (
            <li>• +{readiness.blockers.length - 3} more</li>
          ) : null}
        </ul>
        {onOpenStreamsTab ? (
          <button
            type="button"
            onClick={onOpenStreamsTab}
            className="mt-2 text-[11px] text-amber-300 hover:text-amber-200 underline"
          >
            Open Final Streams tab
          </button>
        ) : null}
      </div>
    </div>
  )
}
