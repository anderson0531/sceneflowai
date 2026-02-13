'use client'

import React, { useEffect, useRef, useState, useMemo } from 'react'
import { useOverlayStore, OPERATION_CONFIGS } from '@/store/useOverlayStore'

/**
 * AnimatedProcessingOverlay
 * 
 * A visually engaging processing overlay that:
 * - Shows themed animations based on operation type
 * - Displays phase-based progress messages
 * - Includes audience simulation for script reviews
 * - Blocks user interaction during processing
 * 
 * @global This is the global reference for consistent processing overlays across SceneFlow
 * 
 * Usage:
 * - Include once in your app layout
 * - Use useProcessWithOverlay hook to trigger with operation type
 * 
 * Example:
 * ```tsx
 * const { execute } = useProcessWithOverlay()
 * await execute(async () => {
 *   // API call here
 * }, { 
 *   message: 'Analyzing script...', 
 *   estimatedDuration: 25, 
 *   operationType: 'script-review' 
 * })
 * ```
 */

// Helper function to format time - shows minutes when > 60s
function formatTime(seconds: number): string {
  if (seconds < 60) return `~${seconds}s`
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (mins >= 60) {
    const hours = Math.floor(mins / 60)
    const remainingMins = mins % 60
    return remainingMins > 0 ? `~${hours}h ${remainingMins}m` : `~${hours}h`
  }
  return secs > 0 ? `~${mins}m ${secs}s` : `~${mins}m`
}

const AnimatedProcessingOverlay = () => {
  const { 
    isVisible, 
    message, 
    estimatedDuration, 
    startTime, 
    operationType,
    customStatus,
    estimatedRemainingSeconds,
    actualProgress
  } = useOverlayStore()
  
  const [progress, setProgress] = useState(0)
  const [currentPhaseLabel, setCurrentPhaseLabel] = useState('')
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  
  const config = useMemo(() => OPERATION_CONFIGS[operationType], [operationType])
  
  // Audience seats state for script-review animation
  const [seats, setSeats] = useState<Array<'dim' | 'engaged' | 'critical' | 'standing'>>([])
  
  // Script lines animation state
  const [scriptLines, setScriptLines] = useState<boolean[]>([false, false, false, false, false, false])
  
  // Initialize seats for audience animation
  useEffect(() => {
    if (isVisible && config.animationType === 'audience') {
      setSeats(Array(60).fill('dim'))
    }
    if (isVisible && config.animationType === 'script') {
      setScriptLines([false, false, false, false, false, false])
    }
    if (isVisible && config.animationType === 'series') {
      setSeats(Array(60).fill('dim')) // Reuse seats for episode indicators
    }
  }, [isVisible, config.animationType])

  // Main progress and phase update logic
  useEffect(() => {
    if (isVisible && startTime && estimatedDuration > 0) {
      document.body.style.overflow = 'hidden'
      
      intervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime
        const estimatedMs = estimatedDuration * 1000
        // Asymptotic progress: linear to 90% during estimate, then
        // smoothly approach 99% on overruns (never looks stuck).
        // At 2x estimate: ~95.5%, 3x: ~97.8%, 4x: ~98.6%
        let pct: number
        const ratio = elapsed / estimatedMs
        if (ratio <= 1) {
          pct = ratio * 90
        } else {
          const overrun = ratio - 1
          pct = 90 + 9 * (1 - Math.exp(-overrun * 1.5))
        }
        pct = Math.min(pct, 99)
        setProgress(pct)
        
        // Find current phase based on progress
        const phases = config.phases
        const currentPhase = phases.find((phase, idx) => {
          const nextPhase = phases[idx + 1]
          if (!nextPhase) return true
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
              // Drafting phase - random engagement
              if (Math.random() > 0.92) {
                const idx = Math.floor(Math.random() * newSeats.length)
                newSeats[idx] = newSeats[idx] === 'dim' ? 'engaged' : 'dim'
              }
            } else if (pct < 60) {
              // Feedback phase - some critical
              if (Math.random() > 0.9) {
                const idx = Math.floor(Math.random() * newSeats.length)
                newSeats[idx] = 'critical'
              }
            } else if (pct < 85) {
              // Optimization phase - critical seats recover
              newSeats.forEach((seat, idx) => {
                if (seat === 'critical' && Math.random() > 0.95) {
                  newSeats[idx] = 'engaged'
                }
              })
            } else {
              // Resonance phase - standing ovation
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

  // Canvas animation for particles
  useEffect(() => {
    if (!isVisible || !canvasRef.current) return
    
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    
    const particles: Array<{
      x: number
      y: number
      vx: number
      vy: number
      life: number
      color: string
      size: number
    }> = []
    
    const animate = () => {
      if (!ctx || !canvas) return
      
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      // Add new particles occasionally
      if (Math.random() > 0.85 && particles.length < 50) {
        const colors = config.animationType === 'audience' 
          ? ['#fbbf24', '#ef4444', '#3b82f6', '#a855f7']
          : config.animationType === 'script'
          ? ['#3b82f6', '#60a5fa', '#93c5fd']
          : config.animationType === 'image'
          ? ['#8b5cf6', '#a855f7', '#c084fc']
          : config.animationType === 'video'
          ? ['#ef4444', '#f87171', '#fca5a5']
          : ['#3b82f6', '#8b5cf6', '#06b6d4']
        
        particles.push({
          x: Math.random() * canvas.width,
          y: canvas.height + 10,
          vx: (Math.random() - 0.5) * 2,
          vy: -Math.random() * 2 - 0.5,
          life: 1,
          color: colors[Math.floor(Math.random() * colors.length)],
          size: Math.random() * 3 + 2
        })
      }
      
      // Update and draw particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.x += p.vx
        p.y += p.vy
        p.life -= 0.008
        
        if (p.life <= 0 || p.y < -10) {
          particles.splice(i, 1)
          continue
        }
        
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2)
        ctx.fillStyle = p.color
        ctx.globalAlpha = p.life * 0.6
        ctx.fill()
        ctx.globalAlpha = 1
      }
      
      animationFrameRef.current = requestAnimationFrame(animate)
    }
    
    animate()
    
    return () => {
      window.removeEventListener('resize', resizeCanvas)
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [isVisible, config.animationType])

  if (!isVisible) return null

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
      case 'critical': return 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]'
      case 'standing': return 'bg-amber-400 -translate-y-2 scale-125 shadow-[0_0_12px_rgba(251,191,36,0.8)]'
      default: return 'bg-slate-700'
    }
  }

  const getScriptDocClass = () => {
    if (progress < 30) return 'animate-[bounce_0.3s_ease-in-out_infinite_alternate]'
    if (progress >= 30 && progress < 85) return 'shadow-[0_0_20px_rgba(239,68,68,0.4)] animate-[shake_0.3s_ease-in-out_infinite]'
    if (progress >= 85) return 'shadow-[0_0_30px_rgba(251,191,36,0.6)] scale-110 bg-amber-50'
    return ''
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
      {/* Particle canvas background */}
      <canvas 
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />
      
      <div className="relative z-10 flex flex-col items-center max-w-2xl w-full px-6">
        {/* Title */}
        <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">
          {config.title}
        </h2>
        
        {/* Audience animation for script-review */}
        {config.animationType === 'audience' && (
          <div className="mb-8 mt-6">
            {/* Script document */}
            <div className={`
              w-24 h-32 bg-white rounded-md mx-auto mb-8 p-3 
              transition-all duration-300 relative
              ${getScriptDocClass()}
            `}>
              <div className="h-1.5 bg-slate-300 rounded mb-2" />
              <div className="h-1.5 bg-slate-300 rounded mb-2" />
              <div className="h-1.5 bg-slate-300 rounded w-3/5 mb-2" />
              <div className="h-1.5 bg-slate-300 rounded mb-2" />
              <div className="h-1.5 bg-slate-300 rounded" />
              
              {/* Writing indicator */}
              {progress < 30 && (
                <div className="absolute -right-1 -bottom-1 w-4 h-4 bg-blue-500 rounded-full animate-pulse" />
              )}
            </div>
            
            {/* Audience seats grid */}
            <div 
              className="grid gap-2 mx-auto"
              style={{ 
                gridTemplateColumns: 'repeat(15, 1fr)',
                perspective: '600px',
                transform: 'rotateX(15deg)',
                width: '420px'
              }}
            >
              {seats.map((state, idx) => (
                <div
                  key={idx}
                  className={`
                    w-3 h-3 rounded-full transition-all duration-500 ease-out
                    ${getSeatColor(state)}
                  `}
                  style={{
                    transitionDelay: state === 'standing' ? `${Math.random() * 200}ms` : '0ms'
                  }}
                />
              ))}
            </div>
          </div>
        )}
        
        {/* Script animation */}
        {config.animationType === 'script' && (
          <div className="mb-8 mt-6 flex justify-center">
            <div className={`
              w-28 h-36 bg-white rounded-md p-4 shadow-xl
              transition-all duration-500 relative
              ${progress < 70 ? 'animate-pulse' : 'shadow-[0_0_25px_rgba(59,130,246,0.5)]'}
            `}>
              {scriptLines.map((filled, i) => (
                <div 
                  key={i}
                  className={`
                    h-2 rounded mb-2 transition-all duration-500
                    ${filled ? 'bg-blue-500' : 'bg-slate-200'}
                  `}
                  style={{ 
                    width: i === 2 || i === 5 ? '60%' : '100%',
                    transitionDelay: `${i * 100}ms`
                  }}
                />
              ))}
              
              {/* Cursor indicator */}
              {progress < 85 && (
                <div 
                  className="absolute w-0.5 h-3 bg-blue-500 animate-[blink_1s_ease-in-out_infinite]"
                  style={{
                    top: `${16 + Math.floor(progress / 15) * 16}px`,
                    left: '16px'
                  }}
                />
              )}
            </div>
          </div>
        )}
        
        {/* Image generation animation */}
        {config.animationType === 'image' && (
          <div className="mb-8 mt-6 flex justify-center">
            <div className={`
              w-36 h-28 bg-slate-800 rounded-lg border-2 
              flex items-center justify-center overflow-hidden relative
              transition-all duration-500
              ${progress > 50 ? 'border-purple-500 shadow-[0_0_20px_rgba(139,92,246,0.4)]' : 'border-slate-600'}
            `}>
              {/* Reveal effect */}
              <div 
                className="absolute inset-0 bg-gradient-to-r from-purple-500/30 via-violet-500/30 to-purple-500/30"
                style={{
                  clipPath: `inset(0 ${100 - progress}% 0 0)`,
                  transition: 'clip-path 0.3s ease-out'
                }}
              />
              <span className="text-4xl z-10">🖼️</span>
            </div>
          </div>
        )}
        
        {/* Video generation animation */}
        {config.animationType === 'video' && (
          <div className="mb-8 mt-6 flex justify-center">
            <div className={`
              w-40 h-24 bg-slate-800 rounded-lg border-2 
              flex items-center justify-center overflow-hidden relative
              transition-all duration-500
              ${progress > 50 ? 'border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)]' : 'border-slate-600'}
            `}>
              {/* Film strip effect */}
              <div className="absolute left-0 top-0 bottom-0 w-3 bg-slate-700 flex flex-col justify-around py-1">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="w-2 h-2 bg-slate-600 rounded-sm mx-auto" />
                ))}
              </div>
              <div className="absolute right-0 top-0 bottom-0 w-3 bg-slate-700 flex flex-col justify-around py-1">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="w-2 h-2 bg-slate-600 rounded-sm mx-auto" />
                ))}
              </div>
              
              {/* Progress reveal */}
              <div 
                className="absolute inset-0 bg-gradient-to-r from-red-500/20 via-orange-500/20 to-red-500/20"
                style={{
                  clipPath: `inset(0 ${100 - progress}% 0 0)`,
                  transition: 'clip-path 0.3s ease-out'
                }}
              />
              <span className="text-4xl z-10">🎬</span>
            </div>
          </div>
        )}
        
        {/* Audio generation animation */}
        {config.animationType === 'audio' && (
          <div className="mb-8 mt-6 flex justify-center items-end gap-1 h-20">
            {[...Array(12)].map((_, i) => {
              const height = 20 + Math.sin((progress / 10) + i * 0.5) * 30 + Math.random() * 10
              return (
                <div
                  key={i}
                  className="w-2 bg-gradient-to-t from-blue-500 to-cyan-400 rounded-t transition-all duration-150"
                  style={{ 
                    height: `${progress > 10 ? height : 5}px`,
                  }}
                />
              )
            })}
          </div>
        )}
        
        {/* Series analysis animation - stacked episodes like a film library */}
        {config.animationType === 'series' && (
          <div className="mb-8 mt-6 flex justify-center">
            <div className="relative">
              {/* Film reel / library shelf */}
              <div className="flex items-end gap-1.5 px-4 py-3 bg-slate-800/50 rounded-xl border border-slate-700">
                {[...Array(8)].map((_, i) => {
                  const isAnalyzed = progress > (i + 1) * 10
                  const isCurrent = progress > i * 10 && progress <= (i + 1) * 10
                  return (
                    <div
                      key={i}
                      className={`
                        w-8 rounded-sm transition-all duration-500
                        ${isAnalyzed 
                          ? 'bg-gradient-to-t from-cyan-600 to-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.5)]' 
                          : isCurrent 
                            ? 'bg-gradient-to-t from-amber-600 to-amber-400 animate-pulse shadow-[0_0_12px_rgba(251,191,36,0.5)]'
                            : 'bg-slate-600'}
                      `}
                      style={{ 
                        height: `${40 + (i % 3) * 10}px`,
                        transitionDelay: `${i * 50}ms`
                      }}
                    >
                      <div className="h-full w-full flex flex-col justify-end p-0.5">
                        <div className="h-0.5 bg-white/30 rounded" />
                        <div className="h-0.5 bg-white/30 rounded mt-0.5" />
                      </div>
                    </div>
                  )
                })}
              </div>
              
              {/* Scanning line effect */}
              <div 
                className="absolute top-0 w-1 h-full bg-gradient-to-b from-transparent via-cyan-400 to-transparent opacity-80"
                style={{ 
                  left: `${16 + (progress / 100) * (8 * 38)}px`,
                  transition: 'left 0.3s ease-out'
                }}
              />
              
              {/* Episode counter */}
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-slate-400">
                Analyzing episodes...
              </div>
            </div>
          </div>
        )}
        
        {/* Repair animation - wrench/gear fixing */}
        {config.animationType === 'repair' && (
          <div className="mb-8 mt-6 flex justify-center">
            <div className="relative w-32 h-32">
              {/* Main gear */}
              <div 
                className={`
                  absolute inset-4 border-4 rounded-full transition-all duration-300
                  ${progress > 50 
                    ? 'border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.4)]' 
                    : 'border-amber-500 shadow-[0_0_20px_rgba(251,191,36,0.4)]'}
                `}
                style={{ 
                  transform: `rotate(${progress * 3.6}deg)`,
                  transition: 'transform 0.1s linear'
                }}
              >
                {/* Gear teeth */}
                {[...Array(8)].map((_, i) => (
                  <div
                    key={i}
                    className={`
                      absolute w-3 h-2 -top-1 left-1/2 -translate-x-1/2 rounded-t
                      ${progress > 50 ? 'bg-emerald-500' : 'bg-amber-500'}
                    `}
                    style={{ transform: `rotate(${i * 45}deg) translateY(-24px)` }}
                  />
                ))}
              </div>
              
              {/* Wrench icon */}
              <div 
                className="absolute inset-0 flex items-center justify-center"
                style={{ 
                  transform: progress < 75 ? `rotate(${Math.sin(progress / 5) * 15}deg)` : 'rotate(0deg)',
                  transition: 'transform 0.2s ease-out'
                }}
              >
                <span className="text-4xl">🔧</span>
              </div>
              
              {/* Checkmark when complete */}
              {progress >= 90 && (
                <div className="absolute -right-2 -bottom-2 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg animate-[bounce_0.5s_ease-out]">
                  <span className="text-white text-lg">✓</span>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Generic animation */}
        {config.animationType === 'generic' && (
          <div className="mb-8 mt-6 flex justify-center">
            <div className="relative w-20 h-20">
              <div className="absolute inset-0 border-4 border-blue-500/30 rounded-full" />
              <div 
                className="absolute inset-0 border-4 border-transparent border-t-blue-500 rounded-full animate-spin"
                style={{ animationDuration: '1s' }}
              />
              <div className="absolute inset-2 flex items-center justify-center">
                <span className="text-2xl">⚡</span>
              </div>
            </div>
          </div>
        )}
        
        {/* Current phase label - prefer custom status from SSE */}
        <div className="text-center mb-6">
          <p className="text-lg text-blue-400 font-medium min-h-[28px]">
            {customStatus || currentPhaseLabel || message}
          </p>
          <p className="text-sm text-slate-400 mt-2">
            Please do not close this window
          </p>
        </div>
        
        {/* Progress bar - use actual progress if available */}
        <div className="w-full max-w-md">
          <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-300 ${getProgressBarColor()}`}
              style={{ width: `${actualProgress > 0 ? actualProgress : progress}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-sm text-slate-400">
            <span>{Math.round(actualProgress > 0 ? actualProgress : progress)}%</span>
            <span>
              {estimatedRemainingSeconds !== null && estimatedRemainingSeconds > 0
                ? `${formatTime(estimatedRemainingSeconds)} remaining`
                : `${formatTime(Math.max(0, Math.round(estimatedDuration - (progress / 100) * estimatedDuration)))} remaining`
              }
            </span>
          </div>
        </div>
      </div>
      
      {/* Bottom progress strip */}
      <div 
        className={`absolute bottom-0 left-0 h-1 transition-all duration-200 ${getProgressBarColor()}`}
        style={{ width: `${actualProgress > 0 ? actualProgress : progress}%` }}
      />
      
      {/* CSS animations */}
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
