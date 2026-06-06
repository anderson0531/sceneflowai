'use client'

import { motion } from 'framer-motion'
import { 
  Shield, 
  Zap, 
  Server, 
  Lock, 
  Globe, 
  Clock, 
  CheckCircle2,
  Cpu,
  Database,
  Cloud
} from 'lucide-react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import {
  SectionCollapseBody,
  SectionCollapseToggle,
  useLandingSectionCollapse,
} from '@/components/landing/LandingSectionCollapse'
import { cn } from '@/lib/utils'

const SECTION_ID = 'engineering'

const PILLAR_ICONS = [Cpu, Shield, Globe] as const
const METRIC_ICONS = [Server, Zap, Lock, Clock] as const
const VERTEX_CARD_ICONS = [Lock, Zap, Database] as const

export function EngineeringTrust() {
  const t = useTranslations('engineeringTrust')
  const { isOpen } = useLandingSectionCollapse(SECTION_ID)

  const pillars = PILLAR_ICONS.map((icon, index) => ({
    icon,
    ...(t.raw(`pillars.${index}`) as {
      id: string
      title: string
      description: string
      highlights: string[]
    }),
    gradient: ['from-cyan-500 to-blue-600', 'from-purple-500 to-violet-600', 'from-emerald-500 to-teal-600'][index],
    bgColor: ['bg-cyan-500/10', 'bg-purple-500/10', 'bg-emerald-500/10'][index],
    borderColor: ['border-cyan-500/20', 'border-purple-500/20', 'border-emerald-500/20'][index],
    iconColor: ['text-cyan-400', 'text-purple-400', 'text-emerald-400'][index],
  }))

  const metrics = METRIC_ICONS.map((icon, index) => ({
    icon,
    ...(t.raw(`metrics.${index}`) as { value: string; label: string }),
  }))

  const vertexCards = VERTEX_CARD_ICONS.map((icon, index) => ({
    icon,
    ...(t.raw(`vertexSection.cards.${index}`) as {
      title: string
      description: string
      highlight?: string
    }),
  }))

  return (
    <section
      id={SECTION_ID}
      className={cn(
        'bg-gradient-to-b from-slate-950 to-slate-900 scroll-mt-20',
        isOpen ? 'py-16 sm:py-20 lg:py-24' : 'pt-16 pb-8 sm:pt-20 sm:pb-10'
      )}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative text-center mb-12"
        >
          <SectionCollapseToggle sectionId={SECTION_ID} className="absolute right-0 top-0" />
          <div className="inline-flex items-center px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-4">
            <Shield className="w-4 h-4 text-emerald-400 mr-2" />
            <span className="text-emerald-300 text-sm font-medium">{t('badge')}</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            {t('title')}{' '}
            <span className="bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
              {t('titleAccent')}
            </span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">{t('subtitle')}</p>
        </motion.div>

        <SectionCollapseBody sectionId={SECTION_ID}>
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {pillars.map((pillar, index) => {
            const PillarIcon = pillar.icon
            return (
              <motion.div
                key={pillar.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={`relative p-6 rounded-2xl ${pillar.bgColor} border ${pillar.borderColor} overflow-hidden`}
              >
                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${pillar.gradient} opacity-10 rounded-full blur-3xl`} />
                <div className="relative">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${pillar.gradient} flex items-center justify-center mb-4 shadow-lg`}>
                    <PillarIcon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">{pillar.title}</h3>
                  <p className="text-gray-400 text-base mb-4 leading-relaxed">{pillar.description}</p>
                  <ul className="space-y-2">
                    {pillar.highlights.map((highlight, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-base">
                        <CheckCircle2 className={`w-4 h-4 ${pillar.iconColor} flex-shrink-0`} />
                        <span className="text-gray-300">{highlight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            )
          })}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="bg-gradient-to-r from-slate-800/60 to-slate-800/40 rounded-2xl p-6 sm:p-8 border border-slate-700/50"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {metrics.map((metric) => {
              const MetricIcon = metric.icon
              return (
                <div key={metric.label} className="text-center">
                  <MetricIcon className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
                  <div className="text-2xl sm:text-3xl font-bold text-white mb-1">{metric.value}</div>
                  <div className="text-base text-gray-400">{metric.label}</div>
                </div>
              )
            })}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.35 }}
          className="mt-12"
        >
          <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-950/20 via-slate-900 to-slate-900 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <Cloud className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">{t('vertexSection.title')}</h3>
                <p className="text-base text-gray-400">{t('vertexSection.subtitle')}</p>
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {vertexCards.map((card, idx) => {
                const CardIcon = card.icon
                const iconBg = ['bg-emerald-500/20', 'bg-amber-500/20', 'bg-purple-500/20'][idx]
                const iconColor = ['text-emerald-400', 'text-amber-400', 'text-purple-400'][idx]
                return (
                  <div key={card.title} className="p-5 rounded-xl bg-slate-800/50 border border-slate-700/50">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center`}>
                        <CardIcon className={`w-5 h-5 ${iconColor}`} />
                      </div>
                      <h4 className="font-semibold text-white">{card.title}</h4>
                    </div>
                    <p className="text-base text-gray-400">
                      {card.highlight ? (
                        <>
                          {card.description.split(card.highlight)[0]}
                          <span className="text-emerald-400 font-medium">{card.highlight}</span>
                          {card.description.split(card.highlight)[1]}
                        </>
                      ) : (
                        card.description
                      )}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-12 text-center"
        >
          <div className="inline-flex items-center gap-3 px-6 py-3 bg-slate-800/50 rounded-full border border-slate-700/50">
            <Image 
              src="/images/google-cloud-logo.png" 
              alt="Google Cloud" 
              width={24} 
              height={24}
              className="opacity-90"
            />
            <span className="text-gray-300 text-base">{t('partnership.poweredBy')}</span>
          </div>
          <p className="text-gray-500 text-sm mt-3 max-w-lg mx-auto">{t('partnership.footnote')}</p>
          <p className="text-gray-400 text-sm mt-4 max-w-2xl mx-auto">
            {t('trustSafeguardLink')}{' '}
            <button
              type="button"
              onClick={() => document.getElementById('trust-safety')?.scrollIntoView({ behavior: 'smooth' })}
              className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2"
            >
              View Trust &amp; Safety
            </button>
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="text-center mt-8"
        >
          <p className="text-gray-500 text-base italic">{t('attribution')}</p>
        </motion.div>
        </SectionCollapseBody>
      </div>
    </section>
  )
}

export default EngineeringTrust
