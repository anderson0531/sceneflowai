'use client'

import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { NotifyCapture } from '@/components/landing/NotifyCapture'
import { getSignupUrlForTier } from '@/lib/billing/checkoutIntent'
import { isPrelaunchAccessModeEnabled } from '@/lib/billing/prelaunchAccess'
import { openPrelaunchAccessModal } from '@/components/landing/PrelaunchAccessModal'
import { localizeUsdText } from '@/lib/i18n/landingCurrency'

export function FinalCTA() {
  const locale = useLocale()
  const t = useTranslations('finalCta')
  const prelaunchOnly = isPrelaunchAccessModeEnabled()

  return (
    <section className="py-14 sm:py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-gray-950 via-purple-500/5 to-gray-950"></div>

      <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-20 right-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl"></div>

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-6">{t('title')}</h2>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto mb-8">{t('subtitle')}</p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            {prelaunchOnly ? (
              <button
                type="button"
                onClick={() => {
                  if (!openPrelaunchAccessModal({ tier: 'explorer', source: 'final-cta' })) {
                    window.location.href = getSignupUrlForTier('explorer')
                  }
                }}
                className="inline-flex items-center justify-center w-full sm:w-auto rounded-xl bg-gradient-to-r from-cyan-400 via-teal-400 to-cyan-500 px-8 py-3.5 text-base font-semibold text-slate-950 shadow-lg shadow-cyan-500/25 hover:brightness-110 transition-all cursor-pointer"
              >
                {t.has('requestPreLaunchAccess') ? t('requestPreLaunchAccess') : 'Request Pre-Launch Access'}
                <ArrowRight className="ml-2 w-5 h-5" />
              </button>
            ) : (
              <Link
                href={getSignupUrlForTier('explorer')}
                className="inline-flex items-center justify-center w-full sm:w-auto rounded-xl bg-gradient-to-r from-cyan-400 via-teal-400 to-cyan-500 px-8 py-3.5 text-base font-semibold text-slate-950 shadow-lg shadow-cyan-500/25 hover:brightness-110 transition-all"
              >
                {localizeUsdText(t('cta'), locale)}
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            )}
            <Link
              href="#studio-tour"
              className="inline-flex items-center justify-center w-full sm:w-auto rounded-xl border border-purple-500/40 px-8 py-3.5 text-base font-semibold text-purple-200 hover:bg-purple-500/10 transition-colors"
            >
              {t('ctaSecondary')}
            </Link>
          </div>

          <div className="mt-10 pt-8 border-t border-slate-800/70 flex justify-center">
            <NotifyCapture source="final-cta" />
          </div>
        </motion.div>
      </div>
    </section>
  )
}
