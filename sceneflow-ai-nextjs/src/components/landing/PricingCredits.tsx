'use client'

import { useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import {
  Sparkles,
  Clock,
  Users,
  Zap,
  Shield,
  Cloud,
  CheckCircle2,
  Film,
  Layers,
  Tv,
  Clapperboard,
  HardDrive,
  KeyRound,
  PlusCircle,
} from 'lucide-react'
import { getBillingUrl } from '@/lib/billing/billingUrls'
import { getSignupUrlForTier } from '@/lib/billing/checkoutIntent'
import { PricingTierGrid } from '@/components/landing/PricingTierGrid'
import { PRICING_LANDING_COPY } from '@/config/landing/pricingLandingCopy'

const SECTION_ID = 'pricing'

const TRUST_ICONS = [Cloud, Shield, CheckCircle2, Clock] as const
const PERSPECTIVE_ICONS = [Film, Layers, Tv, Clapperboard] as const

export function PricingCredits() {
  const t = useTranslations('pricing')
  const tFooter = useTranslations('footer')
  const { data: session } = useSession()

  const handlePlanClick = useCallback(
    (tierName: string) => {
      if (session?.user) {
        window.location.href = getBillingUrl({ tier: tierName, isAuthenticated: true })
        return
      }
      window.location.href = getSignupUrlForTier(tierName)
    },
    [session]
  )

  const trustBadges = (t.raw('trustBadges') as string[]) || PRICING_LANDING_COPY.trustBadges

  const rawPerspectives = t.has('filmmakerPerspectives')
    ? (t.raw('filmmakerPerspectives') as typeof PRICING_LANDING_COPY.filmmakerPerspectives)
    : PRICING_LANDING_COPY.filmmakerPerspectives
  const perspectives =
    rawPerspectives?.cards?.length ? rawPerspectives : PRICING_LANDING_COPY.filmmakerPerspectives

  const rawMembership = t.has('membershipModel')
    ? (t.raw('membershipModel') as typeof PRICING_LANDING_COPY.membershipModel)
    : PRICING_LANDING_COPY.membershipModel
  const membershipModel =
    rawMembership?.pillars?.length ? rawMembership : PRICING_LANDING_COPY.membershipModel

  const rawTopUps = t.has('creditTopUps')
    ? (t.raw('creditTopUps') as typeof PRICING_LANDING_COPY.creditTopUps)
    : PRICING_LANDING_COPY.creditTopUps
  const creditTopUps = rawTopUps?.packs?.length ? rawTopUps : PRICING_LANDING_COPY.creditTopUps

  const rawValueAnchor = t.has('valueAnchor')
    ? (t.raw('valueAnchor') as typeof PRICING_LANDING_COPY.valueAnchor)
    : PRICING_LANDING_COPY.valueAnchor
  const valueAnchor = rawValueAnchor?.traditionalCost
    ? rawValueAnchor
    : PRICING_LANDING_COPY.valueAnchor

  const rawByok = t.has('byok')
    ? (t.raw('byok') as typeof PRICING_LANDING_COPY.byok)
    : PRICING_LANDING_COPY.byok

  return (
    <section id={SECTION_ID} className="relative overflow-hidden scroll-mt-20 py-20 md:py-28">
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.08),transparent_50%)]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-6">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span className="text-sm font-medium text-indigo-300">{t('badge')}</span>
          </div>

          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
            {t('title')}
          </h2>

          <p className="text-lg text-gray-400 max-w-3xl mx-auto mb-4">{t('subtitle')}</p>
          <p className="text-sm text-indigo-300/80 max-w-2xl mx-auto mb-8">
            {t('explorerHighlight')}
          </p>

          {/* Value Anchor Strip */}
          <div className="inline-flex flex-wrap items-center justify-center gap-3 sm:gap-5 rounded-2xl border border-indigo-500/20 bg-slate-900/80 px-5 py-3 text-xs sm:text-sm">
            <div className="flex items-center gap-2 text-gray-400">
              <span className="line-through text-gray-500 font-semibold">
                {valueAnchor.traditionalCost}
              </span>
              <span>{valueAnchor.traditionalLabel}</span>
            </div>
            <span className="text-gray-600 font-medium">{valueAnchor.vs}</span>
            <div className="flex items-center gap-2 text-white">
              <span className="font-bold text-emerald-400">{valueAnchor.sceneFlowCost}</span>
              <span className="text-gray-300">{valueAnchor.sceneFlowLabel}</span>
            </div>
            <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-0.5 text-xs font-semibold text-emerald-300">
              {valueAnchor.saveBadge}
            </span>
          </div>
        </motion.div>

        {/* 4 Filmmaker Perspectives & Production Strategies */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-14"
        >
          <div className="text-center mb-8">
            <h3 className="text-xl md:text-2xl font-bold text-white mb-2">
              {perspectives.heading}
            </h3>
            <p className="text-sm md:text-base text-gray-400 max-w-3xl mx-auto">
              {perspectives.subheading}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {perspectives.cards.map((card, idx) => {
              const Icon = PERSPECTIVE_ICONS[idx] ?? Film
              return (
                <div
                  key={card.id || idx}
                  className="rounded-2xl border border-slate-800/90 bg-slate-900/60 p-5 flex flex-col justify-between hover:border-indigo-500/30 transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-indigo-400" />
                      </div>
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-300">
                        {card.badge}
                      </span>
                    </div>
                    <h4 className="text-base font-bold text-white mb-2 leading-snug">
                      {card.title}
                    </h4>
                    <p className="text-xs text-gray-400 leading-relaxed mb-4">
                      {card.description}
                    </p>
                  </div>
                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="text-gray-500">Recommended path</span>
                    <span className="font-semibold text-emerald-400">{card.recommendedPlan}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </motion.div>

        <div className="mb-14">
          <PricingTierGrid onSelectTier={handlePlanClick} />
        </div>

        {/* Studio Membership + Continuity Vault & Subscriber Add-On Packs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-14 rounded-2xl border border-slate-800 bg-slate-900/70 p-6 lg:p-8"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left: Membership & Continuity Vault Explanation */}
            <div className="lg:col-span-5 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-xs font-semibold text-cyan-300">
                <HardDrive className="w-3.5 h-3.5" />
                <span>{membershipModel.badge}</span>
              </div>
              <h3 className="text-xl font-bold text-white leading-snug">
                {membershipModel.title}
              </h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                {membershipModel.description}
              </p>
              <div className="space-y-3 pt-1">
                {membershipModel.pillars.map((pillar, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-slate-800 bg-slate-950/60 p-4"
                  >
                    <div className="text-sm font-semibold text-white mb-1">{pillar.title}</div>
                    <p className="text-xs text-gray-400 leading-relaxed">{pillar.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Subscriber Add-On Packs & BYOK */}
            <div className="lg:col-span-7 space-y-5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <PlusCircle className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-lg font-bold text-white">{creditTopUps.title}</h4>
                </div>
                <p className="text-xs sm:text-sm text-gray-400">{creditTopUps.subtitle}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                {creditTopUps.packs.map((pack, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-emerald-500/25 bg-gradient-to-br from-emerald-950/20 via-slate-950 to-slate-950 p-4 flex flex-col justify-between"
                  >
                    <div>
                      <div className="text-base font-bold text-white mb-1">{pack.label}</div>
                      {'credits' in pack && pack.credits && (
                        <div className="text-xs font-semibold text-emerald-400 mb-2">
                          {pack.credits}
                        </div>
                      )}
                      <p className="text-xs text-gray-400 leading-relaxed">{pack.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              {'subscriberNote' in creditTopUps && creditTopUps.subscriberNote && (
                <p className="text-xs text-amber-300/90 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3.5 py-2.5">
                  {creditTopUps.subscriberNote}
                </p>
              )}

              {/* BYOK Summary Card */}
              {rawByok?.title && (
                <div className="rounded-xl border border-indigo-500/25 bg-indigo-950/15 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-indigo-400" />
                      <span className="text-sm font-bold text-white">{rawByok.title}</span>
                      <span className="rounded-full bg-indigo-500/20 border border-indigo-500/30 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-300">
                        {rawByok.badge}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed">{rawByok.description}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12"
        >
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {trustBadges.map((badge, index) => {
              const Icon = TRUST_ICONS[index] ?? Shield
              return (
                <div
                  key={badge}
                  className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3"
                >
                  <Icon className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span className="text-sm text-gray-300">{badge}</span>
                </div>
              )
            })}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <div className="inline-flex flex-wrap justify-center gap-6 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span>{t('trust.cancelAnytime')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-400" />
              <span>{t('trust.moneyBack')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>{t('trust.creditsNeverExpire')}</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-6 max-w-md mx-auto">{tFooter('morLine')}</p>
        </motion.div>
      </div>
    </section>
  )
}

export default PricingCredits

