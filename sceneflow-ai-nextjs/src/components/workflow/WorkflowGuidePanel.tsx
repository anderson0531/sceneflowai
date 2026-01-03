'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { 
  ChevronUp, 
  ChevronDown, 
  ChevronRight,
  CheckCircle2, 
  Circle,
  ClipboardCheck,
  Sparkles,
  FileText,
  Users,
  Box,
  Volume2,
  Clapperboard,
  Image,
  Play,
  RefreshCw,
  Video,
  Lightbulb,
  Palette,
  ArrowRight,
} from 'lucide-react'
import { 
  type WorkflowGroup, 
  type WorkflowStep,
  type WorkflowStepStatus,
  getWorkflowGroupsForPhase,
  getTotalSteps,
  getCompletedSteps,
} from '@/config/nav/workflowGuideConfig'
import { type WorkflowPhase } from '@/config/nav/sidebarConfig'

// Icon map for dynamic rendering
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  FileText,
  Users,
  Box,
  Volume2,
  Clapperboard,
  Image,
  Play,
  RefreshCw,
  Video,
  Lightbulb,
  Palette,
  ArrowRight,
  ClipboardCheck,
}

// =============================================================================
// WORKFLOW STEP ITEM
// =============================================================================

interface WorkflowStepItemProps {
  step: WorkflowStep
  status: WorkflowStepStatus
  onAction: (step: WorkflowStep) => void
  onToggleComplete: (stepId: string) => void
}

function WorkflowStepItem({ step, status, onAction, onToggleComplete }: WorkflowStepItemProps) {
  const isComplete = status === 'complete'
  
  return (
    <div className="flex items-center gap-2 py-1.5 pl-6 group">
      {/* Checkbox */}
      <button
        onClick={() => onToggleComplete(step.id)}
        className={cn(
          'w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-colors',
          isComplete 
            ? 'bg-green-500 text-white' 
            : 'bg-slate-700 hover:bg-slate-600 text-slate-500'
        )}
      >
        {isComplete ? (
          <CheckCircle2 className="w-2.5 h-2.5" />
        ) : (
          <Circle className="w-2 h-2" />
        )}
      </button>
      
      {/* Label & Action */}
      <div className="flex-1 min-w-0">
        <button
          onClick={() => step.actionEventName && onAction(step)}
          disabled={!step.actionEventName}
          className={cn(
            'text-xs text-left w-full transition-colors truncate',
            isComplete 
              ? 'text-green-400/70 line-through' 
              : step.actionEventName
                ? 'text-slate-300 hover:text-cyan-400 cursor-pointer'
                : 'text-slate-400 cursor-default'
          )}
        >
          {step.label}
        </button>
      </div>
      
      {/* Action indicator */}
      {step.actionEventName && !isComplete && (
        <ChevronRight className="w-3 h-3 text-slate-600 group-hover:text-cyan-400 transition-colors opacity-0 group-hover:opacity-100" />
      )}
    </div>
  )
}

// =============================================================================
// WORKFLOW GROUP SECTION
// =============================================================================

interface WorkflowGroupSectionProps {
  group: WorkflowGroup
  stepStatus: Record<string, WorkflowStepStatus>
  isExpanded: boolean
  onToggleExpand: () => void
  onStepAction: (step: WorkflowStep) => void
  onToggleStepComplete: (stepId: string) => void
}

function WorkflowGroupSection({
  group,
  stepStatus,
  isExpanded,
  onToggleExpand,
  onStepAction,
  onToggleStepComplete,
}: WorkflowGroupSectionProps) {
  const IconComponent = iconMap[group.icon] || ClipboardCheck
  
  // Calculate group completion
  const completedSteps = group.steps.filter(s => stepStatus[s.id] === 'complete').length
  const totalSteps = group.steps.length
  const isGroupComplete = completedSteps === totalSteps
  const hasProgress = completedSteps > 0
  
  return (
    <div className={cn(
      'rounded-lg border transition-all duration-200',
      isGroupComplete 
        ? 'bg-green-500/5 border-green-500/20' 
        : hasProgress
          ? 'bg-amber-500/5 border-amber-500/20'
          : 'bg-slate-800/30 border-slate-700/50'
    )}>
      {/* Group Header */}
      <button
        onClick={onToggleExpand}
        className="w-full flex items-center gap-2 p-2 hover:bg-slate-700/30 rounded-lg transition-colors"
      >
        <IconComponent className={cn('w-4 h-4 flex-shrink-0', group.iconColor)} />
        <span className={cn(
          'text-xs font-medium flex-1 text-left truncate',
          isGroupComplete ? 'text-green-400' : 'text-slate-200'
        )}>
          {group.title}
        </span>
        <span className={cn(
          'text-[10px] px-1.5 py-0.5 rounded-full',
          isGroupComplete 
            ? 'bg-green-500/20 text-green-400'
            : hasProgress
              ? 'bg-amber-500/20 text-amber-400'
              : 'bg-slate-700 text-slate-500'
        )}>
          {completedSteps}/{totalSteps}
        </span>
        {isExpanded ? (
          <ChevronUp className="w-3 h-3 text-slate-500" />
        ) : (
          <ChevronDown className="w-3 h-3 text-slate-500" />
        )}
      </button>
      
      {/* Steps List */}
      {isExpanded && (
        <div className="pb-2 border-t border-slate-700/50 mt-1">
          {group.steps.map(step => (
            <WorkflowStepItem
              key={step.id}
              step={step}
              status={stepStatus[step.id] || 'pending'}
              onAction={onStepAction}
              onToggleComplete={onToggleStepComplete}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// =============================================================================
// WORKFLOW GUIDE PANEL
// =============================================================================

interface WorkflowGuidePanelProps {
  phase: WorkflowPhase
  isOpen: boolean
  onToggle: () => void
  externalStatus?: Record<string, WorkflowStepStatus>
  className?: string
}

export function WorkflowGuidePanel({ 
  phase, 
  isOpen, 
  onToggle,
  externalStatus = {},
  className 
}: WorkflowGuidePanelProps) {
  // Get groups for current phase
  const groups = useMemo(() => getWorkflowGroupsForPhase(phase), [phase])
  
  // Local status for steps
  const [localStatus, setLocalStatus] = useState<Record<string, WorkflowStepStatus>>({})
  
  // Track which groups are expanded
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    // Initialize with first group expanded, others based on their config
    const initial: Record<string, boolean> = {}
    groups.forEach((group, index) => {
      initial[group.id] = index === 0 ? true : !(group.collapsed ?? false)
    })
    return initial
  })
  
  // Merge external and local status
  const stepStatus = useMemo(() => {
    const merged: Record<string, WorkflowStepStatus> = {}
    groups.forEach(group => {
      group.steps.forEach(step => {
        merged[step.id] = externalStatus[step.id] || localStatus[step.id] || 'pending'
      })
    })
    return merged
  }, [groups, externalStatus, localStatus])
  
  // Calculate overall progress
  const totalSteps = getTotalSteps(groups)
  const completedSteps = getCompletedSteps(groups, stepStatus)
  const progressPercent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0
  
  // Handle step action
  const handleStepAction = useCallback((step: WorkflowStep) => {
    if (step.actionEventName) {
      window.dispatchEvent(new CustomEvent(step.actionEventName))
    }
    if (step.actionHref) {
      window.location.href = step.actionHref
    }
  }, [])
  
  // Toggle step complete
  const handleToggleStepComplete = useCallback((stepId: string) => {
    setLocalStatus(prev => ({
      ...prev,
      [stepId]: prev[stepId] === 'complete' ? 'pending' : 'complete'
    }))
  }, [])
  
  // Toggle group expansion
  const handleToggleGroup = useCallback((groupId: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }))
  }, [])
  
  // Don't render if no groups
  if (groups.length === 0) return null
  
  // Phase display name
  const phaseDisplayName: Record<WorkflowPhase, string> = {
    blueprint: 'Blueprint',
    production: 'Production',
    'final-cut': 'Final Cut',
    premiere: 'Premiere',
    dashboard: 'Dashboard',
    settings: 'Settings',
  }
  
  return (
    <div className={cn('p-4 border-b border-gray-200 dark:border-gray-700', className)}>
      {/* Header */}
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
      >
        <div className="flex items-center gap-2">
          <ClipboardCheck className="w-3.5 h-3.5 text-amber-500" />
          <span>Workflow Guide</span>
          <span className="text-[10px] font-normal normal-case text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">
            {phaseDisplayName[phase]}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {completedSteps > 0 && (
            <span className={cn(
              'text-[10px] font-medium',
              progressPercent === 100 ? 'text-green-500' : 'text-cyan-500'
            )}>
              {completedSteps}/{totalSteps}
            </span>
          )}
          {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </div>
      </button>
      
      {/* Groups */}
      {isOpen && (
        <div className="space-y-2">
          {groups.map(group => (
            <WorkflowGroupSection
              key={group.id}
              group={group}
              stepStatus={stepStatus}
              isExpanded={expandedGroups[group.id] ?? true}
              onToggleExpand={() => handleToggleGroup(group.id)}
              onStepAction={handleStepAction}
              onToggleStepComplete={handleToggleStepComplete}
            />
          ))}
          
          {/* Progress Bar */}
          <div className="mt-4 pt-3 border-t border-slate-700/50">
            <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1.5">
              <span>Overall Progress</span>
              <span className="font-medium">{progressPercent}%</span>
            </div>
            <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
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
          
          {/* All Complete Message */}
          {progressPercent === 100 && (
            <div className="flex items-center gap-2 mt-3 p-2 bg-green-500/10 border border-green-500/20 rounded-lg">
              <Sparkles className="w-3.5 h-3.5 text-green-400" />
              <span className="text-xs text-green-400 font-medium">
                Workflow complete! Ready to proceed.
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default WorkflowGuidePanel
