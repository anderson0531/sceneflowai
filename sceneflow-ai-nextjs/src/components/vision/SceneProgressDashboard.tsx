'use client'

import React, { useMemo, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import {
  FileText,
  Compass,
  Frame,
  Clapperboard,
  CheckCircle2,
  Circle,
  PlayCircle,
  Volume2,
  Image,
  Film,
  ChevronRight,
  Sparkles,
  ArrowRight,
} from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

// ============================================================================
// Types
// ============================================================================

export interface SceneProgressItem {
  id: string
  sceneNumber: number
  name: string
  /** Has script content (narration/dialogue/description) */
  hasScript: boolean
  /** Has scene direction generated */
  hasDirection: boolean
  /** Has scene image / keyframe */
  hasFrame: boolean
  /** Has segments with active assets (video/image) */
  hasCallAction: boolean
  /** Has audio generated */
  hasAudio: boolean
  /** Has rendered scene video/animatic */
  hasRender: boolean
  /** Overall scene status */
  status: 'not-started' | 'in-progress' | 'complete'
  /** Audience resonance score (0-100) */
  score?: number
}

interface SceneProgressDashboardProps {
  scenes: SceneProgressItem[]
  selectedSceneId?: string
  onSelectScene: (sceneId: string) => void
  className?: string
}

// ============================================================================
// Helpers
// ============================================================================

const STEPS = [
  { key: 'hasScript', label: 'Script', icon: FileText, color: 'green' },
  { key: 'hasAudio', label: 'Audio', icon: Volume2, color: 'blue' },
  { key: 'hasDirection', label: 'Direction', icon: Compass, color: 'cyan' },
  { key: 'hasFrame', label: 'Keyframes', icon: Frame, color: 'purple' },
  { key: 'hasCallAction', label: 'Video', icon: Film, color: 'amber' },
  { key: 'hasRender', label: 'Render', icon: Clapperboard, color: 'emerald' },
] as const

const COLOR_MAP: Record<string, { dot: string; bg: string; text: string; ring: string }> = {
  green:   { dot: 'bg-green-400',   bg: 'bg-green-500/20',   text: 'text-green-400',   ring: 'ring-green-500/30' },
  blue:    { dot: 'bg-blue-400',    bg: 'bg-blue-500/20',    text: 'text-blue-400',    ring: 'ring-blue-500/30' },
  cyan:    { dot: 'bg-cyan-400',    bg: 'bg-cyan-500/20',    text: 'text-cyan-400',    ring: 'ring-cyan-500/30' },
  purple:  { dot: 'bg-purple-400',  bg: 'bg-purple-500/20',  text: 'text-purple-400',  ring: 'ring-purple-500/30' },
  amber:   { dot: 'bg-amber-400',   bg: 'bg-amber-500/20',   text: 'text-amber-400',   ring: 'ring-amber-500/30' },
  emerald: { dot: 'bg-emerald-400', bg: 'bg-emerald-500/20', text: 'text-emerald-400', ring: 'ring-emerald-500/30' },
}

function getScoreColor(score: number) {
  if (score >= 85) return 'text-green-400'
  if (score >= 70) return 'text-amber-400'
  return 'text-red-400'
}

// ============================================================================
// Component
// ============================================================================

export function SceneProgressDashboard({
  scenes,
  selectedSceneId,
  onSelectScene,
  className,
}: SceneProgressDashboardProps) {
  // Overall project progress
  const projectProgress = useMemo(() => {
    if (scenes.length === 0) return { completed: 0, total: 0, percentage: 0 }
    const totalSteps = scenes.length * STEPS.length
    let completedSteps = 0
    scenes.forEach(scene => {
      STEPS.forEach(step => {
        if (scene[step.key as keyof SceneProgressItem]) completedSteps++
      })
    })
    return {
      completed: completedSteps,
      total: totalSteps,
      percentage: Math.round((completedSteps / totalSteps) * 100),
    }
  }, [scenes])

  const scenesComplete = useMemo(() =>
    scenes.filter(s => s.status === 'complete').length,
    [scenes]
  )

  // Find the next recommended scene to work on
  const nextScene = useMemo(() => {
    // First incomplete scene
    return scenes.find(s => s.status !== 'complete')
  }, [scenes])

  if (scenes.length === 0) return null

  return (
    <div className={cn(
      "bg-gray-900/80 border border-gray-700/50 rounded-xl overflow-hidden",
      className
    )}>
      {/* Header with overall progress */}
      <div className="px-4 py-3 border-b border-gray-800/50">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-semibold text-white">Production Progress</span>
            <span className="text-xs text-gray-500">
              {scenesComplete}/{scenes.length} scenes complete
            </span>
          </div>
          <span className="text-xs font-medium text-purple-400">
            {projectProgress.percentage}%
          </span>
        </div>
        
        {/* Overall progress bar */}
        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-purple-500 to-cyan-500"
            initial={{ width: 0 }}
            animate={{ width: `${projectProgress.percentage}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Step legend header */}
      <div className="px-4 py-2 border-b border-gray-800/30">
        <div className="flex items-center">
          <div className="w-16 text-[10px] text-gray-500 font-medium">Scene</div>
          <div className="flex-1 grid grid-cols-6 gap-1">
            {STEPS.map(step => {
              const colors = COLOR_MAP[step.color]
              return (
                <div key={step.key} className="flex items-center justify-center gap-1">
                  <step.icon className={cn("w-3 h-3", colors.text)} />
                  <span className="text-[9px] text-gray-500 hidden sm:inline">{step.label}</span>
                </div>
              )
            })}
          </div>
          <div className="w-10 text-center text-[10px] text-gray-500">Score</div>
        </div>
      </div>

      {/* Scene rows */}
      <div className="max-h-[240px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
        {scenes.map((scene) => {
          const isSelected = scene.id === selectedSceneId
          const isComplete = scene.status === 'complete'
          const isNext = nextScene?.id === scene.id

          return (
            <button
              key={scene.id}
              onClick={() => onSelectScene(scene.id)}
              className={cn(
                "w-full flex items-center px-4 py-1.5 transition-all duration-150 border-l-2",
                isSelected
                  ? "bg-purple-900/30 border-l-purple-500"
                  : isNext
                  ? "bg-cyan-900/10 border-l-cyan-500/50 hover:bg-cyan-900/20"
                  : "border-l-transparent hover:bg-gray-800/40",
              )}
            >
              {/* Scene number */}
              <div className="w-16 flex items-center gap-1.5">
                <span className={cn(
                  "text-xs font-bold px-1.5 py-0.5 rounded",
                  isSelected
                    ? "bg-purple-500 text-white"
                    : isComplete
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-gray-800 text-gray-400"
                )}>
                  S{scene.sceneNumber}
                </span>
                {isComplete && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                {isNext && !isComplete && !isSelected && (
                  <ArrowRight className="w-3 h-3 text-cyan-400 animate-pulse" />
                )}
              </div>

              {/* Step completion dots */}
              <div className="flex-1 grid grid-cols-6 gap-1">
                <TooltipProvider delayDuration={200}>
                  {STEPS.map(step => {
                    const completed = !!scene[step.key as keyof SceneProgressItem]
                    const colors = COLOR_MAP[step.color]
                    return (
                      <Tooltip key={step.key}>
                        <TooltipTrigger asChild>
                          <div className="flex items-center justify-center">
                            <div className={cn(
                              "w-4 h-4 rounded-sm flex items-center justify-center transition-all",
                              completed
                                ? `${colors.bg} ring-1 ${colors.ring}`
                                : "bg-gray-800/60"
                            )}>
                              {completed ? (
                                <CheckCircle2 className={cn("w-2.5 h-2.5", colors.text)} />
                              ) : (
                                <Circle className="w-2.5 h-2.5 text-gray-700" />
                              )}
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent
                          side="top"
                          className="bg-gray-900 text-white border border-gray-700 text-xs"
                        >
                          Scene {scene.sceneNumber}: {step.label} {completed ? '✓' : '—'}
                        </TooltipContent>
                      </Tooltip>
                    )
                  })}
                </TooltipProvider>
              </div>

              {/* Score */}
              <div className="w-10 text-center">
                {scene.score !== undefined ? (
                  <span className={cn("text-xs font-bold", getScoreColor(scene.score))}>
                    {scene.score}
                  </span>
                ) : (
                  <span className="text-[10px] text-gray-600">—</span>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Next step suggestion */}
      {nextScene && (
        <div
          className="px-4 py-2 border-t border-gray-800/50 bg-cyan-900/10 cursor-pointer hover:bg-cyan-900/20 transition-colors"
          onClick={() => onSelectScene(nextScene.id)}
        >
          <div className="flex items-center gap-2 text-xs">
            <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-cyan-300">
              Next: <span className="font-medium text-white">Scene {nextScene.sceneNumber}</span>
              {' — '}
              {!nextScene.hasScript ? 'Review script' :
               !nextScene.hasAudio ? 'Generate audio' :
               !nextScene.hasDirection ? 'Generate direction' :
               !nextScene.hasFrame ? 'Generate keyframes' :
               !nextScene.hasCallAction ? 'Generate video segments' :
               'Render scene'}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
