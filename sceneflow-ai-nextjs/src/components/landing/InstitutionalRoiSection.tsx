'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Building2, ArrowRight, CheckCircle2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import {
  SectionCollapseBody,
  SectionCollapseToggle,
  useLandingSectionCollapse,
} from '@/components/landing/LandingSectionCollapse'
import { cn } from '@/lib/utils'

const SECTION_ID = 'institutional-roi'

export function InstitutionalRoiSection() {
  const t = useTranslations('institutionalRoi')
  const { isOpen } = useLandingSectionCollapse(SECTION_ID)
  const comparisons = t.raw('comparisons') as Array<{ label: string; cost: string; timeline: string }>
  const bullets = t.raw('bullets') as string[]

  return (
    <section
      id={SECTION_ID}
      className={cn(
        'bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 scroll-mt-20',
        isOpen ? 'py-20' : 'pt-20 pb-8'
      )}
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative mb-8"
        >
          <SectionCollapseToggle sectionId={SECTION_ID} className="absolute right-0 top-0" />
          <div className="flex items-center gap-3 mb-4 pr-12">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="text-sm font-medium text-emerald-300">{t('badge')}</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">{t('title')}</h2>
          <p className="text-gray-400 max-w-2xl">{t('subtitle')}</p>
        </motion.div>

        <SectionCollapseBody sectionId={SECTION_ID}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/30 via-slate-900 to-slate-900 p-8 lg:p-10"
          >
            <div className="grid md:grid-cols-2 gap-4 mb-8">
              {comparisons.map((row, idx) => (
                <div
                  key={row.label}
                  className={`rounded-xl p-5 border ${
                    idx === 0
                      ? 'bg-red-500/5 border-red-500/20'
                      : 'bg-emerald-500/5 border-emerald-500/20'
                  }`}
                >
                  <p className="text-sm uppercase tracking-wide text-gray-500 mb-2">{row.label}</p>
                  <div className="flex flex-wrap gap-6">
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">{t('typicalCost')}</p>
                      <p className={`text-lg font-bold ${idx === 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                        {row.cost}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">{t('timeline')}</p>
                      <p className={`text-lg font-bold ${idx === 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                        {row.timeline}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <ul className="space-y-3 mb-8">
              {bullets.map((bullet) => (
                <li key={bullet} className="flex items-start gap-2 text-gray-300">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors"
              >
                {t('ctaPrimary')}
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="#pricing"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10 font-medium transition-colors"
              >
                {t('ctaSecondary')}
              </a>
            </div>
          </motion.div>
        </SectionCollapseBody>
      </div>
    </section>
  )
}
