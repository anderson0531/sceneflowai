'use client'

import { motion } from 'framer-motion'
import { CreditCard, Zap, TrendingUp, Crown } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'

export function PlanAndCreditsWidget() {
  // Mock Data (Professional Plan)
  const planName = "Professional";
  const monthlyCredits = 7500;
  const usedCredits = 2100;
  const topUpCreditsAvailable = 500;
  
  // Total available includes remaining monthly + top-ups
  const availableCredits = (monthlyCredits - usedCredits) + topUpCreditsAvailable;
  // Percentage calculation based on monthly usage only
  const percentageUsed = (usedCredits / monthlyCredits) * 100;
  
  // Estimated credits required for active projects
  const estimatedCreditsRequired = 3200; // Mock data for active projects

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.3 }}
      className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700"
    >
      <h2 className="text-xl font-semibold mb-4 text-white">Plan & Credits</h2>
      
      <p className="text-sm mb-4 text-gray-300">Tier: <span className="font-bold text-indigo-400">{planName}</span></p>

      <div className="mb-5 p-4 bg-gray-900/50 rounded-lg">
        <div className="flex items-baseline">
            <span className="text-4xl font-bold text-white">{availableCredits.toLocaleString()}</span>
            <span className="text-sm text-gray-400 ml-2">Total Available</span>
        </div>

        {/* Progress Bar for Monthly Usage */}
        <div className="w-full bg-gray-700 rounded-full h-2.5 mt-3">
            <div className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${percentageUsed}%` }}></div>
        </div>
        <p className="text-xs text-gray-500 mt-1">{usedCredits.toLocaleString()} / {monthlyCredits.toLocaleString()} monthly credits used.</p>
      </div>

      {/* Estimated Credits Required for Active Projects with Action Buttons */}
      <div className="mb-5 p-4 bg-orange-900/20 border border-orange-700/30 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-baseline">
              <span className="text-2xl font-bold text-orange-400">{estimatedCreditsRequired.toLocaleString()}</span>
              <span className="text-sm text-gray-400 ml-2">Estimated Credits Required</span>
            </div>
            <p className="text-xs text-orange-300 mt-1">Required to complete active projects</p>
          </div>
          
          {/* Action Buttons - Same Row */}
          <div className="flex gap-3">
            <Link href="/dashboard/settings/billing">
              <Button className="bg-yellow-600 hover:bg-yellow-700 text-white py-2 px-4 rounded-lg font-semibold">
                Buy Top-Up
              </Button>
            </Link>
            <Link href="/dashboard/settings/billing">
              <Button variant="outline" className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg border-gray-600 text-gray-300 hover:text-white hover:border-gray-500">
                Manage Plan
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
