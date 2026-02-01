'use client'

import { motion } from 'framer-motion'
import { CreditCard, TrendingUp, Lightbulb, X, Zap } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'
import { useState } from 'react'
import { DashboardCard } from '@/components/dashboard/ui/DashboardCard'
import { StatCard, StatCardGrid } from '@/components/dashboard/ui/StatCard'

/**
 * BudgetHealthWidget - Refactored with Modular Card Architecture
 * 
 * 2026 Design Improvements:
 * - StatCard components with sparkline trends
 * - Grouped "Est. Cost" with "Projected Required"
 * - Changed "Buy Top-Up" from yellow (warning) to indigo (primary brand)
 * - Glassmorphism effect
 * - Better visual hierarchy
 */

interface BudgetHealthWidgetProps {
  availableCredits: number
  usedCredits: number
  monthlyCredits: number
  projectedRequired: number
  estimatedCostUSD?: number
  projectsNearLimit?: number
  subscriptionTier?: string
  addonCredits?: number
  /** Usage trend for sparkline (7 data points) */
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

  // Generate sparkline data if not provided
  const sparklineData = usageTrend.length > 0 
    ? usageTrend 
    : [0, usedCredits * 0.2, usedCredits * 0.4, usedCredits * 0.5, usedCredits * 0.7, usedCredits * 0.9, usedCredits]

  return (
    <div className="flex gap-4">
      {/* Main Budget Health Card */}
      <DashboardCard
        title="Budget Health"
        icon={<CreditCard className="w-5 h-5" />}
        iconColor="indigo"
        delay={2}
        className="flex-1"
        action={
          subscriptionTier && (
            <span className="text-xs text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded-md">
              {subscriptionTier}
            </span>
          )
        }
      >
        {/* Stats Grid - Z-Pattern: Most critical metrics left-to-right */}
        <StatCardGrid columns={4} className="mb-4">
          {/* Available Credits - Primary metric */}
          <StatCard
            value={availableCredits.toLocaleString()}
            label="Available Credits"
            status="neutral"
            sparkline={{
              values: sparklineData,
              color: 'indigo'
            }}
          />
          
          {/* Used Credits - With trend */}
          <StatCard
            value={usedCredits.toLocaleString()}
            label={`Used (${percentageUsed}%)`}
            status={status === 'critical' ? 'critical' : status === 'warning' ? 'warning' : 'healthy'}
            trend={{
              value: percentageUsed,
              direction: percentageUsed > 50 ? 'up' : 'neutral',
              comparison: 'of budget',
              upIsGood: false
            }}
          />
          
          {/* Projected Required + Est. Cost grouped */}
          <StatCard
            value={projectedRequired.toLocaleString()}
            label="Projected Required"
            status={projectedRequired > (monthlyCredits - usedCredits) ? 'warning' : 'neutral'}
          />
          
          {/* Est. Cost - Grouped visually with Projected */}
          <StatCard
            value={`$${estimatedCostUSD}`}
            label="Est. Cost"
            status="healthy"
            icon={<Zap className="w-3.5 h-3.5" />}
          />
        </StatCardGrid>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="w-full bg-gray-700/50 rounded-full h-2.5 overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(percentageUsed, 100)}%` }}
              transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
              className={`h-2.5 rounded-full ${getProgressBarColor()}`}
            />
          </div>
          <div className="flex justify-between mt-1.5">
            <p className="text-xs text-gray-500">
              {percentageUsed}% of monthly budget used
            </p>
            {addonCredits > 0 && (
              <p className="text-xs text-emerald-400">
                +{addonCredits.toLocaleString()} addon credits
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons - Changed from yellow to indigo gradient */}
        <div className="flex gap-3">
          <Link href="/dashboard/settings/billing" className="flex-1">
            <Button className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-md">
              Buy Top-Up
            </Button>
          </Link>
          <Link href="/dashboard/settings/billing" className="flex-1">
            <Button variant="outline" className="w-full border-gray-600 text-gray-300 hover:text-white hover:border-gray-500 hover:bg-gray-700/50">
              Manage Plan
            </Button>
          </Link>
          <Link href="/dashboard/settings/billing" className="flex-1" prefetch={false}>
            <Button variant="outline" className="w-full border-gray-600 text-gray-300 hover:text-white hover:border-gray-500 hover:bg-gray-700/50">
              <TrendingUp className="w-4 h-4 mr-2" />
              History
            </Button>
          </Link>
        </div>
      </DashboardCard>

      {/* AI Tip Sidebar */}
      {!tipDismissed && projectsNearLimit > 0 && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="w-44 bg-indigo-900/20 backdrop-blur-sm border border-indigo-700/30 rounded-xl p-4 flex flex-col"
        >
          <div className="flex items-center justify-between mb-2">
            <Lightbulb className="w-4 h-4 text-indigo-400" />
            <button 
              onClick={() => setTipDismissed(true)}
              className="text-gray-500 hover:text-gray-300 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <h4 className="text-xs font-semibold text-indigo-300 mb-2">💡 AI TIP</h4>
          <p className="text-[11px] text-indigo-200/80 flex-1 leading-relaxed">
            {projectsNearLimit} project{projectsNearLimit > 1 ? 's' : ''} nearing budget limit. Consider a top-up.
          </p>
          <Link href="/dashboard/settings/billing" className="mt-3" prefetch={false}>
            <Button size="sm" variant="outline" className="w-full text-xs border-indigo-600/50 text-indigo-300 hover:text-white hover:bg-indigo-600/20">
              Details
            </Button>
          </Link>
        </motion.div>
      )}
    </div>
  )
}
