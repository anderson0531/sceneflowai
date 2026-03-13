'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import {
  ClipboardCheck,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  XCircle,
  GitBranch,
  Zap,
  FileText,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import Link from 'next/link'

interface Episode {
  id: string
  episodeNumber: number
  title: string
  projectId?: string
  status: 'blueprint' | 'in_progress' | 'completed'
}

interface StorylinePreview {
  episodeSummary?: {
    episodeNumber: number
    title: string
    summary: string
  }
  keyEventsAdded: Array<{
    type: string
    description: string
    irreversible: boolean
    affectedCharacterIds: string[]
  }>
  storyThreadsUpdated: Array<{
    id: string
    name: string
    status: string
    description?: string
  }>
  unresolvedHooksUpdated: string[]
}

interface PreviewData {
  episodeNumber: number
  episodeTitle: string
  projectId: string
  preview: StorylinePreview | null
  isLoading: boolean
  error: string | null
  isApplied: boolean
}

export default function ContinuityReview() {
  const params = useParams()
  const seriesId = params?.seriesId as string
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [previews, setPreviews] = useState<Map<string, PreviewData>>(new Map())
  const [expandedEpisode, setExpandedEpisode] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [applyingId, setApplyingId] = useState<string | null>(null)

  // Fetch series info to get episodes with projects
  const fetchEpisodes = useCallback(async () => {
    if (!seriesId) return
    try {
      setIsLoading(true)
      const res = await fetch(`/api/series/${seriesId}?includeEpisodes=true`)
      const data = await res.json()
      if (data.success || data.series) {
        const series = data.series || data
        const blueprints = series.episodeBlueprints || series.episode_blueprints || []
        setEpisodes(
          blueprints
            .filter((ep: any) => ep.projectId && ep.status !== 'blueprint')
            .map((ep: any) => ({
              id: ep.id,
              episodeNumber: ep.episodeNumber,
              title: ep.title,
              projectId: ep.projectId,
              status: ep.status,
            }))
        )
      }
    } catch (err) {
      console.error('Failed to load episodes:', err)
    } finally {
      setIsLoading(false)
    }
  }, [seriesId])

  useEffect(() => { fetchEpisodes() }, [fetchEpisodes])

  // Preview storyline changes for a specific episode
  const previewStoryline = useCallback(async (episode: Episode) => {
    if (!episode.projectId) return

    setPreviews(prev => {
      const next = new Map(prev)
      next.set(episode.id, {
        episodeNumber: episode.episodeNumber,
        episodeTitle: episode.title,
        projectId: episode.projectId!,
        preview: null,
        isLoading: true,
        error: null,
        isApplied: false,
      })
      return next
    })

    try {
      const res = await fetch(`/api/series/${seriesId}/bible`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: episode.projectId,
          syncFields: ['storyline'],
          preview: true,
          mergeStrategy: 'merge',
        }),
      })
      const data = await res.json()

      setPreviews(prev => {
        const next = new Map(prev)
        next.set(episode.id, {
          episodeNumber: episode.episodeNumber,
          episodeTitle: episode.title,
          projectId: episode.projectId!,
          preview: data.success ? data.diff?.storyline : null,
          isLoading: false,
          error: data.success ? null : (data.error || 'Preview failed'),
          isApplied: false,
        })
        return next
      })
    } catch (err) {
      setPreviews(prev => {
        const next = new Map(prev)
        next.set(episode.id, {
          episodeNumber: episode.episodeNumber,
          episodeTitle: episode.title,
          projectId: episode.projectId!,
          preview: null,
          isLoading: false,
          error: 'Network error',
          isApplied: false,
        })
        return next
      })
    }
  }, [seriesId])

  // Apply storyline sync
  const applyStoryline = async (episode: Episode) => {
    if (!episode.projectId) return
    setApplyingId(episode.id)

    try {
      const res = await fetch(`/api/series/${seriesId}/bible`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: episode.projectId,
          syncFields: ['storyline'],
          preview: false,
          mergeStrategy: 'merge',
        }),
      })
      const data = await res.json()

      if (data.success) {
        setPreviews(prev => {
          const next = new Map(prev)
          const existing = next.get(episode.id)
          if (existing) {
            next.set(episode.id, { ...existing, isApplied: true })
          }
          return next
        })
      }
    } catch (err) {
      console.error('Failed to apply storyline:', err)
    } finally {
      setApplyingId(null)
    }
  }

  // Toggle expand and trigger preview if not already loaded
  const toggleEpisode = (episode: Episode) => {
    if (expandedEpisode === episode.id) {
      setExpandedEpisode(null)
    } else {
      setExpandedEpisode(episode.id)
      if (!previews.has(episode.id)) {
        previewStoryline(episode)
      }
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-sf-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/series/${seriesId}/continuity`}
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-teal-500" />
            Review &amp; Sync Updates
          </h2>
          <p className="text-sm text-muted-foreground">
            Preview and apply storyline data from completed episodes to the production bible
          </p>
        </div>
      </div>

      {episodes.length === 0 ? (
        <div className="border rounded-lg p-8 text-center text-muted-foreground">
          <ClipboardCheck className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No started episodes available for sync.</p>
          <p className="text-sm mt-1">Start working on an episode, then come back here to sync its storyline data.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {episodes.map(episode => {
            const preview = previews.get(episode.id)
            const isExpanded = expandedEpisode === episode.id
            return (
              <div key={episode.id} className="border rounded-lg overflow-hidden">
                {/* Episode header */}
                <button
                  onClick={() => toggleEpisode(episode)}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-sm font-bold">
                      {episode.episodeNumber}
                    </div>
                    <div>
                      <div className="font-medium text-sm">{episode.title}</div>
                      <div className="text-xs text-muted-foreground capitalize">{episode.status.replace('_', ' ')}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {preview?.isApplied && (
                      <span className="flex items-center gap-1 text-xs text-green-600">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Synced
                      </span>
                    )}
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {/* Expanded preview */}
                {isExpanded && (
                  <div className="border-t p-4 bg-gray-50/50 dark:bg-gray-800/30 space-y-4">
                    {preview?.isLoading ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4 justify-center">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Analyzing script for storyline data...
                      </div>
                    ) : preview?.error ? (
                      <div className="flex items-center gap-2 text-sm text-red-500 py-2">
                        <AlertTriangle className="h-4 w-4" />
                        {preview.error}
                      </div>
                    ) : preview?.preview ? (
                      <>
                        {/* Episode Summary */}
                        {preview.preview.episodeSummary && (
                          <div className="space-y-1">
                            <h4 className="text-sm font-medium flex items-center gap-1.5">
                              <FileText className="h-3.5 w-3.5" /> Episode Summary
                            </h4>
                            <p className="text-sm text-muted-foreground bg-white dark:bg-gray-900 p-3 rounded border">
                              {preview.preview.episodeSummary.summary}
                            </p>
                          </div>
                        )}

                        {/* Key Events */}
                        {preview.preview.keyEventsAdded.length > 0 && (
                          <div className="space-y-1">
                            <h4 className="text-sm font-medium flex items-center gap-1.5">
                              <Zap className="h-3.5 w-3.5" /> Key Events ({preview.preview.keyEventsAdded.length})
                            </h4>
                            <div className="space-y-1">
                              {preview.preview.keyEventsAdded.map((event, i) => (
                                <div key={i} className="text-sm bg-white dark:bg-gray-900 p-2 rounded border flex items-start gap-2">
                                  <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                                    event.irreversible ? 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400' : 'bg-gray-100 dark:bg-gray-800 text-muted-foreground'
                                  }`}>
                                    {event.type}
                                  </span>
                                  <span className="text-muted-foreground">{event.description}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Story Threads */}
                        {preview.preview.storyThreadsUpdated.length > 0 && (
                          <div className="space-y-1">
                            <h4 className="text-sm font-medium flex items-center gap-1.5">
                              <GitBranch className="h-3.5 w-3.5" /> Story Threads ({preview.preview.storyThreadsUpdated.length})
                            </h4>
                            <div className="space-y-1">
                              {preview.preview.storyThreadsUpdated.map((thread, i) => (
                                <div key={i} className="text-sm bg-white dark:bg-gray-900 p-2 rounded border flex items-center gap-2">
                                  <span className="font-medium">{thread.name}</span>
                                  <span className="px-1.5 py-0.5 rounded text-xs bg-purple-50 dark:bg-purple-950/30 text-purple-600">{thread.status}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2 pt-2">
                          <button
                            onClick={() => applyStoryline(episode)}
                            disabled={applyingId === episode.id || preview.isApplied}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                              preview.isApplied
                                ? 'bg-green-100 text-green-700 cursor-default'
                                : 'bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50'
                            }`}
                          >
                            {applyingId === episode.id ? (
                              <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Applying...</>
                            ) : preview.isApplied ? (
                              <><CheckCircle2 className="h-3.5 w-3.5" /> Applied to Bible</>
                            ) : (
                              <><CheckCircle2 className="h-3.5 w-3.5" /> Apply to Bible</>
                            )}
                          </button>
                          {!preview.isApplied && (
                            <button
                              onClick={() => setExpandedEpisode(null)}
                              className="flex items-center gap-1.5 px-4 py-2 rounded-md text-sm border hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                              <XCircle className="h-3.5 w-3.5" /> Dismiss
                            </button>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="text-sm text-muted-foreground text-center py-4">
                        No preview data available. Click to retry.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
