'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Coins,
  Loader,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Users,
  XCircle,
  Zap,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import {
  getDefaultCreditsForTier,
  getDefaultDurationDaysForTier,
  PRELAUNCH_TIER_PRESETS,
} from '@/lib/billing/prelaunchAccess'
import type {
  AdminManagedUserSummary,
  PrelaunchAccessRequestRecord,
} from '@/lib/admin/accessControlService'

interface DashboardStats {
  pendingRequests: number
  approvedRequests: number
  activeUsers: number
  totalUsers: number
  totalActiveCredits: number
}

interface RequestDraft {
  tierName: string
  credits: string
  creditMode: 'set' | 'add'
  durationDays: string
  adminNotes: string
}

interface UserDraft {
  tierName: string
  creditsInput: string
}

export function AdminAccessControlClient({ adminEmail }: { adminEmail: string }) {
  const [activeTab, setActiveTab] = useState<'requests' | 'users'>('requests')
  const [requestStatusFilter, setRequestStatusFilter] = useState<string>('pending')
  const [userFilter, setUserFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [debouncedSearch, setDebouncedSearch] = useState<string>('')

  const [loading, setLoading] = useState(true)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [stats, setStats] = useState<DashboardStats>({
    pendingRequests: 0,
    approvedRequests: 0,
    activeUsers: 0,
    totalUsers: 0,
    totalActiveCredits: 0,
  })
  const [requests, setRequests] = useState<PrelaunchAccessRequestRecord[]>([])
  const [users, setUsers] = useState<AdminManagedUserSummary[]>([])

  // Per-row inline edit state
  const [requestDrafts, setRequestDrafts] = useState<Record<string, RequestDraft>>({})
  const [userDrafts, setUserDrafts] = useState<Record<string, UserDraft>>({})

  // Quick Grant / Pre-Approve Bar state
  const [quickEmail, setQuickEmail] = useState('')
  const [quickTier, setQuickTier] = useState('explorer')
  const [quickCredits, setQuickCredits] = useState('750')
  const [quickMode, setQuickMode] = useState<'set' | 'add'>('set')
  const [quickDuration, setQuickDuration] = useState('30')
  const [quickNotes, setQuickNotes] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim())
    }, 250)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        status: requestStatusFilter,
        userFilter,
        q: debouncedSearch,
        limit: '150',
      })
      const res = await fetch(`/api/admin/access?${params.toString()}`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to load admin console')
      }

      setStats(
        data.stats || {
          pendingRequests: 0,
          approvedRequests: 0,
          activeUsers: 0,
          totalUsers: 0,
          totalActiveCredits: 0,
        }
      )

      const fetchedRequests: PrelaunchAccessRequestRecord[] = Array.isArray(data.requests)
        ? data.requests
        : []
      const fetchedUsers: AdminManagedUserSummary[] = Array.isArray(data.users)
        ? data.users
        : []

      setRequests(fetchedRequests)
      setUsers(fetchedUsers)

      // Seed default drafts for any request row not yet edited
      setRequestDrafts((prev) => {
        const next = { ...prev }
        for (const r of fetchedRequests) {
          if (!next[r.id]) {
            const isTopUp = r.request_type === 'additional_credits'
            const defaultTier = isTopUp
              ? 'keep'
              : r.granted_tier || r.requested_tier || 'explorer'
            const defaultCredits =
              r.granted_credits ??
              r.requested_credits ??
              (isTopUp ? 2500 : getDefaultCreditsForTier(defaultTier))
            const defaultDuration =
              r.granted_duration_days ??
              (defaultTier === 'keep' ? 30 : getDefaultDurationDaysForTier(defaultTier))
            next[r.id] = {
              tierName: defaultTier,
              credits: String(defaultCredits),
              creditMode: isTopUp ? 'add' : 'set',
              durationDays: String(defaultDuration),
              adminNotes: r.admin_notes || '',
            }
          }
        }
        return next
      })

      setUserDrafts((prev) => {
        const next = { ...prev }
        for (const u of fetchedUsers) {
          if (!next[u.id]) {
            next[u.id] = {
              tierName: u.tier_name || 'explorer',
              creditsInput: String(u.credits ?? 0),
            }
          }
        }
        return next
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load admin console')
    } finally {
      setLoading(false)
    }
  }, [requestStatusFilter, userFilter, debouncedSearch])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  const runAdminAction = async (key: string, payload: Record<string, unknown>) => {
    setBusyKey(key)
    try {
      const res = await fetch('/api/admin/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Action failed')
      }
      toast.success(data.message || 'Updated successfully')
      await fetchData()
      return true
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Admin action failed')
      return false
    } finally {
      setBusyKey(null)
    }
  }

  const handleQuickGrant = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickEmail.trim()) return
    const ok = await runAdminAction('quick-grant', {
      action: 'grant',
      targetEmailOrUserId: quickEmail.trim(),
      tierName: quickTier,
      credits: Number(quickCredits || 0),
      creditMode: quickMode,
      durationDays: Number(quickDuration || 30),
      adminNotes: quickNotes.trim() || null,
    })
    if (ok) {
      setQuickEmail('')
      setQuickNotes('')
    }
  }

  const updateRequestDraft = (id: string, patch: Partial<RequestDraft>) => {
    setRequestDrafts((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] || {
          tierName: 'explorer',
          credits: '750',
          creditMode: 'set',
          durationDays: '30',
          adminNotes: '',
        }),
        ...patch,
      },
    }))
  }

  const updateUserDraft = (id: string, patch: Partial<UserDraft>) => {
    setUserDrafts((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] || { tierName: 'explorer', creditsInput: '750' }),
        ...patch,
      },
    }))
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-5">
          <div>
            <div className="flex items-center gap-3 text-xs text-gray-400 mb-2">
              <Link
                href="/admin"
                className="inline-flex items-center gap-1 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Admin Home
              </Link>
              <span>•</span>
              <Link href="/dashboard" className="hover:text-white transition-colors">
                Studio Dashboard
              </Link>
              <span>•</span>
              <span className="text-cyan-400 font-medium">Signed in as {adminEmail}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2.5">
              <ShieldCheck className="w-7 h-7 text-emerald-400 shrink-0" />
              <span>Pre-Launch Access &amp; Credits Control</span>
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Whop self-serve payments are blocked. Review access requests, pre-approve invites, control Studio access, and set exact credit balances per user.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => void fetchData()}
            disabled={loading}
            className="border-gray-700 text-gray-200 hover:bg-gray-800 shrink-0"
          >
            {loading ? (
              <Loader className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Refresh Data
          </Button>
        </div>

        {/* Summary KPI Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
          <div className="rounded-xl border border-amber-500/35 bg-amber-950/20 p-4">
            <div className="text-xs text-amber-300 font-medium flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Pending Requests
            </div>
            <div className="text-2xl font-bold text-white mt-1">
              {stats.pendingRequests.toLocaleString()}
            </div>
          </div>

          <div className="rounded-xl border border-emerald-500/35 bg-emerald-950/20 p-4">
            <div className="text-xs text-emerald-300 font-medium flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Approved Invites
            </div>
            <div className="text-2xl font-bold text-white mt-1">
              {stats.approvedRequests.toLocaleString()}
            </div>
          </div>

          <div className="rounded-xl border border-cyan-500/35 bg-cyan-950/20 p-4">
            <div className="text-xs text-cyan-300 font-medium flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5" /> Active Studio Users
            </div>
            <div className="text-2xl font-bold text-white mt-1">
              {stats.activeUsers.toLocaleString()}
            </div>
          </div>

          <div className="rounded-xl border border-gray-800 bg-gray-900/70 p-4">
            <div className="text-xs text-gray-400 font-medium flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" /> Total Accounts
            </div>
            <div className="text-2xl font-bold text-white mt-1">
              {stats.totalUsers.toLocaleString()}
            </div>
          </div>

          <div className="col-span-2 lg:col-span-1 rounded-xl border border-purple-500/35 bg-purple-950/20 p-4">
            <div className="text-xs text-purple-300 font-medium flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5" /> Total Active Credits
            </div>
            <div className="text-2xl font-bold text-white mt-1">
              {stats.totalActiveCredits.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Direct Grant / Pre-Approve Any Email Bar */}
        <form
          onSubmit={handleQuickGrant}
          className="rounded-2xl border border-emerald-500/30 bg-gray-900/80 p-5 space-y-3"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-300">
              <UserPlus className="w-4 h-4" />
              <span>Direct Invite / Grant Access &amp; Credits by Email</span>
            </div>
            <span className="text-xs text-gray-400 hidden sm:inline">
              Works for both existing accounts and pre-approving emails before they sign up
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
            <div className="lg:col-span-3 space-y-1">
              <label className="text-[11px] font-medium text-gray-400">User Email</label>
              <Input
                type="email"
                required
                value={quickEmail}
                onChange={(e) => setQuickEmail(e.target.value)}
                placeholder="creator@studio.com"
                className="bg-gray-950 border-gray-700 text-white h-9 text-sm"
              />
            </div>

            <div className="lg:col-span-3 space-y-1">
              <label className="text-[11px] font-medium text-gray-400">Workspace Tier</label>
              <select
                value={quickTier}
                onChange={(e) => {
                  const nextTier = e.target.value
                  setQuickTier(nextTier)
                  if (nextTier !== 'keep') {
                    setQuickCredits(String(getDefaultCreditsForTier(nextTier)))
                    setQuickDuration(String(getDefaultDurationDaysForTier(nextTier)))
                  }
                }}
                className="w-full h-9 rounded-md border border-gray-700 bg-gray-950 px-2.5 text-sm text-white"
              >
                {PRELAUNCH_TIER_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
                <option value="keep">Keep Current Tier (Credits Only)</option>
              </select>
            </div>

            <div className="lg:col-span-2 space-y-1">
              <label className="text-[11px] font-medium text-gray-400">Credit Mode &amp; Amount</label>
              <div className="flex gap-1.5">
                <select
                  value={quickMode}
                  onChange={(e) => setQuickMode(e.target.value as 'set' | 'add')}
                  className="h-9 rounded-md border border-gray-700 bg-gray-950 px-2 text-xs text-white"
                  title="Set exact balance (=) or Add credits (+)"
                >
                  <option value="set">= Set</option>
                  <option value="add">+ Add</option>
                </select>
                <Input
                  type="number"
                  min={0}
                  max={2000000}
                  required
                  value={quickCredits}
                  onChange={(e) => setQuickCredits(e.target.value)}
                  className="bg-gray-950 border-gray-700 text-white h-9 text-sm"
                />
              </div>
            </div>

            <div className="lg:col-span-1 space-y-1">
              <label className="text-[11px] font-medium text-gray-400">Days</label>
              <select
                value={quickDuration}
                onChange={(e) => setQuickDuration(e.target.value)}
                className="w-full h-9 rounded-md border border-gray-700 bg-gray-950 px-2 text-sm text-white"
              >
                <option value="14">14d</option>
                <option value="30">30d</option>
                <option value="60">60d</option>
                <option value="90">90d</option>
                <option value="365">365d</option>
              </select>
            </div>

            <div className="lg:col-span-3 flex gap-2">
              <Input
                type="text"
                value={quickNotes}
                onChange={(e) => setQuickNotes(e.target.value)}
                placeholder="Note (optional)"
                className="bg-gray-950 border-gray-700 text-white h-9 text-sm"
              />
              <Button
                type="submit"
                disabled={busyKey === 'quick-grant'}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold h-9 px-4 shrink-0"
              >
                {busyKey === 'quick-grant' ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  'Grant'
                )}
              </Button>
            </div>
          </div>
        </form>

        {/* Tabs + Search / Filter Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="inline-flex rounded-xl border border-gray-800 bg-gray-900 p-1">
            <button
              type="button"
              onClick={() => setActiveTab('requests')}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                activeTab === 'requests'
                  ? 'bg-emerald-500 text-slate-950'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Access &amp; Credit Requests ({stats.pendingRequests} pending)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('users')}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                activeTab === 'users'
                  ? 'bg-cyan-500 text-slate-950'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              All Registered Users ({stats.totalUsers})
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {activeTab === 'requests' ? (
              <div className="inline-flex rounded-lg border border-gray-800 bg-gray-900 p-0.5 text-xs">
                {(['pending', 'approved', 'declined', 'revoked', 'all'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setRequestStatusFilter(st)}
                    className={`rounded-md px-3 py-1.5 font-medium capitalize transition-colors ${
                      requestStatusFilter === st
                        ? 'bg-gray-800 text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            ) : (
              <div className="inline-flex rounded-lg border border-gray-800 bg-gray-900 p-0.5 text-xs">
                {[
                  { id: 'all', label: 'All Users' },
                  { id: 'active', label: 'Active Access' },
                  { id: 'no_access', label: 'No Access' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setUserFilter(f.id)}
                    className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
                      userFilter === f.id
                        ? 'bg-gray-800 text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            )}

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search email, name, studio…"
                className="pl-9 bg-gray-900 border-gray-800 text-white h-9 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader className="w-7 h-7 animate-spin text-emerald-400" />
          </div>
        ) : activeTab === 'requests' ? (
          requests.length === 0 ? (
            <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-12 text-center text-gray-400">
              No {requestStatusFilter === 'all' ? '' : requestStatusFilter} access requests found.
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((req) => {
                const draft = requestDrafts[req.id] || {
                  tierName: req.requested_tier || 'explorer',
                  credits: String(req.requested_credits ?? 750),
                  creditMode: req.request_type === 'additional_credits' ? 'add' : 'set',
                  durationDays: '30',
                  adminNotes: req.admin_notes || '',
                }
                const isBusy = busyKey?.startsWith(`req-${req.id}`)

                return (
                  <div
                    key={req.id}
                    className={`rounded-2xl border p-5 space-y-4 ${
                      req.status === 'pending'
                        ? 'border-amber-500/35 bg-gray-900/90'
                        : req.status === 'approved'
                          ? 'border-emerald-500/30 bg-gray-900/70'
                          : 'border-gray-800 bg-gray-900/50'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-base font-bold text-white">{req.email}</span>
                          {req.full_name && (
                            <span className="text-sm text-gray-300">({req.full_name})</span>
                          )}
                          {req.company_name && (
                            <span className="rounded-md bg-gray-800 px-2 py-0.5 text-xs text-gray-300">
                              {req.company_name}
                            </span>
                          )}
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                              req.status === 'pending'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : req.status === 'approved'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            }`}
                          >
                            {req.status}
                          </span>
                          <span className="rounded-full bg-indigo-500/15 border border-indigo-500/30 px-2.5 py-0.5 text-xs text-indigo-300">
                            {req.request_type === 'additional_credits'
                              ? 'Credit Top-Up Request'
                              : 'Initial Studio Access'}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400">
                          <span>
                            Requested:{' '}
                            <strong className="text-gray-200 capitalize">
                              {req.requested_tier?.replace('_', ' ') || 'explorer'}
                            </strong>
                            {req.requested_credits !== null && (
                              <> ({req.requested_credits.toLocaleString()} cr)</>
                            )}
                          </span>
                          {req.use_case && (
                            <span>
                              Use Case: <strong className="text-gray-200">{req.use_case}</strong>
                            </span>
                          )}
                          <span>Submitted: {new Date(req.created_at).toLocaleString()}</span>
                          {req.registered_user_id ? (
                            <span className="text-cyan-300 font-medium">
                              Account Registered • Live Balance:{' '}
                              {(req.user_total_credits ?? 0).toLocaleString()} cr
                              {req.user_tier_display_name ? ` (${req.user_tier_display_name})` : ''}
                            </span>
                          ) : (
                            <span className="text-amber-300">
                              Not registered yet (will auto-activate on signup)
                            </span>
                          )}
                        </div>

                        {req.project_details && (
                          <p className="mt-2 rounded-lg border border-gray-800 bg-gray-950/70 p-3 text-xs sm:text-sm text-gray-200 whitespace-pre-wrap">
                            {req.project_details}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Inline Review Controls */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end pt-2 border-t border-gray-800/80">
                      <div className="lg:col-span-3 space-y-1">
                        <label className="text-[11px] text-gray-400">Grant Tier</label>
                        <select
                          value={draft.tierName}
                          onChange={(e) => {
                            const t = e.target.value
                            updateRequestDraft(req.id, {
                              tierName: t,
                              ...(t !== 'keep'
                                ? {
                                    credits: String(getDefaultCreditsForTier(t)),
                                    durationDays: String(getDefaultDurationDaysForTier(t)),
                                  }
                                : {}),
                            })
                          }}
                          className="w-full h-9 rounded-md border border-gray-700 bg-gray-950 px-2.5 text-xs sm:text-sm text-white"
                        >
                          {PRELAUNCH_TIER_PRESETS.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.label}
                            </option>
                          ))}
                          <option value="keep">Keep Current Tier (Credits Only)</option>
                        </select>
                      </div>

                      <div className="lg:col-span-3 space-y-1">
                        <label className="text-[11px] text-gray-400">Credits Allocation</label>
                        <div className="flex gap-1.5">
                          <select
                            value={draft.creditMode}
                            onChange={(e) =>
                              updateRequestDraft(req.id, {
                                creditMode: e.target.value as 'set' | 'add',
                              })
                            }
                            className="h-9 rounded-md border border-gray-700 bg-gray-950 px-2 text-xs text-white"
                          >
                            <option value="set">= Set Total</option>
                            <option value="add">+ Add</option>
                          </select>
                          <Input
                            type="number"
                            min={0}
                            max={2000000}
                            value={draft.credits}
                            onChange={(e) =>
                              updateRequestDraft(req.id, { credits: e.target.value })
                            }
                            className="bg-gray-950 border-gray-700 text-white h-9 text-sm"
                          />
                        </div>
                      </div>

                      <div className="lg:col-span-1 space-y-1">
                        <label className="text-[11px] text-gray-400">Duration</label>
                        <select
                          value={draft.durationDays}
                          onChange={(e) =>
                            updateRequestDraft(req.id, { durationDays: e.target.value })
                          }
                          className="w-full h-9 rounded-md border border-gray-700 bg-gray-950 px-2 text-xs sm:text-sm text-white"
                        >
                          <option value="14">14d</option>
                          <option value="30">30d</option>
                          <option value="60">60d</option>
                          <option value="90">90d</option>
                          <option value="365">365d</option>
                        </select>
                      </div>

                      <div className="lg:col-span-2 space-y-1">
                        <label className="text-[11px] text-gray-400">Admin Note</label>
                        <Input
                          type="text"
                          value={draft.adminNotes}
                          onChange={(e) =>
                            updateRequestDraft(req.id, { adminNotes: e.target.value })
                          }
                          placeholder="Optional note"
                          className="bg-gray-950 border-gray-700 text-white h-9 text-xs sm:text-sm"
                        />
                      </div>

                      <div className="lg:col-span-3 flex flex-wrap gap-2 justify-end">
                        <Button
                          type="button"
                          disabled={Boolean(isBusy)}
                          onClick={() =>
                            void runAdminAction(`req-${req.id}-approve`, {
                              action: 'approve',
                              requestId: req.id,
                              tierName: draft.tierName,
                              credits: Number(draft.credits || 0),
                              creditMode: draft.creditMode,
                              durationDays: Number(draft.durationDays || 30),
                              adminNotes: draft.adminNotes || null,
                            })
                          }
                          className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold h-9 px-3.5 text-xs sm:text-sm"
                        >
                          {busyKey === `req-${req.id}-approve` ? (
                            <Loader className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4 mr-1" />
                              {req.status === 'approved' ? 'Update Grant' : 'Approve & Grant'}
                            </>
                          )}
                        </Button>

                        {req.status === 'pending' && (
                          <Button
                            type="button"
                            variant="outline"
                            disabled={Boolean(isBusy)}
                            onClick={() =>
                              void runAdminAction(`req-${req.id}-decline`, {
                                action: 'decline',
                                requestId: req.id,
                                adminNotes: draft.adminNotes || null,
                              })
                            }
                            className="border-rose-500/40 text-rose-300 hover:bg-rose-950/40 h-9 px-3 text-xs sm:text-sm"
                          >
                            <XCircle className="w-4 h-4 mr-1" /> Decline
                          </Button>
                        )}

                        {req.status === 'approved' && (
                          <Button
                            type="button"
                            variant="outline"
                            disabled={Boolean(isBusy)}
                            onClick={() =>
                              void runAdminAction(`req-${req.id}-revoke`, {
                                action: 'revoke',
                                targetEmailOrUserId: req.email,
                                clearCredits: false,
                                adminNotes: draft.adminNotes || null,
                              })
                            }
                            className="border-rose-500/40 text-rose-300 hover:bg-rose-950/40 h-9 px-3 text-xs sm:text-sm"
                          >
                            <ShieldAlert className="w-4 h-4 mr-1" /> Revoke
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        ) : users.length === 0 ? (
          <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-12 text-center text-gray-400">
            No matching users found.
          </div>
        ) : (
          <div className="space-y-3">
            {users.map((u) => {
              const draft = userDrafts[u.id] || {
                tierName: u.tier_name || 'explorer',
                creditsInput: String(u.credits ?? 0),
              }
              const isBusy = busyKey?.startsWith(`user-${u.id}`)
              const displayName = [u.first_name, u.last_name].filter(Boolean).join(' ').trim()

              return (
                <div
                  key={u.id}
                  className={`rounded-xl border p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4 ${
                    u.has_active_access
                      ? 'border-emerald-500/30 bg-gray-900/80'
                      : 'border-gray-800 bg-gray-900/50'
                  }`}
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-white text-sm sm:text-base">{u.email}</span>
                      {displayName && (
                        <span className="text-xs text-gray-400">({displayName})</span>
                      )}
                      {u.has_active_access ? (
                        <span className="rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-semibold text-emerald-300">
                          Active: {u.tier_display_name || u.tier_name || 'Explorer Pass'}
                        </span>
                      ) : (
                        <span className="rounded-full bg-gray-800 border border-gray-700 px-2.5 py-0.5 text-xs text-gray-400">
                          No Studio Access
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400">
                      <span className="text-cyan-300 font-semibold flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                        Available Credits: {u.credits.toLocaleString()}
                      </span>
                      <span>
                        (Sub: {u.subscription_credits_monthly.toLocaleString()} • Pack/Addon:{' '}
                        {u.addon_credits.toLocaleString()})
                      </span>
                      <span>Joined: {new Date(u.created_at).toLocaleDateString()}</span>
                      {u.subscription_end_date && u.has_active_access && (
                        <span>
                          Access thru: {new Date(u.subscription_end_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Per-user inline actions */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <select
                      value={draft.tierName}
                      onChange={(e) => {
                        const nextTier = e.target.value
                        updateUserDraft(u.id, {
                          tierName: nextTier,
                          creditsInput: String(getDefaultCreditsForTier(nextTier)),
                        })
                      }}
                      className="h-9 rounded-md border border-gray-700 bg-gray-950 px-2.5 text-xs text-white"
                    >
                      {PRELAUNCH_TIER_PRESETS.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.label}
                        </option>
                      ))}
                    </select>

                    <Button
                      type="button"
                      size="sm"
                      disabled={Boolean(isBusy)}
                      onClick={() =>
                        void runAdminAction(`user-${u.id}-tier`, {
                          action: 'grant',
                          targetEmailOrUserId: u.id,
                          tierName: draft.tierName,
                          credits: Number(draft.creditsInput || 0),
                          creditMode: 'set',
                          durationDays: getDefaultDurationDaysForTier(draft.tierName),
                        })
                      }
                      className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold h-9 text-xs"
                      title="Activate selected tier AND set available credits to the amount on the right"
                    >
                      {u.has_active_access ? 'Set Tier & Credits' : 'Grant Access'}
                    </Button>

                    <Input
                      type="number"
                      min={0}
                      max={2000000}
                      value={draft.creditsInput}
                      onChange={(e) =>
                        updateUserDraft(u.id, { creditsInput: e.target.value })
                      }
                      className="w-28 bg-gray-950 border-gray-700 text-white h-9 text-xs"
                      title="Credit amount"
                    />

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={Boolean(isBusy)}
                      onClick={() =>
                        void runAdminAction(`user-${u.id}-set`, {
                          action: 'set-credits',
                          targetEmailOrUserId: u.id,
                          credits: Number(draft.creditsInput || 0),
                        })
                      }
                      className="border-cyan-500/40 text-cyan-200 hover:bg-cyan-950/40 h-9 text-xs"
                      title="Set exact available credit balance (=)"
                    >
                      = Set Credits
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={Boolean(isBusy)}
                      onClick={() =>
                        void runAdminAction(`user-${u.id}-add`, {
                          action: 'add-credits',
                          targetEmailOrUserId: u.id,
                          credits: Number(draft.creditsInput || 0),
                        })
                      }
                      className="border-purple-500/40 text-purple-200 hover:bg-purple-950/40 h-9 text-xs"
                      title="Add this amount on top of current credits (+)"
                    >
                      <Plus className="w-3.5 h-3.5 mr-0.5" /> Add
                    </Button>

                    {u.has_active_access && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={Boolean(isBusy)}
                        onClick={() =>
                          void runAdminAction(`user-${u.id}-revoke`, {
                            action: 'revoke',
                            targetEmailOrUserId: u.id,
                            clearCredits: false,
                          })
                        }
                        className="border-rose-500/40 text-rose-300 hover:bg-rose-950/40 h-9 text-xs"
                        title="Revoke Studio access (keeps remaining credits frozen until re-approved)"
                      >
                        Revoke Access
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
