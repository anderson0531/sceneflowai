'use client'

import { motion } from 'framer-motion'
import { Cpu, Shield, Sparkles, Layers, TrendingUp } from 'lucide-react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { INFRASTRUCTURE_COPY } from '@/config/landing/infrastructureCopy'

export const INFRASTRUCTURE_SECTION_ID = 'infrastructure'

const WAVE_ICONS = [Sparkles, Layers, TrendingUp] as const

export function InfrastructureSection() {
  const t = useTranslations('infrastructure')

  const rawWave = t.has('wave')
    ? (t.raw('wave') as typeof INFRASTRUCTURE_COPY.wave)
    : INFRASTRUCTURE_COPY.wave
  const wave = rawWave?.pillars?.length ? rawWave : INFRASTRUCTURE_COPY.wave

  return (
    <section
      id={INFRASTRUCTURE_SECTION_ID}
      className="scroll-mt-20 border-y border-blue-500/10 bg-gradient-to-b from-slate-900 to-slate-950 py-16 sm:py-24"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Ride the AI -> SI Wave Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-4 py-1.5">
            <Sparkles className="h-4 w-4 text-emerald-400" />
            <span className="text-xs sm:text-sm font-semibold text-emerald-300">
              {wave.eyebrow}
            </span>
          </div>

          <h2 className="mb-4 text-2xl font-bold text-white sm:text-3xl lg:text-4xl max-w-3xl mx-auto leading-tight">
            {wave.headline}
          </h2>
          <p className="mx-auto mb-10 max-w-3xl text-sm sm:text-base text-gray-400 leading-relaxed">
            {wave.subheadline}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            {wave.pillars.map((pillar, idx) => {
              const Icon = WAVE_ICONS[idx] ?? Sparkles
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 flex flex-col justify-between"
                >
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center mb-4">
                      <Icon className="w-5 h-5 text-emerald-400" />
                    </div>
                    <h3 className="text-base font-bold text-white mb-2 leading-snug">
                      {pillar.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
                      {pillar.description}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </motion.div>

        {/* Enterprise Infrastructure Strip */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="pt-12 border-t border-slate-800/80 text-center"
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-800/50 px-4 py-1.5">
            <Shield className="h-4 w-4 text-blue-400" />
            <span className="text-xs sm:text-sm font-medium text-gray-300">{t('title')}</span>
          </div>

          <p className="mx-auto mb-6 max-w-2xl text-sm text-gray-400 sm:text-base">
            {t('description')}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-slate-800/60 px-5 py-2.5">
              <Image
                src="/images/google-cloud-logo.png"
                alt={t('badges.googleCloud')}
                width={24}
                height={24}
              />
              <span className="text-sm font-medium text-white">{t('badges.googleCloud')}</span>
            </div>
            <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-slate-800/60 px-5 py-2.5">
              <Cpu className="h-4 w-4 text-green-400" />
              <span className="text-sm font-medium text-white">{t('badges.vertexAi')}</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export default InfrastructureSection

