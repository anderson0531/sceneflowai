'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, CheckCircle2, Copy, LifeBuoy, Loader2, Mail, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import type { GenerationErrorSupportReport } from '@/lib/support/generationErrorReport'

export function SupportEscalationsCard() {
  const [reports, setReports] = useState<GenerationErrorSupportReport[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'open' | 'resolved' | 'all'>('open')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const loadReports = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/support-reports?limit=50', { cache: 'no-store' })
      const data = await res.json().catch(() => ({}))
      if (res.ok && Array.isArray(data.reports)) {
        setReports(data.reports)
      }
    } catch {
      toast.error('Failed to load support escalations')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadReports()
  }, [loadReports])

  const handleToggleStatus = async (report: GenerationErrorSupportReport) => {
    const nextStatus = report.status === 'resolved' ? 'open' : 'resolved'
    setUpdatingId(report.ticketId)
    try {
      const res = await fetch('/api/admin/support-reports', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId: report.ticketId, status: nextStatus }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Update failed')
      setReports((prev) =>
        prev.map((item) => (item.ticketId === report.ticketId ? data.report : item))
      )
      toast.success(`Ticket ${report.ticketId} marked ${nextStatus}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update ticket')
    } finally {
      setUpdatingId(null)
    }
  }

  const handleCopyJson = (report: GenerationErrorSupportReport) => {
    void navigator.clipboard.writeText(JSON.stringify(report, null, 2)).then(() => {
      setCopiedId(report.ticketId)
      toast.success(`Copied ${report.ticketId} diagnostics`)
      window.setTimeout(() => {
        setCopiedId((cur) => (cur === report.ticketId ? null : cur))
      }, 2000)
    })
  }

  const filtered = reports.filter((r) => (filter === 'all' ? true : r.status === filter))
  const openCount = reports.filter((r) => r.status === 'open').length

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/70 p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <LifeBuoy className="h-5 w-5 text-cyan-400" />
          <div>
            <h3 className="text-lg font-semibold text-white">
              Still &amp; Clip Support Escalations
              {openCount > 0 && (
                <span className="ml-2 rounded-full bg-rose-500/20 border border-rose-500/40 px-2 py-0.5 text-xs font-medium text-rose-200">
                  {openCount} open
                </span>
              )}
            </h3>
            <p className="text-xs text-gray-400">
              Creator-reported Still and Video Clip generation errors with full diagnostic context.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-gray-700 overflow-hidden text-xs">
            {(['open', 'resolved', 'all'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setFilter(tab)}
                className={`px-2.5 py-1 capitalize transition-colors ${
                  filter === tab
                    ? 'bg-cyan-600/30 text-cyan-200 font-medium'
                    : 'bg-gray-800/60 text-gray-400 hover:text-gray-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={() => void loadReports()} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-6 text-sm text-gray-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading support escalations…
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-4 text-sm text-gray-500">
          No {filter === 'all' ? '' : filter} support escalations recorded yet.
        </p>
      ) : (
        <div className="space-y-3 max-h-[32rem] overflow-y-auto pr-1">
          {filtered.map((report) => (
            <div
              key={report.ticketId}
              className="rounded-lg border border-gray-800 bg-gray-950/70 p-3.5 space-y-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-cyan-300">
                    {report.ticketId}
                  </span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${
                      report.mediaType === 'clip'
                        ? 'bg-indigo-500/20 text-indigo-200 border border-indigo-500/30'
                        : 'bg-purple-500/20 text-purple-200 border border-purple-500/30'
                    }`}
                  >
                    {report.mediaType}
                  </span>
                  <span className="rounded bg-gray-800 px-1.5 py-0.5 text-[10px] text-gray-300">
                    {report.category}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(report.createdAt).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {report.user.email && (
                    <a
                      href={`mailto:${report.user.email}?subject=${encodeURIComponent(`Re: [${report.ticketId}] ${report.title}`)}`}
                      className="inline-flex items-center gap-1 rounded border border-gray-700 px-2 py-1 text-[11px] text-gray-300 hover:bg-gray-800"
                    >
                      <Mail className="h-3 w-3" />
                      {report.user.email}
                    </a>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px]"
                    onClick={() => handleCopyJson(report)}
                  >
                    {copiedId === report.ticketId ? (
                      <Check className="h-3 w-3 mr-1 text-emerald-400" />
                    ) : (
                      <Copy className="h-3 w-3 mr-1" />
                    )}
                    Copy JSON
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px]"
                    disabled={updatingId === report.ticketId}
                    onClick={() => void handleToggleStatus(report)}
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    {report.status === 'resolved' ? 'Reopen' : 'Resolve'}
                  </Button>
                </div>
              </div>

              <p className="text-xs font-medium text-gray-200">
                {report.title} — <span className="font-normal text-gray-400">{report.explanation}</span>
              </p>

              {report.userNote && (
                <p className="rounded border-l-2 border-cyan-400 bg-cyan-950/20 px-2.5 py-1.5 text-xs text-cyan-100">
                  Note: {report.userNote}
                </p>
              )}

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-400">
                {report.context.projectTitle && <span>Project: {report.context.projectTitle}</span>}
                {report.context.sceneNumber != null && <span>Scene {report.context.sceneNumber}</span>}
                {report.context.shotNumber != null && <span>Shot {report.context.shotNumber}</span>}
                {report.context.provider && <span>Provider: {report.context.provider}</span>}
                {report.context.generationMethod && <span>Method: {report.context.generationMethod}</span>}
              </div>

              {(report.technicalDetails || report.prompt) && (
                <details className="rounded border border-gray-800 bg-black/40 px-2.5 py-1.5">
                  <summary className="cursor-pointer text-[11px] text-gray-400 hover:text-gray-200">
                    Show prompt &amp; raw API error
                  </summary>
                  <div className="mt-2 space-y-2">
                    {report.prompt && (
                      <pre className="max-h-32 overflow-y-auto whitespace-pre-wrap text-[10px] text-gray-300 font-mono">
                        {report.prompt}
                      </pre>
                    )}
                    {report.technicalDetails && (
                      <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap text-[10px] text-rose-200/90 font-mono">
                        {report.technicalDetails}
                      </pre>
                    )}
                  </div>
                </details>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default SupportEscalationsCard
