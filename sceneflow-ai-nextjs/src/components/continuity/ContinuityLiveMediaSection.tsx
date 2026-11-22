'use client'

import React, { useState } from 'react'
import { upload } from '@vercel/blob/client'
import {
  AudioLines,
  CheckCircle2,
  Film,
  Loader2,
  Mic,
  Sparkles,
  Upload,
  Video,
} from 'lucide-react'
import type { ClientMediaUsageIntent } from '@/models/ClientAssetSubmission'
import type { ContinuityPortalSlot } from '@/lib/continuity/continuityPortalService'
import type { ContinuityUploadedMediaItem } from './ContinuityVoiceCaptureDrawer'
import { resolveGoogleVoiceCloneLanguageCode } from '@/lib/continuity/voiceConsentScripts'

interface ContinuityLiveMediaSectionProps {
  token: string
  locale: string
  reviewerName: string
  characterSlots: ContinuityPortalSlot[]
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

export function ContinuityLiveMediaSection({
  token,
  locale,
  reviewerName,
  characterSlots,
  uploadedMedia,
  onUploaded,
}: ContinuityLiveMediaSectionProps) {
  const [usageIntent, setUsageIntent] = useState<ClientMediaUsageIntent>('live_intro')
  const [targetCharacterId, setTargetCharacterId] = useState<string>(
    characterSlots[0]?.slotId || ''
  )
  const [clipTitle, setClipTitle] = useState('')
  const [uploading, setUploading] = useState(false)
  const [progressPct, setProgressPct] = useState<number | null>(null)
  const [statusLabel, setStatusLabel] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleMediaFileSelected = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return
    const file = fileList[0]
    setUploading(true)
    setProgressPct(0)
    setError(null)

    const isVideo = file.type.startsWith('video/') || /\.(mp4|mov|webm|m4v|mkv)$/i.test(file.name)
    const slotType = isVideo ? 'live_video' : 'story_audio'
    const selectedChar = characterSlots.find((c) => c.slotId === targetCharacterId) || null
    const resolvedTitle =
      clipTitle.trim() ||
      (selectedChar
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
          ? 'Extracting clean narration audio stem, transcript & Voice DNA…'
          : 'Polishing audio stem, transcript & Voice DNA…'
      )

      const finalizeRes = await fetch(
        `/api/share/continuity/${encodeURIComponent(token)}/media-finalize`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slotId: `${slotType}:${Date.now()}`,
            slotType,
            slotName: resolvedTitle,
            blobUrl: blob.url,
            mimeType: file.type || (isVideo ? 'video/mp4' : 'audio/mpeg'),
            fileSizeBytes: file.size,
            usageIntent,
            targetCharacterId: selectedChar?.slotId || null,
            targetCharacterName: selectedChar?.name || null,
            caption: clipTitle.trim() || null,
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
            Upload on-camera memoir intros or spoken story recordings. Clean audio is automatically
            extracted for voiceover over 4K reenactment scenes.
          </p>
        </div>
      </div>

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
              placeholder="e.g., Chapter 1 Intro — Growing up in Ohio"
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

        {/* Direct Upload & Live Camera Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <label className="cursor-pointer flex-1 min-w-[180px] inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white transition">
            <Upload className="w-4 h-4 shrink-0" />
            <span>Upload Video or Audio Clip</span>
            <input
              type="file"
              accept="video/*,audio/*"
              className="hidden"
              disabled={uploading}
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
              disabled={uploading}
              onChange={(e) => {
                void handleMediaFileSelected(e.target.files)
                e.currentTarget.value = ''
              }}
            />
          </label>
        </div>

        {/* Uploaded Clips Preview List */}
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
                return (
                  <div
                    key={item.id}
                    className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-semibold text-white leading-snug">
                        {item.slotName}
                      </p>
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
                        controls
                        playsInline
                        src={item.blobUrl}
                        className="w-full max-h-44 rounded-lg bg-black border border-slate-800"
                      />
                    ) : (
                      <audio controls src={item.blobUrl} className="w-full h-9" />
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

                    {meta?.acousticVoiceDna?.summary && (
                      <p className="text-[11px] text-cyan-200/90">
                        Voice DNA: {meta.acousticVoiceDna.summary}
                      </p>
                    )}

                    {meta?.transcript && (
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
