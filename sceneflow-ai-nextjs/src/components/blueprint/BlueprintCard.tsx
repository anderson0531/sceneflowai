'use client'

import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { ChevronRight, MoreHorizontal } from 'lucide-react'
import { forwardRef, type ReactNode, type HTMLAttributes } from 'react'

export interface BlueprintCardProps extends HTMLAttributes<HTMLDivElement> {
  title?: string
  subtitle?: string
  icon?: ReactNode
  badge?: ReactNode
  actions?: ReactNode
  footer?: ReactNode
  variant?: 'default' | 'elevated' | 'outlined' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  interactive?: boolean
  selected?: boolean
  loading?: boolean
  children?: ReactNode
}

const variantStyles = {
  default: 'bg-sf-surface border-sf-border',
  elevated: 'bg-sf-surface border-sf-border shadow-lg hover:shadow-xl',
  outlined: 'bg-transparent border-sf-border border-2',
  ghost: 'bg-transparent border-transparent hover:bg-sf-surface-light'
}

const sizeStyles = {
  sm: 'p-3 rounded-lg',
  md: 'p-4 rounded-xl',
  lg: 'p-6 rounded-2xl'
}

export const BlueprintCard = forwardRef<HTMLDivElement, BlueprintCardProps>(
  (
    {
      title,
      subtitle,
      icon,
      badge,
      actions,
      footer,
      variant = 'default',
      size = 'md',
      interactive = false,
      selected = false,
      loading = false,
      children,
      className,
      ...props
    },
    ref
  ) => {
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        whileHover={interactive ? { scale: 1.01, y: -2 } : undefined}
        whileTap={interactive ? { scale: 0.99 } : undefined}
        className={cn(
          'border transition-all duration-200',
          variantStyles[variant],
          sizeStyles[size],
          interactive && 'cursor-pointer',
          selected && 'ring-2 ring-sf-primary border-sf-primary',
          loading && 'animate-pulse',
          className
        )}
        {...props}
      >
        {/* Header */}
        {(title || icon || actions) && (
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-3 min-w-0">
              {icon && (
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-sf-primary/10 flex items-center justify-center text-sf-primary">
                  {icon}
                </div>
              )}
              <div className="min-w-0">
                {title && (
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sf-text-primary truncate">
                      {title}
                    </h3>
                    {badge}
                  </div>
                )}
                {subtitle && (
                  <p className="text-sm text-sf-text-secondary truncate">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>
            {actions && (
              <div className="flex-shrink-0 flex items-center gap-1">
                {actions}
              </div>
            )}
          </div>
        )}

        {/* Content */}
        {children && <div className="text-sf-text-secondary">{children}</div>}

        {/* Footer */}
        {footer && (
          <div className="mt-4 pt-3 border-t border-sf-border">{footer}</div>
        )}
      </motion.div>
    )
  }
)

BlueprintCard.displayName = 'BlueprintCard'

// Action Card variant - for clickable actions with arrow
export interface ActionCardProps {
  title: string
  description?: string
  icon?: ReactNode
  onClick?: () => void
  disabled?: boolean
  className?: string
}

export function ActionCard({
  title,
  description,
  icon,
  onClick,
  disabled = false,
  className
}: ActionCardProps) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={disabled ? undefined : { scale: 1.02 }}
      whileTap={disabled ? undefined : { scale: 0.98 }}
      className={cn(
        'w-full p-4 rounded-xl border border-sf-border bg-sf-surface',
        'flex items-center gap-4 text-left transition-all',
        'hover:border-sf-primary/50 hover:bg-sf-surface-light',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {icon && (
        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-sf-primary/10 flex items-center justify-center text-sf-primary">
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-sf-text-primary">{title}</h4>
        {description && (
          <p className="text-sm text-sf-text-secondary mt-0.5 line-clamp-2">
            {description}
          </p>
        )}
      </div>
      <ChevronRight className="w-5 h-5 text-sf-text-secondary flex-shrink-0" />
    </motion.button>
  )
}

// Stat Card variant - for displaying metrics
export interface StatCardProps {
  label: string
  value: string | number
  change?: number
  icon?: ReactNode
  color?: 'default' | 'success' | 'warning' | 'error'
  className?: string
}

const colorStyles = {
  default: 'text-sf-text-primary',
  success: 'text-emerald-400',
  warning: 'text-amber-400',
  error: 'text-red-400'
}

export function StatCard({
  label,
  value,
  change,
  icon,
  color = 'default',
  className
}: StatCardProps) {
  return (
    <div
      className={cn(
        'p-4 rounded-xl border border-sf-border bg-sf-surface',
        className
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-sf-text-secondary uppercase tracking-wide">
          {label}
        </span>
        {icon && <div className="text-sf-text-secondary">{icon}</div>}
      </div>
      <div className="flex items-baseline gap-2">
        <span className={cn('text-2xl font-bold', colorStyles[color])}>
          {value}
        </span>
        {change !== undefined && (
          <span
            className={cn(
              'text-sm font-medium',
              change > 0
                ? 'text-emerald-400'
                : change < 0
                ? 'text-red-400'
                : 'text-sf-text-secondary'
            )}
          >
            {change > 0 ? '+' : ''}
            {change}%
          </span>
        )}
      </div>
    </div>
  )
}

// Menu button for card actions
export function CardMenuButton({
  onClick,
  className
}: {
  onClick?: () => void
  className?: string
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onClick?.()
      }}
      className={cn(
        'p-1.5 rounded-lg hover:bg-sf-surface-light transition-colors',
        'text-sf-text-secondary hover:text-sf-text-primary',
        className
      )}
    >
      <MoreHorizontal className="w-4 h-4" />
    </button>
  )
}

export default BlueprintCard
