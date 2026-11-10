'use client'

import React, { useState } from 'react'
import { Globe } from 'lucide-react'
import { useTranslations } from 'next-intl'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { VideoLocale, VideoLocaleId } from '@/config/landing/videoLocales'
import { cn } from '@/lib/utils'

export type VideoLanguageControlProps = {
  locales: VideoLocale[]
  activeLocaleId: VideoLocaleId
  onSelect: (id: VideoLocaleId) => void
  soonLabel: string
  /** inline = slim row above player; overlay = on the video frame */
  variant?: 'inline' | 'overlay'
  align?: 'start' | 'end'
  className?: string
  /** Prevents hero video click-to-theater when interacting with the control */
  markAsHeroControl?: boolean
  /** Called when the dropdown opens or closes (used to suppress click-through) */
  onOpenChange?: (open: boolean) => void
}

/**
 * Icon-only Globe language control with tooltip for landing video players.
 */
export function VideoLanguageControl({
  locales,
  activeLocaleId,
  onSelect,
  soonLabel,
  variant = 'inline',
  align = 'start',
  className,
  markAsHeroControl = false,
  onOpenChange,
}: VideoLanguageControlProps) {
  const tHero = useTranslations('hero')
  const [menuOpen, setMenuOpen] = useState(false)

  const stopPointerPropagation = (event: React.SyntheticEvent) => {
    event.stopPropagation()
  }

  const handleOpenChange = (nextOpen: boolean) => {
    setMenuOpen(nextOpen)
    onOpenChange?.(nextOpen)
  }

  const handleSelect = (value: string) => {
    handleOpenChange(false)
    onSelect(value as VideoLocaleId)
  }

  const nativeLabelOf = (id: VideoLocaleId) => tHero(`heroVideoLanguages.${id}.nativeLabel`)
  const labelOf = (id: VideoLocaleId) => tHero(`heroVideoLanguages.${id}.label`)
  /** Null for English-named languages, where both labels read the same. */
  const secondaryLabelOf = (id: VideoLocaleId) => {
    const label = labelOf(id)
    return label === nativeLabelOf(id) ? null : label
  }

  const active = locales.find((locale) => locale.id === activeLocaleId)
  const menuLabel = 'Language'
  const tooltipLabel = active ? `${menuLabel} (${nativeLabelOf(active.id)})` : menuLabel

  return (
    <div
      className={cn(
        variant === 'overlay' && 'absolute top-3 z-10',
        variant === 'overlay' && (align === 'end' ? 'right-3' : 'left-3'),
        className
      )}
      {...(markAsHeroControl ? { 'data-hero-control': '' } : {})}
      onPointerDown={stopPointerPropagation}
      onClick={stopPointerPropagation}
    >
      <DropdownMenu open={menuOpen} onOpenChange={handleOpenChange}>
        <TooltipProvider delayDuration={150}>
          <Tooltip open={menuOpen ? false : undefined}>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label={tooltipLabel}
                  onPointerDown={stopPointerPropagation}
                  onClick={stopPointerPropagation}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/20 bg-black/65 text-gray-200 backdrop-blur-sm transition-colors hover:border-cyan-400/50 hover:bg-black/85 hover:text-white"
                >
                  <Globe className="h-4 w-4 shrink-0 text-cyan-400" aria-hidden />
                </button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent
              side="bottom"
              className="z-[120] border border-white/15 bg-slate-900/95 px-2.5 py-1 text-xs font-medium text-white shadow-lg backdrop-blur-md"
            >
              {tooltipLabel}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <DropdownMenuContent
          align={align}
          className="z-[110] w-60 border-white/10 bg-slate-900 text-gray-100"
          onPointerDown={stopPointerPropagation}
          onClick={stopPointerPropagation}
          onCloseAutoFocus={(event) => event.preventDefault()}
        >
          <DropdownMenuLabel className="text-xs font-medium text-gray-400">
            {menuLabel}
          </DropdownMenuLabel>
          <DropdownMenuRadioGroup value={activeLocaleId} onValueChange={handleSelect}>
            {locales.map((locale) => {
              const secondaryLabel = secondaryLabelOf(locale.id)

              return (
                <DropdownMenuRadioItem
                  key={locale.id}
                  value={locale.id}
                  disabled={!locale.available}
                  className="gap-2 py-2 focus:bg-white/10 focus:text-white"
                >
                  <span className="font-medium">{nativeLabelOf(locale.id)}</span>
                  {secondaryLabel ? (
                    <span className="text-xs text-gray-400">{secondaryLabel}</span>
                  ) : null}
                  {!locale.available ? (
                    <span className="ml-auto text-[10px] uppercase tracking-wide text-gray-500">
                      {soonLabel}
                    </span>
                  ) : null}
                </DropdownMenuRadioItem>
              )
            })}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

/** @deprecated Use VideoLanguageControl */
export const VideoLanguagePicker = VideoLanguageControl

export default VideoLanguageControl
