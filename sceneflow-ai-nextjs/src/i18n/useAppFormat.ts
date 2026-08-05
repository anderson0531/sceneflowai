'use client'

import { useCallback } from 'react'
import { useFormatter, useLocale } from 'next-intl'

/**
 * Locale-aware formatting for the values the studios actually display.
 *
 * The distinction that matters here is between numbers a human reads and
 * numbers that are technical identifiers. A duration ("2 min 30 s") should
 * localize; an SMPTE timecode should not, because it is a coordinate that has to
 * stay comparable across a crew working in different languages.
 */
export function useAppFormat() {
  const format = useFormatter()
  const locale = useLocale()

  /** Human-readable duration from seconds. Localized. */
  const duration = useCallback(
    (totalSeconds: number | null | undefined): string => {
      if (totalSeconds == null || !Number.isFinite(totalSeconds)) return '—'

      const seconds = Math.max(0, Math.round(totalSeconds))
      const hours = Math.floor(seconds / 3600)
      const minutes = Math.floor((seconds % 3600) / 60)
      const remainder = seconds % 60

      const parts: string[] = []
      if (hours > 0) parts.push(format.number(hours, { style: 'unit', unit: 'hour' }))
      if (minutes > 0) parts.push(format.number(minutes, { style: 'unit', unit: 'minute' }))
      if (remainder > 0 || parts.length === 0) {
        parts.push(format.number(remainder, { style: 'unit', unit: 'second' }))
      }

      return parts.join(' ')
    },
    [format]
  )

  /**
   * SMPTE-style timecode. Deliberately *not* localized: it identifies a frame
   * and must read identically for everyone on the production.
   */
  const timecode = useCallback((totalSeconds: number | null | undefined): string => {
    if (totalSeconds == null || !Number.isFinite(totalSeconds)) return '00:00'
    const seconds = Math.max(0, Math.floor(totalSeconds))
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const remainder = seconds % 60
    const pad = (value: number) => String(value).padStart(2, '0')
    return hours > 0
      ? `${pad(hours)}:${pad(minutes)}:${pad(remainder)}`
      : `${pad(minutes)}:${pad(remainder)}`
  }, [])

  const count = useCallback(
    (value: number | null | undefined): string =>
      value == null || !Number.isFinite(value) ? '—' : format.number(value),
    [format]
  )

  const credits = useCallback(
    (value: number | null | undefined): string =>
      value == null || !Number.isFinite(value)
        ? '—'
        : format.number(value, { maximumFractionDigits: 0 }),
    [format]
  )

  const currency = useCallback(
    (value: number | null | undefined, currencyCode = 'USD'): string =>
      value == null || !Number.isFinite(value)
        ? '—'
        : format.number(value, { style: 'currency', currency: currencyCode }),
    [format]
  )

  const percent = useCallback(
    (fraction: number | null | undefined): string =>
      fraction == null || !Number.isFinite(fraction)
        ? '—'
        : format.number(fraction, { style: 'percent', maximumFractionDigits: 0 }),
    [format]
  )

  const date = useCallback(
    (value: Date | string | number | null | undefined): string => {
      if (value == null) return '—'
      const parsed = value instanceof Date ? value : new Date(value)
      if (Number.isNaN(parsed.getTime())) return '—'
      return format.dateTime(parsed, { dateStyle: 'medium' })
    },
    [format]
  )

  const dateTime = useCallback(
    (value: Date | string | number | null | undefined): string => {
      if (value == null) return '—'
      const parsed = value instanceof Date ? value : new Date(value)
      if (Number.isNaN(parsed.getTime())) return '—'
      return format.dateTime(parsed, { dateStyle: 'medium', timeStyle: 'short' })
    },
    [format]
  )

  /** "3 days ago". Falls back to an absolute date beyond a month. */
  const relativeDate = useCallback(
    (value: Date | string | number | null | undefined): string => {
      if (value == null) return '—'
      const parsed = value instanceof Date ? value : new Date(value)
      if (Number.isNaN(parsed.getTime())) return '—'

      const ageMs = Date.now() - parsed.getTime()
      if (Math.abs(ageMs) > 30 * 24 * 60 * 60 * 1000) {
        return format.dateTime(parsed, { dateStyle: 'medium' })
      }
      return format.relativeTime(parsed)
    },
    [format]
  )

  return { locale, duration, timecode, count, credits, currency, percent, date, dateTime, relativeDate }
}
