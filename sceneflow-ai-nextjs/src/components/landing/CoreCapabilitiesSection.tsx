'use client'

import { motion } from 'framer-motion'
import { Target, Zap, Sparkles, Clock, Globe, Film, ArrowRight, ChevronDown } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { getLoginUrl } from '@/lib/auth/postLoginRedirect'
import {
  SectionCollapseBody,
  SectionCollapseToggle,
  useLandingSectionCollapse,
} from '@/components/landing/LandingSectionCollapse'
import { SectionNarrationButton } from '@/components/landing/SectionNarrationButton'
import { SECTION_NARRATION_AUDIO } from '@/config/landing/landingVisualMedia'
import { cn } from '@/lib/utils'

const SECTION_ID = 'core-capabilities'

const SIGNUP_URL = getLoginUrl({ mode: 'signup' })

const AR_BULLET_ICONS = [Target, Sparkles, Zap, Film] as const
const EXPRESS_ITEM_ICONS = [Globe, Clock, Film] as const

export function CoreCapabilitiesSection() {
  const t = useTranslations('coreCapabilities')
  const { isOpen } = useLandingSectionCollapse(SECTION_ID)

  const arBullets = AR_BULLET_ICONS.map((icon, index) => ({
    icon,
    text: t(`audienceResonance.bullets.${index}`),
  }))

  const howWeScoreBullets = t.raw('audienceResonance.howWeScore.bullets') as string[]

  const expressItems = EXPRESS_ITEM_ICONS.map((icon, index) => ({
    icon,
    ...(t.raw(`express.items.${index}`) as { title: string; desc: string; time: string }),
  }))

  return (
    <section
      id={SECTION_ID}
      className={cn(
        'bg-slate-950 relative overflow-hidden scroll-mt-20',
        isOpen ? 'py-24' : 'pt-24 pb-8'
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(120,119,198,0.1),transparent_50%)]" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative text-center mb-12 max-w-3xl mx-auto"
        >
          <SectionCollapseToggle sectionId={SECTION_ID} className="absolute right-0 top-0" />
          <div className="flex flex-wrap justify-center gap-2 mb-4">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
              {t('audienceResonance.badge')}
            </span>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold uppercase tracking-wider">
              {t('express.badge')}
            </span>
          </div>
          <div className="flex items-center justify-center gap-3">
            <h2 className="text-3xl md:text-4xl font-bold text-white">
              {t('audienceResonance.title')} · {t('express.title')}
            </h2>
            <SectionNarrationButton src={SECTION_NARRATION_AUDIO[SECTION_ID]} />
          </div>
        </motion.div>

        <SectionCollapseBody sectionId={SECTION_ID}>
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="group"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-6">
              <Target className="w-3.5 h-3.5" />
              {t('audienceResonance.badge')}
            </div>
            
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              {t('audienceResonance.title')}
            </h2>
            
            <p className="text-lg text-slate-400 mb-8 leading-relaxed">
              {t('audienceResonance.description')}
            </p>
            
            <ul className="space-y-4 mb-10">
              {arBullets.map((item, idx) => (
                <li key={idx} className="flex items-center gap-3 text-slate-300">
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-slate-900 border border-white/10 flex items-center justify-center group-hover:border-emerald-500/30 transition-colors">
                    <item.icon className="w-4 h-4 text-emerald-400" />
                  </div>
                  <span className="text-base font-medium">{item.text}</span>
                </li>
              ))}
            </ul>

            <details className="mb-8 rounded-xl border border-white/10 bg-slate-900/50 overflow-hidden group">
              <summary className="flex cursor-pointer items-center justify-between gap-2 px-4 py-3 text-sm font-medium text-emerald-300 hover:bg-white/5 list-none [&::-webkit-details-marker]:hidden">
                <span>{t('audienceResonance.howWeScore.toggle')}</span>
                <ChevronDown className="w-4 h-4 shrink-0 transition-transform group-open:rotate-180" />
              </summary>
              <div className="px-4 pb-4 pt-1 border-t border-white/5">
                <p className="text-sm text-slate-400 leading-relaxed mb-4">
                  {t('audienceResonance.howWeScore.description')}
                </p>
                <ul className="space-y-2">
                  {howWeScoreBullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-2 text-sm text-slate-300">
                      <span className="text-emerald-400 mt-0.5">•</span>
                      {bullet}
                    </li>
                  ))}
                </ul>
              </div>
            </details>
            
            <Button 
              onClick={() => { window.location.href = SIGNUP_URL }}
              className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2"
            >
              {t('audienceResonance.cta')}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="group"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-6">
              <Zap className="w-3.5 h-3.5" />
              {t('express.badge')}
            </div>
            
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              {t('express.title')}
            </h2>
            
            <p className="text-lg text-slate-400 mb-8 leading-relaxed">
              {t('express.description')}
            </p>
            
            <div className="grid gap-4 mb-10">
              {expressItems.map((item, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-slate-900 border border-white/5 hover:border-cyan-500/30 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <item.icon className="w-4 h-4 text-cyan-400" />
                      <h4 className="font-bold text-white text-base">{item.title}</h4>
                    </div>
                    <span className="text-xs font-bold text-cyan-500 uppercase tracking-widest">{item.time}</span>
                  </div>
                  <p className="text-sm text-slate-400 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
            
            <Button 
              onClick={() => { window.location.href = SIGNUP_URL }}
              className="bg-cyan-600 hover:bg-cyan-500 text-white gap-2"
            >
              {t('express.cta')}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </motion.div>
        </div>
        </SectionCollapseBody>
      </div>
    </section>
  )
}
