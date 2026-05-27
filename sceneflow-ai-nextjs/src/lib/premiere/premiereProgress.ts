/**
 * Premiere progress calculator for header strip, sidebar, and next-step banner.
 */

import type { WorkflowStepStatus } from '@/config/nav/workflowGuideConfig'

export interface PremiereProgressInput {
  hasMasterExport: boolean
  screeningCount: number
  hasActiveScreening: boolean
  feedbackOpenCount: number
  hasPublishedJob: boolean
  avgRating: number | null
}

export interface PremiereProgressResult {
  nextStepLabel: string
  nextStepEvent: string | null
  guideStatus: Record<string, WorkflowStepStatus>
  progressItems: Array<{ id: string; label: string; isComplete: boolean; value?: string }>
}

export function calculatePremiereProgress(input: PremiereProgressInput): PremiereProgressResult {
  const {
    hasMasterExport,
    screeningCount,
    hasActiveScreening,
    feedbackOpenCount,
    hasPublishedJob,
    avgRating,
  } = input

  let nextStepLabel = 'Export master from Final Cut'
  let nextStepEvent: string | null = 'premiere:open-final-cut'

  if (hasMasterExport && screeningCount === 0) {
    nextStepLabel = 'Create a screening and share the review link'
    nextStepEvent = 'premiere:create-screening'
  } else if (hasActiveScreening && feedbackOpenCount > 0) {
    nextStepLabel = 'Review screening feedback before publishing'
    nextStepEvent = 'premiere:review-insights'
  } else if (hasActiveScreening && !hasPublishedJob) {
    nextStepLabel = 'Publish to YouTube or export a bundle'
    nextStepEvent = 'premiere:open-publish'
  } else if (hasPublishedJob) {
    nextStepLabel = 'Share your published video'
    nextStepEvent = 'premiere:share'
  }

  const guideStatus: Record<string, WorkflowStepStatus> = {
    'master-ready': hasMasterExport ? 'complete' : 'pending',
    'create-screening': screeningCount > 0 ? 'complete' : hasMasterExport ? 'in-progress' : 'pending',
    'review-insights': hasActiveScreening ? 'in-progress' : 'pending',
    'publish-youtube': hasPublishedJob ? 'complete' : hasActiveScreening ? 'in-progress' : 'pending',
    'export-bundle': hasMasterExport ? 'in-progress' : 'pending',
  }

  return {
    nextStepLabel,
    nextStepEvent,
    guideStatus,
    progressItems: [
      {
        id: 'master-ready',
        label: 'Master ready',
        isComplete: hasMasterExport,
      },
      {
        id: 'screenings',
        label: 'Screenings',
        isComplete: screeningCount > 0,
        value: screeningCount ? String(screeningCount) : undefined,
      },
      {
        id: 'feedback',
        label: 'Feedback reviewed',
        isComplete: feedbackOpenCount === 0 && screeningCount > 0,
        value: avgRating != null ? `${avgRating.toFixed(1)}/5` : undefined,
      },
      {
        id: 'published',
        label: 'Published',
        isComplete: hasPublishedJob,
      },
    ],
  }
}
