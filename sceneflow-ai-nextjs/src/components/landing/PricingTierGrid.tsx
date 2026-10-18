'use client'

import { motion } from 'framer-motion'
import { ArrowRight, Check, Gift, HardDrive, Zap } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { getLandingPlans } from '@/lib/billing/tierCatalog'

const { explorer: explorerPlan, subscriptions: basePlans } = getLandingPlans()

export interface PricingTierGridProps {
  onSelectTier: (tierId: string) => void
  disabled?: boolean
  loadingTier?: string | null
}

export function PricingTierGrid({
  onSelectTier,
  disabled = false,
  loadingTier = null,
}: PricingTierGridProps) {
  const t = useTranslations('pricing.tierGrid')
  const tPlans = useTranslations('pricing.plans')

  const rawSubscriptions = (tPlans.raw('subscriptions') as Array<{
    id?: string
    name?: string
    description?: string
    features?: string[]
  }>) || []

  return (
    <div className="space-y-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto"
      >
        <div className="relative rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-950/20 via-gray-900 to-gray-900 p-6 lg:p-8">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <div className="px-4 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-semibold flex items-center gap-1 whitespace-nowrap">
              <Gift className="w-3 h-3" />
              {t('productionTestFlight')}
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pt-2">
            <div className="max-w-md">
              <h3 className="text-xl font-bold text-white mb-1">{tPlans('explorer.name')}</h3>
              <p className="text-sm text-gray-400">{tPlans('explorer.description')}</p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 shrink-0">
              <div className="text-left sm:text-right">
                <div className="text-3xl font-bold text-white">${explorerPlan.price}</div>
                <div className="text-sm text-amber-400">
                  {explorerPlan.includedCredits} {t('creditsPerMonth').replace('/mo', '')}
                </div>
              </div>
              <Button
                onClick={() => onSelectTier('explorer')}
                disabled={disabled || loadingTier === 'explorer'}
                className="w-full sm:w-auto justify-center bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6"
              >
                {loadingTier === 'explorer' ? t('loading') : t('startTestFlight')}
                <ArrowRight className="w-4 h-4 ml-2 shrink-0" />
              </Button>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-800">
            <div className="flex flex-wrap gap-3">
              {(tPlans.raw('explorer.features') as string[]).slice(0, 4).map((feature, idx) => (
                <div key={idx} className="flex items-center gap-1.5 text-xs text-gray-400">
                  <Check className="w-3 h-3 text-amber-400 shrink-0" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {basePlans.map((plan, index) => {
          const localizedPlan = rawSubscriptions.find((item) => item?.id === plan.id)
          const planName = localizedPlan?.name || plan.name
          const planDescription = localizedPlan?.description || plan.description
          const planFeatures =
            Array.isArray(localizedPlan?.features) && localizedPlan.features.length > 0
              ? localizedPlan.features
              : plan.features

          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.08 }}
              className={cn(
                'relative rounded-2xl border p-6 flex flex-col',
                plan.popular
                  ? 'border-emerald-500/50 bg-gradient-to-br from-emerald-950/30 via-gray-900 to-gray-900 shadow-2xl shadow-emerald-500/10'
                  : 'border-gray-800 bg-gray-900/60'
              )}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <div className="px-4 py-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-semibold whitespace-nowrap">
                    {t('mostPopular')}
                  </div>
                </div>
              )}

              <div className="mb-5">
                <h3 className="text-lg font-bold text-white mb-1.5">{planName}</h3>
                <p className="text-xs text-gray-400 leading-relaxed min-h-[3.25rem]">
                  {planDescription}
                </p>
              </div>

              <div className="mb-5">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-4xl font-bold text-white">${plan.price}</span>
                  <span className="text-sm text-gray-400">{t('perMonth')}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 mb-5">
                <div className="p-2.5 rounded-lg bg-gray-800/50 border border-gray-700/50">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="text-[11px] text-gray-400 truncate">{t('creditsPerMonth')}</span>
                  </div>
                  <div className="text-base font-bold text-white">
                    {plan.includedCredits.toLocaleString()}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-gray-800/50 border border-gray-700/50">
                  <div className="flex items-center gap-1.5 mb-1">
                    <HardDrive className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span className="text-[11px] text-gray-400 truncate">{t('storage')}</span>
                  </div>
                  <div className="text-base font-bold text-white">{plan.storage}</div>
                </div>
              </div>

              <div className="space-y-2.5 mb-6 flex-grow">
                {planFeatures.map((feature, fIndex) => (
                  <div key={fIndex} className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="text-xs text-gray-300 leading-snug">{feature}</span>
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
                {loadingTier === plan.id ? t('loading') : t('getStarted')}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
