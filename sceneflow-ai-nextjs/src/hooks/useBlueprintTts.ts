'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { DEFAULT_BLUEPRINT_GEMINI_VOICE } from '@/lib/tts/blueprintTtsConstants'
import { formatGeminiVoiceSelectedLabel } from '@/lib/tts/geminiVoiceCatalog'
import { toGoogleTranslateCode } from '@/constants/veoLanguages'
import { useUiLocale } from '@/i18n/useUiLocale'
import { toTtsLanguageCode } from '@/i18n/languageCodeBridge'
import { chunkNarrationText } from '@/lib/blueprint/narrationChunks'

const DIRECTOR_NOTES_STORAGE_KEY = 'sceneflow-blueprint-tts-director-notes'

/**
 * Narration is chunked so a long read is not one enormous synthesis request.
 * Sentence-aware at ~1500 characters: bigger than the old 1200 hard slice, so
 * fewer round trips, and split on boundaries so no clip ends mid-word.
 */
const NARRATION_CHUNK_CHARS = 1500

/**
 * Clips generated ahead of the one playing. Playback is strictly ordered, so
 * this is what hides synthesis latency: while clip N plays, N+1 and N+2 are
 * already being made. It also bounds the waste when someone stops early.
 */
const NARRATION_LOOKAHEAD = 2

export type BlueprintTtsGenerationProgress = {
  current: number
  total: number
  phase: 'translating' | 'generating' | 'playing'
}

export type BlueprintGeminiVoice = { id: string; name: string; gender?: string }

export function useBlueprintTts() {
  const { locale: uiLocale } = useUiLocale()
  const headerTtsLanguage = toTtsLanguageCode(uiLocale)
  const [voices, setVoices] = useState<BlueprintGeminiVoice[]>([])
  const [enabled, setEnabled] = useState(false)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>(DEFAULT_BLUEPRINT_GEMINI_VOICE)
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>('Kore (Female)')
  const [directorNotes, setDirectorNotes] = useState('')
  const [audioMenuOpen, setAudioMenuOpen] = useState(false)
  const [voiceDialogOpen, setVoiceDialogOpen] = useState(false)
  const [directorNotesDialogOpen, setDirectorNotesDialogOpen] = useState(false)
  const [selectedLanguage, setSelectedLanguage] = useState(headerTtsLanguage)
  const [languageOverride, setLanguageOverride] = useState(false)
  const [generationProgress, setGenerationProgress] =
    useState<BlueprintTtsGenerationProgress | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const queueAbortRef = useRef({ abort: false })
  const translationCacheRef = useRef<Map<string, string>>(new Map())
  /** Aborts synthesis still in flight when playback is stopped. */
  const inFlightRef = useRef<Set<AbortController>>(new Set())
  /** Object URLs created for byte responses, revoked when playback ends. */
  const objectUrlsRef = useRef<string[]>([])

  useEffect(() => {
    if (!languageOverride) {
      setSelectedLanguage(headerTtsLanguage)
    }
  }, [headerTtsLanguage, languageOverride])

  const setSelectedLanguageWithOverride = useCallback((code: string) => {
    setLanguageOverride(true)
    setSelectedLanguage(code)
  }, [])

  useEffect(() => {
    try {
      const stored = localStorage.getItem(DIRECTOR_NOTES_STORAGE_KEY)
      if (stored) setDirectorNotes(stored)
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await fetch('/api/tts/blueprint/voices', { cache: 'no-store' })
        const data = await res.json().catch(() => null)
        if (!mounted) return
        if (!data?.enabled || !Array.isArray(data.voices) || data.voices.length === 0) {
          setEnabled(false)
          setVoices([])
          return
        }
        const gemini = data.voices.map(
          (v: { id: string; name: string; gender?: string }) => ({
            id: v.id,
            name: formatGeminiVoiceSelectedLabel(v),
            gender: v.gender,
          })
        )
        setEnabled(gemini.length > 0)
        setVoices(gemini)
        const defaultVoice =
          gemini.find((v: BlueprintGeminiVoice) => v.id === DEFAULT_BLUEPRINT_GEMINI_VOICE) ??
          gemini[0]
        if (defaultVoice && !gemini.some((v: BlueprintGeminiVoice) => v.id === selectedVoiceId)) {
          setSelectedVoiceId(defaultVoice.id)
          setSelectedVoiceName(defaultVoice.name)
        } else {
          const current = gemini.find((v: BlueprintGeminiVoice) => v.id === selectedVoiceId)
          if (current) setSelectedVoiceName(current.name)
        }
      } catch {
        if (!mounted) return
        setEnabled(false)
        setVoices([])
      }
    })()
    return () => {
      mounted = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init voice list once
  }, [])

  const stopAny = useCallback(() => {
    try {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
      }
    } catch {
      /* ignore */
    }
    audioRef.current = null
    setLoadingId(null)
    setGenerationProgress(null)
    queueAbortRef.current.abort = true

    // Look-ahead means clips the listener will never hear may still be
    // synthesizing. Cancel them rather than paying for audio nobody plays.
    for (const controller of inFlightRef.current) {
      try {
        controller.abort()
      } catch {
        /* ignore */
      }
    }
    inFlightRef.current.clear()

    for (const url of objectUrlsRef.current) {
      try {
        URL.revokeObjectURL(url)
      } catch {
        /* ignore */
      }
    }
    objectUrlsRef.current = []
  }, [])

  /**
   * Translate every chunk in one request.
   *
   * One call rather than one per chunk, and `/api/translate` reads through the
   * shared `content_translations` cache, so a narration played once is free to
   * translate again from any session.
   */
  const translateChunks = useCallback(
    async (texts: string[]): Promise<string[]> => {
      if (selectedLanguage === 'en') return texts

      const cacheKeyFor = (text: string) => `${text}-${selectedLanguage}`
      const missing = texts.filter((text) => !translationCacheRef.current.has(cacheKeyFor(text)))

      if (missing.length > 0) {
        try {
          const response = await fetch('/api/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              texts: missing,
              targetLanguage: toGoogleTranslateCode(selectedLanguage),
              sourceLanguage: 'en',
            }),
          })
          if (response.ok) {
            const data = await response.json()
            const translated: unknown = data?.translatedTexts
            if (Array.isArray(translated)) {
              missing.forEach((text, index) => {
                const value = translated[index]
                if (typeof value === 'string' && value.trim()) {
                  translationCacheRef.current.set(cacheKeyFor(text), value)
                }
              })
            }
          }
        } catch (err) {
          // Narration in the source language is better than no narration.
          console.error('[Blueprint TTS] Translation failed:', err)
        }
      }

      return texts.map((text) => translationCacheRef.current.get(cacheKeyFor(text)) ?? text)
    },
    [selectedLanguage]
  )

  /** Synthesize one chunk and return a playable URL. */
  const synthesizeChunk = useCallback(
    async (text: string, voiceId: string): Promise<string> => {
      const controller = new AbortController()
      inFlightRef.current.add(controller)
      try {
        const resp = await fetch('/api/tts/blueprint', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            voiceId,
            language: selectedLanguage,
            directorNotes: directorNotes.trim() || undefined,
          }),
          signal: controller.signal,
        })
        if (!resp.ok) {
          const errBody = await resp.json().catch(() => ({}))
          const msg =
            typeof errBody?.error === 'string' ? errBody.error : `TTS failed (${resp.status})`
          throw new Error(msg)
        }

        // A cached clip comes back as a stored URL; otherwise the route streams
        // the bytes it just synthesized.
        if (resp.headers.get('content-type')?.includes('application/json')) {
          const data = await resp.json()
          if (typeof data?.url === 'string' && data.url) return data.url
          throw new Error('TTS response missing audio url')
        }

        const url = URL.createObjectURL(await resp.blob())
        objectUrlsRef.current.push(url)
        return url
      } finally {
        inFlightRef.current.delete(controller)
      }
    },
    [selectedLanguage, directorNotes]
  )

  const playTextChunks = useCallback(
    async (texts: string[], playId: string) => {
      queueAbortRef.current.abort = false
      const total = texts.length
      if (total === 0) return

      const voiceId = selectedVoiceId || voices[0]?.id
      if (!voiceId) throw new Error('No voice available')

      setGenerationProgress({ current: 0, total, phase: 'translating' })
      const spokenTexts = await translateChunks(texts)
      if (queueAbortRef.current.abort) return

      // Generation runs ahead of playback: `pending[i]` may already be resolved
      // by the time clip i is reached, which is what removes the wait between
      // clips. The window is refilled as each clip is consumed.
      const pending: Array<Promise<string> | undefined> = new Array(total)
      const startSynthesis = (index: number) => {
        if (index >= total || pending[index] || queueAbortRef.current.abort) return
        const request = synthesizeChunk(spokenTexts[index]!, voiceId)
        // A look-ahead clip may never be awaited, because the listener stopped
        // or an earlier clip failed. Mark it handled so an aborted request does
        // not surface as an unhandled rejection; the await below still throws.
        request.catch(() => {})
        pending[index] = request
      }
      for (let i = 0; i < Math.min(NARRATION_LOOKAHEAD + 1, total); i++) startSynthesis(i)

      for (let index = 0; index < total; index++) {
        if (queueAbortRef.current.abort) break

        setGenerationProgress({ current: index + 1, total, phase: 'generating' })
        startSynthesis(index)

        let url: string
        try {
          url = await pending[index]!
        } catch (err) {
          if (queueAbortRef.current.abort) return
          throw err
        }
        if (queueAbortRef.current.abort) break

        // Queue the next clip before playing this one, so synthesis overlaps
        // playback instead of following it.
        startSynthesis(index + NARRATION_LOOKAHEAD + 1)

        const audio = new Audio(url)
        audioRef.current = audio

        setGenerationProgress({ current: index + 1, total, phase: 'playing' })

        await new Promise<void>((resolve, reject) => {
          audio.onended = () => resolve()
          audio.onerror = () => reject(new Error('Audio error'))
          audio.play().catch(reject)
        })
      }

      if (!queueAbortRef.current.abort) {
        setGenerationProgress(null)
      }
    },
    [selectedVoiceId, voices, translateChunks, synthesizeChunk]
  )

  const playText = useCallback(
    async (text: string, playId = 'play') => {
      const trimmed = text.trim()
      if (!trimmed) return
      stopAny()
      setLoadingId(playId)
      const chunks = chunkNarrationText(trimmed, NARRATION_CHUNK_CHARS)
      try {
        if (!selectedVoiceId && voices.length === 0) {
          throw new Error('No voice available')
        }
        await playTextChunks(chunks, playId)
      } catch {
        stopAny()
      } finally {
        setLoadingId((id) => (id === playId ? null : id))
        setGenerationProgress(null)
      }
    },
    [playTextChunks, selectedVoiceId, stopAny, voices.length]
  )

  const selectVoice = useCallback((voiceId: string, voiceName: string) => {
    setSelectedVoiceId(voiceId)
    setSelectedVoiceName(voiceName)
    setVoiceDialogOpen(false)
  }, [])

  const saveDirectorNotes = useCallback((notes: string) => {
    setDirectorNotes(notes)
    try {
      localStorage.setItem(DIRECTOR_NOTES_STORAGE_KEY, notes)
    } catch {
      /* ignore */
    }
    setDirectorNotesDialogOpen(false)
  }, [])

  return {
    voices,
    enabled,
    loadingId,
    selectedVoiceId,
    selectedVoiceName,
    directorNotes,
    selectedLanguage,
    setSelectedLanguage: setSelectedLanguageWithOverride,
    audioMenuOpen,
    setAudioMenuOpen,
    voiceDialogOpen,
    setVoiceDialogOpen,
    directorNotesDialogOpen,
    setDirectorNotesDialogOpen,
    playText,
    stopAny,
    selectVoice,
    saveDirectorNotes,
    isPlaying: loadingId !== null,
    generationProgress,
  }
}
