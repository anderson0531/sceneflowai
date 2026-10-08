'use client'

import { Loader2, RefreshCw, Zap } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

export function LibraryKindToolbar({
  updateLabel,
  agentLabel,
  onUpdate,
  onAgent,
  isUpdating = false,
  isAgentRunning = false,
  updateDisabled = false,
  agentDisabled = false,
  agentHasWork = false,
  updateTitle,
  agentTitle,
  extra,
}: {
  updateLabel: string
  agentLabel: string
  onUpdate: () => void
  onAgent?: () => void
  isUpdating?: boolean
  isAgentRunning?: boolean
  updateDisabled?: boolean
  agentDisabled?: boolean
  agentHasWork?: boolean
  updateTitle?: string
  agentTitle?: string
  extra?: ReactNode
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onUpdate}
        disabled={updateDisabled || isUpdating || isAgentRunning}
        title={updateTitle}
        className="h-7 text-xs font-medium"
      >
        {isUpdating ? (
          <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
        ) : (
          <RefreshCw className="w-3.5 h-3.5 mr-1" />
        )}
        {updateLabel}
      </Button>
      {onAgent ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAgent}
          disabled={agentDisabled || isUpdating || isAgentRunning}
          title={agentTitle}
          className={cn(
            'h-7 text-xs font-medium',
            agentHasWork
              ? 'bg-amber-500 text-zinc-950 border-amber-400 hover:bg-amber-400 hover:border-amber-300'
              : ''
          )}
        >
          {isAgentRunning ? (
            <Loader2
              className={cn(
                'w-3.5 h-3.5 mr-1 animate-spin',
                agentHasWork ? 'text-zinc-950' : 'text-zinc-300'
              )}
            />
          ) : (
            <Zap className={cn('w-3.5 h-3.5 mr-1', agentHasWork ? 'text-zinc-950' : 'text-zinc-300')} />
          )}
          {isAgentRunning ? 'Generating…' : agentLabel}
        </Button>
      ) : null}
      {extra}
    </div>
  )
}
