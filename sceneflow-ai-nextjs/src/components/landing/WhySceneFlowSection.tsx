'use client'

import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { useTranslations } from 'next-intl'
import {
  SectionCollapseBody,
  SectionCollapseToggle,
  useLandingSectionCollapse,
} from '@/components/landing/LandingSectionCollapse'
import { cn } from '@/lib/utils'

const SECTION_ID = 'why-sceneflow'

export function WhySceneFlowSection() {
  const t = useTranslations('whySceneFlow')
  const { isOpen } = useLandingSectionCollapse(SECTION_ID)
  const rows = t.raw('rows') as Array<{ them: string; us: string }>

  return (
    <section
      id={SECTION_ID}
      className={cn(
        'bg-slate-950 scroll-mt-20',
        isOpen ? 'py-20 sm:py-24' : 'pt-20 pb-8 sm:pt-24 sm:pb-10'
      )}
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative text-center mb-12"
        >
          <SectionCollapseToggle sectionId={SECTION_ID} className="absolute right-0 top-0" />
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">{t('title')}</h2>
          <p className="text-gray-400 max-w-2xl mx-auto">{t('subtitle')}</p>
        </motion.div>

        <SectionCollapseBody sectionId={SECTION_ID}>
          <div className="rounded-2xl border border-white/10 overflow-hidden">
            <div className="hidden sm:grid sm:grid-cols-2 bg-slate-900/80 border-b border-white/10 text-sm font-semibold uppercase tracking-wider text-gray-500">
              <div className="px-5 py-3">{t('themHeader')}</div>
              <div className="px-5 py-3 text-cyan-400/90">{t('usHeader')}</div>
            </div>
            {rows.map((row, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="grid sm:grid-cols-2 border-b border-white/5 last:border-b-0"
              >
                <div className="px-5 py-4 text-base text-gray-400 border-b sm:border-b-0 sm:border-r border-white/5">
                  {row.them}
                </div>
                <div className="px-5 py-4 text-base text-gray-200 flex gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{row.us}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </SectionCollapseBody>
      </div>
    </section>
  )
}
