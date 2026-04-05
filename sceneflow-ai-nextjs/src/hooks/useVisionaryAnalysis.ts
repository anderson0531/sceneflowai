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
 * Orchestrates the 3-phase Visionary Engine analysis pipeline:
 * 1. Market Scan  2. Gap Analysis  3. Opportunity Map (Arbitrage)
 *
 * The server runs all three phases, then returns a JSON metadata line
 * followed by optional streamed text (bridge plan).
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
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null)
  const phaseRef = useRef<VisionaryPhase>('idle')

  useEffect(() => { phaseRef.current = phase }, [phase])

  useEffect(() => {
    return () => { if (progressTimerRef.current) clearInterval(progressTimerRef.current) }
  }, [])

  const clearTimers = useCallback(() => {
    if (progressTimerRef.current) { clearInterval(progressTimerRef.current); progressTimerRef.current = null }
  }, [])

  const startAnalysis = useCallback(async (input: CreateAnalysisRequest & { userEmail?: string }) => {
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

    // Smooth progress simulation across the 3 analysis phases.
    // Each phase owns ~33% of the bar. The timer eases toward
    // the phase ceiling, then auto-advances to the next phase.
    let simulatedProgress = 2
    const phaseOrder: VisionaryPhase[] = ['market-scan', 'gap-analysis', 'arbitrage-map']
    const phaseCeiling: Record<string, number> = {
      'market-scan': 30,
      'gap-analysis': 62,
      'arbitrage-map': 92,
    }

    progressTimerRef.current = setInterval(() => {
      const currentPhase = phaseRef.current
      const ceiling = phaseCeiling[currentPhase] ?? 92
      const remaining = ceiling - simulatedProgress

      if (remaining > 1) {
        simulatedProgress += remaining * 0.04
      } else {
        const idx = phaseOrder.indexOf(currentPhase)
        if (idx >= 0 && idx < phaseOrder.length - 1) {
          const next = phaseOrder[idx + 1]
          setPhase(next)
          simulatedProgress = (phaseCeiling[currentPhase] ?? simulatedProgress) + 1
        }
      }

      setProgress(prev => ({
        ...prev,
        phase: phaseRef.current,
        progress: Math.round(Math.min(simulatedProgress, 95)),
      }))
    }, 600)

    try {
      const createRes = await fetch('/api/visionary/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': userEmail },
        body: JSON.stringify(input),
        signal: controller.signal,
      })

      if (!createRes.ok) {
        const errBody = await createRes.json().catch(() => null)
        throw new Error(errBody?.details || errBody?.error || 'Analysis failed')
      }

      const reader = createRes.body?.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let metadata: Record<string, unknown> | null = null
      let fullBible = ''

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })

          // The first line is a JSON object with __metadata key
          if (!metadata) {
            const newlineIdx = buffer.indexOf('\n')
            if (newlineIdx !== -1) {
              const firstLine = buffer.slice(0, newlineIdx)
              buffer = buffer.slice(newlineIdx + 1)
              try {
                const parsed = JSON.parse(firstLine)
                if (parsed.__metadata) {
                  metadata = parsed.__metadata
                  simulatedProgress = 96
                }
              } catch {
                fullBible += firstLine
              }
              fullBible += buffer
              buffer = ''
            }
            continue
          }

          fullBible += buffer
          buffer = ''
        }
      }

      clearTimers()
      const finalReport: VisionaryReport = {
        ...(metadata as any),
        concept: input.concept,
        genre: input.genre,
        bridgePlan: fullBible,
        status: 'complete',
      }
      setReport(finalReport)
      setPhase('complete')
      setProgress({ phase: 'complete', progress: 100, message: 'Analysis complete' })

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

  const cancelAnalysis = useCallback(() => {
    abortRef.current?.abort()
    clearTimers()
    setIsRunning(false)
    setPhase('idle')
    setProgress({ phase: 'idle', progress: 0, message: 'Analysis cancelled' })
  }, [clearTimers])

  const reset = useCallback(() => {
    abortRef.current?.abort()
    clearTimers()
    setPhase('idle')
    setProgress({ phase: 'idle', progress: 0, message: 'Ready to analyze...' })
    setReport(null)
    setError(null)
    setIsRunning(false)
  }, [clearTimers])

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
    phase,
    progress,
    report,
    error,
    isRunning,
    startAnalysis,
    cancelAnalysis,
    reset,
    loadReport,
  }
}
