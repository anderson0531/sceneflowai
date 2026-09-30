'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Shield, CheckCircle2, ArrowRight, FileSearch } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { getLoginUrl } from '@/lib/auth/postLoginRedirect'
import {
  SectionCollapseBody,
  SectionCollapseToggle,
  useLandingSectionCollapse,
} from '@/components/landing/LandingSectionCollapse'
import { SectionNarrationButton } from '@/components/landing/SectionNarrationButton'
import { SECTION_NARRATION_AUDIO } from '@/config/landing/landingVisualMedia'
import { cn } from '@/lib/utils'

const SECTION_ID = 'trust-safety'

const TIER_GRADIENTS = [
  'from-cyan-500/20 to-blue-600/10 border-cyan-500/25',
  'from-violet-500/20 to-purple-600/10 border-violet-500/25',
  'from-emerald-500/20 to-teal-600/10 border-emerald-500/25',
] as const

export function TrustSafeguardSection() {
  const t = useTranslations('trustSafeguard')
  const { isOpen } = useLandingSectionCollapse(SECTION_ID)
  const tiers = t.raw('tiers') as Array<{
    id: string
    title: string
    description: string
    highlights: string[]
    badge: string
  }>
  const flowSteps = t.raw('flowSteps') as Array<{ label: string; detail: string }>
  const signupUrl = getLoginUrl({ mode: 'signup' })

  return (
    <section
      id={SECTION_ID}
      className={cn(
        'bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 scroll-mt-20',
        isOpen ? 'py-20 sm:py-24' : 'pt-20 pb-8 sm:pt-24 sm:pb-10'
      )}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative text-center mb-12"
        >
          <SectionCollapseToggle sectionId={SECTION_ID} className="absolute right-0 top-0" />
          <div className="inline-flex items-center px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full mb-4">
            <Shield className="w-4 h-4 text-cyan-400 mr-2" />
            <span className="text-cyan-300 text-sm font-medium">{t('badge')}</span>
          </div>
          <div className="flex items-center justify-center gap-3 mb-4">
            <h2 className="text-3xl sm:text-4xl font-bold text-white">
              {t('title')}{' '}
              <span className="bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                {t('titleAccent')}
              </span>
            </h2>
            <SectionNarrationButton src={SECTION_NARRATION_AUDIO[SECTION_ID]} />
          </div>
          <p className="text-gray-400 max-w-3xl mx-auto text-lg leading-relaxed">{t('subtitle')}</p>
        </motion.div>

        <SectionCollapseBody sectionId={SECTION_ID}>
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {flowSteps.map((step, index) => (
            <div
              key={step.label}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700 text-sm"
            >
              <span className="text-cyan-400 font-semibold">{step.label}</span>
              <span className="text-gray-400 hidden sm:inline">→</span>
              <span className="text-gray-300">{step.detail}</span>
              {index < flowSteps.length - 1 && (
                <span className="text-gray-600 ml-1 hidden md:inline">|</span>
              )}
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-10">
          {tiers.map((tier, index) => (
            <motion.div
              key={tier.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08 }}
              className={`rounded-2xl border bg-gradient-to-br p-6 ${TIER_GRADIENTS[index]}`}
            >
              <span className="inline-block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
                {tier.badge}
              </span>
              <h3 className="text-xl font-bold text-white mb-2">{tier.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed mb-4">{tier.description}</p>
              <ul className="space-y-2">
                {tier.highlights.map((highlight) => (
                  <li key={highlight} className="flex gap-2 text-sm text-gray-300">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <span>{highlight}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        <p className="text-center text-gray-500 text-sm max-w-3xl mx-auto mb-8 leading-relaxed">
          {t('morNote')}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href={t('ctaPolicyHref')}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-800 border border-slate-600 text-white font-medium hover:bg-slate-700 transition-colors"
          >
            <FileSearch className="w-4 h-4" />
            {t('ctaPolicy')}
          </Link>
          <a
            href={signupUrl}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-600 text-white font-medium hover:opacity-90 transition-opacity"
          >
            {t('ctaStudio')}
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
        </SectionCollapseBody>
      </div>
    </section>
  )
}
