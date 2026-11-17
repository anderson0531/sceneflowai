'use client'

import { useEffect, useMemo, useState } from 'react'
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
import { getSignupUrlForTier } from '@/lib/billing/checkoutIntent'
import { isPhoneHandset } from '@/lib/landing/phoneVideoFullscreen'

function exampleLabels(t: ReturnType<typeof useTranslations<'productionShowcase'>>) {
  return {
    ctaLabel: t('startProduction'),
    screeningRoomInstruction: t('screeningRoomInstruction'),
    trailerLabel: t('trailerLabel'),
    watchLongformLabel: t('watchLongform'),
    seriesDoorLabel: t('seriesDoor'),
    blueprintDoorLabel: t('blueprintDoor'),
    scriptArDoorLabel: t('scriptArDoor'),
    screeningDoorLabel: t('screeningDoor'),
    enterFullscreenLabel: t('enterFullscreen'),
    exitFullscreenLabel: t('exitFullscreen'),
    explorerHandoff: t('explorerHandoff'),
    showDetailLabel: t.has('showDetail') ? t('showDetail') : 'Show more detail',
    hideDetailLabel: t.has('hideDetail') ? t('hideDetail') : 'Hide detail',
    featuredPlayerLabel: t.has('featuredPlayer') ? t('featuredPlayer') : 'Featured Player',
    openPlayerLabel: t.has('openPlayer') ? t('openPlayer') : 'Open Player',
    featureModes: t.has('featureModes') ? (t.raw('featureModes') as string[]) : undefined,
  }
}

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
          {...exampleLabels(t)}
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
            <div className="flex min-w-0 flex-1 items-start gap-3 pr-3">
              <Clapperboard className="mt-0.5 h-5 w-5 shrink-0 text-cyan-400" />
              <div className="min-w-0 flex-1">
                <p className="whitespace-normal break-words text-sm font-bold leading-snug text-white">
                  {card.title}
                </p>
                <p className="mt-0.5 whitespace-normal break-words text-xs text-gray-400">
                  {card.badge}
                </p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-2 pb-2">
            <ProductionStyleCard
              card={card}
              index={index}
              {...exampleLabels(t)}
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
  const [isMobileView, setIsMobileView] = useState(() => {
    if (typeof window === 'undefined') return false
    return (
      isPhoneHandset() ||
      (typeof window.matchMedia === 'function' &&
        Boolean(window.matchMedia('(max-width: 767px)')?.matches))
    )
  })

  useEffect(() => {
    const syncLayout = () => {
      if (document.fullscreenElement) return
      const narrow =
        typeof window.matchMedia === 'function' &&
        Boolean(window.matchMedia('(max-width: 767px)')?.matches)
      setIsMobileView(isPhoneHandset() || narrow)
    }
    syncLayout()
    window.addEventListener('resize', syncLayout)
    window.addEventListener('orientationchange', syncLayout)
    document.addEventListener('fullscreenchange', syncLayout)
    return () => {
      window.removeEventListener('resize', syncLayout)
      window.removeEventListener('orientationchange', syncLayout)
      document.removeEventListener('fullscreenchange', syncLayout)
    }
  }, [])

  return (
    <section
      id={PRODUCTION_EXAMPLES_SECTION_ID}
      className="scroll-mt-20 overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 py-14 md:py-28"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="mb-8 md:mb-12 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p className="mb-3 text-[11px] sm:text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
            <Clapperboard className="me-1.5 inline h-3.5 w-3.5 align-[-2px] text-cyan-400" />
            <span>{t('badge')}</span>
          </p>

          <h2 className="mx-auto mb-4 max-w-4xl text-balance text-3xl font-bold text-white md:text-4xl lg:text-5xl">
            {t('title')}{' '}
            <span className="bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
              {t('titleAccent')}
            </span>
          </h2>

          <p className="mx-auto max-w-3xl text-base sm:text-lg text-gray-300">{t('subtitle')}</p>
          <div className="mx-auto mt-4 max-w-2xl space-y-1 border-l-2 border-cyan-400/50 pl-3.5 text-left sm:border-l-0 sm:pl-0 sm:text-center">
            <p className="text-xs sm:text-sm font-semibold text-cyan-200">{t('subtitleTagline')}</p>
            <p className="text-xs leading-relaxed text-gray-300">{t('languagesBanner')}</p>
          </div>
          <p className="mx-auto mt-2.5 max-w-2xl text-xs text-gray-400">{t('explorerHandoff')}</p>
        </motion.div>

        {/* Desktop: 2-column grid (mount only active layout so hidden duplicate <video> tags never hog connections) */}
        {!isMobileView ? (
          <div className="hidden md:block">
            <CardGrid cards={cards} t={t} />
          </div>
        ) : null}

        {/* Mobile: accordion — one card visible at a time */}
        {isMobileView ? (
          <div className="block md:hidden">
            <MobileAccordion cards={cards} t={t} />
          </div>
        ) : null}

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
