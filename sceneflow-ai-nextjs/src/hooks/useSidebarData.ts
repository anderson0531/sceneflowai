'use client'

import { useEffect, useCallback } from 'react'
import { useStore } from '@/store/useStore'

interface ReviewScores {
  director: number | null
  audience: number | null
}

interface ProjectStats {
  sceneCount: number
  castCount: number
  durationMinutes: number
  estimatedCredits: number
}

interface ProgressData {
  hasFilmTreatment?: boolean
  hasScreenplay?: boolean
  sceneCount?: number
  refLibraryCount?: number
  imageProgress?: number
  audioProgress?: number
}

interface UseSidebarDataOptions {
  reviewScores?: ReviewScores | null
  projectStats?: ProjectStats | null
  progressData?: ProgressData | null
}

/**
 * Hook for workflow pages to populate the global sidebar with dynamic data.
 * Call this hook in your workflow page component with the data you want to display.
 * The hook will automatically clean up the data when the component unmounts.
 * 
 * @example
 * ```tsx
 * useSidebarData({
 *   reviewScores: { director: 85, audience: 78 },
 *   projectStats: { sceneCount: 12, castCount: 4, durationMinutes: 8, estimatedCredits: 150 },
 *   progressData: { hasFilmTreatment: true, hasScreenplay: true, imageProgress: 50 }
 * })
 * ```
 */
export function useSidebarData(options: UseSidebarDataOptions) {
  const setSidebarReviewScores = useStore(s => s.setSidebarReviewScores)
  const setSidebarProjectStats = useStore(s => s.setSidebarProjectStats)
  const setSidebarProgressData = useStore(s => s.setSidebarProgressData)
  const clearSidebarData = useStore(s => s.clearSidebarData)

  // Update review scores when they change
  useEffect(() => {
    if (options.reviewScores !== undefined) {
      setSidebarReviewScores(options.reviewScores)
    }
  }, [options.reviewScores, setSidebarReviewScores])

  // Update project stats when they change
  useEffect(() => {
    if (options.projectStats !== undefined) {
      setSidebarProjectStats(options.projectStats)
    }
  }, [options.projectStats, setSidebarProjectStats])

  // Update progress data when it changes
  useEffect(() => {
    if (options.progressData !== undefined) {
      setSidebarProgressData(options.progressData)
    }
  }, [options.progressData, setSidebarProgressData])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      clearSidebarData()
    }
  }, [clearSidebarData])
}

/**
 * Hook for registering quick action handlers from a workflow page.
 * The handlers will be called when the user clicks the corresponding action in the sidebar.
 * 
 * @example
 * ```tsx
 * useSidebarQuickActions({
 *   'production:goto-bookmark': () => handleJumpToBookmark(),
 *   'production:scene-gallery': () => setShowSceneGallery(true),
 *   'production:screening-room': () => setIsPlayerOpen(true),
 * })
 * ```
 */
export function useSidebarQuickActions(handlers: Record<string, () => void>) {
  const registerQuickActionHandler = useStore(s => s.registerQuickActionHandler)
  const unregisterQuickActionHandler = useStore(s => s.unregisterQuickActionHandler)

  useEffect(() => {
    // Register all handlers
    Object.entries(handlers).forEach(([actionId, handler]) => {
      registerQuickActionHandler(actionId, handler)
    })

    // Unregister on unmount or when handlers change
    return () => {
      Object.keys(handlers).forEach(actionId => {
        unregisterQuickActionHandler(actionId)
      })
    }
  }, [handlers, registerQuickActionHandler, unregisterQuickActionHandler])
}

export default useSidebarData
