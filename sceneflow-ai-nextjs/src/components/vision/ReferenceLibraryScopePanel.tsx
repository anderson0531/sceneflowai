'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Search, Plus, Library, Clapperboard, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { ReferenceAssetKind, ReferenceAssetRecord } from '@/types/referenceLibrary'

export type ReferenceLibraryScope = 'production' | 'library'

interface ReferenceLibraryScopePanelProps {
  projectId?: string
  seriesId?: string
  kind: ReferenceAssetKind
  /** IDs of assets linked to this production (for filtering production view) */
  linkedAssetIds: Set<string>
  onAddFromLibrary: (asset: ReferenceAssetRecord) => void | Promise<void>
}

export function ReferenceLibraryScopePanel({
  projectId,
  kind,
  linkedAssetIds,
  onAddFromLibrary,
}: ReferenceLibraryScopePanelProps) {
  const t = useTranslations('production.foundation.referenceLibrary')
  const [scope, setScope] = useState<ReferenceLibraryScope>('production')
  const [query, setQuery] = useState('')
  const [assets, setAssets] = useState<ReferenceAssetRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [addingId, setAddingId] = useState<string | null>(null)

  const fetchAssets = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const params = new URLSearchParams({ kind })
      if (scope === 'production') {
        params.set('linkedToProjectId', projectId)
      }
      if (query.trim()) params.set('q', query.trim())

      const res = await fetch(`/api/reference-library/assets?${params}`)
      const data = await res.json()
      if (data.success) {
        setAssets(data.assets || [])
      }
    } catch (err) {
      console.error('[ReferenceLibraryScopePanel] fetch failed:', err)
    } finally {
      setLoading(false)
    }
  }, [projectId, kind, scope, query])

  useEffect(() => {
    if (scope === 'library' || query.trim()) {
      const timer = setTimeout(fetchAssets, 300)
      return () => clearTimeout(timer)
    }
    fetchAssets()
  }, [fetchAssets, scope, query])

  const libraryCandidates = useMemo(() => {
    if (scope === 'production') return assets
    return assets.filter((a) => !linkedAssetIds.has(a.id))
  }, [assets, scope, linkedAssetIds])

  const handleAdd = async (asset: ReferenceAssetRecord) => {
    setAddingId(asset.id)
    try {
      await onAddFromLibrary(asset)
      await fetchAssets()
    } finally {
      setAddingId(null)
    }
  }

  if (!projectId) return null

  return (
    <div className="space-y-2 mb-3 pb-3 border-b border-gray-200/60 dark:border-gray-700/60">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setScope('production')}
          className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
            scope === 'production'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          <Clapperboard className="w-3 h-3" />
          {t('inThisProduction')}
        </button>
        <button
          type="button"
          onClick={() => setScope('library')}
          className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
            scope === 'library'
              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
              : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          <Library className="w-3 h-3" />
          {t('library')}
        </button>
      </div>

      {scope === 'library' && (
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="h-8 pl-8 text-xs bg-gray-900/40 border-gray-700"
          />
        </div>
      )}

      {scope === 'library' && libraryCandidates.length > 0 && (
        <ul className="space-y-1 max-h-36 overflow-y-auto">
          {libraryCandidates.map((asset) => (
            <li
              key={asset.id}
              className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-gray-900/30 border border-gray-700/50 text-xs"
            >
              <span className="flex-1 truncate text-gray-200" title={asset.description || asset.name}>
                {asset.name}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-indigo-300 hover:text-indigo-200"
                disabled={addingId === asset.id}
                onClick={() => handleAdd(asset)}
              >
                {addingId === asset.id ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <>
                    <Plus className="w-3 h-3 mr-0.5" />
                    {t('addToProduction')}
                  </>
                )}
              </Button>
            </li>
          ))}
        </ul>
      )}

      {scope === 'library' && !loading && libraryCandidates.length === 0 && query.trim() && (
        <p className="text-[11px] text-gray-500 px-1">{t('noMatches')}</p>
      )}

      {loading && scope === 'library' && (
        <div className="flex items-center gap-2 text-[11px] text-gray-500 px-1">
          <Loader2 className="w-3 h-3 animate-spin" />
          {t('searching')}
        </div>
      )}
    </div>
  )
}
