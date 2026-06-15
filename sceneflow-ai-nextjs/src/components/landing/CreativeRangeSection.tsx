'use client'

import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Maximize2, Monitor, Palette, Sparkles, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { getLandingOutputFormatThumbnail } from '@/config/landing/landingVisualMedia'
import type { OutputFormatId } from '@/config/landing/outputFormatsCopy'
import {
  SectionCollapseBody,
  SectionCollapseToggle,
  useLandingSectionCollapse,
} from '@/components/landing/LandingSectionCollapse'
import { SectionNarrationButton } from '@/components/landing/SectionNarrationButton'
import { SECTION_NARRATION_AUDIO } from '@/config/landing/landingVisualMedia'
import { cn } from '@/lib/utils'
import { CREATIVE_RANGE_COPY } from '@/config/landing/creativeRangeCopy'

const SECTION_ID = 'creative-range'

type ArtStyleItem = {
  id: string
  name: string
  displayTitle: string
  description: string
  thumbnail: string
  tagline?: string
  marketingBody?: string
  featured: boolean
}

function ExpandableThumbnail({
  src,
  alt,
  onExpand,
  expandLabel,
  overlay,
  aspectClassName,
  onImageError,
}: {
  src: string
  alt: string
  onExpand: (url: string) => void
  expandLabel: string
  overlay?: React.ReactNode
  aspectClassName: string
  onImageError: (e: React.SyntheticEvent<HTMLImageElement>) => void
}) {
  return (
    <div
      className={`group relative w-full overflow-hidden bg-slate-800 ${aspectClassName} cursor-zoom-in`}
      onClick={() => onExpand(src)}
    >
      <img
        src={src}
        alt={alt}
        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        loading="lazy"
        onError={onImageError}
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
        <div className="rounded-full border border-white/20 bg-white/10 p-3 backdrop-blur-md">
          <Maximize2 className="h-6 w-6 text-white drop-shadow-lg" />
        </div>
      </div>
      {overlay}
    </div>
  )
}

function ArtStyleCard({
  item,
  thumbnail,
  popularBadge,
  expandLabel,
  onExpand,
}: {
  item: ArtStyleItem
  thumbnail: string
  popularBadge: string
  expandLabel: string
  onExpand: (url: string) => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={`flex flex-col overflow-hidden rounded-xl border bg-slate-900/50 ${
        item.featured
          ? 'border-violet-500/40 ring-1 ring-violet-500/20 md:col-span-1'
          : 'border-white/10'
      }`}
    >
      <ExpandableThumbnail
        src={thumbnail}
        alt={item.displayTitle}
        onExpand={onExpand}
        expandLabel={expandLabel}
        aspectClassName="aspect-square"
        overlay={
          item.featured ? (
            <span className="pointer-events-none absolute top-2 left-2 rounded-full bg-violet-500/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
              {popularBadge}
            </span>
          ) : null
        }
        onImageError={(e) => {
          const img = e.currentTarget
          img.style.display = 'none'
          const parent = img.parentElement
          if (parent && !parent.querySelector('[data-fallback]')) {
            const fallback = document.createElement('div')
            fallback.dataset.fallback = 'true'
            fallback.className =
              'absolute inset-0 flex items-center justify-center text-4xl font-bold text-slate-500'
            fallback.textContent = item.name.charAt(0)
            parent.appendChild(fallback)
          }
        }}
      />
      <div className="flex flex-1 flex-col p-3">
        <h4 className="text-sm font-semibold text-white">{item.displayTitle}</h4>
        <p className="mt-0.5 text-[11px] text-slate-500">{item.name}</p>
        {item.tagline ? (
          <p className="mt-1 text-xs font-medium text-violet-300">{item.tagline}</p>
        ) : null}
        <p className="mt-2 text-xs leading-relaxed text-slate-400">
          {item.featured && item.marketingBody ? item.marketingBody : item.description}
        </p>
      </div>
    </motion.div>
  )
}

function OutputFormatCard({
  id,
  label,
  ratio,
  description,
  expandLabel,
  onExpand,
}: {
  id: OutputFormatId
  label: string
  ratio: string
  description: string
  expandLabel: string
  onExpand: (url: string) => void
}) {
  const thumbnail = getLandingOutputFormatThumbnail(id)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="flex flex-col overflow-hidden rounded-xl border border-white/10 bg-slate-900/50"
    >
      <ExpandableThumbnail
        src={thumbnail}
        alt={label}
        onExpand={onExpand}
        expandLabel={expandLabel}
        aspectClassName="aspect-video"
        overlay={
          <span className="pointer-events-none absolute bottom-2 left-2 rounded-md bg-black/60 px-2 py-0.5 text-xs font-mono text-cyan-300">
            {ratio}
          </span>
        }
        onImageError={(e) => {
          const img = e.currentTarget
          img.style.display = 'none'
          const parent = img.parentElement
          if (parent && !parent.querySelector('[data-fallback]')) {
            const fallback = document.createElement('div')
            fallback.dataset.fallback = 'true'
            fallback.className =
              'absolute inset-0 flex flex-col items-center justify-center gap-1 bg-gradient-to-br from-slate-800 to-slate-900'
            fallback.innerHTML = `<span class="text-2xl font-bold text-cyan-400">${ratio}</span><span class="text-xs text-slate-500">Preview</span>`
            parent.appendChild(fallback)
          }
        }}
      />
      <div className="p-4">
        <h4 className="text-sm font-semibold text-white">{label}</h4>
        <p className="mt-2 text-xs leading-relaxed text-slate-400">{description}</p>
      </div>
    </motion.div>
  )
}

export function CreativeRangeSection() {
  const t = useTranslations('creativeRange')
  const { isOpen } = useLandingSectionCollapse(SECTION_ID)
  const artItems = t.raw('artStyles.items') as ArtStyleItem[]
  const formatItems = t.raw('outputFormats.items') as Array<{
    id: OutputFormatId
    label: string
    ratio: string
    description: string
  }>
  const [expandedImage, setExpandedImage] = useState<string | null>(null)

  const expandLabel = t('ui.expandImage')
  const closeLabel = t('ui.closePreview')

  const pillars = useMemo(() => {
    try {
      const raw = t.raw('pillars')
      if (Array.isArray(raw)) {
        return raw as Array<{ title: string; description: string }>
      }
    } catch {
      // Stale messages/en.json — fall back to canonical copy
    }
    return [...CREATIVE_RANGE_COPY.pillars]
  }, [t])

  return (
    <section
      id={SECTION_ID}
      className={cn(
        'relative scroll-mt-20 bg-slate-950',
        isOpen ? 'py-20 sm:py-24' : 'pt-20 pb-8 sm:pt-24 sm:pb-10'
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(139,92,246,0.08),transparent_45%)]" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative mb-14 text-center"
        >
          <SectionCollapseToggle sectionId={SECTION_ID} className="absolute right-0 top-0" />
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-4 py-1.5 text-sm font-medium text-violet-300">
            <Sparkles className="h-4 w-4" />
            {t('badge')}
          </div>
          <div className="flex items-center justify-center gap-3">
            <h2 className="landing-section-heading text-3xl font-bold text-white sm:text-4xl md:text-5xl">
              {t('title')}
            </h2>
            <SectionNarrationButton src={SECTION_NARRATION_AUDIO[SECTION_ID]} />
          </div>
          <p className="mt-2 text-lg text-violet-300/90">{t('titleAccent')}</p>
          <p className="mx-auto mt-4 max-w-3xl text-base leading-relaxed text-slate-400">
            {t('subtitle')}
          </p>
        </motion.div>

        <SectionCollapseBody sectionId={SECTION_ID}>
        <div className="mb-12 grid gap-4 md:grid-cols-2">
          {pillars.map(
            (pillar, idx) => {
              const Icon = idx === 0 ? Monitor : Palette
              const iconColor = idx === 0 ? 'text-cyan-400' : 'text-violet-400'
              const iconBg = idx === 0 ? 'bg-cyan-500/15' : 'bg-violet-500/15'
              return (
                <motion.div
                  key={pillar.title}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.08 }}
                  className="rounded-xl border border-white/10 bg-slate-900/60 p-5 hover:border-violet-500/25 transition-colors"
                >
                  <div
                    className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg ${iconBg}`}
                  >
                    <Icon className={`h-4 w-4 ${iconColor}`} />
                  </div>
                  <h3 className="text-base font-semibold text-white">{pillar.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">
                    {pillar.description}
                  </p>
                </motion.div>
              )
            }
          )}
        </div>
        <p className="mb-12 text-center text-sm text-violet-300/80">{t('blueprintTagline')}</p>

        <div id="art-styles" className="mb-16 scroll-mt-24">
          <div className="mb-2 flex items-center gap-2">
            <Palette className="h-5 w-5 text-violet-400" />
            <h3 className="text-xl font-bold text-white">{t('artStyles.subsectionTitle')}</h3>
          </div>
          <p className="mb-6 max-w-3xl text-sm leading-relaxed text-slate-400">
            {t('artStyles.subsectionIntro')}
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5 md:gap-4">
            {artItems.map((item) => (
              <ArtStyleCard
                key={item.id}
                item={item}
                thumbnail={item.thumbnail}
                popularBadge={t('artStyles.popularBadge')}
                expandLabel={expandLabel}
                onExpand={setExpandedImage}
              />
            ))}
          </div>
          <p className="mt-4 text-center text-xs text-slate-500">{t('artStyles.footnote')}</p>
        </div>

        <div id="output-formats" className="scroll-mt-24">
          <div className="mb-2 flex items-center gap-2">
            <Monitor className="h-5 w-5 text-cyan-400" />
            <h3 className="text-xl font-bold text-white">{t('outputFormats.subsectionTitle')}</h3>
          </div>
          <p className="mb-6 max-w-3xl text-sm leading-relaxed text-slate-400">
            {t('outputFormats.subsectionIntro')}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {formatItems.map((item) => (
              <OutputFormatCard
                key={item.id}
                {...item}
                expandLabel={expandLabel}
                onExpand={setExpandedImage}
              />
            ))}
          </div>
          <p className="mt-4 text-center text-xs text-slate-500">
            {t('outputFormats.resolutionFootnote')}
          </p>
        </div>
        </SectionCollapseBody>
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
                {closeLabel}
              </button>
              <div className="relative h-full w-full overflow-hidden rounded-2xl border border-white/10 shadow-2xl">
                <img
                  src={expandedImage}
                  alt="Expanded view"
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
