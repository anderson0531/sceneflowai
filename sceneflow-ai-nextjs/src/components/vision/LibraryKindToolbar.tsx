'use client'

import { Loader2, RefreshCw, Zap } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/Button'

export function LibraryKindToolbar({
  updateLabel,
  agentLabel,
  onUpdate,
  onAgent,
  isUpdating = false,
  isAgentRunning = false,
  updateDisabled = false,
  agentDisabled = false,
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
        className="h-7 text-xs"
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
          className="h-7 text-xs relative overflow-hidden bg-gradient-to-r from-indigo-500/15 to-purple-500/15 border-indigo-500/40 hover:border-indigo-500/60"
        >
          {isAgentRunning ? (
            <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin text-indigo-300" />
          ) : (
            <Zap className="w-3.5 h-3.5 mr-1 text-indigo-300" />
          )}
          {isAgentRunning ? 'Generating…' : agentLabel}
        </Button>
      ) : null}
      {extra}
    </div>
  )
}
