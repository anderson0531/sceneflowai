'use client'

import React from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ProjectStats {
  sceneCount: number
  castCount: number
  durationMinutes: number
  estimatedCredits: number
}

interface ProjectStatsPanelProps {
  stats: ProjectStats
  isOpen: boolean
  onToggle: () => void
  className?: string
}

/**
 * Project Stats Panel - Mini dashboard showing key project metrics
 * Used in the global sidebar for Production and later workflow phases
 */
export function ProjectStatsPanel({
  stats,
  isOpen,
  onToggle,
  className,
}: ProjectStatsPanelProps) {
  return (
    <div className={cn('p-4 border-b border-gray-200 dark:border-gray-700', className)}>
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
      >
        <span>Project Stats</span>
        {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      {isOpen && (
        <div className="grid grid-cols-2 gap-2">
          {/* Scenes */}
          <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 dark:from-purple-500/20 dark:to-purple-600/10 rounded-lg p-2.5 border border-purple-200/50 dark:border-purple-500/20 text-center">
            <div className="text-xl font-bold text-purple-600 dark:text-purple-400">
              {stats.sceneCount}
            </div>
            <div className="text-xs text-purple-500/80 dark:text-purple-400/70 uppercase tracking-wide font-medium">
              Scenes
            </div>
          </div>
          {/* Cast */}
          <div className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 dark:from-cyan-500/20 dark:to-cyan-600/10 rounded-lg p-2.5 border border-cyan-200/50 dark:border-cyan-500/20 text-center">
            <div className="text-xl font-bold text-cyan-600 dark:text-cyan-400">
              {stats.castCount}
            </div>
            <div className="text-xs text-cyan-500/80 dark:text-cyan-400/70 uppercase tracking-wide font-medium">
              Cast
            </div>
          </div>
          {/* Duration */}
          <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 dark:from-green-500/20 dark:to-green-600/10 rounded-lg p-2.5 border border-green-200/50 dark:border-green-500/20 text-center">
            <div className="text-xl font-bold text-green-600 dark:text-green-400">
              {stats.durationMinutes}m
            </div>
            <div className="text-xs text-green-500/80 dark:text-green-400/70 uppercase tracking-wide font-medium">
              Duration
            </div>
          </div>
          {/* Credits */}
          <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 dark:from-amber-500/20 dark:to-amber-600/10 rounded-lg p-2.5 border border-amber-200/50 dark:border-amber-500/20 text-center">
            <div className="text-xl font-bold text-amber-600 dark:text-amber-400">
              {stats.estimatedCredits}
            </div>
            <div className="text-xs text-amber-500/80 dark:text-amber-400/70 uppercase tracking-wide font-medium">
              Est. Credits
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProjectStatsPanel
