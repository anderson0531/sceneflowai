/**
 * Image Editing Types and Constants
 * 
 * Shared types for image editing feature (client + server)
 * Does NOT import any server-side dependencies
 */

export type EditMode = 'instruction' | 'inpaint' | 'outpaint'

export type AspectRatioPreset = '16:9' | '21:9' | '1:1' | '9:16' | '4:3' | '3:4'

export interface AspectRatioInfo {
  label: string
  description: string
}

/**
 * Aspect ratio presets for film workflow
 * Used in outpainting to expand images to cinematic formats
 */
export const ASPECT_RATIO_PRESETS: Record<AspectRatioPreset, AspectRatioInfo> = {
  '16:9': { label: 'HD Widescreen', description: 'Standard cinematic format (1920×1080)' },
  '21:9': { label: 'Ultra-Wide', description: 'Anamorphic cinema format (2560×1080)' },
  '1:1': { label: 'Square', description: 'Social media format (1080×1080)' },
  '9:16': { label: 'Portrait', description: 'Vertical/mobile format (1080×1920)' },
  '4:3': { label: 'Classic', description: 'Traditional TV format (1440×1080)' },
  '3:4': { label: 'Portrait Classic', description: 'Vertical classic format (1080×1440)' }
}
