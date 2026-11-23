'use client'

import React, { useMemo, useRef, useState } from 'react'
import Link from 'next/link'
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
  type ShowcaseOfferId,
} from '@/config/showcase/expressCinemaCatalog'
import { SUPPORTED_CLIENT_PORTAL_LOCALES } from '@/lib/intake/clientPortalCopy'

const REEL_TABS = [
  {
    id: 'family_legacy' as ShowcaseOfferId,
    label: 'Life & Milestones',
    tag: '$149 · Same-Day 4K',
    videoUrl: '/landing/video-services/videos/memoir-en.mp4',
    posterUrl: '/landing/video-services/videos/memoir-poster.webp',
    caption: 'Family Legacy · Weddings · Graduations · Retirements',
  },
  {
    id: 'real_estate_express' as ShowcaseOfferId,
    label: 'Real Estate 4K',
    tag: '$149 · Same-Day 4K',
    videoUrl: '/landing/video-services/videos/realestate-en.mp4',
    posterUrl: '/landing/video-services/videos/realestate-poster.webp',
    caption: 'MLS Photos Transformed Into Voiced 4K Property Cinema',
  },
  {
    id: 'brand_express' as ShowcaseOfferId,
    label: 'Founder & Clinic',
    tag: '$199 · Same-Day 4K',
    videoUrl: '/landing/video-services/videos/brand-en.mp4',
    posterUrl: '/landing/video-services/videos/brand-poster.webp',
    caption: 'Trust-Building Homepage Origin Films Without a Crew',
  },
  {
    id: 'training_express' as ShowcaseOfferId,
    label: 'Training & SOP',
    tag: '$249 · Same-Day 4K',
    videoUrl: '/landing/video-services/videos/training-en.mp4',
    posterUrl: '/landing/video-services/videos/training-poster.webp',
    caption: 'Presenter-Locked Narrated Modules Easy to Update Anytime',
  },
] as const

const FAQS = [
  {
    q: 'What exactly is an Express 4K Cinema Film?',
    a: 'An Express 4K Cinema Film is a photorealistic documentary-style 4K movie combining your real photos and custom continuity-locked 4K scenes with smooth Ken Burns camera motion, studio-grade narration & voices, layered ambient sound effects, and an original musical score. Because it renders from photorealistic 4K stills rather than full-motion video generation, visual quality is crisp and reliable—delivered the same day at a fraction of traditional crew pricing.',
  },
  {
    q: 'How does the $29 Storyboard Blueprint Pass work?',
    a: 'You start with a $29 Storyboard Blueprint Pass via Whop Checkout. Immediately after payment, you enter our 5-minute voice-or-text guided interview. Within ~3 minutes you receive a complete illustrated, narrated Storyboard Blueprint with 4 AI revision rounds and a private comment-only link to gather memories from family or teammates. When you love it, your entire $29 is credited toward your Express 4K Film (so a $149 film has just a $120 balance). If you decide not to move forward, you keep your Blueprint with zero obligation.',
  },
  {
    q: 'Can siblings, spouses, or colleagues contribute stories before we lock the film?',
    a: 'Yes! Your Blueprint Portal includes a separate Guest Comment-Only link. Relatives, bridesmaids, classmates, or coworkers can listen in 7 languages and leave memories or corrections—without spending your revision rounds or approving anything. You stay in complete control and merge only the notes you want into one clean update.',
  },
  {
    q: 'What about unusual family surnames, towns, or company names?',
    a: 'Before we voice and render your film, your Continuity Library includes a 10-second Phonetic Pronunciation Guide (type or speak names like "Kowalski = koh-VAHL-skee"). You also watch the entire voiced, scored cut in your private Screening Room and approve it before your 4K master MP4 renders.',
  },
  {
    q: 'Are my family photos or business files ever used to train AI models?',
    a: 'Never. Your uploaded photos have EXIF GPS location data stripped automatically on upload, are stored exclusively for your private project, and are never used to train shared AI models.',
  },
  {
    q: 'What if I later want Full-Motion AI video scenes or a live crew shoot?',
    a: 'This storefront delivers Express 4K Cinema Films exclusively so turnaround stays fast and affordable. However, because your cast, voices, and story are locked inside SceneFlow Studio, you can upgrade select chapters to Full-Motion Cinema anytime through a Certified SceneFlow Studio Partner with zero rework.',
  },
] as const

export function KeepsakeCinemaStorefront() {
  const [activeCategory, setActiveCategory] = useState<ShowcaseCategoryId>('milestones')
  const [activeReelIdx, setActiveReelIdx] = useState(0)
  const [isPlayingReel, setIsPlayingReel] = useState(false)
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0)

  // Checkout modal state
  const [checkoutOffer, setCheckoutOffer] = useState<ExpressShowcaseOffer | null>(null)
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [honoreeOrTitle, setHonoreeOrTitle] = useState('')
  const [locale, setLocale] = useState('en')
  const [submittingCheckout, setSubmittingCheckout] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const activeReel = REEL_TABS[activeReelIdx] ?? REEL_TABS[0]

  const visibleOffers = useMemo(
    () => EXPRESS_SHOWCASE_OFFERS.filter((o) => o.category === activeCategory),
    [activeCategory]
  )

  const openOrderModal = (offer: ExpressShowcaseOffer) => {
    setCheckoutOffer(offer)
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
          locale,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success || !data.purchaseUrl) {
        setCheckoutError(data.error || 'Could not start Whop Checkout. Please try again.')
        setSubmittingCheckout(false)
        return
      }
      window.location.href = data.purchaseUrl
    } catch {
      setCheckoutError('Network error starting Whop Checkout. Please try again.')
      setSubmittingCheckout(false)
    }
  }

  return (
    <div className="min-h-screen overflow-x-clip bg-[#06080E] text-[#F5F2EB] selection:bg-[#DFB473]/30 selection:text-white">
      {/* Subtle Live Reference Storefront Attribution Bar (Google-for-Startups & Pro Operator Safe) */}
      <div className="border-b border-white/10 bg-[#0B0F1A]/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[11px] sm:text-xs">
          <div className="flex items-center gap-2 min-w-0 text-slate-300">
            <span className="inline-flex h-2 w-2 shrink-0 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-medium text-white truncate">
              Live White-Label Reference Storefront
            </span>
            <span className="hidden md:inline text-slate-400">
              · Express 4K Cinema Only · Powered by SceneFlow Studio
            </span>
          </div>
          <Link
            href="/#video-services"
            className="inline-flex items-center gap-1 shrink-0 font-medium text-[#DFB473] hover:text-[#F0CB92] transition"
          >
            <span className="sm:hidden">Launch Your Studio</span>
            <span className="hidden sm:inline">Launch your own branded studio on SceneFlow</span>
            <ArrowRight className="w-3.5 h-3.5 shrink-0" />
          </Link>
        </div>
      </div>

      {/* Main Editorial Navigation */}
      <header className="sticky top-0 z-30 border-b border-white/[0.07] bg-[#06080E]/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-[60px] py-2.5 sm:py-0 sm:h-16 flex items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 md:flex-initial">
            <div className="w-8 h-8 sm:w-9 sm:h-9 shrink-0 rounded-xl bg-gradient-to-br from-[#E6BE7E] via-[#C9974F] to-[#8C6126] flex items-center justify-center shadow-lg shadow-[#C9974F]/20">
              <Film className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-[#090B12]" />
            </div>
            <div className="min-w-0">
              <span className="font-serif text-base sm:text-xl font-semibold tracking-tight text-white block leading-tight truncate">
                {SHOWCASE_BRAND_SNAPSHOT.brandName}
              </span>
              <span className="block sm:hidden text-[10px] tracking-wide text-[#DFB473]/90 leading-tight truncate">
                Express 4K Films
              </span>
              <span className="hidden sm:block text-[10px] uppercase tracking-[0.2em] text-[#DFB473]/90 leading-tight truncate">
                Express 4K Milestone &amp; Life Films
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-7 text-sm text-slate-300 shrink-0">
            <a href="#occasions" className="hover:text-white transition">
              Occasions
            </a>
            <a href="#how-it-works" className="hover:text-white transition">
              How It Works
            </a>
            <a href="#express-4k" className="hover:text-white transition">
              Express 4K Quality
            </a>
            <a href="#faq" className="hover:text-white transition">
              FAQ
            </a>
          </nav>

          <button
            type="button"
            onClick={() => openOrderModal(EXPRESS_SHOWCASE_OFFERS[0])}
            className="inline-flex items-center gap-1.5 sm:gap-2 shrink-0 whitespace-nowrap rounded-full bg-gradient-to-r from-[#E6BE7E] to-[#C9974F] hover:from-[#F0CB92] hover:to-[#D8A75E] px-3.5 sm:px-5 py-2 text-xs sm:text-sm font-semibold text-[#090B12] shadow-lg shadow-[#C9974F]/20 transition"
          >
            <span className="sm:hidden">$29 Blueprint</span>
            <span className="hidden sm:inline">Start $29 Blueprint</span>
            <ArrowRight className="w-3.5 h-3.5 shrink-0" />
          </button>
        </div>
      </header>

      {/* Hero Section with Real 16:9 Cinema Theater */}
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
                <span>Same-Day 4K Cinema · Zero Crews · 7 Languages</span>
              </div>

              <h1 className="font-serif text-3xl sm:text-5xl lg:text-[56px] font-semibold tracking-tight text-white leading-[1.12] sm:leading-[1.08]">
                Turn Life’s Greatest Chapters Into a{' '}
                <span className="bg-gradient-to-r from-[#F5D6A3] via-[#DFB473] to-[#C48E44] bg-clip-text text-transparent">
                  4K Cinema Film
                </span>{' '}
                — Delivered Today.
              </h1>

              <p className="text-sm sm:text-lg text-slate-300 leading-relaxed max-w-xl">
                From{' '}
                <span className="text-white font-medium">
                  family legacies &amp; milestone birthdays
                </span>{' '}
                to{' '}
                <span className="text-white font-medium">
                  weddings, graduations, and retirements
                </span>
                —transform treasured photos and spoken memories into a photorealistic panned 4K film
                with studio voices, soundscapes, and musical score.
              </p>

              {/* Price & Guarantee Callout */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3 pt-1 max-w-lg">
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2.5 sm:px-3.5 sm:py-3">
                  <div className="text-lg sm:text-2xl font-bold text-[#F0CB92]">$29</div>
                  <div className="text-[10px] sm:text-[11px] text-slate-400 leading-snug mt-0.5">
                    Blueprint Pass (100% credited)
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2.5 sm:px-3.5 sm:py-3">
                  <div className="text-lg sm:text-2xl font-bold text-white">$149</div>
                  <div className="text-[10px] sm:text-[11px] text-slate-400 leading-snug mt-0.5">
                    Express 4K Milestone Film
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2.5 sm:px-3.5 sm:py-3">
                  <div className="text-lg sm:text-2xl font-bold text-emerald-300">2–4 hrs</div>
                  <div className="text-[10px] sm:text-[11px] text-slate-400 leading-snug mt-0.5">
                    Same-day 4K after photo lock
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => openOrderModal(EXPRESS_SHOWCASE_OFFERS[0])}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#E6BE7E] to-[#C9974F] hover:from-[#F2D098] hover:to-[#D8A75E] px-6 py-3.5 text-sm sm:text-base font-semibold text-[#090B12] shadow-xl shadow-[#C9974F]/25 transition"
                >
                  Start My $29 Storyboard Blueprint
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </button>
                <a
                  href="#occasions"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.04] hover:bg-white/[0.08] px-5 py-3.5 text-sm font-medium text-white transition"
                >
                  Browse All Occasions
                </a>
              </div>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-400 pt-1">
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#DFB473]" />
                  Secured by Whop Merchant of Record
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[#DFB473]" />
                  Never trained on client photos
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-[#DFB473]" />
                  7 portal &amp; narration languages
                </span>
              </div>
            </div>

            {/* Interactive 16:9 Cinema Sample Theater */}
            <div className="lg:col-span-6">
              <div className="rounded-2xl border border-[#DFB473]/25 bg-[#0C101B] p-2.5 sm:p-3 shadow-2xl shadow-black/60">
                <div className="flex items-center justify-between gap-2 px-2 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-2 w-2 rounded-full bg-[#DFB473]" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#F0CB92]">
                      Express 4K Cinema Reel
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">{activeReel.tag}</span>
                </div>

                <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-white/10">
                  <video
                    ref={videoRef}
                    key={activeReel.videoUrl}
                    src={activeReel.videoUrl}
                    poster={activeReel.posterUrl}
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
                      aria-label={`Play ${activeReel.label} Express 4K sample`}
                      className="group absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-t from-black/75 via-black/30 to-black/20 hover:bg-black/45 transition"
                    >
                      <span className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#DFB473]/95 group-hover:bg-[#F0CB92] group-hover:scale-105 text-[#090B12] flex items-center justify-center shadow-2xl shadow-[#DFB473]/40 transition">
                        <Play className="w-7 h-7 sm:w-8 sm:h-8 ml-1 fill-current" />
                      </span>
                      <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-black/70 border border-white/15 px-3.5 py-1 text-xs font-medium text-white backdrop-blur">
                        <Volume2 className="w-3.5 h-3.5 text-[#DFB473]" />
                        Watch Sample · {activeReel.label}
                      </span>
                    </button>
                  )}
                </div>

                <p className="text-xs text-slate-300 px-2 pt-2.5 pb-1">{activeReel.caption}</p>

                {/* Film Switcher Pills */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-2">
                  {REEL_TABS.map((tab, idx) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => handleSelectReel(idx)}
                      className={`rounded-lg px-2.5 py-2 text-left text-xs transition border ${
                        idx === activeReelIdx
                          ? 'border-[#DFB473]/60 bg-[#DFB473]/15 text-white font-semibold'
                          : 'border-white/10 bg-white/[0.02] text-slate-400 hover:text-white hover:border-white/20'
                      }`}
                    >
                      <div className="truncate">{tab.label}</div>
                    </button>
                  ))}
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
                Curated Express 4K Collections
              </p>
              <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-white">
                Every Milestone Deserves the Big Screen.
              </h2>
              <p className="text-slate-300 mt-3 text-sm sm:text-base">
                Start any film with a <strong className="text-white">$29 Storyboard Blueprint Pass</strong>{' '}
                (100% credited toward your finished 4K film). Review illustrated chapters with loved
                ones before paying the remaining Express 4K balance.
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
                Life Milestones (4)
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
                Business &amp; Property (3)
              </button>
            </div>
          </div>

          <div
            className={`grid grid-cols-1 gap-6 ${
              visibleOffers.length === 4 ? 'md:grid-cols-2' : 'md:grid-cols-3'
            }`}
          >
            {visibleOffers.map((offer) => (
              <div
                key={offer.id}
                className="group rounded-2xl border border-white/10 hover:border-[#DFB473]/45 bg-[#0D111C] overflow-hidden flex flex-col transition shadow-lg shadow-black/40"
              >
                <div className="relative aspect-[16/9] overflow-hidden bg-slate-950">
                  <img
                    src={offer.posterImage}
                    alt={offer.title}
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0D111C] via-transparent to-black/25" />
                  <div className="absolute top-3 left-3 max-w-[calc(100%-1.5rem)] inline-flex items-center rounded-full bg-black/75 border border-[#DFB473]/40 px-3 py-1 text-[11px] font-medium text-[#F0CB92] backdrop-blur truncate">
                    {offer.badge}
                  </div>
                </div>

                <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between gap-5">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-serif text-xl sm:text-2xl font-semibold text-white leading-snug">
                          {offer.title}
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">{offer.runtimeLabel}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xl sm:text-2xl font-bold text-[#F0CB92] leading-none">
                          ${offer.totalPriceUsd}
                        </div>
                        <div className="text-[10px] uppercase tracking-wider text-slate-400 mt-1 whitespace-nowrap">
                          $29 + ${offer.balanceDueUsd}
                        </div>
                      </div>
                    </div>

                    <p className="text-sm text-slate-300 leading-relaxed">{offer.subtitle}</p>

                    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 text-xs text-slate-300">
                      <span className="text-[#DFB473] font-semibold">Ideal for: </span>
                      {offer.idealFor}
                    </div>

                    <ul className="space-y-2">
                      {offer.deliverables.map((item) => (
                        <li key={item} className="flex items-start gap-2 text-xs sm:text-sm text-slate-200">
                          <Check className="w-4 h-4 text-[#DFB473] shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-3 border-t border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5 text-xs text-emerald-300">
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span>{offer.turnaroundLabel}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => openOrderModal(offer)}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-full bg-white text-[#090B12] hover:bg-[#F0CB92] px-4 py-2.5 sm:py-2 text-xs sm:text-sm font-semibold transition shrink-0"
                    >
                      Start $29 Blueprint
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3-Step Self-Serve Workflow */}
      <section id="how-it-works" className="py-16 sm:py-24 border-t border-white/[0.07]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#DFB473] mb-2">
              Effortless Zero-Login Experience
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-white">
              From Spoken Memories to a 4K Film in 3 Simple Steps
            </h2>
            <p className="text-slate-300 mt-3 text-sm sm:text-base">
              No accounts to create, no complicated software, and no weeks of back-and-forth emails.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-white/10 bg-[#0C101B] p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-[#DFB473]/15 text-[#DFB473] border border-[#DFB473]/30">
                  <Mic className="w-5 h-5" />
                </span>
                <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                  Step 01 · $29 Today
                </span>
              </div>
              <h3 className="font-serif text-xl font-semibold text-white">
                5-Minute Guided Story &amp; Living Blueprint
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                Tap occasion memory-joggers and speak or type your story in any of 7 languages. In
                ~3 minutes, receive an illustrated, narrated Blueprint + a comment-only sharing link
                for family or teammates and 4 AI revision rounds.
              </p>
              <div className="text-xs text-[#F0CB92] font-medium">
                100% of your $29 credits toward your final 4K film →
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#0C101B] p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-[#DFB473]/15 text-[#DFB473] border border-[#DFB473]/30">
                  <Users className="w-5 h-5" />
                </span>
                <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                  Step 02 · $120 Balance
                </span>
              </div>
              <h3 className="font-serif text-xl font-semibold text-white">
                Phone Photos, Pronunciation &amp; Continuity Lock
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                Approve your Blueprint and complete your balance via Whop to unlock your private
                Continuity Library. Upload keepsake photos from your phone (GPS stripped), add a
                10-second name/town pronunciation guide, and lock every face &amp; setting.
              </p>
              <div className="text-xs text-emerald-300 font-medium">
                Every family name &amp; portrait verified before rendering →
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#0C101B] p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-[#DFB473]/15 text-[#DFB473] border border-[#DFB473]/30">
                  <Award className="w-5 h-5" />
                </span>
                <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                  Step 03 · Same-Day 4K
                </span>
              </div>
              <h3 className="font-serif text-xl font-semibold text-white">
                Private Screening Room &amp; Automatic 4K Master
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                Watch your voiced, scored Express 4K Cinema Film on phone or TV via a zero-login
                Screening Room link. The moment you click Approve, our cloud cinema engine renders
                your 4K MP4 master and emails your download link automatically.
              </p>
              <div className="text-xs text-[#F0CB92] font-medium">
                Ready for venue projectors, smart TVs &amp; family sharing →
              </div>
            </div>
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
                  <Layers className="w-3.5 h-3.5" />
                  Why Express 4K Cinema Works So Well
                </div>
                <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-white">
                  Ken Burns Documentary Cinema Meets Modern 4K Storytelling
                </h2>
                <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                  Think of the emotional power of a PBS documentary paired with bespoke photorealistic
                  4K visual scenes, continuity-locked faces across eras, lifelike studio narration,
                  ambient soundscapes, and a custom musical score. By focusing exclusively on{' '}
                  <strong className="text-white">Express 4K Cinema Films</strong> on this
                  storefront, we deliver museum-grade clarity at{' '}
                  <strong className="text-[#F0CB92]">$149–$249 same-day</strong> instead of
                  $2,500+ and three weeks of waiting.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs sm:text-sm">
                  <div className="flex items-center gap-2 text-slate-200">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    Photorealistic 4K stills + smooth camera motion
                  </div>
                  <div className="flex items-center gap-2 text-slate-200">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    Real uploaded photos blended seamlessly
                  </div>
                  <div className="flex items-center gap-2 text-slate-200">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    Studio narration, SFX &amp; original score
                  </div>
                  <div className="flex items-center gap-2 text-slate-200">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    100% commercial &amp; personal sharing rights
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5 rounded-2xl border border-white/10 bg-black/40 p-5 sm:p-6 space-y-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
                  <Heart className="w-4 h-4 text-[#DFB473]" />
                  Want Full-Motion AI Video Later?
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">
                  This Express storefront intentionally offers{' '}
                  <strong className="text-white">Express 4K Cinema only</strong>—keeping quality
                  consistent and turnaround same-day.
                </p>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Want to upgrade favorite chapters into Full-Motion AI video or add live filmed
                  interviews? Your locked Continuity Vault transfers with{' '}
                  <strong className="text-white">zero rework</strong> to a Certified SceneFlow
                  Studio Partner anytime.
                </p>
                <div className="pt-2 border-t border-white/10 flex flex-col sm:flex-row gap-2.5">
                  <button
                    type="button"
                    onClick={() => openOrderModal(EXPRESS_SHOWCASE_OFFERS[0])}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#DFB473] hover:bg-[#F0CB92] px-4 py-2.5 text-xs font-semibold text-[#090B12] transition"
                  >
                    Order Express 4K Blueprint ($29)
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <Link
                    href="/#video-services"
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/15 hover:border-white/30 px-4 py-2.5 text-xs font-medium text-slate-200 hover:text-white transition"
                  >
                    For Video Agencies →
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
              Questions &amp; Answers
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-white">
              Everything You Need to Know
            </h2>
          </div>

          <div className="space-y-3">
            {FAQS.map((item, idx) => {
              const isOpen = openFaqIdx === idx
              return (
                <div
                  key={item.q}
                  className="rounded-2xl border border-white/10 bg-[#0C101B] overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
                    className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left"
                  >
                    <span className="text-sm sm:text-base font-medium text-white">{item.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-[#DFB473] shrink-0 transition-transform ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 text-sm text-slate-300 leading-relaxed border-t border-white/[0.06] pt-3">
                      {item.a}
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
            <div className="flex items-center gap-2.5">
              <Film className="w-4 h-4 text-[#DFB473]" />
              <span className="font-serif text-lg font-semibold text-white">
                {SHOWCASE_BRAND_SNAPSHOT.brandName}
              </span>
              <span className="text-xs text-slate-500">· Live Reference Storefront</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              This storefront runs 100% on SceneFlow Studio’s white-label client portal engine with
              Whop Merchant of Record checkout. Prospective studio operators can launch their own
              branded storefront under their own domain and keep 100% of client billing.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => openOrderModal(EXPRESS_SHOWCASE_OFFERS[0])}
              className="rounded-full bg-[#DFB473] hover:bg-[#F0CB92] px-5 py-2.5 text-xs sm:text-sm font-semibold text-[#090B12] transition"
            >
              Start $29 Blueprint Pass
            </button>
            <Link
              href="/#video-services"
              className="rounded-full border border-white/15 hover:border-[#DFB473]/50 px-5 py-2.5 text-xs sm:text-sm font-medium text-slate-200 hover:text-white transition"
            >
              Run This Under Your Own Brand →
            </Link>
          </div>
        </div>
      </footer>

      {/* Whop MoR Blueprint Pass Checkout Modal */}
      {checkoutOffer && (
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
              className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="grid grid-cols-1 md:grid-cols-12">
              {/* Order Summary Sidebar */}
              <div className="md:col-span-5 bg-gradient-to-b from-[#151B2D] to-[#0B0F1A] p-6 pr-14 md:pr-6 border-b md:border-b-0 md:border-r border-white/10 flex flex-col justify-between gap-5">
                <div className="space-y-3">
                  <span className="inline-flex items-center rounded-full bg-[#DFB473]/15 border border-[#DFB473]/35 px-2.5 py-0.5 text-[11px] font-semibold text-[#F0CB92]">
                    Step 1 · Blueprint Pass
                  </span>
                  <h3 id="checkout-modal-title" className="font-serif text-xl font-semibold text-white">
                    {checkoutOffer.title}
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {checkoutOffer.runtimeLabel} · {checkoutOffer.turnaroundLabel}
                  </p>
                </div>

                <div className="space-y-2.5 rounded-2xl border border-white/10 bg-black/30 p-4 text-xs">
                  <div className="flex items-center justify-between text-slate-200">
                    <span>Storyboard Blueprint Pass</span>
                    <span className="font-bold text-[#F0CB92]">${EXPRESS_BLUEPRINT_PASS_USD}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Later Express 4K balance (only if approved)</span>
                    <span>${checkoutOffer.balanceDueUsd}</span>
                  </div>
                  <div className="pt-2 border-t border-white/10 flex items-center justify-between text-white font-semibold">
                    <span>Total Express 4K Film</span>
                    <span>${checkoutOffer.totalPriceUsd}</span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#DFB473]" />
                    <span>Processed securely by Whop (Merchant of Record)</span>
                  </div>
                  <p>
                    Instant magic link to your 5-minute guided story interview immediately after
                    checkout.
                  </p>
                </div>
              </div>

              {/* Customer Form */}
              <form onSubmit={handleCheckoutSubmit} className="md:col-span-7 p-6 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Occasion / Film Style
                  </label>
                  <select
                    value={checkoutOffer.id}
                    onChange={(e) => {
                      const next = EXPRESS_SHOWCASE_OFFERS.find((o) => o.id === e.target.value)
                      if (next) setCheckoutOffer(next)
                    }}
                    className="w-full rounded-xl bg-slate-950 border border-white/15 px-3.5 py-2.5 text-sm text-white focus:border-[#DFB473] focus:outline-none"
                  >
                    {EXPRESS_SHOWCASE_OFFERS.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.title} (${o.totalPriceUsd} total · $29 today)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Who or what is this film celebrating? (optional)
                  </label>
                  <input
                    type="text"
                    value={honoreeOrTitle}
                    onChange={(e) => setHonoreeOrTitle(e.target.value)}
                    placeholder={checkoutOffer.titlePlaceholder}
                    className="w-full rounded-xl bg-slate-950 border border-white/15 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-[#DFB473] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Your Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Alex Rivera"
                      className="w-full rounded-xl bg-slate-950 border border-white/15 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-[#DFB473] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Preferred Language
                    </label>
                    <select
                      value={locale}
                      onChange={(e) => setLocale(e.target.value)}
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

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Email for Your Private Studio Links *
                  </label>
                  <input
                    type="email"
                    required
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="you@example.com"
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
                    ? 'Connecting to Whop Checkout...'
                    : `Continue to Whop Checkout — $${EXPRESS_BLUEPRINT_PASS_USD}`}
                  {!submittingCheckout && <ArrowRight className="w-4 h-4" />}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
