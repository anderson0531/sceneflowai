'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  Briefcase,
  CheckCircle2,
  Crown,
  Handshake,
  Lock,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { SceneFlowStudioBrand } from '@/components/layout/SceneFlowStudioBrand'
import { getSignupUrlForTier } from '@/lib/billing/checkoutIntent'
import { CHARTER_OFFER_CATALOG, MOR_FOOTER_LINE_FALLBACK } from './foundingOperatorsConstants'

export interface FoundingOperatorsClientProps {
  charterPlanConfigured: boolean
}

const INCLUDED_PILLARS = [
  {
    title: '90 Days of Pro White-Label Portals ($447 Value)',
    detail:
      'Hide SceneFlow branding across /intake, /blueprint/share, /share/continuity, and /share/screening-room—clients interact under your studio name, logo, and colors with zero login.',
  },
  {
    title: '18,000 Production Credits (12-Month Shelf Life)',
    detail:
      'Enough compute to build 1 watermark-free spec sample film plus 4–5 full client Life Memoirs (~$34 compute each) or 10+ Narrated Real Estate Tours (~$15 compute each).',
  },
  {
    title: 'All 4 "Service-in-a-Box" Operator Playbooks',
    detail:
      'Pre-built 7-language AI client interviews, 3-tier client rate cards, margin floor calculator, and 20% referral partner pitch scripts for senior living, estate planners & realtors.',
  },
  {
    title: 'Locked $119/mo Post-Charter Rate (vs. $149/mo Public)',
    detail:
      'Keep an optional $119/mo Founding Operator renewal rate after Day 90 (includes 15,000 monthly base credits + 100 GB Continuity Vault + 4K + BYOK).',
  },
] as const

const ROI_STEPS = [
  {
    step: 'Week 1',
    title: 'Build Your Spec Sample Film (~1,800 cr)',
    detail:
      'Use the guided Producer Onboarding Wizard to produce one 5-minute Milestone Tribute or Luxury Property Tour for local referral partners.',
  },
  {
    step: 'Client #1',
    title: 'Deliver 1 Family Memoir at $599 (~3,400 cr)',
    detail:
      '$599 client fee − $299 Charter = +$300 net cash in your pocket on your very first sale. Your entire 90-day Studio Charter is 100% paid off.',
  },
  {
    step: 'Clients #2–#5',
    title: 'Deliver 4 More Memoirs on Included Credits (~12,800 cr)',
    detail:
      'Your remaining ~12,800 included credits fund ~4 additional $599 memoirs (+$2,396 gross client billings with $0 additional SceneFlow compute spend).',
  },
] as const

export function FoundingOperatorsClient({
  charterPlanConfigured,
}: FoundingOperatorsClientProps) {
  const { data: session } = useSession()
  const isAuthenticated = Boolean(session?.user)
  const offer = CHARTER_OFFER_CATALOG.founding_operator

  const [reserveEmail, setReserveEmail] = useState('')
  const [reserving, setReserving] = useState(false)
  const [reserveSuccess, setReserveSuccess] = useState(false)
  const [reserveError, setReserveError] = useState<string | null>(null)

  const triggerTierIntent = (tier: string) => {
    if (isAuthenticated) {
      window.location.href = `/dashboard/settings/billing?checkoutTier=${encodeURIComponent(tier)}`
      return
    }
    window.location.href = getSignupUrlForTier(tier)
  }

  const handleReserveCharter = async (e: React.FormEvent) => {
    e.preventDefault()
    const clean = reserveEmail.trim()
    if (!clean) return
    setReserving(true)
    setReserveError(null)
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: clean,
          source: 'founding_operator_charter',
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || 'Unable to reserve seat right now.')
      }
      setReserveSuccess(true)
      setReserveEmail('')
    } catch (err) {
      setReserveError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setReserving(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <SceneFlowStudioBrand href="/" variant="app" nameClassName="text-white" />
          <div className="flex items-center gap-3">
            <Link
              href="/#video-services"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-300 hover:text-white sm:text-sm"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Calculator & Verticals</span>
            </Link>
            <Button
              size="sm"
              onClick={() =>
                triggerTierIntent(charterPlanConfigured ? 'founding_operator' : 'pro')
              }
              className="bg-emerald-500 font-semibold text-slate-950 hover:bg-emerald-400"
            >
              {charterPlanConfigured ? 'Claim $299 Charter' : 'Start Pro Studio'}
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        {/* Hero */}
        <div className="mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/35 bg-amber-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-amber-200">
            <Crown className="h-3.5 w-3.5 text-amber-300" />
            <span>Limited to {offer.seatCap} Studios Ahead of January 2027 1.0</span>
          </div>

          <h1 className="mt-5 text-balance text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
            Founding Video Service Operator{' '}
            <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-amber-300 bg-clip-text text-transparent">
              90-Day Pro Launchpad
            </span>
          </h1>

          <p className="mx-auto mt-4 max-w-3xl text-base leading-relaxed text-gray-300 sm:text-lg">
            Launch a high-margin White-Label Video Memoir, Property Tour, or B2B Training studio on
            top of SceneFlow AI. One client delivery pays back your entire 90-day Charter—with
            enough compute credits left over for 4 more client films.
          </p>
        </div>

        {/* Client #1 Payback Strip */}
        <section className="mt-10 rounded-2xl border border-emerald-400/35 bg-gradient-to-br from-slate-900/95 via-emerald-950/30 to-slate-900/95 p-6 shadow-2xl sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
            <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-300 sm:text-sm">
              <TrendingUp className="h-4 w-4 text-emerald-300" />
              <span>Self-Liquidating Operator Math: 1st Client Sale = +$300 Net Cash</span>
            </span>
            <span className="rounded-full border border-emerald-400/35 bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-200">
              $2,500–$3,000+ Retail Deliverable Capacity Included
            </span>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            {ROI_STEPS.map((item) => (
              <div
                key={item.step}
                className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 sm:p-5"
              >
                <span className="inline-block rounded-md border border-amber-400/35 bg-amber-500/10 px-2.5 py-0.5 text-xs font-bold text-amber-200">
                  {item.step}
                </span>
                <h2 className="mt-2.5 text-base font-bold text-white">{item.title}</h2>
                <p className="mt-1.5 text-xs leading-relaxed text-gray-300 sm:text-sm">
                  {item.detail}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* 2-Column Offer + Included Stack */}
        <section className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
          {/* Left: Included Capabilities */}
          <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-900/75 p-6 lg:col-span-7 sm:p-8">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-300">
              <Briefcase className="h-4 w-4" />
              <span>Everything Included in Your Founding Operator Seat</span>
            </div>

            <div className="space-y-3.5 pt-1">
              {INCLUDED_PILLARS.map((pillar) => (
                <div
                  key={pillar.title}
                  className="rounded-xl border border-slate-800 bg-slate-950/75 p-4"
                >
                  <p className="flex items-start gap-2.5 text-sm font-bold text-white sm:text-base">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    <span>{pillar.title}</span>
                  </p>
                  <p className="mt-1.5 ps-6 text-xs leading-relaxed text-gray-300 sm:text-sm">
                    {pillar.detail}
                  </p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2">
              <div className="rounded-xl border border-cyan-500/25 bg-cyan-950/20 p-3.5 text-xs text-cyan-100/90">
                <p className="inline-flex items-center gap-1.5 font-bold text-cyan-300">
                  <Lock className="h-3.5 w-3.5" />
                  <span>Zero Model Training & EXIF Stripping</span>
                </p>
                <p className="mt-1 leading-relaxed">
                  Client family archives and corporate assets never train shared AI models and strip
                  GPS metadata automatically.
                </p>
              </div>
              <div className="rounded-xl border border-amber-500/25 bg-amber-950/20 p-3.5 text-xs text-amber-100/90">
                <p className="inline-flex items-center gap-1.5 font-bold text-amber-300">
                  <Handshake className="h-3.5 w-3.5" />
                  <span>100% Commercial Ownership</span>
                </p>
                <p className="mt-1 leading-relaxed">
                  You set your own retail pricing, invoice clients directly on your own Stripe or
                  checkout, and keep 100% of client revenue.
                </p>
              </div>
            </div>
          </div>

          {/* Right: 3-Path Action Card */}
          <div className="rounded-2xl border border-emerald-400/45 bg-gradient-to-b from-slate-900 via-slate-900 to-emerald-950/40 p-6 shadow-2xl lg:col-span-5 sm:p-8">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-200">
              <Sparkles className="h-3.5 w-3.5 text-emerald-300" />
              <span>Founding Charter · 25 Studios Max</span>
            </div>

            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-4xl font-extrabold tracking-tight text-white">
                ${offer.priceUsd}
              </span>
              <span className="text-sm font-medium text-gray-300">
                one-time · 90 days Pro + 18,000 cr
              </span>
            </div>
            <p className="mt-1 text-xs text-emerald-300">
              Saves $328 vs. 3 months of Pro ($447) + $180 in compute credits
            </p>

            {charterPlanConfigured ? (
              <div className="mt-6 space-y-3">
                <Button
                  size="lg"
                  onClick={() => triggerTierIntent('founding_operator')}
                  className="w-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 font-bold text-slate-950 hover:brightness-110"
                >
                  <span>Claim Founding Operator Charter ($299)</span>
                  <ArrowRight className="ms-2 h-4 w-4 shrink-0" />
                </Button>
                <p className="text-center text-[11px] text-gray-400">
                  Instant activation: unlocks White-Label Producer Wizard + 18,000 credits.
                </p>
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                <Button
                  size="lg"
                  onClick={() => triggerTierIntent('pro')}
                  className="w-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 font-bold text-slate-950 hover:brightness-110"
                >
                  <span>Start Solo Operator Pro Now ($149/mo)</span>
                  <ArrowRight className="ms-2 h-4 w-4 shrink-0" />
                </Button>

                <div className="rounded-xl border border-amber-400/30 bg-slate-950/80 p-3.5">
                  <p className="text-xs font-semibold text-amber-200">
                    Want the $299 90-Day Charter Bundle Invoice?
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-gray-300">
                    Enter your studio email to lock one of the 25 Founding Charter seats and receive
                    your direct $299 Launchpad checkout link:
                  </p>
                  {reserveSuccess ? (
                    <p className="mt-2 rounded-lg border border-emerald-500/30 bg-emerald-950/40 px-3 py-2 text-xs font-medium text-emerald-200">
                      Check your inbox to confirm your Founding Operator Charter reservation.
                    </p>
                  ) : (
                    <form onSubmit={handleReserveCharter} className="mt-2.5 flex gap-2">
                      <Input
                        type="email"
                        required
                        value={reserveEmail}
                        onChange={(e) => setReserveEmail(e.target.value)}
                        placeholder="you@yourstudio.com"
                        className="h-9 bg-slate-900 border-slate-700 text-xs text-white"
                      />
                      <Button
                        type="submit"
                        size="sm"
                        disabled={reserving}
                        className="shrink-0 bg-amber-400 font-semibold text-slate-950 hover:bg-amber-300"
                      >
                        {reserving ? 'Saving…' : 'Reserve'}
                      </Button>
                    </form>
                  )}
                  {reserveError && (
                    <p className="mt-1.5 text-[11px] text-rose-300">{reserveError}</p>
                  )}
                </div>
              </div>
            )}

            {/* Secondary Self-Serve Paths */}
            <div className="mt-6 space-y-2.5 border-t border-white/10 pt-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Or Choose Standard Self-Serve Access:
              </p>
              <button
                type="button"
                onClick={() => triggerTierIntent('explorer')}
                className="flex w-full items-center justify-between rounded-xl border border-slate-700/90 bg-slate-950/75 px-3.5 py-2.5 text-left text-xs text-gray-200 transition hover:border-cyan-400/50 hover:text-white cursor-pointer"
              >
                <span>
                  <strong className="text-white">Build Your Spec Sample First — $9 Explorer</strong>
                  <span className="block text-[11px] text-gray-400">
                    750 credits · Create a sample film before upgrading to White-Label Pro
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-cyan-300" />
              </button>

              {charterPlanConfigured && (
                <button
                  type="button"
                  onClick={() => triggerTierIntent('pro')}
                  className="flex w-full items-center justify-between rounded-xl border border-slate-700/90 bg-slate-950/75 px-3.5 py-2.5 text-left text-xs text-gray-200 transition hover:border-emerald-400/50 hover:text-white cursor-pointer"
                >
                  <span>
                    <strong className="text-white">Monthly Pro Operator — $149/mo</strong>
                    <span className="block text-[11px] text-gray-400">
                      15,000 credits/mo + 100% White-Label Client Portals · Cancel anytime
                    </span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-emerald-300" />
                </button>
              )}
            </div>

            <p className="mt-5 flex items-start gap-2 text-[11px] leading-relaxed text-gray-400">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
              <span>{MOR_FOOTER_LINE_FALLBACK}</span>
            </p>
          </div>
        </section>

        {/* Bottom FAQ / SaaS Clarity Note */}
        <section className="mt-12 rounded-2xl border border-white/10 bg-slate-900/50 p-6 text-xs leading-relaxed text-gray-300 sm:p-7 sm:text-sm">
          <div className="flex items-center gap-2 font-bold text-white">
            <BookOpenCheck className="h-4 w-4 text-emerald-300" />
            <span>How SceneFlow Powers Your Independent Video Business</span>
          </div>
          <p className="mt-2 text-gray-300">
            SceneFlow Studio is a self-serve multi-tenant AI software platform—never a competing
            agency. You own 100% of your client relationships, commercial master MP4s, and retail
            pricing, while SceneFlow automates your story intake, multi-age character continuity,
            voiced Pre-Vis animatics, 70+ language dubbing, and frame-accurate client approvals.
          </p>
        </section>
      </main>
    </div>
  )
}
