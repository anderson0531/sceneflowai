'use client'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import type { ProductAccent } from './ProductPageHeader'

const accentCta: Record<ProductAccent, string> = {
  product: '',
  series: 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-amber-500/25',
  ready: 'bg-emerald-600 hover:bg-emerald-500',
}

export interface ProductEmptyStateProps {
  icon: React.ReactNode
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  actionHref?: string
  secondaryAction?: React.ReactNode
  accent?: ProductAccent
  className?: string
}

export function ProductEmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryAction,
  accent = 'product',
  className,
}: ProductEmptyStateProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-dashed border-gray-600/50 bg-gray-800/40 p-8 text-center md:p-12',
        className
      )}
    >
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-gray-600/40 bg-gray-700/50">
        {icon}
      </div>
      <h3 className="mb-2 text-lg font-semibold text-white">{title}</h3>
      {description ? (
        <p className="mx-auto mb-6 max-w-md text-sm text-gray-400">{description}</p>
      ) : null}
      <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
        {actionLabel && onAction ? (
          <Button
            variant={accent === 'product' ? 'primary' : 'default'}
            onClick={onAction}
            className={cn(accent !== 'product' && accentCta[accent])}
          >
            {actionLabel}
          </Button>
        ) : null}
        {secondaryAction}
      </div>
    </div>
  )
}
