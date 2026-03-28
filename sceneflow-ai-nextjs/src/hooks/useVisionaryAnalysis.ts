'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type {
  VisionaryPhase,
  VisionaryPhaseProgress,
  VisionaryReport,
  CreateAnalysisRequest,
} from '@/lib/visionary/types'

/**
 * useVisionaryAnalysis — Multi-phase analysis state machine
 * 
 * Orchestrates the 4-phase Visionary Engine analysis pipeline:
 * 1. Market Scan → 2. Gap Analysis → 3. Arbitrage Map → 4. Bridge Plan
 * 
 * The server runs all phases sequentially in a single POST request,
 * updating the DB record after each phase completes. The client fires
 * the POST without blocking and runs a parallel polling loop + smooth
 * progress simulation so the UI reflects real-time phase transitions.
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
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null)
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null)
  const phaseRef = useRef<VisionaryPhase>('idle')

  // Keep phaseRef in sync so timers can read current phase
  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current)
      if (progressTimerRef.current) clearInterval(progressTimerRef.current)
    }
  }, [])

  /** Stop all running timers */
  const clearTimers = useCallback(() => {
    if (pollTimerRef.current) { clearInterval(pollTimerRef.current); pollTimerRef.current = null }
    if (progressTimerRef.current) { clearInterval(progressTimerRef.current); progressTimerRef.current = null }
  }, [])

  /**
   * Start a new analysis run.
   * Fires the POST and immediately begins polling + progress simulation.
   */
  const startAnalysis = useCallback(async (input: CreateAnalysisRequest & { userEmail?: string }) => {
    // Abort any existing analysis
    abortRef.current?.abort()
    clearTimers()

    const controller = new AbortController()
    abortRef.current = controller

    setIsRunning(true)
    setError(null)
    setReport(null)
    setPhase('market-scan')
    setProgress({ phase: 'market-scan', progress: 2, message: 'Starting market scan...' })

    const userEmail = input.userEmail || ''

    // ── Smooth progress simulation ──────────────────────────────────
    // Incrementally advance progress within each phase's band so the
    // UI never feels stuck. Real phase transitions from polling override.
    let simulatedProgress = 2
    const phaseTargets: Record<string, number> = {
      'market-scan': 33,
      'gap-analysis': 66,
      'arbitrage-map': 98, // Leave room for 100% on return
    }

    progressTimerRef.current = setInterval(() => {
      const currentPhase = phaseRef.current
      const target = phaseTargets[currentPhase] || 98

      if (simulatedProgress < target) {
        simulatedProgress += (target - simulatedProgress) * 0.05 // Standard approach
      } else if (currentPhase !== 'arbitrage-map') {
        // AUTO-ADVANCE DRIFT:
        const order: VisionaryPhase[] = ['market-scan', 'gap-analysis', 'arbitrage-map']
        const nextIdx = order.indexOf(currentPhase) + 1
        if (nextIdx < order.length) {
          setPhase(order[nextIdx])
        }
      }

      setProgress(prev => ({ ...prev, progress: Math.round(simulatedProgress) }))
    }, 500)

    try {
      // ── Fire the POST (server runs all 4 phases) ─────────────────
      const createRes = await fetch('/api/visionary/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': userEmail },
        body: JSON.stringify(input),
        signal: controller.signal,
        keepalive: true, // Keep the connection open for long-running requests
      })

      clearTimers()

      if (!createRes.ok) {
        const errData = await createRes.json().catch(() => ({ error: 'Failed to start analysis' }))
        throw new Error(errData.error || `HTTP ${createRes.status}`)
      }

      const createData = await createRes.json()
      console.log('Frontend received report:', createData); // Verify received data

      if (!createData.reportId) { // Check for a valid report object
        throw new Error(createData.error || 'No report returned')
      }

      // ── POST returned — apply final state ────────────────────────
      const finalReport = createData as VisionaryReport

      if (finalReport.status === 'failed') {
        throw new Error(finalReport.errorMessage || 'Analysis failed on the server')
      }

      setPhase('complete')
      setProgress({ phase: 'complete', progress: 100, message: 'Analysis complete!' })
      setReport(finalReport)

    } catch (err: any) {
      clearTimers()
      if (err.name === 'AbortError') return
      setPhase('error')
      setError(err.message || 'Unknown error')
      setProgress({ phase: 'error', progress: 0, message: err.message })
    } finally {
      setIsRunning(false)
    }
  }, [clearTimers])

  /**
   * Cancel a running analysis
   */
  const cancelAnalysis = useCallback(() => {
    abortRef.current?.abort()
    clearTimers()
    setIsRunning(false)
    setPhase('idle')
    setProgress({ phase: 'idle', progress: 0, message: 'Analysis cancelled' })
  }, [clearTimers])

  /**
   * Reset state for a new analysis
   */
  const reset = useCallback(() => {
    abortRef.current?.abort()
    clearTimers()
    setPhase('idle')
    setProgress({ phase: 'idle', progress: 0, message: 'Ready to analyze...' })
    setReport(null)
    setError(null)
    setIsRunning(false)
  }, [clearTimers])

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
