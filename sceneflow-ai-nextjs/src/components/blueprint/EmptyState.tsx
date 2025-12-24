'use client'

import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { 
  FileText, 
  Lightbulb, 
  Users, 
  Image, 
  Film, 
  Sparkles,
  Plus,
  ArrowRight,
  type LucideIcon
} from 'lucide-react'
import { type ReactNode } from 'react'

export interface EmptyStateProps {
  /** Icon to display */
  icon?: LucideIcon | ReactNode
  /** Main title */
  title: string
  /** Description text */
  description?: string
  /** Primary action button */
  action?: {
    label: string
    onClick: () => void
    icon?: LucideIcon
  }
  /** Secondary action button */
  secondaryAction?: {
    label: string
    onClick: () => void
  }
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Visual style */
  variant?: 'default' | 'subtle' | 'dashed'
  /** Additional CSS classes */
  className?: string
}

const sizeStyles = {
  sm: {
    container: 'py-8 px-4',
    icon: 'w-10 h-10',
    iconWrapper: 'w-16 h-16',
    title: 'text-base',
    description: 'text-sm',
    button: 'text-sm px-3 py-1.5'
  },
  md: {
    container: 'py-12 px-6',
    icon: 'w-12 h-12',
    iconWrapper: 'w-20 h-20',
    title: 'text-lg',
    description: 'text-base',
    button: 'text-sm px-4 py-2'
  },
  lg: {
    container: 'py-16 px-8',
    icon: 'w-16 h-16',
    iconWrapper: 'w-24 h-24',
    title: 'text-xl',
    description: 'text-base',
    button: 'text-base px-5 py-2.5'
  }
}

const variantStyles = {
  default: 'bg-sf-surface rounded-xl border border-sf-border',
  subtle: 'bg-transparent',
  dashed: 'bg-sf-surface/50 rounded-xl border-2 border-dashed border-sf-border'
}

export function EmptyState({
  icon: IconProp,
  title,
  description,
  action,
  secondaryAction,
  size = 'md',
  variant = 'default',
  className
}: EmptyStateProps) {
  const sizing = sizeStyles[size]
  
  // Handle icon - can be a LucideIcon or ReactNode
  const renderIcon = () => {
    if (!IconProp) return null
    
    if (typeof IconProp === 'function') {
      const Icon = IconProp as LucideIcon
      return <Icon className={cn(sizing.icon, 'text-sf-text-secondary')} />
    }
    
    return IconProp
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'flex flex-col items-center justify-center text-center',
        variantStyles[variant],
        sizing.container,
        className
      )}
    >
      {/* Icon */}
      {IconProp && (
        <div
          className={cn(
            'rounded-2xl bg-sf-surface-light flex items-center justify-center mb-4',
            sizing.iconWrapper
          )}
        >
          {renderIcon()}
        </div>
      )}

      {/* Title */}
      <h3 className={cn('font-semibold text-sf-text-primary mb-2', sizing.title)}>
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p className={cn('text-sf-text-secondary max-w-md mb-6', sizing.description)}>
          {description}
        </p>
      )}

      {/* Actions */}
      {(action || secondaryAction) && (
        <div className="flex items-center gap-3">
          {action && (
            <motion.button
              onClick={action.onClick}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                'inline-flex items-center gap-2 rounded-lg font-medium',
                'bg-gradient-to-r from-purple-600 to-pink-600 text-white',
                'hover:shadow-lg hover:shadow-purple-500/25 transition-shadow',
                sizing.button
              )}
            >
              {action.icon && <action.icon className="w-4 h-4" />}
              {action.label}
            </motion.button>
          )}
          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              className={cn(
                'inline-flex items-center gap-2 rounded-lg font-medium',
                'text-sf-text-secondary hover:text-sf-text-primary',
                'hover:bg-sf-surface-light transition-colors',
                sizing.button
              )}
            >
              {secondaryAction.label}
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </motion.div>
  )
}

// Pre-configured empty states for common scenarios

export function NoConceptsEmpty({ onCreateNew }: { onCreateNew: () => void }) {
  return (
    <EmptyState
      icon={Lightbulb}
      title="No concepts yet"
      description="Start by describing your video idea. We'll help you develop it into a full concept."
      action={{
        label: 'Create Concept',
        onClick: onCreateNew,
        icon: Plus
      }}
    />
  )
}

export function NoCharactersEmpty({ onCreateNew }: { onCreateNew: () => void }) {
  return (
    <EmptyState
      icon={Users}
      title="No characters defined"
      description="Add characters to bring your story to life. Define their appearance, personality, and role."
      action={{
        label: 'Add Character',
        onClick: onCreateNew,
        icon: Plus
      }}
    />
  )
}

export function NoScenesEmpty({ onGenerate }: { onGenerate: () => void }) {
  return (
    <EmptyState
      icon={Film}
      title="No scenes generated"
      description="Generate scenes from your script to start building your storyboard."
      action={{
        label: 'Generate Scenes',
        onClick: onGenerate,
        icon: Sparkles
      }}
    />
  )
}

export function NoImagesEmpty({ onGenerate }: { onGenerate: () => void }) {
  return (
    <EmptyState
      icon={Image}
      title="No images generated"
      description="Generate reference images for your scenes to visualize your story."
      action={{
        label: 'Generate Images',
        onClick: onGenerate,
        icon: Sparkles
      }}
    />
  )
}

export function NoIdeasEmpty({ onBrainstorm }: { onBrainstorm: () => void }) {
  return (
    <EmptyState
      icon={Lightbulb}
      title="Ready to brainstorm?"
      description="Enter your concept above and let AI help you develop creative ideas."
      action={{
        label: 'Start Brainstorming',
        onClick: onBrainstorm,
        icon: Sparkles
      }}
      variant="dashed"
    />
  )
}

export function NoProjectsEmpty({ onCreateNew }: { onCreateNew: () => void }) {
  return (
    <EmptyState
      icon={FileText}
      title="No projects yet"
      description="Create your first project to start bringing your video ideas to life."
      action={{
        label: 'New Project',
        onClick: onCreateNew,
        icon: Plus
      }}
      size="lg"
    />
  )
}

export function SearchEmpty({ query }: { query: string }) {
  return (
    <EmptyState
      icon={FileText}
      title="No results found"
      description={`We couldn't find anything matching "${query}". Try adjusting your search.`}
      variant="subtle"
      size="sm"
    />
  )
}

export default EmptyState
