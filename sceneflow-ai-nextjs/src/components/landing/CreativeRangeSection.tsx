'use client'

import { motion } from 'framer-motion'
import { Palette, Monitor, Sparkles } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { getLandingOutputFormatThumbnail } from '@/config/landing/landingVisualMedia'
import type { OutputFormatId } from '@/config/landing/outputFormatsCopy'

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

function ArtStyleCard({
  item,
  thumbnail,
  popularBadge,
}: {
  item: ArtStyleItem
  thumbnail: string
  popularBadge: string
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
      <div className="relative aspect-square w-full overflow-hidden bg-slate-800">
        <img
          src={thumbnail}
          alt={item.displayTitle}
          className="h-full w-full object-cover"
          loading="lazy"
          onError={(e) => {
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
        {item.featured ? (
          <span className="absolute top-2 right-2 rounded-full bg-violet-500/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
            {popularBadge}
          </span>
        ) : null}
      </div>
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
}: {
  id: OutputFormatId
  label: string
  ratio: string
  description: string
}) {
  const thumbnail = getLandingOutputFormatThumbnail(id)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="flex flex-col overflow-hidden rounded-xl border border-white/10 bg-slate-900/50"
    >
      <div className="relative aspect-video w-full overflow-hidden bg-slate-800">
        <img
          src={thumbnail}
          alt={label}
          className="h-full w-full object-cover"
          loading="lazy"
          onError={(e) => {
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
        <span className="absolute bottom-2 left-2 rounded-md bg-black/60 px-2 py-0.5 text-xs font-mono text-cyan-300">
          {ratio}
        </span>
      </div>
      <div className="p-4">
        <h4 className="text-sm font-semibold text-white">{label}</h4>
        <p className="mt-2 text-xs leading-relaxed text-slate-400">{description}</p>
      </div>
    </motion.div>
  )
}

export function CreativeRangeSection() {
  const t = useTranslations('creativeRange')
  const artItems = t.raw('artStyles.items') as ArtStyleItem[]
  const formatItems = t.raw('outputFormats.items') as Array<{
    id: OutputFormatId
    label: string
    ratio: string
    description: string
  }>

  return (
    <section id="creative-range" className="relative scroll-mt-20 bg-slate-950 py-20 sm:py-24">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(139,92,246,0.08),transparent_45%)]" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-14 text-center"
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-4 py-1.5 text-sm font-medium text-violet-300">
            <Sparkles className="h-4 w-4" />
            {t('badge')}
          </div>
          <h2 className="landing-section-heading text-3xl font-bold text-white sm:text-4xl md:text-5xl">
            {t('title')}
          </h2>
          <p className="mt-2 text-lg text-violet-300/90">{t('titleAccent')}</p>
          <p className="mx-auto mt-4 max-w-3xl text-base leading-relaxed text-slate-400">
            {t('subtitle')}
          </p>
        </motion.div>

        <div id="art-styles" className="mb-16 scroll-mt-24">
          <div className="mb-6 flex items-center gap-2">
            <Palette className="h-5 w-5 text-violet-400" />
            <h3 className="text-xl font-bold text-white">{t('artStyles.subsectionTitle')}</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5 md:gap-4">
            {artItems.map((item) => (
              <ArtStyleCard
                key={item.id}
                item={item}
                thumbnail={item.thumbnail}
                popularBadge={t('artStyles.popularBadge')}
              />
            ))}
          </div>
          <p className="mt-4 text-center text-xs text-slate-500">{t('artStyles.footnote')}</p>
        </div>

        <div id="output-formats" className="scroll-mt-24">
          <div className="mb-6 flex items-center gap-2">
            <Monitor className="h-5 w-5 text-cyan-400" />
            <h3 className="text-xl font-bold text-white">{t('outputFormats.subsectionTitle')}</h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {formatItems.map((item) => (
              <OutputFormatCard key={item.id} {...item} />
            ))}
          </div>
          <p className="mt-4 text-center text-xs text-slate-500">
            {t('outputFormats.resolutionFootnote')}
          </p>
        </div>
      </div>
    </section>
  )
}
