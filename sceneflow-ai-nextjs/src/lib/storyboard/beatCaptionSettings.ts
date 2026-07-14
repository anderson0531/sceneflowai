/** Per-language beat caption visibility in Screening Room / Pre-Vis player. */
export type BeatCaptionSettings = Record<string, boolean>

/**
 * Whether beat captions (title/signage overlays) show for a language stream.
 * Default: off for English source, on for dubbed/translated streams.
 */
export function isBeatCaptionEnabledForLanguage(
  language: string,
  settings?: BeatCaptionSettings
): boolean {
  if (settings && language in settings) return settings[language]!
  return language !== 'en'
}
