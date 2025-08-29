'use client'

import { motion } from 'framer-motion'
import { CreditCard, Zap, TrendingUp, Crown } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'

export function PlanAndCreditsWidget() {
  // Mock data - replace with real backend data
  const planData = {
    tier: 'Pro',
    monthlyCredits: 1000,
    availableCredits: 750,
    nextBilling: '2024-02-15',
    usagePercentage: 75
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.3 }}
      className="bg-gray-900/95 backdrop-blur-sm rounded-2xl border border-gray-700/50 shadow-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="p-6 border-b border-gray-700/50 bg-gradient-to-r from-gray-800/60 to-gray-700/40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
            <Crown className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Plan & Credits</h3>
            <p className="text-sm text-gray-400">Subscription & Usage</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Current Plan */}
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-purple-400" />
              <span className="text-sm font-medium text-gray-300">Current Plan</span>
            </div>
            <span className="text-xs text-purple-400 font-medium uppercase">{planData.tier}</span>
          </div>
          <div className="text-2xl font-bold text-white mb-1">{planData.monthlyCredits}</div>
          <div className="text-sm text-gray-400">credits/month</div>
          <div className="mt-3">
            <Link href="/dashboard/settings/billing">
              <Button variant="outline" size="sm" className="w-full border-purple-500/50 text-purple-300 hover:text-white hover:border-purple-400/70">
                Manage Plan
              </Button>
            </Link>
          </div>
        </div>

        {/* Available Credits */}
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-5 h-5 text-blue-400" />
            <span className="text-sm font-medium text-gray-300">Available Credits</span>
          </div>
          <div className="text-2xl font-bold text-white mb-2">{planData.availableCredits}</div>
          <div className="text-sm text-gray-400 mb-3">{planData.usagePercentage}% of monthly allocation</div>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-700 rounded-full h-2 mb-3">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${planData.usagePercentage}%` }}
            ></div>
          </div>
          
          <div className="mt-3">
            <Link href="/dashboard/settings/billing">
              <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                Manage Credits
              </Button>
            </Link>
          </div>
        </div>

        {/* Next Billing */}
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 text-green-400" />
            <span className="text-sm font-medium text-gray-300">Next Billing</span>
          </div>
          <div className="text-lg font-semibold text-white mb-1">{planData.nextBilling}</div>
          <div className="text-sm text-gray-400">Auto-renewal enabled</div>
        </div>
      </div>
    </motion.div>
  )
}
