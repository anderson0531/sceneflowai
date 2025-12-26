/**
 * Modern Treatment View Components
 * 
 * A visually-rich Film Treatment layout that leverages AI image generation
 * for cinematic presentation.
 */

// Main component
export { ModernTreatmentView } from './ModernTreatmentView'
export { default as ModernTreatmentViewDefault } from './ModernTreatmentView'

// Sub-components
export { TreatmentHeroImage } from './TreatmentHeroImage'
export { CharacterPortraitCard } from './CharacterPortraitCard'
export { ActAnchorSection } from './ActAnchorSection'
export { KeyPropDisplay } from './KeyPropDisplay'
export { ToneStrip, ToneStripInline } from './ToneStrip'

// Re-export types
export type {
  TreatmentVisuals,
  TreatmentMood,
  TonePalette,
  GeneratedImage,
  CharacterPortrait,
  ActAnchor,
  KeyProp,
  ToneStrip as ToneStripType,
  AspectRatio
} from '@/types/treatment-visuals'

export {
  TONE_PALETTE_COLORS,
  TREATMENT_VISUAL_CREDITS,
  DEFAULT_PROMPT_TEMPLATES,
  calculateTreatmentCredits
} from '@/types/treatment-visuals'
