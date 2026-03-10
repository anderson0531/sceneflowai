/**
 * Shared types for image generation dialog components.
 */

import type { ModelTier, ThinkingLevel, ShotTypeValue } from './constants'

// ============================================================================
// Character Types
// ============================================================================

export interface ImageGenCharacter {
  name: string
  referenceImage?: string
  appearance?: string
  appearanceDescription?: string
  ethnicity?: string
  age?: string
  subject?: string
  description?: string
  /** Single wardrobe string (from FramePromptDialog) */
  wardrobe?: string
  /** Full wardrobe options (from ScenePromptBuilder) */
  wardrobes?: Array<{
    id: string
    name: string
    description: string
  }>
}

export interface WardrobeOption {
  id: string
  name: string
  description: string
  isDefault?: boolean
}

// ============================================================================
// Object / Prop Reference Types
// ============================================================================

export interface ObjectReference {
  id: string
  name: string
  imageUrl: string
  description?: string
  importance?: 'critical' | 'secondary'
  /** Scene number filter (from VisualReference) */
  sceneNumber?: number
}

// ============================================================================
// Visual Setup
// ============================================================================

export interface VisualSetup {
  location: string
  timeOfDay: string
  weather: string
  atmosphere: string
  shotType: string
  cameraAngle: string
  lighting: string
  /** Optional lens choice (ScenePromptBuilder) */
  lensChoice?: string
  /** Optional lighting mood description (ScenePromptBuilder) */
  lightingMood?: string
}

// ============================================================================
// Talent Direction
// ============================================================================

export interface TalentDirection {
  talentBlocking: string
  emotionalBeat: string
  keyProps: string
}

// ============================================================================
// Section Component Common Props
// ============================================================================

/** Props for section header styling consistency */
export interface SectionProps {
  className?: string
}

/** Character selection section props */
export interface CharacterSelectionProps extends SectionProps {
  characters: ImageGenCharacter[]
  selectedCharacterNames: string[]
  onSelectionChange: (names: string[]) => void
  /** Per-character wardrobe selection */
  selectedWardrobes?: Record<string, string>
  onWardrobeChange?: (characterName: string, wardrobeId: string) => void
  /** Scene-level wardrobe assignments to determine default */
  sceneWardrobes?: Record<string, string>
  /** Show reference quality hints based on shot type */
  hasCharacterReferences?: boolean
  /** Hint that this is a no-talent segment (shows info text but still allows selection) */
  noTalentHint?: boolean
  /** Collapsible section state */
  isCollapsed?: boolean
  onToggleCollapsed?: () => void
}

/** Prop/object selection section props */
export interface PropSelectionProps extends SectionProps {
  objectReferences: ObjectReference[]
  selectedObjectIds: string[]
  onSelectionChange: (ids: string[]) => void
  /** Auto-detected object IDs from scene text (for suggestion badges) */
  autoDetectedObjectIds?: Set<string>
  /** Collapsible section state */
  isCollapsed?: boolean
  onToggleCollapsed?: () => void
}

/** Camera & composition section props */
export interface CameraCompositionProps extends SectionProps {
  visualSetup: VisualSetup
  onVisualSetupChange: (setup: Partial<VisualSetup>) => void
  /** Show reference quality indicators on shot types */
  hasCharacterReferences?: boolean
  /** Show lens & lighting mood fields (ScenePromptBuilder mode) */
  showExtendedOptions?: boolean
}

/** Art style grid props */
export interface ArtStyleGridProps extends SectionProps {
  artStyle: string
  onArtStyleChange: (styleId: string) => void
}

/** Quality mode section props */
export interface QualityModeProps extends SectionProps {
  modelTier: ModelTier
  onModelTierChange: (tier: ModelTier) => void
  thinkingLevel: ThinkingLevel
  onThinkingLevelChange: (level: ThinkingLevel) => void
  /** Compact mode for inline display */
  compact?: boolean
}

/** Talent direction section props */
export interface TalentDirectionProps extends SectionProps {
  talentDirection: TalentDirection
  onTalentDirectionChange: (direction: Partial<TalentDirection>) => void
  /** Start collapsed (for FramePromptDialog) */
  defaultCollapsed?: boolean
}
