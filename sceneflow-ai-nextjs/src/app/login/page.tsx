'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { LoginForm } from '@/components/auth/LoginForm'
import { SignUpForm } from '@/components/auth/SignUpForm'
import { useAuthSuccessHandler } from '@/components/auth/useAuthSuccessHandler'
import { Button } from '@/components/ui/Button'
import { setPendingCheckoutTier } from '@/lib/billing/checkoutIntent'
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
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [redirectBlocked, setRedirectBlocked] = useState(false)
  const handleSuccess = useAuthSuccessHandler(mode)

  useEffect(() => {
    const returnUrl = searchParams.get('returnUrl')
    const checkoutTier = searchParams.get('checkoutTier')
    const modeParam = searchParams.get('mode')

    persistReturnUrl(
      returnUrl?.startsWith('/') ? returnUrl : getDashboardUrl()
    )

    if (checkoutTier) {
      setPendingCheckoutTier(checkoutTier)
    }

    if (modeParam === 'signup') {
      setMode('signup')
    } else {
      setMode('login')
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
      <div className="mb-8 text-center">
        <Link href="/" className="inline-flex items-center gap-3 group">
          <div className="w-11 h-11 bg-sf-surface-light rounded-xl flex items-center justify-center">
            <div className="w-6 h-6 bg-sf-primary rounded-lg flex items-center justify-center">
              <div className="w-3 h-3 bg-sf-background rounded-sm" />
            </div>
          </div>
          <span className="text-2xl font-bold tracking-tight">
            <span className="text-white">SceneFlow</span>
            <span className="text-sf-primary"> AI</span>
          </span>
        </Link>
      </div>

      {mode === 'login' ? (
        <LoginForm
          onSuccess={handleSuccess}
          onSwitchToSignUp={() => setMode('signup')}
        />
      ) : (
        <SignUpForm
          onSuccess={handleSuccess}
          onSwitchToLogin={() => setMode('login')}
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
