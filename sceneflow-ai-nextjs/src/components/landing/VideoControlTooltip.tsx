'use client'

import React from 'react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export function VideoControlTooltip({
  label,
  side = 'bottom',
  open,
  children,
}: {
  label: string
  side?: 'top' | 'bottom' | 'left' | 'right'
  open?: boolean
  children: React.ReactElement
}) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip open={open}>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent
          side={side}
          className="z-[120] border border-white/15 bg-slate-900/95 px-2.5 py-1 text-xs font-medium text-white shadow-lg backdrop-blur-md"
        >
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export default VideoControlTooltip
