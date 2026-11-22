'use client'

import React, { useCallback, useEffect, useState } from 'react'
import {
  AudioLines,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Film,
  ImagePlus,
  Link2,
  Loader2,
  Mic,
  RefreshCw,
  Share2,
  ShieldCheck,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  SUPPORTED_CLIENT_PORTAL_LOCALES,
  type ClientPortalLocale,
} from '@/lib/intake/clientPortalCopy'
import type { ContinuityPortalSlot } from '@/lib/continuity/continuityPortalService'
import type { ClientAssetSubmissionMetadata } from '@/models/ClientAssetSubmission'

interface ContinuitySubmissionRow {
  id: string
  slotId: string
  slotType: string
  slotName: string
  customerName: string
  blobUrl: string
  mimeType?: string
  fileSizeBytes?: number
  caption: string | null
  metadata?: ClientAssetSubmissionMetadata | null
  approvalStatus: 'pending' | 'promoted' | 'rejected'
  createdAt: string
}

interface ActiveContinuityShare {
  token: string
  sessionId: string
  shareUrl: string
  clientMode: boolean
  allowUploads: boolean
  allowVoiceCapture: boolean
  allowVideoClips: boolean
  locale: ClientPortalLocale
  approvalStatus: 'pending_review' | 'changes_requested' | 'approved'
  roundsUsed: number
  maxRounds: number
  lastReviewerName: string | null
  lastReviewedAt: string | null
  generalNotes: string | null
  slots: ContinuityPortalSlot[]
}

export function ShareContinuityDialog({
  projectId,
  onPromoted,
}: {
  projectId?: string
  onPromoted?: () => void
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [promotingId, setPromotingId] = useState<string | null>(null)
  const [mintingId, setMintingId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const [locale, setLocale] = useState<ClientPortalLocale>('en')
  const [allowUploads, setAllowUploads] = useState(true)
  const [allowVoiceCapture, setAllowVoiceCapture] = useState(true)
  const [allowVideoClips, setAllowVideoClips] = useState(false)
  const [clientMode, setClientMode] = useState(false)

  const [active, setActive] = useState<ActiveContinuityShare | null>(null)
  const [submissions, setSubmissions] = useState<ContinuitySubmissionRow[]>([])

  const loadStatus = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const res = await fetch(
        `/api/share/continuity/active?projectId=${encodeURIComponent(projectId)}`,
        { cache: 'no-store' }
      )
      const data = await res.json()
      if (!res.ok || !data.success) return
      setActive(data.active || null)
      if (data.active) {
        setLocale(data.active.locale || 'en')
        setAllowUploads(data.active.allowUploads !== false)
        setAllowVoiceCapture(data.active.allowVoiceCapture !== false)
        setAllowVideoClips(Boolean(data.active.allowVideoClips))
        setClientMode(Boolean(data.active.clientMode))
      } else if (typeof data.defaultAllowVideoClips === 'boolean') {
        setAllowVideoClips(data.defaultAllowVideoClips)
      }
      setSubmissions(Array.isArray(data.submissions) ? data.submissions : [])
    } catch {
      // Quiet background check
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    void loadStatus()
  }, [loadStatus])

  useEffect(() => {
    if (open) void loadStatus()
  }, [open, loadStatus])

  if (!projectId) return null

  const pendingUploads = submissions.filter((s) => s.approvalStatus === 'pending')
  const requestedChangesCount = (active?.slots || []).filter(
    (s) => s.clientDecision === 'revision_requested'
  ).length
  const badgeCount = pendingUploads.length + requestedChangesCount

  const handleGenerateOrUpdate = async () => {
    setCreating(true)
    try {
      const res = await fetch('/api/share/continuity/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          locale,
          allowUploads,
          allowVoiceCapture,
          allowVideoClips,
          clientMode,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        toast.error(data.error || 'Could not create Continuity link')
        return
      }
      await loadStatus()
      if (data.shareUrl && navigator.clipboard) {
        await navigator.clipboard.writeText(data.shareUrl).catch(() => {})
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
      toast.success('Continuity share link ready & copied to clipboard!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create Continuity link')
    } finally {
      setCreating(false)
    }
  }

  const handleCopy = async () => {
    if (!active?.shareUrl) return
    await navigator.clipboard.writeText(active.shareUrl).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Continuity link copied')
  }

  const handleResync = async () => {
    if (!active?.token) return
    setCreating(true)
    try {
      const res = await fetch(`/api/share/continuity/${encodeURIComponent(active.token)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resync',
          allowUploads,
          allowVoiceCapture,
          allowVideoClips,
        }),
      })
      if (res.ok) {
        await loadStatus()
        toast.success('Synced latest Cast, Wardrobes, Locations & Props to shared link')
      }
    } finally {
      setCreating(false)
    }
  }

  const handleRevoke = async () => {
    if (!active?.token) return
    setCreating(true)
    try {
      const res = await fetch(`/api/share/continuity/${encodeURIComponent(active.token)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'revoke' }),
      })
      if (res.ok) {
        setActive(null)
        toast.success('Continuity share link revoked')
      }
    } finally {
      setCreating(false)
    }
  }

  const handlePromote = async (submissionId: string) => {
    const token = active?.token || 'manage'
    setPromotingId(submissionId)
    try {
      const res = await fetch(`/api/share/continuity/${encodeURIComponent(token)}/promote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId,
          projectId,
          saveToReusableVault: true,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        toast.error(data.error || 'Failed to promote photo')
        return
      }
      toast.success('Photo promoted into Continuity Library!')
      await loadStatus()
      onPromoted?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to promote photo')
    } finally {
      setPromotingId(null)
    }
  }

  const handleDismissSubmission = async (submissionId: string) => {
    if (!active?.token) return
    await fetch(`/api/share/continuity/${encodeURIComponent(active.token)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reject_submission', submissionId }),
    }).catch(() => {})
    await loadStatus()
  }

  const handleMintGoogleClone = async (submissionId: string) => {
    const token = active?.token || 'manage'
    setMintingId(submissionId)
    try {
      const res = await fetch(`/api/share/continuity/${encodeURIComponent(token)}/mint-voice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        toast.error(data.error || 'Google voice cloning is not ready yet; Acoustic Voice DNA remains active.')
        return
      }
      toast.success('Google Chirp 3 Instant Custom Voice key minted!')
      await loadStatus()
      onPromoted?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to mint Google voice clone')
    } finally {
      setMintingId(null)
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        type="button"
        onClick={() => setOpen(true)}
        title="Share Continuity link for mobile reference photo uploads & cast/location/prop sign-off"
        className="h-7 text-xs font-medium border-cyan-500/40 text-cyan-200 hover:bg-cyan-500/10"
      >
        <Share2 className="w-3.5 h-3.5 mr-1 text-cyan-400" />
        <span>Share Continuity</span>
        {badgeCount > 0 && (
          <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-zinc-950">
            {badgeCount}
          </span>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-slate-950 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Link2 className="w-5 h-5 text-cyan-400" />
              Shared Continuity Approval &amp; Mobile Photo Uploads
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Send a mobile-ready Continuity link so customers or teammates can upload real photos
              (family archives, property interiors, products) and approve Cast, Wardrobes,
              Locations, and Props before video rendering.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 pt-2">
            {/* Link Configuration & Share Bar */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-4">
              <div className="grid sm:grid-cols-2 gap-3">
                <label className="text-xs text-slate-300 space-y-1">
                  <span>Portal Language</span>
                  <select
                    value={locale}
                    onChange={(e) => setLocale(e.target.value as ClientPortalLocale)}
                    className="w-full rounded-lg bg-slate-950 border border-slate-700 px-2.5 py-2 text-xs text-white"
                  >
                    {SUPPORTED_CLIENT_PORTAL_LOCALES.map((l) => (
                      <option key={l.code} value={l.code}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="space-y-2 pt-1">
                  <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowUploads}
                      onChange={(e) => setAllowUploads(e.target.checked)}
                      className="rounded border-slate-700"
                    />
                    <span>Allow mobile gallery &amp; camera photo uploads</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowVoiceCapture}
                      onChange={(e) => setAllowVoiceCapture(e.target.checked)}
                      className="rounded border-slate-700"
                    />
                    <span className="inline-flex items-center gap-1">
                      <Mic className="w-3.5 h-3.5 text-cyan-400" />
                      Allow character voice capture (Voice DNA &amp; Cloning)
                    </span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowVideoClips}
                      onChange={(e) => setAllowVideoClips(e.target.checked)}
                      className="rounded border-slate-700"
                    />
                    <span className="inline-flex items-center gap-1">
                      <Film className="w-3.5 h-3.5 text-amber-400" />
                      Allow live video &amp; audio clip uploads (Memoirs / Intros)
                    </span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={clientMode}
                      onChange={(e) => setClientMode(e.target.checked)}
                      className="rounded border-slate-700"
                    />
                    <span className="inline-flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                      White-label B2B2C legal consent gate
                    </span>
                  </label>
                </div>
              </div>

              {active ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={active.shareUrl}
                      className="flex-1 rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-cyan-200 font-mono"
                    />
                    <Button
                      size="sm"
                      type="button"
                      onClick={() => void handleCopy()}
                      className="bg-cyan-500 text-slate-950 hover:bg-cyan-400 text-xs font-semibold"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                      {copied ? 'Copied' : 'Copy'}
                    </Button>
                    <a
                      href={active.shareUrl}
                      target="_blank"
                      rel="noreferrer"
                      title="Open shared Continuity portal in new tab"
                      className="inline-flex items-center justify-center rounded-md border border-slate-700 bg-slate-800 p-2 text-slate-200 hover:bg-slate-700"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full font-medium ${
                          active.approvalStatus === 'approved'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : active.approvalStatus === 'changes_requested'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {active.approvalStatus === 'approved'
                          ? 'Approved by Reviewer'
                          : active.approvalStatus === 'changes_requested'
                            ? 'Changes Requested'
                            : 'Awaiting Review'}
                      </span>
                      {active.lastReviewerName && (
                        <span className="text-slate-400">by {active.lastReviewerName}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={creating}
                        onClick={() => void handleResync()}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-700 px-2.5 py-1 text-slate-300 hover:bg-slate-800"
                      >
                        <RefreshCw className={`w-3 h-3 ${creating ? 'animate-spin' : ''}`} />
                        Sync Slots
                      </button>
                      <button
                        type="button"
                        disabled={creating}
                        onClick={() => void handleGenerateOrUpdate()}
                        className="inline-flex items-center gap-1 rounded-md border border-cyan-500/30 px-2.5 py-1 text-cyan-300 hover:bg-cyan-500/10"
                      >
                        Update Settings
                      </button>
                      <button
                        type="button"
                        disabled={creating}
                        onClick={() => void handleRevoke()}
                        className="inline-flex items-center gap-1 rounded-md border border-rose-500/30 px-2.5 py-1 text-rose-300 hover:bg-rose-500/10"
                      >
                        <Trash2 className="w-3 h-3" />
                        Revoke
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <Button
                  type="button"
                  disabled={creating || loading}
                  onClick={() => void handleGenerateOrUpdate()}
                  className="w-full bg-cyan-500 text-slate-950 hover:bg-cyan-400 font-semibold text-xs sm:text-sm"
                >
                  {creating ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Share2 className="w-4 h-4 mr-2" />
                  )}
                  Create &amp; Copy Shared Continuity Link
                </Button>
              )}
            </div>

            {/* Incoming Client Uploads (Photos, Voice Samples, Live Video & Audio Clips) */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <ImagePlus className="w-4 h-4 text-cyan-400" />
                  Uploaded Continuity Assets ({submissions.length})
                </h4>
              </div>
              {submissions.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-800 px-4 py-4 text-xs text-slate-500">
                  No photos, voice samples, or video clips uploaded via shared link yet. When a
                  client or collaborator uploads assets from their phone, they appear here ready for
                  1-click promotion.
                </p>
              ) : (
                <div className="grid sm:grid-cols-2 gap-3">
                  {submissions.map((sub) => {
                    const isVoice = sub.slotType === 'character_voice'
                    const isVideo =
                      sub.slotType === 'live_video' || Boolean(sub.mimeType?.startsWith('video/'))
                    const isAudio =
                      isVoice ||
                      sub.slotType === 'story_audio' ||
                      Boolean(sub.mimeType?.startsWith('audio/'))
                    const meta = sub.metadata
                    const canRetryMint =
                      Boolean(meta?.consentAudioBlobUrl) && !meta?.googleVoiceCloningKey
                    return (
                      <div
                        key={sub.id}
                        className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 flex flex-col gap-2.5"
                      >
                        <div className="flex gap-3">
                          {isVideo ? (
                            <div className="w-16 h-16 rounded-lg bg-slate-950 border border-amber-500/30 flex items-center justify-center shrink-0">
                              <Film className="w-6 h-6 text-amber-400" />
                            </div>
                          ) : isAudio ? (
                            <div className="w-16 h-16 rounded-lg bg-slate-950 border border-cyan-500/30 flex items-center justify-center shrink-0">
                              <AudioLines className="w-6 h-6 text-cyan-400" />
                            </div>
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={sub.blobUrl}
                              alt={sub.slotName}
                              className="w-16 h-16 rounded-lg object-cover border border-slate-700 shrink-0"
                            />
                          )}
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-start justify-between gap-1.5">
                              <p className="text-xs font-semibold text-white truncate">
                                {sub.slotName}
                              </p>
                              {(isVoice || isVideo || isAudio) && (
                                <span className="shrink-0 rounded-full bg-slate-800 px-1.5 py-0.5 text-[10px] text-cyan-300">
                                  {isVoice ? 'Voice' : isVideo ? 'Video' : 'Audio'}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 truncate">
                              Uploaded by {sub.customerName}
                              {meta?.durationSeconds ? ` · ${Math.round(meta.durationSeconds)}s` : ''}
                            </p>
                            {meta?.acousticVoiceDna?.summary && (
                              <p className="text-[11px] text-cyan-200/90 line-clamp-2">
                                {meta.acousticVoiceDna.summary}
                              </p>
                            )}
                            {sub.caption && (
                              <p className="text-[11px] text-slate-300 line-clamp-2">
                                {sub.caption}
                              </p>
                            )}
                            {meta?.googleVoiceCloningKey ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-300">
                                <Sparkles className="w-3 h-3" />
                                Google Custom Voice Active (0 slots)
                              </span>
                            ) : meta?.acousticVoiceDna ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-cyan-300">
                                <Sparkles className="w-3 h-3" />
                                Acoustic Voice DNA Ready (Veo + Gemini)
                              </span>
                            ) : null}
                          </div>
                        </div>

                        {isVideo && (
                          <video
                            controls
                            playsInline
                            src={sub.blobUrl}
                            className="w-full max-h-36 rounded-lg bg-black border border-slate-800"
                          />
                        )}
                        {isAudio && (
                          <audio
                            controls
                            src={meta?.extractedAudioUrl || sub.blobUrl}
                            className="w-full h-8"
                          />
                        )}
                        {isVideo && meta?.extractedAudioUrl && (
                          <div className="space-y-1">
                            <p className="text-[10px] text-emerald-300">
                              Extracted Narration Stem:
                            </p>
                            <audio controls src={meta.extractedAudioUrl} className="w-full h-7" />
                          </div>
                        )}
                        {meta?.transcript && (
                          <p className="text-[10px] text-slate-400 line-clamp-2 italic">
                            &ldquo;{meta.transcript}&rdquo;
                          </p>
                        )}

                        <div className="pt-1 flex flex-wrap items-center gap-2">
                          {sub.approvalStatus === 'promoted' ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              In Continuity Library
                            </span>
                          ) : sub.approvalStatus === 'rejected' ? (
                            <span className="text-[11px] text-slate-500">Dismissed</span>
                          ) : (
                            <>
                              <button
                                type="button"
                                disabled={promotingId === sub.id}
                                onClick={() => void handlePromote(sub.id)}
                                className="rounded-md bg-emerald-600 hover:bg-emerald-500 px-2.5 py-1 text-[11px] font-semibold text-white disabled:opacity-50"
                              >
                                {promotingId === sub.id
                                  ? 'Promoting…'
                                  : isVoice
                                    ? 'Apply Character Voice'
                                    : isVideo || isAudio
                                      ? 'Promote to Media Library'
                                      : 'Use in Continuity'}
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleDismissSubmission(sub.id)}
                                className="text-[11px] text-slate-400 hover:text-slate-200"
                              >
                                Dismiss
                              </button>
                            </>
                          )}
                          {canRetryMint && (
                            <button
                              type="button"
                              disabled={mintingId === sub.id}
                              onClick={() => void handleMintGoogleClone(sub.id)}
                              className="rounded-md border border-purple-500/40 bg-purple-500/10 hover:bg-purple-500/20 px-2 py-1 text-[10px] font-semibold text-purple-200 disabled:opacity-50"
                            >
                              {mintingId === sub.id ? 'Minting…' : 'Mint Google Clone'}
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Reviewer Slot Feedback */}
            {active && active.slots.some((s) => s.clientDecision && s.clientDecision !== 'pending') && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Reviewer Decisions &amp; Notes
                </h4>
                {active.generalNotes && (
                  <p className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs text-slate-200">
                    Overall note: {active.generalNotes}
                  </p>
                )}
                <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                  {active.slots
                    .filter((s) => s.clientDecision && s.clientDecision !== 'pending')
                    .map((slot) => (
                      <div
                        key={slot.slotId}
                        className="flex items-start justify-between gap-2 rounded-lg border border-slate-800 px-3 py-2 text-xs"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-slate-100">{slot.name}</p>
                          {slot.clientNote && (
                            <p className="text-amber-300 mt-0.5">{slot.clientNote}</p>
                          )}
                        </div>
                        <span
                          className={`shrink-0 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                            slot.clientDecision === 'approved'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-amber-500/20 text-amber-300'
                          }`}
                        >
                          {slot.clientDecision === 'approved' ? 'Approved' : 'Needs Update'}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
