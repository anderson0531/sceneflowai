'use client'

import { useEffect } from 'react'
import { clearDashboardRedirectAttempts } from '@/lib/auth/postLoginRedirect'

/** Clears login redirect loop counter once dashboard successfully mounts. */
export function DashboardRedirectGuard() {
  useEffect(() => {
    clearDashboardRedirectAttempts()
  }, [])

  return null
}
