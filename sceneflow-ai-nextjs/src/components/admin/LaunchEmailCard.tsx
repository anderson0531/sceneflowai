'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  AlertCircle,
  CheckCircle,
  Download,
  Loader,
  Mail,
  RefreshCw,
  Send,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'

type Pane = 'email' | 'waitlist'
type WaitlistFilter = 'all' | 'pending' | 'confirmed' | 'notified' | 'unsubscribed'

interface LaunchCampaign {
  subject: string
  html: string
  text: string
  updatedAt?: string
  updatedBy?: string
}

interface WaitlistRecord {
  email: string
  source: string
  createdAt: string
  status: 'pending' | 'confirmed'
  lastSentAt?: string
  confirmedAt?: string
  launchNotifiedAt?: string
}

interface WaitlistCounts {
  total: number
  pending: number
  confirmed: number
  notified: number
  unsubscribed: number
}

interface ActionResult {
  success: boolean
  message: string
}

const FILTERS: { id: WaitlistFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'confirmed', label: 'Confirmed' },
  { id: 'notified', label: 'Notified' },
  { id: 'unsubscribed', label: 'Unsubscribed' },
]

function formatDate(value?: string): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString()
}

export function LaunchEmailCard() {
  const [pane, setPane] = useState<Pane>('email')
  const [from, setFrom] = useState('SceneFlow AI Studio <noreply@sceneflowai.studio>')
  const [confirmation, setConfirmation] = useState({ subject: '', html: '', text: '' })
  const [campaign, setCampaign] = useState<LaunchCampaign>({
    subject: '',
    html: '',
    text: '',
  })
  const [previewKind, setPreviewKind] = useState<'launch' | 'confirm'>('launch')
  const [loadingCampaign, setLoadingCampaign] = useState(true)
  const [saving, setSaving] = useState(false)
  const [acting, setActing] = useState(false)
  const [result, setResult] = useState<ActionResult | null>(null)

  const [filter, setFilter] = useState<WaitlistFilter>('all')
  const [counts, setCounts] = useState<WaitlistCounts>({
    total: 0,
    pending: 0,
    confirmed: 0,
    notified: 0,
    unsubscribed: 0,
  })
  const [records, setRecords] = useState<WaitlistRecord[]>([])
  const [listTotal, setListTotal] = useState(0)
  const [loadingList, setLoadingList] = useState(false)
  const [selectedEmail, setSelectedEmail] = useState('')
  const [sendConfirm, setSendConfirm] = useState('')
  const [dryRunCount, setDryRunCount] = useState<number | null>(null)

  const preview = previewKind === 'launch' ? campaign : confirmation

  const loadCampaign = useCallback(async () => {
    setLoadingCampaign(true)
    try {
      const response = await fetch('/api/admin/waitlist/campaign')
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not load campaign')
      setFrom(data.from)
      setConfirmation(data.confirmation)
      setCampaign(data.campaign)
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Could not load campaign',
      })
    } finally {
      setLoadingCampaign(false)
    }
  }, [])

  const loadWaitlist = useCallback(async (status: WaitlistFilter) => {
    setLoadingList(true)
    try {
      const response = await fetch(`/api/admin/waitlist?status=${status}&limit=200`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not load waitlist')
      setCounts(data.counts)
      setRecords(data.items || [])
      setListTotal(data.total || 0)
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Could not load waitlist',
      })
    } finally {
      setLoadingList(false)
    }
  }, [])

  useEffect(() => {
    void loadCampaign()
  }, [loadCampaign])

  useEffect(() => {
    if (pane === 'waitlist') void loadWaitlist(filter)
  }, [pane, filter, loadWaitlist])

  async function saveCampaign() {
    setSaving(true)
    setResult(null)
    try {
      const response = await fetch('/api/admin/waitlist/campaign', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: campaign.subject,
          html: campaign.html,
          text: campaign.text,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not save campaign')
      setCampaign(data.campaign)
      setResult({ success: true, message: 'Launch draft saved.' })
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Could not save campaign',
      })
    } finally {
      setSaving(false)
    }
  }

  async function postAction(
    action: 'test-launch' | 'resend-confirm' | 'send-launch' | 'send-launch-all',
    extras: { email?: string; dryRun?: boolean; cursor?: string } = {}
  ) {
    const response = await fetch('/api/admin/waitlist/actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...extras }),
    })
    const data = (await response.json()) as {
      error?: string
      ok?: boolean
      reason?: string
      sent?: number
      skipped?: number
      remaining?: number
      cursor?: string | null
      recipients?: string[]
      failed?: { email: string; error: string }[]
    }
    if (!response.ok) throw new Error(data.error || 'Action failed')
    return data
  }

  async function runAction(
    action: 'test-launch' | 'resend-confirm' | 'send-launch' | 'send-launch-all',
    extras: { email?: string; dryRun?: boolean } = {}
  ) {
    setActing(true)
    setResult(null)
    try {
      if (action === 'send-launch-all' && extras.dryRun) {
        const data = await postAction(action, extras)
        const count = Array.isArray(data.recipients) ? data.recipients.length : 0
        setDryRunCount(count + (data.remaining || 0))
        setResult({
          success: true,
          message: `Dry run: ${count + (data.remaining || 0)} confirmed recipient(s) would be emailed. Type SEND to send.`,
        })
        return
      }

      if (action === 'send-launch-all') {
        let cursor: string | undefined
        let sent = 0
        let skipped = 0
        let failed = 0
        for (let batch = 0; batch < 50; batch++) {
          const data = await postAction(action, cursor ? { cursor } : {})
          sent += data.sent || 0
          skipped = data.skipped ?? skipped
          failed += data.failed?.length || 0
          const next = data.remaining && data.cursor ? data.cursor : undefined
          if (!next) break
          cursor = next
        }
        setResult({
          success: failed === 0,
          message: `Done. Sent ${sent}${skipped ? `, skipped ${skipped}` : ''}${
            failed ? `, failed ${failed}` : ''
          }.`,
        })
        if (pane === 'waitlist') await loadWaitlist(filter)
        return
      }

      const data = await postAction(action, extras)
      const sent = typeof data.sent === 'number' ? data.sent : 0
      const skipped = typeof data.skipped === 'number' ? data.skipped : 0
      setResult({
        success: Boolean(data.ok),
        message:
          data.reason === 'already_confirmed'
            ? `${extras.email || 'This address'} is already confirmed.`
            : data.reason === 'already_notified'
              ? `${extras.email || 'This address'} already received the launch email.`
              : data.reason === 'pending'
                ? `${extras.email || 'This address'} is still pending confirmation.`
                : data.reason === 'not_found'
                  ? 'Waitlist record not found.'
                  : data.reason === 'unsubscribed'
                    ? `${extras.email || 'This address'} has unsubscribed.`
                    : `Done. Sent ${sent}${skipped ? `, skipped ${skipped}` : ''}.`,
      })
      if (pane === 'waitlist') await loadWaitlist(filter)
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Action failed',
      })
    } finally {
      setActing(false)
    }
  }

  function exportCsv() {
    const header = 'email,status,source,createdAt,confirmedAt,lastSentAt,launchNotifiedAt'
    const rows = records.map((record) =>
      [
        record.email,
        record.status,
        record.source,
        record.createdAt,
        record.confirmedAt || '',
        record.lastSentAt || '',
        record.launchNotifiedAt || '',
      ]
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(',')
    )
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'november-launch-waitlist.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  const eligibleCount = useMemo(
    () => records.filter((record) => record.status === 'confirmed' && !record.launchNotifiedAt).length,
    [records]
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-dark-card rounded-xl border border-dark-border p-6"
    >
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sf-primary/20">
          <Mail className="h-5 w-5 text-sf-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">November launch email</h3>
          <p className="text-sm text-gray-400">
            Review confirmation and launch mail, then manage the waitlist
          </p>
        </div>
      </div>

      <div className="mb-5 flex gap-2">
        {(['email', 'waitlist'] as const).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setPane(id)}
            className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
              pane === id
                ? 'border-sf-primary bg-sf-primary/20 text-sf-primary'
                : 'border-dark-border bg-dark-bg text-gray-300 hover:border-sf-primary/50'
            }`}
          >
            {id === 'email' ? 'Email' : 'Waitlist'}
          </button>
        ))}
      </div>

      {result && (
        <div
          className={`mb-5 flex items-start gap-2 rounded-lg border px-4 py-3 text-sm ${
            result.success
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
              : 'border-red-500/30 bg-red-500/10 text-red-200'
          }`}
        >
          {result.success ? (
            <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <p>{result.message}</p>
        </div>
      )}

      {pane === 'email' ? (
        <div className="space-y-5">
          <p className="text-xs text-gray-500">From {from}</p>

          <div className="flex gap-2">
            {(['launch', 'confirm'] as const).map((kind) => (
              <button
                key={kind}
                type="button"
                onClick={() => setPreviewKind(kind)}
                className={`rounded-lg border px-3 py-1 text-xs transition-colors ${
                  previewKind === kind
                    ? 'border-sf-primary bg-sf-primary/20 text-sf-primary'
                    : 'border-dark-border text-gray-400'
                }`}
              >
                {kind === 'launch' ? 'Launch preview' : 'Confirmation preview'}
              </button>
            ))}
          </div>

          {loadingCampaign ? (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Loader className="h-4 w-4 animate-spin" />
              Loading draft…
            </div>
          ) : (
            <>
              <div className="overflow-hidden rounded-lg border border-dark-border bg-white">
                <div className="border-b border-gray-200 bg-gray-50 px-4 py-2 text-xs text-gray-600">
                  Subject: {preview.subject || '—'}
                </div>
                <iframe
                  title="Launch email preview"
                  srcDoc={preview.html || '<p></p>'}
                  className="h-56 w-full bg-white"
                />
              </div>

              {previewKind === 'launch' && (
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-300">
                    Launch subject
                    <input
                      value={campaign.subject}
                      onChange={(event) =>
                        setCampaign((current) => ({ ...current, subject: event.target.value }))
                      }
                      className="mt-2 w-full rounded-lg border border-dark-border bg-dark-bg px-4 py-2 text-white placeholder-gray-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-sf-primary"
                    />
                  </label>
                  <label className="block text-sm font-medium text-gray-300">
                    HTML
                    <textarea
                      value={campaign.html}
                      onChange={(event) =>
                        setCampaign((current) => ({ ...current, html: event.target.value }))
                      }
                      rows={6}
                      className="mt-2 w-full rounded-lg border border-dark-border bg-dark-bg px-4 py-2 font-mono text-xs text-white focus:border-transparent focus:outline-none focus:ring-2 focus:ring-sf-primary"
                    />
                  </label>
                  <label className="block text-sm font-medium text-gray-300">
                    Plain text
                    <textarea
                      value={campaign.text}
                      onChange={(event) =>
                        setCampaign((current) => ({ ...current, text: event.target.value }))
                      }
                      rows={5}
                      className="mt-2 w-full rounded-lg border border-dark-border bg-dark-bg px-4 py-2 font-mono text-xs text-white focus:border-transparent focus:outline-none focus:ring-2 focus:ring-sf-primary"
                    />
                  </label>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {previewKind === 'launch' && (
                  <Button type="button" onClick={() => void saveCampaign()} disabled={saving || acting}>
                    {saving ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Save draft
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void runAction('test-launch')}
                  disabled={acting || saving}
                >
                  {acting ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Send test to me
                </Button>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {[
              ['Total', counts.total],
              ['Pending', counts.pending],
              ['Confirmed', counts.confirmed],
              ['Notified', counts.notified],
              ['Unsubscribed', counts.unsubscribed],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-lg border border-dark-border bg-dark-bg px-3 py-2">
                <p className="text-xs text-gray-500">{label}</p>
                <p className="text-lg font-semibold text-white">{value}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                className={`rounded-lg border px-3 py-1 text-xs transition-colors ${
                  filter === item.id
                    ? 'border-sf-primary bg-sf-primary/20 text-sf-primary'
                    : 'border-dark-border text-gray-400'
                }`}
              >
                {item.label}
              </button>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void loadWaitlist(filter)}
              disabled={loadingList}
            >
              <RefreshCw className={`mr-2 h-3.5 w-3.5 ${loadingList ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={exportCsv} disabled={records.length === 0}>
              <Download className="mr-2 h-3.5 w-3.5" />
              CSV
            </Button>
          </div>

          <div className="max-h-80 overflow-auto rounded-lg border border-dark-border">
            {loadingList ? (
              <div className="flex items-center gap-2 px-4 py-6 text-sm text-gray-400">
                <Loader className="h-4 w-4 animate-spin" />
                Loading waitlist…
              </div>
            ) : records.length === 0 ? (
              <p className="px-4 py-6 text-sm text-gray-500">No signups in this filter.</p>
            ) : (
              <ul className="divide-y divide-dark-border">
                {records.map((record) => (
                  <li key={record.email}>
                    <button
                      type="button"
                      onClick={() => setSelectedEmail(record.email)}
                      className={`flex w-full items-start justify-between gap-3 px-4 py-3 text-left hover:bg-white/5 ${
                        selectedEmail === record.email ? 'bg-sf-primary/10' : ''
                      }`}
                    >
                      <div>
                        <p className="text-sm font-medium text-white">{record.email}</p>
                        <p className="text-xs text-gray-500">
                          {record.status}
                          {record.launchNotifiedAt ? ' · launch sent' : ''}
                          {' · '}
                          {record.source} · {formatDate(record.createdAt)}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <p className="text-xs text-gray-500">
            Showing {records.length} of {listTotal}. Selected: {selectedEmail || 'none'}
          </p>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={!selectedEmail || acting}
              onClick={() => void runAction('resend-confirm', { email: selectedEmail })}
            >
              Resend confirm
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!selectedEmail || acting}
              onClick={() => void runAction('send-launch', { email: selectedEmail })}
            >
              Send launch to selected
            </Button>
          </div>

          <div className="space-y-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
            <p className="text-sm text-amber-100">
              Send launch to every confirmed address that has not been notified.
              {dryRunCount !== null ? ` Dry run found ${dryRunCount}.` : ` ${counts.confirmed - counts.notified} currently eligible (approx).`}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={acting}
                onClick={() => void runAction('send-launch-all', { dryRun: true })}
              >
                Dry run
              </Button>
              <input
                value={sendConfirm}
                onChange={(event) => setSendConfirm(event.target.value)}
                placeholder='Type SEND'
                className="w-28 rounded-lg border border-dark-border bg-dark-bg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-sf-primary"
              />
              <Button
                type="button"
                disabled={acting || sendConfirm !== 'SEND' || dryRunCount === null}
                onClick={() => void runAction('send-launch-all')}
              >
                Send all
              </Button>
            </div>
            {eligibleCount > 0 && filter !== 'all' ? (
              <p className="text-xs text-gray-500">
                Filter view has {eligibleCount} unsent confirmed row(s). Dry run uses the full list.
              </p>
            ) : null}
          </div>
        </div>
      )}
    </motion.div>
  )
}

export default LaunchEmailCard
