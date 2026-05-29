'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { signIn, useSession } from 'next-auth/react'
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { SceneFlowStudioBrand } from '@/components/layout/SceneFlowStudioBrand'
import { PricingTierGrid } from '@/components/landing/PricingTierGrid'
import { WhopCheckoutModal } from '@/components/billing/WhopCheckoutModal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

type InviteInfo = {
  fullName: string
  emailMasked: string
  expiresAt: string
  redeemed: boolean
  activatedAt: string | null
}

export default function EarlyAccessInvitePage() {
  const params = useParams<{ token: string }>()
  const token = params.token
  const { data: session, status: sessionStatus } = useSession()

  const [invite, setInvite] = useState<InviteInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activated, setActivated] = useState(false)

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [activating, setActivating] = useState(false)
  const [activateError, setActivateError] = useState<string | null>(null)

  const [checkoutTier, setCheckoutTier] = useState<string | null>(null)
  const [checkoutSessionId, setCheckoutSessionId] = useState<string | null>(null)
  const [checkoutReturnUrl, setCheckoutReturnUrl] = useState<string>('/dashboard/settings/billing?checkout=success')
  const [checkoutOpen, setCheckoutOpen] = useState(false)

  useEffect(() => {
    if (!token) return
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/early-access/invite/${encodeURIComponent(token)}`)
        const data = await res.json()
        if (!res.ok) {
          setError(data?.error || 'Invalid invite link')
          return
        }
        setInvite(data)
        setActivated(data.redeemed || Boolean(data.activatedAt))
      } catch {
        setError('Failed to load invite')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [token])

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault()
    setActivateError(null)

    if (password !== confirmPassword) {
      setActivateError('Passwords do not match')
      return
    }

    setActivating(true)
    try {
      const res = await fetch(`/api/early-access/invite/${encodeURIComponent(token)}/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setActivateError(data?.error || 'Activation failed')
        return
      }

      if (!data.existingAccount) {
        const signInResult = await signIn('credentials', {
          email: data.email,
          password,
          redirect: false,
        })
        if (signInResult?.error) {
          setActivateError('Account created but sign-in failed. Try logging in manually.')
          return
        }
      } else {
        setActivateError('An account with this email already exists. Sign in with your existing password to continue.')
        return
      }

      setActivated(true)
    } catch {
      setActivateError('Network error during activation')
    } finally {
      setActivating(false)
    }
  }

  const handleSelectTier = useCallback(
    async (tierId: string) => {
      if (!token || !session?.user) return

      setCheckoutTier(tierId)
      try {
        const res = await fetch(`/api/early-access/invite/${encodeURIComponent(token)}/checkout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tierName: tierId }),
        })
        const data = await res.json()

        if (data.redirectUrl) {
          window.location.href = data.redirectUrl
          return
        }

        if (!res.ok) {
          setError(data?.error || 'Checkout failed')
          setCheckoutTier(null)
          return
        }

        setCheckoutSessionId(data.sessionId)
        setCheckoutReturnUrl(data.returnUrl || checkoutReturnUrl)
        setCheckoutOpen(true)
      } catch {
        setError('Checkout request failed')
      } finally {
        setCheckoutTier(null)
      }
    },
    [token, session, checkoutReturnUrl]
  )

  const isSignedIn = sessionStatus === 'authenticated' && Boolean(session?.user)
  const canChoosePlan = activated && isSignedIn

  return (
    <main className="min-h-screen bg-[#050A18] text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex justify-center mb-8">
          <SceneFlowStudioBrand variant="landing" />
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-2 text-slate-300 py-20">
            <Loader2 className="w-5 h-5 animate-spin" />
            Validating invite...
          </div>
        )}

        {!loading && error && (
          <div className="max-w-lg mx-auto rounded-xl border border-red-500/40 bg-red-500/10 p-6 text-center">
            <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
            <h1 className="text-xl font-semibold text-red-100">{error}</h1>
            <p className="mt-2 text-sm text-red-200/80">
              Contact support if you believe this is an error.
            </p>
            <Link href="/" className="inline-block mt-4 text-cyan-300 hover:text-cyan-200 text-sm">
              Return to homepage
            </Link>
          </div>
        )}

        {!loading && invite && !error && (
          <div className="space-y-10">
            <section className="text-center max-w-2xl mx-auto">
              <p className="text-xs uppercase tracking-wider text-cyan-300">Early Access Invite</p>
              <h1 className="mt-3 text-3xl sm:text-4xl font-bold">
                Welcome, {invite.fullName}
              </h1>
              <p className="mt-4 text-slate-300">
                You're in the August 2026 cohort. Create your account, then choose the plan that fits your production workflow.
              </p>
              <p className="mt-2 text-sm text-slate-400">
                Approved email: {invite.emailMasked} · Expires {new Date(invite.expiresAt).toLocaleDateString()}
              </p>
            </section>

            {!canChoosePlan && (
              <section className="max-w-md mx-auto rounded-2xl border border-cyan-500/20 bg-slate-900/60 p-6">
                <h2 className="text-lg font-semibold mb-4">Create your SceneFlow account</h2>

                {activated && !isSignedIn ? (
                  <div className="space-y-4">
                    <p className="text-sm text-slate-300">
                      Your invite is activated. Sign in with the email from your application to choose a plan.
                    </p>
                    <Link href={`/login?callbackUrl=/early-access/invite/${token}`}>
                      <Button className="w-full bg-cyan-600 hover:bg-cyan-500">Sign in to continue</Button>
                    </Link>
                  </div>
                ) : (
                  <form onSubmit={handleActivate} className="space-y-4">
                    <label className="block text-sm">
                      <span className="text-slate-300">Username</span>
                      <Input
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="mt-1 bg-slate-800 border-slate-600"
                        required
                      />
                    </label>
                    <label className="block text-sm">
                      <span className="text-slate-300">Password</span>
                      <Input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="mt-1 bg-slate-800 border-slate-600"
                        minLength={8}
                        required
                      />
                    </label>
                    <label className="block text-sm">
                      <span className="text-slate-300">Confirm password</span>
                      <Input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="mt-1 bg-slate-800 border-slate-600"
                        minLength={8}
                        required
                      />
                    </label>
                    {activateError && (
                      <p className="text-sm text-red-400 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        {activateError}
                      </p>
                    )}
                    <Button
                      type="submit"
                      disabled={activating}
                      className="w-full bg-cyan-600 hover:bg-cyan-500"
                    >
                      {activating ? 'Creating account...' : 'Activate & continue'}
                    </Button>
                  </form>
                )}
              </section>
            )}

            {canChoosePlan && (
              <section>
                <div className="flex items-center justify-center gap-2 mb-8 text-emerald-300">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="text-sm font-medium">Account ready — choose your plan</span>
                </div>
                <PricingTierGrid
                  onSelectTier={handleSelectTier}
                  ctaLabel="Select plan"
                  explorerCtaLabel="Select Explorer"
                  loadingTier={checkoutTier}
                />
              </section>
            )}
          </div>
        )}
      </div>

      {checkoutOpen && checkoutSessionId && (
        <WhopCheckoutModal
          isOpen={checkoutOpen}
          sessionId={checkoutSessionId}
          returnUrl={checkoutReturnUrl}
          userEmail={session?.user?.email}
          onClose={() => {
            setCheckoutOpen(false)
            setCheckoutSessionId(null)
          }}
        />
      )}
    </main>
  )
}
