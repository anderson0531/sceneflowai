'use client'

import { ChevronDown, Languages } from 'lucide-react'
import { useTranslations } from 'next-intl'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { VideoLocale, VideoLocaleId } from '@/config/landing/videoLocales'
import { cn } from '@/lib/utils'

/** Viewport width below which the pill row collapses into a one-line dropdown. */
export type PickerCompactUpTo = 'sm' | 'lg'

// Tailwind only sees literal class names, so both breakpoint pairs are spelled out.
const VISIBILITY: Record<PickerCompactUpTo, { compact: string; expanded: string }> = {
  sm: { compact: 'sm:hidden', expanded: 'hidden sm:block' },
  lg: { compact: 'lg:hidden', expanded: 'hidden lg:block' },
}

type VideoLanguagePickerProps = {
  locales: VideoLocale[]
  activeLocaleId: VideoLocaleId
  onSelect: (id: VideoLocaleId) => void
  promptLabel: string
  soonLabel: string
  /**
   * Where the pills come back. Full-width players can afford them from `sm`;
   * players inside a multi-column card need the extra room until `lg`.
   */
  compactUpTo?: PickerCompactUpTo
}

/**
 * Dub selector for the landing video players.
 *
 * Seven pills wrap to four rows on a 320px screen, pushing the video most of a
 * viewport down the page, so narrow layouts get a single-line dropdown instead.
 */
export function VideoLanguagePicker({
  locales,
  activeLocaleId,
  onSelect,
  promptLabel,
  soonLabel,
  compactUpTo = 'sm',
}: VideoLanguagePickerProps) {
  const tHero = useTranslations('hero')
  const visibility = VISIBILITY[compactUpTo]

  const nativeLabelOf = (id: VideoLocaleId) => tHero(`heroVideoLanguages.${id}.nativeLabel`)
  const labelOf = (id: VideoLocaleId) => tHero(`heroVideoLanguages.${id}.label`)
  /** Null for English-named languages, where both labels read the same. */
  const secondaryLabelOf = (id: VideoLocaleId) => {
    const label = labelOf(id)
    return label === nativeLabelOf(id) ? null : label
  }

  const availableCount = locales.filter((locale) => locale.available).length
  const active = locales.find((locale) => locale.id === activeLocaleId)

  return (
    <div>
      <div className={visibility.compact}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={promptLabel}
              className="flex w-full items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-left transition-colors hover:border-white/20"
            >
              <Languages className="h-4 w-4 shrink-0 text-indigo-300" aria-hidden />
              <span className="truncate text-sm font-medium text-white">
                {active ? nativeLabelOf(active.id) : ''}
              </span>
              <span className="shrink-0 text-xs text-gray-400">
                {tHero('videoLanguageCount', { count: availableCount })}
              </span>
              <ChevronDown className="ml-auto h-4 w-4 shrink-0 text-gray-400" aria-hidden />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="start"
            className="w-60 border-white/10 bg-slate-900 text-gray-100"
          >
            <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-indigo-300">
              {promptLabel}
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={activeLocaleId}
              onValueChange={(value) => onSelect(value as VideoLocaleId)}
            >
              {locales.map((locale) => {
                const secondaryLabel = secondaryLabelOf(locale.id)

                return (
                  <DropdownMenuRadioItem
                    key={locale.id}
                    value={locale.id}
                    disabled={!locale.available}
                    className="gap-2 py-2 focus:bg-white/10 focus:text-white"
                  >
                    <span className="font-medium">{nativeLabelOf(locale.id)}</span>
                    {secondaryLabel ? (
                      <span className="text-xs text-gray-400">{secondaryLabel}</span>
                    ) : null}
                    {!locale.available ? (
                      <span className="ml-auto text-[10px] uppercase tracking-wide text-gray-500">
                        {soonLabel}
                      </span>
                    ) : null}
                  </DropdownMenuRadioItem>
                )
              })}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className={visibility.expanded}>
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-300">
          <Languages className="h-4 w-4" aria-hidden />
          {promptLabel}
        </div>

        <div
          className="flex w-full min-w-0 flex-wrap items-center gap-2"
          role="group"
          aria-label={promptLabel}
        >
          {locales.map((locale) => {
            const isActive = locale.id === activeLocaleId && locale.available
            const isDisabled = !locale.available

            return (
              <button
                key={locale.id}
                type="button"
                disabled={isDisabled}
                aria-pressed={isActive}
                aria-label={
                  isDisabled
                    ? `${labelOf(locale.id)} — ${soonLabel.toLowerCase()}`
                    : labelOf(locale.id)
                }
                onClick={() => locale.available && onSelect(locale.id)}
                className={cn(
                  'shrink-0 rounded-full border px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-100'
                    : 'bg-white/5 border-white/10 text-gray-300 hover:border-white/20 hover:text-white',
                  isDisabled &&
                    'opacity-50 cursor-not-allowed hover:border-white/10 hover:text-gray-300'
                )}
              >
                {nativeLabelOf(locale.id)}
                {isDisabled ? (
                  <span className="ml-1.5 text-[10px] uppercase tracking-wide text-gray-500">
                    {soonLabel}
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default VideoLanguagePicker
