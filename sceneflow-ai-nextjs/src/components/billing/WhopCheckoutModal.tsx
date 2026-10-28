'use client'

import { useEffect, useMemo } from 'react'
import { X, Loader, ExternalLink, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface WhopCheckoutModalProps {
  isOpen: boolean
  sessionId: string
  returnUrl: string
  purchaseUrl?: string
  userEmail?: string | null
  onClose: () => void
  onComplete?: () => void
}

export function WhopCheckoutModal({
  isOpen,
  sessionId,
  purchaseUrl,
  userEmail,
  onClose,
}: WhopCheckoutModalProps) {
  const hostedCheckoutUrl = useMemo(() => {
    if (purchaseUrl) return purchaseUrl
    if (!sessionId) return ''
    const url = new URL(`https://whop.com/checkout/${sessionId}/`)
    if (userEmail && userEmail.trim()) {
      url.searchParams.set('email', userEmail.trim())
    }
    return url.toString()
  }, [purchaseUrl, sessionId, userEmail])

  useEffect(() => {
    if (!isOpen) return
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen && hostedCheckoutUrl) {
      window.location.assign(hostedCheckoutUrl)
    }
  }, [isOpen, hostedCheckoutUrl])

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

        <div className="p-6 flex flex-col items-center justify-center text-center gap-4 min-h-[280px]">
          <div className="w-12 h-12 rounded-full bg-sf-primary/20 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-sf-primary" />
          </div>
          <div className="space-y-2">
            <h4 className="text-base font-semibold text-white">
              Redirecting to Secure Whop Checkout…
            </h4>
            <p className="text-gray-400 text-sm max-w-sm">
              You will be automatically returned to SceneFlow AI Studio as soon as your payment completes.
            </p>
          </div>
          {hostedCheckoutUrl ? (
            <Button
              onClick={() => window.location.assign(hostedCheckoutUrl)}
              className="w-full max-w-xs bg-sf-primary hover:bg-sf-accent text-white flex items-center justify-center gap-2"
            >
              <span>Continue to Secure Checkout</span>
              <ExternalLink className="w-4 h-4" />
            </Button>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3">
              <Loader className="w-6 h-6 animate-spin text-sf-primary" />
              <p className="text-gray-400 text-sm">Preparing checkout session…</p>
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
