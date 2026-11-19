'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import {
  AlertTriangle,
  Archive,
  BarChart3,
  Briefcase,
  CheckCircle2,
  Clock,
  ExternalLink,
  FolderOpen,
  HardDrive,
  Search,
  Sparkles,
  Trash2,
  TrendingUp,
  Users,
} from 'lucide-react'
import { ProductPageHeader, ProductPageShell, ProductEmptyState } from '@/components/product'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import {
  getActiveWorkspaceOwnerId,
  subscribeActiveWorkspace,
} from '@/lib/producer/activeWorkspaceClient'
import {
  formatStorageBytes,
  type ClientCrmRecord,
  type PmScorecardRow,
} from '@/lib/producer/agencyOps'
import { toast } from 'sonner'

export const dynamic = 'force-dynamic'

interface StorageProjectRow {
  id: string
  title: string
  status: string
  stage: string
  storageBytes: number
  purgeableDraftCount: number
  estimatedReclaimableBytes: number
  clientUploadsBytes: number
  storagePurgedAt: string | null
  updatedAt: string | null
}

interface AgencyOpsPayload {
  tierName: string
  totalProjects: number
  slaSummary: {
    overdueCount: number
    dueSoonCount: number
    waitingStaleCount: number
    deliveredCount: number
    totalRevenueUsd: number
    totalCreditsUsed: number
  }
  clients: ClientCrmRecord[]
  pmScorecard: PmScorecardRow[]
  unassignedActiveCount: number
  storageSummary: {
    totalStorageBytes: number
    tierStorageCapBytes: number
    storageUtilizationPct: number
    totalReclaimableBytes: number
    projects: StorageProjectRow[]
  }
}

export default function AgencyClientsOpsPage() {
  const { status: authStatus } = useSession()
  const [activeTab, setActiveTab] = useState<'clients' | 'scorecard' | 'storage'>('clients')
  const [workspaceOwnerId, setWorkspaceOwnerId] = useState<string>('all')
  const [data, setData] = useState<AgencyOpsPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [clientSearch, setClientSearch] = useState('')
  const [expandedClientKey, setExpandedClientKey] = useState<string | null>(null)
  const [purgingProjectId, setPurgingProjectId] = useState<string | null>(null)

  useEffect(() => {
    setWorkspaceOwnerId(getActiveWorkspaceOwnerId())
    return subscribeActiveWorkspace((next) => setWorkspaceOwnerId(next))
  }, [])

  const loadOps = useCallback(async () => {
    setLoading(true)
    try {
      const qs = new URLSearchParams()
      if (workspaceOwnerId && workspaceOwnerId !== 'all') {
        qs.set('workspaceOwnerId', workspaceOwnerId)
      }
      const url = qs.toString() ? `/api/producer/ops?${qs}` : '/api/producer/ops'
      const res = await fetch(url)
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to load agency operations')
      }
      setData(json as AgencyOpsPayload)
    } catch (err) {
      console.error('[AgencyClientsOpsPage] load error:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to load Agency Ops')
    } finally {
      setLoading(false)
    }
  }, [workspaceOwnerId])

  useEffect(() => {
    if (authStatus === 'authenticated') {
      void loadOps()
    } else if (authStatus === 'unauthenticated') {
      setLoading(false)
    }
  }, [authStatus, loadOps])

  const filteredClients = useMemo(() => {
    const list = data?.clients || []
    const q = clientSearch.trim().toLowerCase()
    if (!q) return list
    return list.filter(
      (c) =>
        c.displayName.toLowerCase().includes(q) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        c.primaryLocale.toLowerCase().includes(q) ||
        c.verticals.some((v) => v.toLowerCase().includes(q))
    )
  }, [data?.clients, clientSearch])

  const handlePurgeDrafts = async (project: StorageProjectRow, archiveProject: boolean) => {
    setPurgingProjectId(project.id)
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(project.id)}/purge-drafts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          archiveProject,
          purgeRawClientUploads: project.clientUploadsBytes > 0,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Purge failed')
      }
      const reclaimedLabel = formatStorageBytes(json.estimatedBytesReclaimed || 0)
      toast.success(
        archiveProject
          ? `Archived "${project.title}" & purged ${json.removedTakeCount} draft take(s) (~${reclaimedLabel} reclaimed)`
          : `Purged ${json.removedTakeCount} draft take(s) on "${project.title}" (~${reclaimedLabel} reclaimed)`
      )
      await loadOps()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not purge draft intermediates')
    } finally {
      setPurgingProjectId(null)
    }
  }

  return (
    <ProductPageShell>
      <ProductPageHeader
        icon={<BarChart3 className="h-6 w-6" />}
        title="Clients & Agency Operations"
        subtitle="Client CRM directory, PM workload & margin scorecard, SLA aging alerts, and Continuity Vault storage hygiene."
        accent="product"
        primaryAction={
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/dashboard/projects">
              <Button variant="secondary" className="border border-gray-700 flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-cyan-400" />
                Projects &amp; Kanban
              </Button>
            </Link>
            <Link href="/dashboard/settings/producer">
              <Button variant="primary" className="flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                Producer Hub &amp; Team
              </Button>
            </Link>
          </div>
        }
      />

      {/* Top Agency KPI Strip */}
      {data && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
          <div className="rounded-xl border border-gray-800 bg-gray-900/70 p-4">
            <div className="text-[11px] uppercase tracking-wider text-gray-400">Clients</div>
            <div className="mt-1 text-2xl font-bold text-white tabular-nums">
              {data.clients.length}
            </div>
            <div className="text-[11px] text-gray-500 mt-0.5">
              {data.totalProjects} total projects
            </div>
          </div>

          <div className="rounded-xl border border-gray-800 bg-gray-900/70 p-4">
            <div className="text-[11px] uppercase tracking-wider text-gray-400">SLA Alerts</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span
                className={`text-2xl font-bold tabular-nums ${
                  data.slaSummary.overdueCount > 0 ? 'text-red-400' : 'text-emerald-400'
                }`}
              >
                {data.slaSummary.overdueCount}
              </span>
              <span className="text-xs text-gray-400">overdue</span>
            </div>
            <div className="text-[11px] text-amber-300/90 mt-0.5">
              {data.slaSummary.waitingStaleCount} client idle &gt;48h · {data.slaSummary.dueSoonCount}{' '}
              due soon
            </div>
          </div>

          <div className="rounded-xl border border-gray-800 bg-gray-900/70 p-4">
            <div className="text-[11px] uppercase tracking-wider text-gray-400">Client Revenue</div>
            <div className="mt-1 text-2xl font-bold text-emerald-300 tabular-nums">
              ${data.slaSummary.totalRevenueUsd.toLocaleString()}
            </div>
            <div className="text-[11px] text-gray-500 mt-0.5">
              {data.slaSummary.totalCreditsUsed.toLocaleString()} credits burned
            </div>
          </div>

          <div className="rounded-xl border border-gray-800 bg-gray-900/70 p-4">
            <div className="text-[11px] uppercase tracking-wider text-gray-400">Active PM Team</div>
            <div className="mt-1 text-2xl font-bold text-indigo-300 tabular-nums">
              {data.pmScorecard.length}
            </div>
            <div className="text-[11px] text-gray-500 mt-0.5">
              {data.unassignedActiveCount} unassigned active
            </div>
          </div>

          <div className="rounded-xl border border-gray-800 bg-gray-900/70 p-4 col-span-2 lg:col-span-1">
            <div className="text-[11px] uppercase tracking-wider text-gray-400">Vault Storage</div>
            <div className="mt-1 text-xl font-bold text-cyan-300 tabular-nums">
              {formatStorageBytes(data.storageSummary.totalStorageBytes)}
            </div>
            <div className="text-[11px] text-gray-500 mt-0.5">
              of {formatStorageBytes(data.storageSummary.tierStorageCapBytes)} (
              {data.storageSummary.storageUtilizationPct}%)
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="mb-5 inline-flex flex-wrap items-center gap-1.5 rounded-xl border border-gray-800 bg-gray-900/80 p-1">
        <button
          type="button"
          onClick={() => setActiveTab('clients')}
          className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-medium transition-all ${
            activeTab === 'clients'
              ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/35'
              : 'text-gray-400 hover:text-gray-200 border border-transparent'
          }`}
        >
          <Briefcase className="w-3.5 h-3.5" />
          Client CRM Directory
          {data && (
            <span className="rounded-full bg-gray-800 px-1.5 py-0.5 text-[10px]">
              {data.clients.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('scorecard')}
          className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-medium transition-all ${
            activeTab === 'scorecard'
              ? 'bg-indigo-500/20 text-indigo-200 border border-indigo-500/35'
              : 'text-gray-400 hover:text-gray-200 border border-transparent'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          PM Workload &amp; Margin Scorecard
          {data && (
            <span className="rounded-full bg-gray-800 px-1.5 py-0.5 text-[10px]">
              {data.pmScorecard.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('storage')}
          className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-medium transition-all ${
            activeTab === 'storage'
              ? 'bg-purple-500/20 text-purple-200 border border-purple-500/35'
              : 'text-gray-400 hover:text-gray-200 border border-transparent'
          }`}
        >
          <HardDrive className="w-3.5 h-3.5" />
          Storage Hygiene &amp; Draft Purge
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 rounded-xl border border-gray-800 bg-gray-900/60 animate-pulse"
            />
          ))}
        </div>
      ) : !data ? (
        <ProductEmptyState
          icon={<Briefcase className="w-8 h-8 text-gray-400" />}
          title="Sign in to view Agency Operations"
          description="Manage client orders, PM margins, SLA aging alerts, and vault storage."
          actionLabel="Go to Projects"
          onAction={() => {
            window.location.href = '/dashboard/projects'
          }}
        />
      ) : activeTab === 'clients' ? (
        /* TAB 1: CLIENT CRM DIRECTORY */
        <div className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
              placeholder="Search clients by name, email, locale, or vertical…"
              className="pl-10 bg-gray-900 border-gray-800 text-white"
            />
          </div>

          {filteredClients.length === 0 ? (
            <ProductEmptyState
              icon={<Users className="w-8 h-8 text-gray-400" />}
              title="No client records yet"
              description="Create a white-label Client Intake link in Producer Hub to start tracking clients, revenue, and repeat orders here."
              actionLabel="Open Producer Hub"
              onAction={() => {
                window.location.href = '/dashboard/settings/producer'
              }}
            />
          ) : (
            <div className="space-y-3">
              {filteredClients.map((client) => {
                const expanded = expandedClientKey === client.clientKey
                return (
                  <div
                    key={client.clientKey}
                    className="rounded-xl border border-gray-800 bg-gray-900/70 overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedClientKey(expanded ? null : client.clientKey)
                      }
                      className="w-full px-5 py-4 text-left flex flex-wrap items-center justify-between gap-4 hover:bg-gray-800/40 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-white">
                            {client.displayName}
                          </span>
                          <span className="rounded bg-gray-800 px-1.5 py-0.5 text-[10px] text-cyan-300 uppercase">
                            {client.primaryLocale}
                          </span>
                          {client.overdueProjects > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-950/60 border border-red-500/40 px-2 py-0.5 text-[10px] text-red-300">
                              <AlertTriangle className="w-3 h-3" />
                              {client.overdueProjects} overdue
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {client.email || 'No email captured'} · {client.activeProjects} active ·{' '}
                          {client.completedProjects} delivered
                          {client.verticals.length > 0
                            ? ` · ${client.verticals.join(', ')}`
                            : ''}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-5 text-xs tabular-nums">
                        <div className="text-right">
                          <div className="text-gray-400 text-[10px] uppercase">Revenue</div>
                          <div className="font-semibold text-emerald-300">
                            ${client.totalRevenueUsd.toLocaleString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-gray-400 text-[10px] uppercase">Credits</div>
                          <div className="font-semibold text-gray-200">
                            {client.totalCreditsUsed.toLocaleString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-gray-400 text-[10px] uppercase">Est. Margin</div>
                          <div className="font-semibold text-cyan-300">
                            {client.grossMarginPct !== null ? `${client.grossMarginPct}%` : '—'}
                          </div>
                        </div>
                      </div>
                    </button>

                    {expanded && (
                      <div className="border-t border-gray-800 bg-gray-950/60 px-5 py-3 space-y-2">
                        {client.projects.map((p) => (
                          <div
                            key={p.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-800/80 bg-gray-900/60 px-3 py-2 text-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <Link
                                href={`/dashboard/studio/${p.id}`}
                                className="font-medium text-white hover:text-cyan-300 truncate"
                              >
                                {p.title}
                              </Link>
                              <span className="rounded bg-gray-800 px-1.5 py-0.5 text-[10px] text-gray-300 capitalize">
                                {p.stage.replace('_', ' ')}
                              </span>
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] ${
                                  p.slaLevel === 'overdue'
                                    ? 'bg-red-950/60 text-red-300'
                                    : p.slaLevel === 'delivered'
                                      ? 'bg-emerald-950/60 text-emerald-300'
                                      : 'bg-gray-800 text-gray-300'
                                }`}
                              >
                                {p.slaBadgeLabel}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-[11px] text-gray-400">
                              {p.clientPriceUsd > 0 && (
                                <span className="text-emerald-300">
                                  ${p.clientPriceUsd.toLocaleString()}
                                </span>
                              )}
                              <span>{p.creditsUsed.toLocaleString()} cr</span>
                              {p.screeningRoomUrl && (
                                <a
                                  href={p.screeningRoomUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300"
                                >
                                  Vault Link
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ) : activeTab === 'scorecard' ? (
        /* TAB 2: PM WORKLOAD & MARGIN SCORECARD */
        <div className="space-y-4">
          {data.unassignedActiveCount > 0 && (
            <div className="rounded-xl border border-amber-500/35 bg-amber-950/25 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-200">
              <span className="inline-flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <strong>{data.unassignedActiveCount}</strong> active project(s) currently have no
                assigned Project Manager.
              </span>
              <Link
                href="/dashboard/projects"
                className="text-amber-100 underline underline-offset-2 hover:text-white"
              >
                Assign PMs on Projects Board →
              </Link>
            </div>
          )}

          {data.pmScorecard.length === 0 ? (
            <ProductEmptyState
              icon={<Users className="w-8 h-8 text-gray-400" />}
              title="No team members yet"
              description="Invite Project Managers or QA Reviewers in Producer Hub to monitor workload, turnaround times, credit utilization, and gross margins."
              actionLabel="Invite Team Members"
              onAction={() => {
                window.location.href = '/dashboard/settings/producer'
              }}
            />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-800 bg-gray-900/70">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-gray-800 bg-gray-950/70 text-[11px] uppercase tracking-wider text-gray-400">
                  <tr>
                    <th className="px-4 py-3">Team Member</th>
                    <th className="px-4 py-3">Active / Done</th>
                    <th className="px-4 py-3">SLA &amp; Action</th>
                    <th className="px-4 py-3">Monthly Credit Burn</th>
                    <th className="px-4 py-3">Revenue / Est. Margin</th>
                    <th className="px-4 py-3">Avg Turnaround</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/80">
                  {data.pmScorecard.map((pm) => (
                    <tr key={pm.memberId} className="hover:bg-gray-800/40">
                      <td className="px-4 py-3">
                        <div className="font-medium text-white">{pm.memberEmail}</div>
                        <div className="text-[11px] text-gray-400 capitalize">
                          {pm.role.replace('_', ' ')} · {pm.status}
                        </div>
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        <span className="text-cyan-300 font-semibold">{pm.activeProjectCount}</span>{' '}
                        active ·{' '}
                        <span className="text-emerald-300 font-semibold">
                          {pm.completedProjectCount}
                        </span>{' '}
                        done
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        {pm.overdueProjectCount > 0 ? (
                          <span className="text-red-400 font-semibold">
                            {pm.overdueProjectCount} overdue
                          </span>
                        ) : (
                          <span className="text-emerald-400">0 overdue</span>
                        )}
                        {pm.actionRequiredCount > 0 && (
                          <span className="ml-2 text-amber-300">
                            · {pm.actionRequiredCount} action req
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="tabular-nums text-gray-200">
                          {pm.creditsUsedMonth.toLocaleString()}
                          {pm.monthlyCreditLimit
                            ? ` / ${pm.monthlyCreditLimit.toLocaleString()} cr`
                            : ' cr (No cap)'}
                        </div>
                        {pm.creditUtilizationPct !== null && (
                          <div className="mt-1 w-32 h-1.5 rounded-full bg-gray-800 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                pm.creditUtilizationPct >= 85
                                  ? 'bg-red-500'
                                  : pm.creditUtilizationPct >= 65
                                    ? 'bg-amber-400'
                                    : 'bg-cyan-400'
                              }`}
                              style={{ width: `${pm.creditUtilizationPct}%` }}
                            />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        <span className="text-emerald-300 font-semibold">
                          ${pm.assignedRevenueUsd.toLocaleString()}
                        </span>
                        <span className="ml-2 text-gray-400">
                          {pm.estimatedMarginPct !== null ? `(${pm.estimatedMarginPct}% GM)` : ''}
                        </span>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-gray-200">
                        {pm.avgTurnaroundDays !== null ? `${pm.avgTurnaroundDays} days` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* TAB 3: STORAGE HYGIENE & 1-CLICK DRAFT PURGE */
        <div className="space-y-4">
          <div className="rounded-xl border border-purple-500/30 bg-purple-950/20 p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-purple-400" />
                  Continuity Vault Storage Footprint ({data.tierName.toUpperCase()} Plan)
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Archive &amp; Purge keeps your final rendered masters, active takes, Blueprint
                  JSON, and Continuity Bible while reclaiming superseded candidate video takes and
                  raw client staging uploads.
                </p>
              </div>
              <div className="text-right tabular-nums">
                <div className="text-lg font-bold text-white">
                  {formatStorageBytes(data.storageSummary.totalStorageBytes)} /{' '}
                  {formatStorageBytes(data.storageSummary.tierStorageCapBytes)}
                </div>
                <div className="text-xs text-purple-300">
                  ~{formatStorageBytes(data.storageSummary.totalReclaimableBytes)} reclaimable from
                  draft intermediates
                </div>
              </div>
            </div>
            <div className="w-full h-2.5 rounded-full bg-gray-900 overflow-hidden border border-gray-800">
              <div
                className={`h-full rounded-full transition-all ${
                  data.storageSummary.storageUtilizationPct >= 85
                    ? 'bg-red-500'
                    : data.storageSummary.storageUtilizationPct >= 65
                      ? 'bg-amber-400'
                      : 'bg-gradient-to-r from-cyan-400 to-purple-500'
                }`}
                style={{ width: `${Math.max(2, data.storageSummary.storageUtilizationPct)}%` }}
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-800 bg-gray-900/70">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-gray-800 bg-gray-950/70 text-[11px] uppercase tracking-wider text-gray-400">
                <tr>
                  <th className="px-4 py-3">Project</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Estimated Footprint</th>
                  <th className="px-4 py-3">Purgeable Intermediates</th>
                  <th className="px-4 py-3 text-right">Storage Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/80">
                {data.storageSummary.projects.map((p) => {
                  const busy = purgingProjectId === p.id
                  const canPurge =
                    p.purgeableDraftCount > 0 || p.clientUploadsBytes > 0 || p.status !== 'archived'
                  return (
                    <tr key={p.id} className="hover:bg-gray-800/40">
                      <td className="px-4 py-3">
                        <Link
                          href={`/dashboard/studio/${p.id}`}
                          className="font-medium text-white hover:text-cyan-300"
                        >
                          {p.title}
                        </Link>
                        {p.storagePurgedAt && (
                          <div className="text-[10px] text-emerald-400 mt-0.5 inline-flex items-center gap-1 ml-2">
                            <CheckCircle2 className="w-3 h-3" />
                            Purged {new Date(p.storagePurgedAt).toLocaleDateString()}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 capitalize text-gray-300">
                        {p.status.replace('_', ' ')}
                      </td>
                      <td className="px-4 py-3 tabular-nums font-semibold text-gray-200">
                        {formatStorageBytes(p.storageBytes)}
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        {p.purgeableDraftCount > 0 || p.clientUploadsBytes > 0 ? (
                          <span className="text-amber-300">
                            {p.purgeableDraftCount} draft take(s)
                            {p.clientUploadsBytes > 0
                              ? ` + ${formatStorageBytes(p.clientUploadsBytes)} raw uploads`
                              : ''}{' '}
                            (~{formatStorageBytes(p.estimatedReclaimableBytes)})
                          </span>
                        ) : (
                          <span className="text-gray-500">Clean (masters only)</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          {(p.purgeableDraftCount > 0 || p.clientUploadsBytes > 0) && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busy}
                              onClick={() => void handlePurgeDrafts(p, false)}
                              className="h-7 px-2.5 text-[11px] border-purple-500/40 text-purple-200 hover:bg-purple-500/20"
                            >
                              <Trash2 className="w-3 h-3 mr-1" />
                              Purge Drafts
                            </Button>
                          )}
                          {canPurge && p.status !== 'archived' && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busy}
                              onClick={() => void handlePurgeDrafts(p, true)}
                              className="h-7 px-2.5 text-[11px] border-amber-500/40 text-amber-200 hover:bg-amber-500/20"
                            >
                              <Archive className="w-3 h-3 mr-1" />
                              {busy ? 'Purging…' : 'Archive & Purge'}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </ProductPageShell>
  )
}
