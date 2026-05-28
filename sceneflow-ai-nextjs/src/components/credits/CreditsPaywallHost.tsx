'use client'

import { useRouter } from 'next/navigation'
import { useCredits } from '@/contexts/CreditsContext'
import { LowCreditModal } from '@/components/credits/LowCreditModal'
import { generateNudge } from '@/lib/credits/nudgeRecommendation'

export function CreditsPaywallHost() {
  const router = useRouter()
  const {
    credits,
    showLowCreditWarning,
    dismissLowCreditWarning,
  } = useCredits()

  if (!credits || !showLowCreditWarning) {
    return null
  }

  const plan = (credits.subscription_plan || 'free') as 'free' | 'trial' | 'starter' | 'pro' | 'studio' | 'enterprise'
  const normalizedPlan = plan === 'trial' ? 'starter' : plan === 'free' ? 'starter' : plan
  const planCredits = Math.max(credits.subscription_credits_monthly || 1500, 1500)

  const nudge = generateNudge({
    plan: normalizedPlan as any,
    currentBalance: credits.total_credits,
    planCredits,
    topUpsPurchasedThisQuarter: 0,
  })

  return (
    <LowCreditModal
      isOpen={showLowCreditWarning}
      onClose={dismissLowCreditWarning}
      nudge={nudge}
      currentBalance={credits.total_credits}
      onTopUp={() => {
        dismissLowCreditWarning()
        router.push('/dashboard/settings/billing?checkoutTier=explorer')
      }}
      onUpgrade={(planId) => {
        dismissLowCreditWarning()
        router.push(`/dashboard/settings/billing?checkoutTier=${planId}`)
      }}
    />
  )
}
