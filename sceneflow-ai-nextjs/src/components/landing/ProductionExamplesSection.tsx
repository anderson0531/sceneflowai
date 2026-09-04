'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { Clapperboard, Target } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  ProductionStyleCard,
  type ProductionStyleCardData,
} from '@/components/landing/ProductionStyleCard'
import { getProductionShowcaseScreeningSlug } from '@/config/landing/productionShowcaseScreening'
import { getSignupUrlForTier } from '@/lib/billing/checkoutIntent'

export const PRODUCTION_EXAMPLES_SECTION_ID = 'production-examples'

function CardGrid({
  cards,
  t,
}: {
  cards: ProductionStyleCardData[]
  t: ReturnType<typeof useTranslations<'productionShowcase'>>
}) {
  return (
    <div className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-2">
      {cards.map((card, index) => (
        <ProductionStyleCard
          key={card.id}
          card={card}
          index={index}
          workflowLabel={t('workflowLabel')}
          ctaLabel={t('startProduction')}
          screeningRoomInstruction={t('screeningRoomInstruction')}
          frictionLabel={t('frictionLabel')}
          solutionPillarLabel={t('solutionPillarLabel')}
          showSolutionsSectionLabel={t('showSolutionsSection')}
          hideSolutionsSectionLabel={t('hideSolutionsSection')}
          screeningEmbedSlug={getProductionShowcaseScreeningSlug(card.id)}
        />
      ))}
    </div>
  )
}

function MobileAccordion({
  cards,
  t,
}: {
  cards: ProductionStyleCardData[]
  t: ReturnType<typeof useTranslations<'productionShowcase'>>
}) {
  return (
    <Accordion type="single" collapsible className="mb-12 space-y-3" defaultValue={cards[0]?.id}>
      {cards.map((card, index) => (
        <AccordionItem
          key={card.id}
          value={card.id}
          className="overflow-hidden rounded-2xl border border-gray-700/40 bg-slate-900/50"
        >
          <AccordionTrigger className="px-4 py-4 text-left hover:no-underline [&[data-state=open]>svg]:rotate-180">
            <div className="flex items-center gap-3 pr-4">
              <Clapperboard className="h-5 w-5 shrink-0 text-cyan-400" />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-white">{card.title}</p>
                <p className="mt-0.5 truncate text-xs text-gray-400">{card.badge}</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-2 pb-2">
            <ProductionStyleCard
              card={card}
              index={index}
              workflowLabel={t('workflowLabel')}
              ctaLabel={t('startProduction')}
              screeningRoomInstruction={t('screeningRoomInstruction')}
              frictionLabel={t('frictionLabel')}
              solutionPillarLabel={t('solutionPillarLabel')}
              showSolutionsSectionLabel={t('showSolutionsSection')}
              hideSolutionsSectionLabel={t('hideSolutionsSection')}
              screeningEmbedSlug={getProductionShowcaseScreeningSlug(card.id)}
            />
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}

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

          <h2 className="mx-auto mb-4 max-w-4xl text-balance text-3xl font-bold text-white md:text-4xl lg:text-5xl">
            {t('title')}{' '}
            <span className="bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
              {t('titleAccent')}
            </span>
          </h2>

          <p className="mx-auto max-w-3xl text-lg text-gray-400">{t('subtitle')}</p>
          <p className="mx-auto mt-4 max-w-3xl text-lg font-semibold text-white">
            {t('subtitleTagline')}
          </p>
          <p className="mx-auto mt-3 max-w-3xl text-sm text-gray-400">{t('languagesBanner')}</p>
          <div className="mx-auto mt-6 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
            <Button
              variant="outline"
              className="border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10"
              onClick={() => {
                document
                  .getElementById('production-showcase-drama')
                  ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }}
            >
              {t('explorePipelineCta')}
            </Button>
            <p className="max-w-md text-xs text-gray-500">{t('explorePipelineHint')}</p>
          </div>
        </motion.div>

        {/* Desktop: 2-column grid */}
        <div className="hidden md:block">
          <CardGrid cards={cards} t={t} />
        </div>

        {/* Mobile: accordion — one card visible at a time */}
        <div className="md:hidden">
          <MobileAccordion cards={cards} t={t} />
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
