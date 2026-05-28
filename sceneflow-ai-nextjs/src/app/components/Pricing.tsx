'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/** @deprecated Legacy pricing component — redirects to landing #pricing. Use PricingCredits instead. */
export function Pricing() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/#pricing')
  }, [router])

  return null
}
