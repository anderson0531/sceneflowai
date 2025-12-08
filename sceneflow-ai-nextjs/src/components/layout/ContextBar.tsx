'use client'

import React from 'react'
import { cn } from '../../lib/utils'

export interface ContextBarTab {
  value: string
  label: string
}

interface ContextBarProps {
  title: string
  titleIcon?: React.ReactNode
  tabs?: ContextBarTab[]
  activeTab?: string
  onTabChange?: (value: string) => void
  primaryActions?: React.ReactNode
  secondaryActions?: React.ReactNode
  breadcrumb?: string[]
  meta?: React.ReactNode
  stickyTop?: number
  className?: string
  emphasis?: boolean
  titleVariant?: 'default' | 'page'
}

export function ContextBar({
  title,
  titleIcon,
  tabs,
  activeTab,
  onTabChange,
  primaryActions,
  secondaryActions,
  meta,
  stickyTop = 56, // match GlobalHeader h-14 (56px)
  className,
  emphasis = false,
  titleVariant = 'default',
}: ContextBarProps) {
  return (
    <div
      className={cn(
        'sticky z-40 w-full border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur overflow-x-hidden max-w-full',
        className,
      )}
      style={{ top: stickyTop }}
    >
      {/* Top row: Title + actions (mobile stacks) */}
      <div className="px-4 lg:px-6 max-w-full overflow-x-hidden">
        <div className={cn(
          'h-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 min-w-0 max-w-full overflow-x-hidden',
          titleVariant === 'page' ? 'py-3 md:py-4' : 'py-2 sm:py-0 sm:h-12'
        )}>
          <div className="min-w-0 flex items-center gap-3 flex-shrink overflow-hidden">
            {titleIcon && (
              <div className="flex-shrink-0">
                {titleIcon}
              </div>
            )}
            <div className="flex items-center">
              <h2
                className={cn(
                  'truncate font-semibold text-gray-900 dark:text-white',
                  titleVariant === 'page' ? 'text-2xl md:text-3xl font-extrabold tracking-tight leading-none' : 'text-sm md:text-base',
                  emphasis && titleVariant !== 'page' && 'text-base md:text-lg font-bold'
                )}
              >
                {title}
              </h2>
            </div>
            {meta ? (
              <div className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-800 text-gray-300 text-[11px] leading-tight border border-gray-700">
                {meta}
              </div>
            ) : null}
          </div>
          <div className="flex items-center gap-2 overflow-x-auto">
            <div className="flex items-center gap-2 text-xs sm:text-sm">
              {secondaryActions}
            </div>
            <div className="shrink-0">
              {primaryActions}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs row (optional) */}
      {tabs && tabs.length > 0 && (
        <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-2">
          <div className="flex w-full overflow-x-auto scrollbar-thin scrollbar-thumb-gray-700/60 scrollbar-track-transparent" role="tablist" aria-label="Section tabs">
            <div className="flex items-stretch gap-1">
              {tabs.map((t) => {
                const isActive = t.value === activeTab
                return (
                  <button
                    key={t.value}
                    role="tab"
                    aria-selected={isActive}
                    className={cn(
                      'flex-shrink-0 min-h-[2.5rem] md:min-h-[2.75rem] px-3 md:px-4 py-2 text-xs md:text-sm font-medium border-b-2 transition-colors leading-normal',
                      isActive
                        ? 'text-white border-blue-500 bg-gray-800/70'
                        : 'text-gray-300 border-transparent hover:text-white hover:border-blue-400/60 hover:bg-gray-800/40',
                    )}
                    onClick={() => onTabChange?.(t.value)}
                  >
                    {t.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ContextBar


