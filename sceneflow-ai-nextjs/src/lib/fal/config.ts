/**
 * @deprecated Fal.ai integration is deprecated. Production uses Vertex/GCP only.
 * Kept for one release; do not import from new code paths.
 */

import { fal } from '@fal-ai/client'

let configured = false

/** @deprecated Fal.ai is no longer used in production. */
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

/** @deprecated */
export function getFalKlingT2vModel(): string {
  return (
    process.env.FAL_KLING_T2V_MODEL ||
    'fal-ai/kling-video/v3/standard/text-to-video'
  )
}

/** @deprecated */
export function getFalKlingI2vModel(): string {
  return (
    process.env.FAL_KLING_I2V_MODEL ||
    'fal-ai/kling-video/v3/pro/image-to-video'
  )
}

/** @deprecated */
export function getFalKlingImageModel(): string {
  return (
    process.env.FAL_KLING_IMAGE_MODEL ||
    'fal-ai/kling-image/v3/text-to-image'
  )
}

/** @deprecated */
export function getFalKlingImageO3Model(): string {
  return (
    process.env.FAL_KLING_IMAGE_O3_MODEL ||
    'fal-ai/kling-image/o3/image-to-image'
  )
}

export type ImageProvider = 'fal-kling' | 'vertex'

/** Always returns vertex — Fal-hosted Kling image provider is deprecated. */
export function getImageProvider(): ImageProvider {
  if (process.env.IMAGE_PROVIDER?.trim().toLowerCase() === 'fal-kling') {
    console.warn(
      '[fal/config] IMAGE_PROVIDER=fal-kling is deprecated and ignored; using vertex.'
    )
  }
  return 'vertex'
}

/** Always false — Fal-hosted Kling is deprecated. */
export function isFalKlingImageProvider(): boolean {
  return false
}
