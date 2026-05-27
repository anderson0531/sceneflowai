'use client'

import React, { useState } from 'react'
import { BarChart3, Smile, Star, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { EmotionBreakdown, type AggregatedStats } from '@/components/premiere/DashboardWidgets'
import type { BehavioralAnalyticsSummary } from '@/lib/types/behavioralAnalytics'

const EMPTY_EMOTION_BREAKDOWN: AggregatedStats['emotionBreakdown'] = {
  happy: 0,
  surprised: 0,
  engaged: 0,
  neutral: 0,
  confused: 0,
  bored: 0,
}

function normalizeEmotionBreakdown(
  data: Record<string, number> | undefined
): AggregatedStats['emotionBreakdown'] {
  if (!data) return EMPTY_EMOTION_BREAKDOWN
  return {
    happy: data.happy ?? 0,
    surprised: data.surprised ?? 0,
    engaged: data.engaged ?? 0,
    neutral: data.neutral ?? 0,
    confused: data.confused ?? 0,
    bored: data.bored ?? 0,
  }
}

type InsightTab = 'scoring' | 'biometric' | 'visual'

export interface PremiereInsightsPanelProps {
  projectId: string
  screeningId?: string
  feedbackItems: Array<{
    id: string
    author: string
    rating: number
    comment: string
    tags: string[]
    status: 'open' | 'in_review' | 'resolved'
    createdAt: string
  }>
  analytics?: {
    totalViewers: number
    averageCompletion: number
    averageEngagement: number
    emotionBreakdown: Record<string, number>
    summary?: BehavioralAnalyticsSummary | null
  } | null
  loading?: boolean
  onUpdateFeedback?: (id: string, patch: { status?: string }) => void
  className?: string
}

export function PremiereInsightsPanel({
  screeningId,
  feedbackItems,
  analytics,
  loading,
  onUpdateFeedback,
  className,
}: PremiereInsightsPanelProps) {
  const [tab, setTab] = useState<InsightTab>('scoring')

  const tabs: { id: InsightTab; label: string; icon: React.ReactNode }[] = [
    { id: 'scoring', label: 'Scoring', icon: <Star className="w-3.5 h-3.5" /> },
    { id: 'biometric', label: 'Biometric', icon: <Smile className="w-3.5 h-3.5" /> },
    { id: 'visual', label: 'Visual', icon: <BarChart3 className="w-3.5 h-3.5" /> },
  ]

  const emotionData = normalizeEmotionBreakdown(analytics?.emotionBreakdown)
  const hasEmotion = Object.values(emotionData).some((v) => v > 0)

  return (
    <div className={cn('rounded-xl border border-violet-500/20 bg-zinc-950/70 overflow-hidden', className)}>
      <div className="border-b border-white/[0.06] px-4 py-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-white">Screening insights</h3>
        <div className="flex gap-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                'inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
                tab === t.id
                  ? 'bg-violet-600 text-white'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80'
              )}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-zinc-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Loading analytics…
        </div>
      ) : (
        <div className="p-4">
          {tab === 'scoring' && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-zinc-900/80 border border-zinc-800 p-3">
                  <p className="text-[10px] uppercase text-zinc-500">Viewers</p>
                  <p className="text-lg font-semibold text-white tabular-nums">
                    {analytics?.totalViewers ?? 0}
                  </p>
                </div>
                <div className="rounded-lg bg-zinc-900/80 border border-zinc-800 p-3">
                  <p className="text-[10px] uppercase text-zinc-500">Completion</p>
                  <p className="text-lg font-semibold text-white tabular-nums">
                    {analytics?.averageCompletion ?? 0}%
                  </p>
                </div>
                <div className="rounded-lg bg-zinc-900/80 border border-zinc-800 p-3">
                  <p className="text-[10px] uppercase text-zinc-500">Avg rating</p>
                  <p className="text-lg font-semibold text-white tabular-nums">
                    {feedbackItems.length
                      ? (
                          feedbackItems.reduce((s, f) => s + f.rating, 0) / feedbackItems.length
                        ).toFixed(1)
                      : '—'}
                  </p>
                </div>
              </div>
              {feedbackItems.length > 0 ? (
                <ul className="space-y-2 max-h-64 overflow-y-auto">
                  {feedbackItems.map((f) => (
                    <li
                      key={f.id}
                      className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-medium text-zinc-200">{f.author}</span>
                        <span className="text-amber-300 tabular-nums">{f.rating}/5</span>
                      </div>
                      <p className="text-zinc-400">{f.comment}</p>
                      {onUpdateFeedback && f.status !== 'resolved' && (
                        <button
                          type="button"
                          className="mt-2 text-violet-400 hover:text-violet-300"
                          onClick={() => onUpdateFeedback(f.id, { status: 'resolved' })}
                        >
                          Mark resolved
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-zinc-500 text-center py-6">
                  No manual scores yet. Share your screening link to collect ratings.
                </p>
              )}
            </div>
          )}

          {tab === 'biometric' && (
            <div>
              {hasEmotion ? (
                <EmotionBreakdown data={emotionData} />
              ) : (
                <p className="text-sm text-zinc-500 text-center py-8">
                  Biometric data appears after viewers watch with camera consent enabled.
                  {screeningId ? ` Screening: ${screeningId.slice(0, 12)}…` : ''}
                </p>
              )}
            </div>
          )}

          {tab === 'visual' && (
            <div className="space-y-3">
              {analytics?.summary?.highEngagementMoments?.length ? (
                <ul className="space-y-2">
                  {analytics.summary.highEngagementMoments.slice(0, 5).map((m, i) => (
                    <li
                      key={i}
                      className="text-xs text-zinc-300 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2"
                    >
                      Peak engagement at {Math.round(m.timestamp)}s — {m.description || m.type.replace('-', ' ')}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-zinc-500 text-center py-8">
                  Visual reaction heatmaps populate from emoji reactions and engagement metrics during
                  screenings.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
