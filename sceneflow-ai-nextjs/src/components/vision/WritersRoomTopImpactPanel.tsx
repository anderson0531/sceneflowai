'use client'

import { useMemo, useState } from 'react'
import { CheckSquare, ChevronDown, ChevronUp, Film, Square, TrendingDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import {
  collectTopImpactIssues,
  type TopImpactIssue,
  type TopImpactSceneInput,
} from '@/lib/script/audienceResonance/highImpact'

export function WritersRoomTopImpactPanel({
  scenes,
  onJumpToScene,
  onToggleApplied,
}: {
  scenes: TopImpactSceneInput[]
  onJumpToScene?: (sceneIndex: number) => void
  onToggleApplied?: (sceneIndex: number, recId: string, applied: boolean) => void
}) {
  const [open, setOpen] = useState(true)
  const [showResolved, setShowResolved] = useState(false)

  const openIssues = useMemo(
    () => collectTopImpactIssues(scenes, { excludeApplied: true, limit: 5 }),
    [scenes]
  )
  const resolvedIssues = useMemo(
    () =>
      collectTopImpactIssues(scenes, { excludeApplied: false, limit: 0 }).filter(
        (issue) => issue.applied
      ),
    [scenes]
  )

  if (openIssues.length === 0 && resolvedIssues.length === 0) return null

  return (
    <div className="rounded-xl border border-rose-500/25 bg-slate-950/60 p-3.5 shadow-[0_8px_24px_rgba(8,8,20,0.35)]">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between text-left"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 text-sm font-medium text-gray-100">
          <TrendingDown className="h-4 w-4 text-rose-400" />
          Top Impact
          {openIssues.length > 0 && (
            <span className="rounded-full bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-rose-200">
              {openIssues.length}
            </span>
          )}
        </span>
        {open ? (
          <ChevronUp className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        )}
      </button>

      {open && (
        <div className="mt-3 space-y-2">
          {openIssues.length === 0 ? (
            <p className="text-xs text-gray-400">All top-impact fixes are closed.</p>
          ) : (
            openIssues.map((issue) => (
              <ImpactRow
                key={`${issue.sceneIndex}-${issue.recId}`}
                issue={issue}
                onJumpToScene={onJumpToScene}
                onToggleApplied={onToggleApplied}
              />
            ))
          )}

          {resolvedIssues.length > 0 && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowResolved((prev) => !prev)}
                className="text-[11px] font-medium text-gray-400 hover:text-gray-200"
              >
                {showResolved ? 'Hide' : 'Show'} {resolvedIssues.length} resolved
              </button>
              {showResolved && (
                <div className="mt-2 space-y-2">
                  {resolvedIssues.slice(0, 8).map((issue) => (
                    <ImpactRow
                      key={`done-${issue.sceneIndex}-${issue.recId}`}
                      issue={issue}
                      onJumpToScene={onJumpToScene}
                      onToggleApplied={onToggleApplied}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ImpactRow({
  issue,
  onJumpToScene,
  onToggleApplied,
}: {
  issue: TopImpactIssue
  onJumpToScene?: (sceneIndex: number) => void
  onToggleApplied?: (sceneIndex: number, recId: string, applied: boolean) => void
}) {
  return (
    <div
      className={cn(
        'flex gap-2 rounded-lg border p-2.5',
        issue.applied
          ? 'border-emerald-500/20 bg-emerald-950/20'
          : 'border-white/10 bg-slate-900/50'
      )}
    >
      <button
        type="button"
        onClick={() => onToggleApplied?.(issue.sceneIndex, issue.recId, !issue.applied)}
        className="mt-0.5 shrink-0 text-gray-400 hover:text-white"
        aria-label={issue.applied ? 'Reopen fix' : 'Mark fix applied'}
        aria-pressed={issue.applied}
      >
        {issue.applied ? (
          <CheckSquare className="h-4 w-4 text-emerald-400" />
        ) : (
          <Square className="h-4 w-4" />
        )}
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              'text-xs font-medium text-gray-200',
              issue.applied && 'line-through opacity-60'
            )}
          >
            Scene {issue.sceneNum}: {issue.heading}
          </p>
          <div className="flex shrink-0 gap-1">
            {issue.rec.priority && (
              <Badge
                variant="outline"
                className={cn(
                  'h-4 border-none px-1 text-[9px] uppercase tracking-wider',
                  issue.rec.priority === 'high'
                    ? 'bg-red-500/20 text-red-300'
                    : issue.rec.priority === 'medium'
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-blue-500/20 text-blue-300'
                )}
              >
                {issue.rec.priority}
              </Badge>
            )}
            {typeof issue.rec.pointsDeducted === 'number' && (
              <Badge
                variant="destructive"
                className="h-4 border-none bg-red-500/20 px-1 text-[9px] text-red-300"
              >
                -{issue.rec.pointsDeducted} pts
              </Badge>
            )}
          </div>
        </div>
        <p
          className={cn(
            'mt-1 text-xs leading-relaxed text-gray-400',
            issue.applied && 'line-through opacity-60'
          )}
        >
          {issue.rec.text}
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="mt-1.5 h-6 px-0 text-[11px] text-purple-300 hover:bg-transparent hover:text-purple-200"
          onClick={() => onJumpToScene?.(issue.sceneIndex)}
        >
          <Film className="mr-1 h-3 w-3" />
          Go to scene
        </Button>
      </div>
    </div>
  )
}
