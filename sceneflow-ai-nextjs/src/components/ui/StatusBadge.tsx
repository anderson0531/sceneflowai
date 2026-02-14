'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { CheckCircle2, AlertCircle, Circle, Loader2 } from 'lucide-react'

export type StatusBadgeStatus = 'ready' | 'partial' | 'not-ready' | 'loading'

interface StatusBadgeProps {
  /** Current status */
  status: StatusBadgeStatus
  /** Tooltip message explaining the status */
  tooltip?: string
  /** Optional action text shown in tooltip (e.g., "Assign voices →") */
  actionText?: string
  /** Optional callback when action text is clicked */
  onAction?: () => void
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Show as inline dot only (no container) */
  dotOnly?: boolean
  /** Custom class name */
  className?: string
}

const statusConfig = {
  ready: {
    icon: CheckCircle2,
    color: 'text-green-500',
    bgColor: 'bg-green-500/20',
    borderColor: 'border-green-500/30',
    label: 'Ready'
  },
  partial: {
    icon: AlertCircle,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/20',
    borderColor: 'border-amber-500/30',
    label: 'Setup needed'
  },
  'not-ready': {
    icon: Circle,
    color: 'text-gray-500',
    bgColor: 'bg-gray-500/20',
    borderColor: 'border-gray-500/30',
    label: 'Not ready'
  },
  loading: {
    icon: Loader2,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/20',
    borderColor: 'border-blue-500/30',
    label: 'Loading...'
  }
}

const sizeConfig = {
  sm: { icon: 'w-3 h-3', dot: 'w-2 h-2', text: 'text-xs' },
  md: { icon: 'w-4 h-4', dot: 'w-2.5 h-2.5', text: 'text-sm' },
  lg: { icon: 'w-5 h-5', dot: 'w-3 h-3', text: 'text-base' }
}

/**
 * StatusBadge - Visual indicator for workflow readiness states
 * 
 * Uses colored dots/icons with tooltips to indicate:
 * - ready (green): All prerequisites met, action can proceed
 * - partial (amber): Some prerequisites met, action may have limitations
 * - not-ready (gray): Prerequisites not met, action blocked
 * - loading (blue): Status being determined
 * 
 * @example
 * // Simple dot indicator
 * <StatusBadge status="ready" tooltip="All voices assigned" dotOnly />
 * 
 * // With action link in tooltip
 * <StatusBadge 
 *   status="partial" 
 *   tooltip="2 characters missing voices" 
 *   actionText="Assign in Production Bible →"
 *   onAction={() => scrollToBible()}
 * />
 */
export function StatusBadge({
  status,
  tooltip,
  actionText,
  onAction,
  size = 'md',
  dotOnly = false,
  className
}: StatusBadgeProps) {
  const config = statusConfig[status]
  const sizes = sizeConfig[size]
  const Icon = config.icon
  
  const badge = dotOnly ? (
    <span 
      className={cn(
        'inline-block rounded-full',
        sizes.dot,
        status === 'ready' ? 'bg-green-500' :
        status === 'partial' ? 'bg-amber-500' :
        status === 'loading' ? 'bg-blue-500 animate-pulse' :
        'bg-gray-500',
        className
      )}
    />
  ) : (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full border',
        config.bgColor,
        config.borderColor,
        sizes.text,
        className
      )}
    >
      <Icon className={cn(sizes.icon, config.color, status === 'loading' && 'animate-spin')} />
      <span className={config.color}>{config.label}</span>
    </span>
  )
  
  if (!tooltip) {
    return badge
  }
  
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent 
          side="top" 
          className="bg-gray-900 border-gray-700 text-white max-w-xs"
        >
          <p className="text-sm">{tooltip}</p>
          {actionText && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onAction?.()
              }}
              className="mt-1 text-xs text-cyan-400 hover:text-cyan-300 underline underline-offset-2"
            >
              {actionText}
            </button>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/**
 * StatusDot - Minimal inline dot indicator
 * Shorthand for <StatusBadge dotOnly />
 */
export function StatusDot({
  status,
  tooltip,
  actionText,
  onAction,
  size = 'sm',
  className
}: Omit<StatusBadgeProps, 'dotOnly'>) {
  return (
    <StatusBadge
      status={status}
      tooltip={tooltip}
      actionText={actionText}
      onAction={onAction}
      size={size}
      dotOnly
      className={className}
    />
  )
}

/**
 * Production Readiness Progress Bar
 * Shows completion progress for a workflow step
 */
interface ReadinessProgressProps {
  /** Label for the progress item */
  label: string
  /** Current count */
  current: number
  /** Total count */
  total: number
  /** Optional hint text when not complete */
  hint?: string
  /** Size variant */
  size?: 'sm' | 'md'
  /** Custom class name */
  className?: string
}

export function ReadinessProgress({
  label,
  current,
  total,
  hint,
  size = 'sm',
  className
}: ReadinessProgressProps) {
  const percent = total > 0 ? Math.round((current / total) * 100) : 0
  const isComplete = current >= total && total > 0
  const status: StatusBadgeStatus = isComplete ? 'ready' : current > 0 ? 'partial' : 'not-ready'
  
  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StatusDot status={status} />
          <span className={cn(
            'text-gray-400',
            size === 'sm' ? 'text-xs' : 'text-sm'
          )}>
            {label}
          </span>
        </div>
        <span className={cn(
          isComplete ? 'text-green-500' : 'text-gray-500',
          size === 'sm' ? 'text-xs' : 'text-sm'
        )}>
          {current}/{total}
        </span>
      </div>
      <div className={cn(
        'w-full bg-gray-800 rounded-full overflow-hidden',
        size === 'sm' ? 'h-1' : 'h-1.5'
      )}>
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300',
            isComplete ? 'bg-green-500' : current > 0 ? 'bg-amber-500' : 'bg-gray-600'
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
      {hint && !isComplete && (
        <p className="text-xs text-gray-500 pl-4">{hint}</p>
      )}
    </div>
  )
}

/**
 * Calculate production readiness from characters and scenes
 */
export interface ProductionReadinessState {
  /** Characters with voice assigned */
  voicesAssigned: number
  /** Total characters needing voices (excludes narrator) */
  totalCharacters: number
  /** Characters with reference images */
  imagesGenerated: number
  /** Scenes with direction generated */
  scenesWithDirection: number
  /** Total scenes */
  totalScenes: number
  /** Scenes with images */
  scenesWithImages: number
  /** Scenes with audio generated */
  scenesWithAudio: number
  /** Character names missing voices */
  charactersMissingVoices: string[]
  /** Overall readiness for audio generation */
  isAudioReady: boolean
  /** Overall readiness for image generation */
  isImageReady: boolean
}

export function calculateProductionReadiness(
  characters: Array<{ name: string; type?: string; voiceConfig?: any; referenceImageUrl?: string }>,
  scenes: Array<{ sceneDirection?: any; imageUrl?: string; narrationAudioUrl?: string; dialogue?: Array<{ audioUrl?: string }> }>
): ProductionReadinessState {
  // Filter out narrator for voice requirements
  const speakingCharacters = characters.filter(c => c.type !== 'narrator')
  const voicesAssigned = speakingCharacters.filter(c => c.voiceConfig).length
  const imagesGenerated = characters.filter(c => c.referenceImageUrl).length
  const charactersMissingVoices = speakingCharacters
    .filter(c => !c.voiceConfig)
    .map(c => c.name)
  
  const scenesWithDirection = scenes.filter(s => s.sceneDirection).length
  const scenesWithImages = scenes.filter(s => s.imageUrl).length
  const scenesWithAudio = scenes.filter(s => 
    s.narrationAudioUrl || 
    (s.dialogue?.some(d => d.audioUrl))
  ).length
  
  return {
    voicesAssigned,
    totalCharacters: speakingCharacters.length,
    imagesGenerated,
    scenesWithDirection,
    totalScenes: scenes.length,
    scenesWithImages,
    scenesWithAudio,
    charactersMissingVoices,
    isAudioReady: voicesAssigned === speakingCharacters.length && speakingCharacters.length > 0,
    isImageReady: scenesWithDirection > 0
  }
}
