'use client'

import { motion } from 'framer-motion'
import { ArrowRight, CheckCircle2, Clapperboard, Zap } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { getSignupUrlForTier } from '@/lib/billing/checkoutIntent'

export const TWO_MODES_SECTION_ID = 'two-modes'

export function TwoModesSection() {
  const t = useTranslations('twoModes')
  const goPoints = t.raw('go.points') as string[]
  const directorPoints = t.raw('director.points') as string[]

  const scrollToCheckout = () => {
    window.location.href = getSignupUrlForTier('explorer')
  }

  return (
    <section
      id={TWO_MODES_SECTION_ID}
      className="scroll-mt-20 bg-gradient-to-b from-gray-950 via-slate-950 to-slate-950 py-20 md:py-24"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="mb-12 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="mx-auto max-w-4xl text-balance text-3xl font-bold text-white md:text-4xl lg:text-5xl">
            {t('title')}
          </h2>
          <p className="mx-auto mt-5 max-w-3xl text-balance text-base text-gray-400 sm:text-lg">
            {t('subtitle')}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <motion.article
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="flex h-full flex-col rounded-2xl border border-indigo-500/40 bg-gradient-to-br from-indigo-950/60 to-slate-900/80 p-6 shadow-lg shadow-indigo-900/20 sm:p-8 lg:col-span-3"
          >
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5">
                <Clapperboard className="h-4 w-4 text-indigo-400" />
                <span className="text-sm font-medium text-indigo-300">
                  {t('director.name')} · {t('director.subtitle')}
                </span>
              </span>
              <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-amber-200">
                {t('director.badge')}
              </span>
            </div>
            <p className="mb-6 text-xl font-semibold text-indigo-100 sm:text-2xl">
              {t('director.tagline')}
            </p>
            <ul className="mb-8 flex-1 space-y-3">
              {directorPoints.map((point) => (
                <li key={point} className="flex items-start gap-3 text-sm text-gray-200">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-indigo-400" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
            <Button
              size="lg"
              className="w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:opacity-90"
              onClick={scrollToCheckout}
            >
              {t('director.cta')}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </motion.article>

          <motion.article
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex h-full flex-col rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/30 to-slate-900/80 p-6 sm:p-8 lg:col-span-2"
          >
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5">
                <Zap className="h-4 w-4 text-emerald-400" />
                <span className="text-sm font-medium text-emerald-300">{t('go.name')}</span>
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-gray-300">
                {t('go.badge')}
              </span>
            </div>
            <p className="mb-6 text-lg font-semibold text-emerald-100">{t('go.tagline')}</p>
            <ul className="mb-8 flex-1 space-y-3">
              {goPoints.map((point) => (
                <li key={point} className="flex items-start gap-3 text-sm text-gray-300">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
            <Button
              size="lg"
              variant="outline"
              className="w-full border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/10"
              onClick={scrollToCheckout}
            >
              {t('go.cta')}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </motion.article>
        </div>
      </div>
    </section>
  )
}

export default TwoModesSection
