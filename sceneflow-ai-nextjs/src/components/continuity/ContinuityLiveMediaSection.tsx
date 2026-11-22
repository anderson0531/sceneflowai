'use client'

import React, { useEffect, useRef, useState } from 'react'
import { upload } from '@vercel/blob/client'
import {
  AudioLines,
  BookOpen,
  CheckCircle2,
  Film,
  Loader2,
  Mic,
  Play,
  Sparkles,
  Square,
  Upload,
  Video,
} from 'lucide-react'
import type { ClientMediaUsageIntent } from '@/models/ClientAssetSubmission'
import type {
  ContinuityPortalSlot,
  ContinuityScenePromptCard,
} from '@/lib/continuity/continuityPortalService'
import type { ContinuityUploadedMediaItem } from './ContinuityVoiceCaptureDrawer'
import { resolveGoogleVoiceCloneLanguageCode } from '@/lib/continuity/voiceConsentScripts'

interface ContinuityLiveMediaSectionProps {
  token: string
  locale: string
  reviewerName: string
  characterSlots: ContinuityPortalSlot[]
  scenePromptCards?: ContinuityScenePromptCard[]
  uploadedMedia: ContinuityUploadedMediaItem[]
  onUploaded: (submission: ContinuityUploadedMediaItem) => void
}

const USAGE_OPTIONS: Array<{
  id: ClientMediaUsageIntent
  label: string
  hint: string
  Icon: typeof Video
}> = [
  {
    id: 'live_intro',
    label: 'Live Scene Intro',
    hint: 'Use on-camera video + real voice for scene intros',
    Icon: Video,
  },
  {
    id: 'reenactment_vo',
    label: 'Story Narration (Reenactment)',
    hint: 'Extract real voiceover to narrate 4K AI reenactments',
    Icon: AudioLines,
  },
  {
    id: 'voice_clone',
    label: 'Voice Reference Only',
    hint: 'Extract clean voice DNA from this clip',
    Icon: Mic,
  },
]

function formatTimestamp(sec: number): string {
  const s = Math.max(0, Math.floor(sec))
  const m = Math.floor(s / 60)
  const rem = s % 60
  return `${m}:${String(rem).padStart(2, '0')}`
}

function pickAudioMime(): string {
  if (typeof MediaRecorder === 'undefined') return 'audio/webm'
  for (const c of ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg']) {
    if (MediaRecorder.isTypeSupported(c)) return c
  }
  return ''
}

export function ContinuityLiveMediaSection({
  token,
  locale,
  reviewerName,
  characterSlots,
  scenePromptCards = [],
  uploadedMedia,
  onUploaded,
}: ContinuityLiveMediaSectionProps) {
  const [usageIntent, setUsageIntent] = useState<ClientMediaUsageIntent>('live_intro')
  const [targetCharacterId, setTargetCharacterId] = useState<string>(
    characterSlots[0]?.slotId || ''
  )
  const [selectedPromptCard, setSelectedPromptCard] =
    useState<ContinuityScenePromptCard | null>(null)
  const [clipTitle, setClipTitle] = useState('')
  const [uploading, setUploading] = useState(false)
  const [progressPct, setProgressPct] = useState<number | null>(null)
  const [statusLabel, setStatusLabel] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Quick audio-only story recorder right inside the teleprompter / live media card
  const [recordingAudio, setRecordingAudio] = useState(false)
  const [audioRecSeconds, setAudioRecSeconds] = useState(0)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Media element refs for clickable auto-chapters seeking
  const mediaPlayerRefs = useRef<Record<string, HTMLMediaElement | null>>({})

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  const uploadFileToContinuity = async (
    file: File,
    overrideIntent?: ClientMediaUsageIntent,
    overrideCard?: ContinuityScenePromptCard | null
  ) => {
    setUploading(true)
    setProgressPct(0)
    setError(null)

    const activeCard = overrideCard !== undefined ? overrideCard : selectedPromptCard
    const effectiveIntent = overrideIntent || usageIntent
    const isVideo = file.type.startsWith('video/') || /\.(mp4|mov|webm|m4v|mkv)$/i.test(file.name)
    const slotType = isVideo ? 'live_video' : 'story_audio'
    const selectedChar = characterSlots.find((c) => c.slotId === targetCharacterId) || null
    const resolvedTitle =
      clipTitle.trim() ||
      (activeCard
        ? `Scene ${activeCard.sceneNumber}: ${activeCard.title}`
        : selectedChar
          ? `${selectedChar.name} — ${isVideo ? 'Live Video' : 'Story Audio'}`
          : file.name.replace(/\.[^.]+$/, '').slice(0, 80) || 'Client Media Clip')

    try {
      setStatusLabel(`Uploading ${isVideo ? 'video' : 'audio'} directly to studio storage…`)
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 80)
      const blob = await upload(
        `client-continuity/media/${Date.now()}-${safeName}`,
        file,
        {
          access: 'public',
          handleUploadUrl: `/api/share/continuity/${encodeURIComponent(token)}/media-upload-url`,
          clientPayload: JSON.stringify({ mediaKind: isVideo ? 'video' : 'audio' }),
          onUploadProgress: (evt) => {
            if (evt.percentage !== undefined) {
              setProgressPct(Math.round(evt.percentage))
            }
          },
        }
      )

      setProgressPct(100)
      setStatusLabel(
        isVideo
          ? 'Extracting clean narration stem, auto-chapters, transcript & Voice DNA…'
          : 'Polishing audio stem, auto-chapters, transcript & Voice DNA…'
      )

      const finalizeRes = await fetch(
        `/api/share/continuity/${encodeURIComponent(token)}/media-finalize`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slotId: activeCard ? `${slotType}:${activeCard.sceneId}:${Date.now()}` : `${slotType}:${Date.now()}`,
            slotType,
            slotName: resolvedTitle,
            blobUrl: blob.url,
            mimeType: file.type || (isVideo ? 'video/mp4' : 'audio/mpeg'),
            fileSizeBytes: file.size,
            usageIntent: effectiveIntent,
            targetCharacterId: selectedChar?.slotId || null,
            targetCharacterName: selectedChar?.name || null,
            linkedSceneId: activeCard?.sceneId || null,
            linkedSceneNumber: activeCard?.sceneNumber ?? null,
            linkedSceneTitle: activeCard?.title || null,
            caption: clipTitle.trim() || activeCard?.title || null,
            reviewerName: reviewerName.trim() || undefined,
            languageCode: resolveGoogleVoiceCloneLanguageCode(locale),
          }),
        }
      )

      const data = await finalizeRes.json()
      if (!finalizeRes.ok || !data.success) {
        throw new Error(data.error || 'Media upload processing failed')
      }

      onUploaded(data.submission)
      setClipTitle('')
      setStatusLabel(null)
      setProgressPct(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Media upload failed')
      setStatusLabel(null)
      setProgressPct(null)
    } finally {
      setUploading(false)
    }
  }

  const handleMediaFileSelected = async (
    fileList: FileList | null,
    overrideIntent?: ClientMediaUsageIntent,
    overrideCard?: ContinuityScenePromptCard | null
  ) => {
    if (!fileList || fileList.length === 0) return
    await uploadFileToContinuity(fileList[0], overrideIntent, overrideCard)
  }

  const startAudioStoryRecording = async (
    overrideIntent: ClientMediaUsageIntent = 'reenactment_vo'
  ) => {
    setError(null)
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setError('Microphone recording is unavailable in this browser. Please upload an audio file.')
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
      setAudioRecSeconds(0)

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data)
      }
      recorder.onstop = () => {
        const finalType = recorder.mimeType || mimeType || 'audio/webm'
        const ext = finalType.includes('mp4') ? 'm4a' : finalType.includes('ogg') ? 'ogg' : 'webm'
        const blob = new Blob(chunksRef.current, { type: finalType })
        const file = new File([blob], `story-recording-${Date.now()}.${ext}`, { type: finalType })
        void uploadFileToContinuity(file, overrideIntent, selectedPromptCard)
      }

      recorder.start(250)
      setRecordingAudio(true)
      timerRef.current = setInterval(() => setAudioRecSeconds((s) => s + 1), 1000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not access microphone')
    }
  }

  const stopAudioStoryRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop()
    }
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setRecordingAudio(false)
  }

  const seekClipTo = (submissionId: string, startSec: number) => {
    const el = mediaPlayerRefs.current[submissionId]
    if (!el) return
    try {
      el.currentTime = startSec
      void el.play()
    } catch {
      // Ignore autoplay restrictions
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Film className="w-5 h-5 text-cyan-400 shrink-0" />
            <span>Live Video Clips &amp; Audio Stories</span>
            {uploadedMedia.length > 0 && (
              <span className="text-xs font-normal text-slate-400">({uploadedMedia.length})</span>
            )}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Record guided chapter intros or upload a full interview/story. We automatically extract
            clean narration audio, clickable chapters, and your Voice DNA.
          </p>
        </div>
      </div>

      {/* Wave 2: Guided Teleprompter / Memory Prompt Cards */}
      {scenePromptCards.length > 0 && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-950/15 p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-amber-300 shrink-0" />
              <h3 className="text-sm font-semibold text-amber-100">
                Guided Memory Prompt Cards (Tap a Chapter to Record)
              </h3>
            </div>
            {selectedPromptCard && (
              <button
                type="button"
                onClick={() => setSelectedPromptCard(null)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Clear selection
              </button>
            )}
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {scenePromptCards.map((card) => {
              const isSelected = selectedPromptCard?.sceneId === card.sceneId
              const hasClipForScene = uploadedMedia.some(
                (u) => u.metadata?.linkedSceneId === card.sceneId
              )
              return (
                <button
                  key={card.sceneId}
                  type="button"
                  disabled={uploading || recordingAudio}
                  onClick={() => {
                    setSelectedPromptCard(isSelected ? null : card)
                    if (!isSelected) {
                      setClipTitle(`Scene ${card.sceneNumber}: ${card.title}`)
                    }
                  }}
                  className={`rounded-xl border p-3 text-left transition ${
                    isSelected
                      ? 'border-amber-400 bg-amber-500/20 text-white shadow-sm'
                      : hasClipForScene
                        ? 'border-emerald-500/40 bg-emerald-950/20 text-slate-100 hover:border-emerald-400'
                        : 'border-slate-800 bg-slate-950/70 text-slate-200 hover:border-amber-500/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
                      Chapter {card.sceneNumber}
                    </span>
                    {hasClipForScene ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <span className="text-[10px] text-slate-400">
                        ~{card.suggestedDurationSec}s
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-white mt-0.5 line-clamp-1">
                    {card.title}
                  </p>
                  {card.eraOrSetting && (
                    <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                      {card.eraOrSetting}
                    </p>
                  )}
                </button>
              )
            })}
          </div>

          {/* Large-Font Senior-Friendly Teleprompter Cue Box */}
          {selectedPromptCard && (
            <div className="rounded-xl border border-amber-400/50 bg-slate-950/95 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                  Teleprompter Cue · Chapter {selectedPromptCard.sceneNumber}
                </span>
                <span className="text-xs text-slate-400">
                  Aim for ~{selectedPromptCard.suggestedDurationSec} seconds in your own words
                </span>
              </div>
              <p className="text-base sm:text-lg font-medium text-white leading-relaxed">
                &ldquo;{selectedPromptCard.promptCue}&rdquo;
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <label className="cursor-pointer inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-950 transition">
                  <Video className="w-4 h-4 shrink-0" />
                  <span>Record Live Video Intro</span>
                  <input
                    type="file"
                    accept="video/*"
                    capture="user"
                    className="hidden"
                    disabled={uploading || recordingAudio}
                    onChange={(e) => {
                      void handleMediaFileSelected(e.target.files, 'live_intro', selectedPromptCard)
                      e.currentTarget.value = ''
                    }}
                  />
                </label>

                {recordingAudio ? (
                  <button
                    type="button"
                    onClick={stopAudioStoryRecording}
                    className="inline-flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-500 px-4 py-2.5 text-xs sm:text-sm font-bold text-white animate-pulse"
                  >
                    <Square className="w-4 h-4 fill-current" />
                    <span>Stop Audio ({formatTimestamp(audioRecSeconds)})</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => void startAudioStoryRecording('reenactment_vo')}
                    className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white transition"
                  >
                    <Mic className="w-4 h-4 shrink-0" />
                    <span>Record Audio Story</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-5 space-y-4">
        {/* 3-pill Usage Intent Selector */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-slate-300">How should this clip be used?</p>
          <div className="grid sm:grid-cols-3 gap-2">
            {USAGE_OPTIONS.map((opt) => {
              const active = usageIntent === opt.id
              const OptIcon = opt.Icon
              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={uploading}
                  onClick={() => setUsageIntent(opt.id)}
                  className={`rounded-xl border p-3 text-left transition ${
                    active
                      ? 'border-cyan-400/70 bg-cyan-500/15 text-white'
                      : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-semibold">
                    <OptIcon className={`w-3.5 h-3.5 ${active ? 'text-cyan-300' : 'text-slate-400'}`} />
                    <span>{opt.label}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-snug">{opt.hint}</p>
                </button>
              )
            })}
          </div>
        </div>

        {/* Optional Chapter Title + Speaker Link */}
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="block text-xs text-slate-300">
            <span>Clip Title / Chapter Note (Optional)</span>
            <input
              type="text"
              disabled={uploading}
              value={clipTitle}
              onChange={(e) => setClipTitle(e.target.value)}
              placeholder="e.g., Full Living Room Interview or Chapter 1 Intro"
              className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs sm:text-sm text-white"
            />
          </label>
          {characterSlots.length > 0 && (
            <label className="block text-xs text-slate-300">
              <span>Speaker / Subject (Links Voice DNA)</span>
              <select
                disabled={uploading}
                value={targetCharacterId}
                onChange={(e) => setTargetCharacterId(e.target.value)}
                className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs sm:text-sm text-white"
              >
                <option value="">General / Narrator</option>
                {characterSlots.map((c) => (
                  <option key={c.slotId} value={c.slotId}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/40 bg-red-950/30 px-3.5 py-2.5 text-xs text-red-200">
            {error}
          </div>
        )}

        {uploading && (
          <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-3 space-y-2">
            <div className="flex items-center justify-between text-xs text-cyan-200">
              <span className="inline-flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                {statusLabel || 'Uploading…'}
              </span>
              {progressPct !== null && <span>{progressPct}%</span>}
            </div>
            {progressPct !== null && (
              <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-cyan-400 transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(5, progressPct))}%` }}
                />
              </div>
            )}
          </div>
        )}

        {/* Direct Upload, Live Video Camera, & Live Audio Recorder Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <label className="cursor-pointer flex-1 min-w-[180px] inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white transition">
            <Upload className="w-4 h-4 shrink-0" />
            <span>Upload Video or Audio Clip</span>
            <input
              type="file"
              accept="video/*,audio/*"
              className="hidden"
              disabled={uploading || recordingAudio}
              onChange={(e) => {
                void handleMediaFileSelected(e.target.files)
                e.currentTarget.value = ''
              }}
            />
          </label>

          <label className="cursor-pointer inline-flex items-center justify-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 px-4 py-2.5 text-xs sm:text-sm font-medium text-slate-100 transition">
            <Video className="w-4 h-4 text-purple-400 shrink-0" />
            <span>Record Live Video</span>
            <input
              type="file"
              accept="video/*"
              capture="user"
              className="hidden"
              disabled={uploading || recordingAudio}
              onChange={(e) => {
                void handleMediaFileSelected(e.target.files, 'live_intro')
                e.currentTarget.value = ''
              }}
            />
          </label>

          {recordingAudio ? (
            <button
              type="button"
              onClick={stopAudioStoryRecording}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-500 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white animate-pulse"
            >
              <Square className="w-4 h-4 fill-current" />
              <span>Stop ({formatTimestamp(audioRecSeconds)})</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={uploading}
              onClick={() => void startAudioStoryRecording(usageIntent)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 px-4 py-2.5 text-xs sm:text-sm font-medium text-slate-100 transition"
            >
              <Mic className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Record Audio</span>
            </button>
          )}
        </div>

        {/* Uploaded Clips Preview List with Clickable Auto-Chapters */}
        {uploadedMedia.length > 0 && (
          <div className="pt-3 border-t border-slate-800 space-y-3">
            <p className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              Uploaded Clips ({uploadedMedia.length})
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              {uploadedMedia.map((item) => {
                const isVideo =
                  item.slotType === 'live_video' || item.mimeType?.startsWith('video/')
                const meta = item.metadata
                const chapters = Array.isArray(meta?.chapters) ? meta.chapters : []
                return (
                  <div
                    key={item.id}
                    className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white leading-snug">
                          {item.slotName}
                        </p>
                        {meta?.linkedSceneNumber && (
                          <span className="inline-block mt-0.5 text-[10px] text-amber-300 font-medium">
                            Linked to Chapter {meta.linkedSceneNumber}
                          </span>
                        )}
                      </div>
                      <span className="shrink-0 rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-cyan-300">
                        {meta?.usageIntent === 'live_intro'
                          ? 'Live Intro'
                          : meta?.usageIntent === 'reenactment_vo'
                            ? 'Reenactment VO'
                            : 'Voice Ref'}
                      </span>
                    </div>

                    {isVideo ? (
                      <video
                        ref={(el) => {
                          mediaPlayerRefs.current[item.id] = el
                        }}
                        controls
                        playsInline
                        src={item.blobUrl}
                        className="w-full max-h-44 rounded-lg bg-black border border-slate-800"
                      />
                    ) : (
                      <audio
                        ref={(el) => {
                          mediaPlayerRefs.current[item.id] = el
                        }}
                        controls
                        src={item.blobUrl}
                        className="w-full h-9"
                      />
                    )}

                    {isVideo && meta?.extractedAudioUrl && (
                      <div className="rounded-lg border border-emerald-500/20 bg-emerald-950/20 p-2 space-y-1">
                        <p className="text-[10px] font-medium text-emerald-300 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          Extracted Narration Audio Stem Ready
                        </p>
                        <audio controls src={meta.extractedAudioUrl} className="w-full h-7" />
                      </div>
                    )}

                    {/* Wave 2: Clickable Auto-Detected Story Chapters */}
                    {chapters.length > 0 && (
                      <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-2 space-y-1.5">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-300">
                          Auto-Detected Story Chapters ({chapters.length})
                        </p>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {chapters.map((ch, cIdx) => (
                            <button
                              key={`${item.id}-ch-${cIdx}`}
                              type="button"
                              onClick={() => seekClipTo(item.id, ch.startSeconds)}
                              className="w-full flex items-start gap-2 rounded-md bg-slate-950/80 hover:bg-slate-800 px-2 py-1 text-left transition"
                            >
                              <Play className="w-3 h-3 text-cyan-400 shrink-0 mt-0.5" />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-1 text-[10px]">
                                  <span className="font-semibold text-white truncate">
                                    {ch.title}
                                  </span>
                                  <span className="text-slate-400 font-mono shrink-0">
                                    {formatTimestamp(ch.startSeconds)}–{formatTimestamp(ch.endSeconds)}
                                  </span>
                                </div>
                                {ch.quote && (
                                  <p className="text-[10px] text-slate-400 line-clamp-1 italic">
                                    &ldquo;{ch.quote}&rdquo;
                                  </p>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {meta?.acousticVoiceDna?.summary && (
                      <p className="text-[11px] text-cyan-200/90">
                        Voice DNA: {meta.acousticVoiceDna.summary}
                      </p>
                    )}

                    {meta?.transcript && chapters.length === 0 && (
                      <p className="text-[11px] text-slate-400 line-clamp-2 italic">
                        &ldquo;{meta.transcript}&rdquo;
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
