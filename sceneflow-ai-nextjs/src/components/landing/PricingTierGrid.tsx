'use client'

import { motion } from 'framer-motion'
import { ArrowRight, Check, Gift, HardDrive, Zap } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { getLandingPlans } from '@/lib/billing/tierCatalog'

const { explorer: explorerPlan, subscriptions: basePlans } = getLandingPlans()

export interface PricingTierGridProps {
  onSelectTier: (tierId: string) => void
  ctaLabel?: string
  explorerCtaLabel?: string
  disabled?: boolean
  loadingTier?: string | null
}

export function PricingTierGrid({
  onSelectTier,
  ctaLabel = 'Get Started',
  explorerCtaLabel = 'Start Test Flight',
  disabled = false,
  loadingTier = null,
}: PricingTierGridProps) {
  return (
    <div className="space-y-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md mx-auto"
      >
        <div className="relative rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-950/20 via-gray-900 to-gray-900 p-6 lg:p-8">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <div className="px-4 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-semibold flex items-center gap-1">
              <Gift className="w-3 h-3" />
              Production Test Flight
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pt-2">
            <div>
              <h3 className="text-xl font-bold text-white mb-1">{explorerPlan.name}</h3>
              <p className="text-sm text-gray-400">{explorerPlan.description}</p>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-3xl font-bold text-white">${explorerPlan.price}</div>
                <div className="text-sm text-amber-400">{explorerPlan.includedCredits} credits</div>
              </div>
              <Button
                onClick={() => onSelectTier('explorer')}
                disabled={disabled || loadingTier === 'explorer'}
                className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6"
              >
                {loadingTier === 'explorer' ? 'Loading...' : explorerCtaLabel}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-800">
            <div className="flex flex-wrap gap-3">
              {explorerPlan.features.slice(0, 4).map((feature, idx) => (
                <div key={idx} className="flex items-center gap-1.5 text-xs text-gray-400">
                  <Check className="w-3 h-3 text-amber-400" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
        {basePlans.map((plan, index) => (
          <motion.div
            key={plan.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.08 }}
            className={cn(
              'relative rounded-2xl border p-6 lg:p-8 flex flex-col',
              plan.popular
                ? 'border-emerald-500/50 bg-gradient-to-br from-emerald-950/30 via-gray-900 to-gray-900 shadow-2xl shadow-emerald-500/10'
                : 'border-gray-800 bg-gray-900/60'
            )}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <div className="px-4 py-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-semibold">
                  Most Popular
                </div>
              </div>
            )}

            <div className="mb-6">
              <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
              <p className="text-sm text-gray-400">{plan.description}</p>
            </div>

            <div className="mb-6">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-white">${plan.price}</span>
                <span className="text-gray-400">/month</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-700/50">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span className="text-xs text-gray-400">Credits/mo</span>
                </div>
                <div className="text-lg font-bold text-white">{plan.includedCredits.toLocaleString()}</div>
              </div>
              <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-700/50">
                <div className="flex items-center gap-2 mb-1">
                  <HardDrive className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs text-gray-400">Storage</span>
                </div>
                <div className="text-lg font-bold text-white">{plan.storage}</div>
              </div>
            </div>

            <div className="space-y-3 mb-8 flex-grow">
              {plan.features.map((feature, fIndex) => (
                <div key={fIndex} className="flex items-start gap-3">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-300">{feature}</span>
                </div>
              ))}
            </div>

            <Button
              onClick={() => onSelectTier(plan.id)}
              disabled={disabled || loadingTier === plan.id}
              className={cn(
                'w-full py-3 font-medium',
                plan.popular
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white'
                  : 'bg-gray-800 border border-gray-700 text-white hover:bg-gray-700'
              )}
            >
              {loadingTier === plan.id ? 'Loading...' : ctaLabel}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
