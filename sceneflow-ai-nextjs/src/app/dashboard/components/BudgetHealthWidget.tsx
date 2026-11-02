'use client'

import { motion } from 'framer-motion'
import { CreditCard, Key, Lightbulb, X, Zap } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'
import { useState } from 'react'
import { DashboardCard } from '@/components/dashboard/ui/DashboardCard'
import { StatCard, StatCardGrid } from '@/components/dashboard/ui/StatCard'

interface BudgetHealthWidgetProps {
  availableCredits: number
  usedCredits: number
  monthlyCredits: number
  projectedRequired: number
  estimatedCostUSD?: number
  projectsNearLimit?: number
  subscriptionTier?: string
  addonCredits?: number
  /** Optional real usage trend for sparkline (at least 2 data points) */
  usageTrend?: number[]
}

export function BudgetHealthWidget({
  availableCredits = 0,
  usedCredits = 0,
  monthlyCredits = 1000,
  projectedRequired = 0,
  estimatedCostUSD = 0,
  projectsNearLimit = 0,
  subscriptionTier,
  addonCredits = 0,
  usageTrend = []
}: BudgetHealthWidgetProps) {
  const [tipDismissed, setTipDismissed] = useState(false)
  
  const percentageUsed = monthlyCredits > 0 
    ? Math.round((usedCredits / monthlyCredits) * 100) 
    : 0
  
  // Determine budget status
  const getBudgetStatus = (): 'healthy' | 'warning' | 'critical' => {
    const totalRequired = usedCredits + projectedRequired
    if (totalRequired <= monthlyCredits * 0.75) return 'healthy'
    if (totalRequired <= monthlyCredits) return 'warning'
    return 'critical'
  }
  
  const status = getBudgetStatus()
  
  const getProgressBarColor = () => {
    if (status === 'critical') return 'bg-red-500'
    if (status === 'warning') return 'bg-amber-500'
    return 'bg-indigo-500'
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      {/* Main Budget Health Card */}
      <DashboardCard
        title="Budget & Credit Forecast"
        subtitle="Monthly allowance, active burn, and estimated credits to finish active productions"
        icon={<CreditCard className="w-5 h-5" />}
        iconColor="indigo"
        delay={2}
        compact
        className="flex-1"
        action={
          <div className="flex items-center gap-2">
            <Link href="/dashboard/settings/byok">
              <Button
                variant="outline"
                size="sm"
                className="border-gray-600 text-gray-300 hover:text-white hover:border-gray-500 hover:bg-gray-700/50 text-xs"
              >
                <Key className="w-3.5 h-3.5 mr-1.5 text-cyan-400" />
                BYOK Keys
              </Button>
            </Link>
            <Link href="/dashboard/settings/billing">
              <Button
                size="sm"
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-md text-xs"
              >
                Manage Plan & Top-Up
              </Button>
            </Link>
          </div>
        }
      >
        <StatCardGrid columns={4} className="mb-3">
          <StatCard
            value={availableCredits.toLocaleString()}
            label="Available Credits"
            status={
              availableCredits < 100
                ? 'critical'
                : availableCredits < 500
                  ? 'warning'
                  : 'neutral'
            }
            compact
            sparkline={
              usageTrend.length >= 2
                ? {
                    values: usageTrend,
                    color: 'indigo',
                  }
                : undefined
            }
          />
          
          <StatCard
            value={usedCredits.toLocaleString()}
            label={`Monthly Used (${percentageUsed}%)`}
            status={status === 'critical' ? 'critical' : status === 'warning' ? 'warning' : 'healthy'}
            compact
          />
          
          <StatCard
            value={projectedRequired.toLocaleString()}
            label="Est. Credits to Finish"
            status={projectedRequired > availableCredits ? 'warning' : 'neutral'}
            compact
          />
          
          <StatCard
            value={`$${estimatedCostUSD}`}
            label="Est. Pipeline Value"
            status="healthy"
            compact
            icon={<Zap className="w-3.5 h-3.5" />}
          />
        </StatCardGrid>

        {/* Progress Bar */}
        <div>
          <div className="w-full bg-gray-700/50 rounded-full h-2 overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(percentageUsed, 100)}%` }}
              transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
              className={`h-2 rounded-full ${getProgressBarColor()}`}
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 mt-1.5">
            <p className="text-xs text-gray-400">
              {percentageUsed}% of monthly allowance used
              {subscriptionTier ? ` (${subscriptionTier})` : ''}
            </p>
            {addonCredits > 0 && (
              <p className="text-xs text-emerald-400 font-medium">
                +{addonCredits.toLocaleString()} top-up vault credits
              </p>
            )}
          </div>
        </div>
      </DashboardCard>

      {/* AI Tip Sidebar */}
      {!tipDismissed && projectsNearLimit > 0 && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="lg:w-56 bg-indigo-900/20 backdrop-blur-sm border border-indigo-700/30 rounded-xl p-4 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-300">
                <Lightbulb className="w-3.5 h-3.5 text-indigo-400" />
                Budget Advisory
              </span>
              <button 
                onClick={() => setTipDismissed(true)}
                className="text-gray-500 hover:text-gray-300 transition-colors"
                aria-label="Dismiss budget tip"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-xs text-indigo-200/80 leading-relaxed">
              {projectsNearLimit} active project{projectsNearLimit > 1 ? 's are' : ' is'} above 75% of target budget.
            </p>
          </div>
          <Link href="/dashboard/settings/billing" className="mt-3" prefetch={false}>
            <Button size="sm" variant="outline" className="w-full text-xs border-indigo-600/50 text-indigo-300 hover:text-white hover:bg-indigo-600/20">
              Review Credits
            </Button>
          </Link>
        </motion.div>
      )}
    </div>
  )
}
