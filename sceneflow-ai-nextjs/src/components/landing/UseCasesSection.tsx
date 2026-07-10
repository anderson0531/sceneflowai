'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { User, Video, Briefcase, Building2, GraduationCap, ArrowRight } from 'lucide-react'
import { ScreeningRoomPreview } from './ScreeningRoomPreview'
import { getSignupUrlForTier } from '@/lib/billing/checkoutIntent'
import { cn } from '@/lib/utils'

const SECTION_ID = 'use-cases'

type PersonaId = 'youtubeCreator' | 'startupProvider' | 'enterprise' | 'educator'

const PERSONA_ICONS: Record<PersonaId, React.ElementType> = {
  youtubeCreator: Video,
  startupProvider: Briefcase,
  enterprise: Building2,
  educator: GraduationCap,
}

const PERSONA_GRADIENTS: Record<PersonaId, string> = {
  youtubeCreator: 'from-amber-500 to-orange-600',
  startupProvider: 'from-cyan-500 to-blue-600',
  enterprise: 'from-violet-500 to-purple-600',
  educator: 'from-emerald-500 to-teal-600',
}

type PersonaData = {
  id: PersonaId
  label: string
  headline: string
  description: string
  screeningRoomPreview: string
}

export default function UseCasesSection() {
  const t = useTranslations('useCasesShowcase')
  const [activePersona, setActivePersona] = useState<PersonaId>('youtubeCreator')

  const personas = useMemo(
    () => t.raw('personas') as PersonaData[],
    [t]
  )

  const active = personas.find((p) => p.id === activePersona) ?? personas[0]

  return (
    <section
      id={SECTION_ID}
      className="scroll-mt-20 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 py-20 md:py-28 overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-full mb-6">
            <User className="w-4 h-4 text-purple-400" />
            <span className="text-purple-300 text-sm font-medium">{t('badge')}</span>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
            {t('title')}
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg">{t('subtitle')}</p>
        </motion.div>

        <motion.div
          className="flex justify-center mb-10 px-2"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div className="inline-flex flex-wrap justify-center gap-1 p-1.5 rounded-2xl bg-slate-800/50 border border-slate-700/50 max-w-full">
            {personas.map((persona) => {
              const Icon = PERSONA_ICONS[persona.id]
              const gradient = PERSONA_GRADIENTS[persona.id]
              return (
                <button
                  key={persona.id}
                  type="button"
                  onClick={() => setActivePersona(persona.id)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300',
                    activePersona === persona.id
                      ? `bg-gradient-to-r ${gradient} text-white shadow-lg`
                      : 'text-gray-400 hover:text-white hover:bg-slate-700/50'
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="whitespace-nowrap">{persona.label}</span>
                </button>
              )
            })}
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-start">
          <motion.div
            key={activePersona}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35 }}
            className="space-y-4"
          >
            <h3 className="text-2xl md:text-3xl font-bold text-white">{active?.headline}</h3>
            <p className="text-gray-400 text-lg leading-relaxed">{active?.description}</p>
          </motion.div>

          <motion.div
            key={`preview-${activePersona}`}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35 }}
          >
            <ScreeningRoomPreview previewTitle={active?.screeningRoomPreview ?? ''} />
          </motion.div>
        </div>

        <motion.div
          className="text-center mt-14"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <button
            type="button"
            onClick={() => {
              window.location.href = getSignupUrlForTier('explorer')
            }}
            className="group inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 text-white font-semibold text-lg shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all duration-300"
          >
            {t('cta')}
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </motion.div>
      </div>
    </section>
  )
}
