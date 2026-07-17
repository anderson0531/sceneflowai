'use client'

import { useEffect, useState } from 'react'
import { Languages, Video as VideoIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { StudioVideoWatermark } from '@/components/landing/StudioVideoWatermark'
import type {
  PersonaStoryLocale,
  PersonaStoryLocaleId,
} from '@/config/landing/personaStoryVideos'
import { cn } from '@/lib/utils'

type MultiLanguageVideoPlayerProps = {
  locales: PersonaStoryLocale[]
  defaultLocaleId: PersonaStoryLocaleId
  languagePromptLabel: string
  comingSoonLabel: string
  soonLabel: string
  title?: string
  /** Tailwind gradient (e.g. "from-amber-500 to-orange-600") for the placeholder accent. */
  accentGradient?: string
  className?: string
}

export function MultiLanguageVideoPlayer({
  locales,
  defaultLocaleId,
  languagePromptLabel,
  comingSoonLabel,
  soonLabel,
  title,
  accentGradient = 'from-indigo-500 to-purple-600',
  className,
}: MultiLanguageVideoPlayerProps) {
  const tHero = useTranslations('hero')
  const [activeLocaleId, setActiveLocaleId] = useState<PersonaStoryLocaleId>(defaultLocaleId)

  useEffect(() => {
    setActiveLocaleId(defaultLocaleId)
  }, [defaultLocaleId])

  const active = locales.find((locale) => locale.id === activeLocaleId)
  const hasVideo = Boolean(active?.available && active.src)

  return (
    <div className={cn('w-full space-y-3', className)}>
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-300">
        <Languages className="h-4 w-4" />
        {languagePromptLabel}
      </div>

      <div
        className="w-full max-w-full overflow-x-auto overscroll-x-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        role="group"
        aria-label={languagePromptLabel}
      >
        <div className="flex flex-nowrap items-center gap-2 min-w-min pb-0.5 sm:flex-wrap">
          {locales.map((locale) => {
            const isActive = locale.id === activeLocaleId && locale.available
            const isDisabled = !locale.available
            const label = tHero(`heroVideoLanguages.${locale.id}.label`)
            const nativeLabel = tHero(`heroVideoLanguages.${locale.id}.nativeLabel`)

            return (
              <button
                key={locale.id}
                type="button"
                disabled={isDisabled}
                aria-pressed={isActive}
                aria-label={isDisabled ? `${label} — ${soonLabel.toLowerCase()}` : label}
                onClick={() => locale.available && setActiveLocaleId(locale.id)}
                className={cn(
                  'shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-100'
                    : 'bg-white/5 border-white/10 text-gray-300 hover:border-white/20 hover:text-white',
                  isDisabled &&
                    'opacity-50 cursor-not-allowed hover:border-white/10 hover:text-gray-300'
                )}
              >
                <span className="hidden sm:inline">{nativeLabel}</span>
                <span className="sm:hidden">{label}</span>
                {isDisabled && (
                  <span className="ml-1.5 text-[10px] uppercase tracking-wide text-gray-500">
                    {soonLabel}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-white/10 bg-black">
        {hasVideo ? (
          <>
            <video
              key={activeLocaleId}
              src={active!.src}
              poster={active!.poster}
              controls
              playsInline
              preload="metadata"
              controlsList="nodownload"
              onContextMenu={(e) => e.preventDefault()}
              aria-label={title}
              className="h-full w-full object-cover"
            />
            <StudioVideoWatermark />
          </>
        ) : (
          <div
            className={cn(
              'absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-br p-6 text-center',
              accentGradient
            )}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm">
              <VideoIcon className="h-6 w-6 text-white" />
            </div>
            <p className="text-sm font-medium text-white/90">{comingSoonLabel}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default MultiLanguageVideoPlayer
