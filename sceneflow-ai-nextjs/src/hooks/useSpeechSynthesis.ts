import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export interface SpeechVoiceOption {
  name: string
  lang: string
  default: boolean
  voice: SpeechSynthesisVoice
}

export interface SpeakOptions {
  voiceName?: string
  rate?: number
  pitch?: number
  volume?: number
}

export function useSpeechSynthesis() {
  const [voices, setVoices] = useState<SpeechVoiceOption[]>([])
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [enabled, setEnabled] = useState(true)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window

  useEffect(() => {
    if (!supported) return

    const mapVoices = () => {
      const systemVoices = window.speechSynthesis.getVoices()
      const options = systemVoices.map((v) => ({
        name: v.name,
        lang: v.lang,
        default: v.default,
        voice: v,
      }))
      setVoices(options)
    }

    mapVoices()
    window.speechSynthesis.onvoiceschanged = mapVoices

    return () => {
      if (window && window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null
      }
    }
  }, [supported])

  const defaultVoice = useMemo(() => {
    // Prefer high-quality English voices if present
    const preferredNames = [
      'Google UK English Male',
      'Google US English',
      'Samantha',
      'Alex',
    ]
    for (const p of preferredNames) {
      const found = voices.find((v) => v.name.includes(p))
      if (found) return found
    }
    return voices.find((v) => v.default) || voices[0]
  }, [voices])

  const cancel = useCallback(() => {
    if (!supported) return
    window.speechSynthesis.cancel()
    setIsSpeaking(false)
    utteranceRef.current = null
  }, [supported])

  const speak = useCallback(
    (text: string, options?: SpeakOptions) => {
      if (!supported || !enabled || !text) return

      // Stop any current speech
      cancel()

      const utter = new SpeechSynthesisUtterance(text)
      utteranceRef.current = utter

      const voice = options?.voiceName
        ? voices.find((v) => v.name === options.voiceName)
        : defaultVoice

      if (voice) utter.voice = voice.voice

      utter.rate = options?.rate ?? 1
      utter.pitch = options?.pitch ?? 1
      utter.volume = options?.volume ?? 1

      utter.onend = () => setIsSpeaking(false)
      utter.onerror = () => setIsSpeaking(false)

      setIsSpeaking(true)
      window.speechSynthesis.speak(utter)
    },
    [supported, enabled, voices, defaultVoice, cancel]
  )

  return {
    supported,
    enabled,
    setEnabled,
    isSpeaking,
    voices,
    defaultVoice,
    speak,
    cancel,
  }
}
