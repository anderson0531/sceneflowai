'use client'

import { cn } from '@/lib/utils'
import type { PreVisSceneDisplay } from '@/lib/storyboard/preVisSceneDisplay'
import type { PlayerLabelMap } from '@/lib/storyboard/playerTranslations'

export type PreVisSceneInfoVariant = 'inline' | 'fullscreen' | 'compact'

interface PreVisSceneInfoPanelProps {
  display: PreVisSceneDisplay
  variant: PreVisSceneInfoVariant
  totalScenes?: number
  className?: string
  playerLabels?: PlayerLabelMap
}

export function PreVisSceneInfoPanel({
  display,
  variant,
  totalScenes,
  className,
  playerLabels,
}: PreVisSceneInfoPanelProps) {
  const sceneWord = playerLabels?.Scene ?? 'Scene'
  const ofWord = playerLabels?.of ?? 'of'

  const eyebrow =
    totalScenes != null && totalScenes > 0
      ? `${sceneWord} ${display.sceneNumber} ${ofWord} ${totalScenes}`
      : `${sceneWord} ${display.sceneNumber}`

  if (variant === 'fullscreen') {
    return (
      <div className={cn('mt-4 text-center w-full max-w-7xl', className)}>
        <span className="text-[10px] uppercase tracking-wider font-medium text-white/45">
          {eyebrow}
        </span>
        <h2 className="text-base font-semibold text-white leading-snug mt-1 line-clamp-2 break-words">
          {display.titleLine}
        </h2>
        {display.description ? (
          <p className="text-sm text-white/60 leading-relaxed mt-2 line-clamp-3 break-words">
            {display.description}
          </p>
        ) : null}
      </div>
    )
  }

  if (variant === 'compact') {
    return (
      <div className={cn('text-center w-full px-1', className)}>
        <span className="text-[10px] uppercase tracking-wider font-medium text-white/45">
          {eyebrow}
        </span>
        <p className="text-sm font-medium text-white leading-snug mt-1 line-clamp-2 break-words">
          {display.titleLine}
        </p>
        {display.description ? (
          <p className="text-xs text-white/55 leading-relaxed mt-2 line-clamp-3 break-words">
            {display.description}
          </p>
        ) : null}
      </div>
    )
  }

  return (
    <div className={cn('min-w-0', className)}>
      <span className="text-[10px] uppercase tracking-wider font-medium text-gray-500">
        {eyebrow}
      </span>
      <p className="text-sm font-semibold text-white leading-snug mt-1 break-words">
        {display.titleLine}
      </p>
      {display.description ? (
        <p className="text-xs text-gray-400 leading-relaxed mt-2 line-clamp-4 break-words">
          {display.description}
        </p>
      ) : null}
    </div>
  )
}
