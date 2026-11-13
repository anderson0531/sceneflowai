'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle2, Clock, Film, Globe, Loader2, Mic, MicOff, Send, ShieldCheck, Sparkles, User } from 'lucide-react'
import {
  formatPortalCopy,
  getSpeechLangForPortalLocale,
  resolveClientPortalLocale,
  SUPPORTED_CLIENT_PORTAL_LOCALES,
  type ClientPortalLocale,
} from '@/lib/intake/clientPortalCopy'
import { getLocaleDirection } from '@/i18n/locale'
import type { BrandProfileSnapshot } from '@/lib/producer/producerProfileService'
import type { IntakeMessageTurn, IntakeResonatingBeat } from '@/lib/intake/intakePlaybooks'

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
    primaryColor: '#7c3aed',
    hideSceneFlowBranding: true,
  })
  const [consentAccepted, setConsentAccepted] = useState(false)
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [mediaRightsChecked, setMediaRightsChecked] = useState(false)
  const [zeroPrivityChecked, setZeroPrivityChecked] = useState(false)
  const [consentSubmitting, setConsentSubmitting] = useState(false)

  const [turns, setTurns] = useState<IntakeMessageTurn[]>([])
  const [resonatingBeats, setResonatingBeats] = useState<IntakeResonatingBeat[]>([])
  const [turnsUsed, setTurnsUsed] = useState(0)
  const [maxTurns, setMaxTurns] = useState(10)
  const [draftMessage, setDraftMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [completed, setCompleted] = useState(false)

  const [isRecording, setIsRecording] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(false)
  const recognitionRef = useRef<any>(null)
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
          setLocale(resolveClientPortalLocale(data.locale))
        }
        setConsentAccepted(Boolean(data.consentAccepted))
        if (data.customerName) setCustomerName(data.customerName)
        setTurns(Array.isArray(data.turns) ? data.turns : [])
        setResonatingBeats(Array.isArray(data.resonatingBeats) ? data.resonatingBeats : [])
        setTurnsUsed(Number(data.customerTurnsUsed || 0))
        setMaxTurns(Number(data.maxCustomerTurns || 10))
        setCompleted(Boolean(data.completed))
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
  }, [turns, consentAccepted, completed, postEmbedEvent])

  const stopDictation = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch {
        /* ignore */
      }
      recognitionRef.current = null
    }
    setIsRecording(false)
  }, [])

  const toggleDictation = useCallback(() => {
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
      rec.lang = getSpeechLangForPortalLocale(locale)
      rec.continuous = false
      rec.interimResults = false
      rec.maxAlternatives = 1

      rec.onresult = (event: any) => {
        const piece = event.results?.[0]?.[0]?.transcript?.trim()
        if (piece) {
          setDraftMessage((prev) => (prev ? `${prev} ${piece}` : piece))
        }
      }
      rec.onend = () => {
        setIsRecording(false)
        recognitionRef.current = null
      }
      rec.onerror = () => {
        setIsRecording(false)
        recognitionRef.current = null
      }
      recognitionRef.current = rec
      setIsRecording(true)
      rec.start()
    } catch {
      setIsRecording(false)
    }
  }, [isRecording, locale, stopDictation])

  const handleLocaleChange = async (nextLocale: ClientPortalLocale) => {
    stopDictation()
    setLocale(nextLocale)
    if (turnsUsed === 0) {
      await loadSession(nextLocale)
    }
  }

  const handleAcceptConsent = async (e: React.FormEvent) => {
    e.preventDefault()
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
        body: JSON.stringify({ message: content, locale }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setError(data.error || 'Unable to send response')
        setTurns((prev) => prev.slice(0, -1))
        setDraftMessage(content)
        return
      }
      setTurns(data.turns)
      if (Array.isArray(data.resonatingBeats)) {
        setResonatingBeats(data.resonatingBeats)
      }
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

  const handleCompleteBlueprint = async () => {
    if (completing || turnsUsed < 1) return
    stopDictation()
    setCompleting(true)
    setError(null)
    try {
      const res = await fetch(`/api/intake/${encodeURIComponent(token)}/complete`, {
        method: 'POST',
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setError(data.error || 'Unable to finalize story blueprint')
        return
      }
      setCompleted(true)
      postEmbedEvent('completed', { projectId: data.projectId, title: data.title })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setCompleting(false)
    }
  }

  const accentColor = brand.primaryColor || '#7c3aed'

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
            aria-label="Language"
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
          <div className="my-auto rounded-2xl border border-emerald-500/30 bg-slate-900/90 p-8 text-center space-y-4">
            <CheckCircle2 className="w-14 h-14 text-emerald-400 mx-auto" />
            <h1 className="text-2xl font-bold text-white">
              {formatPortalCopy(locale, 'interviewCompletedTitle')}
            </h1>
            <p className="text-base text-slate-300 leading-relaxed max-w-xl mx-auto">
              {formatPortalCopy(locale, 'interviewCompletedBody', {
                brand: brand.brandName,
              })}
            </p>
          </div>
        ) : !consentAccepted ? (
          /* Mandatory Customer Clickwrap Release (Zero-Privity + Media/Estate Attestation) */
          <form
            onSubmit={handleAcceptConsent}
            className="my-auto rounded-2xl border border-slate-800 bg-slate-900/90 p-6 sm:p-8 space-y-5 shadow-xl"
          >
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
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-base text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  {formatPortalCopy(locale, 'yourEmail')}
                </label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
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
            </div>

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
        ) : (
          /* Voice-First Conversational Interview */
          <div className="flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
                {formatPortalCopy(locale, 'questionProgress', {
                  current: Math.min(turnsUsed + 1, maxTurns),
                  max: maxTurns,
                })}
              </span>
              {turnsUsed >= 2 && (
                <button
                  type="button"
                  onClick={handleCompleteBlueprint}
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

            {/* Live Resonating Story Beats & Highlighted Individual Characters */}
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
                  rows={turnsUsed === 0 ? 5 : 3}
                  value={draftMessage}
                  onChange={(e) => setDraftMessage(e.target.value)}
                  placeholder={formatPortalCopy(
                    locale,
                    turnsUsed === 0 ? 'tellYourStoryPlaceholder' : 'typeOrSpeakPlaceholder'
                  )}
                  className="w-full rounded-2xl bg-slate-900 border border-slate-700 px-4 py-3 text-base sm:text-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  {speechSupported ? (
                    <button
                      type="button"
                      onClick={toggleDictation}
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
                  onClick={handleCompleteBlueprint}
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
