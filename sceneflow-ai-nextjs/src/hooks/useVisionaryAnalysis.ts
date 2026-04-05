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
 * 1. Market Scan  2. Gap Analysis  3. Arbitrage Map  4. Series Bible (streamed)
 *
 * The server runs phases 1-3 synchronously, then streams phase 4.
 * The response body starts with a JSON metadata line (phases 1-3 results),
 * followed by the streamed Series Bible text.
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

    // Smooth progress simulation while the server works on phases 1-3
    let simulatedProgress = 2
    const phaseTargets: Record<string, number> = {
      'market-scan': 33,
      'gap-analysis': 66,
      'arbitrage-map': 98,
    }

    progressTimerRef.current = setInterval(() => {
      const currentPhase = phaseRef.current
      const target = phaseTargets[currentPhase] || 98
      const remaining = target - simulatedProgress

      if (remaining > 0.5) {
        simulatedProgress += remaining * 0.05 
      } else if (currentPhase !== 'arbitrage-map') {
        const order: VisionaryPhase[] = ['market-scan', 'gap-analysis', 'arbitrage-map']
        const nextIdx = order.indexOf(currentPhase) + 1
        if (nextIdx < order.length) {
          setPhase(order[nextIdx])
          simulatedProgress += 1 
        }
      }

      setProgress(prev => ({ 
        ...prev, 
        phase: phaseRef.current,
        progress: Math.round(simulatedProgress) 
      }))
    }, 500)

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
                  setPhase('bridge-plan')
                  simulatedProgress = 99
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

          setProgress(prev => ({ 
            ...prev, 
            phase: 'bridge-plan',
            message: `Generating Series Bible...`,
            progress: 99 
          }))
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
