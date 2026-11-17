'use client'

import { useState, useSyncExternalStore } from 'react'
import { Globe, Check, Search, ChevronDown, Loader2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LANDING_TRANSLATE_LANGUAGES } from '@/config/landingTranslateLanguages'
import { useTranslations } from 'next-intl'
import { TIER_A_LOCALES } from '@/i18n/locale'
import {
  getLocaleSwitchServerState,
  getLocaleSwitchState,
  subscribeLocaleSwitch,
} from '@/i18n/localeSwitchStatus'
import { useLandingLocale } from '@/i18n/useLandingLocale'

const LANGUAGES = LANDING_TRANSLATE_LANGUAGES

type LanguageSelectorProps = {
  /** Compact globe-only trigger for the mobile header bar. */
  variant?: 'default' | 'icon'
}

export function LanguageSelector({ variant = 'default' }: LanguageSelectorProps) {
  const t = useTranslations('nav')
  const { locale: currentLang, switchLocale, prefetchLocale } = useLandingLocale()
  const switchState = useSyncExternalStore(
    subscribeLocaleSwitch,
    getLocaleSwitchState,
    getLocaleSwitchServerState
  )
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (nextOpen) {
      prefetchLocale('en')
      for (const tierLocale of TIER_A_LOCALES) {
        prefetchLocale(tierLocale)
      }
    }
  }

  const handleSelect = (code: string) => {
    setOpen(false)
    switchLocale(code)
  }

  const filteredLangs = LANGUAGES.filter(
    (l) =>
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.region.toLowerCase().includes(search.toLowerCase())
  )

  const grouped = filteredLangs.reduce(
    (acc, lang) => {
      const region = lang.region
      if (!acc[region]) acc[region] = []
      acc[region].push(lang)
      return acc
    },
    {} as Record<string, typeof LANGUAGES>
  )

  const currentLanguageName =
    LANGUAGES.find((l) => l.code === currentLang)?.name ?? currentLang
  const isIcon = variant === 'icon'

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          title={currentLanguageName}
          aria-label={currentLanguageName}
          aria-busy={switchState.pending}
          className={
            isIcon
              ? 'flex items-center justify-center p-2 text-gray-300 hover:text-white transition-colors cursor-pointer rounded-lg hover:bg-slate-800/50'
              : 'flex items-center gap-1.5 px-3 py-2 text-gray-300 hover:text-white transition-colors cursor-pointer font-medium rounded-lg hover:bg-slate-800/50'
          }
        >
          {switchState.pending ? (
            <Loader2
              className={`${isIcon ? 'w-6 h-6' : 'w-4 h-4'} animate-spin text-cyan-400`}
              aria-hidden
            />
          ) : (
            <Globe className={isIcon ? 'w-6 h-6' : 'w-4 h-4'} />
          )}
          {!isIcon && (
            <>
              <span className="hidden sm:inline uppercase text-sm">
                {switchState.pending ? switchState.locale : currentLang}
              </span>
              <ChevronDown className="w-3 h-3 text-gray-500" />
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 p-2 bg-slate-900 border-slate-800">
        <div className="relative mb-2">
          <Search className="w-4 h-4 absolute left-2 top-2.5 text-gray-500" />
          <input
            type="text"
            placeholder={t('searchLanguages')}
            className="w-full bg-slate-800 text-white rounded-md pl-8 pr-3 py-2 text-sm border border-slate-700 focus:outline-none focus:border-sf-primary"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
          {Object.entries(grouped).map(([region, langs]) => (
            <div key={region} className="mb-3">
              <div className="px-2 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider sticky top-0 bg-slate-900/95 backdrop-blur-sm z-10">
                {region}
              </div>
              <div className="space-y-1">
                {langs.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    onMouseEnter={() => prefetchLocale(lang.code)}
                    onFocus={() => prefetchLocale(lang.code)}
                    onClick={() => handleSelect(lang.code)}
                    className={`w-full flex items-center justify-between px-2 py-2 rounded-md text-sm transition-colors cursor-pointer ${
                      currentLang === lang.code
                        ? 'bg-sf-primary/10 text-sf-primary font-medium'
                        : 'text-gray-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    {lang.name}
                    {currentLang === lang.code && <Check className="w-4 h-4" />}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {filteredLangs.length === 0 && (
            <div className="text-center py-4 text-sm text-gray-500">{t('noLanguagesFound')}</div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
