'use client'

import { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, BarChart3, Globe2, CheckCircle2, X, Loader2 } from 'lucide-react'
import type { VisionaryPhase, VisionaryPhaseProgress } from '@/lib/visionary/types'

const PHASES: { key: VisionaryPhase; label: string; description: string; icon: typeof Search }[] = [
  { key: 'market-scan', label: 'Market Scan', description: 'Scanning global content landscape', icon: Search },
  { key: 'gap-analysis', label: 'Gap Analysis', description: 'Identifying underserved niches', icon: BarChart3 },
  { key: 'arbitrage-map', label: 'Opportunity Map', description: 'Mapping regional opportunities', icon: Globe2 },
]

function getConceptTokens(concept: string): string[] {
  const stopWords = ['a', 'an', 'the', 'and', 'or', 'in', 'on', 'at', 'with', 'for', 'how', 'to', 'of']
  return concept
    .toLowerCase()
    .replace(/[^\w\s]/gi, '')
    .split(' ')
    .filter(word => word.length > 3 && !stopWords.includes(word))
    .slice(0, 5)
}

function truncateConcept(text: string, max = 120): string {
  if (text.length <= max) return text
  return text.slice(0, max).replace(/\s+\S*$/, '') + '...'
}

interface AnalysisOverlayProps {
  phase: VisionaryPhase
  progress: VisionaryPhaseProgress
  isRunning: boolean
  concept: string
  genre: string
  onCancel: () => void
}

export function AnalysisOverlay({
  phase,
  progress,
  isRunning,
  concept,
  genre,
  onCancel,
}: AnalysisOverlayProps) {
  const [tickerIdx, setTickerIdx] = useState(0)

  const phaseOrder = PHASES.map(p => p.key)
  const currentPhaseIdx = phaseOrder.indexOf(phase)
  const activePhase = PHASES[Math.max(0, currentPhaseIdx)] || PHASES[0]

  const pct = Math.min(99, Math.max(0, Math.round(progress.progress)))

  const messages = useMemo(() => {
    const tokens = getConceptTokens(concept)
    const p = tokens[0] || 'concept'
    const s = tokens[1] || genre || 'market'
    const map: Record<string, string[]> = {
      'market-scan': [
        `Scanning global demand for "${p}" trends...`,
        `Indexing competitive landscape...`,
        `Analyzing ${genre || 'creative'} saturation points...`,
      ],
      'gap-analysis': [
        `Identifying untapped potential in "${p}"...`,
        `Calculating audience retention hooks...`,
        `Mapping viewer engagement patterns for "${s}"...`,
      ],
      'arbitrage-map': [
        `Localizing "${p}" for high-revenue regions...`,
        `Optimizing for global resonance...`,
        `Calculating regional arbitrage for "${s}"...`,
      ],
    }
    return map[phase] || ['Processing...']
  }, [phase, concept, genre])

  useEffect(() => {
    if (!isRunning) return
    setTickerIdx(0)
    const iv = setInterval(() => setTickerIdx(i => (i + 1) % messages.length), 3200)
    return () => clearInterval(iv)
  }, [phase, isRunning, messages.length])

  if (phase === 'idle' && !isRunning) return null

  const getStepStatus = (idx: number) => {
    if (phase === 'complete') return 'complete'
    if (idx < currentPhaseIdx) return 'complete'
    if (idx === currentPhaseIdx) return 'active'
    return 'upcoming'
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center py-10 max-w-xl mx-auto"
    >
      {/* Market analysis illustration */}
      <div className="relative w-48 h-48 mb-8">
        {/* Outer rotating ring */}
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-dashed border-emerald-500/20"
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        />
        {/* Middle ring */}
        <motion.div
          className="absolute inset-4 rounded-full border border-emerald-500/10"
          animate={{ rotate: -360 }}
          transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
        />
        {/* Pulse ring */}
        <motion.div
          className="absolute inset-8 rounded-full border-2 border-emerald-500/30"
          animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0.2, 0.6] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
        {/* Center icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            className="w-20 h-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500/40 flex items-center justify-center shadow-lg shadow-emerald-500/10"
            animate={{ scale: [1, 1.04, 1] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <activePhase.icon className="w-8 h-8 text-emerald-400" />
          </motion.div>
        </div>

        {/* Small orbiting dots representing regions */}
        {[0, 72, 144, 216, 288].map((angle, i) => (
          <motion.div
            key={i}
            className="absolute w-2.5 h-2.5 rounded-full"
            style={{
              background: i <= currentPhaseIdx ? '#10b981' : '#374151',
              left: '50%',
              top: '50%',
            }}
            animate={{
              x: Math.cos(((angle + (i * 15)) * Math.PI) / 180) * 80 - 5,
              y: Math.sin(((angle + (i * 15)) * Math.PI) / 180) * 80 - 5,
              opacity: [0.4, 1, 0.4],
            }}
            transition={{
              opacity: { duration: 2, repeat: Infinity, delay: i * 0.3 },
              x: { duration: 0 },
              y: { duration: 0 },
            }}
          />
        ))}
      </div>

      {/* Phase stepper */}
      <div className="w-full mb-8">
        <div className="flex items-center justify-between gap-1">
          {PHASES.map((p, i) => {
            const status = getStepStatus(i)
            return (
              <div key={p.key} className="flex-1 flex flex-col items-center gap-2">
                <div className="flex items-center w-full">
                  {i > 0 && (
                    <div className={`flex-1 h-0.5 transition-colors duration-500 ${
                      status === 'upcoming' ? 'bg-gray-700' : 'bg-emerald-500'
                    }`} />
                  )}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-500 ${
                    status === 'complete' ? 'bg-emerald-500 text-white' :
                    status === 'active' ? 'bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400' :
                    'bg-gray-800 border border-gray-700 text-gray-500'
                  }`}>
                    {status === 'complete' ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : status === 'active' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <p.icon className="w-3.5 h-3.5" />
                    )}
                  </div>
                  {i < PHASES.length - 1 && (
                    <div className={`flex-1 h-0.5 transition-colors duration-500 ${
                      i < currentPhaseIdx ? 'bg-emerald-500' : 'bg-gray-700'
                    }`} />
                  )}
                </div>
                <span className={`text-[10px] font-medium transition-colors duration-500 text-center ${
                  status === 'active' ? 'text-emerald-400' :
                  status === 'complete' ? 'text-gray-400' :
                  'text-gray-600'
                }`}>
                  {p.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-md mb-6">
        <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
            initial={{ width: '0%' }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-xs text-gray-500">{activePhase.description}</span>
          <span className="text-xs text-emerald-400 tabular-nums">{pct}%</span>
        </div>
      </div>

      {/* Ticker message */}
      <div className="h-6 overflow-hidden mb-6">
        <AnimatePresence mode="wait">
          <motion.p
            key={`${phase}-${tickerIdx}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="text-sm text-gray-400 text-center"
          >
            {messages[tickerIdx]}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Concept label (truncated) */}
      <div className="text-center mb-6">
        <p className="text-sm text-gray-500">
          Analyzing:{' '}
          <span className="text-white font-medium">{truncateConcept(concept)}</span>
          {genre && <span className="text-gray-600"> · {genre}</span>}
        </p>
      </div>

      {/* Cancel */}
      <button
        onClick={onCancel}
        className="group flex items-center gap-2 px-4 py-2 text-sm text-gray-500 hover:text-red-400 bg-gray-800/40 hover:bg-red-500/10 border border-gray-700/50 hover:border-red-500/30 rounded-lg transition-all duration-200"
      >
        <X className="w-3.5 h-3.5" />
        Cancel Analysis
      </button>
    </motion.div>
  )
}
