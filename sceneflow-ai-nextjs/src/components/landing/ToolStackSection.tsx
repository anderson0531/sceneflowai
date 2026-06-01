'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import {
  Check,
  Copy,
  Clock,
  Film,
  MessageSquare,
  Palette,
  Sparkles,
  Volume2,
  Workflow,
  X,
  Zap,
} from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { getComparisonImageUrl } from '@/config/landing/landingVisualMedia'

const BROKEN_TOOL_ICONS = [MessageSquare, Palette, Volume2, Film] as const
const SCENEFLOW_STAGE_COLORS = [
  'text-violet-400 bg-violet-500/20',
  'text-cyan-400 bg-cyan-500/20',
  'text-emerald-400 bg-emerald-500/20',
  'text-amber-400 bg-amber-500/20',
] as const

export function ToolStackSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })
  const locale = useLocale()
  const t = useTranslations('toolStack')

  const brokenTools = t.raw('brokenWay.tools') as Array<{ name: string; category: string }>
  const painPoints = t.raw('brokenWay.painPoints') as string[]
  const stages = t.raw('sceneflowWay.stages') as Array<{ label: string; detail: string }>
  const benefits = t.raw('sceneflowWay.benefits') as string[]

  return (
    <section id="tool-stack" className="relative py-20 sm:py-24 overflow-hidden scroll-mt-20 bg-gray-950">
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(6,182,212,0.08),transparent_50%)]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          ref={ref}
          className="text-center mb-12 max-w-3xl mx-auto"
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 mb-5">
            <Zap className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-medium text-cyan-400">{t('badge')}</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">{t('title')}</h2>
          <p className="text-lg text-gray-400">{t('subtitle')}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="max-w-5xl mx-auto mb-10"
        >
          <div className="rounded-2xl overflow-hidden shadow-[0_0_50px_-12px_rgba(6,182,212,0.3)] border border-cyan-500/20">
            <img
              src={getComparisonImageUrl(locale)}
              alt={t('comparisonImageAlt')}
              className="w-full h-auto object-cover"
            />
          </div>
          <p className="mt-4 text-center text-sm text-gray-500 flex items-center justify-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-500/70" />
            {t('comparisonCaption')}
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-6 lg:gap-8 mb-10">
          {/* Broken Way */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="rounded-2xl border border-red-500/20 bg-gradient-to-br from-red-950/30 via-gray-900 to-gray-900 p-6 sm:p-8 h-full"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                <X className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">{t('brokenWay.title')}</h3>
                <p className="text-sm text-red-400">{t('brokenWay.tagline')}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {brokenTools.map((tool, index) => {
                const Icon = BROKEN_TOOL_ICONS[index] ?? MessageSquare
                return (
                  <div
                    key={tool.name}
                    className="flex flex-col items-center p-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-center"
                  >
                    <Icon className="w-7 h-7 text-gray-400 mb-2" />
                    <span className="text-xs font-medium text-gray-300">{tool.name}</span>
                    <span className="text-[10px] text-gray-500 mt-1">{tool.category}</span>
                  </div>
                )
              })}
            </div>

            <div className="flex justify-center mb-6">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20">
                <Copy className="w-4 h-4 text-red-400" />
                <span className="text-xs text-red-400 font-medium">{t('brokenWay.chaosLabel')}</span>
              </div>
            </div>

            <ul className="space-y-2.5 mb-6">
              {painPoints.map((point) => (
                <li key={point} className="flex items-start gap-2.5 text-sm text-gray-400">
                  <X className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  {point}
                </li>
              ))}
            </ul>

            <div className="pt-5 border-t border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Clock className="w-4 h-4 text-red-400" />
                {t('brokenWay.timeLabel')}
              </div>
              <span className="text-lg font-bold text-red-400">{t('brokenWay.timeValue')}</span>
            </div>
          </motion.div>

          {/* SceneFlow Way */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/30 via-gray-900 to-gray-900 p-6 sm:p-8 h-full shadow-2xl shadow-emerald-500/10"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center">
                <Workflow className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">{t('sceneflowWay.title')}</h3>
                <p className="text-sm text-emerald-400">{t('sceneflowWay.tagline')}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              {stages.map((stage, index) => (
                <div key={stage.label} className="text-center">
                  <div
                    className={cn(
                      'w-11 h-11 mx-auto rounded-xl flex items-center justify-center mb-2',
                      SCENEFLOW_STAGE_COLORS[index]?.split(' ')[1]
                    )}
                  >
                    <Workflow className={cn('w-5 h-5', SCENEFLOW_STAGE_COLORS[index]?.split(' ')[0])} />
                  </div>
                  <span className="text-xs font-medium text-gray-300 block">{stage.label}</span>
                  <span className="text-[10px] text-gray-500 mt-0.5 block">{stage.detail}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-center mb-5">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span className="text-xs text-emerald-400 font-medium">{t('sceneflowWay.syncLabel')}</span>
              </div>
            </div>

            <ul className="space-y-2.5 mb-5">
              {benefits.map((benefit) => (
                <li key={benefit} className="flex items-start gap-2.5 text-sm text-gray-300">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  {benefit}
                </li>
              ))}
            </ul>

            <div className="pt-5 border-t border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Clock className="w-4 h-4 text-emerald-400" />
                {t('sceneflowWay.timeLabel')}
              </div>
              <span className="text-lg font-bold text-emerald-400">{t('sceneflowWay.timeValue')}</span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

export default ToolStackSection
