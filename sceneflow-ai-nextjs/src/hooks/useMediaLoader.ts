/**
 * useMediaLoader Hook
 * 
 * Provides lazy loading for media items in a project.
 * Automatically triggers migration of base64 images to blob storage.
 */

import { useState, useEffect, useCallback, useRef } from 'react'

export interface MediaItem {
  id: string
  name: string
  imageUrl?: string
  type: string
}

export interface MediaLoaderState {
  items: MediaItem[]
  loading: boolean
  error: string | null
  hasBase64: boolean
  migrating: boolean
  migrationStats: MigrationStats | null
}

export interface MigrationStats {
  totalFound: number
  migrated: number
  alreadyUrls: number
  failed: number
  bytesFreed: number
}

interface UseMediaLoaderOptions {
  projectId: string
  type?: 'characters' | 'props' | 'backdrops' | 'scenes' | 'all'
  autoMigrate?: boolean
  onMigrationComplete?: (stats: MigrationStats) => void
}

export function useMediaLoader({
  projectId,
  type = 'all',
  autoMigrate = true,
  onMigrationComplete
}: UseMediaLoaderOptions) {
  const [state, setState] = useState<MediaLoaderState>({
    items: [],
    loading: false,
    error: null,
    hasBase64: false,
    migrating: false,
    migrationStats: null
  })
  
  const hasMigratedRef = useRef(false)
  
  // Load media items
  const loadMedia = useCallback(async (ids?: string[]) => {
    if (!projectId) return
    
    setState(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      const params = new URLSearchParams({ type })
      if (ids?.length) {
        params.set('ids', ids.join(','))
      }
      
      const response = await fetch(`/api/projects/${projectId}/media?${params}`)
      
      if (!response.ok) {
        throw new Error(`Failed to load media: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      setState(prev => ({
        ...prev,
        items: data.items,
        hasBase64: data.hasBase64,
        loading: false
      }))
      
      // Auto-migrate if there's base64 data and we haven't already migrated
      if (autoMigrate && data.hasBase64 && !hasMigratedRef.current) {
        hasMigratedRef.current = true
        await migrateMedia()
      }
    } catch (error: any) {
      console.error('[useMediaLoader] Error:', error)
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message
      }))
    }
  }, [projectId, type, autoMigrate])
  
  // Migrate base64 images to blob storage
  const migrateMedia = useCallback(async () => {
    if (!projectId) return
    
    setState(prev => ({ ...prev, migrating: true }))
    
    try {
      const response = await fetch(`/api/projects/${projectId}/media`, {
        method: 'POST'
      })
      
      if (!response.ok) {
        throw new Error(`Migration failed: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      setState(prev => ({
        ...prev,
        migrating: false,
        migrationStats: data.stats,
        hasBase64: false
      }))
      
      // Reload media to get updated URLs
      await loadMedia()
      
      if (onMigrationComplete && data.stats) {
        onMigrationComplete(data.stats)
      }
      
      console.log('[useMediaLoader] Migration complete:', data.stats)
    } catch (error: any) {
      console.error('[useMediaLoader] Migration error:', error)
      setState(prev => ({
        ...prev,
        migrating: false,
        error: error.message
      }))
    }
  }, [projectId, loadMedia, onMigrationComplete])
  
  // Get a specific media item by ID
  const getItem = useCallback((id: string): MediaItem | undefined => {
    return state.items.find(item => item.id === id)
  }, [state.items])
  
  // Get items by type
  const getItemsByType = useCallback((itemType: string): MediaItem[] => {
    return state.items.filter(item => item.type === itemType)
  }, [state.items])
  
  return {
    ...state,
    loadMedia,
    migrateMedia,
    getItem,
    getItemsByType,
    // Computed values
    characters: state.items.filter(i => i.type === 'character'),
    wardrobes: state.items.filter(i => i.type === 'wardrobe'),
    props: state.items.filter(i => i.type === 'prop'),
    backdrops: state.items.filter(i => i.type === 'backdrop'),
    scenes: state.items.filter(i => i.type === 'scene')
  }
}

/**
 * Hook to trigger media migration for a project
 * Use this on the main project page to ensure images are migrated
 */
export function useAutoMigrate(projectId: string, enabled: boolean = true) {
  const [migrated, setMigrated] = useState(false)
  const [migrating, setMigrating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const attemptedRef = useRef(false)
  
  useEffect(() => {
    if (!enabled || !projectId || attemptedRef.current) return
    
    const checkAndMigrate = async () => {
      attemptedRef.current = true
      
      try {
        // First check if there's base64 data
        const checkRes = await fetch(`/api/projects/${projectId}/media?type=all`)
        if (!checkRes.ok) return
        
        const checkData = await checkRes.json()
        
        if (!checkData.hasBase64) {
          console.log('[useAutoMigrate] No base64 data to migrate')
          setMigrated(true)
          return
        }
        
        console.log(`[useAutoMigrate] Found base64 data (${Math.round(checkData.base64Size / 1024)}KB), starting migration...`)
        setMigrating(true)
        
        // Trigger migration
        const migrateRes = await fetch(`/api/projects/${projectId}/media`, {
          method: 'POST'
        })
        
        if (!migrateRes.ok) {
          throw new Error('Migration request failed')
        }
        
        const migrateData = await migrateRes.json()
        console.log('[useAutoMigrate] Migration complete:', migrateData.stats)
        
        setMigrating(false)
        setMigrated(true)
        
        // Force page reload to get fresh data
        if (migrateData.stats?.migrated > 0) {
          // Dispatch event to notify components to refresh
          window.dispatchEvent(new CustomEvent('mediaUpdated', { 
            detail: { projectId, stats: migrateData.stats }
          }))
        }
      } catch (err: any) {
        console.error('[useAutoMigrate] Error:', err)
        setError(err.message)
        setMigrating(false)
      }
    }
    
    // Delay slightly to not block initial render
    const timer = setTimeout(checkAndMigrate, 1000)
    return () => clearTimeout(timer)
  }, [projectId, enabled])
  
  return { migrated, migrating, error }
}
