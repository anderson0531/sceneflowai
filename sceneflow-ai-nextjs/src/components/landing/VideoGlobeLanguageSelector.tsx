'use client'

import React, { useState } from 'react'
import { Check, Globe } from 'lucide-react'
import { useTranslations } from 'next-intl'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  TRAILER_DUB_LOCALE_IDS,
  type TrailerDubLocaleId,
} from '@/config/landing/productionPipelineDemo'
import { cn } from '@/lib/utils'

const FALLBACK_LABELS: Record<TrailerDubLocaleId, { nativeLabel: string; label: string }> = {
  en: { nativeLabel: 'English', label: 'English' },
  es: { nativeLabel: 'Español', label: 'Spanish' },
  pt: { nativeLabel: 'Português', label: 'Portuguese' },
  hi: { nativeLabel: 'हिन्दी', label: 'Hindi' },
  zh: { nativeLabel: '中文', label: 'Chinese' },
  ar: { nativeLabel: 'العربية', label: 'Arabic' },
  th: { nativeLabel: 'ไทย', label: 'Thai' },
}

export type VideoGlobeLanguageSelectorProps = {
  activeLocale: TrailerDubLocaleId
  onSelectLocale: (locale: TrailerDubLocaleId) => void
  availableLocales?: readonly TrailerDubLocaleId[]
  align?: 'start' | 'end'
  variant?: 'hero' | 'card' | 'theater'
  markAsHeroControl?: boolean
  className?: string
}

/**
 * Icon-only Globe language selector with tooltip for landing hero and example videos.
 * Switches between the 7 in-scene synced language versions (EN, ES, PT, HI, ZH, AR, TH).
 */
export function VideoGlobeLanguageSelector({
  activeLocale,
  onSelectLocale,
  availableLocales = TRAILER_DUB_LOCALE_IDS,
  align = 'end',
  variant = 'hero',
  markAsHeroControl = false,
  className,
}: VideoGlobeLanguageSelectorProps) {
  const tHero = useTranslations('hero')
  const [menuOpen, setMenuOpen] = useState(false)

  const stopPropagation = (event: React.SyntheticEvent) => {
    event.stopPropagation()
  }

  const getNativeLabel = (id: TrailerDubLocaleId): string => {
    const key = `heroVideoLanguages.${id}.nativeLabel` as const
    return tHero.has(key) ? tHero(key) : FALLBACK_LABELS[id].nativeLabel
  }

  const getEnglishLabel = (id: TrailerDubLocaleId): string => {
    const key = `heroVideoLanguages.${id}.label` as const
    return tHero.has(key) ? tHero(key) : FALLBACK_LABELS[id].label
  }

  const soonLabel = tHero.has('soon') ? tHero('soon') : 'Soon'
  const activeNativeLabel = getNativeLabel(activeLocale)
  const tooltipLabel = `Language (${activeNativeLabel})`

  return (
    <div
      className={cn('inline-flex', className)}
      {...(markAsHeroControl ? { 'data-hero-control': '' } : {})}
      onPointerDown={stopPropagation}
      onClick={stopPropagation}
    >
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <TooltipProvider delayDuration={150}>
          <Tooltip open={menuOpen ? false : undefined}>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label={tooltipLabel}
                  onPointerDown={stopPropagation}
                  onClick={stopPropagation}
                  className={cn(
                    'flex shrink-0 items-center justify-center rounded-full border border-white/20 bg-black/65 text-white backdrop-blur-sm transition-colors cursor-pointer hover:border-cyan-400/50 hover:bg-black/85',
                    variant === 'theater' ? 'h-9 w-9' : 'h-8 w-8'
                  )}
                >
                  <Globe className="h-4 w-4 shrink-0 text-cyan-400" aria-hidden />
                </button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent
              side="bottom"
              className="z-[120] border border-white/15 bg-slate-900/95 px-2.5 py-1 text-xs font-medium text-white shadow-lg backdrop-blur-md"
            >
              {tooltipLabel}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <DropdownMenuContent
          align={align}
          className="z-[110] w-56 border-slate-800 bg-slate-900/95 p-1.5 text-gray-100 shadow-xl backdrop-blur-md"
          onPointerDown={stopPropagation}
          onClick={stopPropagation}
          onCloseAutoFocus={(event) => event.preventDefault()}
        >
          <div className="mb-1 flex items-center gap-1.5 border-b border-slate-800 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-cyan-300">
            <Globe className="h-3 w-3 shrink-0 text-cyan-400" aria-hidden />
            <span>In-Scene Sync</span>
          </div>

          <div className="space-y-0.5">
            {TRAILER_DUB_LOCALE_IDS.map((id) => {
              const isSelected = id === activeLocale
              const isAvailable = availableLocales.includes(id)
              const nativeLabel = getNativeLabel(id)
              const englishLabel = getEnglishLabel(id)
              const showSecondary = englishLabel !== nativeLabel

              return (
                <DropdownMenuItem
                  key={id}
                  disabled={!isAvailable}
                  onSelect={() => {
                    if (isAvailable) onSelectLocale(id)
                  }}
                  className={cn(
                    'flex items-center justify-between gap-2 rounded-md px-2.5 py-2 text-sm transition-colors',
                    isSelected
                      ? 'bg-cyan-500/15 font-medium text-cyan-300 focus:bg-cyan-500/20 focus:text-cyan-200'
                      : 'text-gray-200 hover:bg-slate-800 hover:text-white focus:bg-slate-800 focus:text-white'
                  )}
                >
                  <span className="flex min-w-0 items-baseline gap-1.5">
                    <span className="truncate">{nativeLabel}</span>
                    {showSecondary ? (
                      <span className="truncate text-xs text-gray-400">{englishLabel}</span>
                    ) : null}
                  </span>
                  {isSelected ? (
                    <Check className="h-4 w-4 shrink-0 text-cyan-400" aria-hidden />
                  ) : !isAvailable ? (
                    <span className="text-[10px] uppercase tracking-wide text-gray-500">
                      {soonLabel}
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium uppercase text-gray-500">{id}</span>
                  )}
                </DropdownMenuItem>
              )
            })}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export default VideoGlobeLanguageSelector
