'use client'

import { ReactNode } from 'react'
import { SessionProvider } from 'next-auth/react'

interface SessionProvidersProps {
  children: ReactNode
}

export function SessionProviders({ children }: SessionProvidersProps) {
  // Pass-through wrapper to keep a stable import path
  return (<>{children}</>)
}

// Re-export SessionProvider for direct usage if needed
export { SessionProvider }


