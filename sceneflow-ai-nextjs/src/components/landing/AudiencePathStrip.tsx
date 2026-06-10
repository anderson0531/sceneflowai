'use client'

import { motion, AnimatePresence } from 'framer-motion'
import {
  Video,
  Building2,
  Film,
  Briefcase,
  Clapperboard,
  ArrowRight,
  Zap,
  Settings2,
  Maximize2,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { AUDIENCE_PATH_THUMBNAILS } from '@/config/landing/landingVisualMedia'
import type { UseCasePersonaId } from '@/config/landing/useCasePersonasCopy'

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

function PathThumbnail({
  src,
  alt,
  expandLabel,
  onExpand,
}: {
  src: string
  alt: string
  expandLabel: string
  onExpand: (url: string) => void
}) {
  return (
    <div
      className="group relative aspect-[4/3] w-full cursor-zoom-in overflow-hidden bg-slate-800"
      onClick={() => onExpand(src)}
    >
      <img
        src={src}
        alt={alt}
        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        loading="lazy"
      />
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onExpand(src)
        }}
        className="absolute top-2 right-2 rounded-lg bg-black/50 p-1.5 text-white/80 backdrop-blur-sm transition-colors hover:bg-black/70 hover:text-white"
        aria-label={expandLabel}
      >
        <Maximize2 className="h-4 w-4" />
      </button>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-opacity group-hover:bg-black/30 group-hover:opacity-100">
        <div className="rounded-full border border-white/20 bg-white/10 p-2 backdrop-blur-md">
          <Maximize2 className="h-5 w-5 text-white drop-shadow-lg" />
        </div>
      </div>
    </div>
  )
}

export function AudiencePathStrip() {
  const t = useTranslations('audiencePaths')
  const [mode, setMode] = useState<AudienceMode>('automate')
  const [expandedImage, setExpandedImage] = useState<string | null>(null)
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
            const thumbnail =
              AUDIENCE_PATH_THUMBNAILS[path.id as UseCasePersonaId] ?? undefined
            return (
              <motion.div
                key={path.id}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: index * 0.06 }}
                className="group flex flex-col overflow-hidden rounded-xl border border-white/10 bg-slate-900/60 hover:border-purple-500/40 hover:bg-slate-900/80 transition-all duration-300"
              >
                {thumbnail ? (
                  <PathThumbnail
                    src={thumbnail}
                    alt={`${path.label} — SceneFlow path preview`}
                    expandLabel={t('expandImage')}
                    onExpand={setExpandedImage}
                  />
                ) : null}
                <motion.a
                  href={`#${path.hash}`}
                  onClick={(e) => handlePathClick(path.hash, e)}
                  className="flex flex-col flex-1 p-4"
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
              </motion.div>
            )
          })}
        </div>
      </div>

      <AnimatePresence>
        {expandedImage ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setExpandedImage(null)}
            className="fixed inset-0 z-[100] flex cursor-zoom-out items-center justify-center bg-black/90 p-4 backdrop-blur-md md:p-12"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative flex h-full w-full max-w-7xl items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setExpandedImage(null)}
                className="absolute -top-12 right-0 flex items-center gap-2 text-sm font-medium text-white/70 transition-colors hover:text-white"
              >
                <X className="h-5 w-5" />
                {t('closePreview')}
              </button>
              <div className="relative h-full w-full overflow-hidden rounded-2xl border border-white/10 shadow-2xl">
                <img
                  src={expandedImage}
                  alt=""
                  className="h-full w-full object-contain"
                />
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  )
}
