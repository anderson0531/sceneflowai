'use client'

import React, { useCallback, useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Loader2, Search, Copy, Check, Library } from 'lucide-react'
import { toast } from 'sonner'

export type FreesoundAttribution = {
  provider: 'freesound'
  soundId: number
  name: string
  username: string
  license: string
  creditLine: string
}

type SearchResult = {
  id: number
  name: string
  username: string
  duration: number
  license: string
}

export interface FreesoundBrowseModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialQuery: string
  projectId: string
  onImported: (url: string, attribution: FreesoundAttribution, durationSeconds?: number) => void
}

function formatLicenseLabel(license: string): string {
  if (!license) return '—'
  if (license.length > 72) return `${license.slice(0, 69)}…`
  return license
}

export function FreesoundBrowseModal({
  open,
  onOpenChange,
  initialQuery,
  projectId,
  onImported,
}: FreesoundBrowseModalProps) {
  const [q, setQ] = useState(initialQuery)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const [total, setTotal] = useState(0)
  const [importingId, setImportingId] = useState<number | null>(null)
  const [playingId, setPlayingId] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)

  const runSearch = useCallback(async (nextPage: number, searchQuery: string) => {
    const query = searchQuery.trim() || 'sound'
    setLoading(true)
    try {
      const res = await fetch('/api/freesound/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: query, page: nextPage, pageSize: 15 }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || 'Search failed')
      }
      setResults(Array.isArray(data.results) ? data.results : [])
      setTotal(typeof data.count === 'number' ? data.count : 0)
      setPage(nextPage)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Search failed'
      toast.error(msg)
      setResults([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    setQ(initialQuery)
    setPlayingId(null)
    void runSearch(1, initialQuery)
  }, [open, initialQuery, runSearch])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    void runSearch(1, q)
  }

  const copyQuery = async () => {
    const text = q.trim()
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast.success('Search text copied')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Could not copy')
    }
  }

  const togglePreview = (id: number) => {
    setPlayingId((prev) => (prev === id ? null : id))
  }

  const importSound = async (soundId: number) => {
    setImportingId(soundId)
    try {
      const res = await fetch('/api/freesound/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ soundId, projectId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || 'Import failed')
      }
      if (!data.url || !data.attribution) {
        throw new Error('Invalid import response')
      }
      onImported(data.url, data.attribution as FreesoundAttribution, data.duration)
      toast.success('Sound added to this slot')
      onOpenChange(false)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Import failed'
      toast.error(msg)
    } finally {
      setImportingId(null)
    }
  }

  const hasNext = results.length > 0 && page * 15 < total

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-zinc-900 border-zinc-700 text-zinc-100 max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-zinc-100">
            <Library className="w-5 h-5 text-amber-400" />
            Browse sounds
          </DialogTitle>
          <DialogDescription className="text-zinc-400 text-left">
            Search licensed sounds from Freesound. Previews are compressed; imported audio uses the HQ preview
            (original downloads require a separate Freesound OAuth flow). Respect each sound&apos;s license; attribution
            is stored as plain text for your exports.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSearchSubmit} className="flex gap-2 shrink-0">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search…"
            className="bg-zinc-950 border-zinc-600 text-zinc-100"
            autoFocus
          />
          <Button type="submit" variant="secondary" disabled={loading} className="shrink-0">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={copyQuery}
            title="Copy search text"
            className="shrink-0 border-zinc-600"
          >
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
          </Button>
        </form>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
          {results.map((r) => (
            <div
              key={r.id}
              className="rounded-lg border border-amber-900/40 bg-amber-950/20 p-3 space-y-2"
            >
              <div className="flex justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-amber-100 truncate">{r.name}</p>
                  <p className="text-xs text-zinc-400">by {r.username}</p>
                </div>
                <span className="text-xs text-zinc-500 shrink-0">{r.duration.toFixed(1)}s</span>
              </div>
              <p className="text-[11px] text-zinc-500 break-all">{formatLicenseLabel(r.license)}</p>
              {playingId === r.id && (
                <audio
                  src={`/api/freesound/preview?soundId=${r.id}`}
                  controls
                  className="w-full h-9"
                  autoPlay
                  onEnded={() => setPlayingId(null)}
                />
              )}
              <div className="flex gap-2 flex-wrap">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="border-zinc-600 text-zinc-200"
                  onClick={() => togglePreview(r.id)}
                >
                  {playingId === r.id ? 'Stop preview' : 'Preview'}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                  disabled={importingId !== null}
                  onClick={() => importSound(r.id)}
                >
                  {importingId === r.id ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-1 animate-spin inline" />
                      Adding…
                    </>
                  ) : (
                    'Use this sound'
                  )}
                </Button>
              </div>
            </div>
          ))}
          {!loading && results.length === 0 && (
            <p className="text-sm text-zinc-500 text-center py-8">No results. Try another search.</p>
          )}
        </div>

        <div className="flex justify-between items-center shrink-0 pt-2 border-t border-zinc-700">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={page <= 1 || loading}
            onClick={() => void runSearch(page - 1, q)}
          >
            Previous
          </Button>
          <span className="text-xs text-zinc-500">
            Page {page}
            {total > 0 ? ` · ${total} sounds` : ''}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={!hasNext || loading}
            onClick={() => void runSearch(page + 1, q)}
          >
            Next
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
