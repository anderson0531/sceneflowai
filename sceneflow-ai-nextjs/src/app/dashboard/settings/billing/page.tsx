'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { CreditCard, Zap, TrendingUp, Crown, ExternalLink, Loader, CheckCircle, AlertCircle, Beaker, ArrowRight, Mic } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { toast } from 'sonner'
import { WhopCheckoutModal } from '@/components/billing/WhopCheckoutModal'
import { useWhopCheckout } from '@/hooks/useWhopCheckout'
import { MOR_FOOTER_LINE } from '@/config/landing/valuePropCopy'
import {
  mapSubscriptionStatus,
  type MappedSubscriptionData,
} from '@/lib/billing/mapSubscriptionStatus'
import { getCheckoutPlans, hasPurchasedExplorer } from '@/lib/billing/tierCatalog'

const CHECKOUT_PLANS = getCheckoutPlans()

interface TierInfo {
  name: string
  display_name: string
  monthly_price_usd: number
  included_credits_monthly: number
  storage_gb: number
  features: string[]
  hasVoiceCloning: boolean
  voiceCloneSlots: number
}

interface SubscriptionData extends MappedSubscriptionData {}

interface TestModeData {
  testModeEnabled: boolean
  currentSubscription: {
    tier: { id: string; name: string; display_name: string } | null
    status: string | null
    credits: { subscription: number; addon: number; total: number }
  }
  availableTiers: TierInfo[]
}

export default function BillingPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null)
  const [testMode, setTestMode] = useState<TestModeData | null>(null)
  const [switchingPlan, setSwitchingPlan] = useState<string | null>(null)
  const [activatingPlan, setActivatingPlan] = useState(false)
  const [activationTimedOut, setActivationTimedOut] = useState(false)
  const checkoutStartedRef = useRef(false)
  const activationPollStartedRef = useRef(false)
  const { loading: checkoutLoading, checkout, startCheckout, closeCheckout } = useWhopCheckout()

  const fetchSubscriptionData = useCallback(async (): Promise<SubscriptionData | null> => {
    try {
      setFetchError(null)
      const subResponse = await fetch('/api/subscription/status')
      if (subResponse.ok) {
        const subData = await subResponse.json()
        const mapped = mapSubscriptionStatus(subData)
        setSubscription(mapped)
        return mapped
      }

      setFetchError('Failed to load subscription data')
      return null
    } catch (error) {
      console.error('Failed to fetch subscription data:', error)
      setFetchError('Failed to load subscription data')
      return null
    }
  }, [])

  const loadBillingPage = useCallback(async () => {
    try {
      setLoading(true)
      await fetchSubscriptionData()

      try {
        const testResponse = await fetch('/api/admin/test/switch-plan')
        if (testResponse.ok) {
          const testData = await testResponse.json()
          setTestMode(testData)
        }
      } catch {
        // Test mode not available
      }
    } finally {
      setLoading(false)
    }
  }, [fetchSubscriptionData])

  const pollForActivation = useCallback(
    async (baseline: SubscriptionData | null) => {
      setActivatingPlan(true)
      setActivationTimedOut(false)

      const baselineCredits = baseline?.credits.total ?? 0
      const baselineTier = baseline?.subscription?.tier?.name ?? null

      for (let attempt = 0; attempt < 20; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 3000))
        const latest = await fetchSubscriptionData()
        if (!latest) continue

        const creditsChanged = latest.credits.total > baselineCredits
        const tierChanged =
          Boolean(latest.subscription?.tier?.name) &&
          latest.subscription?.tier?.name !== baselineTier
        const explorerPurchased =
          hasPurchasedExplorer(latest.oneTimeTiersPurchased) &&
          !hasPurchasedExplorer(baseline?.oneTimeTiersPurchased)

        if (creditsChanged || tierChanged || explorerPurchased) {
          setActivatingPlan(false)
          toast.success('Your plan is active and credits are ready!')
          return
        }
      }

      setActivatingPlan(false)
      setActivationTimedOut(true)
      toast.message('Payment received — activation is still processing. Refresh in a moment or contact support if credits do not appear.')
    },
    [fetchSubscriptionData]
  )

  const handleCheckoutComplete = useCallback(async () => {
    closeCheckout()
    const baseline = await fetchSubscriptionData()
    await pollForActivation(baseline)
  }, [closeCheckout, fetchSubscriptionData, pollForActivation])

  useEffect(() => {
    if (session?.user) {
      loadBillingPage()
    }
  }, [session, loadBillingPage])

  useEffect(() => {
    if (typeof window === 'undefined' || !session?.user) return

    const params = new URLSearchParams(window.location.search)
    const checkoutStatus = params.get('checkout')
    const checkoutTier = params.get('checkoutTier')

    if (checkoutStatus === 'success' && !activationPollStartedRef.current) {
      activationPollStartedRef.current = true
      void (async () => {
        const baseline = await fetchSubscriptionData()
        await pollForActivation(baseline)
      })()
    } else if (checkoutStatus === 'error' || checkoutStatus === 'cancel') {
      toast.error('Checkout was cancelled or failed. Please try again.')
    }

    if (checkoutTier && !checkoutStartedRef.current) {
      checkoutStartedRef.current = true
      startCheckout(checkoutTier)
    }

    if (checkoutStatus || checkoutTier) {
      router.replace('/dashboard/settings/billing', { scroll: false })
    }
  }, [session, startCheckout, router, pollForActivation, fetchSubscriptionData])

  const handleSwitchPlan = async (tierName: string) => {
    if (switchingPlan) return
    
    setSwitchingPlan(tierName)
    try {
      console.log('[Billing] Switching to plan:', tierName)
      const response = await fetch('/api/admin/test/switch-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tierName, grantCredits: true }),
      })
      
      const data = await response.json()
      console.log('[Billing] Switch plan response:', response.status, data)
      
      if (response.ok && data.success) {
        toast.success(`Switched to ${data.newTier.display_name} plan!`)
        // Refresh subscription data
        await fetchSubscriptionData()
      } else {
        console.error('[Billing] Switch plan failed:', data)
        toast.error(data.details || data.error || 'Failed to switch plan')
      }
    } catch (error) {
      console.error('[Billing] Switch plan error:', error)
      toast.error('Failed to switch plan')
    } finally {
      setSwitchingPlan(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader className="w-8 h-8 animate-spin text-sf-primary" />
      </div>
    )
  }

  const currentTierName = subscription?.subscription?.tier?.name || testMode?.currentSubscription?.tier?.name
  const isTestMode = Boolean(testMode?.testModeEnabled)
  const explorerPurchased = hasPurchasedExplorer(subscription?.oneTimeTiersPurchased)

  return (
    <div className="space-y-6">
      {activatingPlan && (
        <div className="flex items-center gap-3 p-4 rounded-lg border border-blue-500/30 bg-blue-900/20 text-blue-100">
          <Loader className="w-5 h-5 animate-spin text-blue-400" />
          <span>Activating your plan… credits will appear shortly.</span>
        </div>
      )}
      {activationTimedOut && (
        <div className="flex items-start gap-3 p-4 rounded-lg border border-amber-500/30 bg-amber-900/20 text-amber-100 text-sm">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <span>
            Payment received but activation is still processing. Refresh this page in a minute, or contact support if your credits do not appear.
          </span>
        </div>
      )}
      {fetchError && (
        <div className="flex items-start gap-3 p-4 rounded-lg border border-red-500/30 bg-red-900/20 text-red-100 text-sm">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <span>{fetchError}</span>
        </div>
      )}
      <WhopCheckoutModal
        isOpen={Boolean(checkout)}
        sessionId={checkout?.sessionId || ''}
        returnUrl={checkout?.returnUrl || ''}
        userEmail={session?.user?.email}
        onClose={closeCheckout}
        onComplete={handleCheckoutComplete}
      />
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
                    {subscription?.subscription?.tier?.display_name || testMode?.currentSubscription?.tier?.display_name || 'Free'}
                  </div>
                  <div className="text-purple-200 text-sm">Active Plan</div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-purple-100">
                    <span>Monthly Price:</span>
                    <span className="font-semibold">
                      ${subscription?.subscription?.tier?.monthly_price_usd || 0}/mo
                    </span>
                  </div>
                  <div className="flex justify-between text-purple-100">
                    <span>Status:</span>
                    <span className="font-semibold capitalize flex items-center gap-1">
                      {subscription?.subscription?.status === 'active' && (
                        <CheckCircle className="w-3 h-3 text-green-400" />
                      )}
                      {subscription?.subscription?.status || 'Inactive'}
                    </span>
                  </div>
                  <div className="flex justify-between text-purple-100">
                    <span>Monthly Credits:</span>
                    <span className="font-semibold">
                      {subscription?.subscription?.tier?.included_credits_monthly?.toLocaleString() || 0}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-900/20 to-blue-800/10 p-5 rounded-xl border-2 border-blue-500/40">
                <div className="flex items-center gap-3 mb-4">
                  <Zap className="w-5 h-5 text-blue-400" />
                  <h3 className="text-lg font-semibold text-white">Credits Balance</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-blue-100">
                    <span>Total Available:</span>
                    <span className="font-semibold text-lg">{subscription?.credits?.total?.toLocaleString() || testMode?.currentSubscription?.credits?.total?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between text-blue-100">
                    <span>Subscription Credits:</span>
                    <span className="font-semibold">{subscription?.credits?.subscription?.toLocaleString() || testMode?.currentSubscription?.credits?.subscription?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between text-blue-100">
                    <span>Add-on Credits:</span>
                    <span className="font-semibold">{subscription?.credits?.addon?.toLocaleString() || testMode?.currentSubscription?.credits?.addon?.toLocaleString() || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Available Plans — Whop Checkout */}
      {!isTestMode && (
        <motion.div
          id="checkout-plans"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
        >
          <Card className="bg-dark-card border-dark-border text-white">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-sf-primary/20 rounded-lg flex items-center justify-center">
                  <Crown className="w-5 h-5 text-sf-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl font-semibold">Choose a Plan</CardTitle>
                  <CardDescription className="text-gray-400">
                    Subscribe or purchase Explorer to unlock credits
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {CHECKOUT_PLANS.map((plan) => {
                  const isCurrent = currentTierName === plan.name
                  const isExplorerOwned = plan.name === 'explorer' && explorerPurchased
                  const isLoading = checkoutLoading === plan.name

                  return (
                    <div
                      key={plan.name}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        isCurrent || isExplorerOwned
                          ? 'border-green-500/60 bg-green-900/20'
                          : 'border-dark-border bg-dark-bg hover:border-sf-primary/40'
                      }`}
                    >
                      <div className="text-center mb-3">
                        <div className="text-lg font-bold text-white">{plan.displayName}</div>
                        <div className="text-2xl font-bold text-sf-primary">
                          ${plan.price}
                          <span className="text-sm text-gray-400">
                            {plan.isOneTime ? ' once' : '/mo'}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {plan.credits.toLocaleString()} credits{plan.isOneTime ? '' : '/mo'}
                        </div>
                        {plan.isOneTime && (
                          <div className="text-[10px] text-gray-500 mt-1">
                            Add-on credits only — does not unlock Pro features
                          </div>
                        )}
                      </div>

                      {isCurrent ? (
                        <Button disabled className="w-full bg-green-600/20 text-green-400 border border-green-500/30">
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Current
                        </Button>
                      ) : isExplorerOwned ? (
                        <Button disabled className="w-full bg-green-600/20 text-green-400 border border-green-500/30">
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Purchased
                        </Button>
                      ) : (
                        <Button
                          onClick={() => startCheckout(plan.name)}
                          disabled={Boolean(checkoutLoading)}
                          className="w-full bg-sf-primary hover:bg-sf-accent text-white"
                        >
                          {isLoading ? (
                            <Loader className="w-4 h-4 animate-spin" />
                          ) : plan.isOneTime ? (
                            'Buy Explorer'
                          ) : (
                            <>Subscribe <ArrowRight className="w-3 h-3 ml-1" /></>
                          )}
                        </Button>
                      )}
                    </div>
                  )
                })}
              </div>
              <p className="text-xs text-gray-500 mt-4 text-center">{MOR_FOOTER_LINE}</p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Test Plan Switcher (Development/Testing) */}
      {isTestMode && testMode?.availableTiers && (
        <motion.div
          id="test-plan-switcher"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
        >
          <Card className="bg-dark-card border-amber-500/30 text-white">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
                  <Beaker className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <CardTitle className="text-xl font-semibold flex items-center gap-2">
                    Test Mode: Switch Plans
                    <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">DEV</span>
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Switch plans instantly for testing (no payment required)
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {testMode.availableTiers.map((tier) => {
                  const isCurrentPlan = tier.name === currentTierName
                  const isLoading = switchingPlan === tier.name
                  
                  return (
                    <div
                      key={tier.name}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        isCurrentPlan
                          ? 'border-green-500/60 bg-green-900/20'
                          : 'border-dark-border bg-dark-bg hover:border-sf-primary/40'
                      }`}
                    >
                      <div className="text-center mb-3">
                        <div className="text-lg font-bold text-white capitalize">
                          {tier.display_name}
                        </div>
                        <div className="text-2xl font-bold text-sf-primary">
                          ${tier.monthly_price_usd}
                          <span className="text-sm text-gray-400">/mo</span>
                        </div>
                      </div>
                      
                      <div className="space-y-1 text-xs text-gray-400 mb-3">
                        <div className="flex justify-between">
                          <span>Credits:</span>
                          <span className="text-white">{tier.included_credits_monthly.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Storage:</span>
                          <span className="text-white">{tier.storage_gb} GB</span>
                        </div>
                        {tier.hasVoiceCloning && (
                          <div className="flex justify-between items-center">
                            <span className="flex items-center gap-1">
                              <Mic className="w-3 h-3" /> Voice Clone:
                            </span>
                            <span className="text-green-400">{tier.voiceCloneSlots} slots</span>
                          </div>
                        )}
                      </div>
                      
                      {isCurrentPlan ? (
                        <Button
                          disabled
                          className="w-full bg-green-600/20 text-green-400 border border-green-500/30"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Current
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleSwitchPlan(tier.name)}
                          disabled={isLoading || !!switchingPlan}
                          className="w-full bg-sf-primary hover:bg-sf-accent text-white"
                        >
                          {isLoading ? (
                            <Loader className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              Switch <ArrowRight className="w-3 h-3 ml-1" />
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  )
                })}
              </div>
              
              <div className="mt-4 p-3 bg-amber-900/20 rounded-lg border border-amber-500/20">
                <div className="flex items-start gap-2 text-amber-300 text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong>Test Mode:</strong> Plan switching is instant and grants test credits. 
                    This feature is only available in development or when ENABLE_TEST_PLAN_SWITCH is enabled.
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

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
                <Button 
                  className="bg-sf-primary hover:bg-sf-accent text-white flex items-center gap-2"
                  onClick={() => {
                    const plansSection = document.getElementById('checkout-plans')
                    plansSection?.scrollIntoView({ behavior: 'smooth' })
                  }}
                >
                  View Plans
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 bg-dark-bg rounded-lg border border-dark-border">
                <div>
                  <h4 className="text-white font-semibold">Purchase Add-on Credits</h4>
                  <p className="text-gray-400 text-sm">Buy additional credits that never expire</p>
                </div>
                <Button variant="outline" className="border-dark-border text-dark-text hover:bg-dark-bg flex items-center gap-2" disabled>
                  Coming Soon
                </Button>
              </div>

              {subscription?.subscription?.status === 'active' && (
                <div className="flex items-center justify-between p-4 bg-dark-bg rounded-lg border border-dark-border">
                  <div>
                    <h4 className="text-white font-semibold">Manage Subscription</h4>
                    <p className="text-gray-400 text-sm">Update payment method or cancel via Whop</p>
                  </div>
                  <Button
                    variant="outline"
                    className="border-dark-border text-dark-text hover:bg-dark-bg flex items-center gap-2"
                    onClick={() => window.open('https://whop.com/hub/memberships', '_blank', 'noopener,noreferrer')}
                  >
                    Manage on Whop
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {subscription?.subscription?.status === 'active' && (
                <div className="flex items-center justify-between p-4 bg-dark-bg rounded-lg border border-dark-border">
                  <div>
                    <h4 className="text-white font-semibold">Billing History</h4>
                    <p className="text-gray-400 text-sm">View past invoices and payments</p>
                  </div>
                  <Button variant="outline" className="border-dark-border text-dark-text hover:bg-dark-bg flex items-center gap-2" disabled>
                    Coming Soon
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Subscription Details */}
      {subscription?.subscription?.tier && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          <Card className="bg-dark-card border-dark-border text-white">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <CardTitle className="text-xl font-semibold">Plan Features</CardTitle>
                  <CardDescription className="text-gray-400">
                    What&apos;s included in your {subscription.subscription.tier.display_name} plan
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-4 bg-dark-bg rounded-lg border border-dark-border">
                  <div className="text-gray-400 text-sm mb-1">Monthly Credits</div>
                  <div className="text-xl font-bold text-white">
                    {subscription.subscription.tier.included_credits_monthly.toLocaleString()}
                  </div>
                </div>
                <div className="p-4 bg-dark-bg rounded-lg border border-dark-border">
                  <div className="text-gray-400 text-sm mb-1">Storage</div>
                  <div className="text-xl font-bold text-white">
                    {subscription.subscription.tier.storage_gb} GB
                  </div>
                </div>
                <div className="p-4 bg-dark-bg rounded-lg border border-dark-border">
                  <div className="text-gray-400 text-sm mb-1">Features</div>
                  <div className="text-sm text-white">
                    {subscription.subscription.tier.features?.length > 0 
                      ? subscription.subscription.tier.features.slice(0, 3).join(', ')
                      : 'Standard features'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )
}

