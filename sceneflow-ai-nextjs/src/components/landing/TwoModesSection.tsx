'use client'

import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { TwoModesMediaFrame } from '@/components/landing/TwoModesMediaFrame'
import { getSignupUrlForTier } from '@/lib/billing/checkoutIntent'

export const TWO_MODES_SECTION_ID = 'two-modes'

/** Legacy hashes that now land on the consolidated pipeline section. */
export const TWO_MODES_HASH_ALIASES = [
  'core-capabilities',
  'audience-resonance',
  'pre-vis-engine',
] as const

type ComparisonCopy = {
  id: string
  caption: string
}

export function TwoModesSection() {
  const t = useTranslations('twoModes')
  const comparison = t.raw('comparison') as ComparisonCopy
  const comingSoon = t('comingSoon')

  const scrollToCheckout = () => {
    window.location.href = getSignupUrlForTier('explorer')
  }

  return (
    <section
      id={TWO_MODES_SECTION_ID}
      className="relative scroll-mt-20 bg-gradient-to-b from-gray-950 via-slate-950 to-slate-950 py-20 md:py-24"
    >
      {TWO_MODES_HASH_ALIASES.map((aliasId) => (
        <span
          key={aliasId}
          id={aliasId}
          className="absolute top-0 left-0 h-0 w-0 scroll-mt-20"
          aria-hidden="true"
        />
      ))}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="mb-12 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">
            {t('eyebrow')}
          </p>
          <h2 className="mx-auto max-w-4xl text-balance text-3xl font-bold text-white md:text-4xl lg:text-5xl">
            {t('title')}
          </h2>
          <p className="mx-auto mt-5 max-w-3xl text-balance text-base text-gray-400 sm:text-lg">
            {t('subtitle')}
          </p>
        </motion.div>

        <div className="mx-auto max-w-7xl">
          <TwoModesMediaFrame
            mediaId={comparison.id}
            caption={comparison.caption}
            comingSoon={comingSoon}
          />
        </div>

        <motion.div
          className="mt-10 flex justify-center"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
        >
          <Button
            size="lg"
            className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:opacity-90"
            onClick={scrollToCheckout}
          >
            {t('cta')}
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </motion.div>
      </div>
    </section>
  )
}

export default TwoModesSection
