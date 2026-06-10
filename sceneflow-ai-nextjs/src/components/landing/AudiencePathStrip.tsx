'use client'

import { motion } from 'framer-motion'
import { Video, Building2, Film, Briefcase, Clapperboard, ArrowRight, Zap, Settings2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'

const ICONS = {
  video: Video,
  building: Building2,
  film: Film,
  briefcase: Briefcase,
  clapperboard: Clapperboard,
} as const

type PathIcon = keyof typeof ICONS

type AudienceMode = 'automate' | 'engine'

function handlePathClick(hash: string, e: React.MouseEvent<HTMLAnchorElement>) {
  e.preventDefault()
  if (window.location.hash.slice(1) !== hash) {
    window.location.hash = hash
  } else {
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  }
  document.getElementById('use-cases')?.scrollIntoView({ behavior: 'smooth' })
}

function handleEngineMode() {
  if (window.location.hash.slice(1) !== 'engineering') {
    window.location.hash = 'engineering'
  } else {
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  }
  window.dispatchEvent(
    new CustomEvent('sceneflow:expand-walkthrough-chapter', { detail: 'advanced' })
  )
  document.getElementById('engineering')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export function AudiencePathStrip() {
  const t = useTranslations('audiencePaths')
  const [mode, setMode] = useState<AudienceMode>('automate')
  const paths = t.raw('paths') as Array<{
    id: string
    hash: string
    icon: PathIcon
    label: string
    outcome: string
    useCases: string[]
  }>
  const modes = t.raw('modes') as Record<
    AudienceMode,
    { label: string; description: string }
  >

  return (
    <section className="py-10 bg-slate-950 border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.p
          className="text-center text-base font-medium text-gray-400 mb-5"
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          {t('prompt')}
        </motion.p>

        <div className="flex flex-col sm:flex-row justify-center gap-2 mb-8 max-w-xl mx-auto">
          {(Object.keys(modes) as AudienceMode[]).map((key) => {
            const isActive = mode === key
            const Icon = key === 'automate' ? Zap : Settings2
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setMode(key)
                  if (key === 'engine') handleEngineMode()
                }}
                className={cn(
                  'flex-1 rounded-xl border px-4 py-3 text-left transition-all',
                  isActive
                    ? 'border-purple-500/40 bg-purple-500/10'
                    : 'border-white/10 bg-slate-900/40 hover:border-white/20'
                )}
              >
                <span className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Icon className="w-4 h-4 text-purple-300" />
                  {modes[key].label}
                </span>
                <span className="mt-1 block text-xs text-gray-400">{modes[key].description}</span>
              </button>
            )
          })}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {paths.map((path, index) => {
            const Icon = ICONS[path.icon] ?? Video
            return (
              <motion.a
                key={path.id}
                href={`#${path.hash}`}
                onClick={(e) => handlePathClick(path.hash, e)}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: index * 0.06 }}
                className="group flex flex-col rounded-xl border border-white/10 bg-slate-900/60 p-4 hover:border-purple-500/40 hover:bg-slate-900/80 transition-all duration-300"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-cyan-500/20 border border-white/10 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-purple-300" />
                  </div>
                  <span className="text-base font-semibold text-white">{path.label}</span>
                </div>
                <p className="text-sm text-gray-400 leading-relaxed">{path.outcome}</p>
                <ul
                  className="mt-3 flex flex-wrap gap-2"
                  aria-label={t('examplesFor', { label: path.label })}
                >
                  {path.useCases.map((useCase) => (
                    <li
                      key={useCase}
                      className="px-2.5 py-1 rounded-md text-xs sm:text-sm leading-snug text-gray-300 bg-slate-800/80 border border-white/10"
                    >
                      {useCase}
                    </li>
                  ))}
                </ul>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-purple-400 group-hover:text-purple-300">
                  {t('seeExamples')}
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </motion.a>
            )
          })}
        </div>
      </div>
    </section>
  )
}
