'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import {
  ArrowRight,
  FileText,
  Volume2,
  Compass,
  Frame,
  Film,
  Clapperboard,
  Sparkles,
  CheckCircle2,
  Lightbulb,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'

// ============================================================================
// Types
// ============================================================================

export interface WorkflowState {
  hasScript: boolean
  hasAudio: boolean
  hasDirection: boolean
  hasFrame: boolean
  hasSegments: boolean
  hasVideoSegments: boolean
  hasRender: boolean
  /** Current active workflow tab */
  activeTab?: 'dialogueAction' | 'callAction'
  /** Audience resonance score */
  score?: number
}

interface NextStepAction {
  label: string
  description: string
  icon: React.ReactNode
  /** Tab to switch to */
  targetTab?: 'dialogueAction' | 'callAction'
  /** Action to trigger */
  actionId?: string
  accentColor: string
}

// ============================================================================
// Step Detection Logic
// ============================================================================

function getNextStep(state: WorkflowState): NextStepAction | null {
  // All done
  if (state.hasRender) {
    return {
      label: 'Scene Complete — Move to Next Scene',
      description: 'This scene is fully rendered. Navigate to the next scene or continue to Final Cut.',
      icon: <CheckCircle2 className="w-4 h-4" />,
      accentColor: 'emerald',
    }
  }

  // Script tab steps
  if (!state.hasScript) {
    return {
      label: 'Review & Edit Script',
      description: 'Review the AI-generated script. Use the Script Editor to refine dialogue and narration.',
      icon: <FileText className="w-4 h-4" />,
      targetTab: 'dialogueAction',
      actionId: 'edit-script',
      accentColor: 'green',
    }
  }

  if (!state.hasAudio) {
    return {
      label: 'Generate Audio',
      description: 'Generate narration, dialogue, music, and sound effects for this scene.',
      icon: <Volume2 className="w-4 h-4" />,
      targetTab: 'dialogueAction',
      actionId: 'generate-audio',
      accentColor: 'blue',
    }
  }

  // Action tab steps
  if (!state.hasDirection) {
    return {
      label: 'Generate Scene Direction',
      description: 'Scene direction provides camera angles, lighting, and atmosphere for better keyframe generation.',
      icon: <Compass className="w-4 h-4" />,
      targetTab: 'callAction',
      actionId: 'generate-direction',
      accentColor: 'cyan',
    }
  }

  if (!state.hasFrame) {
    return {
      label: 'Build Storyboard Keyframes',
      description: 'Generate start and end keyframe images for each segment. This enables Frame-to-Video generation.',
      icon: <Frame className="w-4 h-4" />,
      targetTab: 'callAction',
      actionId: 'generate-keyframes',
      accentColor: 'purple',
    }
  }

  if (!state.hasVideoSegments) {
    return {
      label: 'Generate Video Segments',
      description: 'Generate AI video for each segment using Frame-to-Video (FTV) mode for best results.',
      icon: <Film className="w-4 h-4" />,
      targetTab: 'callAction',
      actionId: 'generate-video',
      accentColor: 'amber',
    }
  }

  if (!state.hasRender) {
    return {
      label: 'Render Scene',
      description: 'Open the Scene Production Mixer to combine segments, add audio, and render your final scene.',
      icon: <Clapperboard className="w-4 h-4" />,
      targetTab: 'callAction',
      actionId: 'render-scene',
      accentColor: 'emerald',
    }
  }

  return null
}

// ============================================================================
// Color Maps
// ============================================================================

const ACCENT_COLORS: Record<string, { bg: string; border: string; text: string; button: string }> = {
  green:   { bg: 'bg-green-900/15',   border: 'border-green-700/30',   text: 'text-green-300',   button: 'bg-green-600 hover:bg-green-700' },
  blue:    { bg: 'bg-blue-900/15',    border: 'border-blue-700/30',    text: 'text-blue-300',    button: 'bg-blue-600 hover:bg-blue-700' },
  cyan:    { bg: 'bg-cyan-900/15',    border: 'border-cyan-700/30',    text: 'text-cyan-300',    button: 'bg-cyan-600 hover:bg-cyan-700' },
  purple:  { bg: 'bg-purple-900/15',  border: 'border-purple-700/30',  text: 'text-purple-300',  button: 'bg-purple-600 hover:bg-purple-700' },
  amber:   { bg: 'bg-amber-900/15',   border: 'border-amber-700/30',   text: 'text-amber-300',   button: 'bg-amber-600 hover:bg-amber-700' },
  emerald: { bg: 'bg-emerald-900/15', border: 'border-emerald-700/30', text: 'text-emerald-300', button: 'bg-emerald-600 hover:bg-emerald-700' },
}

// ============================================================================
// Component
// ============================================================================

interface WorkflowNextStepBannerProps {
  workflowState: WorkflowState
  /** Called when user clicks the action button */
  onAction?: (actionId: string, targetTab?: string) => void
  /** Called to navigate to next scene */
  onNextScene?: () => void
  className?: string
}

export function WorkflowNextStepBanner({
  workflowState,
  onAction,
  onNextScene,
  className,
}: WorkflowNextStepBannerProps) {
  const nextStep = getNextStep(workflowState)
  if (!nextStep) return null

  const colors = ACCENT_COLORS[nextStep.accentColor] || ACCENT_COLORS.purple
  const isComplete = workflowState.hasRender

  return (
    <div className={cn(
      "flex items-center gap-3 px-4 py-2.5 rounded-lg border transition-colors",
      colors.bg, colors.border,
      className
    )}>
      <div className={cn("flex-shrink-0", colors.text)}>
        {nextStep.icon}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn("text-sm font-medium", colors.text)}>
            {nextStep.label}
          </span>
        </div>
        <p className="text-xs text-gray-400 mt-0.5 hidden sm:block">
          {nextStep.description}
        </p>
      </div>

      {isComplete && onNextScene ? (
        <Button
          size="sm"
          onClick={onNextScene}
          className={cn("text-white flex-shrink-0", colors.button)}
        >
          Next Scene
          <ArrowRight className="w-3.5 h-3.5 ml-1" />
        </Button>
      ) : nextStep.actionId && onAction ? (
        <Button
          size="sm"
          onClick={() => onAction(nextStep.actionId!, nextStep.targetTab)}
          className={cn("text-white flex-shrink-0", colors.button)}
        >
          {nextStep.label.split(' ')[0]}
          <ArrowRight className="w-3.5 h-3.5 ml-1" />
        </Button>
      ) : null}
    </div>
  )
}

// ============================================================================
// Inline Tip Component — for contextual help in sections
// ============================================================================

interface InlineTipProps {
  tip: string
  className?: string
}

export function InlineTip({ tip, className }: InlineTipProps) {
  return (
    <div className={cn(
      "flex items-start gap-2 px-3 py-2 bg-gray-800/40 rounded-lg border border-gray-700/30",
      className
    )}>
      <Lightbulb className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
      <p className="text-[11px] text-gray-400 leading-relaxed">{tip}</p>
    </div>
  )
}
