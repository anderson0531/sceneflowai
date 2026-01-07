'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '@/constants/languages'

// Extended languages with flags for UI display
export interface LanguageOption extends SupportedLanguage {
  flag: string
  nativeName: string
  rtl?: boolean
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English', voice: 'en-US-Studio-M', flag: '🇺🇸' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', voice: 'es-ES-Neural2-B', flag: '🇪🇸' },
  { code: 'fr', name: 'French', nativeName: 'Français', voice: 'fr-FR-Neural2-B', flag: '🇫🇷' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', voice: 'de-DE-Neural2-B', flag: '🇩🇪' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', voice: 'it-IT-Neural2-C', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', voice: 'pt-BR-Neural2-B', flag: '🇧🇷' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', voice: 'cmn-CN-Wavenet-B', flag: '🇨🇳' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', voice: 'ja-JP-Neural2-C', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', voice: 'ko-KR-Neural2-C', flag: '🇰🇷' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย', voice: 'th-TH-Neural2-C', flag: '🇹🇭' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', voice: 'hi-IN-Neural2-B', flag: '🇮🇳' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', voice: 'ar-XA-Wavenet-B', flag: '🇸🇦', rtl: true },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', voice: 'ru-RU-Wavenet-B', flag: '🇷🇺' },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית', voice: 'he-IL-Wavenet-A', flag: '🇮🇱', rtl: true },
]

// RTL language codes
export const RTL_LANGUAGES = ['ar', 'he', 'fa', 'ur']

// Cache key prefix
const CACHE_PREFIX = 'sf-translation-'
const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000 // 7 days

interface TranslationCache {
  [key: string]: {
    text: string
    timestamp: number
  }
}

interface LanguageContextType {
  language: string
  setLanguage: (lang: string) => void
  languageOption: LanguageOption | undefined
  isRTL: boolean
  translateText: (text: string, targetLang?: string) => Promise<string>
  translateBatch: (texts: string[], targetLang?: string) => Promise<string[]>
  isTranslating: boolean
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  languageOption: LANGUAGE_OPTIONS[0],
  isRTL: false,
  translateText: async (text) => text,
  translateBatch: async (texts) => texts,
  isTranslating: false,
})

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<string>('en')
  const [isTranslating, setIsTranslating] = useState(false)
  const translationCache = useRef<TranslationCache>({})

  // Load language from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('sceneflow-language')
    if (stored && LANGUAGE_OPTIONS.some(l => l.code === stored)) {
      setLanguageState(stored)
    }
    
    // Load translation cache from localStorage
    try {
      const cachedTranslations = localStorage.getItem('sceneflow-translation-cache')
      if (cachedTranslations) {
        const parsed = JSON.parse(cachedTranslations)
        // Filter out expired entries
        const now = Date.now()
        Object.keys(parsed).forEach(key => {
          if (now - parsed[key].timestamp > CACHE_EXPIRY) {
            delete parsed[key]
          }
        })
        translationCache.current = parsed
      }
    } catch (e) {
      console.warn('[LanguageContext] Failed to load translation cache:', e)
    }
  }, [])

  // Update HTML lang and dir attributes when language changes
  useEffect(() => {
    document.documentElement.lang = language
    const isRTL = RTL_LANGUAGES.includes(language)
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr'
    document.body.classList.toggle('rtl', isRTL)
  }, [language])

  const setLanguage = useCallback((lang: string) => {
    setLanguageState(lang)
    localStorage.setItem('sceneflow-language', lang)
  }, [])

  const languageOption = LANGUAGE_OPTIONS.find(l => l.code === language)
  const isRTL = RTL_LANGUAGES.includes(language)

  // Save cache to localStorage periodically
  const saveCacheToStorage = useCallback(() => {
    try {
      localStorage.setItem('sceneflow-translation-cache', JSON.stringify(translationCache.current))
    } catch (e) {
      console.warn('[LanguageContext] Failed to save translation cache:', e)
    }
  }, [])

  // Generate cache key
  const getCacheKey = (text: string, targetLang: string) => {
    return `${targetLang}:${text.slice(0, 100)}` // Limit key length
  }

  // Translate single text
  const translateText = useCallback(async (text: string, targetLang?: string): Promise<string> => {
    const target = targetLang || language
    
    // Skip if source and target are the same (English)
    if (target === 'en') return text
    if (!text?.trim()) return text

    // Check cache first
    const cacheKey = getCacheKey(text, target)
    const cached = translationCache.current[cacheKey]
    if (cached && Date.now() - cached.timestamp < CACHE_EXPIRY) {
      return cached.text
    }

    try {
      setIsTranslating(true)
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, targetLanguage: target }),
      })

      if (!response.ok) {
        console.error('[LanguageContext] Translation failed:', response.status)
        return text
      }

      const data = await response.json()
      const translatedText = data.translatedText || text

      // Cache the result
      translationCache.current[cacheKey] = {
        text: translatedText,
        timestamp: Date.now(),
      }
      saveCacheToStorage()

      return translatedText
    } catch (error) {
      console.error('[LanguageContext] Translation error:', error)
      return text
    } finally {
      setIsTranslating(false)
    }
  }, [language, saveCacheToStorage])

  // Translate batch of texts
  const translateBatch = useCallback(async (texts: string[], targetLang?: string): Promise<string[]> => {
    const target = targetLang || language
    
    if (target === 'en') return texts
    if (!texts?.length) return texts

    // Check cache for all texts
    const results: (string | null)[] = texts.map(text => {
      if (!text?.trim()) return text
      const cacheKey = getCacheKey(text, target)
      const cached = translationCache.current[cacheKey]
      if (cached && Date.now() - cached.timestamp < CACHE_EXPIRY) {
        return cached.text
      }
      return null
    })

    // Find texts that need translation
    const needsTranslation = texts.filter((_, i) => results[i] === null)
    
    if (needsTranslation.length === 0) {
      return results as string[]
    }

    try {
      setIsTranslating(true)
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts: needsTranslation, targetLanguage: target }),
      })

      if (!response.ok) {
        console.error('[LanguageContext] Batch translation failed:', response.status)
        return texts
      }

      const data = await response.json()
      const translatedTexts: string[] = data.translatedTexts || needsTranslation

      // Fill in translated texts and cache them
      let translatedIndex = 0
      for (let i = 0; i < results.length; i++) {
        if (results[i] === null) {
          const originalText = texts[i]
          const translatedText = translatedTexts[translatedIndex++] || originalText
          results[i] = translatedText
          
          // Cache the result
          const cacheKey = getCacheKey(originalText, target)
          translationCache.current[cacheKey] = {
            text: translatedText,
            timestamp: Date.now(),
          }
        }
      }
      saveCacheToStorage()

      return results as string[]
    } catch (error) {
      console.error('[LanguageContext] Batch translation error:', error)
      return texts
    } finally {
      setIsTranslating(false)
    }
  }, [language, saveCacheToStorage])

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        languageOption,
        isRTL,
        translateText,
        translateBatch,
        isTranslating,
      }}
    >
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}

// Hook for translating component text with auto-update
export function useTranslatedText(text: string): string {
  const { language, translateText } = useLanguage()
  const [translated, setTranslated] = useState(text)

  useEffect(() => {
    if (language === 'en') {
      setTranslated(text)
      return
    }

    translateText(text).then(setTranslated)
  }, [text, language, translateText])

  return translated
}

// Component for inline translations - usage: <T>Hello World</T>
interface TProps {
  children: string
  as?: keyof JSX.IntrinsicElements
  className?: string
}

export function T({ children, as: Component = 'span', className }: TProps) {
  const translated = useTranslatedText(children)
  
  // If no change or same text, render without wrapper to avoid extra DOM nodes
  if (Component === 'span' && !className && translated === children) {
    return <>{translated}</>
  }
  
  return <Component className={className}>{translated}</Component>
}

// Hook for batch translating multiple strings at once
export function useTranslatedTexts(texts: string[]): string[] {
  const { language, translateBatch } = useLanguage()
  const [translated, setTranslated] = useState<string[]>(texts)
  const textsKey = texts.join('||')

  useEffect(() => {
    if (language === 'en') {
      setTranslated(texts)
      return
    }

    translateBatch(texts).then(setTranslated)
  }, [textsKey, language, translateBatch])

  return translated
}
