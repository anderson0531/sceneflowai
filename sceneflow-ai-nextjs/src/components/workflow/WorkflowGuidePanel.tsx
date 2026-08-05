'use client'

import { useTranslations } from 'next-intl'

import React, { useState, useCallback, useMemo } from 'react'
import { cn } from '@/lib/utils'
import {
  ChevronUp,
  ChevronDown,
  ChevronRight,
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
  Target,
} from 'lucide-react'
import {
  type WorkflowGroup,
  type WorkflowStep,
  getWorkflowGroupsForPhase,
} from '@/config/nav/workflowGuideConfig'
import { type WorkflowPhase } from '@/config/nav/sidebarConfig'
import { STUDIO_DISPLAY_NAMES } from '@/constants/studioDisplayNames'

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
  Target,
  Sparkles,
}

function guideLabel(
  t: ReturnType<typeof useTranslations>,
  key: string | undefined,
  fallback: string
): string {
  if (key && t.has(key)) return t(key)
  return fallback
}

// =============================================================================
// OPTIONAL ACTION ROW
// =============================================================================

interface WorkflowStepItemProps {
  step: WorkflowStep
  onAction: (step: WorkflowStep) => void
}

function WorkflowStepItem({ step, onAction }: WorkflowStepItemProps) {
  const t = useTranslations('blueprint.workflowGuide')
  const label = guideLabel(t, step.labelKey, step.label)
  const canAct = Boolean(step.actionEventName || step.actionHref)

  return (
    <div className="flex items-center gap-2 py-1.5 pl-6 group">
      <div className="flex-1 min-w-0">
        <button
          type="button"
          onClick={() => canAct && onAction(step)}
          disabled={!canAct}
          className={cn(
            'text-xs text-left w-full transition-colors truncate',
            canAct
              ? 'text-slate-300 hover:text-cyan-400 cursor-pointer'
              : 'text-slate-400 cursor-default'
          )}
        >
          {label}
        </button>
      </div>
      {canAct && (
        <ChevronRight className="w-3 h-3 text-slate-600 group-hover:text-cyan-400 transition-colors opacity-0 group-hover:opacity-100" />
      )}
    </div>
  )
}

// =============================================================================
// INTENTION GROUP
// =============================================================================

interface WorkflowGroupSectionProps {
  group: WorkflowGroup
  isExpanded: boolean
  onToggleExpand: () => void
  onStepAction: (step: WorkflowStep) => void
}

function WorkflowGroupSection({
  group,
  isExpanded,
  onToggleExpand,
  onStepAction,
}: WorkflowGroupSectionProps) {
  const t = useTranslations('blueprint.workflowGuide')
  const IconComponent = iconMap[group.icon] || ClipboardCheck
  const title = guideLabel(t, group.titleKey, group.title)

  return (
    <div className="rounded-lg border bg-slate-800/30 border-slate-700/50 transition-all duration-200">
      <button
        type="button"
        onClick={onToggleExpand}
        className="w-full flex items-center gap-2 p-2 hover:bg-slate-700/30 rounded-lg transition-colors"
      >
        <IconComponent className={cn('w-4 h-4 flex-shrink-0', group.iconColor)} />
        <span className="text-xs font-medium flex-1 text-left truncate text-slate-200">
          {title}
        </span>
        {isExpanded ? (
          <ChevronUp className="w-3 h-3 text-slate-500" />
        ) : (
          <ChevronDown className="w-3 h-3 text-slate-500" />
        )}
      </button>

      {isExpanded && (
        <div className="pb-2 border-t border-slate-700/50 mt-1">
          {group.steps.map((step) => (
            <WorkflowStepItem key={step.id} step={step} onAction={onStepAction} />
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
  /** Kept for callers; Blueprint Guide no longer presents completion state. */
  externalStatus?: Record<string, string>
  className?: string
}

export function WorkflowGuidePanel({
  phase,
  isOpen,
  onToggle,
  className,
}: WorkflowGuidePanelProps) {
  const t = useTranslations('blueprint.workflowGuide')
  const groups = useMemo(() => getWorkflowGroupsForPhase(phase), [phase])

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    groups.forEach((group, index) => {
      initial[group.id] = index === 0 ? true : !(group.collapsed ?? false)
    })
    return initial
  })

  const handleStepAction = useCallback((step: WorkflowStep) => {
    if (step.actionEventName) {
      window.dispatchEvent(new CustomEvent(step.actionEventName))
    }
    if (step.actionHref) {
      window.location.href = step.actionHref
    }
  }, [])

  const handleToggleGroup = useCallback((groupId: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }))
  }, [])

  if (groups.length === 0) return null

  const phaseDisplayName: Record<WorkflowPhase, string> = {
    blueprint: STUDIO_DISPLAY_NAMES.blueprint,
    production: STUDIO_DISPLAY_NAMES.production,
    'screening-room': 'Screening Room',
    'final-cut': 'Screening Room',
    premiere: 'Screening Room',
    dashboard: 'Dashboard',
    settings: 'Settings',
  }

  // Blueprint guide uses catalog chrome; other phases keep English fallbacks
  // until their catalogs are wired (production still uses raw labels).
  const title = phase === 'blueprint' && t.has('title') ? t('title') : 'Guide'
  const optionalHint =
    phase === 'blueprint' && t.has('optionalHint') ? t('optionalHint') : null

  return (
    <div className={cn('p-4 border-b border-gray-200 dark:border-gray-700', className)}>
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center justify-between w-full text-xs font-semibold text-gray-500 dark:text-gray-400 tracking-wider mb-1 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
      >
        <div className="flex items-center gap-2">
          <ClipboardCheck className="w-3.5 h-3.5 text-amber-500" />
          <span>{title}</span>
          <span className="text-[10px] font-normal text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">
            {phaseDisplayName[phase]}
          </span>
        </div>
        {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {isOpen && optionalHint && (
        <p className="text-[10px] text-slate-500 mb-3 pl-6">{optionalHint}</p>
      )}

      {isOpen && (
        <div className={cn('space-y-2', !optionalHint && 'mt-2')}>
          {groups.map((group) => (
            <WorkflowGroupSection
              key={group.id}
              group={group}
              isExpanded={expandedGroups[group.id] ?? true}
              onToggleExpand={() => handleToggleGroup(group.id)}
              onStepAction={handleStepAction}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default WorkflowGuidePanel
