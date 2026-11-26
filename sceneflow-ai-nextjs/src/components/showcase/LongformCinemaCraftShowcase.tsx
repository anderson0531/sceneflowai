'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  BookOpen,
  Check,
  Film,
  Globe,
  KeyRound,
  Languages,
  MapPin,
  Mic,
  QrCode,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Users,
  X,
} from 'lucide-react'
import {
  LONGFORM_CRAFT_COPY,
  type CraftPillarId,
  type ImmediateLiftCardId,
} from '@/config/showcase/longformCraftCopy'
import { LongformChapterAnatomy } from '@/components/showcase/LongformChapterAnatomy'
import { MobileDisclosure } from '@/components/landing/MobileDisclosure'
import { localizeUsdText } from '@/lib/i18n/landingCurrency'
import type { ClientPortalLocale } from '@/lib/intake/clientPortalCopy'
import { getSignupUrlForTier } from '@/lib/billing/checkoutIntent'

const PILLAR_ICONS: Record<CraftPillarId, React.ComponentType<{ className?: string }>> = {
  resonance_script: Sparkles,
  character_aging: Users,
  location_matching: MapPin,
  heirloom_props: BookOpen,
  voice_cloning: Mic,
  directed_4k_master: Globe,
}

const LIFT_ICONS: Record<ImmediateLiftCardId, React.ComponentType<{ className?: string }>> = {
  multi_perspective_audio: Languages,
  qr_print_companion: QrCode,
  living_continuity_vault: RefreshCw,
}

export interface LongformCinemaCraftShowcaseProps {
  variant: 'storefront' | 'studio'
  locale: ClientPortalLocale
  onPrimaryCta?: () => void
}

export function LongformCinemaCraftShowcase({
  variant,
  locale,
  onPrimaryCta,
}: LongformCinemaCraftShowcaseProps) {
  const [activePillarId, setActivePillarId] = useState<CraftPillarId>('resonance_script')
  const copy = LONGFORM_CRAFT_COPY[locale] ?? LONGFORM_CRAFT_COPY.en
  const isStorefront = variant === 'storefront'
  const txt = (s: string) => localizeUsdText(s, locale)
  const brandTxt = (s: string) => {
    const localized = txt(s)
    return isStorefront ? localized.replace(/SceneFlow/g, 'Keepsake Cinema') : localized
  }

  const activePillar =
    copy.pillars.find((p) => p.id === activePillarId) ?? copy.pillars[0]
  const ActiveIcon = PILLAR_ICONS[activePillar.id]

  const accentText = isStorefront ? 'text-[#F0CB92]' : 'text-emerald-300'
  const accentBorder = isStorefront ? 'border-[#DFB473]/30' : 'border-emerald-400/30'
  const accentBgSoft = isStorefront ? 'bg-[#DFB473]/10' : 'bg-emerald-500/10'
  const activeTabClasses = isStorefront
    ? 'border-[#DFB473]/65 bg-[#DFB473]/15 shadow-lg shadow-[#DFB473]/10'
    : 'border-emerald-400/65 bg-emerald-500/15 shadow-lg shadow-emerald-500/10'
  const showcaseHref =
    locale && locale !== 'en' ? `/showcase?lang=${encodeURIComponent(locale)}` : '/showcase'

  const disclosureAccent = isStorefront ? 'gold' : 'emerald'

  return (
    <section
      id={isStorefront ? 'studio-craft' : 'longform-differentiation'}
      data-testid={`longform-craft-showcase-${variant}`}
      className={
        isStorefront
          ? 'relative scroll-mt-20 overflow-hidden py-12 sm:py-24 border-t border-white/[0.07] bg-gradient-to-b from-[#070A12] via-[#0B0F1C] to-[#06080E]'
          : 'relative scroll-mt-20 overflow-hidden py-12 sm:py-24 border-t border-emerald-500/20 bg-gradient-to-b from-slate-950 via-[#0A111D] to-slate-950'
      }
    >
      {/* Ambient cinematic glow */}
      <div
        aria-hidden
        className={`pointer-events-none absolute -top-28 start-1/2 -translate-x-1/2 rtl:translate-x-1/2 w-[780px] h-[340px] rounded-full blur-[120px] ${
          isStorefront ? 'bg-[#DFB473]/10' : 'bg-emerald-500/12'
        }`}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header — clean borderless eyebrow + compact badge (no oversized wrapping ovals on mobile) */}
        <div className="max-w-4xl mx-auto text-center space-y-3 sm:space-y-4">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <p
              className={`!mb-0 inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-bold uppercase tracking-[0.16em] ${accentText}`}
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>{isStorefront ? copy.storefrontEyebrow : copy.studioEyebrow}</span>
            </p>
            <span className="inline-flex items-center gap-1 rounded-md border border-rose-400/30 bg-rose-500/10 px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.12em] text-rose-200">
              <ShieldAlert className="w-3 h-3 shrink-0 text-rose-300" />
              <span>{copy.noSlopBadge}</span>
            </span>
          </div>

          <h2 className="font-serif text-2xl sm:text-4xl lg:text-[44px] font-semibold tracking-tight text-white leading-[1.15]">
            {txt(isStorefront ? copy.storefrontHeadingPrefix : copy.studioHeadingPrefix)}
            <span
              className={
                isStorefront
                  ? 'bg-gradient-to-r from-[#F5D6A3] via-[#DFB473] to-[#C48E44] bg-clip-text text-transparent'
                  : 'bg-gradient-to-r from-emerald-300 via-teal-200 to-amber-300 bg-clip-text text-transparent'
              }
            >
              {txt(isStorefront ? copy.storefrontHeadingAccent : copy.studioHeadingAccent)}
            </span>
          </h2>

          <p className="text-xs sm:text-base lg:text-lg text-slate-300 leading-relaxed max-w-3xl mx-auto">
            {txt(isStorefront ? copy.storefrontSubtitle : copy.studioSubtitle)}
          </p>
        </div>

        {/* FEATURED FIRST: Interactive Longform Blueprint · 1-Hour+ Feature OR Multi-Episode Series */}
        <LongformChapterAnatomy variant={variant} locale={locale} />

        {/* Signature Feature Film + Theatrical Trailer Included Spotlight (collapsible on mobile) */}
        <MobileDisclosure
          title={copy.trailerSpotlight.headline}
          subtitle={copy.trailerSpotlight.badge}
          icon={<Film className={`w-4 h-4 ${isStorefront ? 'text-[#F0CB92]' : 'text-amber-300'}`} />}
          locale={locale}
          accent={isStorefront ? 'gold' : 'amber'}
          className="mt-5 sm:mt-10"
          testId="trailer-spotlight-disclosure"
        >
          <div
            className={`rounded-2xl border ${
              isStorefront
                ? 'border-[#DFB473]/35 bg-gradient-to-r from-[#17130D] via-[#111624] to-[#0D111C]'
                : 'border-amber-400/35 bg-gradient-to-r from-amber-950/35 via-slate-900/90 to-emerald-950/35'
            } p-4 sm:p-6 shadow-xl shadow-black/40`}
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-5">
              <div className="space-y-2 max-w-3xl">
                <div className="inline-flex items-center gap-1.5 rounded-md border border-[#DFB473]/35 bg-[#DFB473]/12 px-2.5 py-0.5 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-[#F0CB92]">
                  <Film className="w-3.5 h-3.5 shrink-0" />
                  <span>{copy.trailerSpotlight.badge}</span>
                </div>
                <h3 className="font-serif text-lg sm:text-2xl font-semibold text-white leading-snug">
                  {copy.trailerSpotlight.headline}
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {txt(copy.trailerSpotlight.body)}
                </p>
              </div>
              <div className="flex flex-col gap-2 shrink-0 lg:min-w-[260px]">
                {[
                  copy.trailerSpotlight.pill1,
                  copy.trailerSpotlight.pill2,
                  copy.trailerSpotlight.pill3,
                ].map((pill) => (
                  <div
                    key={pill}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs font-medium text-slate-100"
                  >
                    <Check className="w-3.5 h-3.5 text-[#DFB473] shrink-0" />
                    <span>{txt(pill)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </MobileDisclosure>

        {/* Interactive 6-Pillar Studio Craft Workbench (collapsible on mobile) */}
        <MobileDisclosure
          title={copy.pillarsHeading}
          subtitle={brandTxt(copy.pillarsHint)}
          badge={`${copy.pillars.length}`}
          icon={<Sparkles className={`w-4 h-4 ${accentText}`} />}
          locale={locale}
          accent={disclosureAccent}
          className="mt-4 sm:mt-12"
          testId="craft-pillars-disclosure"
        >
          <div>
            <div className="hidden md:flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-5">
              <div>
                <h3 className="font-serif text-xl sm:text-2xl font-semibold text-white">
                  {copy.pillarsHeading}
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">{brandTxt(copy.pillarsHint)}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 lg:gap-6 items-stretch">
              {/* Pillar Selector Column (compact 2-col on mobile, 1-col stack on lg+) */}
              <div
                role="tablist"
                aria-label={copy.pillarsHeading}
                className="lg:col-span-5 grid grid-cols-2 lg:grid-cols-1 gap-2 sm:gap-2.5"
              >
                {copy.pillars.map((pillar) => {
                  const Icon = PILLAR_ICONS[pillar.id]
                  const isActive = pillar.id === activePillar.id
                  return (
                    <button
                      key={pillar.id}
                      type="button"
                      role="tab"
                      title={`${pillar.shortTab} — ${pillar.badge} (${pillar.metricValue})`}
                      aria-selected={isActive}
                      onClick={() => setActivePillarId(pillar.id)}
                      className={`w-full text-start rounded-xl border px-3 py-2.5 sm:px-3.5 sm:py-3 transition flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer ${
                        isActive
                          ? activeTabClasses
                          : 'border-white/10 bg-[#0B0F1A]/90 hover:border-white/25 hover:bg-white/[0.04]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center shrink-0 border ${
                            isActive
                              ? isStorefront
                                ? 'border-[#DFB473]/60 bg-[#DFB473]/20 text-[#F0CB92]'
                                : 'border-emerald-400/60 bg-emerald-500/20 text-emerald-200'
                              : 'border-white/10 bg-white/[0.03] text-slate-300'
                          }`}
                        >
                          <Icon className="w-4 h-4 shrink-0" />
                        </span>
                        <div className="min-w-0">
                          <div className="text-xs sm:text-sm font-semibold text-white leading-snug whitespace-normal break-words">
                            {pillar.shortTab}
                          </div>
                          <div className="hidden sm:block text-[11px] text-slate-400 whitespace-normal break-words">
                            {pillar.badge}
                          </div>
                        </div>
                      </div>
                      <span
                        className={`w-fit shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wide ${
                          isActive
                            ? isStorefront
                              ? 'bg-[#DFB473] !text-[#090B12]'
                              : 'bg-emerald-400 !text-[#090B12]'
                            : 'bg-white/[0.06] text-slate-300'
                        }`}
                      >
                        {pillar.metricValue}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* Active Pillar Director's Blueprint Panel */}
              <div
                role="tabpanel"
                data-testid="active-craft-pillar-panel"
                className="lg:col-span-7 rounded-2xl border border-white/15 bg-gradient-to-br from-[#111728] via-[#0B101D] to-[#080B13] p-4 sm:p-7 flex flex-col justify-between gap-5 sm:gap-6 shadow-2xl shadow-black/50"
              >
                <div className="space-y-4 sm:space-y-5">
                  <div className="flex flex-wrap items-start justify-between gap-3 sm:gap-4">
                    <div className="space-y-1.5 max-w-xl">
                      <p
                        className={`!mb-0 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider ${accentText}`}
                      >
                        <ActiveIcon className="w-3.5 h-3.5 shrink-0" />
                        <span>{activePillar.badge}</span>
                      </p>
                      <h4 className="font-serif text-lg sm:text-2xl font-semibold text-white leading-snug">
                        {activePillar.title}
                      </h4>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-black/45 px-3.5 py-2 text-end shrink-0">
                      <div className={`text-lg sm:text-2xl font-bold leading-none ${accentText}`}>
                        {activePillar.metricValue}
                      </div>
                      <div className="text-[10px] uppercase tracking-wider text-slate-400 mt-1">
                        {activePillar.metricLabel}
                      </div>
                    </div>
                  </div>

                  <p className="text-xs sm:text-base text-slate-300 leading-relaxed">
                    {activePillar.summary}
                  </p>

                  {/* Concrete Studio Blueprint Example Card */}
                  <div
                    className={`rounded-xl border ${
                      isStorefront
                        ? 'border-[#DFB473]/30 bg-[#DFB473]/[0.06]'
                        : 'border-emerald-400/25 bg-emerald-500/[0.06]'
                    } p-3.5 sm:p-4 space-y-1.5 sm:space-y-2`}
                  >
                    <div className={`text-[11px] font-semibold uppercase tracking-wider ${accentText}`}>
                      {activePillar.exampleLabel}
                    </div>
                    <div className="text-sm sm:text-base font-semibold text-white">
                      {activePillar.exampleHeadline}
                    </div>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                      {activePillar.exampleDetails}
                    </p>
                  </div>

                  <ul className="space-y-2">
                    {activePillar.highlights.map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-200"
                      >
                        <Check
                          className={`w-4 h-4 shrink-0 mt-0.5 ${
                            isStorefront ? 'text-[#DFB473]' : 'text-emerald-400'
                          }`}
                        />
                        <span>{txt(item)}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Action Footer — crisp rounded-xl on mobile, rounded-full on desktop */}
                <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3">
                  {isStorefront ? (
                    <button
                      type="button"
                      title={txt(copy.storefrontCtaLabel)}
                      onClick={onPrimaryCta}
                      className="inline-flex items-center justify-center gap-2 rounded-xl sm:rounded-full bg-gradient-to-r from-[#E6BE7E] to-[#C9974F] hover:from-[#F2D098] hover:to-[#D8A75E] px-4 py-2.5 sm:px-5 sm:py-3 text-xs sm:text-sm font-semibold !text-[#090B12] shadow-lg shadow-[#C9974F]/20 transition cursor-pointer"
                    >
                      <span className="!text-[#090B12] font-semibold">
                        {txt(copy.storefrontCtaLabel)}
                      </span>
                      <ArrowRight className="w-4 h-4 shrink-0 !text-[#090B12] rtl:rotate-180" />
                    </button>
                  ) : (
                    <>
                      <Link
                        href={getSignupUrlForTier('pro')}
                        className="inline-flex items-center justify-center gap-2 rounded-xl sm:rounded-full bg-gradient-to-r from-emerald-400 to-teal-300 hover:from-emerald-300 hover:to-teal-200 px-4 py-2.5 sm:px-5 sm:py-3 text-xs sm:text-sm font-semibold !text-[#090B12] shadow-lg shadow-emerald-500/20 transition"
                      >
                        <span className="!text-[#090B12] font-semibold">
                          {txt(copy.studioPrimaryCtaLabel)}
                        </span>
                        <ArrowRight className="w-4 h-4 shrink-0 !text-[#090B12] rtl:rotate-180" />
                      </Link>
                      <Link
                        href={showcaseHref}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl sm:rounded-full border border-amber-400/45 bg-amber-500/10 hover:bg-amber-500/20 px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-amber-200 hover:text-white transition"
                      >
                        <span>{txt(copy.studioSecondaryCtaLabel)}</span>
                        <ArrowRight className="w-3.5 h-3.5 shrink-0 rtl:rotate-180" />
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </MobileDisclosure>

        {/* 3 Immediate-Lift Consumer & White-Label Operator Engines (collapsible on mobile) */}
        {copy.immediateLift && (
          <MobileDisclosure
            title={brandTxt(copy.immediateLift.heading)}
            subtitle={copy.immediateLift.eyebrow}
            badge={`${copy.immediateLift.cards.length}`}
            icon={<Globe className={`w-4 h-4 ${accentText}`} />}
            locale={locale}
            accent={disclosureAccent}
            className="mt-4 sm:mt-16"
            testId="immediate-lift-disclosure"
          >
            <div
              data-testid="showcase-immediate-lift-grid"
              className="space-y-5 sm:space-y-6"
            >
              <div className="hidden md:block max-w-3xl space-y-2">
                <p
                  className={`!mb-0 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] ${accentText}`}
                >
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span>{copy.immediateLift.eyebrow}</span>
                </p>
                <h3 className="font-serif text-xl sm:text-2xl font-semibold text-white">
                  {brandTxt(copy.immediateLift.heading)}
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  {brandTxt(copy.immediateLift.subtitle)}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-5">
                {copy.immediateLift.cards.map((card) => {
                  const LiftIcon = LIFT_ICONS[card.id]
                  return (
                    <div
                      key={card.id}
                      data-testid={`lift-card-${card.id}`}
                      className="rounded-2xl border border-white/12 bg-gradient-to-b from-[#111728]/95 to-[#090D18] p-4 sm:p-5 flex flex-col justify-between gap-4 shadow-xl shadow-black/40"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 border ${accentBorder} ${accentBgSoft} ${accentText}`}
                          >
                            <LiftIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                          </span>
                          <span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-300">
                            {card.badge}
                          </span>
                        </div>

                        <div>
                          <h4 className="font-serif text-base sm:text-lg font-semibold text-white leading-snug">
                            {card.title}
                          </h4>
                          <p className={`text-xs font-medium mt-1 ${accentText}`}>
                            {card.subtitle}
                          </p>
                        </div>

                        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                          {brandTxt(card.description)}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-white/[0.08] space-y-2">
                        <div className="flex items-start gap-2 text-xs text-slate-200 font-medium">
                          <Check
                            className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                              isStorefront ? 'text-[#DFB473]' : 'text-emerald-400'
                            }`}
                          />
                          <span>{brandTxt(card.liftHighlight)}</span>
                        </div>
                        {card.accessNote && (
                          <div className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/25 bg-amber-500/10 px-2.5 py-1.5 text-[11px] text-amber-200">
                            <KeyRound className="w-3.5 h-3.5 shrink-0 text-amber-300" />
                            <span>{card.accessNote}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </MobileDisclosure>
        )}

        {/* Side-by-Side Matrix: Shortform "AI Slop" Generators vs. SceneFlow Longform 4K Cinema (collapsible on mobile) */}
        <MobileDisclosure
          title={brandTxt(copy.comparisonHeading)}
          subtitle={brandTxt(copy.comparisonSubtitle)}
          badge={`${copy.comparisonRows.length}`}
          icon={<ShieldAlert className="w-4 h-4 text-rose-300" />}
          locale={locale}
          accent={disclosureAccent}
          className="mt-4 sm:mt-16"
          testId="comparison-matrix-disclosure"
        >
          <div className="rounded-2xl border border-white/10 bg-[#080C15]/95 overflow-hidden shadow-2xl shadow-black/50">
            <div className="hidden md:flex px-5 sm:px-7 py-5 border-b border-white/10 flex-col sm:flex-row sm:items-end justify-between gap-2">
              <div>
                <h3 className="font-serif text-xl sm:text-2xl font-semibold text-white">
                  {brandTxt(copy.comparisonHeading)}
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  {brandTxt(copy.comparisonSubtitle)}
                </p>
              </div>
            </div>

            {/* Desktop 3-column table header */}
            <div className="hidden md:grid md:grid-cols-12 border-b border-white/10 bg-white/[0.02] px-7 py-3 text-xs font-semibold uppercase tracking-wider">
              <div className="col-span-3 text-slate-400">{copy.colDimension}</div>
              <div className="col-span-4 text-rose-300/90">{copy.colSlop}</div>
              <div className={`col-span-5 ${accentText}`}>{brandTxt(copy.colSceneFlow)}</div>
            </div>

            <div className="divide-y divide-white/[0.07]">
              {copy.comparisonRows.map((row) => (
                <div
                  key={row.dimension}
                  className="grid grid-cols-1 md:grid-cols-12 gap-2.5 md:gap-4 px-4 sm:px-7 py-3.5 sm:py-4 items-start"
                >
                  <div className="md:col-span-3 text-xs sm:text-sm font-semibold text-white">
                    {row.dimension}
                  </div>
                  <div className="md:col-span-4 flex items-start gap-2 text-xs sm:text-sm text-slate-400">
                    <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-rose-500/15 text-rose-400">
                      <X className="w-3 h-3" />
                    </span>
                    <span>{row.shortformSlop}</span>
                  </div>
                  <div className="md:col-span-5 flex items-start gap-2 text-xs sm:text-sm text-slate-100 font-medium">
                    <span
                      className={`mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                        isStorefront
                          ? 'bg-[#DFB473]/20 text-[#F0CB92]'
                          : 'bg-emerald-500/20 text-emerald-300'
                      }`}
                    >
                      <Check className="w-3 h-3" />
                    </span>
                    <span>{txt(row.sceneFlowLongform)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </MobileDisclosure>
      </div>
    </section>
  )
}
