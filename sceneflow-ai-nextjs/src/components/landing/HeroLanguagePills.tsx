'use client'

import {
  HERO_VIDEO_LOCALES,
  type HeroVideoLocaleId,
} from '@/config/landing/heroVideoLocales'
import { cn } from '@/lib/utils'

type HeroLanguagePillsProps = {
  activeLocale: HeroVideoLocaleId
  onSelect: (id: HeroVideoLocaleId) => void
  /** Subtle pulse on browser-suggested locale (first visit) */
  highlightLocale?: HeroVideoLocaleId | null
  size?: 'sm' | 'md'
  className?: string
}

export function HeroLanguagePills({
  activeLocale,
  onSelect,
  highlightLocale,
  size = 'md',
  className,
}: HeroLanguagePillsProps) {
  const sizeClasses = size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm'

  return (
    <div
      className={cn('flex flex-wrap items-center justify-center gap-2', className)}
      role="group"
      aria-label="Hero video language"
    >
      {HERO_VIDEO_LOCALES.map((locale) => {
        const isActive = activeLocale === locale.id
        const isDisabled = !locale.available
        const isHighlighted = highlightLocale === locale.id && !isActive

        return (
          <button
            key={locale.id}
            type="button"
            disabled={isDisabled}
            aria-pressed={isActive}
            aria-label={
              isDisabled
                ? `${locale.label} — coming soon`
                : `Play hero video in ${locale.label}`
            }
            onClick={() => onSelect(locale.id)}
            className={cn(
              'rounded-full font-medium transition-colors border',
              sizeClasses,
              isActive
                ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-100'
                : 'bg-white/5 border-white/10 text-gray-300 hover:border-white/20 hover:text-white',
              isDisabled &&
                'opacity-50 cursor-not-allowed hover:border-white/10 hover:text-gray-300',
              isHighlighted && 'animate-pulse ring-2 ring-cyan-400/40 ring-offset-1 ring-offset-black/50'
            )}
          >
            <span className="hidden sm:inline">{locale.nativeLabel}</span>
            <span className="sm:hidden">{locale.label}</span>
            {isDisabled ? (
              <span className="ml-1.5 text-[10px] uppercase tracking-wide text-gray-500">
                Soon
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
