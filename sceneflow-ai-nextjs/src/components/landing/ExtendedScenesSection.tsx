'use client'

import { motion } from 'framer-motion'
import { Film, Link2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import {
  SectionCollapseBody,
  SectionCollapseToggle,
  useLandingSectionCollapse,
} from '@/components/landing/LandingSectionCollapse'
import { cn } from '@/lib/utils'

const SECTION_ID = 'extended-scenes'

export function ExtendedScenesSection() {
  const t = useTranslations('extendedScenes')
  const { isOpen } = useLandingSectionCollapse(SECTION_ID)
  const steps = t.raw('steps') as Array<{ title: string; description: string }>
  const stats = t.raw('stats') as Array<{ value: string; label: string }>

  return (
    <section
      id={SECTION_ID}
      className={cn(
        'bg-slate-950 scroll-mt-20',
        isOpen ? 'py-16 sm:py-20' : 'pt-16 pb-8 sm:pt-20 sm:pb-10'
      )}
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative mb-8"
        >
          <SectionCollapseToggle sectionId={SECTION_ID} className="absolute right-0 top-0" />
          <div className="flex items-start gap-4 pr-12">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shrink-0">
              <Film className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-teal-300 mb-1">
                {t('badge')}
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold text-white">
                {t('title')}{' '}
                <span className="text-teal-400">{t('titleAccent')}</span>
              </h2>
              <p className="text-gray-300 leading-relaxed mt-3 max-w-3xl">{t('subtitle')}</p>
            </div>
          </div>
        </motion.div>

        <SectionCollapseBody sectionId={SECTION_ID}>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-teal-500/20 bg-gradient-to-br from-teal-950/30 via-slate-950 to-slate-950 p-8 sm:p-10"
          >
            <p className="text-gray-400 leading-relaxed mb-8 max-w-3xl text-sm">{t('intro')}</p>

            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-10 py-4 px-2 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="px-3 py-1.5 rounded-lg bg-teal-500/20 text-teal-200 text-sm font-medium">
                8s initial
              </span>
              <Link2 className="w-4 h-4 text-gray-500 hidden sm:block" />
              <span className="px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-200 text-sm font-medium">
                +7s EXT
              </span>
              <Link2 className="w-4 h-4 text-gray-500 hidden sm:block" />
              <span className="px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-200 text-sm font-medium">
                +7s EXT
              </span>
              <Link2 className="w-4 h-4 text-gray-500 hidden sm:block" />
              <span className="px-3 py-1.5 rounded-lg bg-violet-500/20 text-violet-200 text-sm font-medium">
                Production Mixer
              </span>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 mb-8">
              {steps.map((step, index) => (
                <div
                  key={step.title}
                  className="flex gap-3 p-4 rounded-xl bg-slate-900/50 border border-slate-800"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-500/20 text-teal-200 text-xs font-bold">
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="font-semibold text-white text-sm mb-1">{step.title}</h3>
                    <p className="text-gray-400 text-sm leading-relaxed">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center p-3 rounded-lg bg-slate-900/40">
                  <div className="text-lg sm:text-xl font-bold text-teal-300">{stat.value}</div>
                  <div className="text-xs text-gray-500 mt-1 leading-snug">{stat.label}</div>
                </div>
              ))}
            </div>

            <p className="text-xs text-gray-500 leading-relaxed border-t border-slate-800 pt-4">
              {t('footnote')}
            </p>
          </motion.div>
        </SectionCollapseBody>
      </div>
    </section>
  )
}
