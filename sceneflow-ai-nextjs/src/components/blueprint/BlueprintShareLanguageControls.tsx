'use client'

import { useEffect } from 'react'
import { Globe } from 'lucide-react'
import { GroupedLanguageSelector } from '@/components/vision/GroupedLanguageSelector'
import { GoogleTranslate } from '@/app/components/GoogleTranslate'
import { toGoogleTranslateCode } from '@/constants/veoLanguages'
import {
  formatPortalCopy,
  resolveClientPortalLocale,
  SUPPORTED_CLIENT_PORTAL_LOCALES,
  toBlueprintReviewLanguageCode,
} from '@/lib/intake/clientPortalCopy'

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

  const activePortalLocale = resolveClientPortalLocale(language)
  const normalizedSelectValue = language === 'zh-CN' ? 'zh' : language

  return (
    <div className={className}>
      {enableGoogleTranslate ? <GoogleTranslate /> : null}
      <div className="flex flex-wrap items-center gap-2">
        <Globe className="h-4 w-4 text-purple-400 shrink-0" />
        <span className="text-xs text-gray-400">
          {formatPortalCopy(activePortalLocale, 'languageLabel')}
        </span>
        <div className="flex flex-wrap items-center gap-1">
          {SUPPORTED_CLIENT_PORTAL_LOCALES.map((loc) => {
            const targetCode = toBlueprintReviewLanguageCode(loc.code)
            const isActive =
              normalizedSelectValue === targetCode || language === loc.code
            return (
              <button
                key={loc.code}
                type="button"
                onClick={() => onLanguageChange(targetCode)}
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition border ${
                  isActive
                    ? 'border-purple-400/70 bg-purple-600/30 text-white'
                    : 'border-gray-700/80 bg-gray-900/70 text-gray-300 hover:border-gray-500 hover:text-white'
                }`}
              >
                {loc.label}
              </button>
            )
          })}
        </div>
        <GroupedLanguageSelector
          value={normalizedSelectValue}
          onValueChange={onLanguageChange}
          size="sm"
          intent="navigate"
          className="min-w-[150px]"
        />
      </div>
    </div>
  )
}
