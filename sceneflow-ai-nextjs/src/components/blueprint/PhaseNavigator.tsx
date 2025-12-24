'use client'

import React from 'react'
import { 
  Lightbulb, 
  List, 
  Users, 
  Globe, 
  Download,
  Check,
  ChevronRight 
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Phase {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const phases: Phase[] = [
  { id: 'concept', label: 'Concept', icon: Lightbulb },
  { id: 'outline', label: 'Outline', icon: List },
  { id: 'characters', label: 'Characters', icon: Users },
  { id: 'world', label: 'World Building', icon: Globe },
  { id: 'export', label: 'Export', icon: Download },
]

interface PhaseNavigatorProps {
  activePhase: string
  completedPhases: string[]
  onPhaseChange: (phaseId: string) => void
  className?: string
}

export default function PhaseNavigator({
  activePhase,
  completedPhases,
  onPhaseChange,
  className,
}: PhaseNavigatorProps) {
  return (
    <div className={cn(
      "flex items-center gap-1 px-4 py-2 border-b border-white/10 bg-slate-900/50 overflow-x-auto scrollbar-hide",
      className
    )}>
      {phases.map((phase, index) => {
        const isActive = activePhase === phase.id
        const isComplete = completedPhases.includes(phase.id)
        const Icon = phase.icon

        return (
          <React.Fragment key={phase.id}>
            <button
              onClick={() => onPhaseChange(phase.id)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                isActive
                  ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/25"
                  : isComplete
                  ? "text-green-400 hover:bg-white/5"
                  : "text-white/60 hover:bg-white/5 hover:text-white/80"
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{phase.label}</span>
              {isComplete && !isActive && (
                <Check className="w-3 h-3 text-green-400" />
              )}
            </button>
            {index < phases.length - 1 && (
              <ChevronRight className="w-4 h-4 text-white/20 flex-shrink-0" />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

// Export phases for external use
export { phases }
export type { Phase, PhaseNavigatorProps }
