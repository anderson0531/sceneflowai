'use client'

import { motion, type HTMLMotionProps } from 'framer-motion'
import { cn } from '@/lib/utils'
import { forwardRef } from 'react'

/**
 * DashboardCard - Atomic Design Base Component
 * 
 * Provides consistent card styling across the dashboard with:
 * - Glassmorphism effect (bg-gray-800/60 backdrop-blur-md)
 * - Standardized icon containers (w-10 h-10)
 * - Consistent border radius (rounded-xl)
 * - Configurable header with action slot
 * - 8pt grid-aligned spacing
 */

export interface DashboardCardProps extends Omit<HTMLMotionProps<'div'>, 'title'> {
  /** Card title displayed in header */
  title?: string
  /** Icon element for the header */
  icon?: React.ReactNode
  /** Icon container color variant */
  iconColor?: 'indigo' | 'purple' | 'emerald' | 'blue' | 'amber' | 'green' | 'red' | 'gray'
  /** Subtitle text below the title */
  subtitle?: string
  /** Action element (button, link) in header right side */
  action?: React.ReactNode
  /** Enable glassmorphism effect */
  glass?: boolean
  /** Compact mode with reduced padding */
  compact?: boolean
  /** Animation delay for staggered entrance */
  delay?: number
  /** Disable entrance animation */
  noAnimation?: boolean
  /** Children content */
  children: React.ReactNode
}

const iconColorMap = {
  indigo: 'bg-indigo-600/20 text-indigo-400',
  purple: 'bg-purple-600/20 text-purple-400',
  emerald: 'bg-emerald-600/20 text-emerald-400',
  blue: 'bg-blue-600/20 text-blue-400',
  amber: 'bg-amber-600/20 text-amber-400',
  green: 'bg-green-600/20 text-green-400',
  red: 'bg-red-600/20 text-red-400',
  gray: 'bg-gray-600/20 text-gray-400',
}

export const DashboardCard = forwardRef<HTMLDivElement, DashboardCardProps>(
  function DashboardCard(
    {
      title,
      icon,
      iconColor = 'indigo',
      subtitle,
      action,
      glass = true,
      compact = false,
      delay = 0,
      noAnimation = false,
      children,
      className,
      ...motionProps
    },
    ref
  ) {
    const cardStyles = cn(
      // Base styles
      'rounded-xl shadow-lg border',
      // Padding - 8pt grid aligned
      compact ? 'p-4' : 'p-5',
      // Glassmorphism or solid
      glass
        ? 'bg-gray-800/60 backdrop-blur-md border-gray-700/50'
        : 'bg-gray-800 border-gray-700',
      className
    )

    const content = (
      <>
        {/* Header */}
        {(title || icon || action) && (
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {icon && (
                <div
                  className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                    iconColorMap[iconColor]
                  )}
                >
                  {icon}
                </div>
              )}
              <div>
                {title && (
                  <h3 className="dashboard-widget-title text-lg font-semibold text-white leading-tight">
                    {title}
                  </h3>
                )}
                {subtitle && (
                  <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
                )}
              </div>
            </div>
            {action && <div className="shrink-0">{action}</div>}
          </div>
        )}

        {/* Content */}
        {children}
      </>
    )

    if (noAnimation) {
      return (
        <div ref={ref} className={cardStyles} {...(motionProps as any)}>
          {content}
        </div>
      )
    }

    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: delay * 0.1, ease: 'easeOut' }}
        className={cardStyles}
        {...motionProps}
      >
        {content}
      </motion.div>
    )
  }
)

/**
 * DashboardCardHeader - For custom header layouts
 */
export function DashboardCardHeader({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-center justify-between mb-4', className)}>
      {children}
    </div>
  )
}

/**
 * DashboardCardContent - For structured content sections
 */
export function DashboardCardContent({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={cn('space-y-4', className)}>{children}</div>
}

export default DashboardCard
