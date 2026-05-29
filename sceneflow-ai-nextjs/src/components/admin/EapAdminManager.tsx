'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { toast } from 'sonner'
import {
  Download,
  FileSearch,
  Save,
  MessageSquarePlus,
  Sparkles,
  Mail,
  CheckCircle2,
  Clock,
  XCircle,
} from 'lucide-react'
import type {
  EapAiAssessment,
  EapApplicationRecord,
  EapApplicationStatus,
  EapReviewRecord,
} from '@/lib/early-access/applications'

type ListItem = { application: EapApplicationRecord; review: EapReviewRecord }

const STATUS_OPTIONS: EapApplicationStatus[] = ['new', 'in_review', 'approved', 'waitlisted', 'rejected']

const AI_STATUS_LABELS: Record<EapAiAssessment['recommendedStatus'], string> = {
  approve: 'Approve',
  waitlist: 'Waitlist',
  reject: 'Reject',
  needs_review: 'Needs review',
}

function inviteStatusLabel(review: EapReviewRecord): { label: string; tone: 'neutral' | 'success' | 'warning' | 'error' } {
  if (review.activatedAt) return { label: 'Redeemed', tone: 'success' }
  if (!review.inviteSentAt) return { label: 'Not sent', tone: 'neutral' }
  if (review.inviteExpiresAt && Date.now() > new Date(review.inviteExpiresAt).getTime()) {
    return { label: 'Expired', tone: 'error' }
  }
  return { label: 'Sent', tone: 'warning' }
}

export function EapAdminManager() {
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<ListItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(25)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | EapApplicationStatus>('all')
  const [sort, setSort] = useState<'newest' | 'score_desc' | 'ai_recommendation' | 'ai_confidence_desc'>('newest')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<ListItem | null>(null)
  const [noteInput, setNoteInput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [approveLoading, setApproveLoading] = useState(false)
  const [scoreDraft, setScoreDraft] = useState({
    agencyLead: 0,
    seriesCreator: 0,
    techEnthusiast: 0,
    casualCreator: 0,
  })

  const totalPages = Math.max(1, Math.ceil(total / limit))
  const selectedItem = useMemo(
    () => items.find((item) => item.application.applicationId === selectedId) || null,
    [items, selectedId]
  )

  const loadList = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        status: statusFilter,
        search,
        sort,
      })
      const res = await fetch(`/api/admin/eap/applications?${params}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to load applications')
      setItems(data.items || [])
      setTotal(data.total || 0)
      if (!selectedId && data.items?.[0]?.application?.applicationId) {
        setSelectedId(data.items[0].application.applicationId)
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to load applications')
    } finally {
      setLoading(false)
    }
  }

  const loadDetail = async (applicationId: string) => {
    try {
      const res = await fetch(`/api/admin/eap/applications/${encodeURIComponent(applicationId)}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to load application detail')
      setDetail({ application: data.application, review: data.review })
      setScoreDraft({
        agencyLead: data.review?.score?.agencyLead ?? 0,
        seriesCreator: data.review?.score?.seriesCreator ?? 0,
        techEnthusiast: data.review?.score?.techEnthusiast ?? 0,
        casualCreator: data.review?.score?.casualCreator ?? 0,
      })
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to load application detail')
    }
  }

  useEffect(() => {
    loadList()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, statusFilter, sort])

  useEffect(() => {
    if (selectedId) loadDetail(selectedId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId])

  useEffect(() => {
    if (!selectedItem) return
    setDetail(selectedItem)
  }, [selectedItem])

  const saveStatus = async (status: EapApplicationStatus, sendNotification = false) => {
    if (!selectedId) return
    const res = await fetch(`/api/admin/eap/applications/${encodeURIComponent(selectedId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, sendNotification }),
    })
    const data = await res.json()
    if (!res.ok) {
      toast.error(data?.error || 'Failed to update status')
      return
    }
    toast.success(sendNotification ? 'Status updated and email sent' : 'Status updated')
    setDetail({ application: data.application, review: data.review })
    await loadList()
  }

  const approveAndSendInvite = async () => {
    if (!selectedId) return
    setApproveLoading(true)
    try {
      const res = await fetch(`/api/admin/eap/applications/${encodeURIComponent(selectedId)}/approve`, {
        method: 'POST',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to approve and send invite')
      toast.success(data.alreadySent ? 'Invite already sent (still valid)' : 'Approved and invite email sent')
      setDetail({ application: data.application, review: data.review })
      await loadList()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Approve failed')
    } finally {
      setApproveLoading(false)
    }
  }

  const runAiAssessment = async () => {
    if (!selectedId) return
    setAiLoading(true)
    try {
      const res = await fetch(`/api/admin/eap/applications/${encodeURIComponent(selectedId)}/ai-assess`, {
        method: 'POST',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'AI assessment failed')
      toast.success('AI assessment complete')
      setDetail({ application: data.application, review: data.review })
      if (data.aiAssessment?.suggestedScores) {
        setScoreDraft(data.aiAssessment.suggestedScores)
      }
      await loadList()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'AI assessment failed')
    } finally {
      setAiLoading(false)
    }
  }

  const applySuggestedScores = () => {
    const ai = detail?.review.aiAssessment
    if (!ai?.suggestedScores) {
      toast.error('No AI suggested scores available')
      return
    }
    setScoreDraft(ai.suggestedScores)
    toast.message('Suggested scores applied to draft — click Save Score to persist')
  }

  const applySuggestedStatus = () => {
    const ai = detail?.review.aiAssessment
    if (!ai) return
    const map: Record<EapAiAssessment['recommendedStatus'], EapApplicationStatus | null> = {
      approve: 'approved',
      waitlist: 'waitlisted',
      reject: 'rejected',
      needs_review: 'in_review',
    }
    const next = map[ai.recommendedStatus]
    if (!next) return
    if (next === 'approved') {
      toast.message('Use "Approve & send invite" for approved applicants')
      return
    }
    saveStatus(next)
  }

  const saveScore = async () => {
    if (!selectedId) return
    const res = await fetch(`/api/admin/eap/applications/${encodeURIComponent(selectedId)}/score`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scoreDraft),
    })
    const data = await res.json()
    if (!res.ok) {
      toast.error(data?.error || 'Failed to save score')
      return
    }
    toast.success('Score saved')
    setDetail({ application: data.application, review: data.review })
    await loadList()
  }

  const addNote = async () => {
    if (!selectedId || !noteInput.trim()) return
    const res = await fetch(`/api/admin/eap/applications/${encodeURIComponent(selectedId)}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: noteInput }),
    })
    const data = await res.json()
    if (!res.ok) {
      toast.error(data?.error || 'Failed to add note')
      return
    }
    setNoteInput('')
    toast.success('Note added')
    setDetail({ application: data.application, review: data.review })
    await loadList()
  }

  const exportCsv = () => {
    const params = new URLSearchParams({ format: 'csv', status: statusFilter, search })
    window.open(`/api/admin/eap/export?${params}`, '_blank')
  }

  const scoreTotal =
    scoreDraft.agencyLead + scoreDraft.seriesCreator + scoreDraft.techEnthusiast + scoreDraft.casualCreator

  const inviteStatus = detail ? inviteStatusLabel(detail.review) : null
  const ai = detail?.review.aiAssessment

  return (
    <div className="space-y-6">
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-white">EAP Applications</h3>
            <p className="text-sm text-gray-400">
              Review submissions, run AI qualification, approve with invite emails, and export records.
            </p>
          </div>
          <Button variant="outline" onClick={exportCsv}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>

        <div className="flex flex-col md:flex-row gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, org, role..."
            className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-white"
          />
          <Button variant="outline" onClick={() => { setPage(1); loadList() }}>
            <FileSearch className="w-4 h-4 mr-2" />
            Search
          </Button>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as 'all' | EapApplicationStatus)
              setPage(1)
            }}
            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-white"
          >
            <option value="all">All statuses</option>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value as typeof sort)
              setPage(1)
            }}
            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-white"
          >
            <option value="newest">Newest first</option>
            <option value="score_desc">Highest score</option>
            <option value="ai_recommendation">AI recommendation</option>
            <option value="ai_confidence_desc">AI confidence</option>
          </select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-2 border border-gray-800 rounded-md overflow-hidden">
            <div className="px-3 py-2 bg-gray-800 text-xs text-gray-300">
              {loading ? 'Loading...' : `${total} application(s)`}
            </div>
            <div className="max-h-[560px] overflow-y-auto">
              {items.map((item) => {
                const isSelected = item.application.applicationId === selectedId
                const aiRec = item.review.aiAssessment?.recommendedStatus
                return (
                  <button
                    key={item.application.applicationId}
                    className={`w-full text-left px-3 py-3 border-b border-gray-800 hover:bg-gray-800/60 ${
                      isSelected ? 'bg-blue-500/10 border-l-2 border-l-blue-400' : ''
                    }`}
                    onClick={() => setSelectedId(item.application.applicationId)}
                  >
                    <div className="text-sm font-medium text-white">{item.application.fullName}</div>
                    <div className="text-xs text-gray-400 truncate">{item.application.email}</div>
                    <div className="mt-1 flex items-center justify-between text-xs gap-2">
                      <span className="text-gray-500 truncate">{item.application.organizationName || 'No org'}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        {aiRec && (
                          <span className="text-purple-300">{AI_STATUS_LABELS[aiRec]}</span>
                        )}
                        <span className="uppercase text-cyan-300">{item.review.status}</span>
                      </div>
                    </div>
                  </button>
                )
              })}
              {items.length === 0 && (
                <div className="px-3 py-6 text-center text-sm text-gray-500">No applications found.</div>
              )}
            </div>
            <div className="px-3 py-2 bg-gray-800 flex items-center justify-between text-xs text-gray-300">
              <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="disabled:opacity-50">
                Prev
              </button>
              <span>Page {page} / {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="disabled:opacity-50">
                Next
              </button>
            </div>
          </div>

          <div className="lg:col-span-3 border border-gray-800 rounded-md p-4 space-y-4">
            {!detail && <p className="text-sm text-gray-400">Select an application to review.</p>}

            {detail && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <Field label="Applicant" value={detail.application.fullName} />
                  <Field label="Email" value={detail.application.email} />
                  <Field label="Country" value={detail.application.countryOfOrigin} />
                  <Field label="Organization" value={detail.application.organizationName} />
                  <Field label="Role" value={detail.application.primaryRole} />
                  <Field label="Distribution" value={detail.application.distributionChannel} />
                  <Field label="Monthly volume" value={detail.application.monthlyVolume} />
                  <Field label="Bottleneck" value={detail.application.bottleneck} />
                  <Field label="Art styles" value={detail.application.artStyles.join(', ')} />
                  {detail.application.artStyleOther && (
                    <Field label="Other art style" value={detail.application.artStyleOther} />
                  )}
                  <Field label="Audience resonance" value={detail.application.audienceResonanceImportance} />
                  <Field label="Multi-language" value={detail.application.multiLanguageStatus} />
                  <Field label="GCP/Vertex" value={detail.application.gcpVertexComfort} />
                  <Field label="Feedback commitment" value={detail.application.weeklyFeedbackCommitment} />
                  <Field label="F2V experience" value={detail.application.hasF2vExperience ? 'Yes' : 'No'} />
                </div>

                <div className="rounded-lg border border-gray-700 bg-gray-800/40 p-3 space-y-2">
                  <p className="text-sm font-medium text-gray-200 flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Invite status
                  </p>
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <InviteBadge status={inviteStatus} />
                    {detail.review.inviteSentAt && (
                      <span className="text-gray-400">
                        Sent {new Date(detail.review.inviteSentAt).toLocaleString()}
                      </span>
                    )}
                    {detail.review.inviteExpiresAt && (
                      <span className="text-gray-400">
                        Expires {new Date(detail.review.inviteExpiresAt).toLocaleDateString()}
                      </span>
                    )}
                    {detail.review.activatedAt && (
                      <span className="text-emerald-300">
                        Activated {new Date(detail.review.activatedAt).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-gray-300">Workflow actions</p>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={approveAndSendInvite} disabled={approveLoading}>
                      {approveLoading ? 'Sending...' : 'Approve & send invite'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => saveStatus('waitlisted', true)}>
                      Waitlist + email
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => saveStatus('rejected', true)}>
                      Reject + email
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => saveStatus('in_review')}>
                      Mark in review
                    </Button>
                  </div>
                </div>

                <div className="rounded-lg border border-purple-500/30 bg-purple-950/20 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-purple-200 flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      AI qualification
                    </p>
                    <Button size="sm" variant="outline" onClick={runAiAssessment} disabled={aiLoading}>
                      {aiLoading ? 'Running...' : 'Run AI assessment'}
                    </Button>
                  </div>

                  {ai ? (
                    <div className="space-y-3 text-sm">
                      <div className="flex flex-wrap gap-2 items-center">
                        <span className="text-white font-medium">
                          {AI_STATUS_LABELS[ai.recommendedStatus]}
                        </span>
                        <span className="text-gray-400">
                          {Math.round(ai.confidence * 100)}% confidence
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(ai.assessedAt).toLocaleString()} · {ai.model}
                        </span>
                      </div>
                      <p className="text-gray-200">{ai.summary}</p>
                      {ai.strengths.length > 0 && (
                        <div>
                          <p className="text-emerald-300 text-xs uppercase mb-1">Strengths</p>
                          <ul className="list-disc pl-5 text-gray-300 space-y-1">
                            {ai.strengths.map((s) => <li key={s}>{s}</li>)}
                          </ul>
                        </div>
                      )}
                      {ai.risks.length > 0 && (
                        <div>
                          <p className="text-amber-300 text-xs uppercase mb-1">Risks</p>
                          <ul className="list-disc pl-5 text-gray-300 space-y-1">
                            {ai.risks.map((r) => <li key={r}>{r}</li>)}
                          </ul>
                        </div>
                      )}
                      <p className="text-gray-400 text-xs">{ai.rationale}</p>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={applySuggestedScores}>
                          Apply suggested scores
                        </Button>
                        <Button size="sm" variant="outline" onClick={applySuggestedStatus}>
                          Set status to {AI_STATUS_LABELS[ai.recommendedStatus]}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">No AI assessment yet.</p>
                  )}
                </div>

                <div className="space-y-3">
                  <p className="text-sm text-gray-300">Internal scoring rubric (0-5)</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {(['agencyLead', 'seriesCreator', 'techEnthusiast', 'casualCreator'] as const).map((key) => (
                      <label key={key} className="text-xs text-gray-400">
                        {key}
                        <input
                          type="number"
                          min={0}
                          max={5}
                          value={scoreDraft[key]}
                          onChange={(e) => {
                            const value = Math.max(0, Math.min(5, Number(e.target.value || 0)))
                            setScoreDraft((prev) => ({ ...prev, [key]: value }))
                          }}
                          className="mt-1 w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white"
                        />
                      </label>
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-cyan-300">Total score: {scoreTotal}</p>
                    <Button size="sm" onClick={saveScore}>
                      <Save className="w-4 h-4 mr-2" />
                      Save Score
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-gray-300">Reviewer notes</p>
                  <div className="flex gap-2">
                    <input
                      value={noteInput}
                      onChange={(e) => setNoteInput(e.target.value)}
                      placeholder="Add a note..."
                      className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-white"
                    />
                    <Button size="sm" onClick={addNote}>
                      <MessageSquarePlus className="w-4 h-4 mr-2" />
                      Add
                    </Button>
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-2">
                    {detail.review.notes.map((note) => (
                      <div key={note.id} className="p-2 rounded bg-gray-800/70 border border-gray-700 text-sm">
                        <p className="text-gray-200">{note.body}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {note.author} · {new Date(note.createdAt).toLocaleString()}
                        </p>
                      </div>
                    ))}
                    {detail.review.notes.length === 0 && <p className="text-sm text-gray-500">No notes yet.</p>}
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-sm text-gray-300">Series concept</p>
                  <p className="text-sm text-gray-200 whitespace-pre-wrap bg-gray-800/60 border border-gray-700 rounded p-3">
                    {detail.application.seriesConcept}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-gray-400">{label}</p>
      <p className="text-white">{value || '—'}</p>
    </div>
  )
}

function InviteBadge({
  status,
}: {
  status: { label: string; tone: 'neutral' | 'success' | 'warning' | 'error' } | null
}) {
  if (!status) return null
  const Icon =
    status.tone === 'success' ? CheckCircle2 : status.tone === 'error' ? XCircle : Clock
  const color =
    status.tone === 'success'
      ? 'text-emerald-300'
      : status.tone === 'error'
        ? 'text-red-300'
        : status.tone === 'warning'
          ? 'text-amber-300'
          : 'text-gray-400'
  return (
    <span className={`inline-flex items-center gap-1 ${color}`}>
      <Icon className="w-4 h-4" />
      {status.label}
    </span>
  )
}
