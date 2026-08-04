'use client'

import { useCallback, useMemo } from 'react'
import {
  EMPTY_ENTITY_I18N,
  withOverride,
  withPromotedSourceLocale,
  type EntityI18n,
} from '@/i18n/content/entityI18n'
import {
  useContentTranslation,
  type FieldTranslation,
} from '@/i18n/content/useContentTranslation'

export interface UseLocalizedFieldsOptions {
  /**
   * Registry path prefix for this editor, e.g. `treatmentVariants[A]`. Field
   * names are appended, so `logline` becomes `treatmentVariants[A].logline`.
   */
  pathPrefix: string
  /** Field name -> current source-language text. */
  values: Record<string, string | undefined>
  i18n?: EntityI18n
  /** Persist a change to the entity's localization state. */
  onI18nChange?: (next: EntityI18n) => void
  glossary?: readonly string[]
  enabled?: boolean
}

export interface LocalizedFieldBinding {
  path: string
  sourceValue: string
  translation: FieldTranslation
  setOverride: (text: string) => void
}

/**
 * Wires {@link useContentTranslation} to a dialog's field set.
 *
 * Exists so each of the ~60 edit dialogs adds three lines rather than
 * reimplementing precedence, override writing, and path construction — and so
 * they cannot drift apart in how they treat a machine translation.
 */
export function useLocalizedFields({
  pathPrefix,
  values,
  i18n = EMPTY_ENTITY_I18N,
  onI18nChange,
  glossary = [],
  enabled = true,
}: UseLocalizedFieldsOptions) {
  const fields = useMemo(() => {
    const out: Record<string, string | undefined> = {}
    for (const [name, value] of Object.entries(values)) {
      out[`${pathPrefix}.${name}`] = value
    }
    return out
  }, [pathPrefix, values])

  const { resolve, uiLocale, sourceLocale, needsTranslation, isLoading } =
    useContentTranslation({ fields, i18n, glossary, enabled })

  const bind = useCallback(
    (name: string): LocalizedFieldBinding => {
      const path = `${pathPrefix}.${name}`
      return {
        path,
        sourceValue: values[name] ?? '',
        translation: resolve(path),
        setOverride: (text: string) => {
          onI18nChange?.(withOverride(i18n, uiLocale, path, text))
        },
      }
    },
    [pathPrefix, values, resolve, onI18nChange, i18n, uiLocale]
  )

  const promoteToSourceLocale = useCallback(() => {
    onI18nChange?.(withPromotedSourceLocale(i18n, uiLocale))
  }, [onI18nChange, i18n, uiLocale])

  return {
    bind,
    uiLocale,
    sourceLocale,
    needsTranslation,
    isLoading,
    promoteToSourceLocale,
    /** Only offer override editing when the caller can persist it. */
    canOverride: Boolean(onI18nChange),
  }
}
