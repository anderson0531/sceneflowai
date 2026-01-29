/**
 * Premiere Components
 * 
 * Components for the Premiere phase - test screenings, analytics, and publishing:
 * - ScreeningManager: Create and manage test screenings
 * - ScreeningCard: Display screening status and metrics
 * - AnalyticsDashboard: View engagement analytics
 * - PublishingHub: Publish to various platforms
 * - FeedbackPanel: View timestamped comments
 */

export { ScreeningManager } from './ScreeningManager'
export { ScreeningCard } from './ScreeningCard'
export { AnalyticsDashboard } from './AnalyticsDashboard'
export { PublishingHub } from './PublishingHub'
export { FeedbackPanel } from './FeedbackPanel'

// Re-export types
export type {
  ScreeningSession,
  ScreeningViewer,
  TimestampedComment,
  ScreeningReaction,
  ScreeningAnalytics,
  PublishJob,
  PublishDestination
} from '@/lib/types/finalCut'
