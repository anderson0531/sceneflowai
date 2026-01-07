'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Globe, Check, ChevronDown, Loader2 } from 'lucide-react'
import { useLanguage, LANGUAGE_OPTIONS } from '@/contexts/LanguageContext'
import { cn } from '@/lib/utils'

interface LanguageSelectorProps {
  className?: string
  compact?: boolean
}

export function LanguageSelector({ className, compact = false }: LanguageSelectorProps) {
  const { language, setLanguage, languageOption, isTranslating } = useLanguage()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Debug log on mount
  useEffect(() => {
    console.log('🎯🎯🎯 [LanguageSelector] MOUNTED - Current language:', language, '🎯🎯🎯')
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close on escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  const handleSelect = (code: string) => {
    console.log('🎯🎯🎯 [LanguageSelector] LANGUAGE SELECTED:', code, '(was:', language, ') 🎯🎯🎯')
    setLanguage(code)
    setIsOpen(false)
  }

  return (
    <div ref={dropdownRef} className={cn('relative', className)}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-1.5 rounded-md transition-colors',
          'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white',
          'hover:bg-gray-100 dark:hover:bg-gray-800/60',
          compact ? 'p-2' : 'px-3 py-2'
        )}
        aria-label="Select language"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        {isTranslating ? (
          <Loader2 size={20} className="animate-spin" />
        ) : (
          <>
            {compact ? (
              <Globe size={20} />
            ) : (
              <>
                <span className="text-lg" role="img" aria-label={languageOption?.name}>
                  {languageOption?.flag || '🌐'}
                </span>
                <span className="text-sm font-medium hidden sm:inline">
                  {languageOption?.code.toUpperCase()}
                </span>
                <ChevronDown size={14} className={cn(
                  'transition-transform duration-200',
                  isOpen && 'rotate-180'
                )} />
              </>
            )}
          </>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div 
          className={cn(
            'absolute top-full right-0 mt-2 z-50',
            'w-56 max-h-80 overflow-y-auto',
            'bg-white dark:bg-gray-900 rounded-lg shadow-xl',
            'border border-gray-200 dark:border-gray-700',
            'py-1'
          )}
          role="listbox"
          aria-label="Language options"
        >
          {LANGUAGE_OPTIONS.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleSelect(lang.code)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors',
                'hover:bg-gray-100 dark:hover:bg-gray-800',
                language === lang.code && 'bg-cyan-50 dark:bg-cyan-900/20'
              )}
              role="option"
              aria-selected={language === lang.code}
            >
              <span className="text-xl" role="img" aria-label={lang.name}>
                {lang.flag}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {lang.name}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {lang.nativeName}
                </div>
              </div>
              {language === lang.code && (
                <Check size={16} className="text-cyan-500 flex-shrink-0" />
              )}
              {lang.rtl && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                  RTL
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
