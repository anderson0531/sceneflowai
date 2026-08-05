'use client'

import { useTranslations } from 'next-intl'

import { ASSISTANT } from '@/lib/constants/assistant'
import { ASSISTANT_ICON } from '@/lib/constants/assistantIcon'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

type Props = {
  onClick: () => void
  /** Section this trigger is scoped to, used for the accessible name. */
  scopeLabel?: string
  /**
   * `section` sits beside a subsection heading; `toolbar` sits in the card
   * toolbar alongside other icon actions.
   */
  size?: 'section' | 'toolbar'
  disabled?: boolean
  className?: string
}

/**
 * The single entry point to the Intelligent Assistant Director.
 *
 * Previously an unlabelled pencil, which read as generic "edit" and hid the
 * app's headline feature. The label is always present at sm and up so the
 * action is legible without hovering; the tooltip carries the full brand name
 * so the button itself can stay short.
 */
export function AssistantButton({
  onClick,
  scopeLabel,
  size = 'section',
  disabled,
  className,
}: Props) {
  const t = useTranslations('blueprint.assistantButton')
  const Icon = ASSISTANT_ICON

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-label={scopeLabel ? t('scopedLabel', { scope: scopeLabel }) : t('label')}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md border font-medium transition-colors',
              'border-cyan-500/30 bg-cyan-500/10 text-cyan-300',
              'hover:border-cyan-400/60 hover:bg-cyan-500/20 hover:text-cyan-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50',
              'disabled:opacity-50 disabled:pointer-events-none',
              size === 'toolbar' ? 'h-8 px-2.5 text-xs' : 'h-7 px-2 text-[11px]',
              className
            )}
          >
            <Icon className={size === 'toolbar' ? 'h-4 w-4' : 'h-3.5 w-3.5'} aria-hidden />
            <span className="hidden sm:inline">{t('label')}</span>
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">{t('tooltip', { brand: ASSISTANT.full })}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export default AssistantButton
