import { DEFAULT_LOCALE, getLocaleEnglishName, getLocaleNativeName } from '@/i18n/locale'

/**
 * Field names that must stay in English even though they read like prose.
 *
 * These are consumed by Imagen / Veo / Kling rather than by a person. Asking the
 * model to write them in the story language is the single most damaging thing
 * localization could do to output quality, and the damage is invisible: the
 * render just gets worse.
 */
export const VISUAL_PROMPT_FIELDS = [
  'visual_style',
  'audio_direction',
  'broll_suggestions',
  'ethnicity',
  'subject',
  'keyFeature',
  'hairStyle',
  'hairColor',
  'eyeColor',
  'expression',
  'build',
  'defaultWardrobe',
  'wardrobeAccessories',
  'atmosphere',
  'furniture_props',
  'appearanceDescription',
  'visualDescription',
  'segmentDirection',
  'voiceDirection',
  'actionDescription',
] as const

export interface LocaleDirectiveOptions {
  /**
   * Additional field names to keep in English, on top of
   * {@link VISUAL_PROMPT_FIELDS}.
   */
  keepEnglishFields?: readonly string[]
  /**
   * Names that must be reproduced verbatim — characters, locations, and props
   * from the series bible. Translating them breaks continuity with locked
   * prompt tokens and already-generated reference images.
   */
  properNouns?: readonly string[]
  /** Extra guidance appended to the block. */
  note?: string
}

/**
 * Instruct the model to author human-readable output in the story language.
 *
 * Generating natively is strictly better than translating afterwards: idiom,
 * register, names, and cultural references come out right, dialogue is
 * performable, and it costs nothing extra. Translation is the fallback for
 * content that already exists, not the primary path.
 *
 * Returns an empty string for English so English prompts are byte-identical to
 * before and no existing behaviour shifts.
 */
export function localeDirective(
  storyLocale: string | null | undefined,
  options: LocaleDirectiveOptions = {}
): string {
  const locale = storyLocale ?? DEFAULT_LOCALE
  if (!locale || locale === DEFAULT_LOCALE) return ''

  const englishName = getLocaleEnglishName(locale)
  const nativeName = getLocaleNativeName(locale)
  const keepEnglish = [...VISUAL_PROMPT_FIELDS, ...(options.keepEnglishFields ?? [])]
  const properNouns = (options.properNouns ?? []).filter(Boolean)

  const lines = [
    '',
    'OUTPUT LANGUAGE - CRITICAL:',
    `Write every human-readable value in ${englishName} (${nativeName}, code "${locale}").`,
    'This includes title, logline, synopsis, tone, setting, themes, beat titles and',
    'synopses, character descriptions and arcs, scene descriptions, dialogue,',
    'narration, and narrative reasoning prose (character_focus, key_decisions',
    'decision/why/impact, story_strengths, user_adjustments). Write natively in',
    'that language: use its idiom and register rather than translating English',
    'phrasing word for word.',
    '',
    'KEEP IN ENGLISH regardless of the above:',
    '- Every JSON key, and every enum value defined by the schema',
    `  (for example "INT", "EXT", "protagonist", "supporting", "antagonist").`,
    '- Any field whose name ends in "Prompt", and these fields:',
    `  ${keepEnglish.join(', ')}.`,
    '  These are fed to image and video generation models, which perform',
    '  markedly worse on non-English prompts.',
    '- Technical film terminology inside those fields (e.g. "medium close-up",',
    '  "dolly in", "golden hour", "rack focus").',
  ]

  if (properNouns.length > 0) {
    lines.push(
      '',
      'REPRODUCE THESE NAMES EXACTLY, do not translate or transliterate them:',
      `  ${properNouns.join(', ')}.`
    )
  }

  if (options.note) {
    lines.push('', options.note)
  }

  return `${lines.join('\n')}\n`
}

/** Series-bible-derived names that must survive generation and translation. */
export interface ProperNounSource {
  characters?: Array<{ name?: string | null } | null> | null
  locations?: Array<{ name?: string | null } | null> | null
  props?: Array<{ name?: string | null } | null> | null
}

/**
 * Collect proper nouns from a series production bible.
 *
 * Deduplicated and capped: the point is to protect the names the audience will
 * notice, and an unbounded list would crowd out the rest of the prompt.
 */
export function buildProperNounGlossary(
  source: ProperNounSource | null | undefined,
  extra: readonly (string | null | undefined)[] = [],
  limit = 40
): string[] {
  const seen = new Set<string>()
  const out: string[] = []

  const push = (value: string | null | undefined) => {
    const name = value?.trim()
    if (!name || name.length < 2) return
    const key = name.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    out.push(name)
  }

  for (const character of source?.characters ?? []) push(character?.name)
  for (const location of source?.locations ?? []) push(location?.name)
  for (const prop of source?.props ?? []) push(prop?.name)
  for (const value of extra) push(value)

  return out.slice(0, limit)
}
