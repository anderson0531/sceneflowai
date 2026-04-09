'use client'

import * as React from 'react'
import { Check, ChevronsUpDown, Search, Globe, Mic, Sparkles } from 'lucide-react'

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
export type SelectorIntent = 'navigate' | 'generate'

export interface GroupedLanguageSelectorProps {
  value: string
  onValueChange: (code: string) => void
  filterCodes?: string[]
  showFlags?: boolean
  size?: SelectorSize
  intent?: SelectorIntent
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
  intent = 'navigate',
  className,
  disabled = false,
  placeholder,
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

  const defaultPlaceholder = intent === 'generate' ? 'Generate language...' : 'View language...'
  const finalPlaceholder = placeholder || defaultPlaceholder

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'justify-between font-normal transition-colors',
            SIZE_CLASSES[size],
            intent === 'generate' 
              ? 'bg-indigo-900/40 border-indigo-700/50 text-indigo-100 hover:bg-indigo-800/60 hover:text-white shadow-[0_0_10px_rgba(79,70,229,0.15)]' 
              : 'bg-gray-800 border-gray-700 text-gray-200 hover:bg-gray-700 hover:text-white',
            className
          )}
        >
          <span className="flex items-center gap-1.5 truncate">
            {intent === 'generate' ? (
              <Sparkles className={cn("h-3.5 w-3.5 shrink-0", selectedDisplay ? "text-indigo-400" : "text-indigo-500/70")} />
            ) : (
              <Globe className={cn("h-3.5 w-3.5 shrink-0", selectedDisplay ? "text-gray-400" : "text-gray-500")} />
            )}
            {selectedDisplay || finalPlaceholder}
          </span>
          <ChevronsUpDown className={cn(
            "ml-2 h-3.5 w-3.5 shrink-0 opacity-50",
            intent === 'generate' ? "text-indigo-300" : ""
          )} />
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
