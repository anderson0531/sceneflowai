/**
 * Dubbed promo files for Production Examples. A card/locale absent from
 * PRODUCED_VIDEOS renders as a disabled "Soon" pill.
 *
 * These files are not the longform master and are not the card trailer.
 * The card plays a confirmed trailer only after Screening Room Final exists.
 * See productionPipelineDemo.ts.
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
    zh: { src: videoUrl('The Cinematic Drama (Chinese).mp4') },
    ar: { src: videoUrl('The Cinematic Drama (Arabic).mp4') },
  },
  animation: {
    en: { src: videoUrl('The Animated Comedy (English).mp4') },
    es: { src: videoUrl('The Animated Comedy (Spanish).mp4') },
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
