'use client'

import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useState, type ReactNode, createContext, useContext } from 'react'

// Context for nested panels
const CollapsibleContext = createContext<{
  isOpen: boolean
  toggle: () => void
} | null>(null)

export interface CollapsiblePanelProps {
  title: string
  subtitle?: string
  icon?: ReactNode
  badge?: ReactNode
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  variant?: 'default' | 'bordered' | 'filled'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  children: ReactNode
  className?: string
  headerClassName?: string
  contentClassName?: string
}

const variantStyles = {
  default: {
    container: '',
    header: 'hover:bg-sf-surface-light',
    content: ''
  },
  bordered: {
    container: 'border border-sf-border rounded-xl overflow-hidden',
    header: 'bg-sf-surface hover:bg-sf-surface-light',
    content: 'bg-sf-surface'
  },
  filled: {
    container: 'bg-sf-surface rounded-xl overflow-hidden',
    header: 'bg-sf-surface-light hover:bg-sf-border/50',
    content: ''
  }
}

const sizeStyles = {
  sm: {
    header: 'px-3 py-2',
    title: 'text-sm',
    content: 'px-3 pb-3'
  },
  md: {
    header: 'px-4 py-3',
    title: 'text-base',
    content: 'px-4 pb-4'
  },
  lg: {
    header: 'px-6 py-4',
    title: 'text-lg',
    content: 'px-6 pb-6'
  }
}

export function CollapsiblePanel({
  title,
  subtitle,
  icon,
  badge,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
  variant = 'default',
  size = 'md',
  disabled = false,
  children,
  className,
  headerClassName,
  contentClassName
}: CollapsiblePanelProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen)
  
  // Support both controlled and uncontrolled modes
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen
  
  const toggle = () => {
    if (disabled) return
    const newValue = !isOpen
    setInternalOpen(newValue)
    onOpenChange?.(newValue)
  }

  const styles = variantStyles[variant]
  const sizing = sizeStyles[size]

  return (
    <CollapsibleContext.Provider value={{ isOpen, toggle }}>
      <div className={cn(styles.container, className)}>
        {/* Header */}
        <button
          type="button"
          onClick={toggle}
          disabled={disabled}
          className={cn(
            'w-full flex items-center gap-3 transition-colors',
            styles.header,
            sizing.header,
            disabled && 'opacity-50 cursor-not-allowed',
            headerClassName
          )}
          aria-expanded={isOpen}
        >
          {/* Chevron */}
          <motion.div
            animate={{ rotate: isOpen ? 90 : 0 }}
            transition={{ duration: 0.2 }}
            className="flex-shrink-0 text-sf-text-secondary"
          >
            <ChevronRight className="w-4 h-4" />
          </motion.div>

          {/* Icon */}
          {icon && (
            <div className="flex-shrink-0 text-sf-primary">{icon}</div>
          )}

          {/* Title & Subtitle */}
          <div className="flex-1 text-left min-w-0">
            <div className="flex items-center gap-2">
              <span className={cn('font-medium text-sf-text-primary', sizing.title)}>
                {title}
              </span>
              {badge}
            </div>
            {subtitle && (
              <p className="text-sm text-sf-text-secondary truncate">
                {subtitle}
              </p>
            )}
          </div>
        </button>

        {/* Content */}
        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className={cn(styles.content, sizing.content, contentClassName)}>
                {children}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </CollapsibleContext.Provider>
  )
}

// Hook to access collapsible context
export function useCollapsible() {
  const context = useContext(CollapsibleContext)
  if (!context) {
    throw new Error('useCollapsible must be used within a CollapsiblePanel')
  }
  return context
}

// Accordion component - only one panel open at a time
export interface AccordionProps {
  items: {
    id: string
    title: string
    subtitle?: string
    icon?: ReactNode
    badge?: ReactNode
    content: ReactNode
    disabled?: boolean
  }[]
  defaultOpenId?: string
  variant?: 'default' | 'bordered' | 'filled'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function Accordion({
  items,
  defaultOpenId,
  variant = 'bordered',
  size = 'md',
  className
}: AccordionProps) {
  const [openId, setOpenId] = useState<string | null>(defaultOpenId || null)

  return (
    <div className={cn('divide-y divide-sf-border', className)}>
      {items.map((item) => (
        <CollapsiblePanel
          key={item.id}
          title={item.title}
          subtitle={item.subtitle}
          icon={item.icon}
          badge={item.badge}
          open={openId === item.id}
          onOpenChange={(open) => setOpenId(open ? item.id : null)}
          variant={variant}
          size={size}
          disabled={item.disabled}
          className="border-0 rounded-none first:rounded-t-xl last:rounded-b-xl"
        >
          {item.content}
        </CollapsiblePanel>
      ))}
    </div>
  )
}

// Simple collapsible section with just a toggle icon
export interface CollapsibleSectionProps {
  label: string
  defaultOpen?: boolean
  children: ReactNode
  className?: string
}

export function CollapsibleSection({
  label,
  defaultOpen = true,
  children,
  className
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-sm text-sf-text-secondary hover:text-sf-text-primary transition-colors mb-2"
      >
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-4 h-4" />
        </motion.div>
        <span>{label}</span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default CollapsiblePanel
