'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface ReferenceSplitPaneProps {
  image: React.ReactNode
  controls: React.ReactNode
  className?: string
}

/** 50/50 image | controls layout for Reference Library dialog. */
export function ReferenceSplitPane({ image, controls, className }: ReferenceSplitPaneProps) {
  return (
    <div
      className={cn(
        'grid grid-cols-1 md:grid-cols-2 gap-4 min-h-0 items-start',
        className,
      )}
    >
      <div className="relative min-h-[180px] max-h-[50vh] rounded-md overflow-hidden bg-gray-100 dark:bg-gray-800">
        {image}
      </div>
      <div className="min-w-0 flex flex-col gap-3 overflow-y-auto max-h-[50vh]">
        {controls}
      </div>
    </div>
  )
}
