'use client'

import { useCallback, useEffect, useId, useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  Send,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react'
import {
  getDefaultCreditsForTier,
  getPrelaunchTierPreset,
  PRELAUNCH_TIER_PRESETS,
  PRELAUNCH_USE_CASE_OPTIONS,
} from '@/lib/billing/prelaunchAccess'
import { getSignupUrlForTier } from '@/lib/billing/checkoutIntent'
import { getLoginUrl } from '@/lib/auth/postLoginRedirect'

export const PRELAUNCH_MODAL_EVENT = 'sceneflow:open-prelaunch-access'

export interface OpenPrelaunchModalDetail {
  tier?: string
  source?: string
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Open the Landing Page Pre-Launch Access Request modal from any CTA.
 * Returns `true` if the mounted modal handled the event, `false` otherwise.
 */
export function openPrelaunchAccessModal(detail: OpenPrelaunchModalDetail = {}): boolean {
  if (typeof window === 'undefined') return false
  const event = new CustomEvent<OpenPrelaunchModalDetail>(PRELAUNCH_MODAL_EVENT, {
    detail,
    cancelable: true,
  })
  window.dispatchEvent(event)
  return event.defaultPrevented
}

function normalizeTierId(tier?: string | null): string {
  const normalized = (tier || '').trim().toLowerCase()
  if (!normalized) return 'explorer'
  if (normalized === 'trial' || normalized === 'coffee_break') return 'explorer'
  const exists = PRELAUNCH_TIER_PRESETS.some((preset) => preset.id === normalized)
  return exists ? normalized : 'explorer'
}

export function PrelaunchAccessModal() {
  const { data: session } = useSession()
  const titleId = useId()

  const [isOpen, setIsOpen] = useState(false)
  const [source, setSource] = useState<string>('landing')
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [useCase, setUseCase] = useState<string>(PRELAUNCH_USE_CASE_OPTIONS[0].value)
  const [requestedTier, setRequestedTier] = useState<string>('explorer')
  const [projectDetails, setProjectDetails] = useState('')
  const [websiteHoneypot, setWebsiteHoneypot] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submittedRecord, setSubmittedRecord] = useState<{
    email: string
    tierLabel: string
    credits: number
    message: string
  } | null>(null)

  // Pre-fill from active session if signed in
  useEffect(() => {
    if (session?.user?.email && !email) {
      setEmail(session.user.email)
    }
    if (session?.user?.name && !fullName) {
      setFullName(session.user.name)
    }
  }, [session?.user?.email, session?.user?.name, email, fullName])

  const openModalWith = useCallback((detail?: OpenPrelaunchModalDetail) => {
    setRequestedTier(normalizeTierId(detail?.tier))
    setSource(detail?.source || 'landing')
    setError(null)
    setSubmittedRecord(null)
    setIsOpen(true)
  }, [])

  // Listen for custom open events from all landing page CTAs
  useEffect(() => {
    const handler = (rawEvent: Event) => {
      const event = rawEvent as CustomEvent<OpenPrelaunchModalDetail>
      event.preventDefault()
      openModalWith(event.detail)
    }
    window.addEventListener(PRELAUNCH_MODAL_EVENT, handler)
    return () => window.removeEventListener(PRELAUNCH_MODAL_EVENT, handler)
  }, [openModalWith])

  // Support deep links like /?requestAccess=1&tier=pro or #request-access
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const hash = window.location.hash.toLowerCase()
    if (params.get('requestAccess') === '1' || hash === '#request-access') {
      openModalWith({
        tier: params.get('tier') || params.get('checkoutTier') || 'explorer',
        source: 'deep-link',
      })
    }
  }, [openModalWith])

  // Escape key + body scroll lock while open
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const selectedPreset = getPrelaunchTierPreset(requestedTier)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (submitting) return

    const cleanEmail = email.trim()
    if (!cleanEmail || !EMAIL_PATTERN.test(cleanEmail)) {
      setError('Please enter a valid email address.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const credits = getDefaultCreditsForTier(requestedTier)
      const res = await fetch('/api/access-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestType: 'initial_access',
          email: cleanEmail,
          fullName: fullName.trim() || null,
          companyName: companyName.trim() || null,
          useCase,
          requestedTier,
          requestedCredits: credits,
          projectDetails: projectDetails.trim() || null,
          source,
          website: websiteHoneypot,
        }),
      })

      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean
        error?: string
        message?: string
      }

      if (!res.ok) {
        throw new Error(data.message || data.error || 'Could not submit your request. Please try again.')
      }

      setSubmittedRecord({
        email: cleanEmail,
        tierLabel: selectedPreset.label,
        credits,
        message:
          data.message ||
          'Your pre-launch Studio access request has been submitted for admin review.',
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit request right now.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Dialog Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="relative z-10 w-full max-w-lg max-h-[92dvh] overflow-y-auto rounded-2xl border border-cyan-500/30 bg-slate-950 shadow-2xl shadow-cyan-950/50"
          >
            {/* Header */}
            <div className="relative border-b border-slate-800/80 bg-gradient-to-r from-cyan-500/15 via-slate-900 to-emerald-500/15 px-5 pt-5 pb-4 sm:px-6">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close Pre-Launch Access dialog"
                className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/35 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-300">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
                <span>Pre-Launch Invite Access · No Payment Today</span>
              </div>

              <h2
                id={titleId}
                className="mt-2.5 pr-8 text-xl font-bold tracking-tight text-white sm:text-2xl"
              >
                Request Pre-Launch Studio Access
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-gray-300 sm:text-sm">
                Tell us what you&apos;re building. Our team reviews requests daily and activates
                your workspace tier and Studio credits directly on your email.
              </p>
            </div>

            {/* Body */}
            <div className="px-5 py-5 sm:px-6">
              {submittedRecord ? (
                <div className="space-y-5 py-2 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-emerald-400/40 bg-emerald-500/15">
                    <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-white sm:text-xl">
                      Pre-Launch Access Request Received
                    </h3>
                    <p className="mt-1.5 text-sm text-gray-300">{submittedRecord.message}</p>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 text-left text-xs sm:text-sm space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-gray-400">Email</span>
                      <span className="font-medium text-white">{submittedRecord.email}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-gray-400">Requested Tier</span>
                      <span className="font-medium text-cyan-300">{submittedRecord.tierLabel}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-gray-400">Requested Allocation</span>
                      <span className="font-medium text-emerald-300">
                        {submittedRecord.credits.toLocaleString()} credits
                      </span>
                    </div>
                  </div>

                  <p className="text-xs leading-relaxed text-gray-400">
                    Want to get a head start? Create your free SceneFlow account with{' '}
                    <strong className="text-gray-200">{submittedRecord.email}</strong> now so your
                    approved tier and credits attach automatically upon approval.
                  </p>

                  <div className="flex flex-col gap-2.5 sm:flex-row sm:justify-center">
                    <Link
                      href={getSignupUrlForTier(requestedTier)}
                      onClick={() => setIsOpen(false)}
                      className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 via-teal-400 to-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 hover:brightness-110 transition-all"
                    >
                      <span>Create Account Now</span>
                      <ArrowRight className="h-4 w-4" aria-hidden />
                    </Link>
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-700 bg-slate-900 px-5 py-2.5 text-sm font-medium text-gray-200 hover:bg-slate-800 transition-colors"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} noValidate className="space-y-4">
                  {/* Anti-spam honeypot */}
                  <div className="sr-only" aria-hidden="true">
                    <label htmlFor="prelaunch-website">Website</label>
                    <input
                      id="prelaunch-website"
                      name="website"
                      type="text"
                      tabIndex={-1}
                      autoComplete="off"
                      value={websiteHoneypot}
                      onChange={(e) => setWebsiteHoneypot(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                    <label className="block text-left">
                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-300">
                        Email Address <span className="text-cyan-400">*</span>
                      </span>
                      <input
                        type="email"
                        required
                        autoComplete="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value)
                          if (error) setError(null)
                        }}
                        placeholder="you@studio.com"
                        className="mt-1.5 h-11 w-full rounded-xl border border-slate-700 bg-slate-900/90 px-3.5 text-sm text-white placeholder:text-gray-500 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                      />
                    </label>

                    <label className="block text-left">
                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-300">
                        Full Name
                      </span>
                      <input
                        type="text"
                        autoComplete="name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Alex Rivera"
                        className="mt-1.5 h-11 w-full rounded-xl border border-slate-700 bg-slate-900/90 px-3.5 text-sm text-white placeholder:text-gray-500 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                    <label className="block text-left">
                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-300">
                        Studio / Company
                      </span>
                      <input
                        type="text"
                        autoComplete="organization"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="Optional"
                        className="mt-1.5 h-11 w-full rounded-xl border border-slate-700 bg-slate-900/90 px-3.5 text-sm text-white placeholder:text-gray-500 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                      />
                    </label>

                    <label className="block text-left">
                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-300">
                        Primary Use Case
                      </span>
                      <select
                        value={useCase}
                        onChange={(e) => setUseCase(e.target.value)}
                        className="mt-1.5 h-11 w-full rounded-xl border border-slate-700 bg-slate-900/90 px-3 text-sm text-white focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                      >
                        {PRELAUNCH_USE_CASE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <label className="block text-left">
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-300">
                      Preferred Pre-Launch Tier
                    </span>
                    <select
                      value={requestedTier}
                      onChange={(e) => setRequestedTier(e.target.value)}
                      className="mt-1.5 h-11 w-full rounded-xl border border-slate-700 bg-slate-900/90 px-3 text-sm text-white focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                    >
                      {PRELAUNCH_TIER_PRESETS.map((preset) => (
                        <option key={preset.id} value={preset.id}>
                          {preset.label}
                        </option>
                      ))}
                    </select>
                    <span className="mt-1 flex items-center gap-1.5 text-[11px] text-emerald-300/90">
                      <Sparkles className="h-3 w-3 shrink-0" aria-hidden />
                      Includes {selectedPreset.defaultCredits.toLocaleString()} admin-allocated
                      Studio credits upon approval ({selectedPreset.defaultDurationDays}-day access).
                    </span>
                  </label>

                  <label className="block text-left">
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-300">
                      What are you planning to produce? (Optional)
                    </span>
                    <textarea
                      rows={2}
                      value={projectDetails}
                      onChange={(e) => setProjectDetails(e.target.value)}
                      placeholder="e.g., 5-minute family tribute film, episodic sci-fi pilot, client commercial series..."
                      className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-900/90 px-3.5 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                    />
                  </label>

                  {error && (
                    <div
                      role="alert"
                      className="rounded-xl border border-red-500/40 bg-red-500/10 px-3.5 py-2.5 text-xs font-medium text-red-200"
                    >
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 via-teal-400 to-cyan-500 px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/25 transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        <span>Submitting Request...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" aria-hidden />
                        <span>Submit Pre-Launch Access Request</span>
                      </>
                    )}
                  </button>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-gray-400">
                    <span>No credit card required.</span>
                    <Link
                      href={getLoginUrl({ mode: 'login' })}
                      onClick={() => setIsOpen(false)}
                      className="font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
                    >
                      Already approved? Sign in →
                    </Link>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export default PrelaunchAccessModal
