'use client'

import { motion } from 'framer-motion'
import { Cpu, Shield } from 'lucide-react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'

export const INFRASTRUCTURE_SECTION_ID = 'infrastructure'

export function InfrastructureSection() {
  const t = useTranslations('infrastructure')

  return (
    <section
      id={INFRASTRUCTURE_SECTION_ID}
      className="scroll-mt-20 border-y border-blue-500/10 bg-gradient-to-b from-slate-900 to-slate-950 py-16 sm:py-20"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-800/50 px-4 py-2">
            <Shield className="h-4 w-4 text-blue-400" />
            <span className="text-sm font-medium text-gray-300">{t('title')}</span>
          </div>

          <h2 className="mb-4 text-2xl font-bold text-white sm:text-3xl">{t('title')}</h2>
          <p className="mx-auto mb-8 max-w-3xl text-base text-gray-400 sm:text-lg">
            {t('description')}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-slate-800/60 px-5 py-3">
              <Image
                src="/images/google-cloud-logo.png"
                alt={t('badges.googleCloud')}
                width={28}
                height={28}
              />
              <span className="font-medium text-white">{t('badges.googleCloud')}</span>
            </div>
            <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-slate-800/60 px-5 py-3">
              <Cpu className="h-5 w-5 text-green-400" />
              <span className="font-medium text-white">{t('badges.vertexAi')}</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export default InfrastructureSection
