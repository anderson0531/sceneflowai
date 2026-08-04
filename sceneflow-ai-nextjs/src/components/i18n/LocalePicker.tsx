'use client'

import * as React from 'react'
import { Check, ChevronsUpDown, Globe } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { PLATFORM_LANGUAGES, type PlatformLanguage } from '@/config/landingTranslateLanguages'
import { getLocaleNativeName } from '@/i18n/locale'

/**
 * Flags for the 39 platform locales.
 *
 * Deliberately separate from `FLAG_EMOJIS` in `src/constants/languages.ts`:
 * that list keys off the 73-language TTS codes (`zh`, `fil`) while platform
 * locales use BCP-47-ish tags (`zh-CN`, `tl`).
 */
export const LOCALE_FLAGS: Record<string, string> = {
  en: '🇺🇸', es: '🇪🇸', pt: '🇧🇷', fr: '🇫🇷', de: '🇩🇪', it: '🇮🇹', nl: '🇳🇱',
  pl: '🇵🇱', ru: '🇷🇺', uk: '🇺🇦', cs: '🇨🇿', sv: '🇸🇪', da: '🇩🇰', no: '🇳🇴',
  fi: '🇫🇮', el: '🇬🇷', tr: '🇹🇷', ro: '🇷🇴', hu: '🇭🇺',
  'zh-CN': '🇨🇳', 'zh-TW': '🇹🇼', ja: '🇯🇵', ko: '🇰🇷', hi: '🇮🇳', bn: '🇧🇩',
  th: '🇹🇭', vi: '🇻🇳', id: '🇮🇩', ms: '🇲🇾', tl: '🇵🇭', ur: '🇵🇰',
  ar: '🇸🇦', he: '🇮🇱', fa: '🇮🇷', sw: '🇰🇪', am: '🇪🇹', yo: '🇳🇬', zu: '🇿🇦',
  af: '🇿🇦',
}

const REGION_ORDER = ['Americas', 'Europe', 'Asia Pacific', 'Middle East & Africa'] as const

const REGION_LABELS: Record<string, string> = {
  Americas: '🌎 Americas',
  Europe: '🇪🇺 Europe',
  'Asia Pacific': '🌏 Asia Pacific',
  'Middle East & Africa': '🌍 Middle East & Africa',
}

const SIZE_CLASSES = {
  xs: 'h-7 text-xs',
  sm: 'h-8 text-xs',
  md: 'h-9 text-sm',
} as const

export interface LocalePickerProps {
  value: string
  onValueChange: (locale: string) => void
  /** Restrict the list, e.g. to locales a project already has content in. */
  filterCodes?: string[]
  size?: keyof typeof SIZE_CLASSES
  disabled?: boolean
  className?: string
  placeholder?: string
  searchPlaceholder?: string
  emptyLabel?: string
  /** Hide the endonym and show only the flag. For dense toolbars. */
  compact?: boolean
  align?: 'start' | 'center' | 'end'
  renderItemSuffix?: (language: PlatformLanguage) => React.ReactNode
  ariaLabel?: string
}

/**
 * Region-grouped, searchable picker over the 39 platform locales.
 *
 * Options are labelled with their endonym so a speaker can find their language
 * without already reading the current interface language.
 */
export function LocalePicker({
  value,
  onValueChange,
  filterCodes,
  size = 'sm',
  disabled = false,
  className,
  placeholder = 'Select language',
  searchPlaceholder = 'Search language…',
  emptyLabel = 'No language found.',
  compact = false,
  align = 'start',
  renderItemSuffix,
  ariaLabel,
}: LocalePickerProps) {
  const [open, setOpen] = React.useState(false)

  const groups = React.useMemo(() => {
    const pool = filterCodes
      ? PLATFORM_LANGUAGES.filter((l) => filterCodes.includes(l.code))
      : PLATFORM_LANGUAGES
    return REGION_ORDER.map((region) => ({
      region,
      label: REGION_LABELS[region] ?? region,
      languages: pool.filter((l) => l.region === region),
    })).filter((group) => group.languages.length > 0)
  }, [filterCodes])

  const flag = LOCALE_FLAGS[value] ?? ''
  const nativeName = getLocaleNativeName(value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={ariaLabel ?? placeholder}
          disabled={disabled}
          className={cn(
            'justify-between font-normal bg-gray-800 border-gray-700 text-gray-200 hover:bg-gray-700 hover:text-white',
            SIZE_CLASSES[size],
            compact ? 'w-auto px-2 gap-1' : 'w-[220px]',
            className
          )}
        >
          <span className="flex items-center gap-1.5 truncate">
            {flag ? (
              <span className="text-base leading-none">{flag}</span>
            ) : (
              <Globe className="h-3.5 w-3.5 shrink-0 text-gray-400" />
            )}
            {!compact && <span className="truncate">{nativeName || placeholder}</span>}
          </span>
          <ChevronsUpDown className="ms-1 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[280px] p-0 border-gray-700 bg-gray-900 shadow-xl"
        align={align}
      >
        <Command className="bg-transparent border-none">
          <CommandInput
            placeholder={searchPlaceholder}
            className="text-sm border-none focus:ring-0 text-white placeholder:text-gray-400"
          />
          <CommandList className="max-h-[300px] overflow-y-auto">
            <CommandEmpty className="py-4 text-center text-sm text-gray-400">
              {emptyLabel}
            </CommandEmpty>

            {groups.map((group) => (
              <CommandGroup
                key={group.region}
                heading={group.label}
                className="text-gray-400 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider"
              >
                {group.languages.map((language) => (
                  <CommandItem
                    key={language.code}
                    // Search both endonym and exonym so "Japanese" and "日本語"
                    // both find the same entry.
                    value={`${language.name} ${language.englishName} ${language.code}`}
                    onSelect={() => {
                      onValueChange(language.code)
                      setOpen(false)
                    }}
                    className={cn(
                      'flex items-center justify-between text-sm py-1.5 px-3 cursor-pointer text-gray-200',
                      "data-[selected='true']:bg-cyan-600/20 data-[selected='true']:text-cyan-300",
                      value === language.code && 'bg-gray-800/50 font-medium'
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {LOCALE_FLAGS[language.code] && (
                        <span className="text-base leading-none">
                          {LOCALE_FLAGS[language.code]}
                        </span>
                      )}
                      <span className="truncate">{language.name}</span>
                      {language.englishName !== language.name && (
                        <span className="text-xs text-gray-500 truncate">
                          {language.englishName}
                        </span>
                      )}
                      {renderItemSuffix?.(language)}
                    </div>
                    {value === language.code && (
                      <Check className="h-4 w-4 text-cyan-400 shrink-0" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
