'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { CreditCard, Zap } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'
import { mapSubscriptionStatus } from '@/lib/billing/mapSubscriptionStatus'

export function PlanAndCreditsWidget() {
  const [loading, setLoading] = useState(true)
  const [planName, setPlanName] = useState('Free')
  const [availableCredits, setAvailableCredits] = useState(0)
  const [subscriptionCredits, setSubscriptionCredits] = useState(0)
  const [addonCredits, setAddonCredits] = useState(0)

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      try {
        const response = await fetch('/api/subscription/status')
        if (!response.ok) return
        const data = await response.json()
        if (cancelled) return
        const mapped = mapSubscriptionStatus(data)
        setPlanName(mapped.subscription.tier?.display_name || 'Free')
        setAvailableCredits(mapped.credits.total)
        setSubscriptionCredits(mapped.credits.subscription)
        setAddonCredits(mapped.credits.addon)
      } catch (error) {
        console.error('[PlanAndCreditsWidget] Failed to load subscription:', error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  const monthlyPool = Math.max(subscriptionCredits, 1)
  const percentageUsed = Math.max(
    0,
    Math.min(100, ((monthlyPool - subscriptionCredits) / monthlyPool) * 100)
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.3 }}
      className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700"
    >
      <h2 className="text-xl font-semibold mb-4 text-white flex items-center gap-2">
        <CreditCard className="w-5 h-5 text-indigo-400" />
        Plan & Credits
      </h2>

      <p className="text-sm mb-4 text-gray-300">
        Tier:{' '}
        <span className="font-bold text-indigo-400">
          {loading ? '…' : planName}
        </span>
      </p>

      <div className="mb-5 p-4 bg-gray-900/50 rounded-lg">
        <div className="flex items-baseline">
          <span className="text-4xl font-bold text-white">
            {loading ? '…' : availableCredits.toLocaleString()}
          </span>
          <span className="text-sm text-gray-400 ml-2">Total Available</span>
        </div>

        <div className="w-full bg-gray-700 rounded-full h-2.5 mt-3">
          <div
            className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300"
            style={{ width: `${100 - percentageUsed}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {subscriptionCredits.toLocaleString()} subscription + {addonCredits.toLocaleString()} add-on credits
        </p>
      </div>

      <div className="flex gap-3">
        <Link href="/dashboard/settings/billing?checkoutTier=explorer" className="flex-1">
          <Button className="w-full bg-yellow-600 hover:bg-yellow-700 text-white py-2 px-4 rounded-lg font-semibold">
            <Zap className="w-4 h-4 mr-2 inline" />
            Buy Explorer
          </Button>
        </Link>
        <Link href="/dashboard/settings/billing" className="flex-1">
          <Button
            variant="outline"
            className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg border-gray-600"
          >
            Manage Plan
          </Button>
        </Link>
      </div>
    </motion.div>
  )
}
