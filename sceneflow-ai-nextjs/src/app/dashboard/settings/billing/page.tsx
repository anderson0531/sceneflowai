'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { motion } from 'framer-motion'
import { CreditCard, Zap, TrendingUp, Crown, ExternalLink, Loader } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'

export default function BillingPage() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)
  const [subscription, setSubscription] = useState<any>(null)
  const [credits, setCredits] = useState<any>(null)

  useEffect(() => {
    if (session?.user) {
      fetchSubscriptionData()
    }
  }, [session])

  const fetchSubscriptionData = async () => {
    try {
      setLoading(true)
      // Fetch subscription status
      const subResponse = await fetch('/api/subscription/status')
      if (subResponse.ok) {
        const subData = await subResponse.json()
        setSubscription(subData)
      }

      // Fetch credits info
      // Credits info would come from user store or API
      setCredits({
        total: 0,
        subscription: 0,
        addon: 0,
      })
    } catch (error) {
      console.error('Failed to fetch subscription data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader className="w-8 h-8 animate-spin text-sf-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="bg-dark-card border-dark-border text-white">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <Crown className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <CardTitle className="text-xl font-semibold">Current Plan</CardTitle>
                <CardDescription className="text-gray-400">
                  Your active subscription and billing information
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-purple-900/20 to-purple-800/10 p-5 rounded-xl border-2 border-purple-500/40">
                <div className="text-center mb-4">
                  <div className="text-2xl font-bold text-purple-300 mb-1 capitalize">
                    {subscription?.tier?.display_name || 'Free'}
                  </div>
                  <div className="text-purple-200 text-sm">Active Plan</div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-purple-100">
                    <span>Monthly Price:</span>
                    <span className="font-semibold">
                      ${subscription?.tier?.monthly_price_usd || 0}/mo
                    </span>
                  </div>
                  <div className="flex justify-between text-purple-100">
                    <span>Status:</span>
                    <span className="font-semibold capitalize">
                      {subscription?.status || 'Active'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-900/20 to-blue-800/10 p-5 rounded-xl border-2 border-blue-500/40">
                <div className="flex items-center gap-3 mb-4">
                  <Zap className="w-5 h-5 text-blue-400" />
                  <h3 className="text-lg font-semibold text-white">Credits</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-blue-100">
                    <span>Available:</span>
                    <span className="font-semibold">{credits?.total || 0}</span>
                  </div>
                  <div className="flex justify-between text-blue-100">
                    <span>Subscription:</span>
                    <span className="font-semibold">{credits?.subscription || 0}</span>
                  </div>
                  <div className="flex justify-between text-blue-100">
                    <span>Add-on:</span>
                    <span className="font-semibold">{credits?.addon || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Billing Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Card className="bg-dark-card border-dark-border text-white">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-sf-primary/20 rounded-lg flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-sf-primary" />
              </div>
              <div>
                <CardTitle className="text-xl font-semibold">Billing & Subscription</CardTitle>
                <CardDescription className="text-gray-400">
                  Manage your subscription and payment methods
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-dark-bg rounded-lg border border-dark-border">
                <div>
                  <h4 className="text-white font-semibold">Upgrade Plan</h4>
                  <p className="text-gray-400 text-sm">Get more credits and features</p>
                </div>
                <Link href="/pricing">
                  <Button className="bg-sf-primary hover:bg-sf-accent text-white flex items-center gap-2">
                    View Plans
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </Link>
              </div>

              <div className="flex items-center justify-between p-4 bg-dark-bg rounded-lg border border-dark-border">
                <div>
                  <h4 className="text-white font-semibold">Manage Credits</h4>
                  <p className="text-gray-400 text-sm">Purchase additional credits</p>
                </div>
                <Link href="/pricing">
                  <Button variant="outline" className="border-dark-border text-dark-text hover:bg-dark-bg flex items-center gap-2">
                    Buy Credits
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

