import { DEFAULT_LOCALE, isLocale } from '@/i18n/locale'

/**
 * Per-entity localization state, stored at `metadata.i18n` on projects and
 * series.
 *
 * The model is deliberately single-master: exactly one language is the source
 * of record for an entity's creative content, and every other language is
 * derived. Multi-master editing across 39 languages has no convergent merge
 * story, so instead a human edit made while reading a translation is captured
 * as an *override* which machine translation will never overwrite. This is the
 * same relationship `messages/tier-a/` has with the machine-translated landing
 * catalogs.
 */
export interface EntityI18n {
  /** Language the entity's creative content is written in. */
  sourceLocale: string
  /** locale -> field path -> human-authored text that MT must not replace. */
  overrides?: Record<string, Record<string, string>>
}

export const EMPTY_ENTITY_I18N: EntityI18n = { sourceLocale: DEFAULT_LOCALE }

type MetadataCarrier = { metadata?: Record<string, any> | null } | null | undefined

export function readEntityI18n(entity: MetadataCarrier): EntityI18n {
  const raw = entity?.metadata?.i18n
  if (!raw || typeof raw !== 'object') return EMPTY_ENTITY_I18N

  const sourceLocale = isLocale(raw.sourceLocale) ? raw.sourceLocale : DEFAULT_LOCALE
  const overrides =
    raw.overrides && typeof raw.overrides === 'object'
      ? (raw.overrides as Record<string, Record<string, string>>)
      : undefined

  return { sourceLocale, overrides }
}

export function getEntitySourceLocale(entity: MetadataCarrier): string {
  return readEntityI18n(entity).sourceLocale
}

export function getOverride(
  i18n: EntityI18n,
  locale: string,
  path: string
): string | undefined {
  const value = i18n.overrides?.[locale]?.[path]
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

/** Immutably set a human override, returning a new `EntityI18n`. */
export function withOverride(
  i18n: EntityI18n,
  locale: string,
  path: string,
  text: string
): EntityI18n {
  const overrides = { ...(i18n.overrides ?? {}) }
  overrides[locale] = { ...(overrides[locale] ?? {}), [path]: text }
  return { ...i18n, overrides }
}

export function withoutOverride(
  i18n: EntityI18n,
  locale: string,
  path: string
): EntityI18n {
  if (!i18n.overrides?.[locale]) return i18n
  const forLocale = { ...i18n.overrides[locale] }
  delete forLocale[path]
  const overrides = { ...i18n.overrides, [locale]: forLocale }
  if (Object.keys(forLocale).length === 0) delete overrides[locale]
  return { ...i18n, overrides }
}

/**
 * Promote a language to source of record.
 *
 * Overrides for the promoted locale become the content itself, so they are
 * dropped along with every other derived translation.
 */
export function withPromotedSourceLocale(i18n: EntityI18n, locale: string): EntityI18n {
  return { sourceLocale: locale }
}

/** Merge an `EntityI18n` back into a metadata object without disturbing siblings. */
export function mergeEntityI18nIntoMetadata(
  metadata: Record<string, any> | null | undefined,
  i18n: EntityI18n
): Record<string, any> {
  return { ...(metadata ?? {}), i18n }
}
