'use client'

import React from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  Building2,
  Compass,
  ExternalLink,
  Globe,
  Hammer,
  HeartHandshake,
  PartyPopper,
  ShieldCheck,
  Sparkles,
  UserCheck,
} from 'lucide-react'

const PILLARS = [
  {
    icon: Compass,
    title: 'Licensed Aerials, Curb Appeal & N/E/S/W Grounding',
    desc: 'Combines VSP/broker-captured aerial & exterior photos, compliant map/neighborhood context, and 4-wall room captures for straight-vertical cinema — zero fisheye distortion.',
    accent: 'text-cyan-400',
  },
  {
    icon: Sparkles,
    title: 'AI Redesigns, Virtual Staging & Additions',
    desc: 'Instant Before/After Compare slider and 1-tap View Original toggle for remodels (est. $85K–$110K Kitchen concept) and structural add-ons (+Wine Bar, +Pool, +Guest Casita ADU).',
    accent: 'text-emerald-400',
  },
  {
    icon: PartyPopper,
    title: 'Live Events & Buyer Lifestyle Matching',
    desc: 'Buyers envision Sunday family gatherings, twilight cocktail parties, and personalized recommendations matched to how they live.',
    accent: 'text-amber-400',
  },
  {
    icon: UserCheck,
    title: 'In-Scene Agent Sync & EN / ES / JA Narration',
    desc: '60+ minutes of agent-directed consultative sales commentary and native lip-sync across English, Spanish, and Japanese.',
    accent: 'text-violet-400',
  },
]

export function ImmersiveTourSpotlightSection() {
  return (
    <section
      id="immersive-tour"
      className="relative border-t border-white/10 bg-gradient-to-b from-slate-950 via-slate-900/95 to-slate-950 py-16 sm:py-24 px-4 sm:px-6 overflow-x-clip"
    >
      <div className="mx-auto max-w-7xl space-y-10">
        {/* Header Row */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/35 bg-cyan-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-cyan-300">
                <Compass className="h-3.5 w-3.5" />
                NEW · SceneFlow Immersive Tour™
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">
                Premium VSP Monthly Listing Plans
              </span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white">
              Beyond 360° Cameras: Agent-Directed{' '}
              <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
                60+ Minute Living Property Tours
              </span>
            </h2>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Give Video Service Providers and luxury brokerages a category-defining product where
              buyers can spend an hour immersing themselves in a home — steering N/E/S/W room
              angles, drone-like aerials, AI remodels, structural additions, live events, and
              multilingual agent storytelling — all pre-built inside SceneFlow Blueprint &amp;
              Production and delivered via a 100% white-label embeddable player.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link
              href="/property-tours"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 px-5 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-500/20 hover:opacity-95 transition-opacity"
            >
              <Compass className="h-4 w-4" />
              Launch Live Demo (No Login)
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/tour/demo"
              target="_blank"
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
            >
              <ExternalLink className="h-4 w-4 text-cyan-400" />
              Standalone /tour/demo
            </Link>
          </div>
        </div>

        {/* Visual Showcase + Feature Pillars */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left Visual Mosaic (Malibu Estate Live Preview) */}
          <div className="lg:col-span-7 flex flex-col justify-between rounded-2xl border border-white/15 bg-slate-950/90 p-3 sm:p-4 shadow-2xl space-y-3">
            <Link
              href="/property-tours"
              className="group relative block overflow-hidden rounded-xl border border-white/10 aspect-video bg-black"
            >
              <img
                src="/images/property-tours/demo/aerial-coastal-approach.jpg"
                alt="SceneFlow Immersive Tour — 742 Oceanfront Terrace Malibu Aerial Approach"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
              <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/75 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-md">
                <Sparkles className="h-3 w-3 text-cyan-400" />
                Live Interactive Portal · 5 Spaces · EN / ES / JA
              </div>
              <div className="absolute bottom-3 inset-x-3 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-cyan-300">
                    742 Oceanfront Terrace · Malibu, CA
                  </p>
                  <p className="text-sm sm:text-base font-bold text-white">
                    Click to Explore N/E/S/W, Compare Remodels, Events &amp; Additions
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500 px-3 py-1 text-xs font-bold text-slate-950">
                  Open Interactive Player
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </Link>

            {/* 3 Mini Mode Previews */}
            <div className="grid grid-cols-3 gap-2.5">
              {[
                {
                  src: '/images/property-tours/demo/kitchen-n-remodel.jpg',
                  label: 'Before / After Remodel',
                  badge: 'Redesign',
                },
                {
                  src: '/images/property-tours/demo/great-room-event-party.jpg',
                  label: 'Sunset Cocktail Party',
                  badge: 'Live Events',
                },
                {
                  src: '/images/property-tours/demo/addition-adu-cabana.jpg',
                  label: '+ Guest Casita ADU',
                  badge: 'Additions',
                },
              ].map((card) => (
                <Link
                  key={card.label}
                  href="/property-tours"
                  className="group relative overflow-hidden rounded-lg border border-white/10 aspect-video bg-slate-900"
                >
                  <img
                    src={card.src}
                    alt={card.label}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
                  <div className="absolute bottom-1.5 left-2 right-2">
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-cyan-300">
                      {card.badge}
                    </span>
                    <span className="block truncate text-[11px] font-semibold text-white">
                      {card.label}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Right Feature Pillars + VSP SaaS Economics */}
          <div className="lg:col-span-5 flex flex-col justify-between gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
              {PILLARS.map(({ icon: Icon, title, desc, accent }) => (
                <div
                  key={title}
                  className="rounded-xl border border-white/10 bg-slate-900/75 p-4 hover:border-white/20 transition-colors"
                >
                  <div className="flex items-center gap-2 text-sm font-bold text-white">
                    <Icon className={`h-4 w-4 shrink-0 ${accent}`} />
                    <span>{title}</span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">{desc}</p>
                </div>
              ))}
            </div>

            {/* VSP Recurring Revenue Callout */}
            <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/25 p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-200">
                  <Building2 className="h-4 w-4 text-cyan-400" />
                  Built for Video Service Providers (VSPs)
                </span>
                <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] font-bold text-cyan-200">
                  100% White-Label
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                SceneFlow bills strictly on <strong className="text-white">VSP inputs</strong>:
                monthly VSP subscription &amp; white-label hosting tier (active listing slots) plus
                Vertex AI / AI Gateway production credits — with zero marginal AI playback cost.
                VSPs set their own downstream brokerage packages and client pricing independently.
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-300">
                <span className="inline-flex items-center gap-1">
                  <HeartHandshake className="h-3.5 w-3.5 text-violet-400" />
                  Lifestyle Matching
                </span>
                <span className="inline-flex items-center gap-1">
                  <Hammer className="h-3.5 w-3.5 text-emerald-400" />
                  Add-On Simulator
                </span>
                <span className="inline-flex items-center gap-1">
                  <Globe className="h-3.5 w-3.5 text-cyan-400" />
                  EN · ES · JA Native
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Explicit AI Visualization & Architectural Accuracy Disclaimer */}
        <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3 text-xs text-slate-400">
          <ShieldCheck className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-slate-200">AI Visualization &amp; Property Accuracy Notice:</strong>{' '}
            SceneFlow Immersive Tour™ scenes are AI-enhanced for buyer visualization and lifestyle
            inspiration, grounded directly in actual property photos, structural dimensions, and
            existing architectural features. Buyers can toggle{' '}
            <strong className="text-white">Original (As-Is)</strong> or{' '}
            <strong className="text-white">Compare Original</strong> at any time to inspect
            unaltered listing photography.
          </p>
        </div>
      </div>
    </section>
  )
}
