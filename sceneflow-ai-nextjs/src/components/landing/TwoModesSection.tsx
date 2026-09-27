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
  themLabel: string
  usLabel: string
  rows: Array<{ them: string; us: string }>
}

type MediaCard = {
  id: string
  title: string
  body: string
  caption: string
}

type EarnCopy = {
  id: string
  title: string
  body: string
  caption: string
}

type LanguagesCopy = {
  id: string
  body: string
  caption: string
}

export function TwoModesSection() {
  const t = useTranslations('twoModes')
  const comparison = t.raw('comparison') as ComparisonCopy
  const retired = t.raw('retired') as MediaCard[]
  const stages = t.raw('stages') as MediaCard[]
  const earn = t.raw('earn') as EarnCopy
  const languages = t.raw('languages') as LanguagesCopy
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

        <div className="mx-auto max-w-5xl">
          <TwoModesMediaFrame
            mediaId={comparison.id}
            caption={comparison.caption}
            comingSoon={comingSoon}
          />
          <div className="mt-6 hidden gap-4 text-xs font-semibold uppercase tracking-wider text-slate-500 md:grid md:grid-cols-2">
            <p>{comparison.themLabel}</p>
            <p>{comparison.usLabel}</p>
          </div>
          <ul className="mt-2 divide-y divide-white/10 rounded-2xl border border-white/10 bg-slate-900/40">
            {comparison.rows.map((row) => (
              <li key={row.them} className="grid gap-2 px-5 py-4 md:grid-cols-2 md:gap-4">
                <p className="text-sm text-gray-400">
                  <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500 md:hidden">
                    {comparison.themLabel}
                  </span>
                  {row.them}
                </p>
                <p className="text-sm text-white">
                  <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-indigo-300/80 md:hidden">
                    {comparison.usLabel}
                  </span>
                  {row.us}
                </p>
              </li>
            ))}
          </ul>
        </div>

        <ul className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-5">
          {retired.map((card, index) => (
            <motion.li
              key={card.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: index * 0.04 }}
              className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-slate-900/60 p-5 shadow-lg shadow-slate-950/40 sm:p-6"
            >
              <TwoModesMediaFrame mediaId={card.id} caption={card.caption} comingSoon={comingSoon} />
              <div>
                <h3 className="text-lg font-semibold text-white">{card.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-gray-400">{card.body}</p>
              </div>
            </motion.li>
          ))}
        </ul>

        <ol className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
          {stages.map((stage, index) => (
            <motion.li
              key={stage.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: index * 0.04 }}
              className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-slate-900/60 p-5 shadow-lg shadow-slate-950/40 sm:p-6"
            >
              <TwoModesMediaFrame
                mediaId={stage.id}
                caption={stage.caption}
                comingSoon={comingSoon}
              />
              <div>
                <h3 className="text-lg font-semibold text-white">{stage.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-gray-400">{stage.body}</p>
              </div>
            </motion.li>
          ))}
        </ol>

        <motion.div
          className="mt-10 grid gap-4 rounded-2xl border border-white/10 bg-slate-900/60 p-5 shadow-lg shadow-slate-950/40 md:grid-cols-2 md:items-center md:p-6"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
        >
          <TwoModesMediaFrame mediaId={earn.id} caption={earn.caption} comingSoon={comingSoon} />
          <div>
            <h3 className="text-xl font-semibold text-white">{earn.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-gray-400">{earn.body}</p>
          </div>
        </motion.div>

        <motion.div
          className="mt-4 grid gap-4 rounded-2xl border border-white/10 bg-slate-900/60 p-5 shadow-lg shadow-slate-950/40 md:grid-cols-2 md:items-center md:p-6"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
        >
          <TwoModesMediaFrame
            mediaId={languages.id}
            caption={languages.caption}
            comingSoon={comingSoon}
          />
          <p className="text-sm leading-relaxed text-gray-300 sm:text-base">{languages.body}</p>
        </motion.div>

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
