'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { Button } from '@/components/ui/Button'

type ModelRole = 'live' | 'fallback' | 'retired'
type RecommendationAction =
  | 'rename'
  | 'hold'
  | 'workhorse_bump'
  | 'cleanup'
  | 'current'
  | 'unavailable'
  | 'unlisted'
  | 'catalog_only'

interface RegistryEntry {
  id: string
  function: string
  provider: string
  api: string
  modelId: string
  role: ModelRole
  symbol: string
  files: string[]
  notes?: string
  envOverrides?: string[]
}

interface CatalogSnapshot {
  source: string
  status: 'ok' | 'unavailable'
  error?: string
  modelIds: string[]
}

interface Recommendation {
  entryId: string
  action: RecommendationAction
  currentModelId: string
  proposedModelId: string | null
  reason: string
  cursorPrompt: string | null
}

type StatusFilter = 'all' | ModelRole | 'preview'

const ACTION_LABEL: Record<RecommendationAction, string> = {
  rename: 'Rename',
  hold: 'Hold',
  workhorse_bump: 'Workhorse bump',
  cleanup: 'Cleanup',
  current: 'Current',
  unavailable: 'Catalog unavailable',
  unlisted: 'Unlisted',
  catalog_only: 'Catalog only',
}

function isPreview(modelId: string): boolean {
  return modelId.includes('-preview')
}

export function ModelVersionsCard() {
  const [entries, setEntries] = useState<RegistryEntry[]>([])
  const [catalogs, setCatalogs] = useState<CatalogSnapshot[]>([])
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const load = useCallback(async () => {
    const response = await fetch('/api/admin/models')
    const data = await response.json()
    if (!response.ok) {
      setMessage(data.error || 'Could not load model versions')
      return
    }
    setEntries(data.entries || [])
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function analyze() {
    setLoading(true)
    setMessage('')
    try {
      const response = await fetch('/api/admin/models/analyze', { method: 'POST' })
      const data = await response.json()
      if (!response.ok) {
        setMessage(data.error || 'Analysis failed')
        return
      }
      setEntries(data.entries || [])
      setCatalogs(data.catalogs || [])
      setRecommendations(data.recommendations || [])
      setMessage('Analysis finished. Copy a Cursor prompt to apply a change in a pull request.')
    } finally {
      setLoading(false)
    }
  }

  const recommendationById = useMemo(() => {
    const map = new Map<string, Recommendation>()
    for (const recommendation of recommendations) map.set(recommendation.entryId, recommendation)
    return map
  }, [recommendations])

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return entries.filter((entry) => {
      if (status === 'preview' && !isPreview(entry.modelId)) return false
      if (status !== 'all' && status !== 'preview' && entry.role !== status) return false
      if (!needle) return true
      const haystack = [entry.function, entry.provider, entry.api, entry.modelId, entry.symbol, entry.role]
        .join(' ')
        .toLowerCase()
      return haystack.includes(needle)
    })
  }, [entries, query, status])

  async function copyPrompt(entryId: string, prompt: string) {
    await navigator.clipboard.writeText(prompt)
    setCopiedId(entryId)
  }

  return (
    <div className="bg-dark-card rounded-xl border border-dark-border p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Search className="w-5 h-5 text-sf-primary" />
        <div>
          <h3 className="text-lg font-semibold text-white">Model versions</h3>
          <p className="text-sm text-gray-400">
            Search the pins this app sends, compare them with live model lists, and copy a Cursor prompt for each upgrade. This page does not change a live model.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          className="min-w-[16rem] flex-1 px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-white"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search function, provider, or model id"
          aria-label="Search model versions"
        />
        <select
          className="px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-white"
          value={status}
          onChange={(event) => setStatus(event.target.value as StatusFilter)}
          aria-label="Filter model status"
        >
          <option value="all">All statuses</option>
          <option value="live">Live</option>
          <option value="fallback">Fallback</option>
          <option value="retired">Retired</option>
          <option value="preview">Preview</option>
        </select>
        <Button type="button" onClick={analyze} disabled={loading}>
          {loading ? 'Analyzing…' : 'Analyze releases'}
        </Button>
      </div>

      {catalogs.length > 0 && (
        <ul className="text-sm text-gray-300 space-y-1">
          {catalogs.map((catalog) => (
            <li key={catalog.source}>
              {catalog.source}: {catalog.status === 'ok' ? `${catalog.modelIds.length} models` : 'unavailable'}
              {catalog.error ? ` — ${catalog.error}` : ''}
            </li>
          ))}
        </ul>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-300">
          <thead>
            <tr className="text-gray-400">
              <th className="py-2 pr-3">Function</th>
              <th className="py-2 pr-3">Provider</th>
              <th className="py-2 pr-3">API</th>
              <th className="py-2 pr-3">Model</th>
              <th className="py-2 pr-3">Role</th>
              <th className="py-2 pr-3">Analysis</th>
              <th className="py-2">Cursor</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((entry) => {
              const recommendation = recommendationById.get(entry.id)
              return (
                <tr key={entry.id} className="border-t border-dark-border align-top">
                  <td className="py-2 pr-3">
                    <div>{entry.function}</div>
                    <div className="text-xs text-gray-500">{entry.symbol}</div>
                  </td>
                  <td className="py-2 pr-3">{entry.provider}</td>
                  <td className="py-2 pr-3">{entry.api}</td>
                  <td className="py-2 pr-3">
                    <div className="font-mono text-xs">{entry.modelId}</div>
                    {isPreview(entry.modelId) && <div className="text-xs text-amber-300">preview</div>}
                    {entry.envOverrides && entry.envOverrides.length > 0 && (
                      <div className="text-xs text-gray-500">env {entry.envOverrides.join(', ')}</div>
                    )}
                    {entry.notes && <div className="text-xs text-gray-500">{entry.notes}</div>}
                  </td>
                  <td className="py-2 pr-3">{entry.role}</td>
                  <td className="py-2 pr-3">
                    {recommendation ? (
                      <>
                        <div>{ACTION_LABEL[recommendation.action]}</div>
                        <div className="text-xs text-gray-500">{recommendation.reason}</div>
                        {recommendation.proposedModelId && (
                          <div className="font-mono text-xs">{recommendation.proposedModelId}</div>
                        )}
                      </>
                    ) : (
                      'Not analyzed'
                    )}
                  </td>
                  <td className="py-2">
                    {recommendation?.cursorPrompt && (
                      <button
                        type="button"
                        className="text-sf-primary"
                        onClick={() => copyPrompt(entry.id, recommendation.cursorPrompt!)}
                      >
                        {copiedId === entry.id ? 'Copied' : 'Copy prompt'}
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {visible.length === 0 && <p className="text-sm text-gray-400">No model pins match this search.</p>}
      {message && <p className="text-sm text-gray-300">{message}</p>}
    </div>
  )
}
