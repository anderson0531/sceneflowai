'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import {
  FLAG_EMOJIS,
  getLanguagesByRegion,
  REGION_LABELS,
  type LanguageRegion,
} from '@/constants/languages'

// ─── Props ───────────────────────────────────────────────────────────────────
export interface GroupedNativeSelectProps {
  /** Currently selected language code */
  value: string
  /** Called when the user picks a new language */
  onChange: (code: string) => void
  /** If provided, only these language codes appear in the dropdown */
  filterCodes?: string[]
  /** Show flag emojis before language names (default true) */
  showFlags?: boolean
  /** Extra Tailwind classes for the <select> element */
  className?: string
  /** Disabled state */
  disabled?: boolean
}

/**
 * Native <select> with <optgroup> region headers.
 * Designed for ScreeningRoom & MobileMenuSheet where native controls
 * provide better mobile touch UX.
 */
export function GroupedNativeSelect({
  value,
  onChange,
  filterCodes,
  showFlags = true,
  className,
  disabled = false,
}: GroupedNativeSelectProps) {
  const groups = React.useMemo(
    () => getLanguagesByRegion(filterCodes),
    [filterCodes]
  )

  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      className={cn(
        'px-3 py-1.5 rounded-lg bg-white/10 text-white border border-white/20',
        'text-sm focus:outline-none focus:ring-2 focus:ring-white/30',
        'appearance-auto cursor-pointer',
        className
      )}
    >
      {groups.map(group => {
        // Strip emoji from label for optgroup (native selects render poorly with emoji in labels on some OS)
        const plainLabel = REGION_LABELS[group.region as LanguageRegion]
        return (
          <optgroup key={group.region} label={plainLabel}>
            {group.languages.map(lang => {
              const flag = showFlags ? (FLAG_EMOJIS[lang.code] ?? '') : ''
              const label = flag ? `${flag} ${lang.name}` : lang.name
              return (
                <option key={lang.code} value={lang.code}>
                  {label}
                </option>
              )
            })}
          </optgroup>
        )
      })}
    </select>
  )
}
