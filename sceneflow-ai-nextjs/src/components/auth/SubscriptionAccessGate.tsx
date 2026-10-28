'use client'

import React, { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { clearDashboardRedirectAttempts } from '@/lib/auth/postLoginRedirect'
import {
  hasActiveSubscriptionAccess,
  isSubscriptionExemptDashboardPath,
} from '@/lib/billing/subscriptionAccess'

interface SubscriptionAccessGateProps {
  children: React.ReactNode
}

/**
 * Enforces that authenticated users must have an active subscription
 * or a purchased Explorer Pass to access the SceneFlow Studio & Dashboard.
 * Unsubscribed users are redirected to /dashboard/settings/billing?reason=subscription_required.
 */
export function SubscriptionAccessGate({ children }: SubscriptionAccessGateProps) {
  const pathname = usePathname()
  const router = useRouter()
  const isExempt = isSubscriptionExemptDashboardPath(pathname)

  const [checking, setChecking] = useState(!isExempt)
  const [hasAccess, setHasAccess] = useState(false)

  useEffect(() => {
    clearDashboardRedirectAttempts()

    if (isExempt) {
      setChecking(false)
      return
    }

    let cancelled = false
    setChecking(true)

    const verifyAccess = async () => {
      try {
        const res = await fetch('/api/subscription/status', {
          cache: 'no-store',
        })
        if (!res.ok) {
          if (!cancelled) {
            setHasAccess(false)
            setChecking(false)
            router.replace('/dashboard/settings/billing?reason=subscription_required')
          }
          return
        }

        const data = await res.json()
        const allowed = hasActiveSubscriptionAccess({
          subscriptionStatus: data?.subscription?.status ?? null,
          tierName: data?.subscription?.tier?.name ?? null,
          tierId: data?.subscription?.tier?.id ?? null,
          oneTimeTiersPurchased: Array.isArray(data?.one_time_tiers_purchased)
            ? data.one_time_tiers_purchased
            : [],
        })

        if (cancelled) return

        if (!allowed) {
          setHasAccess(false)
          setChecking(false)
          router.replace('/dashboard/settings/billing?reason=subscription_required')
          return
        }

        setHasAccess(true)
        setChecking(false)
      } catch (err) {
        console.error('[SubscriptionAccessGate] Failed to verify subscription access:', err)
        if (!cancelled) {
          setHasAccess(false)
          setChecking(false)
          router.replace('/dashboard/settings/billing?reason=subscription_required')
        }
      }
    }

    void verifyAccess()

    return () => {
      cancelled = true
    }
  }, [pathname, isExempt, router])

  if (isExempt) {
    return <>{children}</>
  }

  if (checking || !hasAccess) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          <p className="text-sm text-gray-400">Verifying subscription access...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
