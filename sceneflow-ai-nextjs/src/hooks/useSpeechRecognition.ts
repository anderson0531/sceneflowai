import { useCallback, useEffect, useRef, useState } from 'react'

// Types for Web Speech API
type RecognitionConstructor = new () => SpeechRecognition

export function useSpeechRecognition() {
  const RecognitionCtor: false | RecognitionConstructor =
    (typeof window !== 'undefined' && (window as Window).webkitSpeechRecognition) ||
    (typeof window !== 'undefined' && (window as Window).SpeechRecognition) ||
    false
  const isSecure = typeof window !== 'undefined' && (window.isSecureContext || /^localhost(:\d+)?$/.test(window.location.hostname))
  const supported = Boolean(RecognitionCtor) && isSecure

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [permission, setPermission] = useState<PermissionState | 'unknown'>('unknown')

  useEffect(() => {
    if (!isSecure) {
      setError('Insecure context: use HTTPS or localhost')
      return
    }
    if (!RecognitionCtor) {
      setError('Speech recognition not supported in this browser')
      return
    }

    // Preflight microphone permission (best-effort)
    try {
      if (typeof navigator !== 'undefined' && (navigator as any).permissions?.query) {
        ;(navigator as any).permissions.query({ name: 'microphone' as PermissionName }).then((res: any) => {
          setPermission(res.state as PermissionState)
          res.onchange = () => setPermission(res.state as PermissionState)
        }).catch(() => setPermission('unknown'))
      }
    } catch {}

    if (!supported || !RecognitionCtor) return
    const recognition: SpeechRecognition = new RecognitionCtor()
    recognitionRef.current = recognition

    recognition.lang = 'en-US'
    ;(recognition as any).continuous = true
    ;(recognition as any).interimResults = true

    // Track final results to avoid duplication
    let finalTranscript = ''

    ;(recognition as any).onresult = (event: any) => {
      let interimTranscript = ''
      
      // Process results starting from the new ones
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        const text = result[0].transcript
        
        if (result.isFinal) {
          // Final result - add to cumulative final transcript
          finalTranscript += text
        } else {
          // Interim result - show as preview
          interimTranscript += text
        }
      }
      
      // Show final + current interim for live preview
      setTranscript(finalTranscript + interimTranscript)
    }

    recognition.onstart = () => {
      setIsRecording(true)
      setError(null)
      setTranscript('')
      finalTranscript = '' // Reset final transcript on new recording
    }

    recognition.onend = () => {
      setIsRecording(false)
    }

    recognition.onerror = (e: any) => {
      const code = e?.error || 'error'
      if (code === 'not-allowed' || code === 'permission-denied') setPermission('denied')
      setError(code)
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
  }, [supported, isSecure])

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
    isSecure,
    isRecording,
    transcript,
    error,
    start,
    stop,
    setTranscript,
    permission,
  }
}
