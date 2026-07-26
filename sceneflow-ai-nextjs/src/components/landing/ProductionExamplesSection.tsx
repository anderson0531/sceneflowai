'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { Clapperboard, Target } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import {
  ProductionStyleCard,
  type ProductionStyleCardData,
} from '@/components/landing/ProductionStyleCard'
import { SectionNarrationButton } from '@/components/landing/SectionNarrationButton'
import { SECTION_NARRATION_AUDIO } from '@/config/landing/landingVisualMedia'
import {
  getDefaultProductionShowcaseLocale,
  getProductionShowcaseVideoLocales,
} from '@/config/landing/productionShowcaseVideos'
import { getSignupUrlForTier } from '@/lib/billing/checkoutIntent'

export const PRODUCTION_EXAMPLES_SECTION_ID = 'production-examples'

export default function ProductionExamplesSection() {
  const t = useTranslations('productionShowcase')
  const cards = useMemo(() => t.raw('cards') as ProductionStyleCardData[], [t])

  return (
    <section
      id={PRODUCTION_EXAMPLES_SECTION_ID}
      className="scroll-mt-20 overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 py-20 md:py-28"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="mb-12 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-4 py-2">
            <Clapperboard className="h-4 w-4 text-cyan-400" />
            <span className="text-sm font-medium text-cyan-300">{t('badge')}</span>
          </div>

          <div className="mb-4 flex items-center justify-center gap-3">
            <h2 className="text-3xl font-bold text-white md:text-4xl lg:text-5xl">
              {t('title')}{' '}
              <span className="bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
                {t('titleAccent')}
              </span>
            </h2>
            <SectionNarrationButton
              src={SECTION_NARRATION_AUDIO['use-cases']}
              playLabel={t('playNarration')}
              pauseLabel={t('pauseNarration')}
              comingSoonLabel={t('narrationComingSoon')}
            />
          </div>

          <p className="mx-auto max-w-3xl text-lg text-gray-400">{t('subtitle')}</p>
        </motion.div>

        <div className="mb-12 grid gap-6 md:grid-cols-2">
          {cards.map((card, index) => (
            <ProductionStyleCard
              key={card.id}
              card={card}
              index={index}
              workflowLabel={t('workflowLabel')}
              toolsLabel={t('toolsLabel')}
              ctaLabel={t('startProduction')}
              videoLocales={getProductionShowcaseVideoLocales(card.id)}
              defaultVideoLocaleId={getDefaultProductionShowcaseLocale(card.id)}
              videoLanguagePromptLabel={t('videoLanguagePrompt')}
              videoComingSoonLabel={t('videoComingSoon')}
              videoSoonLabel={t('videoSoon')}
            />
          ))}
        </div>

        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <div className="inline-flex flex-wrap items-center justify-center gap-4 rounded-xl border border-gray-700/50 bg-gray-800/50 p-4 md:gap-6">
            <div className="flex items-center gap-2">
              <Clapperboard className="h-5 w-5 shrink-0 text-purple-400" />
              <span className="text-sm text-gray-300">{t('continuityNote')}</span>
            </div>
            <div className="hidden h-6 w-px bg-gray-700 md:block" />
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 shrink-0 text-cyan-400" />
              <span className="text-sm text-gray-300">{t('resonanceNote')}</span>
            </div>
            <div className="hidden h-6 w-px bg-gray-700 md:block" />
            <Button
              variant="outline"
              onClick={() => {
                window.location.href = getSignupUrlForTier('explorer')
              }}
              className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
            >
              {t('cta')}
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
