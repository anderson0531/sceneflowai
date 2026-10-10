import { resolveProjectAspectRatio, toVideoAspectRatio } from '@/lib/vision/artStyle'
import type { PromoFrameAspect } from '@/types/publishingAssets'

/** Delivery frame for the promo. Source films are 16:9 unless the blueprint is vertical. */
export function resolvePromoFrameAspect(metadata: unknown): PromoFrameAspect {
  return toVideoAspectRatio(resolveProjectAspectRatio(metadata))
}

export function promoFrameClass(aspect: PromoFrameAspect): string {
  return aspect === '9:16' ? 'aspect-[9/16]' : 'aspect-video'
}
