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

function vid(path: string): string {
  return `${BLOB_HOST}/${encodeURI(path)}#t=0.1`
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
    en: { src: vid('YouTube Creator (English).mp4') },
    es: { src: vid('Youtube Creator (Spanis).mp4') },
    pt: { src: vid('Youtube Creator (Portugese).mp4') },
    hi: { src: vid('Youtube Creator (Hindi).mp4') },
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
