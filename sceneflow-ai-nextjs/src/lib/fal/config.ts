import { fal } from '@fal-ai/client'

let configured = false

/** Configure Fal singleton once per process (uses FAL_KEY). */
export function ensureFalConfigured(): void {
  if (configured) return
  const key = process.env.FAL_KEY?.trim()
  if (!key) {
    throw new Error('FAL_KEY is required for Fal.ai policy fallback')
  }
  fal.config({ credentials: key })
  configured = true
}

export const FAL_KLING_FALLBACK_MODEL_FAMILY = 'kling' as const

export function getFalKlingT2vModel(): string {
  return (
    process.env.FAL_KLING_T2V_MODEL ||
    'fal-ai/kling-video/v3/standard/text-to-video'
  )
}

export function getFalKlingI2vModel(): string {
  return (
    process.env.FAL_KLING_I2V_MODEL ||
    'fal-ai/kling-video/v3/pro/image-to-video'
  )
}

export function getFalKlingImageModel(): string {
  return (
    process.env.FAL_KLING_IMAGE_MODEL ||
    'fal-ai/kling-image/v3/text-to-image'
  )
}
