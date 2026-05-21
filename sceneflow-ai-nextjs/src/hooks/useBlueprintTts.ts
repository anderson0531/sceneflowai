'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { DEFAULT_BLUEPRINT_GEMINI_VOICE } from '@/lib/tts/blueprintTtsConstants'
import { toGoogleTranslateCode } from '@/constants/veoLanguages'

const DIRECTOR_NOTES_STORAGE_KEY = 'sceneflow-blueprint-tts-director-notes'

export type BlueprintGeminiVoice = { id: string; name: string }

export function useBlueprintTts() {
  const [voices, setVoices] = useState<BlueprintGeminiVoice[]>([])
  const [enabled, setEnabled] = useState(false)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>(DEFAULT_BLUEPRINT_GEMINI_VOICE)
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>('Kore (Gemini)')
  const [directorNotes, setDirectorNotes] = useState('')
  const [audioMenuOpen, setAudioMenuOpen] = useState(false)
  const [voiceDialogOpen, setVoiceDialogOpen] = useState(false)
  const [directorNotesDialogOpen, setDirectorNotesDialogOpen] = useState(false)
  const [selectedLanguage, setSelectedLanguage] = useState('en')
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const queueAbortRef = useRef({ abort: false })
  const translationCacheRef = useRef<Map<string, string>>(new Map())

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
        const gemini = data.voices.map((v: { id: string; name: string }) => ({
          id: v.id,
          name: v.name,
        }))
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
    queueAbortRef.current.abort = true
  }, [])

  const playTextChunks = useCallback(
    async (texts: string[]) => {
      queueAbortRef.current.abort = false
      for (const t of texts) {
        if (queueAbortRef.current.abort) break

        let textToSpeak = t
        if (selectedLanguage !== 'en') {
          const cacheKey = `${t}-${selectedLanguage}`
          const cached = translationCacheRef.current.get(cacheKey)
          if (cached) {
            textToSpeak = cached
          } else {
            try {
              const translateResp = await fetch('/api/translate/google', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  text: t,
                  targetLanguage: toGoogleTranslateCode(selectedLanguage),
                  sourceLanguage: 'en',
                }),
              })
              if (translateResp.ok) {
                const translateData = await translateResp.json()
                textToSpeak = translateData.translatedText || t
                translationCacheRef.current.set(cacheKey, textToSpeak)
              }
            } catch (err) {
              console.error('[Blueprint TTS] Translation failed:', err)
            }
          }
        }

        const voiceId = selectedVoiceId || voices[0]?.id
        if (!voiceId) throw new Error('No voice available')

        const resp = await fetch('/api/tts/blueprint', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: textToSpeak,
            voiceId,
            directorNotes: directorNotes.trim() || undefined,
          }),
        })
        if (!resp.ok) {
          const errBody = await resp.json().catch(() => ({}))
          const msg =
            typeof errBody?.error === 'string' ? errBody.error : `TTS failed (${resp.status})`
          throw new Error(msg)
        }
        const blob = await resp.blob()
        const url = URL.createObjectURL(blob)
        const audio = new Audio(url)
        audioRef.current = audio
        await new Promise<void>((resolve, reject) => {
          audio.onended = () => resolve()
          audio.onerror = () => reject(new Error('Audio error'))
          audio.play().catch(reject)
        })
      }
    },
    [selectedLanguage, selectedVoiceId, voices, directorNotes]
  )

  const playText = useCallback(
    async (text: string, playId = 'play') => {
      const trimmed = text.trim()
      if (!trimmed) return
      stopAny()
      setLoadingId(playId)
      const chunks: string[] = []
      const maxLen = 1200
      let cursor = 0
      while (cursor < trimmed.length) {
        chunks.push(trimmed.slice(cursor, cursor + maxLen))
        cursor += maxLen
      }
      try {
        if (!selectedVoiceId && voices.length === 0) {
          throw new Error('No voice available')
        }
        await playTextChunks(chunks)
      } catch {
        stopAny()
      } finally {
        setLoadingId((id) => (id === playId ? null : id))
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
    setSelectedLanguage,
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
  }
}
