'use client'

import { useState, useCallback, useEffect } from 'react'
import type {
  SeriesResponse,
  CreateSeriesRequest,
  UpdateSeriesRequest,
  GenerateSeriesRequest,
  BibleSyncRequest,
  BibleSyncDiff,
  StartEpisodeResponse
} from '@/types/series'

const API_BASE = '/api/series'

/**
 * Hook for series list operations
 */
export function useSeriesList(userId: string | null) {
  const [series, setSeries] = useState<SeriesResponse[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  const fetchSeries = useCallback(async (pageNum: number = 1, status?: string) => {
    if (!userId) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      const params = new URLSearchParams({
        userId,
        page: String(pageNum),
        pageSize: '20'
      })
      if (status) params.set('status', status)
      
      const response = await fetch(`${API_BASE}?${params}`)
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch series')
      }
      
      setSeries(data.series)
      setPage(data.page)
      setTotal(data.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchSeries()
  }, [fetchSeries])

  const createSeries = useCallback(async (request: CreateSeriesRequest) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      })
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to create series')
      }
      
      setSeries(prev => [data.series, ...prev])
      return data.series as SeriesResponse
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const deleteSeries = useCallback(async (seriesId: string) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`${API_BASE}/${seriesId}`, {
        method: 'DELETE'
      })
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to delete series')
      }
      
      setSeries(prev => prev.filter(s => s.id !== seriesId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    series,
    isLoading,
    error,
    page,
    total,
    fetchSeries,
    createSeries,
    deleteSeries,
    setPage: (p: number) => fetchSeries(p)
  }
}

/**
 * Hook for single series operations
 */
export function useSeries(seriesId: string | null) {
  const [series, setSeries] = useState<SeriesResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSeries = useCallback(async () => {
    if (!seriesId) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`${API_BASE}/${seriesId}?includeEpisodes=true`)
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch series')
      }
      
      setSeries(data.series)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [seriesId])

  useEffect(() => {
    fetchSeries()
  }, [fetchSeries])

  const updateSeries = useCallback(async (updates: UpdateSeriesRequest) => {
    if (!seriesId) throw new Error('No series selected')
    
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`${API_BASE}/${seriesId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to update series')
      }
      
      setSeries(data.series)
      return data.series as SeriesResponse
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [seriesId])

  const generateStoryline = useCallback(async (request: GenerateSeriesRequest) => {
    if (!seriesId) throw new Error('No series selected')
    
    setIsGenerating(true)
    setError(null)
    
    try {
      const response = await fetch(`${API_BASE}/${seriesId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      })
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to generate storyline')
      }
      
      setSeries(data.series)
      return {
        series: data.series as SeriesResponse,
        generated: data.generated
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    } finally {
      setIsGenerating(false)
    }
  }, [seriesId])

  const addMoreEpisodes = useCallback(async (count: number = 5) => {
    if (!seriesId) throw new Error('No series selected')
    
    setIsGenerating(true)
    setError(null)
    
    try {
      const response = await fetch(`${API_BASE}/${seriesId}/episodes/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count })
      })
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to add episodes')
      }
      
      // Refresh the series to get updated episodes
      await fetchSeries()
      
      return {
        added: data.added,
        totalEpisodes: data.totalEpisodes,
        newEpisodes: data.newEpisodes,
        canAddMore: data.canAddMore
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    } finally {
      setIsGenerating(false)
    }
  }, [seriesId, fetchSeries])

  return {
    series,
    isLoading,
    isGenerating,
    error,
    fetchSeries,
    updateSeries,
    generateStoryline,
    addMoreEpisodes,
    setSeries
  }
}

/**
 * Hook for episode operations
 */
export function useEpisode(seriesId: string | null) {
  const [isStarting, setIsStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const startEpisode = useCallback(async (
    episodeId: string,
    userId: string
  ): Promise<StartEpisodeResponse> => {
    if (!seriesId) throw new Error('No series selected')
    
    setIsStarting(true)
    setError(null)
    
    try {
      const response = await fetch(
        `${API_BASE}/${seriesId}/episodes/${episodeId}/start`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId })
        }
      )
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to start episode')
      }
      
      return data as StartEpisodeResponse
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    } finally {
      setIsStarting(false)
    }
  }, [seriesId])

  return {
    isStarting,
    error,
    startEpisode
  }
}

/**
 * Hook for production bible sync operations
 */
export function useProductionBible(seriesId: string | null) {
  const [isSyncing, setIsSyncing] = useState(false)
  const [pendingDiff, setPendingDiff] = useState<BibleSyncDiff | null>(null)
  const [error, setError] = useState<string | null>(null)

  const previewSync = useCallback(async (request: BibleSyncRequest) => {
    if (!seriesId) throw new Error('No series selected')
    
    setIsSyncing(true)
    setError(null)
    
    try {
      const response = await fetch(`${API_BASE}/${seriesId}/bible`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...request, preview: true })
      })
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to preview sync')
      }
      
      setPendingDiff(data.diff)
      return data.diff as BibleSyncDiff
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    } finally {
      setIsSyncing(false)
    }
  }, [seriesId])

  const pushToBible = useCallback(async (request: BibleSyncRequest) => {
    if (!seriesId) throw new Error('No series selected')
    
    setIsSyncing(true)
    setError(null)
    
    try {
      const response = await fetch(`${API_BASE}/${seriesId}/bible`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...request, preview: false })
      })
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to sync to bible')
      }
      
      setPendingDiff(null)
      return {
        changes: data.changes as BibleSyncDiff,
        newVersion: data.newVersion
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    } finally {
      setIsSyncing(false)
    }
  }, [seriesId])

  const pullFromBible = useCallback(async (projectId: string, syncFields?: string[]) => {
    if (!seriesId) throw new Error('No series selected')
    
    setIsSyncing(true)
    setError(null)
    
    try {
      const response = await fetch(`${API_BASE}/${seriesId}/bible`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, syncFields })
      })
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to pull from bible')
      }
      
      return {
        syncedFields: data.syncedFields,
        bibleVersion: data.bibleVersion
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    } finally {
      setIsSyncing(false)
    }
  }, [seriesId])

  return {
    isSyncing,
    pendingDiff,
    error,
    previewSync,
    pushToBible,
    pullFromBible,
    clearPendingDiff: () => setPendingDiff(null)
  }
}

/**
 * Combined hook for full series studio functionality
 */
export function useSeriesStudio(seriesId: string | null, userId: string | null) {
  const seriesHook = useSeries(seriesId)
  const episodeHook = useEpisode(seriesId)
  const bibleHook = useProductionBible(seriesId)
  
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<string | null>(null)
  const [editMode, setEditMode] = useState<'view' | 'edit' | 'generate'>('view')

  const selectedEpisode = seriesHook.series?.episodeBlueprints?.find(
    ep => ep.id === selectedEpisodeId
  )

  const handleStartEpisode = useCallback(async (episodeId: string) => {
    if (!userId) throw new Error('User not authenticated')
    const result = await episodeHook.startEpisode(episodeId, userId)
    // Refresh series to get updated episode status
    await seriesHook.fetchSeries()
    return result
  }, [userId, episodeHook, seriesHook])

  return {
    // Series state
    series: seriesHook.series,
    isLoading: seriesHook.isLoading,
    isGenerating: seriesHook.isGenerating,
    error: seriesHook.error || episodeHook.error || bibleHook.error,
    
    // Series actions
    updateSeries: seriesHook.updateSeries,
    generateStoryline: seriesHook.generateStoryline,
    refreshSeries: seriesHook.fetchSeries,
    
    // Episode state
    selectedEpisodeId,
    selectedEpisode,
    isStartingEpisode: episodeHook.isStarting,
    
    // Episode actions
    setSelectedEpisodeId,
    startEpisode: handleStartEpisode,
    
    // Bible state
    isSyncingBible: bibleHook.isSyncing,
    pendingBibleDiff: bibleHook.pendingDiff,
    
    // Bible actions
    previewBibleSync: bibleHook.previewSync,
    pushToBible: bibleHook.pushToBible,
    pullFromBible: bibleHook.pullFromBible,
    clearPendingDiff: bibleHook.clearPendingDiff,
    
    // UI state
    editMode,
    setEditMode
  }
}
