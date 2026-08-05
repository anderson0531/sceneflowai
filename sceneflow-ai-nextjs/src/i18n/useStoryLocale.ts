'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { DEFAULT_LOCALE, isLocale } from '@/i18n/locale'
import {
  EMPTY_ENTITY_I18N,
  readEntityI18n,
  type EntityI18n,
} from '@/i18n/content/entityI18n'
import { readUiLocaleCookie } from '@/i18n/useUiLocale'
import {
  getCachedAccountStoryLocale,
  setCachedAccountStoryLocale,
} from '@/i18n/accountStoryLocaleCache'

export { setCachedAccountStoryLocale }

/**
 * Account-level default for the story language.
 *
 * Cached per page load: this is read by every studio surface and the value only
 * changes from the settings page or the header switcher, both of which reload.
 */
export function useAccountStoryLocale(): string {
  const [locale, setLocale] = useState<string>(
    () => getCachedAccountStoryLocale() ?? readUiLocaleCookie() ?? DEFAULT_LOCALE
  )

  useEffect(() => {
    const cached = getCachedAccountStoryLocale()
    if (cached) {
      setLocale(cached)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const response = await fetch('/api/user/locale')
        if (!response.ok) return
        const data = await response.json()
        if (cancelled || !isLocale(data.storyLocale)) return
        setCachedAccountStoryLocale(data.storyLocale)
        setLocale(data.storyLocale)
      } catch {
        // Falls back to the interface locale, which is the common case anyway.
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return locale
}

/**
 * Resolve the story language for an entity, with the account default as the
 * fallback, and expose a setter that keeps local state in step with the server.
 *
 * Resolution order: entity override -> account default -> interface language.
 */
export function useStoryLocale(entity: { metadata?: Record<string, any> | null } | null | undefined) {
  const accountLocale = useAccountStoryLocale()
  const [localI18n, setLocalI18n] = useState<EntityI18n | null>(null)

  const entityI18n = useMemo(() => {
    if (localI18n) return localI18n
    const stored = entity?.metadata?.i18n
    if (stored) return readEntityI18n(entity)
    return { ...EMPTY_ENTITY_I18N, sourceLocale: accountLocale }
  }, [localI18n, entity, accountLocale])

  const setEntityI18n = useCallback((next: EntityI18n) => {
    setLocalI18n(next)
  }, [])

  return {
    i18n: entityI18n,
    storyLocale: entityI18n.sourceLocale,
    setEntityI18n,
    /** True when this entity deviates from the account default. */
    isOverridden: entityI18n.sourceLocale !== accountLocale,
  }
}
