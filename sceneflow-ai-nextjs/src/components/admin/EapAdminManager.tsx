'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { toast } from 'sonner'
import { Download, FileSearch, Save, MessageSquarePlus } from 'lucide-react'
import type {
  EapApplicationRecord,
  EapApplicationStatus,
  EapReviewRecord,
} from '@/lib/early-access/applications'

type ListItem = { application: EapApplicationRecord; review: EapReviewRecord }

const STATUS_OPTIONS: EapApplicationStatus[] = ['new', 'in_review', 'approved', 'waitlisted', 'rejected']

export function EapAdminManager() {
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<ListItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(25)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | EapApplicationStatus>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<ListItem | null>(null)
  const [noteInput, setNoteInput] = useState('')
  const [scoreDraft, setScoreDraft] = useState({
    agencyLead: 0,
    seriesCreator: 0,
    techEnthusiast: 0,
    casualCreator: 0,
  })

  const totalPages = Math.max(1, Math.ceil(total / limit))

  const selectedItem = useMemo(() => items.find((item) => item.application.applicationId === selectedId) || null, [items, selectedId])

  const loadList = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        status: statusFilter,
        search,
      })
      const res = await fetch(`/api/admin/eap/applications?${params}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to load applications')
      setItems(data.items || [])
      setTotal(data.total || 0)
      if (!selectedId && data.items?.[0]?.application?.applicationId) {
        setSelectedId(data.items[0].application.applicationId)
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to load applications')
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
    } catch (error: any) {
      toast.error(error?.message || 'Failed to load application detail')
    }
  }

  useEffect(() => {
    loadList()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, statusFilter])

  useEffect(() => {
    if (selectedId) loadDetail(selectedId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId])

  useEffect(() => {
    if (!selectedItem) return
    setDetail(selectedItem)
  }, [selectedItem])

  const saveStatus = async (status: EapApplicationStatus) => {
    if (!selectedId) return
    const res = await fetch(`/api/admin/eap/applications/${encodeURIComponent(selectedId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    const data = await res.json()
    if (!res.ok) {
      toast.error(data?.error || 'Failed to update status')
      return
    }
    toast.success('Status updated')
    setDetail({ application: data.application, review: data.review })
    await loadList()
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
    const params = new URLSearchParams({
      format: 'csv',
      status: statusFilter,
      search,
    })
    window.open(`/api/admin/eap/export?${params}`, '_blank')
  }

  const scoreTotal =
    scoreDraft.agencyLead + scoreDraft.seriesCreator + scoreDraft.techEnthusiast + scoreDraft.casualCreator

  return (
    <div className="space-y-6">
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-white">EAP Applications</h3>
            <p className="text-sm text-gray-400">Review submissions, update status, score candidates, and export records.</p>
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
              setStatusFilter(e.target.value as any)
              setPage(1)
            }}
            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-white"
          >
            <option value="all">All statuses</option>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
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
                    <div className="mt-1 flex items-center justify-between text-xs">
                      <span className="text-gray-500">{item.application.organizationName || 'No org'}</span>
                      <span className="uppercase text-cyan-300">{item.review.status}</span>
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
                  <div>
                    <p className="text-gray-400">Applicant</p>
                    <p className="text-white font-medium">{detail.application.fullName}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Email</p>
                    <p className="text-white">{detail.application.email}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Country</p>
                    <p className="text-white">{detail.application.countryOfOrigin}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Organization</p>
                    <p className="text-white">{detail.application.organizationName}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-gray-300">Status</p>
                  <div className="flex flex-wrap gap-2">
                    {STATUS_OPTIONS.map((status) => (
                      <Button
                        key={status}
                        variant={detail.review.status === status ? 'primary' : 'outline'}
                        size="sm"
                        onClick={() => saveStatus(status)}
                      >
                        {status}
                      </Button>
                    ))}
                  </div>
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
