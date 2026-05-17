'use client'

import { useState, useEffect } from 'react'
import { Globe, Check, Search, ChevronDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const LANGUAGES = [
  { code: 'en', name: 'English', region: 'Americas/Europe' },
  { code: 'es', name: 'Español', region: 'Americas/Europe' },
  { code: 'fr', name: 'Français', region: 'Europe/Americas' },
  { code: 'pt', name: 'Português', region: 'Americas/Europe' },
  { code: 'de', name: 'Deutsch', region: 'Europe' },
  { code: 'it', name: 'Italiano', region: 'Europe' },
  { code: 'nl', name: 'Nederlands', region: 'Europe' },
  { code: 'pl', name: 'Polski', region: 'Europe' },
  { code: 'zh-CN', name: '中文 (简体)', region: 'Asia Pacific' },
  { code: 'ja', name: '日本語', region: 'Asia Pacific' },
  { code: 'ko', name: '한국어', region: 'Asia Pacific' },
  { code: 'hi', name: 'हिन्दी', region: 'Asia Pacific' },
  { code: 'ar', name: 'العربية', region: 'Middle East' },
]

export function LanguageSelector() {
  const [currentLang, setCurrentLang] = useState('en')
  const [search, setSearch] = useState('')

  useEffect(() => {
    // Try to get current language from Google Translate cookie
    const match = document.cookie.match(/googtrans=\/en\/([a-zA-Z-]+)/)
    if (match && match[1]) {
      setCurrentLang(match[1])
    }
  }, [])

  const handleSelect = (code: string) => {
    setCurrentLang(code)
    
    // Attempt to use the hidden Google Translate widget
    const select = document.querySelector('.goog-te-combo') as HTMLSelectElement
    if (select) {
      select.value = code
      select.dispatchEvent(new Event('change'))
    } else {
      // Fallback: set cookie and reload
      document.cookie = `googtrans=/en/${code}; path=/`
      document.cookie = `googtrans=/en/${code}; domain=${window.location.hostname}; path=/`
      window.location.reload()
    }
  }

  const filteredLangs = LANGUAGES.filter(l => 
    l.name.toLowerCase().includes(search.toLowerCase()) || 
    l.region.toLowerCase().includes(search.toLowerCase())
  )

  const grouped = filteredLangs.reduce((acc, lang) => {
    const region = lang.region
    if (!acc[region]) acc[region] = []
    acc[region].push(lang)
    return acc
  }, {} as Record<string, typeof LANGUAGES>)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-1.5 px-3 py-2 text-gray-300 hover:text-white transition-colors cursor-pointer font-medium rounded-lg hover:bg-slate-800/50">
          <Globe className="w-4 h-4" />
          <span className="hidden sm:inline uppercase text-sm">{currentLang}</span>
          <ChevronDown className="w-3 h-3 text-gray-500" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 p-2 bg-slate-900 border-slate-800">
        <div className="relative mb-2">
          <Search className="w-4 h-4 absolute left-2 top-2.5 text-gray-500" />
          <input 
            type="text" 
            placeholder="Search languages..." 
            className="w-full bg-slate-800 text-white rounded-md pl-8 pr-3 py-2 text-sm border border-slate-700 focus:outline-none focus:border-sf-primary"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        
        <div className="max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
          {Object.entries(grouped).map(([region, langs]) => (
            <div key={region} className="mb-3">
              <div className="px-2 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider sticky top-0 bg-slate-900/95 backdrop-blur-sm z-10">
                {region}
              </div>
              <div className="space-y-1">
                {langs.map(lang => (
                  <button
                    key={lang.code}
                    onClick={() => handleSelect(lang.code)}
                    className={`w-full flex items-center justify-between px-2 py-2 rounded-md text-sm transition-colors ${
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
            <div className="text-center py-4 text-sm text-gray-500">
              No languages found
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
