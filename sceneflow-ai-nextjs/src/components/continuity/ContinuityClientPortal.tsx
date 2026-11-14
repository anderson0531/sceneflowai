'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Camera,
  Check,
  CheckCircle2,
  Globe,
  ImagePlus,
  Loader2,
  MapPin,
  Package,
  RefreshCw,
  ShieldCheck,
  Shirt,
  User as UserIcon,
} from 'lucide-react'
import { getLocaleDirection } from '@/i18n/locale'
import {
  formatPortalCopy,
  resolveClientPortalLocale,
  SUPPORTED_CLIENT_PORTAL_LOCALES,
  type ClientPortalLocale,
} from '@/lib/intake/clientPortalCopy'
import type { BrandProfileSnapshot } from '@/lib/producer/producerProfileService'
import type { ContinuityPortalSlot } from '@/lib/continuity/continuityPortalService'
import { prepareImageForContinuityUpload } from '@/lib/continuity/clientImageDownscale'

interface UploadedItem {
  id: string
  slotId: string
  slotType: string
  slotName: string
  blobUrl: string
  caption: string | null
  approvalStatus?: string
}

export function ContinuityClientPortal({ token }: { token: string }) {
  const searchParams = useSearchParams()
  const langParam = searchParams.get('lang')

  const [locale, setLocale] = useState<ClientPortalLocale>(() =>
    resolveClientPortalLocale(langParam)
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [projectTitle, setProjectTitle] = useState<string | null>(null)
  const [clientMode, setClientMode] = useState(false)
  const [allowUploads, setAllowUploads] = useState(true)
  const [brand, setBrand] = useState<BrandProfileSnapshot>({
    brandName: 'SceneFlow Studio',
    primaryColor: '#06b6d4',
    hideSceneFlowBranding: false,
  })
  const [consentAccepted, setConsentAccepted] = useState(false)
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [mediaRightsChecked, setMediaRightsChecked] = useState(false)
  const [zeroPrivityChecked, setZeroPrivityChecked] = useState(false)
  const [consentSaving, setConsentSaving] = useState(false)

  const [slots, setSlots] = useState<ContinuityPortalSlot[]>([])
  const [uploads, setUploads] = useState<UploadedItem[]>([])
  const [roundsUsed, setRoundsUsed] = useState(0)
  const [maxRounds, setMaxRounds] = useState(3)
  const [approvalStatus, setApprovalStatus] = useState<string>('pending_review')
  const [generalNotes, setGeneralNotes] = useState('')

  const [uploadingSlotId, setUploadingSlotId] = useState<string | null>(null)
  const [uploadNotice, setUploadNotice] = useState<string | null>(null)
  const [decisions, setDecisions] = useState<
    Record<string, { decision: 'approved' | 'revision_requested'; note: string }>
  >({})
  const [submittingReview, setSubmittingReview] = useState(false)
  const [reviewSubmitted, setReviewSubmitted] = useState(false)

  const loadPortal = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/share/continuity/${encodeURIComponent(token)}`, {
        cache: 'no-store',
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setError(data.error || 'Continuity link not found')
        return
      }
      if (data.brandProfile) setBrand(data.brandProfile)
      if (data.projectTitle) setProjectTitle(data.projectTitle)
      setClientMode(Boolean(data.clientMode))
      setAllowUploads(data.allowUploads !== false)
      if (data.locale && !langParam) {
        setLocale(resolveClientPortalLocale(data.locale))
      }
      setConsentAccepted(Boolean(data.consentAccepted))
      if (data.customerName) setCustomerName(data.customerName)
      if (data.generalNotes) setGeneralNotes(data.generalNotes)

      const loadedSlots: ContinuityPortalSlot[] = Array.isArray(data.slots) ? data.slots : []
      setSlots(loadedSlots)
      const initialDecisions: Record<
        string,
        { decision: 'approved' | 'revision_requested'; note: string }
      > = {}
      loadedSlots.forEach((s) => {
        initialDecisions[s.slotId] = {
          decision: s.clientDecision === 'revision_requested' ? 'revision_requested' : 'approved',
          note: s.clientNote || '',
        }
      })
      setDecisions(initialDecisions)
      setUploads(Array.isArray(data.submissions) ? data.submissions : [])
      setRoundsUsed(Number(data.roundsUsed || 0))
      setMaxRounds(Number(data.maxRounds || 3))
      setApprovalStatus(data.approvalStatus || 'pending_review')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load continuity portal')
    } finally {
      setLoading(false)
    }
  }, [token, langParam])

  useEffect(() => {
    void loadPortal()
  }, [loadPortal])

  const handleConsent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customerName.trim() || !mediaRightsChecked || (clientMode && !zeroPrivityChecked)) return
    setConsentSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/share/continuity/${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'consent',
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim() || undefined,
          attestedMediaRights: mediaRightsChecked,
          acknowledgedZeroPrivity: clientMode ? zeroPrivityChecked : true,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setError(data.error || 'Could not record consent')
        return
      }
      setConsentAccepted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setConsentSaving(false)
    }
  }

  const handleFilesSelected = async (
    slot: ContinuityPortalSlot,
    fileList: FileList | null | undefined
  ) => {
    if (!fileList || fileList.length === 0) return
    const selectedFiles = Array.from(fileList).slice(0, 5)
    setUploadingSlotId(slot.slotId)
    setUploadNotice(null)
    setError(null)
    try {
      for (const rawFile of selectedFiles) {
        const preparedFile = await prepareImageForContinuityUpload(rawFile)
        const fd = new FormData()
        fd.append('file', preparedFile)
        fd.append('slotId', slot.slotId)
        fd.append('slotType', slot.slotType)
        fd.append('slotName', slot.name)
        if (customerName.trim()) fd.append('reviewerName', customerName.trim())
        const note = decisions[slot.slotId]?.note
        if (note) fd.append('caption', note)

        const res = await fetch(`/api/share/continuity/${encodeURIComponent(token)}/upload`, {
          method: 'POST',
          body: fd,
        })
        const data = await res.json()
        if (!res.ok || !data.success) {
          setError(data.error || 'Upload failed')
          return
        }
        setUploads((prev) => [data.submission, ...prev])
      }
      setUploadNotice(formatPortalCopy(locale, 'photoUploadedClean'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploadingSlotId(null)
    }
  }

  const handleSubmitReview = async () => {
    setSubmittingReview(true)
    setError(null)
    try {
      const slotDecisions = slots.map((s) => ({
        slotId: s.slotId,
        decision: decisions[s.slotId]?.decision || 'approved',
        note: decisions[s.slotId]?.note || undefined,
      }))
      const res = await fetch(`/api/share/continuity/${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewerName: customerName.trim() || 'Reviewer',
          generalNotes: generalNotes.trim() || undefined,
          slotDecisions,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setError(data.error || 'Could not submit continuity review')
        return
      }
      setApprovalStatus(data.approvalStatus)
      setRoundsUsed(data.roundsUsed)
      setReviewSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setSubmittingReview(false)
    }
  }

  const accentColor = brand.primaryColor || '#06b6d4'
  const roundLimitReached =
    clientMode && (roundsUsed >= maxRounds || approvalStatus === 'approved')

  const renderSection = (
    types: Array<ContinuityPortalSlot['slotType']>,
    heading: string,
    Icon: typeof UserIcon
  ) => {
    const group = slots.filter((s) => types.includes(s.slotType))
    if (group.length === 0) return null
    return (
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Icon className="w-5 h-5 text-cyan-400 shrink-0" />
          <span>{heading}</span>
          <span className="text-xs font-normal text-slate-400">({group.length})</span>
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {group.map((slot) => {
            const slotUploads = uploads.filter((u) => u.slotId === slot.slotId)
            const currentDecision = decisions[slot.slotId]?.decision || 'approved'
            const isUploading = uploadingSlotId === slot.slotId
            return (
              <div
                key={slot.slotId}
                className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-5 space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base font-bold text-white leading-snug">{slot.name}</h3>
                    {slot.role ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 shrink-0">
                        {slot.role}
                      </span>
                    ) : slot.slotType === 'wardrobe' ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 shrink-0">
                        Wardrobe
                      </span>
                    ) : slot.slotType === 'location_version' ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shrink-0">
                        Set State
                      </span>
                    ) : null}
                  </div>
                  {slot.description && (
                    <p className="text-sm text-slate-400 mt-1 leading-relaxed">
                      {slot.description}
                    </p>
                  )}
                </div>

                {slot.referenceImageUrl ? (
                  <div className="rounded-xl overflow-hidden border border-slate-800 bg-black">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={slot.referenceImageUrl}
                      alt={slot.name}
                      className="w-full h-48 object-cover"
                    />
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/60 px-4 py-6 text-center text-xs text-slate-400">
                    Reference photo needed — upload from your phone gallery or camera below.
                  </div>
                )}

                {slotUploads.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-emerald-300">
                      Uploaded photos ({slotUploads.length})
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {slotUploads.map((u) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={u.id}
                          src={u.blobUrl}
                          alt={u.slotName}
                          className="h-20 w-full rounded-lg object-cover border border-emerald-500/40"
                        />
                      ))}
                    </div>
                  </div>
                )}

                {allowUploads && (
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Gallery / File Picker (no forced `capture` attribute so iOS/Android Camera Roll works!) */}
                    <label
                      title={formatPortalCopy(locale, 'uploadReferencePhoto')}
                      className="cursor-pointer flex-1 min-w-[140px] inline-flex items-center justify-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-2 text-xs sm:text-sm font-medium text-white transition"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                          <span>{formatPortalCopy(locale, 'uploadingPhoto')}</span>
                        </>
                      ) : (
                        <>
                          <ImagePlus className="w-4 h-4 text-cyan-400 shrink-0" />
                          <span>{formatPortalCopy(locale, 'uploadReferencePhoto')}</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        disabled={isUploading}
                        onChange={(e) => {
                          void handleFilesSelected(slot, e.target.files)
                          e.currentTarget.value = ''
                        }}
                      />
                    </label>

                    {/* Direct Mobile Camera Snap Button */}
                    <label
                      title="Take Photo with Camera"
                      className="cursor-pointer inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 px-3 py-2 text-xs sm:text-sm font-medium text-slate-200 transition"
                    >
                      <Camera className="w-4 h-4 text-purple-400 shrink-0" />
                      <span>Camera</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        disabled={isUploading}
                        onChange={(e) => {
                          void handleFilesSelected(slot, e.target.files)
                          e.currentTarget.value = ''
                        }}
                      />
                    </label>
                  </div>
                )}

                {!roundLimitReached && (
                  <div className="pt-2 border-t border-slate-800 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        title={formatPortalCopy(locale, 'approveItem')}
                        onClick={() =>
                          setDecisions((prev) => ({
                            ...prev,
                            [slot.slotId]: {
                              decision: 'approved',
                              note: prev[slot.slotId]?.note || '',
                            },
                          }))
                        }
                        className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold transition ${
                          currentDecision === 'approved'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{formatPortalCopy(locale, 'approveItem')}</span>
                      </button>
                      <button
                        type="button"
                        title={formatPortalCopy(locale, 'needsAdjustment')}
                        onClick={() =>
                          setDecisions((prev) => ({
                            ...prev,
                            [slot.slotId]: {
                              decision: 'revision_requested',
                              note: prev[slot.slotId]?.note || '',
                            },
                          }))
                        }
                        className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold transition ${
                          currentDecision === 'revision_requested'
                            ? 'bg-amber-600 text-white'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        <RefreshCw className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">
                          {formatPortalCopy(locale, 'needsAdjustment')}
                        </span>
                      </button>
                    </div>
                    {currentDecision === 'revision_requested' && (
                      <input
                        type="text"
                        value={decisions[slot.slotId]?.note || ''}
                        onChange={(e) =>
                          setDecisions((prev) => ({
                            ...prev,
                            [slot.slotId]: {
                              decision: 'revision_requested',
                              note: e.target.value,
                            },
                          }))
                        }
                        placeholder="Describe wardrobe, era, angle, or adjustment needed..."
                        className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-white"
                      />
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    )
  }

  return (
    <div
      dir={getLocaleDirection(locale)}
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col"
    >
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-20">
        <div className="flex items-center gap-3 min-w-0">
          {brand.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={brand.logoUrl}
              alt={brand.brandName}
              className="h-9 w-9 rounded-lg object-cover border border-slate-700 shrink-0"
            />
          ) : (
            <div
              className="h-9 w-9 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0"
              style={{ backgroundColor: accentColor }}
            >
              {brand.brandName.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <div className="text-sm sm:text-base font-semibold text-white truncate">
              {projectTitle
                ? `${projectTitle} · Continuity`
                : formatPortalCopy(locale, 'producedBy', { brand: brand.brandName })}
            </div>
            <div className="text-xs text-slate-400">
              {clientMode
                ? formatPortalCopy(locale, 'roundBadge', { used: roundsUsed, max: maxRounds })
                : formatPortalCopy(locale, 'producedBy', { brand: brand.brandName })}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            aria-label="Language"
            value={locale}
            onChange={(e) => setLocale(e.target.value as ClientPortalLocale)}
            className="rounded-lg bg-slate-800 border border-slate-700 px-2.5 py-1.5 text-sm text-white"
          >
            {SUPPORTED_CLIENT_PORTAL_LOCALES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8 pb-28">
        {error && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}
        {uploadNotice && (
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {uploadNotice}
          </div>
        )}

        {!consentAccepted ? (
          <form
            onSubmit={handleConsent}
            className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 sm:p-8 space-y-5 max-w-2xl mx-auto"
          >
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-7 h-7 text-cyan-400 shrink-0" />
              <div>
                <h1 className="text-xl font-bold text-white">
                  {formatPortalCopy(locale, 'consentTitle')}
                </h1>
                <p className="text-sm text-slate-400">
                  {formatPortalCopy(locale, 'consentSubtitle')}
                </p>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-300 mb-1">
                  {formatPortalCopy(locale, 'yourName')} *
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">
                  {formatPortalCopy(locale, 'yourEmail')}
                </label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-white"
                />
              </div>
            </div>
            <label className="flex items-start gap-3 cursor-pointer rounded-xl border border-slate-800 bg-slate-950/60 p-3.5">
              <input
                type="checkbox"
                required
                checked={mediaRightsChecked}
                onChange={(e) => setMediaRightsChecked(e.target.checked)}
                className="mt-1 h-4 w-4"
              />
              <span className="text-sm text-slate-300">
                {formatPortalCopy(locale, 'mediaRightsLabel')}
              </span>
            </label>
            {clientMode && (
              <label className="flex items-start gap-3 cursor-pointer rounded-xl border border-slate-800 bg-slate-950/60 p-3.5">
                <input
                  type="checkbox"
                  required
                  checked={zeroPrivityChecked}
                  onChange={(e) => setZeroPrivityChecked(e.target.checked)}
                  className="mt-1 h-4 w-4"
                />
                <span className="text-sm text-slate-300">
                  {formatPortalCopy(locale, 'zeroPrivityLabel', { brand: brand.brandName })}
                </span>
              </label>
            )}
            <button
              type="submit"
              disabled={
                consentSaving ||
                !customerName.trim() ||
                !mediaRightsChecked ||
                (clientMode && !zeroPrivityChecked)
              }
              className="w-full rounded-xl py-3 text-base font-semibold text-white disabled:opacity-50"
              style={{ backgroundColor: accentColor }}
            >
              {consentSaving ? '...' : formatPortalCopy(locale, 'acceptAndBegin')}
            </button>
          </form>
        ) : (
          <>
            <div className="space-y-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white">
                  {formatPortalCopy(locale, 'continuityPortalTitle')}
                </h1>
                <p className="text-slate-400 mt-1">
                  {formatPortalCopy(locale, 'continuityPortalSubtitle')}
                </p>
              </div>

              {!clientMode && (
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 grid sm:grid-cols-2 gap-3">
                  <label className="block text-xs text-slate-300">
                    {formatPortalCopy(locale, 'yourName')}
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Your name (shown on approvals & uploads)"
                      className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white"
                    />
                  </label>
                  <label className="block text-xs text-slate-300">
                    Overall Continuity Note (optional)
                    <input
                      type="text"
                      value={generalNotes}
                      onChange={(e) => setGeneralNotes(e.target.value)}
                      placeholder="Any overall notes for your Project Manager..."
                      className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white"
                    />
                  </label>
                </div>
              )}
            </div>

            {reviewSubmitted || approvalStatus === 'approved' ? (
              <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-5 sm:p-6 flex items-center gap-4">
                <CheckCircle2 className="w-9 h-9 text-emerald-400 shrink-0" />
                <div>
                  <div className="text-base sm:text-lg font-bold text-white">
                    {approvalStatus === 'approved'
                      ? 'Continuity Approved — Production Ready'
                      : 'Continuity Feedback Sent to Your Producer'}
                  </div>
                  <div className="text-sm text-slate-300">
                    {formatPortalCopy(locale, 'interviewCompletedBody', {
                      brand: brand.brandName,
                    })}
                  </div>
                </div>
              </div>
            ) : null}

            {renderSection(
              ['character'],
              formatPortalCopy(locale, 'charactersHeading'),
              UserIcon
            )}
            {renderSection(['wardrobe'], 'Wardrobes & Looks', Shirt)}
            {renderSection(
              ['location', 'location_version'],
              formatPortalCopy(locale, 'locationsHeading'),
              MapPin
            )}
            {renderSection(['prop'], formatPortalCopy(locale, 'propsHeading'), Package)}
          </>
        )}
      </main>

      {consentAccepted && !roundLimitReached && (
        <div className="fixed bottom-0 inset-x-0 z-30 border-t border-slate-800 bg-slate-950/95 backdrop-blur px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
            <span className="text-xs text-slate-400 hidden sm:inline">
              {slots.filter((s) => (decisions[s.slotId]?.decision || 'approved') === 'approved')
                .length}{' '}
              / {slots.length} approved
            </span>
            <button
              type="button"
              disabled={submittingReview}
              onClick={handleSubmitReview}
              className="w-full sm:w-auto rounded-xl px-6 py-3 text-sm sm:text-base font-semibold text-white disabled:opacity-50"
              style={{ backgroundColor: accentColor }}
            >
              {submittingReview ? '...' : formatPortalCopy(locale, 'submitContinuityReview')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
