'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import NextImage from 'next/image'
import { useTranslations } from 'next-intl'
import { Layers, Maximize2, X } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getPipelinePillarMedia } from '@/config/landing/pipelinePillarsMedia'

const SECTION_ID = 'pipeline'

type Pillar = {
  id: string
  tabLabel: string
  number: string
  title: string
  header: string
  body: string
}

type FullscreenImage = {
  url: string
  alt: string
}

function PipelinePillarFullscreen({
  image,
  closeLabel,
  landscapeHint,
  onClose,
}: {
  image: FullscreenImage
  closeLabel: string
  landscapeHint: string
  onClose: () => void
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex flex-col bg-black"
      style={{ height: '100dvh', width: '100dvw' }}
      role="dialog"
      aria-modal="true"
      aria-label={image.alt}
    >
      <div className="flex shrink-0 items-center justify-between gap-3 px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] border-b border-white/10 bg-black/80 backdrop-blur-sm">
        <p className="text-xs text-slate-400 sm:hidden">{landscapeHint}</p>
        <p className="hidden sm:block text-sm text-slate-300 truncate flex-1">{image.alt}</p>
        <button
          type="button"
          onClick={onClose}
          className="ml-auto flex shrink-0 items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-sm font-medium text-white hover:bg-white/20 transition-colors"
        >
          <X className="h-4 w-4" />
          {closeLabel}
        </button>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="flex flex-1 min-h-0 w-full items-center justify-center p-2 sm:p-6 cursor-zoom-out"
        aria-label={closeLabel}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image.url}
          alt={image.alt}
          className="max-h-full max-w-full h-auto w-auto object-contain"
          style={{ maxHeight: 'calc(100dvh - 3.5rem)', maxWidth: '100dvw' }}
        />
      </button>
    </motion.div>
  )
}

function PillarPanel({
  pillar,
  onExpand,
}: {
  pillar: Pillar
  onExpand: (image: FullscreenImage) => void
}) {
  const t = useTranslations('pipeline.ui')
  const media = getPipelinePillarMedia(pillar.id)

  const openFullscreen = useCallback(() => {
    if (!media?.imageUrl) return
    onExpand({ url: media.imageUrl, alt: pillar.header })
  }, [media?.imageUrl, onExpand, pillar.header])

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="grid gap-8 lg:grid-cols-2 lg:gap-12 items-start"
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-500/15 border border-indigo-500/25 text-sm font-bold text-indigo-300">
            {pillar.number}
          </span>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {pillar.title}
          </span>
        </div>
        <h3 className="text-2xl md:text-3xl font-bold text-white">{pillar.header}</h3>
        <p className="text-base text-gray-400 leading-relaxed">{pillar.body}</p>
      </div>

      {media?.imageUrl && (
        <div className="rounded-2xl border border-slate-700/60 bg-slate-950/70 p-3 md:p-4 overflow-hidden shadow-xl">
          <div className="aspect-video rounded-xl border border-white/10 bg-slate-900 overflow-hidden relative group">
            <NextImage
              src={media.imageUrl}
              alt={pillar.header}
              width={1920}
              height={1080}
              className="w-full h-full object-top object-contain"
              priority={pillar.id === 'series'}
            />
            <button
              type="button"
              onClick={openFullscreen}
              className="absolute top-2 right-2 z-10 flex items-center gap-1.5 rounded-lg bg-black/60 border border-white/15 px-2.5 py-1.5 text-xs font-medium text-gray-200 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 hover:text-white hover:border-indigo-400/40 transition-all"
              aria-label={t('expandFullscreen')}
            >
              <Maximize2 className="h-3.5 w-3.5" aria-hidden />
              <span className="hidden sm:inline">{t('expandFullscreen')}</span>
            </button>
          </div>
        </div>
      )}
    </motion.div>
  )
}

export function PipelinePillarsSection() {
  const t = useTranslations('pipeline')
  const tUi = useTranslations('pipeline.ui')
  const pillars = t.raw('pillars') as Pillar[]
  const [fullscreenImage, setFullscreenImage] = useState<FullscreenImage | null>(null)

  const closeFullscreen = useCallback(() => setFullscreenImage(null), [])

  return (
    <section
      id={SECTION_ID}
      className="relative scroll-mt-20 bg-gradient-to-b from-gray-950 via-slate-950 to-gray-950 py-20 md:py-28"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-6">
            <Layers className="w-4 h-4 text-indigo-400" />
            <span className="text-sm font-medium text-indigo-300">{t('badge')}</span>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
            {t('title')}
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">{t('subtitle')}</p>
        </motion.div>

        <Tabs defaultValue="series" className="w-full">
          <TabsList className="flex h-auto gap-1 p-1 w-full max-w-md mx-auto mb-10 bg-slate-900/60 border-slate-700">
            {pillars.map((pillar) => (
              <TabsTrigger
                key={pillar.id}
                value={pillar.id}
                className="flex-1 min-w-0 px-2 sm:px-4 text-xs sm:text-sm data-[state=active]:bg-indigo-600 data-[state=active]:text-white py-2.5 truncate"
              >
                {pillar.tabLabel}
              </TabsTrigger>
            ))}
          </TabsList>

          {pillars.map((pillar) => (
            <TabsContent
              key={pillar.id}
              value={pillar.id}
              className="mt-0 focus-visible:outline-none"
            >
              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 md:p-8 lg:p-10">
                <PillarPanel pillar={pillar} onExpand={setFullscreenImage} />
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>

      <AnimatePresence>
        {fullscreenImage && (
          <PipelinePillarFullscreen
            image={fullscreenImage}
            closeLabel={tUi('closeFullscreen')}
            landscapeHint={tUi('landscapeHint')}
            onClose={closeFullscreen}
          />
        )}
      </AnimatePresence>
    </section>
  )
}

export default PipelinePillarsSection
