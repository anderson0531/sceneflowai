'use client'

import { useEffect, useRef } from 'react'
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

interface AudienceReviewDetails {
  categories: { name: string; score: number; weight?: number }[]
  targetDemographic?: string
  emotionalImpact?: string
}

interface UseSidebarDataOptions {
  reviewScores?: ReviewScores | null
  audienceReviewDetails?: AudienceReviewDetails | null
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
  const setSidebarAudienceReviewDetails = useStore(s => s.setSidebarAudienceReviewDetails)
  const setSidebarProjectStats = useStore(s => s.setSidebarProjectStats)
  const setSidebarProgressData = useStore(s => s.setSidebarProgressData)
  const clearSidebarData = useStore(s => s.clearSidebarData)

  // Update review scores when they change
  useEffect(() => {
    if (options.reviewScores !== undefined) {
      setSidebarReviewScores(options.reviewScores)
    }
  }, [options.reviewScores, setSidebarReviewScores])

  // Update audience review details when they change
  useEffect(() => {
    if (options.audienceReviewDetails !== undefined) {
      setSidebarAudienceReviewDetails(options.audienceReviewDetails)
    }
  }, [options.audienceReviewDetails, setSidebarAudienceReviewDetails])

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
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  const actionKeysSig = Object.keys(handlers).sort().join('\0')

  useEffect(() => {
    const actionIds = actionKeysSig ? actionKeysSig.split('\0') : []
    actionIds.forEach((actionId) => {
      registerQuickActionHandler(actionId, () => {
        handlersRef.current[actionId]?.()
      })
    })

    return () => {
      actionIds.forEach((actionId) => {
        unregisterQuickActionHandler(actionId)
      })
    }
  }, [actionKeysSig, registerQuickActionHandler, unregisterQuickActionHandler])
}

export default useSidebarData
