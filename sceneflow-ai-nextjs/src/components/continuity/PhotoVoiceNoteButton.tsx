'use client'

import React, { useEffect, useRef, useState } from 'react'
import { upload } from '@vercel/blob/client'
import { Loader2, Mic, Square, Volume2 } from 'lucide-react'
import type { ContinuityUploadedMediaItem } from './ContinuityVoiceCaptureDrawer'

interface PhotoVoiceNoteButtonProps {
  token: string
  submission: ContinuityUploadedMediaItem
  onUpdated: (updated: ContinuityUploadedMediaItem) => void
}

function pickAudioMime(): string {
  if (typeof MediaRecorder === 'undefined') return 'audio/webm'
  for (const c of ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg']) {
    if (MediaRecorder.isTypeSupported(c)) return c
  }
  return ''
}

export function PhotoVoiceNoteButton({
  token,
  submission,
  onUpdated,
}: PhotoVoiceNoteButtonProps) {
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const durationRef = useRef(0)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  const uploadRecordedBlob = async (blob: Blob, durSec: number) => {
    setSaving(true)
    setError(null)
    try {
      const mimeType = blob.type || 'audio/webm'
      const ext = mimeType.includes('mp4') ? 'm4a' : mimeType.includes('ogg') ? 'ogg' : 'webm'
      const file = new File([blob], `photo-story-${submission.id.slice(0, 8)}-${Date.now()}.${ext}`, {
        type: mimeType,
      })

      const uploaded = await upload(`client-continuity/photo-notes/${file.name}`, file, {
        access: 'public',
        handleUploadUrl: `/api/share/continuity/${encodeURIComponent(token)}/media-upload-url`,
        clientPayload: JSON.stringify({ mediaKind: 'audio' }),
      })

      const res = await fetch(
        `/api/share/continuity/${encodeURIComponent(token)}/photo-voice-note`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            submissionId: submission.id,
            audioBlobUrl: uploaded.url,
            mimeType,
            durationSeconds: Math.max(1, durSec),
          }),
        }
      )
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Could not save photo voice note')
      }
      onUpdated(data.submission)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Voice note upload failed')
    } finally {
      setSaving(false)
    }
  }

  const startRecording = async () => {
    setError(null)
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setError('Microphone recording is unavailable in this browser.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      chunksRef.current = []
      const mimeType = pickAudioMime()
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream)
      recorderRef.current = recorder
      setSeconds(0)
      durationRef.current = 0

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data)
      }
      recorder.onstop = () => {
        const finalType = recorder.mimeType || mimeType || 'audio/webm'
        const blob = new Blob(chunksRef.current, { type: finalType })
        void uploadRecordedBlob(blob, durationRef.current)
      }

      recorder.start(250)
      setRecording(true)
      timerRef.current = setInterval(() => {
        durationRef.current += 1
        setSeconds((s) => s + 1)
      }, 1000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not access microphone')
    }
  }

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop()
    }
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setRecording(false)
  }

  const existingUrl = submission.metadata?.photoVoiceNoteUrl
  const existingTranscript = submission.metadata?.photoVoiceNoteTranscript

  if (existingUrl) {
    return (
      <div className="mt-1.5 rounded-lg border border-cyan-500/25 bg-cyan-950/20 p-1.5 space-y-1">
        <div className="flex items-center justify-between gap-1">
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-cyan-300">
            <Volume2 className="w-3 h-3" />
            Photo Story Saved
          </span>
        </div>
        <audio controls src={existingUrl} className="w-full h-6" />
        {existingTranscript && (
          <p className="text-[10px] text-slate-300 line-clamp-2 italic">
            &ldquo;{existingTranscript}&rdquo;
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="mt-1 space-y-1">
      {recording ? (
        <button
          type="button"
          onClick={stopRecording}
          className="w-full inline-flex items-center justify-center gap-1 rounded-md bg-red-600 hover:bg-red-500 px-2 py-1 text-[10px] font-semibold text-white animate-pulse"
        >
          <Square className="w-2.5 h-2.5 fill-current" />
          <span>Stop ({seconds}s)</span>
        </button>
      ) : (
        <button
          type="button"
          disabled={saving}
          onClick={() => void startRecording()}
          title="Record a short voice note explaining who is in this photo, when it was taken, and the memory behind it"
          className="w-full inline-flex items-center justify-center gap-1 rounded-md border border-slate-700 bg-slate-900 hover:bg-slate-800 px-2 py-1 text-[10px] font-medium text-cyan-300 disabled:opacity-50 transition"
        >
          {saving ? (
            <>
              <Loader2 className="w-2.5 h-2.5 animate-spin" />
              <span>Saving story…</span>
            </>
          ) : (
            <>
              <Mic className="w-2.5 h-2.5" />
              <span>Tell photo story</span>
            </>
          )}
        </button>
      )}
      {error && <p className="text-[10px] text-red-300 leading-tight">{error}</p>}
    </div>
  )
}
