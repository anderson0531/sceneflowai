'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

export type AudioRecordingState = 'idle' | 'preparing' | 'recording' | 'paused' | 'stopped'

export interface UseAudioRecorderReturn {
  /** Current recording state */
  state: AudioRecordingState
  /** Whether currently recording */
  isRecording: boolean
  /** Whether preparing (requesting permissions) */
  isPreparing: boolean
  /** Elapsed recording time in milliseconds */
  elapsedMs: number
  /** The recorded audio blob (available after stopping) */
  audioBlob: Blob | null
  /** Object URL for the recorded audio (for playback) */
  audioUrl: string | null
  /** Error message if any */
  error: string | null
  /** Microphone permission state */
  permissionState: PermissionState | 'unknown'
  /** Start recording */
  startRecording: () => Promise<void>
  /** Stop recording */
  stopRecording: () => void
  /** Pause recording */
  pauseRecording: () => void
  /** Resume recording */
  resumeRecording: () => void
  /** Reset to initial state (clears recorded audio) */
  reset: () => void
}

/**
 * Resolve the best supported audio MIME type
 */
function resolveMimeType(): string | null {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/ogg',
    'audio/mp4',
  ]
  
  for (const candidate of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(candidate)) {
      return candidate
    }
  }
  return null
}

/**
 * Get file extension from MIME type
 */
function getExtensionFromMime(mimeType: string): string {
  if (mimeType.includes('webm')) return 'webm'
  if (mimeType.includes('ogg')) return 'ogg'
  if (mimeType.includes('mp4')) return 'm4a'
  return 'audio'
}

/**
 * Custom hook for recording audio from microphone
 * 
 * @example
 * ```tsx
 * const {
 *   isRecording,
 *   elapsedMs,
 *   audioBlob,
 *   audioUrl,
 *   startRecording,
 *   stopRecording,
 *   reset,
 * } = useAudioRecorder()
 * 
 * // Start recording
 * await startRecording()
 * 
 * // Stop and get the blob
 * stopRecording()
 * // audioBlob and audioUrl are now available
 * ```
 */
export function useAudioRecorder(): UseAudioRecorderReturn {
  const [state, setState] = useState<AudioRecordingState>('idle')
  const [elapsedMs, setElapsedMs] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [permissionState, setPermissionState] = useState<PermissionState | 'unknown'>('unknown')

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number>(0)
  const pausedTimeRef = useRef<number>(0)

  // Check microphone permission on mount
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'microphone' as PermissionName })
        .then((result) => {
          setPermissionState(result.state)
          result.onchange = () => setPermissionState(result.state)
        })
        .catch(() => setPermissionState('unknown'))
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
      }
    }
  }, [audioUrl])

  const startTimer = useCallback(() => {
    startTimeRef.current = Date.now() - pausedTimeRef.current
    timerRef.current = setInterval(() => {
      setElapsedMs(Date.now() - startTimeRef.current)
    }, 100)
  }, [])

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const startRecording = useCallback(async () => {
    try {
      setError(null)
      setState('preparing')
      
      // Check for MediaRecorder support
      if (typeof MediaRecorder === 'undefined') {
        throw new Error('MediaRecorder is not supported in this browser')
      }

      // Resolve MIME type
      const mimeType = resolveMimeType()
      if (!mimeType) {
        throw new Error('No supported audio format found for recording')
      }

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
      
      streamRef.current = stream
      chunksRef.current = []

      const recorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType })
        setAudioBlob(blob)
        
        // Create object URL for playback
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)

        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop())
          streamRef.current = null
        }

        setState('stopped')
      }

      recorder.onerror = () => {
        setError('Recording error occurred')
        setState('idle')
        stopTimer()
      }

      // Start recording with timeslice for regular data availability
      recorder.start(1000)
      setState('recording')
      
      // Reset and start timer
      pausedTimeRef.current = 0
      setElapsedMs(0)
      startTimer()
      
      setPermissionState('granted')
    } catch (err) {
      console.error('[useAudioRecorder] Error starting recording:', err)
      
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError') {
          setError('Microphone access denied. Please allow microphone access and try again.')
          setPermissionState('denied')
        } else if (err.name === 'NotFoundError') {
          setError('No microphone found. Please connect a microphone and try again.')
        } else {
          setError(`Microphone error: ${err.message}`)
        }
      } else {
        setError(err instanceof Error ? err.message : 'Failed to start recording')
      }
      
      setState('idle')
    }
  }, [startTimer, stopTimer])

  const stopRecording = useCallback(() => {
    stopTimer()
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
  }, [stopTimer])

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause()
      pausedTimeRef.current = elapsedMs
      stopTimer()
      setState('paused')
    }
  }, [elapsedMs, stopTimer])

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume()
      startTimer()
      setState('recording')
    }
  }, [startTimer])

  const reset = useCallback(() => {
    stopTimer()
    
    // Stop any active recording
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    
    // Stop stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    
    // Revoke URL
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
    }
    
    // Reset state
    mediaRecorderRef.current = null
    chunksRef.current = []
    setAudioBlob(null)
    setAudioUrl(null)
    setElapsedMs(0)
    setError(null)
    pausedTimeRef.current = 0
    setState('idle')
  }, [audioUrl, stopTimer])

  return {
    state,
    isRecording: state === 'recording',
    isPreparing: state === 'preparing',
    elapsedMs,
    audioBlob,
    audioUrl,
    error,
    permissionState,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    reset,
  }
}

/**
 * Convert an audio blob to a File object suitable for upload
 */
export function audioBlob2File(blob: Blob, baseName: string = 'recorded-voice'): File {
  const mimeType = blob.type || 'audio/webm'
  const extension = getExtensionFromMime(mimeType)
  const fileName = `${baseName}-${Date.now()}.${extension}`
  
  return new File([blob], fileName, { type: mimeType })
}

/**
 * Format milliseconds as MM:SS
 */
export function formatRecordingTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}
