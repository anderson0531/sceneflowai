'use client'

import { useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import { Sparkles, Clock, Users, Zap, Shield, Cloud, CheckCircle2 } from 'lucide-react'
import { getBillingUrl } from '@/lib/billing/billingUrls'
import { getSignupUrlForTier } from '@/lib/billing/checkoutIntent'
import { PricingTierGrid } from '@/components/landing/PricingTierGrid'

const SECTION_ID = 'pricing'

const TRUST_ICONS = [Cloud, Shield, CheckCircle2, Clock] as const

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

  const trustBadges = t.raw('trustBadges') as string[]

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

          <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-4">{t('subtitle')}</p>
          <p className="text-sm text-indigo-300/80 max-w-xl mx-auto">{t('explorerHighlight')}</p>
        </motion.div>

        <div className="mb-14">
          <PricingTierGrid onSelectTier={handlePlanClick} />
        </div>

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
