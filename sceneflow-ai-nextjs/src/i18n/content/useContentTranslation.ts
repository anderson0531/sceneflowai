'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { classifyField, type FieldKind } from '@/i18n/content/fieldRegistry'
import { getOverride, type EntityI18n } from '@/i18n/content/entityI18n'
import { useUiLocale } from '@/i18n/useUiLocale'

export type FieldTranslationState =
  /** Shown in the language it was written in. */
  | 'source'
  /** Machine translated. */
  | 'machine'
  /** A human wrote this wording for this language. */
  | 'override'
  /** Not translatable: a generation prompt, a name, or an id. */
  | 'locked'

export interface FieldTranslation {
  text: string
  state: FieldTranslationState
  kind: FieldKind
  isLoading: boolean
}

export interface UseContentTranslationOptions {
  /** Field path -> source-language text. */
  fields: Record<string, string | undefined>
  i18n: EntityI18n
  /** Names to protect during translation, e.g. series bible characters. */
  glossary?: readonly string[]
  /** Skip network work, e.g. while a dialog is closed. */
  enabled?: boolean
}

/**
 * Resolve stored content into the reader's interface language.
 *
 * Precedence is override, then machine translation, then the source text. The
 * returned `state` is what lets the UI be honest about which of those a value
 * is — showing a machine translation without saying so is how a creator ends up
 * shipping a logline they never approved.
 */
export function useContentTranslation({
  fields,
  i18n,
  glossary = [],
  enabled = true,
}: UseContentTranslationOptions) {
  const { locale: uiLocale } = useUiLocale()
  const sourceLocale = i18n.sourceLocale
  const needsTranslation = enabled && uiLocale !== sourceLocale

  const [machine, setMachine] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  // How many fields the in-flight request covers, so callers can say what is
  // happening once instead of leaving a row of unexplained spinners.
  const [pendingCount, setPendingCount] = useState(0)
  const requestedRef = useRef(new Set<string>())

  // Stable identity for the set of source strings, so the effect does not
  // re-fire on every parent render.
  const requestKey = useMemo(() => {
    if (!needsTranslation) return ''
    return Object.entries(fields)
      .filter(([path, text]) => Boolean(text) && classifyField(path) === 'display')
      .map(([path, text]) => `${path}\u0000${text}`)
      .sort()
      .join('\u0001')
  }, [fields, needsTranslation])

  useEffect(() => {
    if (!needsTranslation || !requestKey) return

    const items = requestKey.split('\u0001').map((entry) => {
      const [path, text] = entry.split('\u0000')
      return { path, text }
    })

    // Skip anything a human has already worded for this locale, and anything
    // already fetched in this session.
    const pending = items.filter((item) => {
      if (getOverride(i18n, uiLocale, item.path)) return false
      return !requestedRef.current.has(`${uiLocale}\u0000${item.path}\u0000${item.text}`)
    })
    if (pending.length === 0) return

    let cancelled = false
    setIsLoading(true)
    setPendingCount(pending.length)

    ;(async () => {
      try {
        const response = await fetch('/api/i18n/content', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: pending,
            targetLocale: uiLocale,
            sourceLocale,
            glossary,
          }),
        })
        if (!response.ok || cancelled) return

        const data = (await response.json()) as {
          items?: Array<{ path: string; text: string; state: string }>
        }
        if (cancelled || !data.items) return

        const next: Record<string, string> = {}
        for (const item of data.items) {
          if (item.state === 'machine' || item.state === 'cached') {
            next[item.path] = item.text
          }
        }
        setMachine((current) => ({ ...current, ...next }))
      } catch {
        // Leave the source text in place; the field simply reads as 'source'.
      } finally {
        for (const item of pending) {
          requestedRef.current.add(`${uiLocale}\u0000${item.path}\u0000${item.text}`)
        }
        if (!cancelled) {
          setIsLoading(false)
          setPendingCount(0)
        }
      }
    })()

    return () => {
      cancelled = true
    }
    // `glossary` and `i18n` are read but intentionally not dependencies: they
    // change identity on every render while their contents are stable, and
    // requestKey already captures every string that matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey, needsTranslation, uiLocale, sourceLocale])

  const resolve = useCallback(
    (path: string): FieldTranslation => {
      const source = fields[path] ?? ''
      const kind = classifyField(path)

      if (kind !== 'display') {
        return { text: source, state: 'locked', kind, isLoading: false }
      }
      if (!needsTranslation) {
        return { text: source, state: 'source', kind, isLoading: false }
      }

      const override = getOverride(i18n, uiLocale, path)
      if (override) {
        return { text: override, state: 'override', kind, isLoading: false }
      }

      const translated = machine[path]
      if (translated) {
        return { text: translated, state: 'machine', kind, isLoading: false }
      }

      return { text: source, state: 'source', kind, isLoading }
    },
    [fields, i18n, machine, needsTranslation, uiLocale, isLoading]
  )

  return {
    resolve,
    uiLocale,
    sourceLocale,
    needsTranslation,
    isLoading,
    /** Fields covered by the in-flight request; 0 when idle. */
    pendingCount,
  }
}
