import { useCallback, useEffect, useRef, useState } from 'react'

// Types for Web Speech API
type RecognitionConstructor = new () => SpeechRecognition

declare global {
  interface Window {
    webkitSpeechRecognition?: RecognitionConstructor
    SpeechRecognition?: RecognitionConstructor
  }
}

export function useSpeechRecognition() {
  const Recognition =
    typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)
  const supported = Boolean(Recognition)

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!supported) return
    const rec = new Recognition!()
    recognitionRef.current = rec

    rec.lang = 'en-US'
    rec.continuous = false
    rec.interimResults = true

    rec.onresult = (event: SpeechRecognitionEvent) => {
      let text = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        text += event.results[i][0].transcript
      }
      setTranscript(text)
    }

    rec.onstart = () => {
      setIsRecording(true)
      setError(null)
      setTranscript('')
    }

    rec.onend = () => {
      setIsRecording(false)
    }

    rec.onerror = (e: any) => {
      setError(e?.error || 'Speech recognition error')
      setIsRecording(false)
    }

    return () => {
      try {
        rec.onresult = null as any
        rec.onstart = null as any
        rec.onend = null as any
        rec.onerror = null as any
        rec.abort()
      } catch {}
      recognitionRef.current = null
    }
  }, [supported])

  const start = useCallback(() => {
    if (!supported || !recognitionRef.current) return
    try {
      recognitionRef.current.start()
    } catch {}
  }, [supported])

  const stop = useCallback(() => {
    if (!supported || !recognitionRef.current) return
    try {
      recognitionRef.current.stop()
    } catch {}
  }, [supported])

  return {
    supported,
    isRecording,
    transcript,
    error,
    start,
    stop,
    setTranscript,
  }
}
