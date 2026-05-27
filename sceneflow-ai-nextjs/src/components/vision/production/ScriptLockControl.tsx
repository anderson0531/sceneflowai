'use client'

import React from 'react'
import { Lock, LockOpen, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import {
  getScriptLockLabel,
  type ScriptLockStatus,
} from '@/lib/production/scriptLock'

interface ScriptLockControlProps {
  status: ScriptLockStatus
  onAdvance?: () => void
  onRetreat?: () => void
  className?: string
  compact?: boolean
}

export function ScriptLockControl({
  status,
  onAdvance,
  onRetreat,
  className,
  compact = false,
}: ScriptLockControlProps) {
  const label = getScriptLockLabel(status)
  const isLocked = status === 'locked'

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2',
        isLocked
          ? 'border-emerald-500/30 bg-emerald-500/10'
          : status === 'reviewed'
          ? 'border-amber-500/30 bg-amber-500/10'
          : 'border-gray-600/40 bg-gray-800/40',
        className
      )}
    >
      {isLocked ? (
        <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
      ) : (
        <LockOpen className="w-4 h-4 text-gray-400 shrink-0" />
      )}
      <div className="min-w-0 flex-1">
        <div className="text-xs font-semibold text-white">Script Status: {label}</div>
        {!compact && (
          <p className="text-[11px] text-gray-400 mt-0.5">
            {isLocked
              ? 'Script is locked — unlock to edit or re-run Express.'
              : 'Advance to Locked before Build Storyboard (Express).'}
          </p>
        )}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {onRetreat && status !== 'draft' && (
          <Button type="button" size="sm" variant="ghost" className="h-7 text-xs" onClick={onRetreat}>
            Unlock
          </Button>
        )}
        {onAdvance && status !== 'locked' && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1 border-purple-500/40"
            onClick={onAdvance}
          >
            {status === 'draft' ? 'Mark Reviewed' : 'Lock Script'}
            <ChevronRight className="w-3 h-3" />
          </Button>
        )}
      </div>
    </div>
  )
}
