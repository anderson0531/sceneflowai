'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { isStaleActiveJob } from '@/lib/jobs/staleJob'

export type BackgroundJobStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled'

export type BackgroundJob = {
  id: string
  job_type: string
  status: BackgroundJobStatus
  progress: number
  payload?: Record<string, unknown> | null
  result?: Record<string, unknown> | null
  error?: string | null
  created_at?: string
  updated_at?: string
  completed_at?: string | null
}

const POLL_INTERVAL_MS = 4000
const TERMINAL: BackgroundJobStatus[] = ['completed', 'failed', 'cancelled']

export function isTerminal(status?: BackgroundJobStatus): boolean {
  return !!status && TERMINAL.includes(status)
}

/**
 * Tracks a long-running server job.
 *
 * The job lives in the database rather than component state, so a reload or a
 * trip to another tab no longer loses the operation: on mount we look for an
 * active job of this type and re-attach to it.
 */
export function useBackgroundJob(options: {
  projectId: string
  jobType: string
  enabled?: boolean
  onCompleted?: (job: BackgroundJob) => void
  onFailed?: (job: BackgroundJob) => void
}) {
  const { projectId, jobType, enabled = true, onCompleted, onFailed } = options

  const [job, setJob] = useState<BackgroundJob | null>(null)
  const [rehydrated, setRehydrated] = useState(false)
  const jobIdRef = useRef<string | null>(null)
  const notifiedRef = useRef<Set<string>>(new Set())

  // Keep callbacks in refs so the poll loop does not restart on every render.
  const onCompletedRef = useRef(onCompleted)
  const onFailedRef = useRef(onFailed)
  useEffect(() => {
    onCompletedRef.current = onCompleted
    onFailedRef.current = onFailed
  }, [onCompleted, onFailed])

  const settle = useCallback((next: BackgroundJob) => {
    setJob(next)
    if (!isTerminal(next.status)) return
    if (notifiedRef.current.has(next.id)) return
    notifiedRef.current.add(next.id)
    if (next.status === 'completed') onCompletedRef.current?.(next)
    if (next.status === 'failed' || next.status === 'cancelled') onFailedRef.current?.(next)
  }, [])

  const dismiss = useCallback(() => {
    jobIdRef.current = null
    setJob(null)
  }, [])

  /** Re-attach to an in-flight job so refreshing does not orphan it.
   *  Returns the matched active job, or null when none. */
  const rehydrate = useCallback(async (): Promise<BackgroundJob | null> => {
    try {
      const res = await fetch(
        `/api/jobs?projectId=${encodeURIComponent(projectId)}&active=true`
      )
      if (!res.ok) return null
      const data = await res.json()
      const match = (data.jobs || []).find((j: BackgroundJob) => j.job_type === jobType)
      if (match && !isStaleActiveJob(match)) {
        jobIdRef.current = match.id
        // Mark as already-seen so re-attaching never replays a completion toast
        // for work the user was told about before the reload.
        setJob(match)
        return match
      }
      return null
    } finally {
      setRehydrated(true)
    }
  }, [projectId, jobType])

  useEffect(() => {
    if (!enabled || !projectId) {
      setRehydrated(true)
      return
    }
    void rehydrate()
  }, [enabled, projectId, rehydrate])

  const poll = useCallback(async () => {
    const jobId = jobIdRef.current
    if (!jobId) return
    try {
      const res = await fetch(`/api/jobs?jobId=${encodeURIComponent(jobId)}`)
      if (!res.ok) return
      const data = await res.json()
      if (data.job) {
        if (isStaleActiveJob(data.job)) {
          dismiss()
          return
        }
        settle(data.job)
      }
    } catch {
      // Transient network failure — the next tick retries.
    }
  }, [dismiss, settle])

  useEffect(() => {
    if (!enabled) return
    if (!job || isTerminal(job.status)) return
    const interval = setInterval(poll, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [enabled, job, poll])

  /** Begin tracking a newly queued job. */
  const track = useCallback((jobId: string, seed?: Partial<BackgroundJob>) => {
    jobIdRef.current = jobId
    setJob({
      id: jobId,
      job_type: jobType,
      status: 'queued',
      progress: 0,
      ...seed,
    })
  }, [jobType])

  const cancel = useCallback(async () => {
    const jobId = jobIdRef.current
    if (!jobId) {
      dismiss()
      return
    }
    try {
      const res = await fetch('/api/jobs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ jobId, action: 'cancel' }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.job) settle(data.job)
        else dismiss()
      } else {
        dismiss()
      }
    } catch {
      dismiss()
    }
  }, [dismiss, settle])

  /** Cancel every active job of this type for the project (clears stuck queue). */
  const cancelActive = useCallback(async (): Promise<number> => {
    try {
      const res = await fetch('/api/jobs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'cancel-active',
          projectId,
          jobType,
        }),
      })
      if (!res.ok) {
        dismiss()
        return 0
      }
      const data = await res.json()
      dismiss()
      return Number(data.cancelledCount || 0)
    } catch {
      dismiss()
      return 0
    }
  }, [dismiss, jobType, projectId])

  return {
    job,
    /** True once the initial in-flight lookup finished. */
    rehydrated,
    isActive: !!job && !isTerminal(job.status),
    track,
    dismiss,
    cancel,
    cancelActive,
    refresh: poll,
    rehydrate,
  }
}
