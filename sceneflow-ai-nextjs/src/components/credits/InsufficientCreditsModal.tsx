'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Coins, X, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { getBillingUrl } from '@/lib/billing/billingUrls'

interface InsufficientCreditsModalProps {
  isOpen: boolean
  onClose: () => void
  requiredCredits?: number
  availableCredits?: number
  message?: string
}

export function InsufficientCreditsModal({
  isOpen,
  onClose,
  requiredCredits,
  availableCredits,
  message,
}: InsufficientCreditsModalProps) {
  const billingUrl = getBillingUrl({ isAuthenticated: true })
  const explorerUrl = getBillingUrl({ tier: 'explorer', isAuthenticated: true })

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
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            className="relative w-full max-w-md bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/10 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-amber-500/20">
                <Coins className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Not enough credits</h3>
                {requiredCredits != null && availableCredits != null && (
                  <p className="text-sm text-gray-400">
                    Need {requiredCredits.toLocaleString()} • Have {availableCredits.toLocaleString()}
                  </p>
                )}
              </div>
            </div>

            <p className="text-sm text-gray-300 mb-6">
              {message || 'Add credits with Explorer or upgrade your plan to keep creating.'}
            </p>

            <div className="flex flex-col gap-2">
              <Button
                className="w-full bg-sf-primary hover:bg-sf-accent text-white"
                onClick={() => {
                  window.location.href = explorerUrl
                }}
              >
                Buy Explorer ($9)
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button
                variant="outline"
                className="w-full border-slate-600 text-gray-200 hover:bg-slate-800"
                onClick={() => {
                  window.location.href = billingUrl
                }}
              >
                View subscription plans
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
