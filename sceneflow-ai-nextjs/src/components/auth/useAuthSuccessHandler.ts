'use client'

import { useCallback } from 'react'
import { toast } from 'sonner'
import { consumePendingCheckoutTier } from '@/lib/billing/checkoutIntent'
import { getWelcomeCreditsOnSignup } from '@/lib/credits/welcomeCreditsConfig'
import {
  navigateAfterAuth,
  resolvePostLoginPath,
} from '@/lib/auth/postLoginRedirect'

export function useAuthSuccessHandler(mode: 'login' | 'signup') {
  return useCallback(() => {
    const pendingTier = consumePendingCheckoutTier()
    if (pendingTier) {
      navigateAfterAuth(`/dashboard/settings/billing?checkoutTier=${pendingTier}`)
      return
    }

    if (mode === 'signup') {
      const welcomeCredits = getWelcomeCreditsOnSignup()
      if (welcomeCredits > 0) {
        toast.success(
          `Welcome! ${welcomeCredits.toLocaleString()} free credits have been added to your account.`
        )
      }
    }

    navigateAfterAuth(resolvePostLoginPath())
  }, [mode])
}
