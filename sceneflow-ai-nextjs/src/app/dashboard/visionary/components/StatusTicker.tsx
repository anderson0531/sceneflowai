'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { VisionaryPhase, VisionaryPhaseProgress } from '@/lib/visionary/types'
import { PHASE_TICKER_MESSAGES } from '@/lib/visionary/types'

interface StatusTickerProps {
  phase: VisionaryPhase
  progress: VisionaryPhaseProgress
  isRunning: boolean
}

/**
 * StatusTicker — Animated phase progress indicator
 * 
 * Shows the current analysis phase with a rotating ticker of status messages,
 * a progress bar, and phase step indicators.
 */
export function StatusTicker({ phase, progress, isRunning }: StatusTickerProps) {
  const [messageIndex, setMessageIndex] = useState(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const messages = PHASE_TICKER_MESSAGES[phase] || ['Processing...']

  useEffect(() => {
    if (!isRunning) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      return
    }

    setMessageIndex(0)
    intervalRef.current = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % messages.length)
    }, 2500)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [phase, isRunning, messages.length])

  const phases: { key: VisionaryPhase; label: string; color: string }[] = [
    { key: 'market-scan', label: 'Market Scan', color: 'bg-blue-500' },
    { key: 'gap-analysis', label: 'Gap Analysis', color: 'bg-purple-500' },
    { key: 'arbitrage-map', label: 'Arbitrage Map', color: 'bg-emerald-500' },
    { key: 'bridge-plan', label: 'Bridge Plan', color: 'bg-amber-500' },
  ]

  const getPhaseStatus = (phaseKey: VisionaryPhase) => {
    const order = ['market-scan', 'gap-analysis', 'arbitrage-map', 'bridge-plan']
    const currentIdx = order.indexOf(phase)
    const phaseIdx = order.indexOf(phaseKey)
    if (phase === 'complete') return 'complete'
    if (phaseIdx < currentIdx) return 'complete'
    if (phaseIdx === currentIdx) return 'active'
    return 'upcoming'
  }

  if (phase === 'idle' && !isRunning) return null

  return (
    <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-5 backdrop-blur-sm">
      {/* Phase Steps */}
      <div className="flex items-center justify-between mb-4">
        {phases.map((p, idx) => {
          const status = getPhaseStatus(p.key)
          return (
            <div key={p.key} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500 ${
                    status === 'complete'
                      ? 'bg-green-500 text-white'
                      : status === 'active'
                        ? `${p.color} text-white animate-pulse`
                        : 'bg-gray-700 text-gray-500'
                  }`}
                >
                  {status === 'complete' ? '✓' : idx + 1}
                </div>
                <span className={`text-[10px] mt-1.5 font-medium ${
                  status === 'active' ? 'text-white' : 'text-gray-500'
                }`}>
                  {p.label}
                </span>
              </div>
              {idx < phases.length - 1 && (
                <div className={`h-0.5 w-full mx-1 mt-[-12px] transition-colors duration-500 ${
                  status === 'complete' ? 'bg-green-500/60' : 'bg-gray-700'
                }`} />
              )}
            </div>
          )
        })}
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-700 rounded-full h-2 mb-3 overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500"
          initial={{ width: '0%' }}
          animate={{ width: `${progress.progress}%` }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
        />
      </div>

      {/* Ticker Message */}
      <div className="h-5 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.p
            key={`${phase}-${messageIndex}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="text-sm text-gray-400"
          >
            {messages[messageIndex]}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  )
}
