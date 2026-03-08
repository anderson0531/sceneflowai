/**
 * Shared image generation dialog components.
 * 
 * These components unify the UX between ScenePromptBuilder and FramePromptDialog,
 * ensuring consistent design, behavior, and feature parity.
 */

// Components
export { LocationSettingSection } from './LocationSettingSection'
export { CharacterSelectionSection } from './CharacterSelectionSection'
export { PropSelectionSection } from './PropSelectionSection'
export { CameraCompositionSection } from './CameraCompositionSection'
export { ArtStyleGrid } from './ArtStyleGrid'
export { QualityModeSection } from './QualityModeSection'
export { TalentDirectionSection } from './TalentDirectionSection'

// Constants
export {
  TIME_OF_DAY_OPTIONS,
  WEATHER_OPTIONS,
  ATMOSPHERE_OPTIONS,
  SHOT_TYPE_OPTIONS,
  CAMERA_ANGLE_OPTIONS,
  LIGHTING_OPTIONS,
  LENS_OPTIONS,
  MODEL_TIERS,
  NEGATIVE_PROMPT_PRESETS,
  DEFAULT_NEGATIVE_PRESETS,
} from './constants'

// Types
export type {
  ShotTypeValue,
  ShotTypeOption,
  ModelTier,
  ThinkingLevel,
  ModelTierConfig,
  NegativePromptPreset,
} from './constants'

export type {
  ImageGenCharacter,
  WardrobeOption,
  ObjectReference,
  VisualSetup,
  TalentDirection,
  SectionProps,
  CharacterSelectionProps,
  PropSelectionProps,
  CameraCompositionProps,
  ArtStyleGridProps,
  QualityModeProps,
  TalentDirectionProps,
} from './types'
