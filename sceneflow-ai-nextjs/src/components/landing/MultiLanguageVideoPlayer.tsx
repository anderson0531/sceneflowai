'use client'

import { useEffect, useState } from 'react'
import { Video as VideoIcon } from 'lucide-react'
import {
  VideoLanguagePicker,
  type PickerCompactUpTo,
} from '@/components/landing/VideoLanguagePicker'
import type { VideoLocale, VideoLocaleId } from '@/config/landing/videoLocales'
import { cn } from '@/lib/utils'

type MultiLanguageVideoPlayerProps = {
  locales: VideoLocale[]
  defaultLocaleId: VideoLocaleId
  languagePromptLabel: string
  comingSoonLabel: string
  soonLabel: string
  title?: string
  /** Tailwind gradient (e.g. "from-amber-500 to-orange-600") for the placeholder accent. */
  accentGradient?: string
  /** Lets the video frame escape a padded container on phones so it plays wider. */
  fullBleedOnMobile?: boolean
  /** Width below which the language pills collapse into a one-line dropdown. */
  compactPickerUpTo?: PickerCompactUpTo
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
  fullBleedOnMobile = false,
  compactPickerUpTo = 'sm',
  className,
}: MultiLanguageVideoPlayerProps) {
  const [activeLocaleId, setActiveLocaleId] = useState<VideoLocaleId>(defaultLocaleId)

  useEffect(() => {
    setActiveLocaleId(defaultLocaleId)
  }, [defaultLocaleId])

  const active = locales.find((locale) => locale.id === activeLocaleId)
  const hasVideo = Boolean(active?.available && active.src)

  return (
    <div className={cn('w-full space-y-3', className)}>
      <VideoLanguagePicker
        locales={locales}
        activeLocaleId={activeLocaleId}
        onSelect={setActiveLocaleId}
        promptLabel={languagePromptLabel}
        soonLabel={soonLabel}
        compactUpTo={compactPickerUpTo}
      />

      <div
        className={cn(
          'relative aspect-video w-full overflow-hidden border border-white/10 bg-black',
          fullBleedOnMobile
            ? '-mx-4 w-auto rounded-none border-x-0 sm:mx-0 sm:w-full sm:rounded-xl sm:border-x'
            : 'rounded-xl'
        )}
      >
        {hasVideo ? (
          <video
            key={`${activeLocaleId}-${active!.src}`}
            src={active!.src}
            poster={active!.poster}
            controls
            playsInline
            preload="metadata"
            controlsList="nodownload"
            onContextMenu={(e) => e.preventDefault()}
            aria-label={title}
            className="h-full w-full object-contain"
          />
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
