'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { translateGuideDialogueLine } from '@/lib/scene/translateGuideDialogue'

export interface TranslatableLine {
  id: string
  englishText: string
}

export function useVeoDialogueTranslations(
  lines: TranslatableLine[],
  targetLanguage: string,
  enabled: boolean
) {
  const [translatedById, setTranslatedById] = useState<Record<string, string>>({})
  const [isTranslating, setIsTranslating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requestIdRef = useRef(0)

  const translateAll = useCallback(async () => {
    if (!enabled || targetLanguage === 'en' || lines.length === 0) {
      setTranslatedById({})
      setIsTranslating(false)
      setError(null)
      return
    }

    const requestId = ++requestIdRef.current
    setIsTranslating(true)
    setError(null)

    try {
      const entries = await Promise.all(
        lines.map(async (line) => {
          const text = line.englishText.trim()
          if (!text) {
            return [line.id, ''] as const
          }
          const translated = await translateGuideDialogueLine(text, targetLanguage)
          return [line.id, translated] as const
        })
      )

      if (requestId !== requestIdRef.current) return

      setTranslatedById(Object.fromEntries(entries))
    } catch (e) {
      if (requestId !== requestIdRef.current) return
      setError(e instanceof Error ? e.message : 'Translation failed')
    } finally {
      if (requestId === requestIdRef.current) {
        setIsTranslating(false)
      }
    }
  }, [lines, targetLanguage, enabled])

  useEffect(() => {
    const timer = setTimeout(() => {
      void translateAll()
    }, 400)
    return () => clearTimeout(timer)
  }, [translateAll])

  return {
    translatedById,
    isTranslating,
    error,
    refresh: translateAll,
  }
}
