'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, BarChart3, Globe2, Route, Sparkles, X } from 'lucide-react'
import type { VisionaryPhase, VisionaryPhaseProgress } from '@/lib/visionary/types'
import { PHASE_TICKER_MESSAGES } from '@/lib/visionary/types'

// ─── Phase configuration ──────────────────────────────────────────────────────

const PHASES = [
  {
    key: 'market-scan' as VisionaryPhase,
    label: 'Market Scan',
    icon: Search,
    color: '#3B82F6',       // blue-500
    glowColor: 'rgba(59, 130, 246, 0.4)',
    ringColor: 'rgba(59, 130, 246, 0.15)',
    gradient: 'from-blue-500 to-cyan-400',
  },
  {
    key: 'gap-analysis' as VisionaryPhase,
    label: 'Gap Analysis',
    icon: BarChart3,
    color: '#A855F7',       // purple-500
    glowColor: 'rgba(168, 85, 247, 0.4)',
    ringColor: 'rgba(168, 85, 247, 0.15)',
    gradient: 'from-purple-500 to-pink-400',
  },
  {
    key: 'arbitrage-map' as VisionaryPhase,
    label: 'Arbitrage Map',
    icon: Globe2,
    color: '#10B981',       // emerald-500
    glowColor: 'rgba(16, 185, 129, 0.4)',
    ringColor: 'rgba(16, 185, 129, 0.15)',
    gradient: 'from-emerald-500 to-teal-400',
  },
];

/**
 * Extracts high-value tokens from the concept string
 * to inject into the processing ticker.
 */
function getConceptTokens(concept: string): string[] {
  const stopWords = ['a', 'an', 'the', 'and', 'or', 'in', 'on', 'at', 'with', 'for', 'how', 'to', 'of'];
  return concept
    .toLowerCase()
    .replace(/[^\w\s]/gi, '') // Remove punctuation
    .split(' ')
    .filter(word => word.length > 3 && !stopWords.includes(word))
    .slice(0, 5); // Grab top 5 meaningful words
}

// ─── Floating particle component ──────────────────────────────────────────────

function DataParticle({ delay, color, size }: { delay: number; color: string; size: number }) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        filter: `blur(${size > 3 ? 1 : 0}px)`,
      }}
      initial={{ opacity: 0, scale: 0 }}
      animate={{
        opacity: [0, 0.8, 0.8, 0],
        scale: [0, 1, 1, 0.5],
        x: [0, (Math.random() - 0.5) * 200, (Math.random() - 0.5) * 300],
        y: [0, (Math.random() - 0.5) * 200, (Math.random() - 0.5) * 300],
      }}
      transition={{
        duration: 3 + Math.random() * 2,
        delay,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  )
}

// ─── Orbiting node component ──────────────────────────────────────────────────

function OrbitNode({
  phaseConfig,
  index,
  status,
  totalNodes,
}: {
  phaseConfig: typeof PHASES[number]
  index: number
  status: 'complete' | 'active' | 'upcoming'
  totalNodes: number
}) {
  const Icon = phaseConfig.icon
  const angle = (index / totalNodes) * 360 - 90 // Start from top
  const radius = 120

  return (
    <motion.div
      className="absolute"
      style={{
        left: '50%',
        top: '50%',
      }}
      animate={{
        x: Math.cos((angle * Math.PI) / 180) * radius - 24,
        y: Math.sin((angle * Math.PI) / 180) * radius - 24,
      }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      {/* Glow ring for active */}
      {status === 'active' && (
        <>
          <motion.div
            className="absolute -inset-3 rounded-full"
            style={{ backgroundColor: phaseConfig.glowColor }}
            animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute -inset-1.5 rounded-full"
            style={{ backgroundColor: phaseConfig.glowColor }}
            animate={{ scale: [1, 1.2, 1], opacity: [0.8, 0.3, 0.8] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          />
        </>
      )}

      {/* Node circle */}
      <motion.div
        className="relative w-12 h-12 rounded-full flex items-center justify-center border-2 transition-colors duration-500"
        style={{
          borderColor: status === 'upcoming' ? 'rgba(107,114,128,0.4)' : phaseConfig.color,
          backgroundColor:
            status === 'complete'
              ? phaseConfig.color
              : status === 'active'
                ? `${phaseConfig.color}30`
                : 'rgba(31,41,55,0.8)',
          boxShadow:
            status === 'active'
              ? `0 0 20px ${phaseConfig.glowColor}`
              : status === 'complete'
                ? `0 0 12px ${phaseConfig.glowColor}`
                : 'none',
        }}
        animate={
          status === 'active'
            ? { scale: [1, 1.08, 1] }
            : {}
        }
        transition={
          status === 'active'
            ? { duration: 1.5, repeat: Infinity, ease: 'easeInOut' }
            : {}
        }
      >
        {status === 'complete' ? (
          <motion.div
            initial={{ scale: 0, rotate: -90 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <Sparkles className="w-5 h-5 text-white" />
          </motion.div>
        ) : (
          <Icon
            className="w-5 h-5 transition-colors duration-500"
            style={{
              color: status === 'active' ? phaseConfig.color : 'rgba(107,114,128,0.6)',
            }}
          />
        )}
      </motion.div>

      {/* Label */}
      <motion.span
        className="absolute top-full mt-2 left-1/2 -translate-x-1/2 text-[11px] font-medium whitespace-nowrap transition-colors duration-500"
        style={{
          color:
            status === 'active'
              ? phaseConfig.color
              : status === 'complete'
                ? 'rgba(209,213,219,1)'
                : 'rgba(107,114,128,0.6)',
        }}
      >
        {phaseConfig.label}
      </motion.span>
    </motion.div>
  )
}

// ─── Main overlay component ───────────────────────────────────────────────────

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
  const [messageIndex, setMessageIndex] = useState(0)
  
  const dynamicMessages = useMemo(() => {
    const tokens = getConceptTokens(concept);
    const primaryToken = tokens[0] || 'concept';
    const secondaryToken = tokens[1] || genre || 'market';

    const baseMessages: Record<VisionaryPhase, string[]> = {
      'market-scan': [
        `Cross-referencing ${primaryToken} metadata...`,
        `Scanning global demand for ${secondaryToken} trends...`,
        `Indexing competitive landscape for ${primaryToken}...`,
        `Analyzing ${genre || 'creative'} saturation points...`,
      ],
      'gap-analysis': [
        `Identifying untapped potential in ${primaryToken}...`,
        `Calculating narrative friction for ${secondaryToken}...`,
        `Isolating whitespace within ${primaryToken} tropes...`,
        `Mapping viewer retention hooks for ${secondaryToken}...`,
      ],
      'arbitrage-map': [
        `Localizing ${primaryToken} for high-revenue regions...`,
        `Optimizing ${secondaryToken} for global resonance...`,
        `Calculating currency-to-content arbitrage for ${primaryToken}...`,
        `Finalizing ${secondaryToken} production blueprints...`,
      ],
      'bridge-plan': [
        `Generating Series Bible for ${primaryToken}...`,
        `Crafting narrative arcs around ${secondaryToken}...`,
        `Building creative framework for ${primaryToken}...`,
        `Synthesizing production blueprint...`,
      ],
      'idle': ['Initializing...'],
      'complete': ['Synthesis successful.'],
      'error': ['Synthesis interrupted.']
    };

    return baseMessages[phase] || ['Processing coordinates...'];
  }, [phase, concept, genre]);

  // Cycle ticker messages
  useEffect(() => {
    if (!isRunning) return;
    setMessageIndex(0);
    const interval = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % dynamicMessages.length);
    }, 2800);
    return () => clearInterval(interval);
  }, [phase, isRunning, dynamicMessages.length])

  // Current phase config
  const activePhaseConfig = PHASES.find(p => p.key === phase) || PHASES[0]
  const phaseIndex = PHASES.findIndex(p => p.key === phase)

  // Phase status helper
  const getStatus = (key: VisionaryPhase): 'complete' | 'active' | 'upcoming' => {
    const order = PHASES.map(p => p.key)
    const currentIdx = order.indexOf(phase)
    const idx = order.indexOf(key)
    if (phase === 'complete') return 'complete'
    if (idx < currentIdx) return 'complete'
    if (idx === currentIdx) return 'active'
    return 'upcoming'
  }

  // Generate stable particles
  const particles = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        id: i,
        delay: i * 0.3,
        size: 2 + Math.random() * 3,
      })),
    []
  )

  if (phase === 'idle' && !isRunning) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="relative flex flex-col items-center py-8"
    >
      {/* ─── Orbital visualization ─────────────────────────────────── */}
      <div className="relative w-[320px] h-[320px] flex items-center justify-center mb-8">
        {/* Background radial gradient */}
        <div
          className="absolute inset-0 rounded-full transition-all duration-700"
          style={{
            background: `radial-gradient(circle, ${activePhaseConfig.ringColor} 0%, transparent 70%)`,
          }}
        />

        {/* Outer orbit ring */}
        <motion.div
          className="absolute inset-4 rounded-full border border-gray-700/40"
          animate={{ rotate: 360 }}
          transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
        />

        {/* Middle orbit ring (counter-rotate) */}
        <motion.div
          className="absolute inset-12 rounded-full border border-dashed"
          style={{ borderColor: `${activePhaseConfig.color}25` }}
          animate={{ rotate: -360 }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        />

        {/* Inner pulse ring */}
        <motion.div
          className="absolute rounded-full"
          style={{
            width: 80,
            height: 80,
            left: '50%',
            top: '50%',
            marginLeft: -40,
            marginTop: -40,
            border: `2px solid ${activePhaseConfig.color}40`,
          }}
          animate={{
            scale: [1, 1.6, 1],
            opacity: [0.5, 0, 0.5],
          }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Center core */}
        <motion.div
          className="relative z-10 w-20 h-20 rounded-full flex items-center justify-center"
          style={{
            background: `linear-gradient(135deg, ${activePhaseConfig.color}30, ${activePhaseConfig.color}10)`,
            border: `2px solid ${activePhaseConfig.color}60`,
            boxShadow: `0 0 30px ${activePhaseConfig.glowColor}, inset 0 0 20px ${activePhaseConfig.color}15`,
          }}
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          {/* Animated progress ring inside core */}
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 80 80">
            <circle
              cx="40"
              cy="40"
              r="36"
              fill="none"
              stroke={`${activePhaseConfig.color}20`}
              strokeWidth="3"
            />
            <motion.circle
              cx="40"
              cy="40"
              r="36"
              fill="none"
              stroke={activePhaseConfig.color}
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={226}
              animate={{ strokeDashoffset: 226 - (226 * Math.round(progress.progress)) / 100 }}
              transition={{ duration: 0.4, ease: 'linear' }}
            />
          </svg>

          {/* Progress percentage */}
          <span
            className="text-lg font-bold tabular-nums"
            style={{ color: activePhaseConfig.color }}
          >
            {Math.round(progress.progress)}%
          </span>
        </motion.div>

        {/* Orbiting phase nodes */}
        {PHASES.map((p, i) => (
          <OrbitNode
            key={p.key}
            phaseConfig={p}
            index={i}
            status={getStatus(p.key)}
            totalNodes={PHASES.length}
          />
        ))}

        {/* Data particles emanating from center */}
        <div className="absolute left-1/2 top-1/2 pointer-events-none">
          {particles.map(p => (
            <DataParticle
              key={p.id}
              delay={p.delay}
              color={activePhaseConfig.color}
              size={p.size}
            />
          ))}
        </div>

        {/* Scanning sweep line */}
        <motion.div
          className="absolute left-1/2 top-1/2 origin-left pointer-events-none"
          style={{
            width: 140,
            height: 2,
            marginTop: -1,
            background: `linear-gradient(90deg, ${activePhaseConfig.color}60, transparent)`,
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
        />
      </div>

      {/* ─── Phase label ───────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={phase}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-2 mb-2"
        >
          <div
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: activePhaseConfig.color }}
          />
          <span
            className="text-sm font-semibold uppercase tracking-wider"
            style={{ color: activePhaseConfig.color }}
          >
            Phase {phaseIndex + 1}: {activePhaseConfig.label}
          </span>
        </motion.div>
      </AnimatePresence>

      {/* ─── Ticker message ────────────────────────────────────────── */}
      <div className="h-6 overflow-hidden mb-5">
        <AnimatePresence mode="wait">
          <motion.p
            key={`${phase}-${messageIndex}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35 }}
            className="text-sm text-gray-400 text-center"
          >
            {dynamicMessages[messageIndex]}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* ─── Phase progress bar (linear) ───────────────────────────── */}
      <div className="w-full max-w-md mb-6">
        <div className="flex items-center justify-between mb-1.5">
          {PHASES.map((p, i) => {
            const status = getStatus(p.key)
            return (
              <div key={p.key} className="flex items-center gap-1">
                <div
                  className="w-1.5 h-1.5 rounded-full transition-colors duration-500"
                  style={{
                    backgroundColor:
                      status === 'complete'
                        ? p.color
                        : status === 'active'
                          ? p.color
                          : 'rgba(75,85,99,0.5)',
                  }}
                />
                <span
                  className="text-[10px] font-medium transition-colors duration-500"
                  style={{
                    color:
                      status === 'active'
                        ? p.color
                        : status === 'complete'
                          ? 'rgba(156,163,175,1)'
                          : 'rgba(75,85,99,0.5)',
                  }}
                >
                  {p.label}
                </span>
              </div>
            )
          })}
        </div>
        <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{
              background: `linear-gradient(90deg, ${PHASES[0].color}, ${activePhaseConfig.color})`,
            }}
            initial={{ width: '0%' }}
            animate={{ width: `${progress.progress}%` }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
          />
        </div>
      </div>

      {/* ─── Concept label & cancel ────────────────────────────────── */}
      <div className="text-center">
        <p className="text-sm text-gray-500 mb-4">
          Analyzing:{' '}
          <span className="text-white font-medium">{concept}</span>
          {genre && <span className="text-gray-600"> · {genre}</span>}
        </p>
        <button
          onClick={onCancel}
          className="group flex items-center gap-2 mx-auto px-4 py-2 text-sm text-gray-500 hover:text-red-400 bg-gray-800/40 hover:bg-red-500/10 border border-gray-700/50 hover:border-red-500/30 rounded-lg transition-all duration-200"
        >
          <X className="w-3.5 h-3.5" />
          Cancel Analysis
        </button>
      </div>
    </motion.div>
  )
}
