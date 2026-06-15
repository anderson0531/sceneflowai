'use client'

import { motion, AnimatePresence } from 'framer-motion'
import {
  Video,
  Building2,
  Film,
  Briefcase,
  Clapperboard,
  Zap,
  Settings2,
  Maximize2,
  ChevronDown,
  ChevronUp,
  Play,
  Pause,
} from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { ExpandedImageModal } from '@/components/landing/ExpandedImageModal'
import { AUDIENCE_PATH_NARRATION, AUDIENCE_PATH_THUMBNAILS } from '@/config/landing/landingVisualMedia'
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

function NarrationButton({
  src,
  playLabel,
  pauseLabel,
  comingSoonLabel,
}: {
  src: string | undefined
  playLabel: string
  pauseLabel: string
  comingSoonLabel: string
}) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  const togglePlayback = useCallback(() => {
    const audio = audioRef.current
    if (!audio || !src) return
    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    } else {
      void audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false))
    }
  }, [isPlaying, src])

  if (!src) {
    return (
      <button
        type="button"
        disabled
        className="inline-flex shrink-0 items-center justify-center rounded-full border border-white/10 p-1.5 text-gray-500 cursor-not-allowed opacity-40"
        aria-label={comingSoonLabel}
      >
        <Play className="h-4 w-4" />
      </button>
    )
  }

  return (
    <>
      <audio
        ref={audioRef}
        src={src}
        preload="none"
        onEnded={() => setIsPlaying(false)}
        onPause={() => setIsPlaying(false)}
      />
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          togglePlayback()
        }}
        className="inline-flex shrink-0 items-center justify-center rounded-full border border-cyan-500/30 bg-cyan-500/10 p-1.5 text-cyan-300 hover:border-cyan-400/50 hover:bg-cyan-500/20 transition-colors"
        aria-label={isPlaying ? pauseLabel : playLabel}
      >
        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </button>
    </>
  )
}

export function AudiencePathStrip() {
  const t = useTranslations('audiencePaths')
  const [mode, setMode] = useState<AudienceMode>('automate')
  const [expandedImage, setExpandedImage] = useState<string | null>(null)
  const [expandedPaths, setExpandedPaths] = useState<Record<string, boolean>>({})
  const paths = t.raw('paths') as Array<{
    id: string
    hash: string
    icon: PathIcon
    label: string
    outcome: string
    narrative: string
    useCases: string[]
  }>
  const modes = t.raw('modes') as Record<
    AudienceMode,
    { label: string; description: string }
  >

  const isPathExpanded = (id: string) => expandedPaths[id] === true
  const togglePathDetails = (id: string) => {
    setExpandedPaths((prev) => ({ ...prev, [id]: !prev[id] }))
  }

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
            const detailsOpen = isPathExpanded(path.id)
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
                <div className="flex flex-col flex-1 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-cyan-500/20 border border-white/10 flex items-center justify-center">
                      <Icon className="w-4 h-4 text-purple-300" />
                    </div>
                    <span className="text-base font-semibold text-white">{path.label}</span>
                    <NarrationButton
                      src={AUDIENCE_PATH_NARRATION[path.id as UseCasePersonaId] || undefined}
                      playLabel={t('playNarration')}
                      pauseLabel={t('pauseNarration')}
                      comingSoonLabel={t('narrationComingSoon')}
                    />
                  </div>
                  <p className="text-sm text-gray-400 leading-relaxed">{path.outcome}</p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      togglePathDetails(path.id)
                    }}
                    aria-expanded={detailsOpen}
                    aria-controls={`path-details-${path.id}`}
                    className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-cyan-400 hover:text-cyan-300 transition-colors text-left"
                  >
                    {detailsOpen ? (
                      <>
                        {t('hideDetails')}
                        <ChevronUp className="h-4 w-4 shrink-0" />
                      </>
                    ) : (
                      <>
                        {t('showDetails')}
                        <ChevronDown className="h-4 w-4 shrink-0" />
                      </>
                    )}
                  </button>
                  <AnimatePresence initial={false}>
                    {detailsOpen && (
                      <motion.div
                        id={`path-details-${path.id}`}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <p className="mt-3 text-sm leading-relaxed text-gray-300">
                          {path.narrative}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      <AnimatePresence>
        {expandedImage ? (
          <ExpandedImageModal
            imageUrl={expandedImage}
            closeLabel={t('closePreview')}
            expandImageLabel={t('expandImage')}
            onClose={() => setExpandedImage(null)}
          />
        ) : null}
      </AnimatePresence>
    </section>
  )
}
