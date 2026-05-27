'use client'

import { useCallback, useEffect, useState } from 'react'

export interface PremierePublishJobSummary {
  id: string
  status: string
  platformUrl?: string
  title?: string
}

export function usePremierePublish(projectId: string | undefined, isDemo: boolean) {
  const [youtubeConnected, setYoutubeConnected] = useState(false)
  const [jobs, setJobs] = useState<PremierePublishJobSummary[]>([])
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (isDemo) {
      setYoutubeConnected(false)
      setJobs([])
      return
    }
    setLoading(true)
    try {
      const [connRes, jobsRes] = await Promise.all([
        fetch('/api/publish/youtube', { cache: 'no-store' }),
        projectId
          ? fetch(`/api/publish/youtube/jobs?projectId=${encodeURIComponent(projectId)}`, {
              cache: 'no-store',
            })
          : Promise.resolve(null),
      ])

      if (connRes.ok) {
        const conn = await connRes.json()
        setYoutubeConnected(!!conn.connected)
      }

      if (jobsRes?.ok) {
        const data = await jobsRes.json()
        setJobs(Array.isArray(data.items) ? data.items : [])
      } else {
        setJobs([])
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }, [isDemo, projectId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const hasPublishedJob = jobs.some((j) => j.status === 'published')

  return {
    youtubeConnected,
    jobs,
    hasPublishedJob,
    loading,
    refresh,
  }
}
