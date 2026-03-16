'use client'

import * as React from 'react'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import {
  FLAG_EMOJIS,
  getLanguagesByRegion,
  type SupportedLanguage,
} from '@/constants/languages'

// ─── Size presets ────────────────────────────────────────────────────────────
const SIZE_CLASSES = {
  xs: 'w-[120px] h-7 text-xs',
  sm: 'w-[140px] h-8 text-xs',
  md: 'w-[180px] h-9 text-sm',
} as const

export type SelectorSize = keyof typeof SIZE_CLASSES

// ─── Props ───────────────────────────────────────────────────────────────────
export interface GroupedLanguageSelectorProps {
  /** Currently selected language code */
  value: string
  /** Called when the user picks a new language */
  onValueChange: (code: string) => void
  /** If provided, only these language codes appear in the dropdown */
  filterCodes?: string[]
  /** Show flag emojis before language names (default true) */
  showFlags?: boolean
  /** Trigger width / height preset (default 'sm') */
  size?: SelectorSize
  /** Extra Tailwind classes for the trigger button */
  className?: string
  /** Disabled state */
  disabled?: boolean
  /** Placeholder text when no value selected */
  placeholder?: string
  /** Optional render for each item (e.g. to add audio-status dots) */
  renderItemSuffix?: (lang: SupportedLanguage) => React.ReactNode
}

/**
 * Shared, region-grouped language selector used throughout SceneFlow AI.
 *
 * Uses shadcn `SelectGroup` + `SelectLabel` for region headers,
 * languages sorted by YouTube audience rank within each group.
 */
export function GroupedLanguageSelector({
  value,
  onValueChange,
  filterCodes,
  showFlags = true,
  size = 'sm',
  className,
  disabled = false,
  placeholder = 'Language',
  renderItemSuffix,
}: GroupedLanguageSelectorProps) {
  const groups = React.useMemo(
    () => getLanguagesByRegion(filterCodes),
    [filterCodes]
  )

  // Build display value for the trigger
  const selectedDisplay = React.useMemo(() => {
    for (const g of groups) {
      const lang = g.languages.find(l => l.code === value)
      if (lang) {
        const flag = showFlags ? (FLAG_EMOJIS[lang.code] ?? '') : ''
        return `${flag} ${lang.name}`.trim()
      }
    }
    return undefined
  }, [groups, value, showFlags])

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger
        className={cn(SIZE_CLASSES[size], className)}
      >
        <SelectValue placeholder={placeholder}>
          {selectedDisplay}
        </SelectValue>
      </SelectTrigger>

      <SelectContent className="max-h-[320px]">
        {groups.map(group => (
          <SelectGroup key={group.region}>
            <SelectLabel className="text-[11px] uppercase tracking-wider text-muted-foreground/70 py-1.5 pl-3 pr-2 font-semibold">
              {group.label}
            </SelectLabel>
            {group.languages.map(lang => {
              const flag = showFlags ? (FLAG_EMOJIS[lang.code] ?? '') : ''
              return (
                <SelectItem
                  key={lang.code}
                  value={lang.code}
                  className="pl-3 text-sm"
                >
                  <span className="flex items-center gap-2">
                    {flag && <span className="text-base leading-none">{flag}</span>}
                    <span>{lang.name}</span>
                    {renderItemSuffix?.(lang)}
                  </span>
                </SelectItem>
              )
            })}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  )
}
