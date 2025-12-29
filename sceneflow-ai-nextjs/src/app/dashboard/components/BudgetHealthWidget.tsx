'use client'

import { motion } from 'framer-motion'
import { CreditCard, TrendingUp, AlertTriangle, Lightbulb, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'
import { useState } from 'react'

interface BudgetHealthWidgetProps {
  availableCredits: number
  usedCredits: number
  monthlyCredits: number
  projectedRequired: number
  estimatedCostUSD?: number
  projectsNearLimit?: number
  subscriptionTier?: string
  addonCredits?: number
}

export function BudgetHealthWidget({
  availableCredits = 0,
  usedCredits = 0,
  monthlyCredits = 1000,
  projectedRequired = 0,
  estimatedCostUSD = 0,
  projectsNearLimit = 0,
  subscriptionTier,
  addonCredits = 0
}: BudgetHealthWidgetProps) {
  const [tipDismissed, setTipDismissed] = useState(false)
  
  const percentageUsed = Math.round((usedCredits / monthlyCredits) * 100)
  
  // Determine budget status
  const getBudgetStatus = () => {
    const totalRequired = usedCredits + projectedRequired
    if (totalRequired <= monthlyCredits * 0.75) return 'healthy'
    if (totalRequired <= monthlyCredits) return 'warning'
    return 'over'
  }
  
  const status = getBudgetStatus()
  
  const getProgressBarColor = () => {
    if (status === 'over') return 'bg-red-500'
    if (status === 'warning') return 'bg-yellow-500'
    return 'bg-indigo-600'
  }

  return (
    <div className="flex gap-4">
      {/* Main Budget Health Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="flex-1 bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-indigo-600/20 rounded-lg flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-indigo-400" />
          </div>
          <h2 className="text-xl font-semibold text-white">Budget Health</h2>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-4 mb-5">
          <div className="bg-gray-900/50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-white">{availableCredits.toLocaleString()}</div>
            <div className="text-xs text-gray-400">Available Credits</div>
          </div>
          <div className="bg-gray-900/50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-indigo-400">{usedCredits.toLocaleString()}</div>
            <div className="text-xs text-gray-400">Used ({percentageUsed}%)</div>
          </div>
          <div className="bg-gray-900/50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-orange-400">{projectedRequired.toLocaleString()}</div>
            <div className="text-xs text-gray-400">Projected Required</div>
          </div>
          <div className="bg-gray-900/50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-green-400">${estimatedCostUSD}</div>
            <div className="text-xs text-gray-400">Est. Cost</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="w-full bg-gray-700 rounded-full h-3">
            <div 
              className={`h-3 rounded-full transition-all duration-500 ${getProgressBarColor()}`}
              style={{ width: `${Math.min(percentageUsed, 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1 text-center">
            {percentageUsed}% of monthly budget used
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Link href="/dashboard/settings/billing" className="flex-1">
            <Button className="w-full bg-yellow-600 hover:bg-yellow-700 text-white">
              Buy Top-Up
            </Button>
          </Link>
          <Link href="/dashboard/settings/billing" className="flex-1">
            <Button variant="outline" className="w-full border-gray-600 text-gray-300 hover:text-white hover:border-gray-500">
              Manage Plan
            </Button>
          </Link>
          <Link href="/dashboard/settings/billing" className="flex-1" prefetch={false}>
            <Button variant="outline" className="w-full border-gray-600 text-gray-300 hover:text-white hover:border-gray-500">
              <TrendingUp className="w-4 h-4 mr-2" />
              Spending History
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* AI Tip Sidebar */}
      {!tipDismissed && projectsNearLimit > 0 && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="w-48 bg-indigo-900/30 border border-indigo-700/30 rounded-xl p-4 flex flex-col"
        >
          <div className="flex items-center justify-between mb-2">
            <Lightbulb className="w-5 h-5 text-indigo-400" />
            <button 
              onClick={() => setTipDismissed(true)}
              className="text-gray-500 hover:text-gray-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <h4 className="text-sm font-semibold text-indigo-300 mb-2">💡 AI TIP</h4>
          <p className="text-xs text-indigo-200 flex-1">
            You have {projectsNearLimit} projects nearing budget limit. Consider optimizing workflows or purchasing a top-up.
          </p>
          <Link href="/dashboard/settings/billing" className="mt-3" prefetch={false}>
            <Button size="sm" variant="outline" className="w-full text-xs border-indigo-600 text-indigo-300 hover:text-white">
              Details
            </Button>
          </Link>
        </motion.div>
      )}
    </div>
  )
}
