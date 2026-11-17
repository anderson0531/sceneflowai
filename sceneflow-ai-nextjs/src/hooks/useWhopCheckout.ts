'use client'

import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import {
  isPrelaunchAccessModeEnabled,
  PRELAUNCH_CHECKOUT_BLOCKED_MESSAGE,
} from '@/lib/billing/prelaunchAccess'

export interface CheckoutSession {
  sessionId: string
  planId: string
  tierName: string
  returnUrl: string
  purchaseUrl?: string
}

export function useWhopCheckout() {
  const [loading, setLoading] = useState<string | null>(null)
  const [checkout, setCheckout] = useState<CheckoutSession | null>(null)

  const startCheckout = useCallback(async (tierName: string) => {
    if (loading) return

    if (isPrelaunchAccessModeEnabled()) {
      toast.message(PRELAUNCH_CHECKOUT_BLOCKED_MESSAGE)
      const requestForm = document.getElementById('prelaunch-access-request')
      if (requestForm) {
        requestForm.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
      return
    }

    setLoading(tierName)
    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tierName }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.prelaunchOnly || data.error === 'PRELAUNCH_ACCESS_ONLY') {
          toast.message(data.message || PRELAUNCH_CHECKOUT_BLOCKED_MESSAGE)
          const requestForm = document.getElementById('prelaunch-access-request')
          if (requestForm) {
            requestForm.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
          return
        }
        toast.error(data.message || data.error || 'Checkout failed')
        return
      }

      if (data.fallbackToPro) {
        toast.message(
          'Opening Pro White-Label Studio ($149/mo) checkout while Founding Charter seats are queued.'
        )
      }

      if (!data.sessionId && data.redirectUrl) {
        window.location.assign(data.redirectUrl)
        return
      }

      setCheckout({
        sessionId: data.sessionId,
        planId: data.planId,
        tierName: data.tierName || tierName,
        returnUrl: data.returnUrl,
        purchaseUrl: data.purchaseUrl || data.redirectUrl,
      })
    } catch (error) {
      console.error('[useWhopCheckout] Error:', error)
      toast.error('Failed to start checkout')
    } finally {
      setLoading(null)
    }
  }, [loading])

  const closeCheckout = useCallback(() => {
    setCheckout(null)
  }, [])

  return {
    loading,
    checkout,
    startCheckout,
    closeCheckout,
  }
}
