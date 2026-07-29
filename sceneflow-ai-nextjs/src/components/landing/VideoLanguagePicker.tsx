'use client'

import { ChevronDown, Languages } from 'lucide-react'
import { useTranslations } from 'next-intl'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
 * Compact language control for landing video players — dropdown at all breakpoints.
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

  const stopPointerPropagation = (event: React.SyntheticEvent) => {
    event.stopPropagation()
  }

  const handleSelect = (value: string) => {
    onOpenChange?.(false)
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
      <DropdownMenu onOpenChange={onOpenChange}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={menuLabel}
            onPointerDown={stopPointerPropagation}
            onClick={stopPointerPropagation}
            className={cn(
              'flex items-center gap-1.5 rounded-lg border border-white/15 bg-black/50 px-2.5 py-1.5 text-xs font-medium text-gray-200 transition-colors hover:border-cyan-400/40 hover:text-white',
              variant === 'inline' && 'w-full max-w-xs'
            )}
          >
            <Languages className="h-3.5 w-3.5 shrink-0 text-gray-400" aria-hidden />
            <span className="truncate">{active ? nativeLabelOf(active.id) : ''}</span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-gray-400" aria-hidden />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align={align}
          className="w-60 border-white/10 bg-slate-900 text-gray-100"
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
