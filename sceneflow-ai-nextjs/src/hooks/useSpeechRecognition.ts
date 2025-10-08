import { useCallback, useEffect, useRef, useState } from 'react'

// Types for Web Speech API
type RecognitionConstructor = new () => SpeechRecognition

export function useSpeechRecognition() {
  const RecognitionCtor: false | RecognitionConstructor =
    (typeof window !== 'undefined' && (window as Window).webkitSpeechRecognition) ||
    (typeof window !== 'undefined' && (window as Window).SpeechRecognition) ||
    false
  const supported = Boolean(RecognitionCtor)

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!supported || !RecognitionCtor) return
    const recognition: SpeechRecognition = new RecognitionCtor()
    recognitionRef.current = recognition

    recognition.lang = 'en-US'
    ;(recognition as any).continuous = true
    ;(recognition as any).interimResults = true

    ;(recognition as any).onresult = (event: any) => {
      let transcript = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript
      }
      setTranscript(transcript)
    }

    recognition.onstart = () => {
      setIsRecording(true)
      setError(null)
      setTranscript('')
    }

    recognition.onend = () => {
      setIsRecording(false)
    }

    recognition.onerror = (e: any) => {
      setError(e?.error || 'Speech recognition error')
      setIsRecording(false)
    }

    return () => {
      try {
        ;(recognition as any).onresult = null as any
        recognition.onstart = null as any
        recognition.onend = null as any
        recognition.onerror = null as any
        recognition.abort()
      } catch {}
      recognitionRef.current = null
    }
  }, [supported])

  const start = useCallback(() => {
    if (!supported || !recognitionRef.current) return
    try {
      ;(recognitionRef.current as any).start()
    } catch {}
  }, [supported])

  const stop = useCallback(() => {
    if (!supported || !recognitionRef.current) return
    try {
      ;(recognitionRef.current as any).stop()
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
