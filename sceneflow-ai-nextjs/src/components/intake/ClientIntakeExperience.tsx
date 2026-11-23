'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  CheckCircle2,
  Clock,
  Compass,
  Edit3,
  Film,
  Globe,
  Loader2,
  Mic,
  MicOff,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  User,
  Users,
} from 'lucide-react'
import {
  formatPortalCopy,
  getPortalLocaleLabel,
  getPortalPrivacyConsentExtras,
  getSpeechLangForPortalLocale,
  resolveClientPortalLocale,
  SUPPORTED_CLIENT_PORTAL_LOCALES,
  type ClientPortalLocale,
} from '@/lib/intake/clientPortalCopy'
import { getLocaleDirection } from '@/i18n/locale'
import type { BrandProfileSnapshot } from '@/lib/producer/producerProfileService'
import {
  getCoverageTopicsForNarrativeMode,
  inferNarrativeModeFromVision,
  type IntakeCompletenessChecklist,
  type IntakeExtractedCharacter,
  type IntakeMessageTurn,
  type IntakePhase,
  type IntakeResonatingBeat,
  type IntakeVerticalId,
  type IntakeVisionProposal,
} from '@/lib/intake/intakePlaybooks'

interface ClientIntakeExperienceProps {
  token: string
  embedded?: boolean
}

export function ClientIntakeExperience({
  token,
  embedded = false,
}: ClientIntakeExperienceProps) {
  const searchParams = useSearchParams()
  const langParam = searchParams.get('lang')

  const [locale, setLocale] = useState<ClientPortalLocale>(() =>
    resolveClientPortalLocale(langParam)
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [brand, setBrand] = useState<BrandProfileSnapshot>({
    brandName: 'Production Studio',
    logoUrl: null,
    primaryColor: '#7c3aed',
    supportEmail: null,
    customTermsUrl: null,
    hideSceneFlowBranding: false,
  })
  const [consentAccepted, setConsentAccepted] = useState(false)
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [mediaRightsChecked, setMediaRightsChecked] = useState(false)
  const [zeroPrivityChecked, setZeroPrivityChecked] = useState(false)
  const [voiceLocalizationChecked, setVoiceLocalizationChecked] = useState(false)
  const [consentSubmitting, setConsentSubmitting] = useState(false)

  // Phase 1: Customer Vision Statement + Clarification & Confirmation Gate
  const [phase, setPhase] = useState<IntakePhase>('vision_clarification')
  const [visionProposal, setVisionProposal] = useState<IntakeVisionProposal | null>(null)
  const [visionDraft, setVisionDraft] = useState('')
  const [clarifyingVision, setClarifyingVision] = useState(false)
  const [confirmingVision, setConfirmingVision] = useState(false)

  // Phase 2: Automated Completeness-Driven Interview
  const [vertical, setVertical] = useState<IntakeVerticalId>('custom_production')
  const [selectedCoverageTopics, setSelectedCoverageTopics] = useState<string[]>([])
  const [showQuickCheck, setShowQuickCheck] = useState(false)
  const [quickAddNote, setQuickAddNote] = useState('')
  const [turns, setTurns] = useState<IntakeMessageTurn[]>([])
  const [extractedCharacters, setExtractedCharacters] = useState<IntakeExtractedCharacter[]>([])
  const [resonatingBeats, setResonatingBeats] = useState<IntakeResonatingBeat[]>([])
  const [completenessChecklist, setCompletenessChecklist] =
    useState<IntakeCompletenessChecklist | null>(null)
  const [readyToComplete, setReadyToComplete] = useState(false)
  const [turnsUsed, setTurnsUsed] = useState(0)
  const [maxTurns, setMaxTurns] = useState(10)
  const [draftMessage, setDraftMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [blueprintShareUrl, setBlueprintShareUrl] = useState<string | null>(null)

  const [isRecording, setIsRecording] = useState(false)
  const [recordingTarget, setRecordingTarget] = useState<
    'consent_name' | 'vision' | 'interview' | 'quick_add' | null
  >(null)
  const [speechSupported, setSpeechSupported] = useState(false)
  const recognitionRef = useRef<any>(null)
  const wantRecordingRef = useRef(false)
  const localeRef = useRef(locale)
  localeRef.current = locale
  const chatEndRef = useRef<HTMLDivElement | null>(null)

  const postEmbedEvent = useCallback(
    (event: string, detail?: Record<string, unknown>) => {
      if (!embedded || typeof window === 'undefined' || window.parent === window) return
      try {
        window.parent.postMessage(
          { type: 'sceneflow:intake', event, token, ...(detail || {}) },
          '*'
        )
      } catch {
        /* ignore cross-origin restrictions */
      }
    },
    [embedded, token]
  )

  const loadSession = useCallback(
    async (targetLocale?: ClientPortalLocale) => {
      setLoading(true)
      setError(null)
      try {
        const qs = targetLocale ? `?lang=${encodeURIComponent(targetLocale)}` : ''
        const res = await fetch(`/api/intake/${encodeURIComponent(token)}${qs}`, {
          cache: 'no-store',
        })
        const data = await res.json()
        if (!res.ok || !data.success) {
          setError(data.error || 'Intake link not found or expired')
          return
        }
        if (data.brandProfile) setBrand(data.brandProfile)
        if (data.locale && !targetLocale) {
          const resolvedDataLocale = resolveClientPortalLocale(data.locale)
          if (
            resolvedDataLocale === 'en' &&
            !data.consentAccepted &&
            typeof navigator !== 'undefined' &&
            navigator.language
          ) {
            setLocale(resolveClientPortalLocale(navigator.language))
          } else {
            setLocale(resolvedDataLocale)
          }
        }
        setConsentAccepted(Boolean(data.consentAccepted))
        if (data.customerName) setCustomerName(data.customerName)
        if (data.vertical) setVertical(data.vertical as IntakeVerticalId)
        if (Array.isArray(data.selectedCoverageTopics)) {
          setSelectedCoverageTopics(data.selectedCoverageTopics)
        }
        if (data.phase) setPhase(data.phase)
        setVisionProposal(data.visionProposal || null)
        setTurns(Array.isArray(data.turns) ? data.turns : [])
        setExtractedCharacters(
          Array.isArray(data.extractedCharacters) ? data.extractedCharacters : []
        )
        setResonatingBeats(Array.isArray(data.resonatingBeats) ? data.resonatingBeats : [])
        setCompletenessChecklist(data.completenessChecklist || null)
        setReadyToComplete(Boolean(data.readyToComplete))
        setTurnsUsed(Number(data.customerTurnsUsed || 0))
        setMaxTurns(Number(data.maxCustomerTurns || 10))
        setCompleted(Boolean(data.completed))
        if (typeof data.blueprintShareUrl === 'string' && data.blueprintShareUrl) {
          setBlueprintShareUrl(data.blueprintShareUrl)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load interview')
      } finally {
        setLoading(false)
      }
    },
    [token]
  )

  useEffect(() => {
    void loadSession(langParam ? resolveClientPortalLocale(langParam) : undefined)
  }, [loadSession, langParam])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const Ctor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    setSpeechSupported(Boolean(Ctor && window.isSecureContext))
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    postEmbedEvent('resized', { height: document.body?.scrollHeight || 680 })
  }, [turns, visionProposal, phase, consentAccepted, completed, postEmbedEvent])

  const stopDictation = useCallback(() => {
    wantRecordingRef.current = false
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch {
        /* ignore */
      }
      recognitionRef.current = null
    }
    setIsRecording(false)
    setRecordingTarget(null)
  }, [])

  const toggleDictation = useCallback(
    (target: 'consent_name' | 'vision' | 'interview' | 'quick_add') => {
      if (isRecording) {
        stopDictation()
        return
      }
      if (typeof window === 'undefined') return
      const Ctor =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (!Ctor) return

      try {
        const rec = new Ctor()
        rec.lang = getSpeechLangForPortalLocale(localeRef.current)
        rec.continuous = false
        rec.interimResults = false
        rec.maxAlternatives = 1

        rec.onresult = (event: any) => {
          const piece = event.results?.[0]?.[0]?.transcript?.trim()
          if (piece) {
            if (target === 'consent_name') {
              setCustomerName((prev) => (prev ? `${prev} ${piece}` : piece))
            } else if (target === 'vision') {
              setVisionDraft((prev) => (prev ? `${prev} ${piece}` : piece))
            } else if (target === 'quick_add') {
              setQuickAddNote((prev) => (prev ? `${prev} ${piece}` : piece))
            } else {
              setDraftMessage((prev) => (prev ? `${prev} ${piece}` : piece))
            }
          }
        }
        rec.onend = () => {
          if (wantRecordingRef.current && recognitionRef.current === rec) {
            rec.lang = getSpeechLangForPortalLocale(localeRef.current)
            try {
              rec.start()
              return
            } catch {
              setTimeout(() => {
                if (!wantRecordingRef.current || recognitionRef.current !== rec) return
                try {
                  rec.lang = getSpeechLangForPortalLocale(localeRef.current)
                  rec.start()
                } catch {
                  wantRecordingRef.current = false
                  setIsRecording(false)
                  setRecordingTarget(null)
                  recognitionRef.current = null
                }
              }, 120)
              return
            }
          }
          setIsRecording(false)
          setRecordingTarget(null)
          recognitionRef.current = null
        }
        rec.onerror = (event: any) => {
          const code = event?.error || ''
          if (code === 'no-speech' && wantRecordingRef.current) {
            return
          }
          wantRecordingRef.current = false
          setIsRecording(false)
          setRecordingTarget(null)
          recognitionRef.current = null
        }
        wantRecordingRef.current = true
        recognitionRef.current = rec
        setIsRecording(true)
        setRecordingTarget(target)
        rec.start()
      } catch {
        wantRecordingRef.current = false
        setIsRecording(false)
        setRecordingTarget(null)
      }
    },
    [isRecording, stopDictation]
  )

  const handleLocaleChange = async (nextLocale: ClientPortalLocale) => {
    stopDictation()
    setLocale(nextLocale)
    if (turnsUsed === 0 && !visionProposal) {
      await loadSession(nextLocale)
    }
  }

  const handleAcceptConsent = async (e: React.FormEvent) => {
    e.preventDefault()
    stopDictation()
    if (!customerName.trim() || !mediaRightsChecked || !zeroPrivityChecked) return
    setConsentSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/intake/${encodeURIComponent(token)}/consent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim() || undefined,
          attestedMediaRights: mediaRightsChecked,
          acknowledgedZeroPrivity: zeroPrivityChecked,
          consentedVisualLikeness: mediaRightsChecked,
          consentedVoiceLocalization: voiceLocalizationChecked,
          locale,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setError(data.error || 'Could not record consent')
        return
      }
      setConsentAccepted(true)
      postEmbedEvent('consent_accepted')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setConsentSubmitting(false)
    }
  }

  const handleClarifyVision = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    stopDictation()
    const content = visionDraft.trim()
    if (!content || clarifyingVision || confirmingVision) return

    setClarifyingVision(true)
    setError(null)
    try {
      const res = await fetch(`/api/intake/${encodeURIComponent(token)}/vision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'clarify',
          message: content,
          locale,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setError(data.error || 'Unable to clarify vision')
        return
      }
      setVisionProposal(data.visionProposal)
      setVisionDraft('')
      if (data.phase) setPhase(data.phase)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setClarifyingVision(false)
    }
  }

  const handleConfirmVision = async () => {
    if (!visionProposal || confirmingVision || clarifyingVision) return
    stopDictation()
    setConfirmingVision(true)
    setError(null)
    try {
      const res = await fetch(`/api/intake/${encodeURIComponent(token)}/vision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'confirm',
          locale,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setError(data.error || 'Unable to confirm vision')
        return
      }
      setVisionProposal(data.visionProposal)
      setPhase('structured_interview')
      if (Array.isArray(data.turns)) {
        setTurns(data.turns)
      }
      postEmbedEvent('vision_confirmed')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setConfirmingVision(false)
    }
  }

  const handleEditVision = async () => {
    if (sending || completing) return
    stopDictation()
    setError(null)
    try {
      const res = await fetch(`/api/intake/${encodeURIComponent(token)}/vision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reopen' }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setPhase('vision_clarification')
        if (data.visionProposal) setVisionProposal(data.visionProposal)
      }
    } catch {
      /* non-fatal */
    }
  }

  const handleSendTurn = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    stopDictation()
    const content = draftMessage.trim()
    if (!content || sending || turnsUsed >= maxTurns) return

    setSending(true)
    setError(null)
    const optimistic: IntakeMessageTurn = {
      role: 'customer',
      content,
      createdAt: new Date().toISOString(),
    }
    setTurns((prev) => [...prev, optimistic])
    setDraftMessage('')

    try {
      const res = await fetch(`/api/intake/${encodeURIComponent(token)}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          locale,
          selectedCoverageTopics,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setError(data.error || 'Unable to send response')
        setTurns((prev) => prev.slice(0, -1))
        setDraftMessage(content)
        return
      }
      setTurns(data.turns)
      if (Array.isArray(data.extractedCharacters)) {
        setExtractedCharacters(data.extractedCharacters)
      }
      if (Array.isArray(data.resonatingBeats)) {
        setResonatingBeats(data.resonatingBeats)
      }
      if (data.completenessChecklist) {
        setCompletenessChecklist(data.completenessChecklist)
      }
      setReadyToComplete(Boolean(data.readyToComplete))
      setTurnsUsed(data.customerTurnsUsed)
      setMaxTurns(data.maxCustomerTurns)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
      setTurns((prev) => prev.slice(0, -1))
      setDraftMessage(content)
    } finally {
      setSending(false)
    }
  }

  const handleCompleteBlueprint = async (finalNote?: string) => {
    if (completing || (turnsUsed < 1 && !(finalNote || '').trim())) return
    stopDictation()
    setCompleting(true)
    setError(null)
    try {
      const res = await fetch(`/api/intake/${encodeURIComponent(token)}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locale,
          selectedCoverageTopics,
          ...(finalNote && finalNote.trim() ? { finalQuickAddNote: finalNote.trim() } : {}),
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setError(data.error || 'Unable to finalize story blueprint')
        return
      }
      if (typeof data.blueprintShareUrl === 'string' && data.blueprintShareUrl) {
        setBlueprintShareUrl(data.blueprintShareUrl)
      }
      setShowQuickCheck(false)
      setCompleted(true)
      postEmbedEvent('completed', {
        projectId: data.projectId,
        title: data.title,
        blueprintShareUrl: data.blueprintShareUrl,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setCompleting(false)
    }
  }

  const toggleCoverageTopic = (topicId: string) => {
    setSelectedCoverageTopics((prev) =>
      prev.includes(topicId) ? prev.filter((id) => id !== topicId) : [...prev, topicId]
    )
  }

  const activeNarrativeMode = inferNarrativeModeFromVision(visionProposal, vertical)
  const coverageTopics = getCoverageTopicsForNarrativeMode(activeNarrativeMode)

  const accentColor = brand.primaryColor || '#7c3aed'
  const isVisionPhase =
    phase === 'vision_clarification' && !visionProposal?.confirmed && turnsUsed === 0
  const maxVisionPasses = visionProposal?.maxRevisions || 3
  const usedVisionPasses = visionProposal?.revisionCount || 0
  const canRefineVisionMore = !visionProposal || usedVisionPasses < maxVisionPasses
  const completenessScore = completenessChecklist?.completenessScore ?? 0
  const isInterviewReadyToSubmit = readyToComplete || turnsUsed >= maxTurns

  if (loading) {
    return (
      <div className="min-h-[480px] bg-slate-950 text-white flex items-center justify-center p-6">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    )
  }

  return (
    <div
      dir={getLocaleDirection(locale)}
      className={`${
        embedded ? 'min-h-[600px]' : 'min-h-screen'
      } bg-slate-950 text-slate-100 flex flex-col`}
    >
      {/* White-Label Producer Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/90 backdrop-blur px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {brand.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={brand.logoUrl}
              alt={brand.brandName}
              className="h-9 w-9 rounded-lg object-cover border border-slate-700"
            />
          ) : (
            <div
              className="h-9 w-9 rounded-lg flex items-center justify-center text-white font-bold text-sm"
              style={{ backgroundColor: accentColor }}
            >
              {brand.brandName.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <div className="text-base font-semibold text-white">
              {formatPortalCopy(locale, 'producedBy', { brand: brand.brandName })}
            </div>
            {brand.supportEmail && (
              <div className="text-xs text-slate-400">{brand.supportEmail}</div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-slate-400" />
          <select
            aria-label={formatPortalCopy(locale, 'languageLabel')}
            value={locale}
            onChange={(e) => handleLocaleChange(e.target.value as ClientPortalLocale)}
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

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-6 flex flex-col">
        {error && (
          <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {completed ? (
          <div className="my-auto rounded-2xl border border-emerald-500/30 bg-slate-900/90 p-8 text-center space-y-5">
            <CheckCircle2 className="w-14 h-14 text-emerald-400 mx-auto" />
            <h1 className="text-2xl font-bold text-white">
              {formatPortalCopy(locale, 'interviewCompletedTitle')}
            </h1>
            <p className="text-base text-slate-300 leading-relaxed max-w-xl mx-auto">
              {formatPortalCopy(locale, 'interviewCompletedBody', {
                brand: brand.brandName,
              })}
            </p>
            {blueprintShareUrl && (
              <div className="pt-2">
                <a
                  href={blueprintShareUrl}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 px-5 py-3 text-sm font-extrabold text-slate-950 shadow-lg transition"
                >
                  <span>{formatPortalCopy(locale, 'blueprintReviewHeading')}</span>
                  <span aria-hidden>→</span>
                </a>
              </div>
            )}
          </div>
        ) : !consentAccepted ? (
          /* Mandatory Customer Clickwrap Release (Multilanguage + Dictation + Zero-Privity) */
          <form
            onSubmit={handleAcceptConsent}
            lang={locale}
            dir={getLocaleDirection(locale)}
            className="my-auto rounded-2xl border border-slate-800 bg-slate-900/90 p-6 sm:p-8 space-y-5 shadow-xl"
          >
            {/* Prominent In-Card 7-Language Quick Switcher */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400">
                <Globe className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                {formatPortalCopy(locale, 'languageLabel')}
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {SUPPORTED_CLIENT_PORTAL_LOCALES.map((loc) => {
                  const active = loc.code === locale
                  return (
                    <button
                      key={loc.code}
                      type="button"
                      onClick={() => void handleLocaleChange(loc.code)}
                      className={`rounded-full px-2.5 py-1 text-xs font-medium border transition ${
                        active
                          ? 'bg-purple-600/30 border-purple-400/60 text-white shadow-sm'
                          : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                      }`}
                    >
                      {loc.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <ShieldCheck className="w-7 h-7 text-purple-400 shrink-0" />
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white">
                  {formatPortalCopy(locale, 'consentTitle')}
                </h1>
                <p className="text-sm text-slate-400 mt-0.5">
                  {formatPortalCopy(locale, 'consentSubtitle')}
                </p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  {formatPortalCopy(locale, 'yourName')} *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    dir={getLocaleDirection(locale)}
                    lang={locale}
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder={formatPortalCopy(locale, 'yourName')}
                    className={`w-full rounded-xl bg-slate-950 border border-slate-700 py-2.5 text-base text-white ${
                      speechSupported
                        ? getLocaleDirection(locale) === 'rtl'
                          ? 'pl-11 pr-3.5'
                          : 'pl-3.5 pr-11'
                        : 'px-3.5'
                    }`}
                  />
                  {speechSupported && (
                    <button
                      type="button"
                      onClick={() => toggleDictation('consent_name')}
                      title={
                        isRecording && recordingTarget === 'consent_name'
                          ? formatPortalCopy(locale, 'stopRecording')
                          : formatPortalCopy(locale, 'tapMicToSpeak')
                      }
                      aria-label={
                        isRecording && recordingTarget === 'consent_name'
                          ? formatPortalCopy(locale, 'stopRecording')
                          : formatPortalCopy(locale, 'tapMicToSpeak')
                      }
                      className={`absolute top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition ${
                        getLocaleDirection(locale) === 'rtl' ? 'left-2' : 'right-2'
                      } ${
                        isRecording && recordingTarget === 'consent_name'
                          ? 'bg-red-600 text-white animate-pulse'
                          : 'bg-slate-800 hover:bg-slate-700 text-purple-300'
                      }`}
                    >
                      {isRecording && recordingTarget === 'consent_name' ? (
                        <MicOff className="w-4 h-4" />
                      ) : (
                        <Mic className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </div>
                {isRecording && recordingTarget === 'consent_name' && (
                  <p className="text-xs text-emerald-400 mt-1">
                    {formatPortalCopy(locale, 'listeningInLanguage', {
                      lang: getPortalLocaleLabel(locale),
                    })}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  {formatPortalCopy(locale, 'yourEmail')}
                </label>
                <input
                  type="email"
                  dir="ltr"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-base text-white"
                />
              </div>
            </div>

            <div className="space-y-3 pt-1">
              <label className="flex items-start gap-3 cursor-pointer rounded-xl border border-slate-800 bg-slate-950/60 p-3.5">
                <input
                  type="checkbox"
                  required
                  checked={mediaRightsChecked}
                  onChange={(e) => setMediaRightsChecked(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-600"
                />
                <span className="text-sm text-slate-300 leading-relaxed">
                  {formatPortalCopy(locale, 'mediaRightsLabel')}
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer rounded-xl border border-slate-800 bg-slate-950/60 p-3.5">
                <input
                  type="checkbox"
                  required
                  checked={zeroPrivityChecked}
                  onChange={(e) => setZeroPrivityChecked(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-600"
                />
                <span className="text-sm text-slate-300 leading-relaxed">
                  {formatPortalCopy(locale, 'zeroPrivityLabel', {
                    brand: brand.brandName,
                  })}
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer rounded-xl border border-slate-800/80 bg-slate-950/40 p-3.5">
                <input
                  type="checkbox"
                  checked={voiceLocalizationChecked}
                  onChange={(e) => setVoiceLocalizationChecked(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-600"
                />
                <span className="text-xs text-slate-300 leading-relaxed">
                  {getPortalPrivacyConsentExtras(locale).voiceLocalizationLabel}
                </span>
              </label>

              <p className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 px-3.5 py-2.5 text-xs leading-relaxed text-emerald-200/90">
                {getPortalPrivacyConsentExtras(locale).privacyHygieneNote}
              </p>
            </div>

            {brand.customTermsUrl && (
              <div className="text-xs">
                <a
                  href={brand.customTermsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-300 hover:text-purple-200 underline underline-offset-4"
                >
                  {formatPortalCopy(locale, 'viewStudioTerms', {
                    brand: brand.brandName,
                  })}
                </a>
              </div>
            )}

            <button
              type="submit"
              disabled={
                consentSubmitting ||
                !customerName.trim() ||
                !mediaRightsChecked ||
                !zeroPrivityChecked
              }
              className="w-full rounded-xl py-3.5 px-5 text-base font-semibold text-white transition disabled:opacity-50"
              style={{ backgroundColor: accentColor }}
            >
              {consentSubmitting ? '...' : formatPortalCopy(locale, 'acceptAndBegin')}
            </button>
          </form>
        ) : isVisionPhase ? (
          /* STEP 1: Customer Vision Statement + Clarification & Confirmation Gate */
          <div className="flex-1 flex flex-col space-y-5">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 space-y-3 shadow-lg">
              <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-300">
                <Compass className="w-3.5 h-3.5" />
                {formatPortalCopy(locale, 'visionStepBadge')}
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">
                {formatPortalCopy(locale, 'visionQuestionTitle')}
              </h1>
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                {formatPortalCopy(locale, 'visionQuestionSubtitle')}
              </p>
            </div>

            {/* Vision Clarification Thread */}
            {visionProposal && Array.isArray(visionProposal.turns) && visionProposal.turns.length > 0 && (
              <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                {visionProposal.turns.map((turn, idx) => (
                  <div
                    key={`vt-${idx}`}
                    className={`flex ${
                      turn.role === 'customer' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm sm:text-base leading-relaxed ${
                        turn.role === 'customer'
                          ? 'bg-purple-600 text-white'
                          : 'bg-slate-900 border border-cyan-500/25 text-slate-100'
                      }`}
                    >
                      {turn.content}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Emerald Clarified Vision Preview Card (like Shot Director / Synopsis Clarify & Confirm) */}
            {visionProposal && (
              <section className="rounded-2xl border border-emerald-500/35 bg-emerald-500/5 p-5 space-y-4 shadow-lg">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2 text-emerald-300 text-sm font-semibold">
                    <Target className="w-4 h-4 shrink-0" />
                    <span>{formatPortalCopy(locale, 'proposedVisionHeading')}</span>
                    {visionProposal.inferredGenre && (
                      <span className="rounded-full border border-emerald-400/35 bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-200">
                        {visionProposal.inferredGenre}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-400">
                    {formatPortalCopy(locale, 'visionPassesRemaining', {
                      used: usedVisionPasses,
                      max: maxVisionPasses,
                    })}
                  </span>
                </div>

                <p className="text-sm sm:text-base text-white leading-relaxed whitespace-pre-line">
                  {visionProposal.clarifiedVision}
                </p>

                <div className="grid sm:grid-cols-3 gap-2.5 text-xs">
                  <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 space-y-1">
                    <div className="font-semibold text-emerald-300">
                      {formatPortalCopy(locale, 'visionImpactLabel')}
                    </div>
                    <div className="text-slate-300 leading-relaxed">
                      {visionProposal.intendedImpact}
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 space-y-1">
                    <div className="font-semibold text-cyan-300">
                      {formatPortalCopy(locale, 'visionAudienceLabel')}
                    </div>
                    <div className="text-slate-300 leading-relaxed">
                      {visionProposal.targetAudience}
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 space-y-1">
                    <div className="font-semibold text-purple-300">
                      {formatPortalCopy(locale, 'visionStyleLabel')}
                    </div>
                    <div className="text-slate-300 leading-relaxed">
                      {visionProposal.toneAndStyle}
                      {visionProposal.deliverableScope
                        ? ` • ${visionProposal.deliverableScope}`
                        : ''}
                    </div>
                  </div>
                </div>

                <div className="pt-1 flex flex-wrap items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleConfirmVision}
                    disabled={confirmingVision || clarifyingVision}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-5 py-3 text-sm sm:text-base font-semibold text-white transition disabled:opacity-50"
                  >
                    {confirmingVision ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    {formatPortalCopy(locale, 'confirmVisionButton')}
                  </button>
                </div>
              </section>
            )}

            {/* Vision Input / Iterative Refinement Composer */}
            {canRefineVisionMore && (
              <form
                onSubmit={handleClarifyVision}
                className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 space-y-3"
              >
                <textarea
                  dir={getLocaleDirection(locale)}
                  lang={locale}
                  rows={visionProposal ? 3 : 5}
                  value={visionDraft}
                  onChange={(e) => setVisionDraft(e.target.value)}
                  placeholder={formatPortalCopy(
                    locale,
                    visionProposal ? 'visionRefinementPlaceholder' : 'visionInputPlaceholder'
                  )}
                  className="w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-3 text-base text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
                {isRecording && recordingTarget === 'vision' && (
                  <p className="text-xs text-emerald-400">
                    {formatPortalCopy(locale, 'listeningInLanguage', {
                      lang: getPortalLocaleLabel(locale),
                    })}
                  </p>
                )}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  {speechSupported ? (
                    <button
                      type="button"
                      onClick={() => toggleDictation('vision')}
                      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                        isRecording
                          ? 'bg-red-600 text-white animate-pulse'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                      }`}
                    >
                      {isRecording ? (
                        <>
                          <MicOff className="w-4 h-4" />
                          {formatPortalCopy(locale, 'stopRecording')}
                        </>
                      ) : (
                        <>
                          <Mic className="w-4 h-4 text-purple-400" />
                          {formatPortalCopy(locale, 'tapMicToSpeak')}
                        </>
                      )}
                    </button>
                  ) : (
                    <div />
                  )}

                  <button
                    type="submit"
                    disabled={!visionDraft.trim() || clarifyingVision || confirmingVision}
                    className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm sm:text-base font-semibold text-white transition disabled:opacity-50"
                    style={{ backgroundColor: accentColor }}
                  >
                    {clarifyingVision ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    {formatPortalCopy(
                      locale,
                      visionProposal ? 'updateVisionButton' : 'clarifyVisionButton'
                    )}
                  </button>
                </div>
              </form>
            )}
            <div ref={chatEndRef} />
          </div>
        ) : (
          /* STEP 2: Automated Completeness-Driven Discovery Interview */
          <div className="flex-1 flex flex-col">
            {/* Pinned North-Star Confirmed Vision Card */}
            {visionProposal?.confirmed && (
              <div className="mb-4 rounded-2xl border border-cyan-500/30 bg-cyan-500/5 px-4 py-3.5 space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-cyan-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{formatPortalCopy(locale, 'confirmedVisionHeading')}</span>
                    {visionProposal.inferredGenre && (
                      <span className="rounded-full border border-cyan-400/30 bg-cyan-500/15 px-2 py-0.5 text-[11px] font-medium text-cyan-200">
                        {visionProposal.inferredGenre}
                      </span>
                    )}
                  </div>
                  {turnsUsed < maxTurns && (
                    <button
                      type="button"
                      onClick={handleEditVision}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900/80 px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:text-white"
                    >
                      <Edit3 className="w-3 h-3" />
                      {formatPortalCopy(locale, 'editVisionButton')}
                    </button>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                  {visionProposal.clarifiedVision}
                </p>
              </div>
            )}

            {/* Lightweight Vertical Memory-Jogger Chips (Tap key pillars to include) */}
            {coverageTopics.length > 0 && (
              <div className="mb-4 rounded-2xl border border-slate-800 bg-slate-900/75 px-4 py-3 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-purple-300">
                    Optional Memory-Joggers — tap chapters/milestones you want included:
                  </span>
                  {selectedCoverageTopics.length > 0 && (
                    <span className="text-[11px] text-emerald-300 font-medium">
                      {selectedCoverageTopics.length} selected
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {coverageTopics.map((topic) => {
                    const active = selectedCoverageTopics.includes(topic.id)
                    return (
                      <button
                        key={topic.id}
                        type="button"
                        onClick={() => toggleCoverageTopic(topic.id)}
                        title={topic.promptHint}
                        className={`rounded-full px-3 py-1 text-xs font-medium border transition ${
                          active
                            ? 'bg-purple-600/30 border-purple-400 text-white shadow-sm'
                            : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-600 hover:text-white'
                        }`}
                      >
                        {active ? '✓ ' : '+ '}
                        {topic.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Pre-Build 15-Second Quick Check (Catch missed people/milestones before Draft 1 synthesis) */}
            {showQuickCheck && (
              <div className="mb-4 rounded-2xl border border-emerald-500/45 bg-emerald-950/25 p-5 space-y-3 shadow-xl">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                      Quick Check Before We Illustrate &amp; Narrate Draft 1
                    </h2>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      We&apos;ve captured{' '}
                      <strong className="text-white">{extractedCharacters.length}</strong>{' '}
                      character(s) and{' '}
                      <strong className="text-white">{resonatingBeats.length}</strong> story beat(s).
                      Any other key people (spouse, kids, mentors) or major milestones (marriages,
                      promotions, sports, turning points) you want in Draft 1?
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={completing}
                    onClick={() => setShowQuickCheck(false)}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    Close
                  </button>
                </div>

                <textarea
                  dir={getLocaleDirection(locale)}
                  lang={locale}
                  rows={3}
                  value={quickAddNote}
                  onChange={(e) => setQuickAddNote(e.target.value)}
                  placeholder="Optional: e.g., Include our 1998 wedding in Chicago with Clara, my 2005 promotion to VP, and coaching Little League baseball…"
                  className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
                />

                <div className="flex flex-wrap items-center justify-between gap-2">
                  {speechSupported ? (
                    <button
                      type="button"
                      onClick={() => toggleDictation('quick_add')}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition ${
                        isRecording && recordingTarget === 'quick_add'
                          ? 'bg-red-600 text-white animate-pulse'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                      }`}
                    >
                      {isRecording && recordingTarget === 'quick_add' ? (
                        <>
                          <MicOff className="w-3.5 h-3.5" />
                          {formatPortalCopy(locale, 'stopRecording')}
                        </>
                      ) : (
                        <>
                          <Mic className="w-3.5 h-3.5 text-purple-400" />
                          {formatPortalCopy(locale, 'tapMicToSpeak')}
                        </>
                      )}
                    </button>
                  ) : (
                    <div />
                  )}

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={completing}
                      onClick={() => void handleCompleteBlueprint(quickAddNote)}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 px-4 py-2 text-xs sm:text-sm font-extrabold text-slate-950 disabled:opacity-50"
                    >
                      {completing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          {formatPortalCopy(locale, 'completingBlueprint')}
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          {quickAddNote.trim()
                            ? 'Add Details & Build Draft 1 Blueprint'
                            : 'Looks Great — Build My Blueprint Now'}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Interview Progress & Completeness Readiness Header */}
            <div className="mb-4 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
                  <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
                    {formatPortalCopy(locale, 'questionProgress', {
                      current: Math.min(turnsUsed + 1, maxTurns),
                      max: maxTurns,
                    })}
                  </span>
                  {turnsUsed > 0 && (
                    <span
                      className={`text-xs font-medium ${
                        isInterviewReadyToSubmit ? 'text-emerald-400' : 'text-cyan-400'
                      }`}
                    >
                      {formatPortalCopy(
                        locale,
                        isInterviewReadyToSubmit
                          ? 'completenessReadyLabel'
                          : 'completenessGatheringLabel',
                        { score: isInterviewReadyToSubmit ? Math.max(completenessScore, 90) : completenessScore }
                      )}
                    </span>
                  )}
                </div>

                {isInterviewReadyToSubmit && turnsUsed >= 1 ? (
                  <button
                    type="button"
                    onClick={() => setShowQuickCheck(true)}
                    disabled={completing || sending}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {completing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {formatPortalCopy(locale, 'completingBlueprint')}
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        {formatPortalCopy(locale, 'finishAndCreateBlueprint')}
                      </>
                    )}
                  </button>
                ) : turnsUsed >= 4 ? (
                  <button
                    type="button"
                    onClick={() => setShowQuickCheck(true)}
                    disabled={completing || sending}
                    className="text-xs font-medium text-slate-400 hover:text-emerald-300 underline underline-offset-4 disabled:opacity-50"
                  >
                    {completing
                      ? formatPortalCopy(locale, 'completingBlueprint')
                      : formatPortalCopy(locale, 'submitEarlyButton')}
                  </button>
                ) : null}
              </div>

              {turnsUsed > 0 && (
                <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      isInterviewReadyToSubmit ? 'bg-emerald-500' : 'bg-cyan-500'
                    }`}
                    style={{
                      width: `${Math.max(
                        12,
                        isInterviewReadyToSubmit ? 100 : completenessScore
                      )}%`,
                    }}
                  />
                </div>
              )}
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto pb-4">
              {turns.map((turn, idx) => (
                <div
                  key={idx}
                  className={`flex ${
                    turn.role === 'customer' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl px-5 py-4 text-base sm:text-lg leading-relaxed ${
                      turn.role === 'customer'
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-900 border border-slate-800 text-slate-100'
                    }`}
                  >
                    {turn.content}
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex justify-start">
                  <div className="rounded-2xl bg-slate-900 border border-slate-800 px-5 py-4 text-slate-400 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Live Discovered Characters: Name, Role & Impact */}
            {extractedCharacters.length > 0 && (
              <section className="mb-3 rounded-2xl border border-purple-500/25 bg-slate-900/80 p-4 space-y-2.5">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-400 shrink-0" />
                  <h2 className="text-sm font-semibold text-white">
                    {formatPortalCopy(locale, 'discoveredPeopleTitle')}
                  </h2>
                </div>
                <div className="grid sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1">
                  {extractedCharacters.map((char, cIdx) => (
                    <div
                      key={char.id || `ec-${cIdx}`}
                      className="rounded-xl border border-slate-800 bg-slate-950/75 p-2.5 space-y-1"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <span className="text-xs font-semibold text-white flex items-center gap-1">
                          <User className="w-3 h-3 text-purple-400" />
                          {char.name}
                        </span>
                        {char.role && (
                          <span className="rounded-md border border-purple-500/30 bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-medium text-purple-200">
                            {char.role}
                          </span>
                        )}
                      </div>
                      {char.impact && (
                        <p className="text-[11px] text-slate-300 leading-snug line-clamp-2">
                          <span className="font-medium text-slate-400 mr-1">
                            {formatPortalCopy(locale, 'characterImpactLabel')}
                          </span>
                          {char.impact}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Live Resonating Story Beats, Impact & Highlighted Individual Characters */}
            {resonatingBeats.length > 0 && (
              <section className="mb-4 rounded-2xl border border-cyan-500/25 bg-slate-900/80 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Film className="w-4 h-4 text-cyan-400 shrink-0" />
                    <h2 className="text-sm font-semibold text-white">
                      {formatPortalCopy(locale, 'resonatingBeatsTitle')}
                    </h2>
                  </div>
                  <span className="text-xs text-slate-400">
                    {formatPortalCopy(locale, 'resonatingBeatsSubtitle')}
                  </span>
                </div>
                <div className="grid sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
                  {resonatingBeats.map((beat, bIdx) => (
                    <div
                      key={beat.id || `rb-${bIdx}`}
                      className="rounded-xl border border-slate-800 bg-slate-950/75 p-3 space-y-1.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <span className="text-xs font-semibold text-slate-100">
                          {bIdx + 1}. {beat.title}
                        </span>
                        {beat.eraOrAge && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-300">
                            <Clock className="w-2.5 h-2.5" />
                            {beat.eraOrAge}
                          </span>
                        )}
                      </div>
                      {beat.summary && (
                        <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
                          {beat.summary}
                        </p>
                      )}
                      {beat.impact && (
                        <p className="text-[11px] text-emerald-300/90 leading-snug line-clamp-2">
                          <span className="font-semibold mr-1">
                            {formatPortalCopy(locale, 'beatImpactLabel')}
                          </span>
                          {beat.impact}
                        </p>
                      )}
                      {Array.isArray(beat.keyCharacters) && beat.keyCharacters.length > 0 && (
                        <div className="pt-1 flex flex-wrap items-center gap-1">
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-cyan-400/90 mr-0.5">
                            {formatPortalCopy(locale, 'beatKeyPeopleLabel')}
                          </span>
                          {beat.keyCharacters.map((person, pIdx) => (
                            <span
                              key={`${person}-${pIdx}`}
                              className="inline-flex items-center gap-1 rounded-md border border-cyan-500/25 bg-cyan-500/10 px-1.5 py-0.5 text-[11px] font-medium text-cyan-200"
                            >
                              <User className="w-2.5 h-2.5 text-cyan-400" />
                              {person}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {turnsUsed < maxTurns ? (
              <form
                onSubmit={handleSendTurn}
                className="pt-3 border-t border-slate-800 space-y-3"
              >
                <textarea
                  dir={getLocaleDirection(locale)}
                  lang={locale}
                  rows={turnsUsed === 0 ? 4 : 3}
                  value={draftMessage}
                  onChange={(e) => setDraftMessage(e.target.value)}
                  placeholder={formatPortalCopy(
                    locale,
                    turnsUsed === 0 ? 'tellYourStoryPlaceholder' : 'typeOrSpeakPlaceholder'
                  )}
                  className="w-full rounded-2xl bg-slate-900 border border-slate-700 px-4 py-3 text-base sm:text-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
                {isRecording && recordingTarget === 'interview' && (
                  <p className="text-xs text-emerald-400">
                    {formatPortalCopy(locale, 'listeningInLanguage', {
                      lang: getPortalLocaleLabel(locale),
                    })}
                  </p>
                )}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  {speechSupported ? (
                    <button
                      type="button"
                      onClick={() => toggleDictation('interview')}
                      className={`inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm sm:text-base font-medium transition ${
                        isRecording
                          ? 'bg-red-600 text-white animate-pulse'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                      }`}
                    >
                      {isRecording ? (
                        <>
                          <MicOff className="w-5 h-5" />
                          {formatPortalCopy(locale, 'stopRecording')}
                        </>
                      ) : (
                        <>
                          <Mic className="w-5 h-5 text-purple-400" />
                          {formatPortalCopy(locale, 'tapMicToSpeak')}
                        </>
                      )}
                    </button>
                  ) : (
                    <div />
                  )}

                  <button
                    type="submit"
                    disabled={!draftMessage.trim() || sending || completing}
                    className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-base font-semibold text-white transition disabled:opacity-50"
                    style={{ backgroundColor: accentColor }}
                  >
                    <Send className="w-4 h-4" />
                    {formatPortalCopy(locale, 'sendAnswer')}
                  </button>
                </div>
              </form>
            ) : (
              <div className="pt-4 border-t border-slate-800 text-center">
                <button
                  type="button"
                  onClick={() => setShowQuickCheck(true)}
                  disabled={completing}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-6 py-3.5 text-base font-semibold text-white disabled:opacity-50"
                >
                  {completing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {formatPortalCopy(locale, 'completingBlueprint')}
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      {formatPortalCopy(locale, 'finishAndCreateBlueprint')}
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {!brand.hideSceneFlowBranding && (
        <footer className="py-3 text-center text-xs text-slate-600">
          Powered by SceneFlow Studio
        </footer>
      )}
    </div>
  )
}
