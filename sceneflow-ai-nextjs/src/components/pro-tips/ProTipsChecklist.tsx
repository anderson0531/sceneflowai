'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { 
  ChevronUp, 
  ChevronDown, 
  CheckCircle2, 
  Circle,
  ChevronRight,
  Sparkles,
  ClipboardList,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { type ProTip, type ProTipStatus, getProTipsForPhase } from '@/config/nav/proTipsConfig'
import { type WorkflowPhase } from '@/config/nav/sidebarConfig'

interface ProTipItemProps {
  tip: ProTip
  status: ProTipStatus
  onAction: (tip: ProTip) => void
  onToggleComplete: (tipId: string) => void
}

function ProTipItem({ tip, status, onAction, onToggleComplete }: ProTipItemProps) {
  const isComplete = status === 'complete'
  const isInProgress = status === 'in-progress'
  
  return (
    <div 
      className={cn(
        'group rounded-lg border transition-all duration-200',
        isComplete 
          ? 'bg-green-500/5 border-green-500/20' 
          : isInProgress
            ? 'bg-amber-500/5 border-amber-500/20'
            : 'bg-slate-800/30 border-slate-700/50 hover:border-slate-600/50'
      )}
    >
      <div className="flex items-start gap-2 p-2">
        {/* Checkbox */}
        <button
          onClick={() => onToggleComplete(tip.id)}
          className={cn(
            'mt-0.5 w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-colors',
            isComplete 
              ? 'bg-green-500 text-white' 
              : 'bg-slate-700 hover:bg-slate-600 text-slate-400'
          )}
        >
          {isComplete ? (
            <CheckCircle2 className="w-3 h-3" />
          ) : (
            <Circle className="w-2.5 h-2.5" />
          )}
        </button>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className={cn(
            'text-xs font-medium transition-colors',
            isComplete ? 'text-green-400 line-through opacity-70' : 'text-slate-200'
          )}>
            {tip.title}
          </div>
          {tip.description && !isComplete && (
            <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">
              {tip.description}
            </div>
          )}
        </div>
        
        {/* Action button */}
        {tip.actionLabel && !isComplete && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onAction(tip)}
            className="h-5 px-1.5 text-[10px] text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            {tip.actionLabel}
            <ChevronRight className="w-2.5 h-2.5 ml-0.5" />
          </Button>
        )}
      </div>
    </div>
  )
}

interface ProTipsChecklistProps {
  phase: WorkflowPhase
  isOpen: boolean
  onToggle: () => void
  // Optional: external status overrides (e.g., from project metadata)
  externalStatus?: Record<string, ProTipStatus>
  className?: string
}

export function ProTipsChecklist({ 
  phase, 
  isOpen, 
  onToggle,
  externalStatus = {},
  className 
}: ProTipsChecklistProps) {
  // Local status for tips (in real implementation, this would persist)
  const [localStatus, setLocalStatus] = useState<Record<string, ProTipStatus>>({})
  
  // Get tips for current phase
  const tips = useMemo(() => getProTipsForPhase(phase), [phase])
  
  // Merge external and local status
  const tipStatus = useMemo(() => {
    const merged: Record<string, ProTipStatus> = {}
    tips.forEach(tip => {
      merged[tip.id] = externalStatus[tip.id] || localStatus[tip.id] || 'pending'
    })
    return merged
  }, [tips, externalStatus, localStatus])
  
  // Calculate progress
  const completedCount = useMemo(() => 
    tips.filter(tip => tipStatus[tip.id] === 'complete').length,
    [tips, tipStatus]
  )
  const progressPercent = tips.length > 0 ? Math.round((completedCount / tips.length) * 100) : 0
  
  // Handle action button click
  const handleAction = useCallback((tip: ProTip) => {
    if (tip.actionEventName) {
      const event = new CustomEvent(tip.actionEventName)
      window.dispatchEvent(event)
    }
    if (tip.actionHref) {
      window.location.href = tip.actionHref
    }
    // Mark as in-progress
    setLocalStatus(prev => ({ ...prev, [tip.id]: 'in-progress' }))
  }, [])
  
  // Toggle complete status
  const handleToggleComplete = useCallback((tipId: string) => {
    setLocalStatus(prev => ({
      ...prev,
      [tipId]: prev[tipId] === 'complete' ? 'pending' : 'complete'
    }))
  }, [])
  
  // Don't render if no tips for this phase
  if (tips.length === 0) return null
  
  // Get phase display name
  const phaseDisplayName = {
    blueprint: 'Blueprint',
    production: 'Production',
    'final-cut': 'Final Cut',
    premiere: 'Premiere',
    dashboard: 'Dashboard',
    settings: 'Settings',
  }[phase]
  
  return (
    <div className={cn('p-4 border-b border-gray-200 dark:border-gray-700', className)}>
      {/* Header */}
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
      >
        <div className="flex items-center gap-1.5">
          <ClipboardList className="w-3.5 h-3.5 text-amber-500" />
          <span>Pro Tips</span>
          <span className="text-[10px] font-normal normal-case text-slate-500">
            {phaseDisplayName}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {completedCount > 0 && (
            <span className="text-[10px] font-normal text-green-500">
              {completedCount}/{tips.length}
            </span>
          )}
          {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </div>
      </button>
      
      {/* Checklist */}
      {isOpen && (
        <div className="space-y-1.5">
          {tips.map(tip => (
            <ProTipItem
              key={tip.id}
              tip={tip}
              status={tipStatus[tip.id]}
              onAction={handleAction}
              onToggleComplete={handleToggleComplete}
            />
          ))}
          
          {/* Progress bar */}
          <div className="mt-3 pt-2 border-t border-slate-700/50">
            <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
              <span>Progress</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
              <div 
                className={cn(
                  'h-full transition-all duration-500 rounded-full',
                  progressPercent === 100 
                    ? 'bg-green-500' 
                    : progressPercent > 50 
                      ? 'bg-amber-500' 
                      : 'bg-cyan-500'
                )}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
          
          {/* All complete message */}
          {progressPercent === 100 && (
            <div className="flex items-center gap-1.5 mt-2 p-2 bg-green-500/10 border border-green-500/20 rounded-lg">
              <Sparkles className="w-3.5 h-3.5 text-green-400" />
              <span className="text-[10px] text-green-400 font-medium">
                All tips complete! Ready to proceed.
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ProTipsChecklist
