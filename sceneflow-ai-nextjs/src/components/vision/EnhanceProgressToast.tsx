'use client'

import React, { useEffect, useState } from 'react'
import { Sparkles, Camera, ImageIcon, CheckCircle2 } from 'lucide-react'

interface EnhanceProgressToastProps {
  isVisible: boolean
  onDismiss?: () => void
}

type Stage = 'analyzing' | 'building' | 'generating' | 'finalizing' | 'complete'

const stages: { key: Stage; label: string; icon: React.ReactNode; duration: number }[] = [
  { key: 'analyzing', label: 'Analyzing source image...', icon: <Camera className="w-4 h-4" />, duration: 2000 },
  { key: 'building', label: 'Building headshot prompt...', icon: <Sparkles className="w-4 h-4" />, duration: 1500 },
  { key: 'generating', label: 'Generating professional headshot...', icon: <ImageIcon className="w-4 h-4" />, duration: 12000 },
  { key: 'finalizing', label: 'Finalizing enhancement...', icon: <CheckCircle2 className="w-4 h-4" />, duration: 3000 },
]

/**
 * Animated progress toast for the character enhancement feature.
 * Shows milestone stages with animated illustrations during the enhancement process.
 */
export function EnhanceProgressToast({ isVisible, onDismiss }: EnhanceProgressToastProps) {
  const [currentStage, setCurrentStage] = useState<Stage>('analyzing')
  const [progress, setProgress] = useState(0)

  // Progress through stages automatically based on estimated timing
  useEffect(() => {
    if (!isVisible) {
      setCurrentStage('analyzing')
      setProgress(0)
      return
    }

    let elapsed = 0
    const totalDuration = stages.reduce((acc, s) => acc + s.duration, 0)
    
    const interval = setInterval(() => {
      elapsed += 100
      const overallProgress = Math.min((elapsed / totalDuration) * 100, 95)
      setProgress(overallProgress)
      
      // Determine current stage based on elapsed time
      let accumulated = 0
      for (const stage of stages) {
        accumulated += stage.duration
        if (elapsed <= accumulated) {
          setCurrentStage(stage.key)
          break
        }
      }
    }, 100)

    return () => clearInterval(interval)
  }, [isVisible])

  if (!isVisible) return null

  const currentStageInfo = stages.find(s => s.key === currentStage) || stages[0]
  const stageIndex = stages.findIndex(s => s.key === currentStage)

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-right-5 duration-300">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-4 w-80">
        {/* Header with animated icon */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative">
            <div className="w-12 h-12 bg-gradient-to-br from-sf-primary/20 to-sf-accent/20 rounded-xl flex items-center justify-center">
              {/* Animated sparkle effect */}
              <div className="absolute inset-0 rounded-xl overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
              </div>
              <Sparkles className="w-6 h-6 text-sf-primary animate-pulse" />
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
              Enhancing Reference
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Creating professional headshot
            </p>
          </div>
        </div>

        {/* Progress milestones */}
        <div className="space-y-2 mb-4">
          {stages.slice(0, -1).map((stage, index) => {
            const isComplete = stageIndex > index
            const isCurrent = stageIndex === index
            
            return (
              <div 
                key={stage.key}
                className={`flex items-center gap-2 text-xs transition-all duration-300 ${
                  isComplete ? 'text-green-600 dark:text-green-400' : 
                  isCurrent ? 'text-sf-primary font-medium' : 
                  'text-gray-400'
                }`}
              >
                <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isComplete ? 'bg-green-100 dark:bg-green-900/30' :
                  isCurrent ? 'bg-sf-primary/10 animate-pulse' :
                  'bg-gray-100 dark:bg-gray-800'
                }`}>
                  {isComplete ? (
                    <CheckCircle2 className="w-3 h-3" />
                  ) : (
                    <span className={isCurrent ? 'animate-spin' : ''}>
                      {stage.icon}
                    </span>
                  )}
                </div>
                <span>{stage.label}</span>
              </div>
            )
          })}
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-500">
            <span>{currentStageInfo.label}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
            <div 
              className="h-full rounded-full bg-gradient-to-r from-sf-primary to-sf-accent transition-all duration-200 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Subtle hint */}
        <p className="text-[10px] text-gray-400 mt-3 text-center">
          This may take 15-20 seconds
        </p>
      </div>
    </div>
  )
}

// CSS for shimmer animation - add to your global styles or tailwind config
// @keyframes shimmer {
//   0% { transform: translateX(-100%); }
//   100% { transform: translateX(100%); }
// }
// .animate-shimmer { animation: shimmer 2s infinite; }
