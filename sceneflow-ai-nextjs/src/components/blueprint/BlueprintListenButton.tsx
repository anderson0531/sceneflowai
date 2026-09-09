'use client'

import React from 'react'
import { Headphones, Square, Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

export interface BlueprintListenButtonProps {
  isPlaying: boolean
  isLoading?: boolean
  disabled?: boolean
  onPlay: () => void
  onStop: () => void
  /** Toolbar gray (default) or purple accent for narrative panels */
  variant?: 'default' | 'purple'
  className?: string
}

export function BlueprintListenButton({
  isPlaying,
  isLoading = false,
  disabled = false,
  onPlay,
  onStop,
  variant = 'default',
  className,
}: BlueprintListenButtonProps) {
  const t = useTranslations('blueprint.audio')

  const surface =
    variant === 'purple'
      ? 'border-purple-500/40 text-purple-100 hover:bg-purple-500/20'
      : 'border-gray-700 text-gray-300 hover:bg-gray-800'

  if (disabled) {
    return (
      <Button
        aria-label={t('unavailable')}
        title={t('unavailable')}
        disabled
        variant="outline"
        size="sm"
        className={cn('h-8 px-2.5 gap-1.5 border-gray-800 text-gray-500', className)}
      >
        <Headphones className="h-4 w-4 shrink-0" />
        <span className="text-xs font-medium">{t('listen')}</span>
      </Button>
    )
  }

  if (isPlaying || isLoading) {
    return (
      <Button
        aria-label={t('stop')}
        title={t('stop')}
        onClick={onStop}
        variant="outline"
        size="sm"
        className={cn('h-8 px-2.5 gap-1.5', surface, className)}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
        ) : (
          <Square className="h-4 w-4 shrink-0" />
        )}
        <span className="text-xs font-medium">{t('stop')}</span>
      </Button>
    )
  }

  return (
    <Button
      aria-label={t('listen')}
      title={t('listen')}
      onClick={onPlay}
      variant="outline"
      size="sm"
      className={cn('h-8 px-2.5 gap-1.5', surface, className)}
    >
      <Headphones className="h-4 w-4 shrink-0" />
      <span className="text-xs font-medium">{t('listen')}</span>
    </Button>
  )
}
