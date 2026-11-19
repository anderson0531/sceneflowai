'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, CheckCircle2, GraduationCap, Play } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { TwoModesTheaterModal } from '@/components/landing/TwoModesTheaterModal'
import { VideoGlobeLanguageSelector } from '@/components/landing/VideoGlobeLanguageSelector'
import { useStudioLandingCopy } from '@/components/landing/useStudioLandingCopy'
import { getPrimaryValueMedia } from '@/config/landing/primaryValueMedia'
import {
  TRAILER_DUB_LOCALE_IDS,
  resolveTrailerDubLocale,
  type TrailerDubLocaleId,
} from '@/config/landing/productionPipelineDemo'
import { getSignupUrlForTier } from '@/lib/billing/checkoutIntent'
import { isPrelaunchAccessModeEnabled } from '@/lib/billing/prelaunchAccess'

export const STUDIO_ACADEMY_STRIP_ID = 'studio-academy'

export function StudioAcademyGuaranteeStrip() {
  const locale = useLocale()
  const tCommon = useTranslations('common')
  const copy = useStudioLandingCopy().academyStrip
  const prelaunchOnly = isPrelaunchAccessModeEnabled()
  const [theaterOpen, setTheaterOpen] = useState(false)
  const [videoLocale, setVideoLocale] = useState<TrailerDubLocaleId>(() =>
    resolveTrailerDubLocale(locale)
  )

  useEffect(() => {
    setVideoLocale(resolveTrailerDubLocale(locale))
  }, [locale])

  const media = getPrimaryValueMedia('academy', videoLocale)
  const hasVideo = Boolean(media.webmUrl || media.mp4Url)

  return (
    <section
      id={STUDIO_ACADEMY_STRIP_ID}
      className="scroll-mt-20 border-t border-slate-800/80 bg-slate-950 py-14 sm:py-16"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/65 p-6 shadow-xl sm:p-8 lg:p-10">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-8">
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-300">
                <GraduationCap className="h-4 w-4 shrink-0" aria-hidden />
                <span>{copy.badge}</span>
              </p>

              <h2 className="mt-2 text-xl font-bold leading-snug text-white sm:text-2xl lg:text-3xl">
                {copy.title}
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-gray-300 sm:text-base">
                {copy.subtitle}
              </p>

              <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                {copy.pills.map((pill) => (
                  <li
                    key={pill}
                    className="flex items-start gap-2 text-xs font-medium leading-snug text-gray-200"
                  >
                    <CheckCircle2
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400"
                      aria-hidden
                    />
                    <span>{pill}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:col-span-4 lg:flex-col">
              {hasVideo ? (
                <button
                  type="button"
                  title={copy.watchAcademyCta}
                  onClick={() => setTheaterOpen(true)}
                  className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-cyan-400/40 bg-cyan-500/15 px-4 py-3 text-sm font-semibold text-cyan-200 transition-colors hover:bg-cyan-500/25 hover:text-white cursor-pointer"
                >
                  <Play className="h-4 w-4 shrink-0 fill-current" aria-hidden />
                  <span className="whitespace-normal leading-snug">{copy.watchAcademyCta}</span>
                </button>
              ) : null}

              <Link
                href={getSignupUrlForTier('explorer')}
                title={prelaunchOnly ? 'Request Pre-Launch Access' : copy.startExplorerCta}
                className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 via-teal-400 to-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 transition-all hover:brightness-110"
              >
                <span>{prelaunchOnly ? 'Request Pre-Launch Access' : copy.startExplorerCta}</span>
                <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {hasVideo ? (
        <TwoModesTheaterModal
          open={theaterOpen}
          onClose={() => setTheaterOpen(false)}
          media={media}
          caption={copy.badge}
          pauseLabel={tCommon('pause')}
          playLabel={tCommon('play')}
          muteLabel={tCommon('mute')}
          unmuteLabel={tCommon('unmute')}
          languageControl={
            <VideoGlobeLanguageSelector
              activeLocale={videoLocale}
              availableLocales={TRAILER_DUB_LOCALE_IDS}
              onSelectLocale={setVideoLocale}
              variant="theater"
              align="start"
            />
          }
        />
      ) : null}
    </section>
  )
}

export default StudioAcademyGuaranteeStrip
