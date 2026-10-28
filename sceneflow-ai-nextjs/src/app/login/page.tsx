'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Sparkles, ShieldCheck } from 'lucide-react'
import { LoginForm } from '@/components/auth/LoginForm'
import { SignUpForm } from '@/components/auth/SignUpForm'
import { SceneFlowStudioBrand } from '@/components/layout/SceneFlowStudioBrand'
import { useAuthSuccessHandler } from '@/components/auth/useAuthSuccessHandler'
import { Button } from '@/components/ui/Button'
import { setPendingCheckoutTier } from '@/lib/billing/checkoutIntent'
import { normalizeTierName, TIER_CATALOG } from '@/lib/billing/tierCatalog'
import {
  clearDashboardRedirectAttempts,
  getDashboardUrl,
  hasExceededDashboardRedirectAttempts,
  navigateAfterAuth,
  persistReturnUrl,
  resolvePostLoginPath,
} from '@/lib/auth/postLoginRedirect'

function LoginPageContent() {
  const searchParams = useSearchParams()
  const { status } = useSession()
  const [redirectBlocked, setRedirectBlocked] = useState(false)
  const initialModeParam = searchParams.get('mode') === 'signup' ? 'signup' : 'login'
  const [authMode, setAuthMode] = useState<'login' | 'signup'>(initialModeParam)
  const handleSuccess = useAuthSuccessHandler(authMode)

  const rawCheckoutTier = searchParams.get('checkoutTier')
  const normalizedTier = rawCheckoutTier ? normalizeTierName(rawCheckoutTier) : null
  const selectedTierDef = normalizedTier ? TIER_CATALOG[normalizedTier] : null

  const selectedTierLabel = selectedTierDef
    ? `${selectedTierDef.displayName.split('—')[0].trim()} ($${selectedTierDef.priceUsd}${selectedTierDef.isOneTime ? '' : '/mo'})`
    : null
  const selectedTierSummary = selectedTierDef
    ? `${selectedTierDef.displayName} — $${selectedTierDef.priceUsd}${selectedTierDef.isOneTime ? ' one-time' : '/mo'} (${selectedTierDef.credits.toLocaleString()} credits + ${selectedTierDef.storageGb} GB Vault)`
    : null

  useEffect(() => {
    const modeParam = searchParams.get('mode')
    if (modeParam === 'signup' || modeParam === 'login') {
      setAuthMode(modeParam)
    }

    const returnUrl = searchParams.get('returnUrl')
    const checkoutTier = searchParams.get('checkoutTier')

    persistReturnUrl(
      returnUrl?.startsWith('/') ? returnUrl : getDashboardUrl()
    )

    if (checkoutTier) {
      setPendingCheckoutTier(checkoutTier)
    }

    setRedirectBlocked(hasExceededDashboardRedirectAttempts())
  }, [searchParams])

  const attemptAuthenticatedRedirect = useCallback(() => {
    if (hasExceededDashboardRedirectAttempts()) {
      setRedirectBlocked(true)
      return
    }
    navigateAfterAuth(resolvePostLoginPath())
  }, [])

  useEffect(() => {
    if (status !== 'authenticated') return
    if (redirectBlocked) return
    attemptAuthenticatedRedirect()
  }, [status, redirectBlocked, attemptAuthenticatedRedirect])

  const handleRetryDashboard = () => {
    clearDashboardRedirectAttempts()
    setRedirectBlocked(false)
    attemptAuthenticatedRedirect()
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-sf-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (status === 'authenticated' && !redirectBlocked) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-sf-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (status === 'authenticated' && redirectBlocked) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4 py-12">
        <div className="max-w-md w-full text-center space-y-4">
          <h1 className="text-2xl font-bold text-white">Could not open dashboard</h1>
          <p className="text-gray-400 text-sm">
            You are signed in, but the app could not complete the redirect to your dashboard.
            Try signing out and back in. If this persists, the server may be missing{' '}
            <code className="text-gray-300">NEXTAUTH_SECRET</code> in its environment configuration.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Button onClick={handleRetryDashboard} className="bg-sf-primary hover:bg-sf-accent text-sf-background">
              Retry dashboard
            </Button>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-md border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800"
            >
              Back to home
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4 py-12">
      <div className="mb-6 text-center">
        <SceneFlowStudioBrand
          href="/"
          variant="landing"
          nameClassName="text-white"
        />
      </div>

      {/* Selected Plan Banner (when arriving from a pricing CTA) */}
      {selectedTierDef && (
        <div className="w-full max-w-md mb-5 rounded-2xl border border-purple-500/30 bg-gradient-to-r from-purple-950/40 via-slate-900/80 to-cyan-950/30 p-4 shadow-lg">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <Sparkles className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-purple-300">
                  Selected Plan • Step 1 of 2
                </p>
                <p className="text-sm font-semibold text-white mt-0.5">
                  {selectedTierDef.displayName}
                </p>
                <p className="text-xs text-gray-300 mt-1">
                  {selectedTierDef.credits.toLocaleString()} {selectedTierDef.isOneTime ? 'credits' : 'credits/mo'} •{' '}
                  {selectedTierDef.storageGb} GB Continuity Vault
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-lg font-bold text-white">
                ${selectedTierDef.priceUsd}
              </span>
              <span className="block text-[11px] text-gray-400">
                {selectedTierDef.isOneTime ? 'one-time' : '/month'}
              </span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center gap-1.5 text-[11px] text-gray-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>
              Create your account or sign in below — secure Whop checkout opens immediately after.
            </span>
          </div>
        </div>
      )}

      {/* Mode Switcher Tabs */}
      <div className="w-full max-w-md mb-4 grid grid-cols-2 rounded-xl bg-gray-900/80 p-1 border border-gray-800">
        <button
          type="button"
          onClick={() => setAuthMode('signup')}
          className={`rounded-lg py-2 text-sm font-semibold transition-all ${
            authMode === 'signup'
              ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Create Account
        </button>
        <button
          type="button"
          onClick={() => setAuthMode('login')}
          className={`rounded-lg py-2 text-sm font-semibold transition-all ${
            authMode === 'login'
              ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Sign In
        </button>
      </div>

      {authMode === 'signup' ? (
        <SignUpForm
          onSuccess={handleSuccess}
          onSwitchToLogin={() => setAuthMode('login')}
          selectedTierLabel={selectedTierLabel}
          selectedTierSummary={selectedTierSummary}
        />
      ) : (
        <LoginForm
          onSuccess={handleSuccess}
          onSwitchToSignUp={() => setAuthMode('signup')}
          selectedTierLabel={selectedTierLabel}
        />
      )}

      <Link
        href="/"
        className="mt-8 text-sm text-gray-400 hover:text-white transition-colors"
      >
        Back to home
      </Link>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-950 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-sf-primary border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  )
}
