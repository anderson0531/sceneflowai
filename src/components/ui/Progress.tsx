import React from 'react'
import { cn } from '@/lib/utils'

interface ProgressProps {
  value: number
  max?: number
  className?: string
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ value, max = 100, className, showLabel = false, size = 'md' }, ref) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100)
    
    const sizes = {
      sm: 'h-2',
      md: 'h-3',
      lg: 'h-4'
    }
    
    return (
      <div className={cn('w-full', className)} ref={ref}>
        {showLabel && (
          <div className="flex justify-between text-sm text-muted-foreground mb-2">
            <span>Progress</span>
            <span>{Math.round(percentage)}%</span>
          </div>
        )}
        <div className={cn('w-full bg-secondary rounded-full overflow-hidden', sizes[size])}>
          <div
            className="h-full bg-primary transition-all duration-300 ease-in-out"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    )
  }
)

Progress.displayName = 'Progress'

interface ModuleProgressProps {
  moduleId: string
  progress: number
  title: string
  description?: string
  className?: string
}

export const ModuleProgress = React.forwardRef<HTMLDivElement, ModuleProgressProps>(
  ({ moduleId, progress, title, description, className }, ref) => {
    return (
      <div className={cn('space-y-3', className)} ref={ref}>
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-sm">{title}</h4>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          <span className="text-sm font-medium text-muted-foreground">
            {progress}%
          </span>
        </div>
        <Progress value={progress} size="sm" />
      </div>
    )
  }
)

ModuleProgress.displayName = 'ModuleProgress'





