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
import { SHOWCASE_LOCALE_COPY } from '@/config/showcase/showcaseLocaleCopy'
import { resolveClientPortalLocale, type ClientPortalLocale } from '@/lib/intake/clientPortalCopy'
import { formatLandingCurrency } from '@/lib/i18n/landingCurrency'
import { getLocaleDirection } from '@/i18n/locale'

interface ShowcaseOrderView {
  orderId: string
  orderKind: 'express_blueprint_pass' | 'express_film_balance'
  status: 'pending_payment' | 'fulfilled' | 'failed'
  offerId: string
  offerTitle: string
  locale?: string
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
  const urlLang = searchParams?.get('lang')

  const [order, setOrder] = useState<ShowcaseOrderView | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pollCount, setPollCount] = useState(0)

  const locale: ClientPortalLocale = resolveClientPortalLocale(
    order?.locale || urlLang || 'en'
  )
  const copy = (SHOWCASE_LOCALE_COPY[locale] ?? SHOWCASE_LOCALE_COPY.en).orderPage
  const direction = getLocaleDirection(locale)
  const fmt = (usd: number) => formatLandingCurrency(usd, locale)

  const fetchOrder = useCallback(async () => {
    try {
      const qs = checkoutReturned ? '?checkout=success' : ''
      const res = await fetch(`/api/showcase/orders/${encodeURIComponent(orderId)}${qs}`, {
        cache: 'no-store',
      })
      const data = await res.json()
      if (!res.ok || !data.success || !data.order) {
        setError(data.error || copy.notFound)
        setLoading(false)
        return null
      }
      setOrder(data.order)
      setError(null)
      setLoading(false)
      return data.order as ShowcaseOrderView
    } catch {
      setError(copy.notFound)
      setLoading(false)
      return null
    }
  }, [orderId, checkoutReturned, copy.notFound])

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
    order?.orderKind === 'express_film_balance' ? copy.ctaContinuity : copy.ctaIntake

  return (
    <div
      dir={direction}
      lang={locale}
      className="min-h-screen overflow-x-clip bg-[#06080E] text-[#F5F2EB] flex flex-col"
    >
      <header className="border-b border-white/10 bg-[#0B0F1A]/90">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 min-h-[60px] py-2.5 sm:py-0 sm:h-16 flex items-center justify-between gap-3">
          <Link
            href={`/showcase?lang=${encodeURIComponent(locale)}`}
            className="flex items-center gap-2.5 min-w-0"
          >
            <div className="w-8 h-8 shrink-0 rounded-lg bg-gradient-to-br from-[#E6BE7E] to-[#C9974F] flex items-center justify-center">
              <Film className="w-4 h-4 text-[#090B12]" />
            </div>
            <span className="font-serif text-base sm:text-lg font-semibold text-white truncate">
              {SHOWCASE_BRAND_SNAPSHOT.brandName}
            </span>
          </Link>
          <span className="inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap text-[11px] sm:text-xs text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-[#DFB473]" />
            <span className="sm:hidden">{copy.whopBadgeShort}</span>
            <span className="hidden sm:inline">{copy.whopBadgeFull}</span>
          </span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-[#0C101B] p-6 sm:p-9 shadow-2xl space-y-6">
          {loading ? (
            <div className="py-10 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-[#DFB473] animate-spin mx-auto" />
              <p className="text-sm text-slate-300">{copy.loading}</p>
            </div>
          ) : error || !order ? (
            <div className="py-8 text-center space-y-4">
              <p className="text-base font-semibold text-white">{error || copy.notFound}</p>
              <Link
                href={`/showcase?lang=${encodeURIComponent(locale)}`}
                className="inline-flex items-center gap-2 rounded-full bg-[#DFB473] px-5 py-2.5 text-sm font-semibold text-[#090B12]"
              >
                {copy.returnCta}
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
                    {copy.confirmedTag}
                  </p>
                  <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-white mt-1">
                    {order.orderKind === 'express_film_balance'
                      ? copy.unlockedTitle
                      : `${copy.welcomePrefix} ${order.customerName}!`}
                  </h1>
                </div>
              </div>

              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                {order.orderKind === 'express_film_balance' ? copy.unlockedBody : copy.passBody}
              </p>

              <div className="rounded-2xl border border-[#DFB473]/25 bg-[#DFB473]/10 p-4 flex items-center gap-3 text-xs text-[#F0CB92]">
                <Mail className="w-4 h-4 shrink-0" />
                <span>{copy.emailCopiedNotice}</span>
              </div>

              <a
                href={nextPortalUrl}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#E6BE7E] to-[#C9974F] hover:from-[#F2D098] hover:to-[#D8A75E] px-6 py-4 text-sm sm:text-base font-semibold text-[#090B12] shadow-xl shadow-[#C9974F]/25 transition"
              >
                {nextCtaLabel}
                <ArrowRight className="w-4 h-4 shrink-0 rtl:rotate-180" />
              </a>
            </>
          ) : (
            <div className="space-y-5 text-center py-4">
              <Loader2 className="w-9 h-9 text-[#DFB473] animate-spin mx-auto" />
              <div className="space-y-2">
                <h1 className="font-serif text-2xl font-semibold text-white">
                  {checkoutReturned ? copy.finalizingTitle : copy.pendingTitle}
                </h1>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {checkoutReturned ? copy.finalizingBody : copy.pendingBody}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => void fetchOrder()}
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 hover:border-white/30 px-4 py-2 text-xs font-medium text-white transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  {copy.refreshBtn}
                </button>
                {order.whopPurchaseUrl && !checkoutReturned && (
                  <a
                    href={order.whopPurchaseUrl}
                    className="inline-flex items-center gap-2 rounded-full bg-[#DFB473] hover:bg-[#F0CB92] px-5 py-2 text-xs font-semibold text-[#090B12] transition"
                  >
                    {copy.resumeCheckoutPrefix} ({fmt(order.amountUsd)})
                    <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
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
