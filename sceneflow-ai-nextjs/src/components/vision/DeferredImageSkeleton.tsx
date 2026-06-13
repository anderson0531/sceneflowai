'use client'

import { isValidStoryboardMediaUrl } from '@/lib/storyboard/mergeSceneMedia'

/** True when the URL is the lite-mode placeholder awaiting Phase 2 hydration. */
export function isDeferredImageUrl(value: string | null | undefined): boolean {
  return value === 'deferred'
}

/** True when an image URL can be rendered in an `<img>` tag. */
export function isDisplayableImageUrl(value: string | null | undefined): boolean {
  return isValidStoryboardMediaUrl(value)
}

interface DeferredImageSkeletonProps {
  className?: string
  label?: string
}

/** Lightweight shimmer shown while Phase 2 image hydration is in progress. */
export function DeferredImageSkeleton({ className = '', label }: DeferredImageSkeletonProps) {
  return (
    <div
      className={`relative overflow-hidden bg-slate-800/60 ${className}`}
      aria-busy="true"
      aria-label={label ?? 'Loading image'}
    >
      <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-slate-700/40 via-slate-600/20 to-slate-800/40" />
    </div>
  )
}
