'use client'

import type { ReactNode } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

export interface StatusFilterChip {
  id: string
  label: string
  count: number
  active: boolean
  /** One sentence shown on hover, describing what this option includes. */
  tooltip: string
}

export interface StatusFilterGroup {
  label: string
  chips: StatusFilterChip[]
  onSelect: (id: string) => void
}

/**
 * One-line filter trigger. The options stay in a popover until the user opens
 * them, so the list underneath is not pushed down by two rows of pills.
 */
export function StatusFilterBar({
  groups,
  activeSummary,
  onClear,
  children,
}: {
  groups: StatusFilterGroup[]
  /** Labels of the filters that are not "All", joined for the trigger. */
  activeSummary?: string
  onClear?: () => void
  children?: ReactNode
}) {
  const summary = activeSummary?.trim() ?? ''
  const filtering = summary.length > 0
  if (groups.every((group) => group.chips.length === 0) && !children) return null

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-1.5">
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={`inline-flex h-7 max-w-full items-center gap-1.5 rounded-full border px-2.5 text-xs transition-colors ${
                filtering
                  ? 'border-slate-200 bg-slate-200 text-slate-900'
                  : 'border-slate-600/50 bg-slate-800/60 text-slate-300 hover:border-slate-400'
              }`}
              aria-label={filtering ? `Filters: ${summary}` : 'Filters'}
            >
              <span>Filters</span>
              {filtering ? (
                <span className="max-w-[16rem] truncate font-medium">{summary}</span>
              ) : null}
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="w-64 border-slate-700 bg-slate-900 p-3 text-slate-200"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="space-y-3">
              {groups.map((group) =>
                group.chips.length === 0 ? null : (
                  <div key={group.label} className="space-y-1">
                    <p className="text-[10px] uppercase tracking-wide text-slate-500">{group.label}</p>
                    <div className="flex flex-col gap-1">
                      {group.chips.map((chip) => (
                        <Tooltip key={chip.id}>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation()
                                group.onSelect(chip.id)
                              }}
                              className={`flex h-7 w-full items-center justify-between gap-3 rounded-full border px-3 text-xs transition-colors ${
                                chip.active
                                  ? 'border-slate-200 bg-slate-200 text-slate-900'
                                  : 'border-slate-600/50 bg-slate-800/60 text-slate-300 hover:border-slate-400'
                              }`}
                              aria-pressed={chip.active}
                            >
                              <span className="truncate text-left">{chip.label}</span>
                              <span
                                className={`w-8 shrink-0 text-center tabular-nums ${
                                  chip.active ? 'text-slate-600' : 'text-slate-400'
                                }`}
                              >
                                {chip.count}
                              </span>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-[16rem] text-left">
                            {chip.tooltip}
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  </div>
                )
              )}
              {children}
            </div>
          </PopoverContent>
        </Popover>
        {filtering && onClear ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              onClear()
            }}
            className="h-7 shrink-0 rounded-full px-2 text-xs text-slate-400 hover:text-slate-200"
            aria-label="Clear filters"
          >
            Clear
          </button>
        ) : null}
      </div>
    </TooltipProvider>
  )
}
