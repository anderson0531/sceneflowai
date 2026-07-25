'use client'

import { useCallback, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { Clapperboard } from 'lucide-react'
import { ProductionComparisonVisual } from '@/components/landing/ProductionComparisonVisual'
import { SectionNarrationButton } from '@/components/landing/SectionNarrationButton'
import { SECTION_NARRATION_AUDIO } from '@/config/landing/landingVisualMedia'
import { parseUseCaseExampleHash } from '@/config/landing/useCaseExamples'

export const PRODUCTION_EXAMPLES_SECTION_ID = 'production-examples'

export default function ProductionExamplesSection() {
  const t = useTranslations('useCases')
  const tUi = useTranslations('useCases.ui')
  const sectionRef = useRef<HTMLElement>(null)

  // Shareable `#use-cases-{category}-{example}` bookmarks live in this section now,
  // so they need to drive scrolling here — no element carries the example hash as an id.
  const scrollToSectionForExampleHash = useCallback(() => {
    if (!parseUseCaseExampleHash(window.location.hash.slice(1))) return
    sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  useEffect(() => {
    scrollToSectionForExampleHash()
    window.addEventListener('hashchange', scrollToSectionForExampleHash)
    return () => window.removeEventListener('hashchange', scrollToSectionForExampleHash)
  }, [scrollToSectionForExampleHash])

  return (
    <section
      ref={sectionRef}
      id={PRODUCTION_EXAMPLES_SECTION_ID}
      className="scroll-mt-20 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 py-20 md:py-28 overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full mb-6">
            <Clapperboard className="w-4 h-4 text-cyan-400" />
            <span className="text-cyan-300 text-sm font-medium">{t('badge')}</span>
          </div>

          <div className="flex items-center justify-center gap-3 mb-4">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white">
              {t('title')}{' '}
              <span className="bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
                {t('titleAccent')}
              </span>
            </h2>
            <SectionNarrationButton
              src={SECTION_NARRATION_AUDIO['use-cases']}
              playLabel={tUi('playNarration')}
              pauseLabel={tUi('pauseNarration')}
              comingSoonLabel={tUi('narrationComingSoon')}
            />
          </div>

          <p className="text-gray-400 max-w-3xl mx-auto text-lg">{t('subtitle')}</p>
        </motion.div>

        <ProductionComparisonVisual />

        <motion.p
          className="mt-8 max-w-3xl mx-auto text-center text-xs leading-relaxed text-slate-500"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {t('qualifyingStatement')}
        </motion.p>
      </div>
    </section>
  )
}
