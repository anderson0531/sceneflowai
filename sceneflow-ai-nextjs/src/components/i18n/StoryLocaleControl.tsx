'use client'

import { useCallback, useState } from 'react'
import { PenLine } from 'lucide-react'
import { toast } from 'sonner'

import { LocalePicker } from '@/components/i18n/LocalePicker'
import { getLocaleNativeName } from '@/i18n/locale'
import type { EntityI18n } from '@/i18n/content/entityI18n'

interface StoryLocaleControlProps {
  /** Project or series id; omit while the entity is still unsaved. */
  entityId?: string
  entityKind?: 'project' | 'series'
  i18n: EntityI18n
  onChange: (next: EntityI18n) => void
  disabled?: boolean
  className?: string
}

/**
 * Per-project override for the language new AI content is written in.
 *
 * Placed in the studio header because it changes what the next generation
 * produces, so it belongs where the creator can see it before they hit
 * generate — not buried in account settings.
 */
export function StoryLocaleControl({
  entityId,
  entityKind = 'project',
  i18n,
  onChange,
  disabled = false,
  className,
}: StoryLocaleControlProps) {
  const [saving, setSaving] = useState(false)

  const handleChange = useCallback(
    async (locale: string) => {
      if (locale === i18n.sourceLocale) return

      // Changing the story language makes previously derived translations
      // meaningless, so drop them along with the source switch.
      const next: EntityI18n = { sourceLocale: locale }
      onChange(next)

      if (!entityId || entityId.startsWith('new-project')) {
        toast.success(`Story language set to ${getLocaleNativeName(locale)}`)
        return
      }

      setSaving(true)
      try {
        const endpoint =
          entityKind === 'series' ? `/api/series/${entityId}` : `/api/projects/${entityId}`
        const response = await fetch(endpoint, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ metadata: { i18n: next } }),
        })
        if (!response.ok) throw new Error('Save failed')
        toast.success(
          `New content will be written in ${getLocaleNativeName(locale)}`
        )
      } catch {
        onChange(i18n)
        toast.error('Could not change the story language')
      } finally {
        setSaving(false)
      }
    },
    [entityId, entityKind, i18n, onChange]
  )

  return (
    <div className={className}>
      <LocalePicker
        value={i18n.sourceLocale}
        onValueChange={handleChange}
        size="sm"
        disabled={disabled || saving}
        className="w-auto px-2 gap-1.5"
        compact={false}
        align="end"
        ariaLabel="Story language"
        placeholder="Story language"
      />
    </div>
  )
}

/** Read-only badge for surfaces that show, but do not change, the story language. */
export function StoryLocaleBadge({ locale }: { locale: string }) {
  return (
    <span className="flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-1 text-xs font-medium text-violet-300">
      <PenLine className="h-3 w-3" />
      <span lang={locale}>{getLocaleNativeName(locale)}</span>
    </span>
  )
}
