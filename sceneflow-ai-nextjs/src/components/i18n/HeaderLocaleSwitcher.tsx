'use client'

import { LocalePicker } from '@/components/i18n/LocalePicker'
import { useUiLocale } from '@/i18n/useUiLocale'

/**
 * Compact interface-language control for the app header.
 *
 * Deliberately flag-only: the header is dense, and the picker itself labels
 * every option with its endonym so discoverability does not depend on the
 * trigger.
 */
export function HeaderLocaleSwitcher({ className }: { className?: string }) {
  const { locale, switchLocale, isSaving } = useUiLocale()

  return (
    <LocalePicker
      value={locale}
      onValueChange={(next) => switchLocale(next)}
      compact
      size="sm"
      align="end"
      disabled={isSaving}
      className={className}
      ariaLabel="Interface language"
    />
  )
}
