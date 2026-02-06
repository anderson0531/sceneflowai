'use client'

import React, { useEffect, useRef, useState, useMemo } from 'react'
import { useOverlayStore, OPERATION_CONFIGS } from '@/store/useOverlayStore'

/**
 * AnimatedProcessingOverlay
 * 
 * A visually engaging processing toast that:
 * - Displays as a floating card in the bottom-right corner
 * - Shows themed animations based on operation type
 * - Displays phase-based progress messages
 * - Maintains user context with transparent backdrop
 * - Blocks interaction with a subtle overlay
 * 
 * @global This is the global reference for consistent processing overlays across SceneFlow
 * 
 * Design Philosophy:
 * - User stays "in context" - they can see their workflow behind the overlay
 * - Toast-style presentation feels less disruptive than full-screen modals
 * - Animations are contained within the card, not full-screen
 */
const AnimatedProcessingOverlay = () => {
  const { 
    isVisible, 
    message, 
    estimatedDuration, 
    startTime, 
    operationType 
  } = useOverlayStore()
  
  const [progress, setProgress] = useState(0)
  const [currentPhaseLabel, setCurrentPhaseLabel] = useState('')
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  
  const config = useMemo(() => OPERATION_CONFIGS[operationType], [operationType])
  
  // Audience seats state for script-review animation
  const [seats, setSeats] = useState<Array<'dim' | 'engaged' | 'critical' | 'standing'>>([])
  
  // Script lines animation state
  const [scriptLines, setScriptLines] = useState<boolean[]>([false, false, false, false, false, false])
  
  // Initialize seats for audience animation
  useEffect(() => {
    if (isVisible && config.animationType === 'audience') {
      setSeats(Array(40).fill('dim'))
    }
    if (isVisible && config.animationType === 'script') {
      setScriptLines([false, false, false, false, false, false])
    }
  }, [isVisible, config.animationType])

  // Main progress and phase update logic
  useEffect(() => {
    if (isVisible && startTime && estimatedDuration > 0) {
      document.body.style.overflow = 'hidden'
      
      intervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime
        const estimatedMs = estimatedDuration * 1000
        const pct = Math.min((elapsed / estimatedMs) * 100, 98)
        setProgress(pct)
        
        // Find current phase based on progress
        const phases = config.phases
        const currentPhase = phases.find((phase, idx) => {
          const nextPhase = phases[idx + 1]
          return pct < nextPhase.progress
        })
        
        if (currentPhase) {
          setCurrentPhaseLabel(currentPhase.label)
        }
        
        // Update script lines based on progress
        if (config.animationType === 'script') {
          const filledLines = Math.floor((pct / 100) * 6)
          setScriptLines(prev => prev.map((_, i) => i < filledLines))
        }
        
        // Update audience seats based on progress (for script-review)
        if (config.animationType === 'audience') {
          setSeats(prevSeats => {
            const newSeats = [...prevSeats]
            
            if (pct < 30) {
              if (Math.random() > 0.92) {
                const idx = Math.floor(Math.random() * newSeats.length)
                newSeats[idx] = newSeats[idx] === 'dim' ? 'engaged' : 'dim'
              }
            } else if (pct < 60) {
              if (Math.random() > 0.9) {
                const idx = Math.floor(Math.random() * newSeats.length)
                newSeats[idx] = 'critical'
              }
            } else if (pct < 85) {
              newSeats.forEach((seat, idx) => {
                if (seat === 'critical' && Math.random() > 0.95) {
                  newSeats[idx] = 'engaged'
                }
              })
            } else {
              if (Math.random() > 0.85) {
                const idx = Math.floor(Math.random() * newSeats.length)
                newSeats[idx] = 'standing'
              }
            }
            
            return newSeats
          })
        }
        
        if (pct >= 98 && intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
      }, 100)
    } else {
      setProgress(0)
      setCurrentPhaseLabel('')
      document.body.style.overflow = 'auto'
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
    
    return () => {
      document.body.style.overflow = 'auto'
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isVisible, startTime, estimatedDuration, config])


  const getProgressBarColor = () => {
    if (config.animationType === 'audience') {
      if (progress < 30) return 'bg-blue-500'
      if (progress < 60) return 'bg-red-500'
      if (progress < 85) return 'bg-purple-500'
      return 'bg-amber-400'
    }
    return 'bg-blue-500'
  }

  const getSeatColor = (state: string) => {
    switch (state) {
      case 'engaged': return 'bg-slate-400'
      case 'critical': return 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]'
      case 'standing': return 'bg-amber-400 -translate-y-1 scale-110 shadow-[0_0_8px_rgba(251,191,36,0.8)]'
      default: return 'bg-slate-700'
    }
  }

  const getScriptDocClass = () => {
    if (progress < 30) return 'animate-[bounce_0.3s_ease-in-out_infinite_alternate]'
    if (progress >= 30 && progress < 85) return 'shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-[shake_0.3s_ease-in-out_infinite]'
    if (progress >= 85) return 'shadow-[0_0_20px_rgba(251,191,36,0.5)] scale-105 bg-amber-50'
    return ''
  }

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Semi-transparent backdrop - allows user to see their content */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" />
      
      {/* Floating toast card - anchored bottom-right */}
      <div className="absolute bottom-6 right-6 w-[380px] max-w-[calc(100vw-48px)]">
        <div className="bg-slate-900/95 backdrop-blur-xl rounded-2xl border border-slate-700/50 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-300">
          {/* Progress indicator strip at top */}
          <div className="h-1 bg-slate-800">
            <div 
              className={`h-full transition-all duration-300 ${getProgressBarColor()}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          
          <div className="p-5">
            {/* Header with title */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                {config.title}
              </h3>
              <span className="text-xs text-slate-400 tabular-nums">
                {Math.round(progress)}%
              </span>
            </div>

            {/* Audience animation for script-review */}
            {config.animationType === 'audience' && (
              <div className="mb-4">
                <div className={`w-16 h-20 bg-white rounded mx-auto mb-4 p-2 transition-all duration-300 relative ${getScriptDocClass()}`}>
                  <div className="h-1 bg-slate-300 rounded mb-1.5" />
                  <div className="h-1 bg-slate-300 rounded mb-1.5" />
                  <div className="h-1 bg-slate-300 rounded w-3/5 mb-1.5" />
                  <div className="h-1 bg-slate-300 rounded mb-1.5" />
                  <div className="h-1 bg-slate-300 rounded" />
                  {progress < 30 && (
                    <div className="absolute -right-0.5 -bottom-0.5 w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse" />
                  )}
                </div>
                <div 
                  className="grid gap-1 mx-auto"
                  style={{ 
                    gridTemplateColumns: 'repeat(10, 1fr)',
                    perspective: '400px',
                    transform: 'rotateX(10deg)',
                    width: '240px'
                  }}
                >
                  {seats.slice(0, 40).map((state, idx) => (
                    <div
                      key={idx}
                      className={`w-2 h-2 rounded-full transition-all duration-500 ease-out ${getSeatColor(state)}`}
                      style={{ transitionDelay: state === 'standing' ? `${Math.random() * 200}ms` : '0ms' }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Script animation */}
            {config.animationType === 'script' && (
              <div className="mb-4 flex justify-center">
                <div className={`w-20 h-24 bg-white rounded p-3 shadow-lg transition-all duration-500 relative ${progress < 70 ? 'animate-pulse' : 'shadow-[0_0_20px_rgba(59,130,246,0.4)]'}`}>
                  {scriptLines.map((filled, i) => (
                    <div 
                      key={i}
                      className={`h-1.5 rounded mb-1.5 transition-all duration-500 ${filled ? 'bg-blue-500' : 'bg-slate-200'}`}
                      style={{ width: i === 2 || i === 5 ? '60%' : '100%', transitionDelay: `${i * 100}ms` }}
                    />
                  ))}
                  {progress < 85 && (
                    <div 
                      className="absolute w-0.5 h-2 bg-blue-500 animate-[blink_1s_ease-in-out_infinite]"
                      style={{ top: `${12 + Math.floor(progress / 18) * 12}px`, left: '12px' }}
                    />
                  )}
                </div>
              </div>
            )}

            {/* Image generation animation */}
            {config.animationType === 'image' && (
              <div className="mb-4 flex justify-center">
                <div className={`w-24 h-20 bg-slate-800 rounded-lg border-2 flex items-center justify-center overflow-hidden relative transition-all duration-500 ${progress > 50 ? 'border-purple-500 shadow-[0_0_15px_rgba(139,92,246,0.3)]' : 'border-slate-600'}`}>
                  <div 
                    className="absolute inset-0 bg-gradient-to-r from-purple-500/30 via-violet-500/30 to-purple-500/30"
                    style={{ clipPath: `inset(0 ${100 - progress}% 0 0)`, transition: 'clip-path 0.3s ease-out' }}
                  />
                  <span className="text-3xl z-10">🖼️</span>
                </div>
              </div>
            )}

            {/* Video generation animation */}
            {config.animationType === 'video' && (
              <div className="mb-4 flex justify-center">
                <div className={`w-28 h-18 bg-slate-800 rounded-lg border-2 flex items-center justify-center overflow-hidden relative transition-all duration-500 ${progress > 50 ? 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'border-slate-600'}`}>
                  <div className="absolute left-0 top-0 bottom-0 w-2 bg-slate-700 flex flex-col justify-around py-1">
                    {[...Array(3)].map((_, i) => <div key={i} className="w-1.5 h-1.5 bg-slate-600 rounded-sm mx-auto" />)}
                  </div>
                  <div className="absolute right-0 top-0 bottom-0 w-2 bg-slate-700 flex flex-col justify-around py-1">
                    {[...Array(3)].map((_, i) => <div key={i} className="w-1.5 h-1.5 bg-slate-600 rounded-sm mx-auto" />)}
                  </div>
                  <div 
                    className="absolute inset-0 bg-gradient-to-r from-red-500/20 via-orange-500/20 to-red-500/20"
                    style={{ clipPath: `inset(0 ${100 - progress}% 0 0)`, transition: 'clip-path 0.3s ease-out' }}
                  />
                  <span className="text-3xl z-10">🎬</span>
                </div>
              </div>
            )}

            {/* Audio generation animation */}
            {config.animationType === 'audio' && (
              <div className="mb-4 flex justify-center items-end gap-0.5 h-14">
                {[...Array(10)].map((_, i) => {
                  const height = 15 + Math.sin((progress / 10) + i * 0.5) * 20 + Math.random() * 8
                  return (
                    <div
                      key={i}
                      className="w-1.5 bg-gradient-to-t from-blue-500 to-cyan-400 rounded-t transition-all duration-150"
                      style={{ height: `${progress > 10 ? height : 4}px` }}
                    />
                  )
                })}
              </div>
            )}
            
            {/* Generic animation */}
            {config.animationType === 'generic' && (
              <div className="mb-4 flex justify-center">
                <div className="relative w-14 h-14">
                  <div className="absolute inset-0 border-3 border-blue-500/30 rounded-full" />
                  <div className="absolute inset-0 border-3 border-transparent border-t-blue-500 rounded-full animate-spin" style={{ animationDuration: '1s' }} />
                  <div className="absolute inset-1 flex items-center justify-center">
                    <span className="text-xl">⚡</span>
                  </div>
                </div>
              </div>
            )}
            
            {/* Current phase label */}
            <div className="text-center">
              <p className="text-sm text-blue-400 font-medium min-h-[20px]">
                {currentPhaseLabel || message}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                ~{Math.max(0, Math.round(estimatedDuration - (progress / 100) * estimatedDuration))}s remaining
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-2px); }
          75% { transform: translateX(2px); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  )
}

export default AnimatedProcessingOverlay
