'use client'

import React from 'react'
import { useCreditsDisplay, useCredits } from '@/contexts/CreditsContext'
import { Coins, AlertTriangle, RefreshCw } from 'lucide-react'
import Link from 'next/link'

interface CreditsBadgeProps {
  showPlan?: boolean
  className?: string
}

export function CreditsBadge({ showPlan = false, className = '' }: CreditsBadgeProps) {
  const { formatted, plan, isLow, isEmpty } = useCreditsDisplay()
  const { isLoading, refreshCredits } = useCredits()

  const getBadgeStyle = () => {
    if (isEmpty) return 'bg-red-500/20 text-red-400 border-red-500/30'
    if (isLow) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
    return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Link 
        href="/pricing"
        className={`
          flex items-center gap-2 px-3 py-1.5 rounded-full border 
          text-sm font-medium transition-all hover:scale-105
          ${getBadgeStyle()}
        `}
      >
        {isEmpty ? (
          <AlertTriangle className="w-4 h-4" />
        ) : (
          <Coins className="w-4 h-4" />
        )}
        <span>
          {isLoading ? (
            <RefreshCw className="w-3 h-3 animate-spin" />
          ) : (
            <>
              {formatted}
              {showPlan && plan && plan !== 'free' && (
                <span className="ml-1 opacity-60">• {plan}</span>
              )}
            </>
          )}
        </span>
      </Link>
      
      {(isLow || isEmpty) && !isLoading && (
        <Link
          href="/pricing"
          className="text-xs text-yellow-400 hover:text-yellow-300 underline"
        >
          Add Credits
        </Link>
      )}
    </div>
  )
}

// Compact inline version for toolbars
export function CreditsInline({ className = '' }: { className?: string }) {
  const { formatted, isLow, isEmpty } = useCreditsDisplay()
  const { isLoading } = useCredits()

  return (
    <span className={`inline-flex items-center gap-1 text-sm ${className}`}>
      <Coins className={`w-3.5 h-3.5 ${isLow || isEmpty ? 'text-yellow-400' : 'text-emerald-400'}`} />
      <span className={isLow || isEmpty ? 'text-yellow-400' : 'text-gray-300'}>
        {isLoading ? '...' : formatted}
      </span>
    </span>
  )
}
