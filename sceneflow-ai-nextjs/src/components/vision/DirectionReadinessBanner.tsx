'use client'

import React from 'react'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Compass,
  ImageIcon,
  Loader2,
  MapPin,
  Target,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import type { ScriptDirectionReadiness } from '@/lib/utils/contentHash'

interface DirectionReadinessBannerProps {
  directionReadiness: ScriptDirectionReadiness
  audienceReviewed: boolean
  isUpdatingAllDirections?: boolean
  onUpdateAllDirections?: () => void
  onReviewAudience?: () => void
  className?: string
}

type StepId = 'review' | 'directions' | 'references' | 'frames'

const STEPS: { id: StepId; label: string; icon: React.ReactNode }[] = [
  { id: 'review', label: 'Review', icon: <Target className="w-3 h-3" /> },
  { id: 'directions', label: 'Directions', icon: <Compass className="w-3 h-3" /> },
  { id: 'references', label: 'References', icon: <MapPin className="w-3 h-3" /> },
  { id: 'frames', label: 'Frames', icon: <ImageIcon className="w-3 h-3" /> },
]

function getActiveStep(
  audienceReviewed: boolean,
  readiness: ScriptDirectionReadiness
): StepId {
  if (!audienceReviewed) return 'review'
  if (!readiness.ready) return 'directions'
  return 'references'
}

function WorkflowStepper({
  audienceReviewed,
  readiness,
}: {
  audienceReviewed: boolean
  readiness: ScriptDirectionReadiness
}) {
  const activeStep = getActiveStep(audienceReviewed, readiness)

  return (
    <div className="flex flex-wrap items-center gap-1 text-[10px]">
      {STEPS.map((step, idx) => {
        const isComplete =
          (step.id === 'review' && audienceReviewed) ||
          (step.id === 'directions' && readiness.ready) ||
          (step.id === 'references' && readiness.ready && audienceReviewed) ||
          (step.id === 'frames' && readiness.ready && audienceReviewed)
        const isActive = step.id === activeStep && !isComplete

        return (
          <React.Fragment key={step.id}>
            {idx > 0 && <ArrowRight className="w-2.5 h-2.5 text-gray-500 shrink-0" />}
            <span
              className={cn(
                'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border',
                isActive
                  ? 'border-amber-400/50 bg-amber-500/15 text-amber-200'
                  : isComplete
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                    : 'border-gray-600/40 bg-gray-800/40 text-gray-500'
              )}
            >
              {step.icon}
              {step.label}
            </span>
          </React.Fragment>
        )
      })}
    </div>
  )
}

export function DirectionReadinessBanner({
  directionReadiness,
  audienceReviewed,
  isUpdatingAllDirections = false,
  onUpdateAllDirections,
  onReviewAudience,
  className,
}: DirectionReadinessBannerProps) {
  if (directionReadiness.total === 0) return null

  if (directionReadiness.ready) {
    return (
      <div
        className={cn(
          'flex items-start gap-3 px-4 py-3 rounded-lg border border-emerald-700/30 bg-emerald-900/15 shrink-0',
          className
        )}
      >
        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0 space-y-2">
          <p className="text-sm text-emerald-200 font-medium">
            Scene directions are up to date
          </p>
          <p className="text-xs text-gray-400">
            All {directionReadiness.total} scenes have current direction. Location, cast, and prop
            references will use accurate location and atmosphere details.
          </p>
          <WorkflowStepper audienceReviewed={audienceReviewed} readiness={directionReadiness} />
        </div>
      </div>
    )
  }

  const { needsUpdate, total, missing, stale } = directionReadiness
  const detailParts: string[] = []
  if (missing > 0) detailParts.push(`${missing} missing`)
  if (stale > 0) detailParts.push(`${stale} outdated`)

  return (
    <div
      className={cn(
        'flex flex-col gap-3 px-4 py-3 rounded-lg border border-amber-700/40 bg-amber-900/15 shrink-0',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0 space-y-2">
          <p className="text-sm text-amber-200 font-medium">
            {needsUpdate} of {total} scene{total !== 1 ? 's' : ''} need updated Scene Direction
            {detailParts.length > 0 ? ` (${detailParts.join(', ')})` : ''}
          </p>
          <p className="text-xs text-gray-400 leading-relaxed">
            Locations, props, and frames are generated from Scene Direction. References created
            before directions are updated may use incomplete location and atmosphere details.
          </p>
          <WorkflowStepper audienceReviewed={audienceReviewed} readiness={directionReadiness} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 pl-7">
        {onUpdateAllDirections && (
          <Button
            size="sm"
            onClick={onUpdateAllDirections}
            disabled={isUpdatingAllDirections}
            className="bg-amber-600 hover:bg-amber-700 text-white border-0"
          >
            {isUpdatingAllDirections ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Updating directions...
              </>
            ) : (
              <>
                <Compass className="w-3.5 h-3.5 mr-1.5" />
                Update All Directions
              </>
            )}
          </Button>
        )}
        {!audienceReviewed && onReviewAudience && (
          <Button
            size="sm"
            variant="outline"
            onClick={onReviewAudience}
            className="border-purple-500/40 text-purple-300 hover:bg-purple-500/10"
          >
            <Target className="w-3.5 h-3.5 mr-1.5" />
            Review with Audience Resonance
          </Button>
        )}
      </div>
    </div>
  )
}
