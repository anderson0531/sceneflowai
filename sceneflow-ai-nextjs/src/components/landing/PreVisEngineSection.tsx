'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Clapperboard, FileText, LineChart, Zap, ArrowRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { getLoginUrl } from '@/lib/auth/postLoginRedirect'
import {
  SectionCollapseBody,
  SectionCollapseToggle,
  useLandingSectionCollapse,
} from '@/components/landing/LandingSectionCollapse'
import { cn } from '@/lib/utils'

const SECTION_ID = 'pre-vis-engine'

const PILLAR_ICONS = [FileText, Zap, LineChart] as const

const SIGNUP_URL = getLoginUrl({ mode: 'signup' })

export function PreVisEngineSection() {
  const t = useTranslations('preVisEngine')
  const { isOpen } = useLandingSectionCollapse(SECTION_ID)
  const pillars = t.raw('pillars') as Array<{ title: string; description: string }>
  const workflowSteps = t.raw('workflow.steps') as string[]

  return (
    <section
      id={SECTION_ID}
      className={cn(
        'bg-gradient-to-b from-slate-950 via-indigo-950/20 to-slate-950 relative overflow-hidden scroll-mt-20',
        isOpen ? 'py-24' : 'pt-24 pb-8'
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(99,102,241,0.08),transparent_50%)]" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative text-center mb-12 max-w-4xl mx-auto"
        >
          <SectionCollapseToggle sectionId={SECTION_ID} className="absolute right-0 top-0" />
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-4">
            <Clapperboard className="w-3.5 h-3.5" />
            {t('badge')}
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">{t('title')}</h2>
          <p className="text-lg text-slate-400 leading-relaxed mb-4">{t('subtitle')}</p>
          <p className="text-base text-slate-500 leading-relaxed">{t('narrative')}</p>
        </motion.div>

        <SectionCollapseBody sectionId={SECTION_ID}>
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {pillars.map((pillar, idx) => {
              const Icon = PILLAR_ICONS[idx] ?? Clapperboard
              return (
                <motion.div
                  key={pillar.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 hover:border-indigo-500/30 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/15 flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-indigo-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{pillar.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{pillar.description}</p>
                </motion.div>
              )
            })}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-900 p-8 lg:p-10"
          >
            <h3 className="text-xl font-bold text-white mb-6">{t('workflow.title')}</h3>
            <ol className="grid sm:grid-cols-2 gap-4 mb-8">
              {workflowSteps.map((step, idx) => (
                <li key={step} className="flex items-start gap-3 text-slate-300">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-sm font-semibold text-indigo-300">
                    {idx + 1}
                  </span>
                  <span className="text-sm pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <Button asChild className="bg-indigo-600 hover:bg-indigo-500 text-white">
                <Link href={SIGNUP_URL}>
                  {t('cta')}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
              <p className="text-sm text-slate-500">{t('ctaSubtext')}</p>
            </div>
          </motion.div>
        </SectionCollapseBody>
      </div>
    </section>
  )
}
