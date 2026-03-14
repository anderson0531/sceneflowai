import { useCallback, useEffect, useRef, useState } from 'react'

// Types for Web Speech API
type RecognitionConstructor = new () => SpeechRecognition

/**
 * Speech-to-text hook using the Web Speech API.
 *
 * Uses single-utterance mode (continuous=false, interimResults=false) to
 * eliminate the duplicate/repeated-word artifacts that occur with
 * continuous mode.  When the user is "recording", we auto-restart
 * recognition after each utterance so the UX feels continuous, but each
 * chunk is a clean, finalized transcript appended to the cumulative result.
 */
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

  // Ref tracks whether the user wants to keep listening (auto-restart)
  const wantRecordingRef = useRef(false)
  // Cumulative finalized text across utterances
  const cumulativeRef = useRef('')

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
    // Single-utterance mode — produces one clean finalized result per pause,
    // then fires onend so we can auto-restart if the user is still recording.
    ;(recognition as any).continuous = false
    ;(recognition as any).interimResults = false
    ;(recognition as any).maxAlternatives = 1

    ;(recognition as any).onresult = (event: any) => {
      // In single-utterance mode there is exactly one result per cycle
      const result = event.results[0]
      if (result && result.isFinal) {
        const text = result[0].transcript.trim()
        if (text) {
          // Append to cumulative transcript with a space separator
          const prev = cumulativeRef.current
          cumulativeRef.current = prev ? `${prev} ${text}` : text
          setTranscript(cumulativeRef.current)
        }
      }
    }

    recognition.onstart = () => {
      setIsRecording(true)
      setError(null)
    }

    recognition.onend = () => {
      // Auto-restart if the user hasn't explicitly stopped
      if (wantRecordingRef.current) {
        try {
          recognition.start()
        } catch {
          // Browser may throw if start() is called too fast; retry once
          setTimeout(() => {
            try { recognition.start() } catch { setIsRecording(false); wantRecordingRef.current = false }
          }, 100)
        }
      } else {
        setIsRecording(false)
      }
    }

    recognition.onerror = (e: any) => {
      const code = e?.error || 'error'
      // "no-speech" is normal when the user pauses — just auto-restart
      if (code === 'no-speech' && wantRecordingRef.current) return
      if (code === 'not-allowed' || code === 'permission-denied') setPermission('denied')
      if (code !== 'aborted') setError(code)
      setIsRecording(false)
      wantRecordingRef.current = false
    }

    return () => {
      wantRecordingRef.current = false
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
    cumulativeRef.current = ''
    setTranscript('')
    wantRecordingRef.current = true
    try {
      ;(recognitionRef.current as any).start()
    } catch {}
  }, [supported])

  const stop = useCallback(() => {
    wantRecordingRef.current = false
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
