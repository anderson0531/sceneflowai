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
    en: { src: videoUrl('English-Video-v11.mp4') },
    es: { src: videoUrl('Spanish-Video-v1.mp4') },
    zh: { src: videoUrl('Chinese-Mandarin-Video-v1.mp4') },
    ar: { src: videoUrl('Arabic-Video-v2.mp4') },
  },
  animation: {
    en: { src: videoUrl('English-Video-v2.mp4') },
    es: { src: videoUrl('Spanish-Video-v1 (1).mp4') },
    zh: { src: videoUrl('Chinese-Mandarin-Video-v1 (1).mp4') },
    ar: { src: videoUrl('Arabic-Video-v1.mp4') },
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
