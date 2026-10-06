'use client'

import { useCallback, useEffect, useState } from 'react'
import { Clapperboard, Loader, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'

type SeedStatus = 'pending' | 'confirmed'

interface OriginalsSeedRecord {
  email: string
  name: string
  title: string
  logline: string
  audienceUrl: string
  exclusivePremiere: boolean
  source: string
  createdAt: string
  status: SeedStatus
  confirmedAt?: string
}

interface SeedCounts {
  total: number
  pending: number
  confirmed: number
}

export function OriginalsSeedCard() {
  const [status, setStatus] = useState<'all' | SeedStatus>('all')
  const [counts, setCounts] = useState<SeedCounts>({ total: 0, pending: 0, confirmed: 0 })
  const [items, setItems] = useState<OriginalsSeedRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`/api/admin/originals-seed?status=${status}&limit=200`)
      const payload = (await response.json()) as {
        error?: string
        counts?: SeedCounts
        items?: OriginalsSeedRecord[]
      }
      if (!response.ok) {
        throw new Error(payload.error || 'Could not load Seed applications.')
      }
      setCounts(payload.counts ?? { total: 0, pending: 0, confirmed: 0 })
      setItems(payload.items ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load Seed applications.')
    } finally {
      setLoading(false)
    }
  }, [status])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
            <Clapperboard className="h-5 w-5 text-cyan-400" />
            Originals Seed inbox
          </h3>
          <p className="mt-1 text-sm text-gray-400">
            {counts.confirmed} confirmed · {counts.pending} pending · {counts.total} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(['all', 'pending', 'confirmed'] as const).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setStatus(id)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                status === id
                  ? 'bg-cyan-500/20 text-cyan-200'
                  : 'bg-slate-800 text-gray-400 hover:text-white'
              }`}
            >
              {id}
            </button>
          ))}
          <Button size="sm" variant="outline" onClick={() => void load()} disabled={loading}>
            {loading ? <Loader className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {error ? <p className="mb-3 text-sm text-amber-300">{error}</p> : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="pb-2 pr-3 font-medium">Creator</th>
              <th className="pb-2 pr-3 font-medium">Title</th>
              <th className="pb-2 pr-3 font-medium">Audience</th>
              <th className="pb-2 pr-3 font-medium">Premiere</th>
              <th className="pb-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {items.length === 0 && !loading ? (
              <tr>
                <td colSpan={5} className="py-6 text-gray-500">
                  No Seed applications yet.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.email} className="align-top text-gray-300">
                  <td className="py-3 pr-3">
                    <div className="font-medium text-white">{item.name || '—'}</div>
                    <div className="text-xs text-gray-500">{item.email}</div>
                  </td>
                  <td className="py-3 pr-3">
                    <div className="text-white">{item.title}</div>
                    <div className="mt-1 max-w-xs text-xs text-gray-500">{item.logline}</div>
                  </td>
                  <td className="py-3 pr-3">
                    {item.audienceUrl ? (
                      <a
                        href={item.audienceUrl}
                        className="break-all text-cyan-300 hover:underline"
                        target="_blank"
                        rel="noreferrer"
                      >
                        {item.audienceUrl}
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="py-3 pr-3">{item.exclusivePremiere ? 'Yes' : 'No'}</td>
                  <td className="py-3">{item.status}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default OriginalsSeedCard
