'use client'

import { useEffect, useMemo, useState } from 'react'
import { X, Loader, ExternalLink, ShieldCheck, Beaker, CheckCircle, Copy } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import {
  ADDON_PACK_CATALOG,
  TIER_CATALOG,
  normalizeAddonPackId,
  normalizeTierName,
} from '@/lib/billing/tierCatalog'
import { toast } from 'sonner'

interface WhopCheckoutModalProps {
  isOpen: boolean
  sessionId: string
  tierName?: string
  returnUrl: string
  purchaseUrl?: string
  userEmail?: string | null
  isTestMode?: boolean
  isTestActivating?: boolean
  onTestActivate?: (tierName: string) => Promise<void> | void
  onClose: () => void
  onComplete?: () => void
}

export function WhopCheckoutModal({
  isOpen,
  sessionId,
  tierName,
  purchaseUrl,
  userEmail,
  isTestMode = false,
  isTestActivating = false,
  onTestActivate,
  onClose,
}: WhopCheckoutModalProps) {
  const [copiedPromo, setCopiedPromo] = useState(false)

  const planSummary = useMemo(() => {
    if (!tierName) return null
    const addonId = normalizeAddonPackId(tierName)
    if (addonId) {
      const pack = ADDON_PACK_CATALOG[addonId]
      return {
        key: addonId,
        title: pack.displayName,
        priceLabel: `$${pack.priceUsd} one-time`,
        creditsLabel: `${pack.credits.toLocaleString()} add-on credits (12-month validity)`,
      }
    }
    const normalizedTier = normalizeTierName(tierName)
    if (normalizedTier) {
      const tier = TIER_CATALOG[normalizedTier]
      return {
        key: normalizedTier,
        title: `${tier.displayName} Plan`,
        priceLabel: tier.isOneTime ? `$${tier.priceUsd} one-time` : `$${tier.priceUsd}/month`,
        creditsLabel: `${tier.credits.toLocaleString()} credits${tier.isOneTime ? '' : '/month'} • ${tier.storageGb} GB Vault`,
      }
    }
    return null
  }, [tierName])

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

  if (!isOpen) return null

  const handleCopyPromo = async () => {
    try {
      await navigator.clipboard.writeText('sceneflowtest100')
      setCopiedPromo(true)
      toast.success('Copied promo code sceneflowtest100')
      setTimeout(() => setCopiedPromo(false), 2500)
    } catch {
      // Ignore clipboard errors
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-dark-card border border-dark-border rounded-2xl overflow-hidden shadow-2xl">
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

        <div className="p-6 space-y-5">
          {planSummary && (
            <div className="p-4 rounded-xl bg-gray-900/90 border border-gray-700/70 flex items-center justify-between gap-4">
              <div>
                <div className="text-base font-bold text-white">{planSummary.title}</div>
                <div className="text-xs text-gray-400 mt-0.5">{planSummary.creditsLabel}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-lg font-bold text-sf-primary">{planSummary.priceLabel}</div>
              </div>
            </div>
          )}

          {isTestMode && onTestActivate && planSummary ? (
            <div className="p-4 rounded-xl border-2 border-amber-500/40 bg-amber-950/25 space-y-3">
              <div className="flex items-center gap-2 text-amber-300 font-semibold text-sm">
                <Beaker className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Admin Test Mode — Instant Activation ($0)</span>
              </div>
              <p className="text-xs text-amber-200/90 leading-relaxed">
                Whop operates exclusively in <strong>Live Mode</strong> (test card numbers like <code className="px-1 py-0.5 rounded bg-black/40 font-mono">4242…</code> are declined by Whop&apos;s live processor, and <code className="px-1 py-0.5 rounded bg-black/40 font-mono">whop.com</code> logs third-party guest/analytics warnings in DevTools). Click below to activate this plan and grant full credits immediately on SceneFlow AI Studio.
              </p>
              <Button
                onClick={() => onTestActivate(planSummary.key)}
                disabled={isTestActivating}
                className="w-full bg-amber-500 hover:bg-amber-400 text-black font-semibold flex items-center justify-center gap-2"
              >
                {isTestActivating ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    <span>Activating {planSummary.title}…</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Activate {planSummary.title} Instantly ($0 Test Mode)</span>
                  </>
                )}
              </Button>
            </div>
          ) : null}

          <div className="space-y-3 text-center">
            {!isTestMode && (
              <div className="w-12 h-12 mx-auto rounded-full bg-sf-primary/20 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-sf-primary" />
              </div>
            )}
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-white">
                {isTestMode ? 'Or Continue to Live Whop Checkout' : 'Secure Checkout via Whop'}
              </h4>
              <p className="text-gray-400 text-xs max-w-md mx-auto">
                {isTestMode
                  ? 'Requires a real payment method on whop.com. For live discount testing, apply promo code sceneflowtest100 at checkout.'
                  : 'You will be redirected to Whop to complete your purchase and automatically returned to SceneFlow AI Studio.'}
              </p>
            </div>

            {isTestMode && (
              <div className="flex items-center justify-center gap-2 text-xs text-gray-300">
                <span>Live Promo Code:</span>
                <button
                  type="button"
                  onClick={handleCopyPromo}
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 border border-gray-600 font-mono text-amber-300 transition-colors"
                >
                  <span>sceneflowtest100</span>
                  <Copy className="w-3 h-3" />
                </button>
                {copiedPromo && <span className="text-green-400">Copied!</span>}
              </div>
            )}

            {hostedCheckoutUrl ? (
              <Button
                onClick={() => window.location.assign(hostedCheckoutUrl)}
                variant={isTestMode ? 'outline' : 'default'}
                className={
                  isTestMode
                    ? 'w-full border-gray-600 text-gray-200 hover:bg-gray-800 flex items-center justify-center gap-2'
                    : 'w-full bg-sf-primary hover:bg-sf-accent text-white flex items-center justify-center gap-2'
                }
              >
                <span>{isTestMode ? 'Open Live Whop Checkout (whop.com)' : 'Continue to Secure Checkout'}</span>
                <ExternalLink className="w-4 h-4" />
              </Button>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 py-2">
                <Loader className="w-6 h-6 animate-spin text-sf-primary" />
                <p className="text-gray-400 text-sm">Preparing checkout session…</p>
              </div>
            )}
          </div>
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
