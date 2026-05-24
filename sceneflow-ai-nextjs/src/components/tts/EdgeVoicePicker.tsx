'use client'

import React, { useState, useCallback, useEffect, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Play, Check, Volume2, Loader2, Search } from 'lucide-react'
import { Input } from '@/components/ui/Input'

export type EdgeVoiceOption = {
  id: string
  name: string
  gender: 'male' | 'female'
  language: string
  description?: string
}

interface EdgeVoicePickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedVoiceId?: string
  onSelectVoice: (voiceId: string, voiceName: string) => void
  /** Default language filter (e.g. project dialogue language) */
  defaultLanguage?: string
}

const PREVIEW_TEXT =
  'This is a preview of my Edge fallback voice for dialogue generation.'

export function EdgeVoicePicker({
  open,
  onOpenChange,
  selectedVoiceId,
  onSelectVoice,
  defaultLanguage = 'en',
}: EdgeVoicePickerProps) {
  const [voices, setVoices] = useState<EdgeVoiceOption[]>([])
  const [loading, setLoading] = useState(false)
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null)
  const [isSynthesizing, setIsSynthesizing] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [languageFilter, setLanguageFilter] = useState(defaultLanguage)
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>(
    'all'
  )
  const audioRef = React.useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (open) {
      setLanguageFilter(defaultLanguage)
    }
  }, [open, defaultLanguage])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    const params = new URLSearchParams()
    if (languageFilter) params.set('lang', languageFilter)
    if (genderFilter !== 'all') params.set('gender', genderFilter)

    fetch(`/api/tts/edge/voices?${params.toString()}`, { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && Array.isArray(data.voices)) {
          setVoices(data.voices)
        }
      })
      .catch((err) => {
        console.error('[EdgeVoicePicker] Failed to load voices:', err)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, languageFilter, genderFilter])

  const filteredVoices = useMemo(() => {
    if (!searchQuery.trim()) return voices
    const q = searchQuery.toLowerCase()
    return voices.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        v.id.toLowerCase().includes(q) ||
        (v.description?.toLowerCase().includes(q) ?? false)
    )
  }, [voices, searchQuery])

  const handlePreview = useCallback(
    async (voiceId: string) => {
      if (playingVoiceId === voiceId && audioRef.current) {
        audioRef.current.pause()
        setPlayingVoiceId(null)
        return
      }

      if (audioRef.current) {
        audioRef.current.pause()
      }

      setIsSynthesizing(voiceId)
      try {
        const response = await fetch('/api/tts/edge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: PREVIEW_TEXT, voiceId }),
        })
        if (!response.ok) throw new Error('Edge TTS preview failed')

        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const audio = new Audio(url)
        audioRef.current = audio
        audio.onended = () => {
          setPlayingVoiceId(null)
          URL.revokeObjectURL(url)
        }
        audio.onerror = () => {
          setPlayingVoiceId(null)
          URL.revokeObjectURL(url)
        }
        await audio.play()
        setPlayingVoiceId(voiceId)
      } catch (err) {
        console.error('Failed to play Edge preview:', err)
        setPlayingVoiceId(null)
      } finally {
        setIsSynthesizing(null)
      }
    },
    [playingVoiceId]
  )

  const handleSelect = useCallback(
    (voice: EdgeVoiceOption) => {
      onSelectVoice(voice.id, voice.name)
      onOpenChange(false)
    },
    [onSelectVoice, onOpenChange]
  )

  useEffect(() => {
    if (!open && audioRef.current) {
      audioRef.current.pause()
      setPlayingVoiceId(null)
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[75vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-1.5 text-base">
            <Volume2 className="w-4 h-4 text-emerald-500" />
            Edge Fallback Voice
          </DialogTitle>
          <DialogDescription className="text-xs">
            Used when ElevenLabs or Google TTS quota is exhausted. Does not
            replace your primary dialogue voice.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-2 pb-2">
          <select
            value={languageFilter}
            onChange={(e) => setLanguageFilter(e.target.value)}
            className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
          >
            {['en', 'hi', 'ar', 'es', 'th', 'ja', 'zh'].map((lang) => (
              <option key={lang} value={lang}>
                {lang.toUpperCase()}
              </option>
            ))}
          </select>
          {(['all', 'male', 'female'] as const).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGenderFilter(g)}
              className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                genderFilter === g
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400'
              }`}
            >
              {g === 'all' ? 'All' : g.charAt(0).toUpperCase() + g.slice(1)}
            </button>
          ))}
        </div>

        <div className="relative mb-2">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search voices..."
            className="pl-8 h-8 text-sm"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Loading voices...
            </div>
          ) : filteredVoices.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">
              No voices match your filters.
            </p>
          ) : (
            filteredVoices.map((voice) => {
              const isSelected = selectedVoiceId === voice.id
              const isPlaying = playingVoiceId === voice.id
              const isLoading = isSynthesizing === voice.id

              return (
                <div
                  key={voice.id}
                  className={`flex items-center gap-2 p-2 rounded-lg border transition-colors ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handlePreview(voice.id)}
                    disabled={!!isSynthesizing && !isLoading}
                    className="p-1.5 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50"
                    title="Preview"
                  >
                    {isLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Play
                        className={`w-3.5 h-3.5 ${isPlaying ? 'text-emerald-500' : ''}`}
                      />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelect(voice)}
                    className="flex-1 text-left min-w-0"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">
                        {voice.name}
                      </span>
                      <span className="text-[10px] px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 capitalize">
                        {voice.gender}
                      </span>
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      )}
                    </div>
                    {voice.description && (
                      <p className="text-[11px] text-gray-500 truncate">
                        {voice.description}
                      </p>
                    )}
                  </button>
                </div>
              )
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
