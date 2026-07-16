'use client'

import { cn } from '@/lib/utils'
import { getScoreChipClassName, getScoreTier } from '@/lib/product/scoreThresholds'

export interface ProductScoreChipProps {
  score: number
  label?: string
  suffix?: string
  onClick?: () => void
  className?: string
  size?: 'sm' | 'md'
}

export function ProductScoreChip({
  score,
  label,
  suffix,
  onClick,
  className,
  size = 'sm',
}: ProductScoreChipProps) {
  const tier = getScoreTier(score)
  const content = (
    <>
      {label ? <span className="font-medium">{label}</span> : null}
      {label ? <span className="text-gray-500">·</span> : null}
      <span className="font-semibold tabular-nums">{score}</span>
      {suffix ? <span className="opacity-80">{suffix}</span> : null}
    </>
  )

  const base = cn(
    'inline-flex items-center gap-1.5 rounded-full border font-medium',
    getScoreChipClassName(score),
    size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm',
    className
  )

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn(base, 'hover:opacity-90 transition-opacity')}>
        {content}
      </button>
    )
  }

  return <span className={base}>{content}</span>
}

export { getScoreTier }
