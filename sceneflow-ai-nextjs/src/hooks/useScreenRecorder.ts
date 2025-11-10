import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

interface UseScreenRecorderOptions {
  audio?: boolean | MediaTrackConstraints
  video?: MediaTrackConstraints
  mimeType?: string
  preferCurrentTab?: boolean
}

export interface ScreenRecorderState {
  isSupported: boolean
  isPreparing: boolean
  isRecording: boolean
  elapsedMs: number
  error: string | null
  recordingBlob: Blob | null
  recordingUrl: string | null
  mimeType: string | null
}

interface ScreenRecorderApi extends ScreenRecorderState {
  start: () => Promise<void>
  stop: () => Promise<Blob | null>
  reset: () => void
  download: (filename?: string) => void
}

function resolveMimeType(preferred?: string): string | null {
  if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') {
    return null
  }

  const candidates = preferred
    ? [preferred]
    : [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
        'video/mp4;codecs=h264,aac',
        'video/mp4'
      ]

  for (const candidate of candidates) {
    if (MediaRecorder.isTypeSupported(candidate)) {
      return candidate
    }
  }

  return null
}

export function useScreenRecorder(options: UseScreenRecorderOptions = {}): ScreenRecorderApi {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const stopResolverRef = useRef<((blob: Blob | null) => void) | null>(null)
  const elapsedTimerRef = useRef<number | null>(null)
  const startTimeRef = useRef<number | null>(null)

  const [isPreparing, setIsPreparing] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null)
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null)
  const [mimeType, setMimeType] = useState<string | null>(() => resolveMimeType(options.mimeType))

  const isSupported = useMemo(() => {
    return typeof window !== 'undefined' && typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getDisplayMedia && typeof MediaRecorder !== 'undefined'
  }, [])

  const cleanupStream = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop())
      mediaStreamRef.current = null
    }
  }, [])

  const cleanupTimer = useCallback(() => {
    if (elapsedTimerRef.current) {
      window.clearInterval(elapsedTimerRef.current)
      elapsedTimerRef.current = null
    }
    startTimeRef.current = null
    setElapsedMs(0)
  }, [])

  const updateElapsed = useCallback(() => {
    if (startTimeRef.current === null) return
    setElapsedMs(Date.now() - startTimeRef.current)
  }, [])

  const reset = useCallback(() => {
    cleanupTimer()
    cleanupStream()
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    mediaRecorderRef.current = null
    stopResolverRef.current = null
    setIsRecording(false)
    setIsPreparing(false)
    setError(null)
    if (recordingUrl) {
      URL.revokeObjectURL(recordingUrl)
    }
    setRecordingUrl(null)
    setRecordingBlob(null)
  }, [cleanupStream, cleanupTimer, recordingUrl])

  useEffect(() => {
    return () => {
      reset()
    }
  }, [reset])

  const start = useCallback(async () => {
    if (!isSupported) {
      setError('Screen recording is not supported in this browser.')
      return
    }
    if (isRecording || isPreparing) {
      return
    }

    setError(null)
    setIsPreparing(true)
    setRecordingBlob(null)
    if (recordingUrl) {
      URL.revokeObjectURL(recordingUrl)
      setRecordingUrl(null)
    }

    try {
      const displayMediaOptions: DisplayMediaStreamConstraints = {
        video: options.video ?? {
          frameRate: 30,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: options.audio ?? true,
        preferCurrentTab: options.preferCurrentTab ?? true
      }

      const mediaStream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions)
      mediaStreamRef.current = mediaStream

      const resolvedMimeType = resolveMimeType(options.mimeType)
      setMimeType(resolvedMimeType)

      const recorder = new MediaRecorder(mediaStream, resolvedMimeType ? { mimeType: resolvedMimeType } : undefined)
      mediaRecorderRef.current = recorder

      const chunks: Blob[] = []

      recorder.ondataavailable = event => {
        if (event.data && event.data.size > 0) {
          chunks.push(event.data)
        }
      }

      recorder.onerror = event => {
        console.error('[ScreenRecorder] MediaRecorder error', event)
        setError('Recording failed. Please try again.')
        reset()
      }

      recorder.onstop = () => {
        cleanupTimer()
        const blob = chunks.length > 0 ? new Blob(chunks, { type: resolvedMimeType ?? 'video/webm' }) : null
        setRecordingBlob(blob)
        if (blob) {
          const url = URL.createObjectURL(blob)
          setRecordingUrl(url)
        }
        setIsRecording(false)
        setIsPreparing(false)
        cleanupStream()
        if (stopResolverRef.current) {
          stopResolverRef.current(blob)
          stopResolverRef.current = null
        }
      }

      recorder.start()
      startTimeRef.current = Date.now()
      elapsedTimerRef.current = window.setInterval(updateElapsed, 500)
      setIsRecording(true)
      setIsPreparing(false)
    } catch (err) {
      console.error('[ScreenRecorder] Failed to start recording', err)
      setError(err instanceof Error ? err.message : 'Unable to start recording.')
      setIsPreparing(false)
      cleanupStream()
    }
  }, [cleanupStream, cleanupTimer, isPreparing, isRecording, isSupported, options.audio, options.mimeType, options.preferCurrentTab, options.video, recordingUrl, reset, updateElapsed])

  const stop = useCallback(async (): Promise<Blob | null> => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
      return recordingBlob
    }

    return new Promise<Blob | null>(resolve => {
      stopResolverRef.current = resolve
      try {
        mediaRecorderRef.current?.stop()
      } catch (err) {
        console.error('[ScreenRecorder] Failed to stop recording', err)
        setError('Failed to finalize recording.')
        resolve(null)
      }
    })
  }, [recordingBlob])

  const download = useCallback(
    (filename = 'screening-room-recording.webm') => {
      if (!recordingBlob && !recordingUrl) {
        setError('No recording available to download.')
        return
      }
      const href = recordingUrl ?? URL.createObjectURL(recordingBlob!)
      const anchor = document.createElement('a')
      anchor.href = href
      anchor.download = filename
      anchor.click()
      if (!recordingUrl) {
        URL.revokeObjectURL(href)
      }
    },
    [recordingBlob, recordingUrl]
  )

  return {
    isSupported,
    isPreparing,
    isRecording,
    elapsedMs,
    error,
    recordingBlob,
    recordingUrl,
    mimeType,
    start,
    stop,
    reset,
    download
  }
}

