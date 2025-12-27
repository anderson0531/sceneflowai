'use client'

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'
import { useSession } from 'next-auth/react'

interface CreditBreakdown {
  total_credits: number
  addon_credits: number
  subscription_credits_monthly: number
  subscription_plan: string
  subscription_expires: string | null
}

interface CreditsContextType {
  credits: CreditBreakdown | null
  isLoading: boolean
  error: string | null
  refreshCredits: () => Promise<void>
  updateCreditsOptimistic: (delta: number) => void
  showLowCreditWarning: boolean
  dismissLowCreditWarning: () => void
}

const CreditsContext = createContext<CreditsContextType | null>(null)

// Low credit threshold - show warning when below this
const LOW_CREDIT_THRESHOLD = 100

interface CreditsProviderProps {
  children: ReactNode
}

export function CreditsProvider({ children }: CreditsProviderProps) {
  const { data: session, status } = useSession()
  const [credits, setCredits] = useState<CreditBreakdown | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showLowCreditWarning, setShowLowCreditWarning] = useState(false)
  const [warningDismissed, setWarningDismissed] = useState(false)

  const refreshCredits = useCallback(async () => {
    if (!session?.user?.id) {
      setCredits(null)
      setIsLoading(false)
      return
    }

    try {
      setError(null)
      const response = await fetch('/api/user/credits')
      
      if (!response.ok) {
        throw new Error('Failed to fetch credits')
      }
      
      const data = await response.json()
      setCredits(data)
      
      // Check for low credits
      if (data.total_credits < LOW_CREDIT_THRESHOLD && !warningDismissed) {
        setShowLowCreditWarning(true)
      }
    } catch (err: any) {
      console.error('[CreditsContext] Failed to refresh credits:', err)
      setError(err.message || 'Failed to load credits')
    } finally {
      setIsLoading(false)
    }
  }, [session?.user?.id, warningDismissed])

  // Optimistically update credits without refetching (for immediate UI feedback)
  const updateCreditsOptimistic = useCallback((delta: number) => {
    setCredits(prev => {
      if (!prev) return prev
      const newTotal = Math.max(0, prev.total_credits + delta)
      return {
        ...prev,
        total_credits: newTotal
      }
    })
  }, [])

  const dismissLowCreditWarning = useCallback(() => {
    setShowLowCreditWarning(false)
    setWarningDismissed(true)
    // Reset after 10 minutes
    setTimeout(() => setWarningDismissed(false), 10 * 60 * 1000)
  }, [])

  // Initial fetch when authenticated
  useEffect(() => {
    if (status === 'authenticated') {
      refreshCredits()
    } else if (status === 'unauthenticated') {
      setCredits(null)
      setIsLoading(false)
    }
  }, [status, refreshCredits])

  // Poll credits every 60 seconds when user is active
  useEffect(() => {
    if (status !== 'authenticated') return

    const interval = setInterval(() => {
      refreshCredits()
    }, 60 * 1000)

    return () => clearInterval(interval)
  }, [status, refreshCredits])

  // Listen for credit update events from API responses
  useEffect(() => {
    const handleCreditUpdate = (event: CustomEvent<{ balance: number }>) => {
      if (credits) {
        setCredits(prev => prev ? { ...prev, total_credits: event.detail.balance } : prev)
      }
    }

    window.addEventListener('creditsUpdated', handleCreditUpdate as EventListener)
    return () => window.removeEventListener('creditsUpdated', handleCreditUpdate as EventListener)
  }, [credits])

  return (
    <CreditsContext.Provider 
      value={{
        credits,
        isLoading,
        error,
        refreshCredits,
        updateCreditsOptimistic,
        showLowCreditWarning,
        dismissLowCreditWarning
      }}
    >
      {children}
    </CreditsContext.Provider>
  )
}

export function useCredits() {
  const context = useContext(CreditsContext)
  if (!context) {
    throw new Error('useCredits must be used within a CreditsProvider')
  }
  return context
}

// Helper hook to format credits display
export function useCreditsDisplay() {
  const { credits, isLoading } = useCredits()
  
  const formatCredits = (value: number) => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}k`
    }
    return value.toString()
  }
  
  return {
    total: credits?.total_credits ?? 0,
    formatted: isLoading ? '...' : formatCredits(credits?.total_credits ?? 0),
    plan: credits?.subscription_plan || 'free',
    isLow: (credits?.total_credits ?? 0) < LOW_CREDIT_THRESHOLD,
    isEmpty: (credits?.total_credits ?? 0) === 0
  }
}
