/**
 * Dubbed demo videos for the Production Examples cards. A card/locale absent
 * from PRODUCED_VIDEOS renders as a disabled "Soon" pill.
 */

import {
  buildVideoLocales,
  defaultVideoLocale,
  videoUrl,
  type ProducedVideo,
  type VideoLocale,
  type VideoLocaleId,
} from '@/config/landing/videoLocales'

const PRODUCED_VIDEOS: Record<string, Partial<Record<VideoLocaleId, ProducedVideo>>> = {
  drama: {
    en: { src: videoUrl('The Cinematic Drama (English).mp4') },
    es: { src: videoUrl('The Cinematic Drama (Spanish).mp4') },
    // pt / hi / zh / ar / th dubs pending — placeholders render as "Soon".
  },
}

export function getProductionShowcaseVideoLocales(cardId: string): VideoLocale[] {
  return buildVideoLocales(PRODUCED_VIDEOS[cardId])
}

export function hasProductionShowcaseVideo(cardId: string): boolean {
  return getProductionShowcaseVideoLocales(cardId).some((locale) => locale.available)
}

export function getDefaultProductionShowcaseLocale(cardId: string): VideoLocaleId {
  return defaultVideoLocale(getProductionShowcaseVideoLocales(cardId))
}
