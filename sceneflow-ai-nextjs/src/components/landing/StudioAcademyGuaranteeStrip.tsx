'use client'

import { useState } from 'react'
import { ArrowRight, CheckCircle2, GraduationCap, HelpCircle, Play } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { TwoModesTheaterModal } from '@/components/landing/TwoModesTheaterModal'
import { useStudioLandingCopy } from '@/components/landing/useStudioLandingCopy'
import { getPrimaryValueMedia } from '@/config/landing/primaryValueMedia'
import { getSignupUrlForTier } from '@/lib/billing/checkoutIntent'

export const STUDIO_ACADEMY_STRIP_ID = 'studio-academy'

export function StudioAcademyGuaranteeStrip() {
  const locale = useLocale()
  const tCommon = useTranslations('common')
  const copy = useStudioLandingCopy().academyStrip
  const [theaterOpen, setTheaterOpen] = useState(false)

  const media = getPrimaryValueMedia('academy', locale)
  const hasVideo = Boolean(media.webmUrl || media.mp4Url)

  return (
    <section
      id={STUDIO_ACADEMY_STRIP_ID}
      className="scroll-mt-20 border-t border-white/10 bg-slate-950 py-14 sm:py-16"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-cyan-500/25 bg-gradient-to-r from-slate-900 via-indigo-950/45 to-slate-900 p-6 shadow-xl sm:p-8 lg:p-10">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3.5 py-1 text-xs font-semibold text-cyan-300">
                <GraduationCap className="h-4 w-4" aria-hidden />
                <span>{copy.badge}</span>
              </div>

              <h2 className="mt-3 text-xl font-bold leading-snug text-white sm:text-2xl lg:text-3xl">
                {copy.title}
              </h2>
              <p className="mt-2.5 max-w-3xl text-sm leading-relaxed text-gray-300 sm:text-base">
                {copy.subtitle}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {copy.pills.map((pill) => (
                  <span
                    key={pill}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-slate-950/70 px-3 py-1 text-xs font-medium text-gray-200"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" aria-hidden />
                    <span>{pill}</span>
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:col-span-4 lg:flex-col lg:items-end">
              {hasVideo ? (
                <button
                  type="button"
                  onClick={() => setTheaterOpen(true)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-400/40 bg-cyan-500/15 px-4 py-3 text-sm font-semibold text-cyan-200 transition-colors hover:bg-cyan-500/25 hover:text-white lg:w-auto"
                >
                  <Play className="h-4 w-4 fill-current" aria-hidden />
                  <span>{copy.watchAcademyCta}</span>
                </button>
              ) : null}

              <Button
                onClick={() => {
                  window.location.href = getSignupUrlForTier('explorer')
                }}
                className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:opacity-95 lg:w-auto"
              >
                <HelpCircle className="me-2 h-4 w-4 text-cyan-200" aria-hidden />
                <span>{copy.startExplorerCta}</span>
                <ArrowRight className="ms-2 h-4 w-4" aria-hidden />
              </Button>
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
        />
      ) : null}
    </section>
  )
}

export default StudioAcademyGuaranteeStrip
