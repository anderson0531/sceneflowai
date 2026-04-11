'use client'

import React from 'react'
import type { LucideIcon } from 'lucide-react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export interface ProductionSectionHeaderProps {
  icon: LucideIcon
  title: string
  /** Shown as outline badge (e.g. count or short label) */
  badge?: string | number
  /** Muted hint on the right (desktop) */
  rightHint?: string
  rightAction?: React.ReactNode
  collapsible?: boolean
  expanded?: boolean
  onToggle?: () => void
  className?: string
}

/**
 * Shared section header aligned with Language Streams in Scene Production Mixer:
 * purple accent icon, white title, outline badge, optional right action/hint.
 */
export function ProductionSectionHeader({
  icon: Icon,
  title,
  badge,
  rightHint,
  rightAction,
  collapsible,
  expanded = true,
  onToggle,
  className,
}: ProductionSectionHeaderProps) {
  const inner = (
    <>
      <div className="flex items-center gap-2 min-w-0">
        {collapsible && (
          expanded ? (
            <ChevronDown className="w-4 h-4 text-purple-400 flex-shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-purple-400 flex-shrink-0" />
          )
        )}
        <Icon className="w-4 h-4 text-purple-400 flex-shrink-0" aria-hidden />
        <span className="text-sm font-medium text-white truncate">{title}</span>
        {badge !== undefined && badge !== '' && (
          <Badge variant="outline" className="text-[10px] text-purple-300 border-purple-500/30 flex-shrink-0">
            {badge}
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
        {rightAction}
        {rightHint ? (
          <span className="text-xs text-purple-400/70 hidden sm:inline max-w-[280px] truncate text-right">
            {rightHint}
          </span>
        ) : null}
      </div>
    </>
  )

  const rowClass = cn(
    'flex items-center justify-between gap-2 w-full p-3 text-left',
    collapsible && 'hover:bg-gray-800/40 transition-colors',
    className
  )

  if (collapsible && onToggle) {
    return (
      <button type="button" onClick={onToggle} className={rowClass}>
        {inner}
      </button>
    )
  }

  return <div className={rowClass}>{inner}</div>
}
