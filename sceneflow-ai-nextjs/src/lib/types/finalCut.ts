/**
 * Final Cut & Premiere Types
 * 
 * Types for the post-production workflow phases:
 * - Final Cut: Timeline assembly, transitions, overlays, upscaling
 * - Premiere: Test screenings, analytics, publishing
 * 
 * NOTE: Scene-level ProductionStream is defined in scene-production/types.ts
 * This file defines project-level FinalCutStream for multi-scene assembly.
 * 
 * @see /SCENEFLOW_AI_DESIGN_DOCUMENT.md for architecture decisions
 */

// Re-export scene-level types we depend on
export type { 
  ProductionStream as SceneProductionStream,
  ProductionStreamStatus as SceneProductionStreamStatus,
  ProductionStreamType,
  AnimaticRenderSettings,
  VideoRenderSettings,
  ProductionRenderSettings
} from '@/components/vision/scene-production/types'

// =============================================================================
// FINAL CUT PREVIEW SELECTION (preview-only refactor)
// =============================================================================
//
// The Final Cut route is a preview viewer over Production renders — it no
// longer manages an assembly timeline with overlays / transitions / audio
// mixing. Persistence is reduced to a small `FinalCutSelection` blob on the
// project metadata. Per-scene clips are computed at render time from the
// canonical Production state, so the viewer always reflects the latest
// finished renders without duplicating any production data on the project.

/**
 * The Final Cut viewer's persisted selection (project-level).
 * Lives at `project.metadata.finalCut`.
 *
 * Per-scene overrides are sparse: only scenes that the user explicitly
 * pinned to a non-default version appear in the map.
 */
export interface FinalCutSelection {
  /** Output kind to preview ("video" = full-motion, "animatic" = Ken Burns stills) */
  format: ProductionFormat
  /** Language code (e.g. "en", "th"). Falls back to project default if unavailable. */
  language: ProductionLanguage
  /** Sparse map of sourceSceneId → version override for that scene. */
  perSceneOverrides?: Record<string, FinalCutSceneOverride>
}

export interface FinalCutSceneOverride {
  /** Pin a specific Production stream version (1-based). */
  streamVersion?: number
}

/**
 * One resolved scene clip in the assembled preview.
 * Computed from script scenes + Production state + FinalCutSelection.
 */
export interface FinalCutSceneClip {
  /** Source scene id (matches script scene + Production state key). */
  sceneId: string
  /** 1-based scene number from the script. */
  sceneNumber: number
  /** Display heading from the script ("INT. COFFEE SHOP - DAY"). */
  heading?: string
  /** Composition start time, seconds. */
  startTime: number
  /** Composition end time, seconds. */
  endTime: number
  /** Composition duration, seconds. */
  duration: number
  /** Resolved playable URL for this scene; null when no rendered stream is ready. */
  url: string | null
  /** Resolved stream version, when available. */
  streamVersion?: number
  /** Available versions (1-based) for the active (format, language). */
  availableVersions: number[]
  /** Coarse status for badge display in the UI. */
  status: 'ready' | 'pending' | 'missing'
}

// =============================================================================
// FINAL CUT STREAM TYPES (LEGACY — Premiere consumers + back-compat only)
// =============================================================================

/**
 * Supported languages for multi-language production
 */
export type ProductionLanguage = 
  // Western European
  | 'en'      // English
  | 'fr'      // French
  | 'de'      // German
  | 'es'      // Spanish
  | 'pt'      // Portuguese
  | 'it'      // Italian
  | 'nl'      // Dutch
  | 'ca'      // Catalan
  | 'gl'      // Galician
  | 'lb'      // Luxembourgish
  | 'ga'      // Irish
  | 'cy'      // Welsh
  | 'is'      // Icelandic
  // Northern European
  | 'da'      // Danish
  | 'fi'      // Finnish
  | 'no'      // Norwegian
  | 'sv'      // Swedish
  | 'et'      // Estonian
  | 'lv'      // Latvian
  | 'lt'      // Lithuanian
  // Eastern European
  | 'ru'      // Russian
  | 'pl'      // Polish
  | 'cs'      // Czech
  | 'sk'      // Slovak
  | 'uk'      // Ukrainian
  | 'be'      // Belarusian
  | 'bg'      // Bulgarian
  | 'ro'      // Romanian
  | 'hr'      // Croatian
  | 'bs'      // Bosnian
  | 'sr'      // Serbian
  | 'sl'      // Slovenian
  | 'mk'      // Macedonian
  | 'hu'      // Hungarian
  | 'ka'      // Georgian
  | 'hy'      // Armenian
  | 'az'      // Azerbaijani
  | 'kk'      // Kazakh
  | 'ky'      // Kirghiz
  // Mediterranean
  | 'el'      // Greek
  | 'tr'      // Turkish
  // Middle East
  | 'ar'      // Arabic
  | 'he'      // Hebrew
  | 'fa'      // Persian
  | 'ps'      // Pashto
  | 'ur'      // Urdu
  // South Asian
  | 'hi'      // Hindi
  | 'bn'      // Bengali
  | 'pa'      // Punjabi
  | 'gu'      // Gujarati
  | 'mr'      // Marathi
  | 'ta'      // Tamil
  | 'te'      // Telugu
  | 'kn'      // Kannada
  | 'ml'      // Malayalam
  | 'as'      // Assamese
  | 'ne'      // Nepali
  | 'sd'      // Sindhi
  // Southeast Asian
  | 'th'      // Thai
  | 'vi'      // Vietnamese
  | 'id'      // Indonesian
  | 'ms'      // Malay
  | 'fil'     // Filipino
  | 'jv'      // Javanese
  | 'ceb'     // Cebuano
  // East Asian
  | 'zh'      // Chinese (Mandarin)
  | 'ja'      // Japanese
  | 'ko'      // Korean
  // African
  | 'af'      // Afrikaans
  | 'sw'      // Swahili
  | 'ha'      // Hausa
  | 'so'      // Somali
  | 'ny'      // Chichewa
  | 'ln'      // Lingala

/**
 * Format types for production output
 */
export type ProductionFormat = 
  | 'full-video'   // Full motion video with all effects
  | 'animatic'     // Ken Burns style with stills and audio

/**
 * A Final Cut stream represents one language + format combination at PROJECT level
 * Aggregates all scene-level production streams into a single timeline assembly
 */
export interface FinalCutStream {
  id: string
  projectId: string
  language: ProductionLanguage
  format: ProductionFormat
  name: string                    // Display name: "English (Video)" or "Thai (Animatic)"
  createdAt: string               // ISO timestamp
  updatedAt: string               // ISO timestamp
  
  // Stream status
  status: StreamStatus
  
  // Scene composition for this stream
  scenes: StreamScene[]
  
  // Global stream settings
  settings: StreamSettings
  
  // Export/render tracking
  exports: StreamExport[]
}

/**
 * Stream workflow status
 */
export type StreamStatus = 
  | 'draft'           // Initial state, being assembled
  | 'in-review'       // Ready for internal review
  | 'approved'        // Approved for rendering
  | 'rendering'       // Currently rendering
  | 'complete'        // Rendered successfully
  | 'published'       // Published to distribution
  | 'error'           // Render failed

/**
 * Global settings for a production stream
 */
export interface StreamSettings {
  // Video settings
  resolution: '720p' | '1080p' | '4K'
  frameRate: 24 | 30 | 60
  aspectRatio: '16:9' | '9:16' | '1:1' | '4:3'
  
  // Audio settings
  audioMixProfile: AudioMixProfile
  masterVolume: number            // 0-100
  
  // Color/Look settings
  colorGrade: ColorGradePreset
  customLUT?: string              // URL to custom LUT file
  
  // Upscaling settings
  upscalingEnabled: boolean
  upscalingProvider: 'topaz' | 'native' | 'none'
  upscalingModel?: TopazModel
  
  // Watermark settings (for test screenings)
  watermarkEnabled: boolean
  watermarkPosition: WatermarkPosition
  watermarkText?: string
}

/**
 * Audio mixing profile
 */
export type AudioMixProfile = 
  | 'dialogue-focus'     // Dialogue prominent, music ducked
  | 'cinematic'          // Balanced for theatrical feel
  | 'documentary'        // Narration-forward
  | 'action'             // SFX emphasized
  | 'custom'

/**
 * Color grading presets
 */
export type ColorGradePreset = 
  | 'natural'
  | 'cinematic-warm'
  | 'cinematic-cool'
  | 'noir'
  | 'vintage'
  | 'high-contrast'
  | 'desaturated'
  | 'custom'

/**
 * Topaz Video AI upscaling models
 */
export type TopazModel = 
  | 'artemis-hq'         // Best for high-quality footage
  | 'proteus'            // Balanced quality/speed
  | 'gaia-hq'            // Best for CGI/animation
  | 'theia'              // Best for faces

/**
 * Watermark positioning
 */
export type WatermarkPosition = 
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | 'center'

// =============================================================================
// STREAM SCENE TYPES
// =============================================================================

/**
 * A scene within a production stream
 * Contains all segments, transitions, and overlays for that scene
 */
export interface StreamScene {
  id: string
  streamId: string
  sceneNumber: number
  sourceSceneId: string           // Reference to original scene in script
  
  // Scene content
  segments: StreamSegment[]
  
  // Duration and timing
  startTime: number               // Start time in stream timeline (seconds)
  endTime: number                 // End time in stream timeline (seconds)
  durationMs: number              // Calculated duration in milliseconds
  
  // Scene-level settings
  transition?: TransitionEffect   // Transition INTO this scene
  
  // Scene metadata from script
  heading?: string
  visualDescription?: string
  
  // Override settings (optional, inherit from stream if not set)
  sceneSettings?: Partial<StreamSettings>
}

/**
 * A segment within a stream scene
 * Links to rendered video/image assets and defines overlays
 */
export interface StreamSegment {
  id: string
  sceneId: string
  sequenceIndex: number
  
  // Asset reference (from scene production)
  sourceSegmentId: string         // Reference to SceneSegment from production
  assetUrl: string                // Video or image URL
  assetType: 'video' | 'image'
  
  // Timing within scene
  startTime: number               // Start time relative to scene start
  endTime: number                 // End time relative to scene start
  durationMs: number
  
  // Overlays for this segment
  overlays: Overlay[]
  
  // Transition to next segment
  transitionOut?: TransitionEffect
  
  // Ken Burns settings (for image assets)
  kenBurns?: KenBurnsConfig
  
  // Audio tracks for this segment
  audioTracks: SegmentAudioTrack[]
}

/**
 * Ken Burns animation configuration for still images
 */
export interface KenBurnsConfig {
  enabled: boolean
  startScale: number              // 1.0 = 100%
  endScale: number
  startPosition: { x: number; y: number }  // 0-100 percent
  endPosition: { x: number; y: number }
  easingFunction: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out'
}

/**
 * Audio track reference for a segment
 */
export interface SegmentAudioTrack {
  id: string
  type: 'narration' | 'dialogue' | 'music' | 'sfx' | 'ambient'
  sourceUrl: string
  startOffset: number             // Offset from segment start (ms)
  duration: number                // Duration in ms
  volume: number                  // 0-100
  fadeIn?: number                 // Fade in duration (ms)
  fadeOut?: number                // Fade out duration (ms)
  
  // Dialogue-specific
  characterName?: string
  
  // Music-specific
  looping?: boolean
}

// =============================================================================
// OVERLAY TYPES
// =============================================================================

/**
 * Overlay types available in Final Cut
 */
export type OverlayType = 
  | 'text'              // Text overlay (titles, captions, lower thirds)
  | 'image'             // Image overlay (logos, watermarks)
  | 'subtitle'          // Subtitle track
  | 'chapter-card'      // Chapter/scene divider card

/**
 * Base overlay interface
 */
export interface OverlayBase {
  id: string
  type: OverlayType
  segmentId: string
  
  // Timing
  startTime: number               // Start time relative to segment (ms)
  duration: number                // Duration in ms
  
  // Position
  position: OverlayPosition
  
  // Animation
  animationIn?: OverlayAnimation
  animationOut?: OverlayAnimation
}

/**
 * Overlay positioning
 */
export interface OverlayPosition {
  x: number                       // 0-100 percent from left
  y: number                       // 0-100 percent from top
  width?: number                  // Optional width constraint
  height?: number                 // Optional height constraint
  anchor: 'top-left' | 'top-center' | 'top-right' | 
          'center-left' | 'center' | 'center-right' |
          'bottom-left' | 'bottom-center' | 'bottom-right'
}

/**
 * Overlay animation configuration
 */
export interface OverlayAnimation {
  type: 'fade' | 'slide-up' | 'slide-down' | 'slide-left' | 'slide-right' | 'scale' | 'none'
  duration: number                // Animation duration in ms
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out'
}

/**
 * Text overlay
 */
export interface TextOverlay extends OverlayBase {
  type: 'text'
  content: string
  style: TextOverlayStyle
}

/**
 * Text overlay styling
 */
export interface TextOverlayStyle {
  fontFamily: string
  fontSize: number                // In pixels
  fontWeight: 400 | 500 | 600 | 700
  color: string                   // Hex color
  backgroundColor?: string        // Optional background
  backgroundOpacity?: number      // 0-100
  textAlign: 'left' | 'center' | 'right'
  lineHeight?: number
  letterSpacing?: number
  textShadow?: TextShadowConfig
  stroke?: TextStrokeConfig
}

/**
 * Text shadow configuration
 */
export interface TextShadowConfig {
  enabled: boolean
  color: string
  blur: number
  offsetX: number
  offsetY: number
}

/**
 * Text stroke configuration
 */
export interface TextStrokeConfig {
  enabled: boolean
  color: string
  width: number
}

/**
 * Image overlay (logos, watermarks)
 */
export interface ImageOverlay extends OverlayBase {
  type: 'image'
  imageUrl: string
  opacity: number                 // 0-100
  scale: number                   // 1.0 = 100%
}

/**
 * Subtitle overlay
 */
export interface SubtitleOverlay extends OverlayBase {
  type: 'subtitle'
  text: string
  language: ProductionLanguage
  style: SubtitleStyle
}

/**
 * Subtitle styling
 */
export interface SubtitleStyle {
  fontFamily: string
  fontSize: number
  fontWeight: 400 | 500 | 600 | 700
  color: string
  backgroundColor: string
  backgroundOpacity: number
  position: 'bottom' | 'top'
  marginBottom: number
}

/**
 * Chapter card overlay (scene dividers, title cards)
 */
export interface ChapterCardOverlay extends OverlayBase {
  type: 'chapter-card'
  title: string
  subtitle?: string
  backgroundType: 'solid' | 'gradient' | 'image' | 'blur-behind'
  backgroundColor?: string
  gradientColors?: [string, string]
  backgroundImage?: string
  style: TextOverlayStyle
}

/**
 * Union type for all overlays
 */
export type Overlay = TextOverlay | ImageOverlay | SubtitleOverlay | ChapterCardOverlay

// =============================================================================
// TRANSITION TYPES
// =============================================================================

/**
 * Transition effect between scenes or segments
 */
export interface TransitionEffect {
  type: TransitionType
  duration: number                // Duration in ms
  
  // Type-specific settings
  direction?: 'left' | 'right' | 'up' | 'down'
  color?: string                  // For dip-to-color transitions
  easingFunction?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out'
}

/**
 * Available transition types
 */
export type TransitionType = 
  | 'cut'                 // Instant cut (no transition)
  | 'crossfade'           // Cross dissolve
  | 'fade-to-black'       // Fade to black
  | 'fade-from-black'     // Fade from black
  | 'dip-to-color'        // Dip to specified color
  | 'wipe'                // Wipe transition
  | 'slide'               // Slide transition
  | 'zoom'                // Zoom transition

// =============================================================================
// EXPORT TYPES
// =============================================================================

/**
 * Export job for a production stream
 */
export interface StreamExport {
  id: string
  streamId: string
  createdAt: string
  completedAt?: string
  
  // Export settings
  settings: ExportSettings
  
  // Job status
  status: ExportStatus
  progress: number                // 0-100
  error?: string
  
  // Output
  outputUrl?: string
  fileSizeBytes?: number
  durationSeconds?: number
}

/**
 * Export settings
 */
export interface ExportSettings {
  resolution: '720p' | '1080p' | '4K'
  codec: 'h264' | 'h265' | 'prores'
  bitrate: 'low' | 'medium' | 'high' | 'ultra'
  audioCodec: 'aac' | 'pcm'
  
  // Range selection
  exportRange: 'full' | 'selection'
  selectionStart?: number         // Start time in seconds
  selectionEnd?: number           // End time in seconds
  
  // Watermark for test exports
  watermark: boolean
  
  // Upscaling
  upscale: boolean
  upscaleSettings?: UpscaleSettings
}

/**
 * Upscaling settings for export
 */
export interface UpscaleSettings {
  provider: 'topaz' | 'native'
  model?: TopazModel
  targetResolution: '1080p' | '4K' | '8K'
  enhanceDetails: boolean
  reducenoise: boolean
  deinterlace: boolean
}

/**
 * Export job status
 */
export type ExportStatus = 
  | 'queued'
  | 'preparing'
  | 'rendering'
  | 'upscaling'
  | 'encoding'
  | 'complete'
  | 'failed'
  | 'cancelled'

// =============================================================================
// PREMIERE: SCREENING TYPES
// =============================================================================

/**
 * Test screening session
 */
export interface ScreeningSession {
  id: string
  projectId: string
  streamId: string                // Which stream is being screened
  
  // Screening metadata
  title: string
  description?: string
  createdAt: string
  expiresAt: string               // When the screening link expires
  
  // Access control
  accessType: ScreeningAccessType
  password?: string               // Optional password protection
  maxViewers?: number             // Optional viewer limit
  
  // Sharing
  shareUrl: string                // Public URL: /s/{screeningId}
  embedCode?: string              // Optional embed code
  
  // Viewer tracking
  viewerCount: number
  viewers: ScreeningViewer[]
  
  // Feedback
  feedbackEnabled: boolean
  comments: TimestampedComment[]
  reactions: ScreeningReaction[]
  
  // Status
  status: ScreeningStatus
}

/**
 * Screening access types
 */
export type ScreeningAccessType = 
  | 'public'            // Anyone with link can view
  | 'password'          // Requires password
  | 'invite-only'       // Only invited emails can view
  | 'internal'          // Only project collaborators

/**
 * Screening status
 */
export type ScreeningStatus = 
  | 'active'            // Currently accepting views
  | 'expired'           // Link has expired
  | 'disabled'          // Manually disabled
  | 'archived'          // Archived for records

/**
 * Viewer information for a screening
 */
export interface ScreeningViewer {
  id: string
  email?: string                  // If authenticated
  name?: string                   // Display name
  viewedAt: string                // When they first viewed
  lastActiveAt: string            // Last activity
  watchProgress: number           // 0-100 percent watched
  deviceInfo?: string             // Browser/device info
  location?: string               // Geographic location (if available)
}

/**
 * Timestamped comment on a screening
 */
export interface TimestampedComment {
  id: string
  screeningId?: string
  viewerId: string
  viewerName?: string
  
  // Content
  timestamp: number               // Video timestamp in seconds
  text: string
  
  // Metadata
  createdAt: string
  updatedAt?: string
  
  // Thread support
  parentId?: string               // For replies
  replies?: TimestampedComment[]
  
  // Moderation
  isResolved?: boolean
  resolvedBy?: string
  resolvedAt?: string
}

/**
 * Reaction types for screenings
 */
export type ReactionType = 
  | 'like'
  | 'love'
  | 'laugh'
  | 'wow'
  | 'sad'
  | 'angry'
  | 'confused'

/**
 * Emoji reaction on a screening
 */
export interface ScreeningReaction {
  id: string
  screeningId?: string
  viewerId: string
  timestamp: number               // Video timestamp
  type: ReactionType              // Reaction type
  emoji?: string                  // Optional emoji character
  createdAt: string
}

// =============================================================================
// PREMIERE: ANALYTICS TYPES
// =============================================================================

/**
 * Screening analytics data
 */
export interface ScreeningAnalytics {
  screeningId: string
  
  // View metrics
  totalViews: number
  uniqueViewers: number
  averageWatchTime: number        // Seconds
  completionRate: number          // 0-100 percent
  
  // Engagement metrics
  totalComments: number
  totalReactions: number
  engagementRate: number          // Comments + reactions per viewer
  
  // Retention curve (percentage still watching at each point)
  retentionCurve: RetentionPoint[]
  
  // Drop-off points (where viewers stopped watching)
  dropOffPoints: DropOffPoint[]
  
  // Comment density (comments per minute of video)
  commentDensity: CommentDensityPoint[]
  
  // Device breakdown
  deviceBreakdown: DeviceBreakdown
  
  // Geographic breakdown
  geoBreakdown: GeoBreakdown[]
}

/**
 * Retention curve point
 */
export interface RetentionPoint {
  timestamp: number               // Video timestamp in seconds
  percentage: number              // Percent of viewers still watching
}

/**
 * Drop-off point analysis
 */
export interface DropOffPoint {
  timestamp: number
  dropOffCount: number            // Number of viewers who stopped here
  sceneNumber?: number            // Which scene this occurred in
}

/**
 * Comment density point
 */
export interface CommentDensityPoint {
  timestamp: number
  count: number
}

/**
 * Device type breakdown
 */
export interface DeviceBreakdown {
  desktop: number
  mobile: number
  tablet: number
  tv: number
  unknown: number
}

/**
 * Geographic breakdown point
 */
export interface GeoBreakdown {
  country: string
  viewerCount: number
  averageWatchTime: number
}

// =============================================================================
// PREMIERE: PUBLISHING TYPES
// =============================================================================

/**
 * Publishing job for distribution
 */
export interface PublishJob {
  id: string
  projectId: string
  streamId: string
  
  // Job metadata
  createdAt: string
  scheduledAt?: string            // For scheduled publishing
  publishedAt?: string
  
  // Destination
  destination: PublishDestination
  
  // Content
  title: string
  description: string
  tags: string[]
  thumbnail?: string
  
  // Platform-specific metadata
  platformMetadata: PlatformMetadata
  
  // Status
  status: PublishStatus
  progress: number
  error?: string
  
  // Result
  publishedUrl?: string
}

/**
 * Publishing destinations
 */
export type PublishDestination = 
  | 'youtube'
  | 'vimeo'
  | 'wistia'
  | 'file-download'
  | 'google-drive'
  | 'dropbox'
  | 's3'
  | 'custom-url'

/**
 * Platform-specific publishing metadata
 */
export interface PlatformMetadata {
  // YouTube
  youtubeCategory?: string
  youtubePrivacy?: 'public' | 'unlisted' | 'private'
  youtubeLicense?: 'youtube' | 'creativeCommons'
  youtubeForKids?: boolean
  
  // Vimeo
  vimeoPrivacy?: 'anybody' | 'only_me' | 'password' | 'disable'
  vimeoReviewLink?: boolean
  
  // General
  enableComments?: boolean
  enableDownloads?: boolean
}

/**
 * Publishing status
 */
export type PublishStatus = 
  | 'draft'             // Not yet submitted
  | 'scheduled'         // Scheduled for future publish
  | 'uploading'         // Currently uploading
  | 'processing'        // Platform is processing
  | 'published'         // Successfully published
  | 'failed'            // Publishing failed
  | 'cancelled'         // User cancelled

// =============================================================================
// FINAL CUT: TIMELINE STATE
// =============================================================================

/**
 * Timeline state for Final Cut editor
 */
export interface TimelineState {
  // Playback
  currentTime: number             // Current playhead position (seconds)
  isPlaying: boolean
  playbackRate: number            // 0.5, 1, 1.5, 2
  
  // Selection
  selectedSceneId: string | null
  selectedSegmentId: string | null
  selectedOverlayId: string | null
  
  // Zoom/View
  zoomLevel: number               // 1 = 1 second per 100px
  scrollPosition: number          // Horizontal scroll in timeline
  
  // Editing mode
  editMode: TimelineEditMode
  
  // Snap settings
  snapToGrid: boolean
  snapToMarkers: boolean
  gridSize: number                // Grid size in seconds
  
  // Markers
  markers: TimelineMarker[]
  
  // History for undo/redo
  undoStack: TimelineAction[]
  redoStack: TimelineAction[]
}

/**
 * Timeline editing modes
 */
export type TimelineEditMode = 
  | 'select'            // Select and move items
  | 'trim'              // Trim segment edges
  | 'razor'             // Cut segments
  | 'overlay'           // Add/edit overlays

/**
 * Timeline marker
 */
export interface TimelineMarker {
  id: string
  timestamp: number
  label: string
  color: string
  type: 'marker' | 'chapter' | 'todo'
}

/**
 * Timeline action for undo/redo
 */
export interface TimelineAction {
  type: string
  description: string
  timestamp: string
  previousState: Partial<TimelineState>
  newState: Partial<TimelineState>
}

// =============================================================================
// HELPER TYPES
// =============================================================================

/**
 * Duration formatted for display
 */
export interface FormattedDuration {
  hours: number
  minutes: number
  seconds: number
  frames: number
  formatted: string               // "01:23:45:12" format
}

/**
 * Language configuration for multi-language streams
 */
export interface LanguageConfig {
  code: ProductionLanguage
  name: string
  nativeName: string
  rtl: boolean                    // Right-to-left language
}

/**
 * Available languages with display names
 */
export const LANGUAGE_CONFIGS: Record<ProductionLanguage, LanguageConfig> = {
  // Western European
  en: { code: 'en', name: 'English', nativeName: 'English', rtl: false },
  fr: { code: 'fr', name: 'French', nativeName: 'Français', rtl: false },
  de: { code: 'de', name: 'German', nativeName: 'Deutsch', rtl: false },
  es: { code: 'es', name: 'Spanish', nativeName: 'Español', rtl: false },
  pt: { code: 'pt', name: 'Portuguese', nativeName: 'Português', rtl: false },
  it: { code: 'it', name: 'Italian', nativeName: 'Italiano', rtl: false },
  nl: { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', rtl: false },
  ca: { code: 'ca', name: 'Catalan', nativeName: 'Català', rtl: false },
  gl: { code: 'gl', name: 'Galician', nativeName: 'Galego', rtl: false },
  lb: { code: 'lb', name: 'Luxembourgish', nativeName: 'Lëtzebuergesch', rtl: false },
  ga: { code: 'ga', name: 'Irish', nativeName: 'Gaeilge', rtl: false },
  cy: { code: 'cy', name: 'Welsh', nativeName: 'Cymraeg', rtl: false },
  is: { code: 'is', name: 'Icelandic', nativeName: 'Íslenska', rtl: false },
  // Northern European
  da: { code: 'da', name: 'Danish', nativeName: 'Dansk', rtl: false },
  fi: { code: 'fi', name: 'Finnish', nativeName: 'Suomi', rtl: false },
  no: { code: 'no', name: 'Norwegian', nativeName: 'Norsk', rtl: false },
  sv: { code: 'sv', name: 'Swedish', nativeName: 'Svenska', rtl: false },
  et: { code: 'et', name: 'Estonian', nativeName: 'Eesti', rtl: false },
  lv: { code: 'lv', name: 'Latvian', nativeName: 'Latviešu', rtl: false },
  lt: { code: 'lt', name: 'Lithuanian', nativeName: 'Lietuvių', rtl: false },
  // Eastern European
  ru: { code: 'ru', name: 'Russian', nativeName: 'Русский', rtl: false },
  pl: { code: 'pl', name: 'Polish', nativeName: 'Polski', rtl: false },
  cs: { code: 'cs', name: 'Czech', nativeName: 'Čeština', rtl: false },
  sk: { code: 'sk', name: 'Slovak', nativeName: 'Slovenčina', rtl: false },
  uk: { code: 'uk', name: 'Ukrainian', nativeName: 'Українська', rtl: false },
  be: { code: 'be', name: 'Belarusian', nativeName: 'Беларуская', rtl: false },
  bg: { code: 'bg', name: 'Bulgarian', nativeName: 'Български', rtl: false },
  ro: { code: 'ro', name: 'Romanian', nativeName: 'Română', rtl: false },
  hr: { code: 'hr', name: 'Croatian', nativeName: 'Hrvatski', rtl: false },
  bs: { code: 'bs', name: 'Bosnian', nativeName: 'Bosanski', rtl: false },
  sr: { code: 'sr', name: 'Serbian', nativeName: 'Српски', rtl: false },
  sl: { code: 'sl', name: 'Slovenian', nativeName: 'Slovenščina', rtl: false },
  mk: { code: 'mk', name: 'Macedonian', nativeName: 'Македонски', rtl: false },
  hu: { code: 'hu', name: 'Hungarian', nativeName: 'Magyar', rtl: false },
  ka: { code: 'ka', name: 'Georgian', nativeName: 'ქართული', rtl: false },
  hy: { code: 'hy', name: 'Armenian', nativeName: 'Հայերեն', rtl: false },
  az: { code: 'az', name: 'Azerbaijani', nativeName: 'Azərbaycan', rtl: false },
  kk: { code: 'kk', name: 'Kazakh', nativeName: 'Қазақ', rtl: false },
  ky: { code: 'ky', name: 'Kirghiz', nativeName: 'Кыргызча', rtl: false },
  // Mediterranean
  el: { code: 'el', name: 'Greek', nativeName: 'Ελληνικά', rtl: false },
  tr: { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', rtl: false },
  // Middle East
  ar: { code: 'ar', name: 'Arabic', nativeName: 'العربية', rtl: true },
  he: { code: 'he', name: 'Hebrew', nativeName: 'עברית', rtl: true },
  fa: { code: 'fa', name: 'Persian', nativeName: 'فارسی', rtl: true },
  ps: { code: 'ps', name: 'Pashto', nativeName: 'پښتو', rtl: true },
  ur: { code: 'ur', name: 'Urdu', nativeName: 'اردو', rtl: true },
  // South Asian
  hi: { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', rtl: false },
  bn: { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', rtl: false },
  pa: { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', rtl: false },
  gu: { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', rtl: false },
  mr: { code: 'mr', name: 'Marathi', nativeName: 'मराठी', rtl: false },
  ta: { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', rtl: false },
  te: { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', rtl: false },
  kn: { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', rtl: false },
  ml: { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', rtl: false },
  as: { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া', rtl: false },
  ne: { code: 'ne', name: 'Nepali', nativeName: 'नेपाली', rtl: false },
  sd: { code: 'sd', name: 'Sindhi', nativeName: 'سنڌي', rtl: true },
  // Southeast Asian
  th: { code: 'th', name: 'Thai', nativeName: 'ไทย', rtl: false },
  vi: { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', rtl: false },
  id: { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', rtl: false },
  ms: { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu', rtl: false },
  fil: { code: 'fil', name: 'Filipino', nativeName: 'Filipino', rtl: false },
  jv: { code: 'jv', name: 'Javanese', nativeName: 'Basa Jawa', rtl: false },
  ceb: { code: 'ceb', name: 'Cebuano', nativeName: 'Cebuano', rtl: false },
  // East Asian
  zh: { code: 'zh', name: 'Chinese', nativeName: '中文', rtl: false },
  ja: { code: 'ja', name: 'Japanese', nativeName: '日本語', rtl: false },
  ko: { code: 'ko', name: 'Korean', nativeName: '한국어', rtl: false },
  // African
  af: { code: 'af', name: 'Afrikaans', nativeName: 'Afrikaans', rtl: false },
  sw: { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili', rtl: false },
  ha: { code: 'ha', name: 'Hausa', nativeName: 'Hausa', rtl: false },
  so: { code: 'so', name: 'Somali', nativeName: 'Soomaali', rtl: false },
  ny: { code: 'ny', name: 'Chichewa', nativeName: 'Chichewa', rtl: false },
  ln: { code: 'ln', name: 'Lingala', nativeName: 'Lingála', rtl: false },
}

/**
 * Format configuration
 */
export interface FormatConfig {
  id: ProductionFormat
  name: string
  description: string
  icon: string                    // Lucide icon name
}

/**
 * Available formats
 */
export const FORMAT_CONFIGS: Record<ProductionFormat, FormatConfig> = {
  'full-video': {
    id: 'full-video',
    name: 'Full Video',
    description: 'Full motion video with AI-generated clips',
    icon: 'Film'
  },
  'animatic': {
    id: 'animatic',
    name: 'Animatic',
    description: 'Ken Burns animation with still images',
    icon: 'ImagePlay'
  }
}
