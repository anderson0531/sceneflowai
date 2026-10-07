'use client'

import { useTranslations } from 'next-intl'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type {
  ReferenceActionItem,
  ReferenceActionSummary,
  ReferenceStillAction,
} from '@/lib/vision/libraryKindAgents'

const VERB_KEY: Record<ReferenceStillAction, 'actionAdd' | 'actionMissing' | 'actionChanged'> = {
  add: 'actionAdd',
  missing: 'actionMissing',
  changed: 'actionChanged',
}

/**
 * Named still cue: "Missing · Door blown". Extra items show as +N.
 * Click selects the worst remaining still.
 */
export function ReferenceActionCue({
  summary,
  onSelect,
  className,
  interactive = true,
}: {
  summary: ReferenceActionSummary
  onSelect?: (item: ReferenceActionItem) => void
  className?: string
  /** Span when the cue sits inside another button, such as a tab. */
  interactive?: boolean
}) {
  const t = useTranslations('production.direction.locationLibrary')
  const primary = summary.primary
  if (!primary) return null

  const cue = (item: ReferenceActionItem) =>
    t('actionCue', { action: t(VERB_KEY[item.action]), name: item.name })
  const label = cue(primary)
  const extra = summary.items.length - 1
  const list = summary.items.map(cue).join('\n')
  const toneClass =
    summary.tone === 'attention'
      ? 'border-amber-400/50 bg-amber-500/15 text-amber-200 hover:bg-amber-500/25'
      : 'border-red-500/50 bg-red-500/15 text-red-200 hover:bg-red-500/25'

  const cueClass = cn(
    'inline-flex max-w-[14rem] items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium',
    toneClass,
    className
  )
  const body = (
    <>
      <span className="truncate">{label}</span>
      {extra > 0 ? (
        <span className="shrink-0 opacity-80">{t('actionMore', { count: extra })}</span>
      ) : null}
    </>
  )

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {interactive ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              onSelect?.(primary)
            }}
            className={cueClass}
            title={list}
          >
            {body}
          </button>
        ) : (
          <span className={cueClass} title={list}>
            {body}
          </span>
        )}
      </TooltipTrigger>
      <TooltipContent className="max-w-xs whitespace-pre-line text-left">{list}</TooltipContent>
    </Tooltip>
  )
}
