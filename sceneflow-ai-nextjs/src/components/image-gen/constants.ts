/**
 * Shared constants for image generation dialogs.
 * Standardizes options across ScenePromptBuilder and FramePromptDialog.
 */

// ============================================================================
// Location & Setting Options
// ============================================================================

export const TIME_OF_DAY_OPTIONS = [
  { value: 'day', label: 'Day' },
  { value: 'night', label: 'Night' },
  { value: 'dawn', label: 'Dawn' },
  { value: 'dusk', label: 'Dusk' },
  { value: 'golden-hour', label: 'Golden Hour' },
] as const

export const WEATHER_OPTIONS = [
  { value: 'clear', label: 'Clear' },
  { value: 'overcast', label: 'Overcast' },
  { value: 'rainy', label: 'Rainy' },
  { value: 'stormy', label: 'Stormy' },
  { value: 'foggy', label: 'Foggy' },
  { value: 'snowy', label: 'Snowy' },
] as const

export const ATMOSPHERE_OPTIONS = [
  { value: 'neutral', label: 'Neutral' },
  { value: 'tense', label: 'Tense' },
  { value: 'mysterious', label: 'Mysterious' },
  { value: 'energetic', label: 'Energetic' },
  { value: 'serene', label: 'Serene' },
  { value: 'melancholic', label: 'Melancholic' },
  { value: 'hopeful', label: 'Hopeful' },
] as const

// ============================================================================
// Camera & Composition Options
// ============================================================================

export type ShotTypeValue =
  | 'extreme-close-up'
  | 'close-up'
  | 'medium-close-up'
  | 'medium-shot'
  | 'wide-shot'
  | 'extreme-wide'
  | 'over-shoulder'

export interface ShotTypeOption {
  value: ShotTypeValue
  label: string
  /** Whether character faces are large enough for reference matching */
  referenceQuality: 'recommended' | 'limited' | 'too-small'
}

export const SHOT_TYPE_OPTIONS: ShotTypeOption[] = [
  { value: 'extreme-close-up', label: 'Extreme Close-Up', referenceQuality: 'recommended' },
  { value: 'close-up', label: 'Close-Up', referenceQuality: 'recommended' },
  { value: 'medium-close-up', label: 'Medium Close-Up', referenceQuality: 'recommended' },
  { value: 'medium-shot', label: 'Medium Shot', referenceQuality: 'limited' },
  { value: 'wide-shot', label: 'Wide Shot', referenceQuality: 'too-small' },
  { value: 'extreme-wide', label: 'Extreme Wide', referenceQuality: 'too-small' },
  { value: 'over-shoulder', label: 'Over the Shoulder', referenceQuality: 'limited' },
]

export const CAMERA_ANGLE_OPTIONS = [
  { value: 'eye-level', label: 'Eye Level' },
  { value: 'low-angle', label: 'Low Angle' },
  { value: 'high-angle', label: 'High Angle' },
  { value: 'dutch-angle', label: 'Dutch Angle' },
  { value: 'birds-eye', label: "Bird's Eye" },
] as const

export const LIGHTING_OPTIONS = [
  { value: 'natural', label: 'Natural' },
  { value: 'soft', label: 'Soft / High-Key' },
  { value: 'dramatic', label: 'Dramatic / Low-Key' },
  { value: 'harsh', label: 'Harsh' },
  { value: 'silhouette', label: 'Silhouette' },
  { value: 'neon', label: 'Neon / Stylized' },
] as const

export const LENS_OPTIONS = [
  { value: 'standard', label: 'Standard (50mm)' },
  { value: 'wide', label: 'Wide Angle (24mm)' },
  { value: 'telephoto', label: 'Telephoto (85mm)' },
  { value: 'macro', label: 'Macro' },
  { value: 'anamorphic', label: 'Anamorphic' },
] as const

// ============================================================================
// Quality Mode (Model Tiers)
// ============================================================================

export type ModelTier = 'eco' | 'designer' | 'director'
export type ThinkingLevel = 'low' | 'high'

export interface ModelTierConfig {
  id: ModelTier
  name: string
  description: string
  details: string
  model: string
  resolution: string
  cost: string
  color: 'emerald' | 'purple' | 'amber'
  comingSoon?: boolean
}

export const MODEL_TIERS: readonly ModelTierConfig[] = [
  {
    id: 'eco',
    name: 'Eco Mode',
    description: 'Fast & Affordable',
    details: 'Quick ideation and simple prompts. ~3-5 seconds, lowest cost.',
    model: 'Nano Banana',
    resolution: 'Up to 2K',
    cost: '~$0.025/image',
    color: 'emerald',
  },
  {
    id: 'designer',
    name: 'Designer Mode',
    description: 'High Precision',
    details: 'Complex prompts with high-fidelity text and 4K resolution.',
    model: 'Nano Banana Pro',
    resolution: 'Up to 4K',
    cost: '~$0.05/image',
    color: 'purple',
  },
  {
    id: 'director',
    name: 'Director Mode',
    description: 'Cinematic Scene',
    details: 'Professional video sequence with native audio. Coming Soon.',
    model: 'Veo 3.1',
    resolution: '4K+',
    cost: 'Credit-based',
    color: 'amber',
    comingSoon: true,
  },
] as const

// ============================================================================
// Negative Prompt Presets
// ============================================================================

export interface NegativePromptPreset {
  id: string
  label: string
  value: string
}

export const NEGATIVE_PROMPT_PRESETS: readonly NegativePromptPreset[] = [
  {
    id: 'quality',
    label: 'Low Quality',
    value: 'blurry, low quality, pixelated, noisy, grainy, jpeg artifacts, compression artifacts',
  },
  {
    id: 'anatomy',
    label: 'Bad Anatomy',
    value: 'bad anatomy, extra limbs, missing limbs, deformed, mutated, disfigured, malformed hands, extra fingers, missing fingers',
  },
  {
    id: 'text',
    label: 'Text & Watermarks',
    value: 'text, watermark, logo, signature, username, copyright, words, letters',
  },
  {
    id: 'lighting',
    label: 'Bad Lighting',
    value: 'overexposed, underexposed, harsh lighting, flat lighting, washed out, oversaturated',
  },
  {
    id: 'composition',
    label: 'Poor Composition',
    value: 'cropped, out of frame, bad framing, awkward angle, distorted perspective',
  },
  {
    id: 'style',
    label: 'Non-Cinematic',
    value: 'cartoon, anime, illustration, painting, drawing, sketch, 3D render, CGI, video game',
  },
  {
    id: 'cartoon',
    label: 'Cartoon Style',
    value: 'cartoon, animated, disney style, pixar style, anime, manga, comic book style',
  },
  {
    id: 'stock',
    label: 'Stock Photo Look',
    value: 'stock photo, generic, corporate, posed, fake smile, staged, artificial',
  },
  {
    id: 'cgi',
    label: 'CGI/3D Look',
    value: 'CGI, 3D rendered, unreal engine, video game graphics, plastic skin, uncanny valley',
  },
  {
    id: 'motion',
    label: 'Motion Blur',
    value: 'motion blur, camera shake, unfocused, blurry movement, ghosting',
  },
] as const

export const DEFAULT_NEGATIVE_PRESETS = ['quality', 'anatomy']
