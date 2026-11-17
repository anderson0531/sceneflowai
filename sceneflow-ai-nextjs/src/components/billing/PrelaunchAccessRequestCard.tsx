'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Loader,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  XCircle,
  Zap,
} from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import {
  getDefaultCreditsForTier,
  PRELAUNCH_TIER_PRESETS,
  PRELAUNCH_USE_CASE_OPTIONS,
} from '@/lib/billing/prelaunchAccess'

interface UserAccessRequestItem {
  id: string
  email: string
  full_name: string | null
  company_name: string | null
  use_case: string | null
  requested_tier: string | null
  requested_credits: number | null
  project_details: string | null
  request_type: 'initial_access' | 'additional_credits'
  status: 'pending' | 'approved' | 'declined' | 'revoked'
  granted_tier: string | null
  granted_credits: number | null
  admin_notes: string | null
  created_at: string
  reviewed_at: string | null
}

export interface PrelaunchAccessRequestCardProps {
  hasActiveAccess: boolean
  selectedTier?: string | null
  onSelectTierChange?: (tierId: string) => void
  userEmail?: string | null
  userName?: string | null
  isAdmin?: boolean
  onRefreshSubscription: () => Promise<unknown>
}

export function PrelaunchAccessRequestCard({
  hasActiveAccess,
  selectedTier,
  onSelectTierChange,
  userEmail,
  userName,
  isAdmin = false,
  onRefreshSubscription,
}: PrelaunchAccessRequestCardProps) {
  const [requests, setRequests] = useState<UserAccessRequestItem[]>([])
  const [loadingRequests, setLoadingRequests] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [refreshingStatus, setRefreshingStatus] = useState(false)

  // Initial access form state
  const [fullName, setFullName] = useState(userName || '')
  const [companyName, setCompanyName] = useState('')
  const [useCase, setUseCase] = useState(PRELAUNCH_USE_CASE_OPTIONS[0].value)
  const [requestedTier, setRequestedTier] = useState(selectedTier || 'explorer')
  const [projectDetails, setProjectDetails] = useState('')

  // Additional credits form state (for already-approved users)
  const [additionalCredits, setAdditionalCredits] = useState('2500')
  const [creditReason, setCreditReason] = useState('')

  useEffect(() => {
    if (userName && !fullName) {
      setFullName(userName)
    }
  }, [userName, fullName])

  useEffect(() => {
    if (selectedTier) {
      const normalized = selectedTier.trim().toLowerCase()
      const exists = PRELAUNCH_TIER_PRESETS.some((p) => p.id === normalized)
      if (exists) {
        setRequestedTier(normalized)
      }
    }
  }, [selectedTier])

  const loadRequests = useCallback(async () => {
    try {
      setLoadingRequests(true)
      const res = await fetch('/api/access-requests')
      if (res.ok) {
        const data = await res.json()
        setRequests(Array.isArray(data.requests) ? data.requests : [])
      }
    } catch (err) {
      console.error('[PrelaunchAccessRequestCard] Failed to load requests:', err)
    } finally {
      setLoadingRequests(false)
    }
  }, [])

  useEffect(() => {
    void loadRequests()
  }, [loadRequests])

  const handleRefreshAll = async () => {
    setRefreshingStatus(true)
    try {
      await Promise.all([onRefreshSubscription(), loadRequests()])
      toast.message('Access and credit status refreshed.')
    } finally {
      setRefreshingStatus(false)
    }
  }

  const handleInitialSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch('/api/access-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestType: 'initial_access',
          fullName,
          companyName,
          useCase,
          requestedTier,
          requestedCredits: getDefaultCreditsForTier(requestedTier),
          projectDetails,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Could not submit request')
      }
      toast.success(data.message || 'Pre-launch access request submitted!')
      await loadRequests()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit request')
    } finally {
      setSubmitting(false)
    }
  }

  const handleAdditionalCreditsSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const amount = Math.max(100, Math.round(Number(additionalCredits || 0)))
    setSubmitting(true)
    try {
      const res = await fetch('/api/access-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestType: 'additional_credits',
          fullName,
          requestedCredits: amount,
          projectDetails: creditReason,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Could not submit credit request')
      }
      toast.success(data.message || 'Additional credits request submitted!')
      setCreditReason('')
      await loadRequests()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit request')
    } finally {
      setSubmitting(false)
    }
  }

  const latestInitialRequest = requests.find((r) => r.request_type === 'initial_access')
  const pendingCreditRequest = requests.find(
    (r) => r.request_type === 'additional_credits' && r.status === 'pending'
  )

  return (
    <div id="prelaunch-access-request" className="space-y-4 scroll-mt-24">
      {isAdmin && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-cyan-500/40 bg-cyan-950/30 p-4 text-cyan-100">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
            <div className="text-sm">
              <div className="font-semibold text-white">Admin Pre-Launch Control Active</div>
              <p className="text-cyan-200/90 mt-0.5">
                Whop self-serve checkout is paused for users. Review pending access requests, grant tiers, and set exact user credit balances in the Admin Console.
              </p>
            </div>
          </div>
          <Link
            href="/admin/access"
            className="inline-flex items-center justify-center rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400 shrink-0 transition-colors"
          >
            Open Admin Access Console <ArrowRight className="w-4 h-4 ml-1.5" />
          </Link>
        </div>
      )}

      {!hasActiveAccess ? (
        <Card className="border-emerald-500/40 bg-gradient-to-br from-slate-900 via-gray-900 to-emerald-950/25 text-white shadow-xl">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-300 mb-0.5">
                    <span>Pre-Launch Invite Access • No Payment Required</span>
                  </div>
                  <CardTitle className="text-xl font-bold text-white">
                    Request Studio Access & Pre-Launch Credits
                  </CardTitle>
                  <CardDescription className="text-gray-300">
                    Self-serve billing is paused during pre-launch. Submit your production profile below and an admin will activate your workspace and starting credit allocation.
                  </CardDescription>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={refreshingStatus}
                onClick={handleRefreshAll}
                className="border-gray-700 text-gray-200 hover:bg-gray-800 shrink-0"
              >
                {refreshingStatus ? (
                  <Loader className="w-4 h-4 animate-spin mr-1.5" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-1.5" />
                )}
                Check Approval Status
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-5">
            {!loadingRequests && latestInitialRequest?.status === 'pending' && (
              <div className="rounded-xl border border-amber-500/40 bg-amber-950/30 p-4 text-sm text-amber-100">
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="font-semibold text-white">
                      Your Pre-Launch Access Request Is Pending Admin Review
                    </div>
                    <p className="text-amber-200/90">
                      Submitted for <strong>{latestInitialRequest.email}</strong> (Requested tier:{' '}
                      <strong className="capitalize">
                        {latestInitialRequest.requested_tier?.replace('_', ' ') || 'Explorer'}
                      </strong>
                      ). Once approved, click <strong>Check Approval Status</strong> above or refresh to enter SceneFlow Studio immediately. You can also update your request details below.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {!loadingRequests &&
              (latestInitialRequest?.status === 'declined' ||
                latestInitialRequest?.status === 'revoked') && (
                <div className="rounded-xl border border-rose-500/40 bg-rose-950/30 p-4 text-sm text-rose-100">
                  <div className="flex items-start gap-3">
                    <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <div className="font-semibold text-white capitalize">
                        Previous Request Status: {latestInitialRequest.status}
                      </div>
                      {latestInitialRequest.admin_notes && (
                        <p className="text-rose-200/90">Note: {latestInitialRequest.admin_notes}</p>
                      )}
                      <p className="text-rose-200/80">
                        You may submit an updated pre-launch access request below.
                      </p>
                    </div>
                  </div>
                </div>
              )}

            <form onSubmit={handleInitialSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-300">Account Email</label>
                <Input
                  type="email"
                  value={userEmail || ''}
                  disabled
                  className="bg-gray-950/70 border-gray-800 text-gray-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-300">Full Name</label>
                <Input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your name"
                  className="bg-gray-900/90 border-gray-700 text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-300">
                  Studio, Agency, or Channel Name (Optional)
                </label>
                <Input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Horizon Stories Studio"
                  className="bg-gray-900/90 border-gray-700 text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-300">Primary Use Case</label>
                <select
                  value={useCase}
                  onChange={(e) => setUseCase(e.target.value)}
                  className="w-full h-10 rounded-md border border-gray-700 bg-gray-900/90 px-3 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  {PRELAUNCH_USE_CASE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-medium text-gray-300">
                  Desired Pre-Launch Workspace Tier
                </label>
                <select
                  value={requestedTier}
                  onChange={(e) => {
                    setRequestedTier(e.target.value)
                    onSelectTierChange?.(e.target.value)
                  }}
                  className="w-full h-10 rounded-md border border-gray-700 bg-gray-900/90 px-3 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  {PRELAUNCH_TIER_PRESETS.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-medium text-gray-300">
                  What would you like to build during pre-launch?
                </label>
                <textarea
                  rows={3}
                  required
                  value={projectDetails}
                  onChange={(e) => setProjectDetails(e.target.value)}
                  placeholder="Briefly share your project goals, video format, or client workflow so we can allocate appropriate pre-launch credits..."
                  className="w-full rounded-md border border-gray-700 bg-gray-900/90 p-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="md:col-span-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <p className="text-xs text-gray-400">
                  No credit card or Whop payment is collected. Approved accounts receive direct Studio access and admin-allocated credits.
                </p>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-semibold px-6 shrink-0"
                >
                  {submitting ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin mr-2" />
                      Submitting…
                    </>
                  ) : latestInitialRequest?.status === 'pending' ? (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Update Access Request
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Submit Pre-Launch Access Request
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-emerald-500/35 bg-gray-900/80 text-white">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-white">
                    Pre-Launch Studio Access Active
                  </CardTitle>
                  <CardDescription className="text-gray-300">
                    Your account is approved for pre-launch Studio production. Need additional credits for testing or a production run? Request a credit top-up below.
                  </CardDescription>
                </div>
              </div>
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-lg bg-sf-primary hover:bg-sf-accent px-4 py-2 text-sm font-semibold text-white shrink-0 transition-colors"
              >
                Go to Studio <ArrowRight className="w-4 h-4 ml-1.5" />
              </Link>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {pendingCreditRequest && (
              <div className="rounded-lg border border-amber-500/35 bg-amber-950/25 p-3 text-xs sm:text-sm text-amber-100 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    Pending request for{' '}
                    <strong>
                      {(pendingCreditRequest.requested_credits || 0).toLocaleString()} additional credits
                    </strong>{' '}
                    is awaiting admin review.
                  </span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleRefreshAll}
                  disabled={refreshingStatus}
                  className="border-amber-500/40 text-amber-200 hover:bg-amber-900/30 shrink-0"
                >
                  Refresh
                </Button>
              </div>
            )}

            <form
              onSubmit={handleAdditionalCreditsSubmit}
              className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end rounded-xl border border-gray-800 bg-gray-950/60 p-4"
            >
              <div className="md:col-span-3 space-y-1.5">
                <label className="text-xs font-medium text-gray-300 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-amber-400" /> Additional Credits Needed
                </label>
                <Input
                  type="number"
                  min={100}
                  max={500000}
                  step={100}
                  required
                  value={additionalCredits}
                  onChange={(e) => setAdditionalCredits(e.target.value)}
                  className="bg-gray-900 border-gray-700 text-white"
                />
              </div>

              <div className="md:col-span-6 space-y-1.5">
                <label className="text-xs font-medium text-gray-300">
                  Production Note / Reason
                </label>
                <Input
                  type="text"
                  required
                  value={creditReason}
                  onChange={(e) => setCreditReason(e.target.value)}
                  placeholder="e.g. Rendering 5-scene animatic + multilingual dubbing test"
                  className="bg-gray-900 border-gray-700 text-white"
                />
              </div>

              <div className="md:col-span-3">
                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white font-medium"
                >
                  {submitting ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5 mr-1.5" />
                      Request Credits
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
