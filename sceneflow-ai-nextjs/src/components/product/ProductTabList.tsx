'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import type { ProductAccent } from './ProductPageHeader'

export interface ProductTabItem {
  key: string
  label: string
  icon?: React.ReactNode
  count?: number
}

export interface ProductTabListProps {
  tabs: ProductTabItem[]
  activeKey: string
  onChange: (key: string) => void
  variant?: 'folder' | 'pill'
  accent?: ProductAccent
  className?: string
  trailing?: React.ReactNode
}

const activeCountBadge: Record<ProductAccent, string> = {
  product: 'bg-sf-primary/20 text-sf-primary',
  series: 'bg-amber-500/20 text-amber-400',
  ready: 'bg-emerald-500/20 text-emerald-400',
}

const activePill: Record<ProductAccent, string> = {
  product: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  series: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  ready: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
}

export function ProductTabList({
  tabs,
  activeKey,
  onChange,
  variant = 'folder',
  accent = 'product',
  className,
  trailing,
}: ProductTabListProps) {
  if (variant === 'pill') {
    return (
      <div className={cn('flex flex-wrap items-center gap-1', className)}>
        {tabs.map((tab) => {
          const isActive = activeKey === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onChange(tab.key)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                isActive
                  ? activePill[accent]
                  : 'border-transparent text-gray-400 hover:bg-gray-800/60 hover:text-gray-200'
              )}
            >
              {tab.icon}
              {tab.label}
              {typeof tab.count === 'number' ? (
                <span
                  className={cn(
                    'rounded px-1.5 py-0.5 text-[10px]',
                    isActive ? activeCountBadge[accent] : 'bg-gray-700/50 text-gray-500'
                  )}
                >
                  {tab.count}
                </span>
              ) : null}
            </button>
          )
        })}
        {trailing}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'mb-3 flex flex-shrink-0 items-center overflow-x-auto border-b border-gray-700/50',
        className
      )}
    >
      <div className="flex flex-shrink-0 items-center">
        {tabs.map((tab) => {
          const isActive = activeKey === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onChange(tab.key)}
              className={cn(
                'relative mr-0.5 flex-shrink-0 rounded-t-lg px-3 py-1.5 text-xs font-medium transition-all',
                isActive
                  ? '-mb-px border-x border-t border-gray-600/50 bg-slate-800/80 text-white'
                  : 'border-transparent bg-slate-900/40 text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              )}
            >
              <div className="flex items-center gap-1.5">
                {tab.icon
                  ? React.cloneElement(tab.icon as React.ReactElement, {
                      className: cn(
                        'w-3 h-3',
                        isActive && accent === 'series' && 'text-amber-400',
                        isActive && accent === 'product' && 'text-sf-primary',
                        isActive && accent === 'ready' && 'text-emerald-400'
                      ),
                    })
                  : null}
                <span>{tab.label}</span>
                {typeof tab.count === 'number' ? (
                  <span
                    className={cn(
                      'rounded px-1.5 py-0.5 text-[10px]',
                      isActive ? activeCountBadge[accent] : 'bg-gray-700/50 text-gray-500'
                    )}
                  >
                    {tab.count}
                  </span>
                ) : null}
              </div>
            </button>
          )
        })}
      </div>
      {trailing ? <div className="ml-auto flex-shrink-0">{trailing}</div> : null}
    </div>
  )
}
