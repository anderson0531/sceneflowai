'use client'

import { PenLine } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { getLocaleNativeName } from '@/i18n/locale'

/**
 * Read-only indicator for the language new AI content will be written in.
 *
 * Deliberately not a control. The header switcher is the single language
 * control, and the story language follows it through the resolution chain in
 * `i18n/server/storyLocale.ts` (entity override -> account -> interface
 * language). A second picker beside the header one read as the same setting
 * being out of sync, so the per-project override now lives in Settings and the
 * studio only reports the outcome.
 */
export function StoryLocaleBadge({ locale }: { locale: string }) {
  const t = useTranslations('common.language')

  return (
    <span
      className="flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-1 text-xs font-medium text-violet-300"
      title={t('storyLanguageHint', { language: getLocaleNativeName(locale) })}
    >
      <PenLine className="h-3 w-3" />
      <span lang={locale}>{getLocaleNativeName(locale)}</span>
    </span>
  )
}
