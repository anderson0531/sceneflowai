'use client'

import { useEffect } from 'react'
import { Globe } from 'lucide-react'
import { GroupedLanguageSelector } from '@/components/vision/GroupedLanguageSelector'
import { GoogleTranslate } from '@/app/components/GoogleTranslate'
import { toGoogleTranslateCode } from '@/constants/veoLanguages'

export function applyGoogleTranslateLanguage(code: string) {
  if (typeof document === 'undefined') return
  const gt = code === 'en' ? 'en' : toGoogleTranslateCode(code)
  const select = document.querySelector('.goog-te-combo') as HTMLSelectElement | null
  if (select) {
    select.value = gt
    select.dispatchEvent(new Event('change'))
    return
  }
  document.cookie = `googtrans=/en/${gt}; path=/`
  document.cookie = `googtrans=/en/${gt}; domain=${window.location.hostname}; path=/`
}

type Props = {
  language: string
  onLanguageChange: (code: string) => void
  /** When true, also drive Google page translation for read fallback. */
  enableGoogleTranslate?: boolean
  className?: string
}

export function BlueprintShareLanguageControls({
  language,
  onLanguageChange,
  enableGoogleTranslate = true,
  className,
}: Props) {
  useEffect(() => {
    if (!enableGoogleTranslate || language === 'en') return
    const t = window.setTimeout(() => applyGoogleTranslateLanguage(language), 600)
    return () => window.clearTimeout(t)
  }, [language, enableGoogleTranslate])

  return (
    <div className={className}>
      {enableGoogleTranslate ? <GoogleTranslate /> : null}
      <div className="flex flex-wrap items-center gap-2">
        <Globe className="h-4 w-4 text-purple-400 shrink-0" />
        <span className="text-xs text-gray-400">Language</span>
        <GroupedLanguageSelector
          value={language}
          onValueChange={onLanguageChange}
          size="sm"
          intent="navigate"
          className="min-w-[160px]"
        />
      </div>
    </div>
  )
}
