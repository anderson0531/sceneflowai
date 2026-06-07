'use client'

import type { ReactNode } from 'react'
import type { BlueprintFixSection } from '@/lib/types/audienceResonance'
import {
  getBlueprintSectionFieldTheme,
  type BlueprintSurfaceVariant,
} from '@/lib/blueprint/blueprintReviewTheme'
import { cn } from '@/lib/utils'

type Props = {
  sectionId: BlueprintFixSection
  label: string
  value?: string
  children?: ReactNode
  variant?: BlueprintSurfaceVariant
  emphasis?: 'default' | 'prominent'
  className?: string
  valueClassName?: string
  /** When true, hide if value is empty and no children */
  hideWhenEmpty?: boolean
}

export function BlueprintFieldCard({
  sectionId,
  label,
  value,
  children,
  variant = 'review',
  emphasis = 'default',
  className,
  valueClassName,
  hideWhenEmpty = true,
}: Props) {
  const { labelClass, cardClass } = getBlueprintSectionFieldTheme(sectionId, variant)
  const hasChildren = children != null
  const trimmed = typeof value === 'string' ? value.trim() : ''

  if (hideWhenEmpty && !hasChildren && !trimmed) return null

  const body =
    children ??
    (variant === 'studio' ? (
      <p
        className={cn(
          emphasis === 'prominent'
            ? 'text-lg font-semibold text-gray-100 leading-snug'
            : 'text-sm text-gray-100 leading-relaxed whitespace-pre-wrap',
          valueClassName
        )}
      >
        {trimmed}
      </p>
    ) : (
      <p
        className={cn(
          emphasis === 'prominent' ? 'sf-section-title text-xl sm:text-2xl' : 'sf-review-body',
          valueClassName
        )}
      >
        {trimmed}
      </p>
    ))

  return (
    <div className={cn('sf-review-field-card border-l-[3px]', cardClass, className)}>
      <div className={cn('sf-review-field-card-label', labelClass)}>{label}</div>
      <div className="mt-1.5">{body}</div>
    </div>
  )
}

type SubsectionProps = {
  sectionId: BlueprintFixSection
  title: string
  variant?: BlueprintSurfaceVariant
  className?: string
  children?: ReactNode
  actions?: ReactNode
  'data-blueprint-section'?: string
}

export function BlueprintSubsectionHeading({
  sectionId,
  title,
  variant = 'review',
  className,
  children,
  actions,
  'data-blueprint-section': dataBlueprintSection,
}: SubsectionProps) {
  const { subsectionHeadingClass, iconClass, Icon } = getBlueprintSectionFieldTheme(
    sectionId,
    variant
  )

  return (
    <div className={cn('space-y-3', className)} data-blueprint-section={dataBlueprintSection}>
      <div className="flex items-center justify-between gap-2">
        <div
          className={cn(
            'flex items-center gap-2 rounded-md border-l-[3px] px-3 py-2 text-sm font-semibold tracking-tight',
            subsectionHeadingClass
          )}
        >
          <Icon className={cn('h-4 w-4 shrink-0', iconClass)} aria-hidden />
          <span>{title}</span>
        </div>
        {actions}
      </div>
      {children}
    </div>
  )
}
