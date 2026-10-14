'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  activeNarrationPrompt,
  isSavedNarrationCurrent,
  type SavedSeriesNarration,
} from '@/lib/series/seriesNarrationSync'

type NarrationSection = 'overview' | 'episode'

/**
 * Plays a saved series narration clip. Synthesizes only when the spoken text
 * or voice no longer matches, or when the caller forces a new take.
 */
export function useSeriesNarrationPlayer({
  seriesId,
  section,
  episodeId,
  text,
  saved,
  voiceId,
  prompt,
  resetKey,
  onSaved,
}: {
  seriesId: string
  section: NarrationSection
  episodeId?: string
  text: string
  saved: SavedSeriesNarration | null
  voiceId: string
  prompt: string
  /** Stops playback when this changes (episode selection). */
  resetKey?: string
  onSaved: (narration: SavedSeriesNarration, savedEpisodeId?: string) => void
}) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isGeneratingTTS, setIsGeneratingTTS] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const busyRef = useRef(false)
  const onSavedRef = useRef(onSaved)
  const resetKeyRef = useRef(resetKey)
  onSavedRef.current = onSaved
  resetKeyRef.current = resetKey

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    setIsPlaying(false)
  }, [])

  useEffect(() => {
    stop()
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [resetKey, stop])

  const playUrl = useCallback(async (url: string) => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    const audio = new Audio(url)
    audioRef.current = audio
    audio.onended = () => setIsPlaying(false)
    audio.onerror = () => setIsPlaying(false)
    await audio.play()
    setIsPlaying(true)
  }, [])

  const requestClip = useCallback(
    async (force: boolean): Promise<SavedSeriesNarration> => {
      const spokenPrompt = activeNarrationPrompt(voiceId, prompt)
      if (!force && isSavedNarrationCurrent(saved, { text, voiceId, prompt: spokenPrompt })) {
        return saved!
      }
      const response = await fetch(`/api/series/${seriesId}/narration`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section,
          ...(episodeId ? { episodeId } : {}),
          voiceId,
          ...(spokenPrompt ? { prompt: spokenPrompt } : {}),
          ...(force ? { force: true } : {}),
        }),
      })
      const data = (await response.json().catch(() => ({}))) as {
        error?: string
        audioUrl?: string
        narration?: SavedSeriesNarration
      }
      if (!response.ok || !data.narration?.audioUrl) {
        throw new Error(data.error || 'TTS failed')
      }
      onSavedRef.current(data.narration, episodeId)
      return data.narration
    },
    [episodeId, prompt, saved, section, seriesId, text, voiceId]
  )

  const play = useCallback(async () => {
    if (isPlaying) {
      stop()
      return
    }
    if (busyRef.current) return
    if (!text.trim()) {
      toast.error('No logline or synopsis to play.')
      return
    }
    const spokenPrompt = activeNarrationPrompt(voiceId, prompt)
    const canReplay = isSavedNarrationCurrent(saved, { text, voiceId, prompt: spokenPrompt })
    const keyAtStart = resetKeyRef.current
    busyRef.current = true
    if (!canReplay) setIsGeneratingTTS(true)
    try {
      const narration = await requestClip(false)
      if (resetKeyRef.current !== keyAtStart) return
      await playUrl(narration.audioUrl)
    } catch (err) {
      console.error('TTS error:', err)
      toast.error(
        canReplay ? 'Could not play the saved narration.' : 'Failed to generate audio readout.'
      )
      setIsPlaying(false)
    } finally {
      busyRef.current = false
      setIsGeneratingTTS(false)
    }
  }, [isPlaying, playUrl, prompt, requestClip, saved, stop, text, voiceId])

  const regenerate = useCallback(async () => {
    if (busyRef.current) return
    if (!text.trim()) {
      toast.error('No logline or synopsis to play.')
      return
    }
    const keyAtStart = resetKeyRef.current
    busyRef.current = true
    stop()
    setIsGeneratingTTS(true)
    try {
      const narration = await requestClip(true)
      if (resetKeyRef.current !== keyAtStart) return
      await playUrl(narration.audioUrl)
    } catch (err) {
      console.error('TTS error:', err)
      toast.error('Failed to generate audio readout.')
      setIsPlaying(false)
    } finally {
      busyRef.current = false
      setIsGeneratingTTS(false)
    }
  }, [playUrl, requestClip, stop, text])

  return { isPlaying, isGeneratingTTS, play, regenerate }
}
