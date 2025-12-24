'use client'

import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

// Base skeleton with shimmer animation
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-md bg-sf-surface-light',
        className
      )}
      {...props}
    >
      <motion.div
        className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent"
        animate={{ translateX: ['100%', '-100%'] }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'linear'
        }}
      />
    </div>
  )
}

// Card skeleton - matches BlueprintCard layout
export function CardSkeleton({
  hasIcon = true,
  hasSubtitle = true,
  hasContent = true,
  hasFooter = false,
  className
}: {
  hasIcon?: boolean
  hasSubtitle?: boolean
  hasContent?: boolean
  hasFooter?: boolean
  className?: string
}) {
  return (
    <div
      className={cn(
        'p-4 rounded-xl border border-sf-border bg-sf-surface',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        {hasIcon && <Skeleton className="w-10 h-10 rounded-lg flex-shrink-0" />}
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          {hasSubtitle && <Skeleton className="h-4 w-1/2" />}
        </div>
        <Skeleton className="w-6 h-6 rounded-md" />
      </div>

      {/* Content */}
      {hasContent && (
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
        </div>
      )}

      {/* Footer */}
      {hasFooter && (
        <div className="mt-4 pt-3 border-t border-sf-border flex justify-between">
          <Skeleton className="h-8 w-24 rounded-md" />
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>
      )}
    </div>
  )
}

// Phase navigator skeleton
export function PhaseNavigatorSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 p-1 rounded-xl bg-sf-surface-light border border-sf-border',
        className
      )}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <Skeleton
          key={i}
          className={cn('h-10 rounded-lg', i === 1 ? 'w-28' : 'w-24')}
        />
      ))}
    </div>
  )
}

// Score indicator skeleton
export function ScoreIndicatorSkeleton({
  size = 'md',
  showBar = false,
  className
}: {
  size?: 'sm' | 'md' | 'lg'
  showBar?: boolean
  className?: string
}) {
  const sizeClasses = {
    sm: { label: 'h-3 w-16', score: 'h-4 w-12', bar: 'h-1' },
    md: { label: 'h-3 w-20', score: 'h-5 w-14', bar: 'h-1.5' },
    lg: { label: 'h-4 w-24', score: 'h-6 w-16', bar: 'h-2' }
  }

  const sizing = sizeClasses[size]

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center justify-between">
        <Skeleton className={sizing.label} />
        <div className="flex items-center gap-1">
          <Skeleton className={sizing.score} />
          <Skeleton className="h-3 w-8" />
        </div>
      </div>
      {showBar && <Skeleton className={cn('w-full', sizing.bar)} />}
    </div>
  )
}

// Workshop card skeleton - matches WorkshopCard layout
export function WorkshopCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'rounded-xl border border-sf-border bg-sf-surface p-6',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <Skeleton className="h-9 w-28 rounded-md" />
      </div>

      {/* Attribute grid */}
      <div className="grid grid-cols-2 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        ))}
      </div>
    </div>
  )
}

// Score card skeleton
export function ScoreCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'rounded-xl border border-sf-border bg-sf-surface p-6',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>

      {/* Score display */}
      <div className="flex items-baseline gap-2 mb-4">
        <Skeleton className="h-10 w-16" />
        <Skeleton className="h-4 w-12" />
      </div>

      {/* Progress bar */}
      <Skeleton className="h-2 w-full rounded-full mb-4" />

      {/* Breakdown */}
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center justify-between">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-12" />
          </div>
        ))}
      </div>
    </div>
  )
}

// Concept card skeleton
export function ConceptCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'rounded-xl border border-sf-border bg-sf-surface p-6',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Skeleton className="w-12 h-12 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2 mb-6">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-2 mb-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-6 w-20 rounded-full" />
        ))}
      </div>

      {/* Footer actions */}
      <div className="flex items-center gap-3 pt-4 border-t border-sf-border">
        <Skeleton className="h-9 w-24 rounded-md" />
        <Skeleton className="h-9 w-28 rounded-md" />
        <div className="flex-1" />
        <Skeleton className="h-9 w-36 rounded-md" />
      </div>
    </div>
  )
}

// Idea card skeleton
export function IdeaCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'rounded-lg border border-sf-border bg-sf-surface-light p-4',
        className
      )}
    >
      {/* Header with title and rating */}
      <div className="flex items-center justify-between mb-3">
        <Skeleton className="h-5 w-3/4" />
        <div className="flex items-center gap-1">
          <Skeleton className="w-4 h-4" />
          <Skeleton className="h-4 w-10" />
        </div>
      </div>

      {/* Synopsis */}
      <div className="space-y-2 mb-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>

      {/* Action button */}
      <div className="flex justify-end">
        <Skeleton className="h-8 w-28 rounded-md" />
      </div>
    </div>
  )
}

// Full page loading skeleton
export function PageLoadingSkeleton() {
  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="bg-sf-surface rounded-xl border border-sf-border p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Skeleton className="w-12 h-12 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <PhaseNavigatorSkeleton />
        </div>
        <Skeleton className="h-4 w-96 mb-4" />
        <Skeleton className="h-2 w-full rounded-full" />
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <WorkshopCardSkeleton />
        </div>
        <div className="space-y-6">
          <ScoreCardSkeleton />
          <CardSkeleton hasFooter />
        </div>
      </div>

      {/* Concept section */}
      <ConceptCardSkeleton />
    </div>
  )
}

export default Skeleton
