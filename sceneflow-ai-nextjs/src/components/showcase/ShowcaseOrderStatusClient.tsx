'use client'

import React, { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  ArrowRight,
  CheckCircle2,
  Film,
  Loader2,
  Mail,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react'
import { SHOWCASE_BRAND_SNAPSHOT } from '@/config/showcase/expressCinemaCatalog'

interface ShowcaseOrderView {
  orderId: string
  orderKind: 'express_blueprint_pass' | 'express_film_balance'
  status: 'pending_payment' | 'fulfilled' | 'failed'
  offerId: string
  offerTitle: string
  customerName: string
  honoreeOrTitle: string | null
  amountUsd: number
  totalPriceUsd: number
  balanceDueUsd: number
  intakeUrl: string | null
  continuityUrl: string | null
  whopPurchaseUrl: string | null
  paidAt: string | null
  fulfilledAt: string | null
}

export function ShowcaseOrderStatusClient({ orderId }: { orderId: string }) {
  const searchParams = useSearchParams()
  const checkoutReturned = searchParams?.get('checkout') === 'success'
  const [order, setOrder] = useState<ShowcaseOrderView | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pollCount, setPollCount] = useState(0)

  const fetchOrder = useCallback(async () => {
    try {
      const qs = checkoutReturned ? '?checkout=success' : ''
      const res = await fetch(`/api/showcase/orders/${encodeURIComponent(orderId)}${qs}`, {
        cache: 'no-store',
      })
      const data = await res.json()
      if (!res.ok || !data.success || !data.order) {
        setError(data.error || 'Order not found')
        setLoading(false)
        return null
      }
      setOrder(data.order)
      setError(null)
      setLoading(false)
      return data.order as ShowcaseOrderView
    } catch {
      setError('Could not load order status. Please refresh in a moment.')
      setLoading(false)
      return null
    }
  }, [orderId, checkoutReturned])

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null
    let cancelled = false

    const run = async () => {
      const latest = await fetchOrder()
      if (
        !cancelled &&
        latest &&
        latest.status === 'pending_payment' &&
        checkoutReturned &&
        pollCount < 8
      ) {
        timer = setTimeout(() => setPollCount((c) => c + 1), 2500)
      }
    }

    void run()
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [fetchOrder, checkoutReturned, pollCount])

  const nextPortalUrl =
    order?.orderKind === 'express_film_balance' ? order?.continuityUrl : order?.intakeUrl
  const nextCtaLabel =
    order?.orderKind === 'express_film_balance'
      ? 'Open My Continuity Photo Library'
      : 'Start My 5-Minute Guided Story Interview'

  return (
    <div className="min-h-screen bg-[#06080E] text-[#F5F2EB] flex flex-col">
      <header className="border-b border-white/10 bg-[#0B0F1A]/90">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/showcase" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#E6BE7E] to-[#C9974F] flex items-center justify-center">
              <Film className="w-4 h-4 text-[#090B12]" />
            </div>
            <span className="font-serif text-lg font-semibold text-white">
              {SHOWCASE_BRAND_SNAPSHOT.brandName}
            </span>
          </Link>
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-[#DFB473]" />
            Whop Merchant of Record
          </span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-[#0C101B] p-6 sm:p-9 shadow-2xl space-y-6">
          {loading ? (
            <div className="py-10 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-[#DFB473] animate-spin mx-auto" />
              <p className="text-sm text-slate-300">Confirming your Whop checkout...</p>
            </div>
          ) : error || !order ? (
            <div className="py-8 text-center space-y-4">
              <p className="text-base font-semibold text-white">{error || 'Order not found'}</p>
              <Link
                href="/showcase"
                className="inline-flex items-center gap-2 rounded-full bg-[#DFB473] px-5 py-2.5 text-sm font-semibold text-[#090B12]"
              >
                Return to Keepsake Cinema
              </Link>
            </div>
          ) : order.status === 'fulfilled' && nextPortalUrl ? (
            <>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/35 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-emerald-300">
                    Payment Confirmed · Ready Now
                  </p>
                  <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-white mt-1">
                    {order.orderKind === 'express_film_balance'
                      ? 'Your Express 4K Film Is Unlocked!'
                      : `Welcome, ${order.customerName}!`}
                  </h1>
                </div>
              </div>

              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                {order.orderKind === 'express_film_balance'
                  ? `Thank you for completing your $${order.amountUsd} Express 4K balance. Your private Continuity Photo Library is live now—upload real photos from your phone and add a 10-second name/town pronunciation guide so we can produce your Same-Day 4K Cinema Film.`
                  : `Your $${order.amountUsd} Storyboard Blueprint Pass for "${order.honoreeOrTitle || order.offerTitle}" is active (100% credited toward your $${order.totalPriceUsd} Express 4K Film). Launch your guided story interview right now—or open the magic link we just emailed you.`}
              </p>

              <div className="rounded-2xl border border-[#DFB473]/25 bg-[#DFB473]/10 p-4 flex items-center gap-3 text-xs text-[#F0CB92]">
                <Mail className="w-4 h-4 shrink-0" />
                <span>
                  A private copy of this magic link has also been sent to your email so you can
                  resume from phone or desktop anytime.
                </span>
              </div>

              <a
                href={nextPortalUrl}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#E6BE7E] to-[#C9974F] hover:from-[#F2D098] hover:to-[#D8A75E] px-6 py-4 text-sm sm:text-base font-semibold text-[#090B12] shadow-xl shadow-[#C9974F]/25 transition"
              >
                {nextCtaLabel}
                <ArrowRight className="w-4 h-4" />
              </a>
            </>
          ) : (
            <div className="space-y-5 text-center py-4">
              <Loader2 className="w-9 h-9 text-[#DFB473] animate-spin mx-auto" />
              <div className="space-y-2">
                <h1 className="font-serif text-2xl font-semibold text-white">
                  {checkoutReturned
                    ? 'Finalizing Your Studio Portal...'
                    : 'Checkout Pending'}
                </h1>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {checkoutReturned
                    ? 'We are confirming your Whop payment and spinning up your private studio link. This usually takes just a few seconds.'
                    : `Complete your $${order.amountUsd} Whop checkout to instantly unlock your private studio portal.`}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => void fetchOrder()}
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 hover:border-white/30 px-4 py-2 text-xs font-medium text-white transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Refresh Status
                </button>
                {order.whopPurchaseUrl && !checkoutReturned && (
                  <a
                    href={order.whopPurchaseUrl}
                    className="inline-flex items-center gap-2 rounded-full bg-[#DFB473] hover:bg-[#F0CB92] px-5 py-2 text-xs font-semibold text-[#090B12] transition"
                  >
                    Resume Whop Checkout (${order.amountUsd})
                    <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
