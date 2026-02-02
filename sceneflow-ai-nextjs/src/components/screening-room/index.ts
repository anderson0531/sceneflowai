/**
 * Screening Room Components
 * 
 * Privacy-first behavioral analytics for film screenings.
 * 
 * Components:
 * - AudiencePlayer: Video player with biometric sensing and reaction tracking
 * - ConsentModal: Privacy consent and demographics collection
 * - EmojiReactionBar: Timeline emoji reactions
 * - ScreeningRoomDashboard: Main dashboard with tabbed screenings
 * - CreateScreeningModal: Modal for creating new screenings with share links
 * - ABTestModal: A/B test configuration
 * - InsightsView: Analytics visualization with heatmaps
 * - ExternalUpload: Drag-and-drop video upload for Final Cut tab
 * 
 * Hooks:
 * @see /src/hooks/useMicroBehaviorTracking.ts - Mouse jitter, volume, fullscreen tracking
 * @see /src/hooks/useEmotionTracker.ts - MediaPipe facial analysis
 * 
 * Types:
 * @see /src/lib/types/behavioralAnalytics.ts for type definitions
 * 
 * Services:
 * @see /src/services/BehavioralAnalyticsService.ts for Vercel Blob storage
 */

export { AudiencePlayer } from './AudiencePlayer'
export { ConsentModal } from './ConsentModal'
export { EmojiReactionBar, InlineEmojiReaction } from './EmojiReactionBar'
export { ScreeningRoomDashboard } from './ScreeningRoomDashboard'
export { CreateScreeningModal } from './CreateScreeningModal'
export { ABTestModal } from './ABTestModal'
export { InsightsView } from './InsightsView'
export { ExternalUpload } from './ExternalUpload'
