'use client'

import { useEffect } from 'react'
import { WhopCheckoutEmbed } from '@whop/checkout/react'
import { X, Loader } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface WhopCheckoutModalProps {
  isOpen: boolean
  sessionId: string
  returnUrl: string
  userEmail?: string | null
  onClose: () => void
  onComplete?: () => void
}

export function WhopCheckoutModal({
  isOpen,
  sessionId,
  returnUrl,
  userEmail,
  onClose,
  onComplete,
}: WhopCheckoutModalProps) {
  useEffect(() => {
    if (!isOpen) return
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-dark-card border border-dark-border rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-dark-border">
          <h3 className="text-lg font-semibold text-white">Complete Checkout</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-dark-bg transition-colors"
            aria-label="Close checkout"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 min-h-[480px]">
          {sessionId ? (
            <WhopCheckoutEmbed
              sessionId={sessionId}
              theme="dark"
              returnUrl={returnUrl}
              prefill={userEmail ? { email: userEmail } : undefined}
              onComplete={() => {
                onComplete?.()
              }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
              <Loader className="w-8 h-8 animate-spin text-sf-primary" />
              <p className="text-gray-400 text-sm">Loading checkout...</p>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-dark-border">
          <Button variant="outline" className="w-full border-dark-border" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}
