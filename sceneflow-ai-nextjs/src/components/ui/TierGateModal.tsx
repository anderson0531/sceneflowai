'use client'

/**
 * TierGateModal Component
 * 
 * Modal displayed when a user tries to access a feature
 * that requires a higher subscription tier.
 */

import React from 'react'
import { 
  Lock, 
  Crown, 
  Sparkles, 
  ArrowRight, 
  X,
  Check,
  Star,
  Zap
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { TrustBlocker } from '@/hooks/useVoiceConsent'

// ============================================================================
// Types
// ============================================================================

export interface TierGateModalProps {
  isOpen: boolean
  onClose: () => void
  feature: string
  featureDescription?: string
  blockers?: TrustBlocker[]
  suggestions?: string[]
  requiredTier?: 'pro' | 'studio' | 'enterprise'
  currentTier?: string
}

// ============================================================================
// Tier Details
// ============================================================================

const TIER_DETAILS = {
  pro: {
    name: 'Pro',
    price: '$29/mo',
    icon: Sparkles,
    color: 'blue',
    features: [
      '3 Custom Voice Clones',
      'Priority Processing',
      '50GB Storage',
      'HD Video Export',
      'All AI Models',
    ],
  },
  studio: {
    name: 'Studio',
    price: '$79/mo',
    icon: Crown,
    color: 'purple',
    features: [
      '10 Custom Voice Clones',
      'Priority+ Processing',
      '200GB Storage',
      '4K Video Export',
      'Team Collaboration',
      'API Access',
    ],
  },
  enterprise: {
    name: 'Enterprise',
    price: 'Custom',
    icon: Star,
    color: 'amber',
    features: [
      'Unlimited Voice Clones',
      'Dedicated Support',
      'Custom Storage',
      'Custom Integrations',
      'SLA Guarantee',
    ],
  },
}

// ============================================================================
// Component
// ============================================================================

export function TierGateModal({
  isOpen,
  onClose,
  feature,
  featureDescription,
  blockers = [],
  suggestions = [],
  requiredTier = 'pro',
  currentTier,
}: TierGateModalProps) {
  if (!isOpen) return null

  const tierInfo = TIER_DETAILS[requiredTier]
  const TierIcon = tierInfo.icon
  
  const colorClasses = {
    blue: {
      bg: 'bg-blue-500',
      bgLight: 'bg-blue-500/10',
      border: 'border-blue-500/30',
      text: 'text-blue-400',
      textLight: 'text-blue-300',
      gradient: 'from-blue-600 to-blue-500',
    },
    purple: {
      bg: 'bg-purple-500',
      bgLight: 'bg-purple-500/10',
      border: 'border-purple-500/30',
      text: 'text-purple-400',
      textLight: 'text-purple-300',
      gradient: 'from-purple-600 to-purple-500',
    },
    amber: {
      bg: 'bg-amber-500',
      bgLight: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      text: 'text-amber-400',
      textLight: 'text-amber-300',
      gradient: 'from-amber-600 to-amber-500',
    },
  }
  
  const colors = colorClasses[tierInfo.color as keyof typeof colorClasses]

  // Filter blockers that are subscription-related
  const subscriptionBlockers = blockers.filter(b => b.type === 'subscription')
  const otherBlockers = blockers.filter(b => b.type !== 'subscription')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md mx-4 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header with gradient */}
        <div className={`relative px-6 pt-8 pb-6 bg-gradient-to-br ${colors.gradient} text-white`}>
          <div className="absolute inset-0 bg-black/20" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Lock className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium opacity-90">Feature Locked</span>
            </div>
            <h2 className="text-xl font-bold">{feature}</h2>
            {featureDescription && (
              <p className="mt-2 text-sm opacity-80">{featureDescription}</p>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Current blockers */}
          {otherBlockers.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-300">Requirements not met:</div>
              <div className="space-y-2">
                {otherBlockers.map((blocker, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 p-2.5 bg-yellow-500/10 border border-yellow-500/30 rounded-lg"
                  >
                    <Zap className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
                    <div>
                      <div className="text-sm text-yellow-300">{blocker.message}</div>
                      {blocker.resolution && (
                        <div className="text-xs text-yellow-400/70 mt-0.5">{blocker.resolution}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upgrade prompt */}
          {subscriptionBlockers.length > 0 && (
            <div className={`p-4 ${colors.bgLight} border ${colors.border} rounded-lg`}>
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 ${colors.bg} rounded-lg`}>
                  <TierIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="font-semibold text-white">{tierInfo.name} Plan</div>
                  <div className={`text-sm ${colors.text}`}>{tierInfo.price}</div>
                </div>
              </div>

              <ul className="space-y-2">
                {tierInfo.features.map((feat, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-300">
                    <Check className={`w-4 h-4 ${colors.text}`} />
                    {feat}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div className="text-sm text-gray-400">
              <ul className="space-y-1">
                {suggestions.map((s, i) => (
                  <li key={i}>💡 {s}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-6 py-4 border-t border-gray-700 bg-gray-800/50">
          <Button
            variant="ghost"
            onClick={onClose}
            className="flex-1"
          >
            Maybe Later
          </Button>
          <Button
            onClick={() => {
              // Navigate to pricing page
              window.location.href = '/pricing'
            }}
            className={`flex-1 flex items-center justify-center gap-2 bg-gradient-to-r ${colors.gradient} hover:opacity-90`}
          >
            <Crown className="w-4 h-4" />
            Upgrade Now
          </Button>
        </div>
      </div>
    </div>
  )
}

export default TierGateModal
