'use client'

import * as React from 'react'
import { Check, ChevronsUpDown, Search, Globe } from 'lucide-react'

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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  FLAG_EMOJIS,
  getLanguagesByRegion,
  type SupportedLanguage,
} from '@/constants/languages'

// ─── Size presets ────────────────────────────────────────────────────────────
const SIZE_CLASSES = {
  xs: 'w-[140px] h-7 text-xs',
  sm: 'w-[160px] h-8 text-xs',
  md: 'w-[200px] h-9 text-sm',
} as const

export type SelectorSize = keyof typeof SIZE_CLASSES

export interface GroupedLanguageSelectorProps {
  value: string
  onValueChange: (code: string) => void
  filterCodes?: string[]
  showFlags?: boolean
  size?: SelectorSize
  className?: string
  disabled?: boolean
  placeholder?: string
  renderItemSuffix?: (lang: SupportedLanguage) => React.ReactNode
}

export function GroupedLanguageSelector({
  value,
  onValueChange,
  filterCodes,
  showFlags = true,
  size = 'sm',
  className,
  disabled = false,
  placeholder = 'Select language...',
  renderItemSuffix,
}: GroupedLanguageSelectorProps) {
  const [open, setOpen] = React.useState(false)

  const groups = React.useMemo(
    () => getLanguagesByRegion(filterCodes),
    [filterCodes]
  )

  const selectedLang = React.useMemo(() => {
    for (const g of groups) {
      const lang = g.languages.find(l => l.code === value)
      if (lang) return lang
    }
    return null
  }, [groups, value])

  const selectedDisplay = selectedLang
    ? `${showFlags ? (FLAG_EMOJIS[selectedLang.code] ?? '') : ''} ${selectedLang.name}`.trim()
    : undefined

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'justify-between bg-gray-800 border-gray-700 text-white font-normal hover:bg-gray-700 hover:text-white',
            SIZE_CLASSES[size],
            className
          )}
        >
          <span className="flex items-center gap-1.5 truncate">
            {selectedDisplay || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0 border-gray-700 bg-gray-900 shadow-xl" align="start">
        <Command className="bg-transparent border-none">
          <CommandInput 
            placeholder="Search language..." 
            className="text-sm border-none focus:ring-0 text-white placeholder:text-gray-400"
          />
          <CommandList className="max-h-[300px] overflow-y-auto">
            <CommandEmpty className="py-4 text-center text-sm text-gray-400">
              No language found.
            </CommandEmpty>
            
            {groups.map(group => (
              <CommandGroup 
                key={group.region} 
                heading={group.label}
                className="text-gray-400 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider"
              >
                {group.languages.map(lang => {
                  const flag = showFlags ? (FLAG_EMOJIS[lang.code] ?? '') : ''
                  return (
                    <CommandItem
                      key={lang.code}
                      value={lang.name} // Search operates on the value property
                      onSelect={() => {
                        onValueChange(lang.code)
                        setOpen(false)
                      }}
                      className={cn(
                        "flex items-center justify-between text-sm py-1.5 px-3 cursor-pointer text-gray-200",
                        "data-[selected='true']:bg-emerald-600/20 data-[selected='true']:text-emerald-400",
                        value === lang.code && "bg-gray-800/50 font-medium"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {flag && <span className="text-base leading-none">{flag}</span>}
                        <span>{lang.name}</span>
                        {renderItemSuffix?.(lang)}
                      </div>
                      {value === lang.code && (
                        <Check className="h-4 w-4 text-emerald-500" />
                      )}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
