import type { NotificationType } from '@/models/Notification'

export type FeedbackSource = 'blueprint' | 'screening'

export interface FeedbackNotificationInput {
  userId: string
  projectId: string
  source: FeedbackSource
  reviewer: string
  excerpt: string
  feedbackId: string
  screeningId?: string
}

export function feedbackExcerpt(text: string, max = 180): string {
  const trimmed = text.replace(/\s+/g, ' ').trim()
  if (trimmed.length <= max) return trimmed
  return `${trimmed.slice(0, max - 1)}…`
}

export function companionOpenPath(input: {
  type: NotificationType | string
  projectId?: string | null
  metadata?: Record<string, unknown> | null
}): string {
  const source = input.metadata?.source
  const tab =
    input.type === 'feedback' || source === 'blueprint' || source === 'screening'
      ? 'feedback'
      : 'inbox'
  const params = new URLSearchParams({ companion: tab })
  if (input.projectId) params.set('project', input.projectId)
  return `/dashboard?${params.toString()}`
}

export function buildFeedbackNotification(input: FeedbackNotificationInput): {
  userId: string
  projectId: string
  type: NotificationType
  title: string
  message: string
  metadata: Record<string, unknown>
} {
  const reviewer = input.reviewer.trim() || 'Reviewer'
  const excerpt = feedbackExcerpt(input.excerpt)
  const title = input.source === 'blueprint' ? 'Blueprint feedback' : 'Screening Room feedback'
  const message = excerpt ? `${reviewer}: ${excerpt}` : `${reviewer} left feedback`
  return {
    userId: input.userId,
    projectId: input.projectId,
    type: 'feedback',
    title,
    message,
    metadata: {
      source: input.source,
      feedbackId: input.feedbackId,
      excerpt,
      ...(input.screeningId ? { screeningId: input.screeningId } : {}),
    },
  }
}
