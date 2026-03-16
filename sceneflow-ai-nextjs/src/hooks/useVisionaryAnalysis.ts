'use client'

import { useState, useCallback, useRef } from 'react'
import type {
  VisionaryPhase,
  VisionaryPhaseProgress,
  VisionaryReport,
  CreateAnalysisRequest,
  PHASE_TICKER_MESSAGES,
} from '@/lib/visionary/types'

/**
 * useVisionaryAnalysis — Multi-phase analysis state machine
 * 
 * Orchestrates the 4-phase Visionary Engine analysis pipeline:
 * 1. Market Scan → 2. Gap Analysis → 3. Arbitrage Map → 4. Bridge Plan
 * 
 * Each phase calls the /api/visionary/analyze endpoint which runs
 * sequentially on the server side. The client polls for progress.
 */
export function useVisionaryAnalysis() {
  const [phase, setPhase] = useState<VisionaryPhase>('idle')
  const [progress, setProgress] = useState<VisionaryPhaseProgress>({
    phase: 'idle',
    progress: 0,
    message: 'Ready to analyze...',
  })
  const [report, setReport] = useState<VisionaryReport | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  /**
   * Start a new analysis run
   */
  const startAnalysis = useCallback(async (input: CreateAnalysisRequest & { userEmail?: string }) => {
    // Abort any existing analysis
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setIsRunning(true)
    setError(null)
    setReport(null)

    const userEmail = input.userEmail || ''

    try {
      // Phase 1: Create analysis & start market scan
      setPhase('market-scan')
      setProgress({ phase: 'market-scan', progress: 0, message: 'Starting market scan...' })

      const createRes = await fetch('/api/visionary/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': userEmail },
        body: JSON.stringify(input),
        signal: controller.signal,
      })

      if (!createRes.ok) {
        const errData = await createRes.json().catch(() => ({ error: 'Failed to start analysis' }))
        throw new Error(errData.error || `HTTP ${createRes.status}`)
      }

      const createData = await createRes.json()
      if (!createData.success || !createData.report) {
        throw new Error(createData.error || 'No report returned')
      }

      const reportId = createData.report.id

      // Poll for completion
      let attempts = 0
      const maxAttempts = 120 // 2 minutes max
      while (attempts < maxAttempts) {
        if (controller.signal.aborted) break

        await new Promise(resolve => setTimeout(resolve, 1000))
        attempts++

        const pollRes = await fetch(`/api/visionary/reports/${reportId}`, {
          headers: { 'x-user-id': userEmail },
          signal: controller.signal,
        })

        if (!pollRes.ok) continue

        const pollData = await pollRes.json()
        if (!pollData.success || !pollData.report) continue

        const r = pollData.report as VisionaryReport

        // Update phase based on what data is present
        if (r.bridgePlan) {
          setPhase('complete')
          setProgress({ phase: 'complete', progress: 100, message: 'Analysis complete!' })
          setReport(r)
          break
        } else if (r.arbitrageMap) {
          setPhase('bridge-plan')
          setProgress({ phase: 'bridge-plan', progress: 75, message: 'Generating production plan...' })
        } else if (r.gapAnalysis) {
          setPhase('arbitrage-map')
          setProgress({ phase: 'arbitrage-map', progress: 50, message: 'Mapping language opportunities...' })
        } else if (r.marketScan) {
          setPhase('gap-analysis')
          setProgress({ phase: 'gap-analysis', progress: 25, message: 'Analyzing content gaps...' })
        }

        if (r.status === 'complete') {
          setPhase('complete')
          setProgress({ phase: 'complete', progress: 100, message: 'Analysis complete!' })
          setReport(r)
          break
        }

        if (r.status === 'failed') {
          throw new Error(r.errorMessage || 'Analysis failed on the server')
        }
      }

      if (attempts >= maxAttempts) {
        throw new Error('Analysis timed out — please try again')
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return // User cancelled
      setPhase('error')
      setError(err.message || 'Unknown error')
      setProgress({ phase: 'error', progress: 0, message: err.message })
    } finally {
      setIsRunning(false)
    }
  }, [])

  /**
   * Cancel a running analysis
   */
  const cancelAnalysis = useCallback(() => {
    abortRef.current?.abort()
    setIsRunning(false)
    setPhase('idle')
    setProgress({ phase: 'idle', progress: 0, message: 'Analysis cancelled' })
  }, [])

  /**
   * Reset state for a new analysis
   */
  const reset = useCallback(() => {
    abortRef.current?.abort()
    setPhase('idle')
    setProgress({ phase: 'idle', progress: 0, message: 'Ready to analyze...' })
    setReport(null)
    setError(null)
    setIsRunning(false)
  }, [])

  /**
   * Load an existing report by ID
   */
  const loadReport = useCallback(async (reportId: string, userEmail?: string) => {
    try {
      const res = await fetch(`/api/visionary/reports/${reportId}`, {
        headers: { 'x-user-id': userEmail || '' },
      })
      if (!res.ok) throw new Error('Failed to load report')
      const data = await res.json()
      if (data.success && data.report) {
        setReport(data.report)
        setPhase(data.report.status === 'complete' ? 'complete' : 'idle')
      }
    } catch (err: any) {
      setError(err.message)
    }
  }, [])

  return {
    // State
    phase,
    progress,
    report,
    error,
    isRunning,
    // Actions
    startAnalysis,
    cancelAnalysis,
    reset,
    loadReport,
  }
}
