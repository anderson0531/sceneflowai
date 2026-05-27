'use client'

import { useCallback, useEffect, useState } from 'react'
import type { BehavioralAnalyticsSummary } from '@/lib/types/behavioralAnalytics'

export type PremiereFeedback = {
  id: string
  projectId: string
  screeningId: string
  streamId?: string
  author: string
  rating: number
  comment: string
  tags: string[]
  status: 'open' | 'in_review' | 'resolved'
  owner?: string
  createdAt: string
  updatedAt: string
}

export interface PremiereAnalyticsState {
  totalViewers: number
  averageCompletion: number
  averageEngagement: number
  emotionBreakdown: Record<string, number>
  feedback?: { avgRating?: number; openItems?: number }
  summary?: BehavioralAnalyticsSummary | null
}

export function usePremiereAnalytics(
  projectId: string | undefined,
  isDemo: boolean,
  activeScreeningId?: string,
  refreshKey = 0
) {
  const [loading, setLoading] = useState(false)
  const [analytics, setAnalytics] = useState<PremiereAnalyticsState | null>(null)
  const [allFeedback, setAllFeedback] = useState<PremiereFeedback[]>([])

  const refreshAnalytics = useCallback(async () => {
    if (!projectId || isDemo) return
    setLoading(true)
    try {
      const res = await fetch(
        `/api/premiere/analytics/aggregate?projectId=${encodeURIComponent(projectId)}`,
        { cache: 'no-store' }
      )
      let base: PremiereAnalyticsState = {
        totalViewers: 0,
        averageCompletion: 0,
        averageEngagement: 0,
        emotionBreakdown: {},
      }
      if (res.ok) {
        const data = await res.json()
        base = {
          totalViewers: data.totalViewers ?? 0,
          averageCompletion: data.averageCompletion ?? 0,
          averageEngagement: data.averageEngagement ?? 0,
          emotionBreakdown: data.emotionBreakdown ?? {},
          feedback: data.feedback,
        }
      }

      if (activeScreeningId) {
        const summaryRes = await fetch(
          `/api/premiere/analytics/aggregate?screeningId=${encodeURIComponent(activeScreeningId)}`,
          { cache: 'no-store' }
        )
        if (summaryRes.ok) {
          const summaryData = await summaryRes.json()
          base.summary = summaryData.summary ?? null
        }
      }

      setAnalytics(base)

      const fbRes = await fetch(`/api/premiere/feedback?projectId=${encodeURIComponent(projectId)}`, {
        cache: 'no-store',
      })
      if (fbRes.ok) {
        const fbData = await fbRes.json()
        setAllFeedback(Array.isArray(fbData.items) ? fbData.items : [])
      }
    } catch (err) {
      console.error('[Premiere] Analytics load failed:', err)
    } finally {
      setLoading(false)
    }
  }, [activeScreeningId, isDemo, projectId])

  useEffect(() => {
    void refreshAnalytics()
  }, [refreshAnalytics, refreshKey])

  return {
    analytics,
    allFeedback,
    loading,
    refreshAnalytics,
  }
}
