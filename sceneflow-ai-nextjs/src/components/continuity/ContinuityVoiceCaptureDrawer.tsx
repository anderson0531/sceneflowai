'use client'

import React, { useEffect, useRef, useState } from 'react'
import { upload } from '@vercel/blob/client'
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  Mic,
  ShieldCheck,
  Sparkles,
  Square,
  Upload,
  Volume2,
} from 'lucide-react'
import { getGoogleVoiceCloneConsentForLocale } from '@/lib/continuity/voiceConsentScripts'
import type { ClientAssetSubmissionMetadata } from '@/models/ClientAssetSubmission'

export interface ContinuityUploadedMediaItem {
  id: string
  slotId: string
  slotType: string
  slotName: string
  blobUrl: string
  mimeType?: string
  caption: string | null
  metadata?: ClientAssetSubmissionMetadata | null
  approvalStatus?: string
}

interface ContinuityVoiceCaptureDrawerProps {
  token: string
  characterSlotId: string
  characterName: string
  locale: string
  reviewerName: string
  hasExistingVoiceProfile?: boolean
  existingVoiceSummary?: string | null
  existingVoiceSubmissions: ContinuityUploadedMediaItem[]
  onUploaded: (submission: ContinuityUploadedMediaItem) => void
}

function pickRecorderMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return 'audio/webm'
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg']
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c)) return c
  }
  return ''
}

function formatSeconds(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function ContinuityVoiceCaptureDrawer({
  token,
  characterSlotId,
  characterName,
  locale,
  reviewerName,
  hasExistingVoiceProfile,
  existingVoiceSummary,
  existingVoiceSubmissions,
  onUploaded,
}: ContinuityVoiceCaptureDrawerProps) {
  const [expanded, setExpanded] = useState(false)
  const [sampleBlob, setSampleBlob] = useState<Blob | null>(null)
  const [samplePreviewUrl, setSamplePreviewUrl] = useState<string | null>(null)
  const [sampleFilename, setSampleFilename] = useState<string>('voice-sample.webm')
  const [sampleSeconds, setSampleSeconds] = useState(0)

  const [consentBlob, setConsentBlob] = useState<Blob | null>(null)
  const [consentPreviewUrl, setConsentPreviewUrl] = useState<string | null>(null)
  const [consentSeconds, setConsentSeconds] = useState(0)

  const [recordingMode, setRecordingMode] = useState<'idle' | 'sample' | 'consent'>('idle')
  const [submitting, setSubmitting] = useState(false)
  const [statusLabel, setStatusLabel] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const consentSpec = getGoogleVoiceCloneConsentForLocale(locale)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      streamRef.current?.getTracks().forEach((t) => t.stop())
      if (samplePreviewUrl) URL.revokeObjectURL(samplePreviewUrl)
      if (consentPreviewUrl) URL.revokeObjectURL(consentPreviewUrl)
    }
  }, [samplePreviewUrl, consentPreviewUrl])

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setRecordingMode('idle')
  }

  const startRecording = async (mode: 'sample' | 'consent') => {
    setError(null)
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setError('Microphone recording is unavailable in this browser. You can upload an audio file instead.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      chunksRef.current = []
      const mimeType = pickRecorderMimeType()
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream)
      mediaRecorderRef.current = recorder

      if (mode === 'sample') setSampleSeconds(0)
      else setConsentSeconds(0)

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data)
      }
      recorder.onstop = () => {
        const finalType = recorder.mimeType || mimeType || 'audio/webm'
        const blob = new Blob(chunksRef.current, { type: finalType })
        const url = URL.createObjectURL(blob)
        const ext = finalType.includes('mp4') ? 'm4a' : finalType.includes('ogg') ? 'ogg' : 'webm'
        if (mode === 'sample') {
          setSamplePreviewUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev)
            return url
          })
          setSampleBlob(blob)
          setSampleFilename(`voice-sample-${Date.now()}.${ext}`)
        } else {
          setConsentPreviewUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev)
            return url
          })
          setConsentBlob(blob)
        }
      }

      recorder.start(250)
      setRecordingMode(mode)
      timerRef.current = setInterval(() => {
        if (mode === 'sample') setSampleSeconds((s) => s + 1)
        else setConsentSeconds((s) => s + 1)
      }, 1000)
    } catch (err) {
      setError(
        err instanceof Error
          ? `Microphone access failed: ${err.message}`
          : 'Could not access microphone'
      )
    }
  }

  const handleAudioFileSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return
    const file = files[0]
    setError(null)
    const url = URL.createObjectURL(file)
    setSamplePreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return url
    })
    setSampleBlob(file)
    setSampleFilename(file.name || 'voice-sample.mp3')
    setSampleSeconds(0)
  }

  const handleSubmitVoice = async () => {
    if (!sampleBlob) return
    setSubmitting(true)
    setError(null)
    try {
      const safeCharSeg = characterSlotId.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 48)
      const uploadUrlEndpoint = `/api/share/continuity/${encodeURIComponent(token)}/media-upload-url`

      setStatusLabel('Uploading voice sample…')
      const sampleFile =
        sampleBlob instanceof File
          ? sampleBlob
          : new File([sampleBlob], sampleFilename, {
              type: sampleBlob.type || 'audio/webm',
            })

      const sampleUpload = await upload(
        `client-continuity/voice/${safeCharSeg}-${Date.now()}-${sampleFile.name}`,
        sampleFile,
        {
          access: 'public',
          handleUploadUrl: uploadUrlEndpoint,
          clientPayload: JSON.stringify({ mediaKind: 'audio' }),
        }
      )

      let consentBlobUrl: string | null = null
      if (consentBlob) {
        setStatusLabel('Uploading spoken consent…')
        const consentExt = consentBlob.type?.includes('mp4') ? 'm4a' : 'webm'
        const consentFile = new File(
          [consentBlob],
          `consent-${safeCharSeg}-${Date.now()}.${consentExt}`,
          { type: consentBlob.type || 'audio/webm' }
        )
        const consentUpload = await upload(
          `client-continuity/voice/${consentFile.name}`,
          consentFile,
          {
            access: 'public',
            handleUploadUrl: uploadUrlEndpoint,
            clientPayload: JSON.stringify({ mediaKind: 'audio' }),
          }
        )
        consentBlobUrl = consentUpload.url
      }

      setStatusLabel('Analyzing Acoustic Voice DNA & voice model…')
      const finalizeRes = await fetch(
        `/api/share/continuity/${encodeURIComponent(token)}/media-finalize`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slotId: `voice:${characterSlotId}`,
            slotType: 'character_voice',
            slotName: characterName,
            blobUrl: sampleUpload.url,
            mimeType: sampleFile.type || 'audio/webm',
            fileSizeBytes: sampleFile.size,
            usageIntent: 'voice_clone',
            targetCharacterId: characterSlotId,
            targetCharacterName: characterName,
            consentAudioBlobUrl: consentBlobUrl,
            reviewerName: reviewerName.trim() || undefined,
            languageCode: consentSpec.languageCode,
          }),
        }
      )

      const data = await finalizeRes.json()
      if (!finalizeRes.ok || !data.success) {
        throw new Error(data.error || 'Voice processing failed')
      }

      onUploaded(data.submission)
      setSampleBlob(null)
      setConsentBlob(null)
      setSamplePreviewUrl(null)
      setConsentPreviewUrl(null)
      setSampleSeconds(0)
      setConsentSeconds(0)
      setStatusLabel(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Voice upload failed')
      setStatusLabel(null)
    } finally {
      setSubmitting(false)
    }
  }

  const latestVoice = existingVoiceSubmissions[0] || null
  const hasVoice = Boolean(hasExistingVoiceProfile || latestVoice)

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/70 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="w-full px-3.5 py-2.5 flex items-center justify-between gap-2 text-left hover:bg-slate-900/70 transition"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Volume2 className={`w-4 h-4 shrink-0 ${hasVoice ? 'text-emerald-400' : 'text-cyan-400'}`} />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white truncate">
              {hasVoice ? 'Voice Sample Captured' : 'Add Voice Sample (Optional)'}
            </p>
            <p className="text-[11px] text-slate-400 truncate">
              {latestVoice?.metadata?.acousticVoiceDna?.summary ||
                existingVoiceSummary ||
                'For narration & in-scene dialogue voice matching'}
            </p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="px-3.5 pb-3.5 pt-2 border-t border-slate-800/80 space-y-3">
          {latestVoice && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/20 p-2.5 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {latestVoice.metadata?.googleVoiceCloningKey
                    ? 'Google Custom Voice Ready'
                    : 'Acoustic Voice DNA Ready'}
                </span>
                {latestVoice.metadata?.durationSeconds && (
                  <span className="text-[10px] text-slate-400">
                    {Math.round(latestVoice.metadata.durationSeconds)}s
                  </span>
                )}
              </div>
              <audio
                controls
                src={latestVoice.metadata?.extractedAudioUrl || latestVoice.blobUrl}
                className="w-full h-8"
              />
              {latestVoice.metadata?.acousticVoiceDna?.summary && (
                <p className="text-[11px] text-slate-300">
                  {latestVoice.metadata.acousticVoiceDna.summary}
                </p>
              )}
            </div>
          )}

          {error && (
            <p className="rounded-lg border border-red-500/40 bg-red-950/30 px-2.5 py-1.5 text-xs text-red-200">
              {error}
            </p>
          )}

          {/* Step 1: 15-30s Voice Sample */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-slate-200">
              1. Record or upload a 15–30 second natural voice sample
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {recordingMode === 'sample' ? (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-500 px-3 py-1.5 text-xs font-semibold text-white animate-pulse"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  Stop ({formatSeconds(sampleSeconds)})
                </button>
              ) : (
                <button
                  type="button"
                  disabled={submitting || recordingMode !== 'idle'}
                  onClick={() => void startRecording('sample')}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 px-3 py-1.5 text-xs font-semibold text-white"
                >
                  <Mic className="w-3.5 h-3.5" />
                  {sampleBlob ? 'Re-record Voice' : 'Record Voice'}
                </button>
              )}

              <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200">
                <Upload className="w-3.5 h-3.5 text-cyan-400" />
                <span>Upload Audio File</span>
                <input
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  disabled={submitting || recordingMode !== 'idle'}
                  onChange={(e) => {
                    handleAudioFileSelected(e.target.files)
                    e.currentTarget.value = ''
                  }}
                />
              </label>
            </div>
            {samplePreviewUrl && (
              <audio controls src={samplePreviewUrl} className="w-full h-8 mt-1" />
            )}
          </div>

          {/* Step 2: Spoken Consent Recording for Google Instant Custom Voice */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-2.5 space-y-2">
            <div className="flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-200">
                  2. Spoken Voice Cloning Consent (Recommended)
                </p>
                <p className="text-[11px] text-slate-400">
                  Read this exact sentence aloud to authorize exact voice cloning:
                </p>
                <blockquote className="rounded-md border border-purple-500/30 bg-purple-950/20 px-2.5 py-1.5 text-xs text-purple-100 italic leading-relaxed">
                  &ldquo;{consentSpec.script}&rdquo;
                </blockquote>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {recordingMode === 'consent' ? (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-500 px-3 py-1.5 text-xs font-semibold text-white animate-pulse"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  Stop Consent ({formatSeconds(consentSeconds)})
                </button>
              ) : (
                <button
                  type="button"
                  disabled={submitting || recordingMode !== 'idle'}
                  onClick={() => void startRecording('consent')}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600/90 hover:bg-purple-500 disabled:opacity-50 px-3 py-1.5 text-xs font-semibold text-white"
                >
                  <Mic className="w-3.5 h-3.5" />
                  {consentBlob ? 'Re-record Consent' : 'Record Spoken Consent'}
                </button>
              )}
              {consentBlob && (
                <span className="text-[11px] text-emerald-300 font-medium">Consent recorded</span>
              )}
            </div>
            {consentPreviewUrl && (
              <audio controls src={consentPreviewUrl} className="w-full h-8" />
            )}
          </div>

          <button
            type="button"
            disabled={!sampleBlob || submitting || recordingMode !== 'idle'}
            onClick={() => void handleSubmitVoice()}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-3.5 py-2 text-xs font-semibold text-white transition"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{statusLabel || 'Saving voice…'}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Save Voice Sample for {characterName}</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
