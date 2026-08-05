'use client'

import { PenLine } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { getLocaleNativeName } from '@/i18n/locale'

/**
 * Read-only indicator for the language new AI content will be written in.
 *
 * Deliberately not a control — not the interface language. The header switcher
 * updates both `preferred_locale` and account `story_locale`, so this badge
 * tracks the header unless the project carries `metadata.i18n.sourceLocale`
 * (set from Settings). That override is the generation language for this
 * project; existing English (or other) body text still localizes via the
 * content-MT path using `readEntityI18n`, which defaults to `en` when unset.
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
