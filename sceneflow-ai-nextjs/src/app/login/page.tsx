'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { LoginForm } from '@/components/auth/LoginForm'
import { SignUpForm } from '@/components/auth/SignUpForm'
import { useAuthSuccessHandler } from '@/components/auth/useAuthSuccessHandler'
import { setPendingCheckoutTier } from '@/lib/billing/checkoutIntent'
import {
  getDashboardUrl,
  navigateAfterAuth,
  persistReturnUrl,
  resolvePostLoginPath,
} from '@/lib/auth/postLoginRedirect'

function LoginPageContent() {
  const searchParams = useSearchParams()
  const { status } = useSession()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
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
  }, [searchParams])

  useEffect(() => {
    if (status === 'authenticated') {
      navigateAfterAuth(resolvePostLoginPath())
    }
  }, [status])

  if (status === 'loading' || status === 'authenticated') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-sf-primary border-t-transparent rounded-full animate-spin" />
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
