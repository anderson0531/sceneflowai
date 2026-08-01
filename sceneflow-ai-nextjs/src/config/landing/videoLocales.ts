/**
 * Shared locale model for dubbed landing videos (persona stories, production
 * showcase). Unproduced locales render as disabled "Soon" pills rather than
 * being hidden, so visitors can see which dubs are coming.
 */

const BLOB_HOST = 'https://xxavfkdhdebrqida.public.blob.vercel-storage.com'

export type VideoLocaleId = 'en' | 'es' | 'pt' | 'hi' | 'zh' | 'ar' | 'th'

export type VideoLocale = {
  id: VideoLocaleId
  /** Public Blob URL; empty when not yet produced. */
  src: string
  /** Poster shown before playback; optional. */
  poster?: string
  available: boolean
}

export type ProducedVideo = { src: string; poster?: string }

/** Display/selection order for the language pills. */
export const VIDEO_LOCALE_ORDER: VideoLocaleId[] = ['en', 'es', 'pt', 'hi', 'zh', 'ar', 'th']

/** Blob URL for a dubbed master. `#t=0.1` skips a black first frame when supported. */
export function videoUrl(path: string, version?: string): string {
  const url = `${BLOB_HOST}/${encodeURI(path)}`
  const versioned = version ? `${url}?v=${encodeURIComponent(version)}` : url
  return `${versioned}#t=0.1`
}

/** Expand a produced-video map into the full ordered locale list. */
export function buildVideoLocales(
  produced: Partial<Record<VideoLocaleId, ProducedVideo>> = {}
): VideoLocale[] {
  return VIDEO_LOCALE_ORDER.map((id) => {
    const entry = produced[id]
    return {
      id,
      src: entry?.src ?? '',
      poster: entry?.poster,
      available: Boolean(entry?.src),
    }
  })
}

/** First produced locale, falling back to English so the player always has a target. */
export function defaultVideoLocale(locales: VideoLocale[]): VideoLocaleId {
  return locales.find((locale) => locale.available)?.id ?? 'en'
}

/** Map landing UI locale to the nearest dubbed video locale (7 options). */
export function landingLocaleToVideoLocale(landingLocale: string): VideoLocaleId {
  if (landingLocale === 'zh-CN' || landingLocale === 'zh-TW') return 'zh'
  if (VIDEO_LOCALE_ORDER.includes(landingLocale as VideoLocaleId)) {
    return landingLocale as VideoLocaleId
  }
  return 'en'
}

/** Pick video dub for a player: mapped locale when produced, else first available. */
export function resolveVideoLocaleForPlayer(
  landingLocale: string,
  locales: VideoLocale[]
): VideoLocaleId {
  const mapped = landingLocaleToVideoLocale(landingLocale)
  const match = locales.find((locale) => locale.id === mapped && locale.available)
  return match?.id ?? defaultVideoLocale(locales)
}
