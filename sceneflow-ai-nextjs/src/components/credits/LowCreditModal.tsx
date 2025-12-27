'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Battery, 
  BatteryLow, 
  BatteryWarning, 
  X, 
  Zap, 
  ArrowUpRight, 
  CreditCard,
  Sparkles
} from 'lucide-react'
import { type NudgeRecommendation } from '@/lib/credits/nudgeRecommendation'

// =============================================================================
// TYPES
// =============================================================================

interface LowCreditModalProps {
  isOpen: boolean
  onClose: () => void
  nudge: NudgeRecommendation
  currentBalance: number
  projectName?: string
  onTopUp: (packId: string) => void
  onUpgrade: (planId: string) => void
}

// =============================================================================
// COMPONENT
// =============================================================================

export function LowCreditModal({
  isOpen,
  onClose,
  nudge,
  currentBalance,
  projectName,
  onTopUp,
  onUpgrade,
}: LowCreditModalProps) {
  const [isProcessing, setIsProcessing] = useState(false)

  const handleTopUp = async () => {
    if (!nudge.topUp) return
    setIsProcessing(true)
    try {
      await onTopUp(nudge.topUp.pack)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleUpgrade = async () => {
    if (!nudge.upgrade) return
    setIsProcessing(true)
    try {
      await onUpgrade(nudge.upgrade.toPlan)
    } finally {
      setIsProcessing(false)
    }
  }

  const getBatteryIcon = () => {
    switch (nudge.urgency) {
      case 'high':
        return <BatteryWarning className="w-8 h-8 text-red-500" />
      case 'medium':
        return <BatteryLow className="w-8 h-8 text-amber-500" />
      default:
        return <Battery className="w-8 h-8 text-blue-500" />
    }
  }

  const getGradientClass = () => {
    switch (nudge.urgency) {
      case 'high':
        return 'from-red-500/20 to-orange-500/20 border-red-500/30'
      case 'medium':
        return 'from-amber-500/20 to-yellow-500/20 border-amber-500/30'
      default:
        return 'from-blue-500/20 to-purple-500/20 border-blue-500/30'
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className={`relative w-full max-w-md bg-gradient-to-br ${getGradientClass()} bg-slate-900 rounded-2xl border shadow-2xl overflow-hidden`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            {nudge.urgency !== 'high' && (
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            )}

            {/* Header */}
            <div className="p-6 pb-4">
              <div className="flex items-center gap-3 mb-4">
                {getBatteryIcon()}
                <div>
                  <h3 className="text-xl font-bold text-white">{nudge.headline}</h3>
                  <p className="text-sm text-gray-400">
                    Current balance: <span className="font-medium text-white">{currentBalance.toLocaleString()} credits</span>
                  </p>
                </div>
              </div>

              <p className="text-gray-300 leading-relaxed">{nudge.body}</p>

              {projectName && (
                <div className="mt-4 p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                  <p className="text-sm text-gray-400">
                    Project: <span className="text-white font-medium">{projectName}</span>
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="p-6 pt-2 space-y-3">
              {/* Top-Up Button */}
              {nudge.topUp && (
                <button
                  onClick={handleTopUp}
                  disabled={isProcessing}
                  className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 rounded-xl text-white font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg">
                      <Zap className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold">{nudge.topUp.name}</div>
                      <div className="text-sm text-white/80">
                        {nudge.topUp.credits.toLocaleString()} credits • ${nudge.topUp.price}
                      </div>
                    </div>
                  </div>
                  <ArrowUpRight className="w-5 h-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </button>
              )}

              {/* Upgrade Button */}
              {nudge.upgrade && (
                <button
                  onClick={handleUpgrade}
                  disabled={isProcessing}
                  className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-xl text-white font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold">Upgrade to {nudge.upgrade.name}</div>
                      <div className="text-sm text-white/80">
                        {nudge.upgrade.credits.toLocaleString()}/mo • {nudge.upgrade.savings}
                      </div>
                    </div>
                  </div>
                  <ArrowUpRight className="w-5 h-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </button>
              )}

              {/* Dismiss (only if not critical) */}
              {nudge.urgency !== 'high' && (
                <button
                  onClick={onClose}
                  className="w-full py-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Remind me later
                </button>
              )}
            </div>

            {/* Pro tip */}
            <div className="px-6 pb-6">
              <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                <p className="text-xs text-emerald-400">
                  💡 <strong>Pro Tip:</strong> Top-Up credits never expire! They stay in your account until you use them.
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// =============================================================================
// LOW CREDIT TOAST
// =============================================================================

interface LowCreditToastProps {
  isVisible: boolean
  onClose: () => void
  onAction: () => void
  headline: string
  body: string
  actionText: string
  urgency: 'low' | 'medium' | 'high'
}

export function LowCreditToast({
  isVisible,
  onClose,
  onAction,
  headline,
  body,
  actionText,
  urgency,
}: LowCreditToastProps) {
  const getBorderColor = () => {
    switch (urgency) {
      case 'high':
        return 'border-red-500/50'
      case 'medium':
        return 'border-amber-500/50'
      default:
        return 'border-blue-500/50'
    }
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, x: 50 }}
          animate={{ opacity: 1, y: 0, x: 0 }}
          exit={{ opacity: 0, y: 50, x: 50 }}
          className={`fixed bottom-4 right-4 z-50 max-w-sm bg-slate-800 rounded-xl border ${getBorderColor()} shadow-2xl overflow-hidden`}
        >
          <div className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                {urgency === 'high' ? (
                  <BatteryWarning className="w-5 h-5 text-red-500" />
                ) : urgency === 'medium' ? (
                  <BatteryLow className="w-5 h-5 text-amber-500" />
                ) : (
                  <Battery className="w-5 h-5 text-blue-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{headline}</p>
                <p className="text-xs text-gray-400 mt-1 line-clamp-2">{body}</p>
              </div>
              <button
                onClick={onClose}
                className="flex-shrink-0 p-1 hover:bg-white/10 rounded transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={onAction}
                className="flex-1 py-2 px-3 bg-cyan-500 hover:bg-cyan-600 rounded-lg text-sm font-medium text-white transition-colors"
              >
                {actionText}
              </button>
              <button
                onClick={onClose}
                className="py-2 px-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-gray-300 transition-colors"
              >
                Later
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// =============================================================================
// CREDIT BALANCE DISPLAY
// =============================================================================

interface CreditBalanceProps {
  balance: number
  planCredits: number
  onClick?: () => void
}

export function CreditBalance({ balance, planCredits, onClick }: CreditBalanceProps) {
  const percentage = Math.min((balance / planCredits) * 100, 100)
  
  const getColor = () => {
    if (percentage <= 5) return 'text-red-500'
    if (percentage <= 15) return 'text-amber-500'
    return 'text-cyan-500'
  }

  const getBarColor = () => {
    if (percentage <= 5) return 'bg-red-500'
    if (percentage <= 15) return 'bg-amber-500'
    return 'bg-cyan-500'
  }

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 hover:bg-slate-700/50 rounded-lg border border-slate-700/50 transition-colors group"
    >
      <Battery className={`w-4 h-4 ${getColor()}`} />
      <span className="text-sm font-medium text-white">
        {balance.toLocaleString()}
      </span>
      <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${getBarColor()} transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <CreditCard className="w-3.5 h-3.5 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  )
}
