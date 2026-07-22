/**
 * Per-persona Problem/Solution/Outcome walkthrough videos for the
 * "Who is SceneFlow For?" section — one dubbed MP4 per locale (same model as
 * heroVideoLocales). Unproduced locales render as disabled "Soon" pills.
 * Append #t=0.1 to skip a black first frame when supported.
 */

export type PersonaId = 'youtubeCreator' | 'startupProvider' | 'enterprise' | 'educator'

export type PersonaStoryLocaleId = 'en' | 'es' | 'pt' | 'hi' | 'zh' | 'ar' | 'th'

export type PersonaStoryLocale = {
  id: PersonaStoryLocaleId
  /** Public Blob URL; empty when not yet produced. */
  src: string
  /** JPG poster shown before playback; optional. */
  poster?: string
  available: boolean
}

const BLOB_HOST = 'https://xxavfkdhdebrqida.public.blob.vercel-storage.com'

function vid(path: string, version?: string): string {
  const url = `${BLOB_HOST}/${encodeURI(path)}`
  const versioned = version ? `${url}?v=${encodeURIComponent(version)}` : url
  return `${versioned}#t=0.1`
}

/** Static poster in /public/landing/persona-stories (served at same path). */
function poster(filename: string): string {
  return `/landing/persona-stories/${filename}`
}

/** Display/selection order for the language pills (mirrors the hero locales). */
export const PERSONA_STORY_LOCALE_ORDER: PersonaStoryLocaleId[] = [
  'en',
  'es',
  'pt',
  'hi',
  'zh',
  'ar',
  'th',
]

/**
 * Produced videos only. A persona/locale absent here renders as a disabled
 * "Soon" pill. Add locales as their dubbed masters are published.
 */
const PRODUCED_VIDEOS: Partial<
  Record<PersonaId, Partial<Record<PersonaStoryLocaleId, { src: string; poster?: string }>>>
> = {
  youtubeCreator: {
    en: {
      src: vid('YouTube Creator (English).mp4', '20260718'),
      poster: poster('youtube-creator-en-poster.jpg'),
    },
    es: {
      src: vid('Youtube Creator (Spanish).mp4'),
      poster: poster('youtube-creator-es-poster.jpg'),
    },
    pt: { src: vid('YouTube Creator (Portuguese).mp4', '20260718') },
    hi: { src: vid('YouTube Creator (Hindi).mp4', '20260718') },
    zh: { src: vid('YouTube Creator (Chinese).mp4', '20260718') },
    ar: { src: vid('YouTube Creator (Arabic).mp4', '20260718') },
    th: { src: vid('YouTube Creator (Thai).mp4', '20260718') },
  },
  startupProvider: {
    en: {
      src: vid('Startup Provider (English).mp4'),
    },
    es: {
      src: vid('The Startup Provider (Spanish).mp4'),
    },
    pt: {
      src: vid('The Startup Provider (Portuguese).mp4'),
    },
    hi: {
      src: vid('The Startup Provider (Hindi).mp4'),
    },
    zh: {
      src: vid('The Startup Provider (Chinese).mp4', '20260720'),
    },
    ar: {
      src: vid('The Startup Provider (Arabic).mp4', '20260720'),
    },
    th: {
      src: vid('The Startup Provider (Thai).mp4', '20260720'),
    },
  },
  enterprise: {
    en: {
      src: vid('Enterprise (English).mp4', '20260720'),
    },
    es: {
      src: vid('Enterprise (Spanish).mp4', '20260720'),
    },
    pt: {
      src: vid('Enterprise (Portuguese).mp4', '20260720'),
    },
    hi: {
      src: vid('Enterprise (Hindi).mp4', '20260720'),
    },
    zh: {
      src: vid('Enterprise (Chinese).mp4', '20260720'),
    },
    ar: {
      src: vid('Enterprise (Arabic) .mp4', '20260720'),
    },
    th: {
      src: vid('Enterprise (Thai).mp4', '20260720'),
    },
  },
  educator: {
    en: {
      src: vid('Educator (English).mp4'),
    },
    es: {
      src: vid('The Educator (Spanish).mp4'),
    },
    pt: {
      src: vid('The Educator (Portuguese).mp4'),
    },
  },
}

export function getPersonaStoryVideoLocales(personaId: PersonaId): PersonaStoryLocale[] {
  const produced = PRODUCED_VIDEOS[personaId] ?? {}
  return PERSONA_STORY_LOCALE_ORDER.map((id) => {
    const entry = produced[id]
    return {
      id,
      src: entry?.src ?? '',
      poster: entry?.poster,
      available: Boolean(entry?.src),
    }
  })
}

export function hasPersonaStoryVideo(personaId: PersonaId): boolean {
  return getPersonaStoryVideoLocales(personaId).some((locale) => locale.available)
}

export function getDefaultPersonaStoryLocale(personaId: PersonaId): PersonaStoryLocaleId {
  const firstAvailable = getPersonaStoryVideoLocales(personaId).find((locale) => locale.available)
  return firstAvailable?.id ?? 'en'
}
