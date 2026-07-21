'use client'

import { cn } from '@/lib/utils'

export type ProductAccent = 'product' | 'series' | 'ready'

const accentIconTile: Record<ProductAccent, string> = {
  product: 'bg-gradient-to-br from-cyan-500/30 to-purple-600/30 border-cyan-500/20 text-cyan-400',
  series: 'bg-gradient-to-br from-amber-500/30 to-orange-600/30 border-amber-500/20 text-amber-400',
  ready: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400',
}

const accentEyebrow: Record<ProductAccent, string> = {
  product:
    'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-400 border-cyan-500/30',
  series:
    'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/30',
  ready: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
}

export interface ProductPageHeaderProps {
  icon: React.ReactNode
  title: string
  subtitle?: string
  eyebrow?: string
  accent?: ProductAccent
  primaryAction?: React.ReactNode
  secondaryActions?: React.ReactNode
  className?: string
}

export function ProductPageHeader({
  icon,
  title,
  subtitle,
  eyebrow,
  accent = 'product',
  primaryAction,
  secondaryActions,
  className,
}: ProductPageHeaderProps) {
  return (
    <div
      className={cn(
        'mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between',
        className
      )}
    >
      <div className="flex items-start gap-4">
        <div
          className={cn(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border',
            accentIconTile[accent]
          )}
        >
          {icon}
        </div>
        <div>
          {eyebrow ? (
            <span
              className={cn(
                'mb-1 inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold',
                accentEyebrow[accent]
              )}
            >
              {eyebrow}
            </span>
          ) : null}
          <h1 className="text-2xl font-bold text-white md:text-3xl">{title}</h1>
          {subtitle ? <p className="mt-1 text-gray-400">{subtitle}</p> : null}
        </div>
      </div>
      {(primaryAction || secondaryActions) && (
        <div className="flex w-full flex-col items-stretch gap-2 sm:flex-row sm:items-center md:w-auto">
          {secondaryActions}
          {primaryAction}
        </div>
      )}
    </div>
  )
}
