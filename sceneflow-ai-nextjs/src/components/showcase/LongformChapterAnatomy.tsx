'use client'

import React, { useState } from 'react'
import {
  Check,
  Clock,
  Film,
  Globe,
  Layers,
  MapPin,
  Mic,
  Play,
  RefreshCw,
  Sparkles,
  Tv,
  Upload,
  Users,
  X,
} from 'lucide-react'
import { LONGFORM_CHAPTER_ANATOMY_COPY } from '@/config/showcase/longformChapterAnatomyCopy'
import type { AnatomyDeliveryMode } from '@/config/showcase/longformChapterAnatomyTypes'
import type { ClientPortalLocale } from '@/lib/intake/clientPortalCopy'

export interface LongformChapterAnatomyProps {
  variant: 'storefront' | 'studio'
  locale: ClientPortalLocale
}

export function LongformChapterAnatomy({ variant, locale }: LongformChapterAnatomyProps) {
  const [deliveryMode, setDeliveryMode] = useState<AnatomyDeliveryMode>('feature')
  const [activeChapterIdx, setActiveChapterIdx] = useState(0)
  const [playingSampleChapter, setPlayingSampleChapter] = useState(false)

  const copy = LONGFORM_CHAPTER_ANATOMY_COPY[locale] ?? LONGFORM_CHAPTER_ANATOMY_COPY.en
  const isStorefront = variant === 'storefront'
  const brandTxt = (s: string) => (isStorefront ? s.replace(/SceneFlow/g, 'Keepsake Cinema') : s)

  const activeChapter = copy.chapters[activeChapterIdx] ?? copy.chapters[0]

  const accentText = isStorefront ? 'text-[#F0CB92]' : 'text-emerald-300'
  const accentBorder = isStorefront ? 'border-[#DFB473]/35' : 'border-emerald-400/35'
  const accentBgSoft = isStorefront ? 'bg-[#DFB473]/12' : 'bg-emerald-500/12'
  const activeModeBtn = isStorefront
    ? 'bg-[#DFB473] !text-[#090B12] shadow-md shadow-[#DFB473]/25'
    : 'bg-emerald-400 !text-[#090B12] shadow-md shadow-emerald-500/25'
  const activeTabClasses = isStorefront
    ? 'border-[#DFB473]/70 bg-[#DFB473]/15 shadow-lg shadow-[#DFB473]/10'
    : 'border-emerald-400/70 bg-emerald-500/15 shadow-lg shadow-emerald-500/10'

  const handleSelectChapter = (idx: number) => {
    setActiveChapterIdx(idx)
    setPlayingSampleChapter(false)
  }

  return (
    <div
      data-testid={`longform-chapter-anatomy-${variant}`}
      className="mt-10 sm:mt-14 space-y-6"
    >
      {/* Header + Feature vs. Multi-Episode Series Mode Toggle */}
      <div className="rounded-2xl border border-white/12 bg-gradient-to-br from-[#0F1423] via-[#0B0F1A] to-[#080B13] p-5 sm:p-7 shadow-2xl shadow-black/50 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
          <div className="space-y-2.5 max-w-3xl">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border ${accentBorder} ${accentBgSoft} px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${accentText}`}
            >
              <Layers className="w-3.5 h-3.5 shrink-0" />
              <span>{copy.eyebrow}</span>
            </span>
            <h3 className="font-serif text-xl sm:text-2xl lg:text-3xl font-semibold text-white leading-snug">
              {brandTxt(copy.heading)}
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {brandTxt(copy.subtitle)}
            </p>
          </div>

          {/* Delivery Format Toggle: 1-Hour+ Feature Film OR Multi-Episode Series */}
          <div className="shrink-0 space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              {copy.modeLabel}
            </div>
            <div
              role="group"
              aria-label={copy.modeLabel}
              className="inline-flex rounded-xl border border-white/15 bg-black/50 p-1 gap-1"
            >
              <button
                type="button"
                data-testid="anatomy-mode-feature"
                aria-pressed={deliveryMode === 'feature'}
                onClick={() => setDeliveryMode('feature')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition cursor-pointer ${
                  deliveryMode === 'feature'
                    ? activeModeBtn
                    : 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                <Film className="w-3.5 h-3.5 shrink-0" />
                <span>{copy.modeFeatureLabel}</span>
              </button>
              <button
                type="button"
                data-testid="anatomy-mode-series"
                aria-pressed={deliveryMode === 'series'}
                onClick={() => setDeliveryMode('series')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition cursor-pointer ${
                  deliveryMode === 'series'
                    ? activeModeBtn
                    : 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                <Tv className="w-3.5 h-3.5 shrink-0" />
                <span>{copy.modeSeriesLabel}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Active Format Summary Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-xs">
          <div className="flex items-center gap-2 font-medium text-white">
            <Sparkles className={`w-3.5 h-3.5 shrink-0 ${accentText}`} />
            <span data-testid="anatomy-mode-meta">
              {deliveryMode === 'feature' ? copy.modeFeatureMeta : copy.modeSeriesMeta}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-0.5 text-[11px] font-semibold text-slate-200">
              <Clock className="w-3 h-3 shrink-0" />
              <span>{copy.totalRuntimeBadge}</span>
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-full border ${accentBorder} ${accentBgSoft} px-2.5 py-0.5 text-[11px] font-semibold ${accentText}`}
            >
              <span>{copy.totalFramesBadge}</span>
            </span>
          </div>
        </div>

        {/* 6-Chapter / 6-Episode Clickable Timeline Strip */}
        <div
          role="tablist"
          aria-label={copy.heading}
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2"
        >
          {copy.chapters.map((chapter, idx) => {
            const isSelected = idx === activeChapterIdx
            const unitLabel =
              deliveryMode === 'feature' ? chapter.featureLabel : chapter.seriesLabel
            return (
              <button
                key={chapter.id}
                type="button"
                role="tab"
                data-testid={`anatomy-chapter-tab-${chapter.chapterNumber}`}
                aria-selected={isSelected}
                onClick={() => handleSelectChapter(idx)}
                className={`text-start rounded-xl border p-3 transition flex flex-col justify-between gap-1.5 cursor-pointer ${
                  isSelected
                    ? activeTabClasses
                    : 'border-white/10 bg-white/[0.02] hover:border-white/25 hover:bg-white/[0.05]'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span
                    className={`text-[11px] font-bold uppercase tracking-wider ${
                      isSelected ? accentText : 'text-slate-400'
                    }`}
                  >
                    {unitLabel}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400 tabular-nums">
                    {chapter.durationLabel}
                  </span>
                </div>
                <div className="text-xs font-semibold text-white leading-snug line-clamp-2">
                  {chapter.title}
                </div>
                <div className="text-[10px] text-slate-400 truncate">
                  {deliveryMode === 'feature' ? chapter.timecodeRange : chapter.eraBadge}
                </div>
              </button>
            )
          })}
        </div>

        {/* Selected Chapter Inspector: Poster/Player + Client Input vs. SceneFlow Reenactment */}
        <div
          role="tabpanel"
          data-testid="anatomy-chapter-panel"
          className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch"
        >
          {/* Left Visual & Chapter Context Column */}
          <div className="lg:col-span-5 flex flex-col justify-between gap-4 rounded-2xl border border-white/10 bg-black/45 p-4">
            <div className="space-y-3">
              <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-white/10 bg-slate-950">
                {activeChapter.sampleVideoUrl && playingSampleChapter ? (
                  <video
                    src={activeChapter.sampleVideoUrl}
                    poster={activeChapter.posterImage}
                    controls
                    autoPlay
                    playsInline
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <>
                    <img
                      src={activeChapter.posterImage}
                      alt={activeChapter.title}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/30" />
                    <div className="absolute top-2.5 start-2.5 flex flex-wrap items-center gap-1.5">
                      <span
                        className={`rounded-full border ${accentBorder} bg-black/75 backdrop-blur-sm px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${accentText}`}
                      >
                        {deliveryMode === 'feature'
                          ? `${activeChapter.featureLabel} · ${activeChapter.timecodeRange}`
                          : `${activeChapter.seriesLabel} · ${activeChapter.durationLabel}`}
                      </span>
                      {activeChapter.featuredChapterBadge && (
                        <span className="rounded-full border border-cyan-400/40 bg-cyan-950/80 backdrop-blur-sm px-2.5 py-0.5 text-[10px] font-semibold text-cyan-200">
                          {activeChapter.featuredChapterBadge}
                        </span>
                      )}
                    </div>
                    {activeChapter.sampleVideoUrl && (
                      <button
                        type="button"
                        onClick={() => setPlayingSampleChapter(true)}
                        className="absolute inset-0 flex items-center justify-center bg-black/25 hover:bg-black/15 transition cursor-pointer"
                      >
                        <span
                          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold shadow-xl ${activeModeBtn}`}
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>{copy.watchChapterCta}</span>
                        </span>
                      </button>
                    )}
                    <div className="absolute bottom-2.5 inset-x-3 flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-white drop-shadow">
                        {activeChapter.eraBadge}
                      </span>
                      <span className="rounded-md bg-black/70 px-2 py-0.5 text-[10px] font-semibold text-slate-200 tabular-nums">
                        {activeChapter.durationLabel}
                      </span>
                    </div>
                  </>
                )}
              </div>

              <div>
                <h4 className="font-serif text-lg sm:text-xl font-semibold text-white leading-snug">
                  {activeChapter.title}
                </h4>
                <p className="mt-1.5 text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {brandTxt(activeChapter.narrativeSummary)}
                </p>
              </div>
            </div>

            {/* What You Provide Card */}
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5 space-y-1.5">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <Upload className="w-3.5 h-3.5 shrink-0 text-slate-300" />
                <span>{copy.inputBoxHeading}</span>
              </div>
              <div className={`text-xs sm:text-sm font-semibold ${accentText}`}>
                {activeChapter.clientInputLabel}
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {activeChapter.clientInputDetail}
              </p>
            </div>
          </div>

          {/* Right Reenactment Breakdown Column */}
          <div className="lg:col-span-7 flex flex-col justify-between gap-4 rounded-2xl border border-white/12 bg-gradient-to-br from-[#12182B] via-[#0B101D] to-[#080B13] p-4 sm:p-5">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider ${accentText}`}
                >
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span>{brandTxt(copy.recreatedBoxHeading)}</span>
                </span>
                {activeChapter.featuredChapterBadge && (
                  <span className="text-[11px] font-medium text-cyan-200/90">
                    {copy.sampleChapterReadyBadge}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/10 bg-black/40 p-3.5 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-white">
                    <Users className={`w-3.5 h-3.5 shrink-0 ${accentText}`} />
                    <span>{copy.labelPeople}</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {activeChapter.reenactmentPeople}
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/40 p-3.5 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-white">
                    <MapPin className={`w-3.5 h-3.5 shrink-0 ${accentText}`} />
                    <span>{copy.labelLocation}</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {activeChapter.reenactmentLocation}
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/40 p-3.5 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-white">
                    <Globe className={`w-3.5 h-3.5 shrink-0 ${accentText}`} />
                    <span>{copy.labelCulture}</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {activeChapter.reenactmentCulture}
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/40 p-3.5 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-white">
                    <Mic className={`w-3.5 h-3.5 shrink-0 ${accentText}`} />
                    <span>{copy.labelAudioProps}</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {activeChapter.reenactmentAudioProps}
                  </p>
                </div>
              </div>
            </div>

            {/* Living Continuity Vault Episodic Callout */}
            <div
              className={`rounded-xl border ${accentBorder} ${accentBgSoft} px-4 py-3 flex items-start gap-2.5 text-xs text-slate-200 leading-relaxed`}
            >
              <RefreshCw className={`w-4 h-4 shrink-0 mt-0.5 ${accentText}`} />
              <span>{brandTxt(copy.livingVaultNote)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Why Short-Form AI Tools Collapse at 1-Hour+ Scale (Architectural Math Strip) */}
      <div
        data-testid="longform-vs-shortform-math"
        className="rounded-2xl border border-white/12 bg-[#080C15]/95 p-5 sm:p-6 shadow-xl shadow-black/40 space-y-5"
      >
        <div className="max-w-3xl space-y-1.5">
          <h4 className="font-serif text-lg sm:text-xl font-semibold text-white">
            {brandTxt(copy.mathHeading)}
          </h4>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            {brandTxt(copy.mathSubtitle)}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4">
          {copy.mathStats.map((stat) => (
            <div
              key={stat.metric}
              className="rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent p-4 flex flex-col justify-between gap-3"
            >
              <div>
                <div className={`text-lg sm:text-xl font-bold tracking-tight ${accentText}`}>
                  {stat.metric}
                </div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mt-0.5">
                  {stat.label}
                </div>
              </div>

              <div className="space-y-2.5 pt-2 border-t border-white/[0.08]">
                <div className="flex items-start gap-2 text-xs text-slate-400">
                  <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-rose-500/15 text-rose-400">
                    <X className="w-3 h-3" />
                  </span>
                  <div>
                    <span className="font-semibold text-rose-300/90">
                      {copy.mathShortformLabel}:{' '}
                    </span>
                    <span>{stat.shortformReality}</span>
                  </div>
                </div>

                <div className="flex items-start gap-2 text-xs text-slate-100">
                  <span
                    className={`mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                      isStorefront
                        ? 'bg-[#DFB473]/20 text-[#F0CB92]'
                        : 'bg-emerald-500/20 text-emerald-300'
                    }`}
                  >
                    <Check className="w-3 h-3" />
                  </span>
                  <div>
                    <span className={`font-semibold ${accentText}`}>
                      {brandTxt(copy.mathSceneFlowLabel)}:{' '}
                    </span>
                    <span>{brandTxt(stat.sceneFlowReality)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
