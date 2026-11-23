'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  ArrowRight,
  Award,
  Check,
  ChevronDown,
  Clock,
  Film,
  Globe,
  Heart,
  Layers,
  Lock,
  Mic,
  Play,
  ShieldCheck,
  Sparkles,
  Users,
  Volume2,
  X,
} from 'lucide-react'
import {
  EXPRESS_BLUEPRINT_PASS_USD,
  EXPRESS_SHOWCASE_OFFERS,
  SHOWCASE_BRAND_SNAPSHOT,
  type ExpressShowcaseOffer,
  type ShowcaseCategoryId,
} from '@/config/showcase/expressCinemaCatalog'
import {
  SHOWCASE_LOCALE_COPY,
  getLocalizedShowcaseVideoUrl,
  getShowcaseVideoPosterUrl,
} from '@/config/showcase/showcaseLocaleCopy'
import {
  SUPPORTED_CLIENT_PORTAL_LOCALES,
  resolveClientPortalLocale,
  type ClientPortalLocale,
} from '@/lib/intake/clientPortalCopy'
import {
  formatLandingCurrency,
  getLandingCurrencyConfig,
  localizeUsdText,
} from '@/lib/i18n/landingCurrency'
import { getLocaleDirection } from '@/i18n/locale'

const LOCALE_STORAGE_KEY = 'keepsake_showcase_locale'

export function KeepsakeCinemaStorefront() {
  const searchParams = useSearchParams()
  const urlLang = searchParams?.get('lang')

  const [uiLocale, setUiLocale] = useState<ClientPortalLocale>(() =>
    urlLang ? resolveClientPortalLocale(urlLang) : 'en'
  )
  const [langMenuOpen, setLangMenuOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState<ShowcaseCategoryId>('milestones')
  const [activeReelIdx, setActiveReelIdx] = useState(0)
  const [isPlayingReel, setIsPlayingReel] = useState(false)
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0)

  // Checkout modal state
  const [checkoutOffer, setCheckoutOffer] = useState<ExpressShowcaseOffer | null>(null)
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [honoreeOrTitle, setHonoreeOrTitle] = useState('')
  const [checkoutLocale, setCheckoutLocale] = useState<ClientPortalLocale>('en')
  const [submittingCheckout, setSubmittingCheckout] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const langMenuRef = useRef<HTMLDivElement | null>(null)

  // Hydrate initial locale from URL -> localStorage -> browser navigator.language
  useEffect(() => {
    if (urlLang) {
      const resolved = resolveClientPortalLocale(urlLang)
      setUiLocale(resolved)
      setCheckoutLocale(resolved)
      return
    }
    try {
      const saved = window.localStorage.getItem(LOCALE_STORAGE_KEY)
      if (saved) {
        const resolved = resolveClientPortalLocale(saved)
        setUiLocale(resolved)
        setCheckoutLocale(resolved)
        return
      }
      if (typeof navigator !== 'undefined' && navigator.language) {
        const detected = resolveClientPortalLocale(navigator.language)
        setUiLocale(detected)
        setCheckoutLocale(detected)
      }
    } catch {
      // Ignore storage access errors
    }
  }, [urlLang])

  // Close language dropdown on outside click
  useEffect(() => {
    if (!langMenuOpen) return
    const handleOutside = (e: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) {
        setLangMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [langMenuOpen])

  const copy = SHOWCASE_LOCALE_COPY[uiLocale] ?? SHOWCASE_LOCALE_COPY.en
  const currencyCfg = getLandingCurrencyConfig(uiLocale)
  const direction = getLocaleDirection(uiLocale)
  const fmt = (usd: number) => formatLandingCurrency(usd, uiLocale)
  const txt = (str: string) => localizeUsdText(str, uiLocale)

  const activeReel = copy.theater.tabs[activeReelIdx] ?? copy.theater.tabs[0]
  const activeReelVideoUrl = getLocalizedShowcaseVideoUrl(activeReel.videoSlug, uiLocale)
  const activeReelPosterUrl = getShowcaseVideoPosterUrl(activeReel.videoSlug)

  const visibleOffers = useMemo(
    () => EXPRESS_SHOWCASE_OFFERS.filter((o) => o.category === activeCategory),
    [activeCategory]
  )

  const handleLocaleChange = (nextLocale: ClientPortalLocale) => {
    setUiLocale(nextLocale)
    setCheckoutLocale(nextLocale)
    setLangMenuOpen(false)
    setIsPlayingReel(false)
    if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.load()
    }
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, nextLocale)
      const url = new URL(window.location.href)
      url.searchParams.set('lang', nextLocale)
      window.history.replaceState({}, '', url.toString())
    } catch {
      // Ignore history/storage errors
    }
  }

  const openOrderModal = (offer: ExpressShowcaseOffer) => {
    setCheckoutOffer(offer)
    setCheckoutLocale(uiLocale)
    setCheckoutError(null)
  }

  const handleSelectReel = (idx: number) => {
    setActiveReelIdx(idx)
    setIsPlayingReel(false)
    if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.load()
    }
  }

  const handlePlayReel = () => {
    setIsPlayingReel(true)
    if (videoRef.current) {
      void videoRef.current.play().catch(() => {})
    }
  }

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!checkoutOffer) return
    setSubmittingCheckout(true)
    setCheckoutError(null)

    try {
      const res = await fetch('/api/showcase/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderKind: 'express_blueprint_pass',
          offerId: checkoutOffer.id,
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim(),
          honoreeOrTitle: honoreeOrTitle.trim() || undefined,
          locale: checkoutLocale,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success || !data.purchaseUrl) {
        setCheckoutError(data.error || copy.modal.errorFallback)
        setSubmittingCheckout(false)
        return
      }
      window.location.href = data.purchaseUrl
    } catch {
      setCheckoutError(copy.modal.errorNetwork)
      setSubmittingCheckout(false)
    }
  }

  return (
    <div
      dir={direction}
      lang={uiLocale}
      className="min-h-screen overflow-x-clip bg-[#06080E] text-[#F5F2EB] selection:bg-[#DFB473]/30 selection:text-white"
    >
      {/* Subtle Live Reference Storefront Attribution Bar (Google-for-Startups & Pro Operator Safe) */}
      <div className="border-b border-white/10 bg-[#0B0F1A]/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[11px] sm:text-xs">
          <div className="flex items-center gap-2 min-w-0 text-slate-300">
            <span className="inline-flex h-2 w-2 shrink-0 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-medium text-white truncate">{copy.topBarBadge}</span>
            <span className="hidden md:inline text-slate-400">{copy.topBarSubtext}</span>
          </div>
          <Link
            href="/#video-services"
            className="inline-flex items-center gap-1 shrink-0 font-medium text-[#DFB473] hover:text-[#F0CB92] transition"
          >
            <span className="sm:hidden">{copy.topBarCtaMobile}</span>
            <span className="hidden sm:inline">{copy.topBarCtaDesktop}</span>
            <ArrowRight className="w-3.5 h-3.5 shrink-0 rtl:rotate-180" />
          </Link>
        </div>
      </div>

      {/* Main Editorial Navigation — 2 stacked rows on mobile (<640px) so brand never collides with controls */}
      <header className="sticky top-0 z-30 border-b border-white/[0.07] bg-[#06080E]/92 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 sm:py-0 sm:h-16 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-4">
          {/* Row 1 (full width on mobile): Brand Logo & Name */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 shrink-0 rounded-xl bg-gradient-to-br from-[#E6BE7E] via-[#C9974F] to-[#8C6126] flex items-center justify-center shadow-lg shadow-[#C9974F]/20">
              <Film className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-[#090B12]" />
            </div>
            <div className="min-w-0">
              <span className="font-serif text-lg sm:text-xl font-semibold tracking-tight text-white block leading-tight">
                {SHOWCASE_BRAND_SNAPSHOT.brandName}
              </span>
              <span className="block sm:hidden text-[10px] tracking-wide text-[#DFB473]/90 leading-tight">
                {copy.brandSubtitleMobile}
              </span>
              <span className="hidden sm:block text-[10px] uppercase tracking-[0.16em] text-[#DFB473]/90 leading-tight">
                {copy.brandSubtitleDesktop}
              </span>
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-6 text-sm text-slate-300 shrink-0">
            <a href="#occasions" className="hover:text-white transition">
              {copy.nav.occasions}
            </a>
            <a href="#how-it-works" className="hover:text-white transition">
              {copy.nav.howItWorks}
            </a>
            <a href="#express-4k" className="hover:text-white transition">
              {copy.nav.expressQuality}
            </a>
            <a href="#faq" className="hover:text-white transition">
              {copy.nav.faq}
            </a>
          </nav>

          {/* Row 2 on mobile (separate line below brand): Language Switcher + Blueprint Price CTA */}
          <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-2 sm:gap-2.5 border-t border-white/[0.07] pt-2 sm:border-t-0 sm:pt-0 shrink-0">
            {/* Compact 7-Language & Currency Switcher */}
            <div ref={langMenuRef} className="relative">
              <button
                type="button"
                aria-label="Select language and currency"
                aria-expanded={langMenuOpen}
                onClick={() => setLangMenuOpen((prev) => !prev)}
                className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/[0.04] hover:border-[#DFB473]/50 hover:bg-white/[0.08] px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-medium text-slate-200 transition whitespace-nowrap"
              >
                <Globe className="w-3.5 h-3.5 text-[#DFB473] shrink-0" />
                <span>{copy.shortCode}</span>
                <span className="text-slate-400">· {currencyCfg.code}</span>
                <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
              </button>

              {langMenuOpen && (
                <div
                  role="menu"
                  className="absolute start-0 sm:start-auto sm:end-0 mt-2 w-48 rounded-2xl border border-white/15 bg-[#0D111C] p-1.5 shadow-2xl shadow-black/80 z-50"
                >
                  {SUPPORTED_CLIENT_PORTAL_LOCALES.map((loc) => {
                    const locCopy = SHOWCASE_LOCALE_COPY[loc.code]
                    const locCurr = getLandingCurrencyConfig(loc.code)
                    const active = loc.code === uiLocale
                    return (
                      <button
                        key={loc.code}
                        type="button"
                        role="menuitem"
                        onClick={() => handleLocaleChange(loc.code)}
                        className={`w-full flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs transition ${
                          active
                            ? 'bg-[#DFB473]/20 text-[#F0CB92] font-semibold'
                            : 'text-slate-200 hover:bg-white/[0.06]'
                        }`}
                      >
                        <span className="truncate">{locCopy.nativeLabel}</span>
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 shrink-0">
                          {locCurr.code} ({locCurr.symbol})
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => openOrderModal(EXPRESS_SHOWCASE_OFFERS[0])}
              className="inline-flex items-center gap-1.5 sm:gap-2 shrink-0 whitespace-nowrap rounded-full bg-gradient-to-r from-[#E6BE7E] to-[#C9974F] hover:from-[#F0CB92] hover:to-[#D8A75E] px-3.5 sm:px-5 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-[#090B12] shadow-lg shadow-[#C9974F]/20 transition"
            >
              <span className="sm:hidden">{txt(copy.nav.ctaMobile)}</span>
              <span className="hidden sm:inline">{txt(copy.nav.ctaDesktop)}</span>
              <ArrowRight className="w-3.5 h-3.5 shrink-0 rtl:rotate-180" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section with Real 16:9 Localized Cinema Theater */}
      <section className="relative overflow-hidden pt-8 pb-14 sm:pt-16 sm:pb-24">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[900px] h-[440px] rounded-full bg-[#DFB473]/10 blur-[120px]"
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Editorial Copy Column */}
            <div className="lg:col-span-6 space-y-5 sm:space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#DFB473]/30 bg-[#DFB473]/10 px-3 py-1.5 text-[11px] sm:text-xs font-medium text-[#F0CB92]">
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>{copy.hero.eyebrow}</span>
              </div>

              <h1 className="font-serif text-3xl sm:text-5xl lg:text-[54px] font-semibold tracking-tight text-white leading-[1.15] sm:leading-[1.1]">
                {copy.hero.titlePrefix}
                <span className="bg-gradient-to-r from-[#F5D6A3] via-[#DFB473] to-[#C48E44] bg-clip-text text-transparent">
                  {copy.hero.titleAccent}
                </span>
                {copy.hero.titleSuffix}
              </h1>

              <p className="text-sm sm:text-lg text-slate-300 leading-relaxed max-w-xl">
                {copy.hero.subtitleLead}
                <span className="text-white font-medium">{copy.hero.subtitleHighlight1}</span>
                {copy.hero.subtitleMid}
                <span className="text-white font-medium">{copy.hero.subtitleHighlight2}</span>
                {copy.hero.subtitleEnd}
              </p>

              {/* Price & Guarantee Callout */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3 pt-1 max-w-lg">
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2.5 sm:px-3.5 sm:py-3">
                  <div className="text-base sm:text-2xl font-bold text-[#F0CB92] truncate">
                    {fmt(EXPRESS_BLUEPRINT_PASS_USD)}
                  </div>
                  <div className="text-[10px] sm:text-[11px] text-slate-400 leading-snug mt-0.5">
                    {copy.hero.metric1Sub}
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2.5 sm:px-3.5 sm:py-3">
                  <div className="text-base sm:text-2xl font-bold text-white truncate">
                    {fmt(149)}
                  </div>
                  <div className="text-[10px] sm:text-[11px] text-slate-400 leading-snug mt-0.5">
                    {copy.hero.metric2Sub}
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2.5 sm:px-3.5 sm:py-3">
                  <div className="text-base sm:text-2xl font-bold text-emerald-300 truncate">
                    {copy.hero.metric3Val}
                  </div>
                  <div className="text-[10px] sm:text-[11px] text-slate-400 leading-snug mt-0.5">
                    {copy.hero.metric3Sub}
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => openOrderModal(EXPRESS_SHOWCASE_OFFERS[0])}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#E6BE7E] to-[#C9974F] hover:from-[#F2D098] hover:to-[#D8A75E] px-6 py-3.5 text-sm sm:text-base font-semibold text-[#090B12] shadow-xl shadow-[#C9974F]/25 transition"
                >
                  {txt(copy.hero.primaryCta)}
                  <ArrowRight className="w-4 h-4 shrink-0 rtl:rotate-180" />
                </button>
                <a
                  href="#occasions"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.04] hover:bg-white/[0.08] px-5 py-3.5 text-sm font-medium text-white transition"
                >
                  {copy.hero.secondaryCta}
                </a>
              </div>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-400 pt-1">
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#DFB473] shrink-0" />
                  {txt(copy.hero.trustWhop)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[#DFB473] shrink-0" />
                  {copy.hero.trustPrivacy}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-[#DFB473] shrink-0" />
                  {copy.hero.trustLanguages}
                </span>
              </div>
            </div>

            {/* Interactive 16:9 Cinema Sample Theater (Plays Matching Language MP4!) */}
            <div className="lg:col-span-6">
              <div className="rounded-2xl border border-[#DFB473]/25 bg-[#0C101B] p-2.5 sm:p-3 shadow-2xl shadow-black/60">
                <div className="flex items-center justify-between gap-2 px-2 pb-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="inline-flex h-2 w-2 shrink-0 rounded-full bg-[#DFB473]" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#F0CB92] truncate">
                      {copy.theater.eyebrow}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 shrink-0">
                    {fmt(activeReel.priceUsd)} · {copy.theater.sameDayTagSuffix}
                  </span>
                </div>

                <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-white/10">
                  <video
                    ref={videoRef}
                    key={activeReelVideoUrl}
                    src={activeReelVideoUrl}
                    poster={activeReelPosterUrl}
                    controls={isPlayingReel}
                    playsInline
                    preload="metadata"
                    onPlay={() => setIsPlayingReel(true)}
                    className="w-full h-full object-cover"
                  />
                  {!isPlayingReel && (
                    <button
                      type="button"
                      onClick={handlePlayReel}
                      aria-label={`${copy.theater.watchSamplePrefix} ${activeReel.label}`}
                      className="group absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-t from-black/75 via-black/30 to-black/20 hover:bg-black/45 transition"
                    >
                      <span className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#DFB473]/95 group-hover:bg-[#F0CB92] group-hover:scale-105 text-[#090B12] flex items-center justify-center shadow-2xl shadow-[#DFB473]/40 transition">
                        <Play className="w-7 h-7 sm:w-8 sm:h-8 ms-1 fill-current" />
                      </span>
                      <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-black/70 border border-white/15 px-3.5 py-1 text-xs font-medium text-white backdrop-blur">
                        <Volume2 className="w-3.5 h-3.5 text-[#DFB473]" />
                        {copy.theater.watchSamplePrefix} · {activeReel.label}
                      </span>
                    </button>
                  )}
                </div>

                <p className="text-xs text-slate-300 px-2 pt-2.5 pb-1">{activeReel.caption}</p>

                {/* Film Switcher Pills with full non-truncated labels + rich tooltips */}
                <div className="grid grid-cols-2 gap-2 pt-2">
                  {copy.theater.tabs.map((tab, idx) => {
                    const fullTooltip = `${tab.label} (${fmt(tab.priceUsd)}) — ${tab.caption}`
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        title={fullTooltip}
                        aria-label={fullTooltip}
                        onClick={() => handleSelectReel(idx)}
                        className={`group relative rounded-lg px-3 py-2 text-start text-xs leading-snug transition border ${
                          idx === activeReelIdx
                            ? 'border-[#DFB473]/60 bg-[#DFB473]/15 text-white font-semibold'
                            : 'border-white/10 bg-white/[0.02] text-slate-300 hover:text-white hover:border-white/25'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="leading-snug">{tab.label}</span>
                          <span className="text-[10px] text-[#DFB473]/90 font-medium shrink-0">
                            {fmt(tab.priceUsd)}
                          </span>
                        </div>
                        {/* Styled hover/focus tooltip showing complete title & caption */}
                        <span
                          role="tooltip"
                          className="pointer-events-none absolute bottom-full start-1/2 -translate-x-1/2 rtl:translate-x-1/2 mb-2 z-40 w-56 rounded-xl border border-[#DFB473]/35 bg-[#0A0E18]/95 px-3 py-2 text-[11px] leading-snug text-slate-200 shadow-2xl opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-150"
                        >
                          <span className="block font-semibold text-[#F0CB92] mb-0.5">
                            {tab.label} · {fmt(tab.priceUsd)}
                          </span>
                          <span className="block text-slate-300 font-normal">{tab.caption}</span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Occasions & Packages Section */}
      <section id="occasions" className="py-16 sm:py-24 border-t border-white/[0.07] bg-[#090C14]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#DFB473] mb-2">
                {copy.occasions.eyebrow}
              </p>
              <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-white">
                {copy.occasions.heading}
              </h2>
              <p className="text-slate-300 mt-3 text-sm sm:text-base">
                {txt(copy.occasions.subtitle)}
              </p>
            </div>

            {/* Category Switcher */}
            <div className="grid grid-cols-2 sm:inline-flex w-full sm:w-auto rounded-full border border-white/15 bg-[#0E1320] p-1">
              <button
                type="button"
                onClick={() => setActiveCategory('milestones')}
                className={`rounded-full px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold transition text-center ${
                  activeCategory === 'milestones'
                    ? 'bg-[#DFB473] text-[#090B12]'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {copy.occasions.tabMilestones}
              </button>
              <button
                type="button"
                onClick={() => setActiveCategory('commercial')}
                className={`rounded-full px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold transition text-center ${
                  activeCategory === 'commercial'
                    ? 'bg-[#DFB473] text-[#090B12]'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {copy.occasions.tabCommercial}
              </button>
            </div>
          </div>

          <div
            className={`grid grid-cols-1 gap-6 ${
              visibleOffers.length === 4 ? 'md:grid-cols-2' : 'md:grid-cols-3'
            }`}
          >
            {visibleOffers.map((offer) => {
              const offerCopy = copy.occasions.offers[offer.id]
              return (
                <div
                  key={offer.id}
                  className="group rounded-2xl border border-white/10 hover:border-[#DFB473]/45 bg-[#0D111C] overflow-hidden flex flex-col transition shadow-lg shadow-black/40"
                >
                  <div className="relative aspect-[16/9] overflow-hidden bg-slate-950">
                    <img
                      src={offer.posterImage}
                      alt={offerCopy.title}
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0D111C] via-transparent to-black/25" />
                    <div className="absolute top-3 start-3 max-w-[calc(100%-1.5rem)] inline-flex items-center rounded-full bg-black/75 border border-[#DFB473]/40 px-3 py-1 text-[11px] font-medium text-[#F0CB92] backdrop-blur truncate">
                      {offerCopy.badge}
                    </div>
                  </div>

                  <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between gap-5">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="font-serif text-xl sm:text-2xl font-semibold text-white leading-snug">
                            {offerCopy.title}
                          </h3>
                          <p className="text-xs text-slate-400 mt-1">{offerCopy.runtimeLabel}</p>
                        </div>
                        <div className="text-end shrink-0">
                          <div className="text-xl sm:text-2xl font-bold text-[#F0CB92] leading-none">
                            {fmt(offer.totalPriceUsd)}
                          </div>
                          <div className="text-[10px] tracking-wider text-slate-400 mt-1 whitespace-nowrap">
                            {fmt(offer.blueprintPassUsd)} + {fmt(offer.balanceDueUsd)}
                          </div>
                        </div>
                      </div>

                      <p className="text-sm text-slate-300 leading-relaxed">
                        {txt(offerCopy.subtitle)}
                      </p>

                      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 text-xs text-slate-300">
                        <span className="text-[#DFB473] font-semibold">
                          {copy.occasions.idealForLabel}{' '}
                        </span>
                        {offerCopy.idealFor}
                      </div>

                      <ul className="space-y-2">
                        {offerCopy.deliverables.map((item) => (
                          <li
                            key={item}
                            className="flex items-start gap-2 text-xs sm:text-sm text-slate-200"
                          >
                            <Check className="w-4 h-4 text-[#DFB473] shrink-0 mt-0.5" />
                            <span>{txt(item)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="pt-3 border-t border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-1.5 text-xs text-emerald-300">
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        <span>{offerCopy.turnaroundLabel}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => openOrderModal(offer)}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-full bg-white text-[#090B12] hover:bg-[#F0CB92] px-4 py-2.5 sm:py-2 text-xs sm:text-sm font-semibold transition shrink-0"
                      >
                        {txt(copy.occasions.cardCta)}
                        <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* 3-Step Self-Serve Workflow */}
      <section id="how-it-works" className="py-16 sm:py-24 border-t border-white/[0.07]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#DFB473] mb-2">
              {copy.steps.eyebrow}
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-white">
              {copy.steps.heading}
            </h2>
            <p className="text-slate-300 mt-3 text-sm sm:text-base">{copy.steps.subtitle}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {copy.steps.items.map((step, idx) => {
              const Icon = idx === 0 ? Mic : idx === 1 ? Users : Award
              return (
                <div
                  key={step.tag}
                  className="rounded-2xl border border-white/10 bg-[#0C101B] p-6 space-y-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-[#DFB473]/15 text-[#DFB473] border border-[#DFB473]/30 shrink-0">
                      <Icon className="w-5 h-5" />
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      {txt(step.tag)}
                    </span>
                  </div>
                  <h3 className="font-serif text-xl font-semibold text-white">{step.title}</h3>
                  <p className="text-sm text-slate-300 leading-relaxed">{txt(step.body)}</p>
                  <div
                    className={`text-xs font-medium ${
                      idx === 1 ? 'text-emerald-300' : 'text-[#F0CB92]'
                    }`}
                  >
                    {txt(step.highlight)}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Honest Express 4K Cinema Clarity + Partner Full-Motion Upgrade Path */}
      <section id="express-4k" className="py-16 border-t border-white/[0.07] bg-[#090C14]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-[#DFB473]/25 bg-gradient-to-br from-[#121625] via-[#0C101B] to-[#090C14] p-6 sm:p-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7 space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#DFB473]/30 bg-[#DFB473]/10 px-3 py-1 text-xs font-medium text-[#F0CB92]">
                  <Layers className="w-3.5 h-3.5 shrink-0" />
                  {copy.clarity.badge}
                </div>
                <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-white">
                  {copy.clarity.heading}
                </h2>
                <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                  {txt(copy.clarity.body)}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs sm:text-sm">
                  {copy.clarity.bullets.map((bullet) => (
                    <div key={bullet} className="flex items-center gap-2 text-slate-200">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{bullet}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-5 rounded-2xl border border-white/10 bg-black/40 p-5 sm:p-6 space-y-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
                  <Heart className="w-4 h-4 text-[#DFB473] shrink-0" />
                  {copy.clarity.partnerHeading}
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">{copy.clarity.partnerBody1}</p>
                <p className="text-sm text-slate-300 leading-relaxed">{copy.clarity.partnerBody2}</p>
                <div className="pt-2 border-t border-white/10 flex flex-col sm:flex-row gap-2.5">
                  <button
                    type="button"
                    onClick={() => openOrderModal(EXPRESS_SHOWCASE_OFFERS[0])}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#DFB473] hover:bg-[#F0CB92] px-4 py-2.5 text-xs font-semibold text-[#090B12] transition"
                  >
                    {txt(copy.clarity.partnerPrimaryCta)}
                    <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
                  </button>
                  <Link
                    href="/#video-services"
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/15 hover:border-white/30 px-4 py-2.5 text-xs font-medium text-slate-200 hover:text-white transition"
                  >
                    {copy.clarity.partnerSecondaryCta}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-16 sm:py-24 border-t border-white/[0.07]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#DFB473] mb-2">
              {copy.faq.eyebrow}
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-white">
              {copy.faq.heading}
            </h2>
          </div>

          <div className="space-y-3">
            {copy.faq.items.map((item, idx) => {
              const isOpen = openFaqIdx === idx
              return (
                <div
                  key={item.q}
                  className="rounded-2xl border border-white/10 bg-[#0C101B] overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
                    className="w-full px-5 py-4 flex items-center justify-between gap-4 text-start"
                  >
                    <span className="text-sm sm:text-base font-medium text-white">
                      {txt(item.q)}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-[#DFB473] shrink-0 transition-transform ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 text-sm text-slate-300 leading-relaxed border-t border-white/[0.06] pt-3">
                      {txt(item.a)}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Footer + Prospective Operator CTA */}
      <footer className="border-t border-white/10 bg-[#05070C] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-lg">
            <div className="flex items-center gap-2.5 flex-wrap">
              <Film className="w-4 h-4 text-[#DFB473] shrink-0" />
              <span className="font-serif text-lg font-semibold text-white">
                {SHOWCASE_BRAND_SNAPSHOT.brandName}
              </span>
              <span className="text-xs text-slate-500">{copy.footer.referenceTag}</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">{copy.footer.body}</p>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-[#DFB473] shrink-0" />
              <span>{copy.modal.whopRefBadge}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => openOrderModal(EXPRESS_SHOWCASE_OFFERS[0])}
              className="rounded-full bg-[#DFB473] hover:bg-[#F0CB92] px-5 py-2.5 text-xs sm:text-sm font-semibold text-[#090B12] transition"
            >
              {txt(copy.footer.primaryCta)}
            </button>
            <Link
              href="/#video-services"
              className="rounded-full border border-white/15 hover:border-[#DFB473]/50 px-5 py-2.5 text-xs sm:text-sm font-medium text-slate-200 hover:text-white transition"
            >
              {copy.footer.secondaryCta}
            </Link>
          </div>
        </div>
      </footer>

      {/* Whop MoR Blueprint Pass Checkout Modal */}
      {checkoutOffer && (() => {
        const selectedOfferCopy = copy.occasions.offers[checkoutOffer.id]
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="checkout-modal-title"
          >
            <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-[#DFB473]/30 bg-[#0B0F1A] shadow-2xl my-4 sm:my-8">
              <button
                type="button"
                onClick={() => setCheckoutOffer(null)}
                aria-label="Close order modal"
                className="absolute top-4 end-4 z-10 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="grid grid-cols-1 md:grid-cols-12">
                {/* Order Summary Sidebar */}
                <div className="md:col-span-5 bg-gradient-to-b from-[#151B2D] to-[#0B0F1A] p-6 pe-14 md:pe-6 border-b md:border-b-0 md:border-e border-white/10 flex flex-col justify-between gap-5">
                  <div className="space-y-3">
                    <span className="inline-flex items-center rounded-full bg-[#DFB473]/15 border border-[#DFB473]/35 px-2.5 py-0.5 text-[11px] font-semibold text-[#F0CB92]">
                      {copy.modal.stepBadge}
                    </span>
                    <h3
                      id="checkout-modal-title"
                      className="font-serif text-xl font-semibold text-white"
                    >
                      {selectedOfferCopy.title}
                    </h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {selectedOfferCopy.runtimeLabel} · {selectedOfferCopy.turnaroundLabel}
                    </p>
                  </div>

                  <div className="space-y-2.5 rounded-2xl border border-white/10 bg-black/30 p-4 text-xs">
                    <div className="flex items-center justify-between gap-2 text-slate-200">
                      <span>{copy.modal.linePass}</span>
                      <span className="font-bold text-[#F0CB92] shrink-0">
                        {fmt(EXPRESS_BLUEPRINT_PASS_USD)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 text-slate-400">
                      <span>{copy.modal.lineBalance}</span>
                      <span className="shrink-0">{fmt(checkoutOffer.balanceDueUsd)}</span>
                    </div>
                    <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2 text-white font-semibold">
                      <span>{copy.modal.lineTotal}</span>
                      <span className="shrink-0">{fmt(checkoutOffer.totalPriceUsd)}</span>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-400 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#DFB473] shrink-0" />
                      <span>{copy.modal.whopNotice}</span>
                    </div>
                    {currencyCfg.code !== 'USD' && (
                      <p className="text-[#F0CB92]/80">{copy.modal.currencyNote}</p>
                    )}
                    <p>{copy.modal.instantLinkNote}</p>
                  </div>
                </div>

                {/* Customer Form */}
                <form onSubmit={handleCheckoutSubmit} className="md:col-span-7 p-6 space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      {copy.modal.fieldOccasion}
                    </label>
                    <select
                      value={checkoutOffer.id}
                      onChange={(e) => {
                        const next = EXPRESS_SHOWCASE_OFFERS.find((o) => o.id === e.target.value)
                        if (next) setCheckoutOffer(next)
                      }}
                      className="w-full rounded-xl bg-slate-950 border border-white/15 px-3.5 py-2.5 text-sm text-white focus:border-[#DFB473] focus:outline-none"
                    >
                      {EXPRESS_SHOWCASE_OFFERS.map((o) => {
                        const oCopy = copy.occasions.offers[o.id]
                        return (
                          <option key={o.id} value={o.id}>
                            {oCopy.title} ({fmt(o.totalPriceUsd)} {copy.modal.totalOptionSuffix} ·{' '}
                            {fmt(o.blueprintPassUsd)} {copy.modal.todayOptionSuffix})
                          </option>
                        )
                      })}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      {copy.modal.fieldTitle}
                    </label>
                    <input
                      type="text"
                      value={honoreeOrTitle}
                      onChange={(e) => setHonoreeOrTitle(e.target.value)}
                      placeholder={selectedOfferCopy.titlePlaceholder}
                      className="w-full rounded-xl bg-slate-950 border border-white/15 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-[#DFB473] focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">
                        {copy.modal.fieldName}
                      </label>
                      <input
                        type="text"
                        required
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder={copy.modal.fieldNamePlaceholder}
                        className="w-full rounded-xl bg-slate-950 border border-white/15 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-[#DFB473] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">
                        {copy.modal.fieldLanguage}
                      </label>
                      <select
                        value={checkoutLocale}
                        onChange={(e) =>
                          setCheckoutLocale(resolveClientPortalLocale(e.target.value))
                        }
                        className="w-full rounded-xl bg-slate-950 border border-white/15 px-3.5 py-2.5 text-sm text-white focus:border-[#DFB473] focus:outline-none"
                      >
                        {SUPPORTED_CLIENT_PORTAL_LOCALES.map((loc) => (
                          <option key={loc.code} value={loc.code}>
                            {loc.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 -mt-1.5 leading-relaxed">
                    {copy.modal.fieldLanguageHint}
                  </p>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      {copy.modal.fieldEmail}
                    </label>
                    <input
                      type="email"
                      required
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder={copy.modal.fieldEmailPlaceholder}
                      className="w-full rounded-xl bg-slate-950 border border-white/15 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-[#DFB473] focus:outline-none"
                    />
                  </div>

                  {checkoutError && (
                    <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-200">
                      {checkoutError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submittingCheckout}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#E6BE7E] to-[#C9974F] hover:from-[#F2D098] hover:to-[#D8A75E] disabled:opacity-60 px-5 py-3.5 text-sm font-semibold text-[#090B12] shadow-lg shadow-[#C9974F]/25 transition"
                  >
                    {submittingCheckout
                      ? copy.modal.submitBusy
                      : `${copy.modal.submitIdlePrefix} ${fmt(EXPRESS_BLUEPRINT_PASS_USD)}`}
                    {!submittingCheckout && (
                      <ArrowRight className="w-4 h-4 shrink-0 rtl:rotate-180" />
                    )}
                  </button>
                  <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#DFB473] shrink-0" />
                    <span>{copy.modal.whopRefBadge}</span>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
