'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import {
  GitBranch,
  ArrowLeft,
  Loader2,
  Circle,
  ArrowUpRight,
  Target,
  CheckCircle2,
} from 'lucide-react'
import Link from 'next/link'

interface StoryThread {
  id: string
  name: string
  type: 'main' | 'subplot' | 'character' | 'mystery' | 'romance'
  status: 'introduced' | 'developing' | 'climax' | 'resolved'
  description?: string
  introducedInEpisode?: number
  resolvedInEpisode?: number
}

const STATUS_CONFIG = {
  introduced: {
    label: 'Introduced',
    icon: Circle,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    borderColor: 'border-blue-200 dark:border-blue-800',
  },
  developing: {
    label: 'Developing',
    icon: ArrowUpRight,
    color: 'text-amber-500',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
    borderColor: 'border-amber-200 dark:border-amber-800',
  },
  climax: {
    label: 'Climax',
    icon: Target,
    color: 'text-red-500',
    bgColor: 'bg-red-50 dark:bg-red-950/30',
    borderColor: 'border-red-200 dark:border-red-800',
  },
  resolved: {
    label: 'Resolved',
    icon: CheckCircle2,
    color: 'text-green-500',
    bgColor: 'bg-green-50 dark:bg-green-950/30',
    borderColor: 'border-green-200 dark:border-green-800',
  },
}

const TYPE_LABELS: Record<string, string> = {
  main: 'Main Arc',
  subplot: 'Subplot',
  character: 'Character Arc',
  mystery: 'Mystery',
  romance: 'Romance',
}

export default function StoryThreadsPage() {
  const params = useParams()
  const seriesId = params?.seriesId as string
  const [threads, setThreads] = useState<StoryThread[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'resolved'>('all')

  const fetchData = useCallback(async () => {
    if (!seriesId) return
    try {
      setIsLoading(true)
      const res = await fetch(`/api/series/${seriesId}/bible`)
      const data = await res.json()
      if (data.success && data.bible) {
        setThreads(data.bible.storyThreads || [])
      }
    } catch (err) {
      console.error('Failed to load story threads:', err)
    } finally {
      setIsLoading(false)
    }
  }, [seriesId])

  useEffect(() => { fetchData() }, [fetchData])

  const filteredThreads = threads.filter(t => {
    if (filter === 'active') return t.status !== 'resolved'
    if (filter === 'resolved') return t.status === 'resolved'
    return true
  })

  const activeCount = threads.filter(t => t.status !== 'resolved').length
  const resolvedCount = threads.filter(t => t.status === 'resolved').length

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
            <GitBranch className="h-5 w-5 text-purple-500" />
            Story Threads
          </h2>
          <p className="text-sm text-muted-foreground">
            {activeCount} active, {resolvedCount} resolved
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(['all', 'active', 'resolved'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-md text-sm capitalize transition-colors ${
              filter === f
                ? 'bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 font-medium'
                : 'bg-gray-50 dark:bg-gray-800 text-muted-foreground hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            {f} ({f === 'all' ? threads.length : f === 'active' ? activeCount : resolvedCount})
          </button>
        ))}
      </div>

      {threads.length === 0 ? (
        <div className="border rounded-lg p-8 text-center text-muted-foreground">
          <GitBranch className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No story threads tracked yet.</p>
          <p className="text-sm mt-1">Story threads are extracted when you sync an episode&apos;s storyline to the bible.</p>
        </div>
      ) : filteredThreads.length === 0 ? (
        <div className="border rounded-lg p-6 text-center text-muted-foreground text-sm">
          No {filter} threads found.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredThreads.map(thread => {
            const config = STATUS_CONFIG[thread.status] || STATUS_CONFIG.introduced
            const StatusIcon = config.icon
            return (
              <div
                key={thread.id}
                className={`border rounded-lg p-4 ${config.borderColor} ${
                  thread.status === 'resolved' ? 'opacity-70' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <StatusIcon className={`h-4 w-4 ${config.color}`} />
                    <h3 className="font-medium">{thread.name}</h3>
                    <span className="text-xs text-muted-foreground">
                      {TYPE_LABELS[thread.type] || thread.type}
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.color}`}>
                    {config.label}
                  </span>
                </div>

                {thread.description && (
                  <p className="text-sm text-muted-foreground mt-2">{thread.description}</p>
                )}

                <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                  {thread.introducedInEpisode && (
                    <span>Introduced: Ep {thread.introducedInEpisode}</span>
                  )}
                  {thread.resolvedInEpisode && (
                    <span>Resolved: Ep {thread.resolvedInEpisode}</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
