'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Send, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { SceneFlowStudioBrand } from '@/components/layout/SceneFlowStudioBrand'

type FormState = {
  fullName: string
  email: string
  countryOfOrigin: string
  organizationName: string
  primaryRole: string
  distributionChannel: string
  monthlyVolume: string
  bottleneck: string
  artStyles: string[]
  artStyleOther: string
  audienceResonanceImportance: string
  multiLanguageStatus: string
  gcpVertexComfort: string
  seriesConcept: string
  weeklyFeedbackCommitment: string
  hasF2vExperience: boolean
}

const DEFAULT_FORM: FormState = {
  fullName: '',
  email: '',
  countryOfOrigin: '',
  organizationName: '',
  primaryRole: '',
  distributionChannel: '',
  monthlyVolume: '',
  bottleneck: '',
  artStyles: [],
  artStyleOther: '',
  audienceResonanceImportance: '3',
  multiLanguageStatus: '',
  gcpVertexComfort: '',
  seriesConcept: '',
  weeklyFeedbackCommitment: '',
  hasF2vExperience: false,
}

const WIZARD_STEPS = [
  { id: 1, title: 'Director profile', subtitle: 'Who you are' },
  { id: 2, title: 'Production scale', subtitle: 'Volume & fit' },
  { id: 3, title: 'Feature testing', subtitle: 'Technical alignment' },
  { id: 4, title: 'Creative challenge', subtitle: 'Your series vision' },
]

const MILESTONES = [
  'July 15: Application Window Closes',
  'July 22: Selection Notifications & Onboarding Materials Sent',
  'August 1: Foundational Cohort Launch. Full access to the SceneFlow environment',
  'September 15: Mid-EAP Virtual Roundtable with the Engineering Team',
]

const WHAT_YOU_WILL_TEST = [
  'Persistent DNA: Lock character wardrobes, prop geometry, and location physics across an entire season.',
  'Global Resonance: Deploy content in 75+ languages with localized dubbing that maintains emotional tone.',
  'One-Take Accuracy: Master the F2V (Frame-to-Video) workflow for 4K scenes with unprecedented control.',
  'Intelligence-Driven Scripts: Use Vertex AI to optimize your script for specific audience segments before a single frame is rendered.',
]

export default function EarlyAccessPage() {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)
  const [currentStep, setCurrentStep] = useState(0)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submittedId, setSubmittedId] = useState<string | null>(null)
  const [otpCode, setOtpCode] = useState('')
  const [otpRequesting, setOtpRequesting] = useState(false)
  const [otpVerifying, setOtpVerifying] = useState(false)
  const [otpMessage, setOtpMessage] = useState<string | null>(null)
  const [otpError, setOtpError] = useState<string | null>(null)
  const [otpSent, setOtpSent] = useState(false)
  const [otpVerified, setOtpVerified] = useState(false)
  const [otpVerificationToken, setOtpVerificationToken] = useState<string | null>(null)

  const conceptWordCount = useMemo(() => {
    return form.seriesConcept.trim().split(/\s+/).filter(Boolean).length
  }, [form.seriesConcept])

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setFieldErrors((prev) => {
      const next = { ...prev }
      delete next[key as string]
      return next
    })
  }

  const toggleArtStyle = (value: string) => {
    setForm((prev) => {
      const exists = prev.artStyles.includes(value)
      return {
        ...prev,
        artStyles: exists ? prev.artStyles.filter((s) => s !== value) : [...prev.artStyles, value],
      }
    })
    setFieldErrors((prev) => {
      const next = { ...prev }
      delete next.artStyles
      return next
    })
  }

  const validateStep = (step: number): Record<string, string> => {
    const errors: Record<string, string> = {}
    if (step === 0) {
      if (!form.fullName.trim()) errors.fullName = 'Full name is required'
      if (!form.email.trim() || !form.email.includes('@')) errors.email = 'Valid email is required'
      if (!form.countryOfOrigin.trim()) errors.countryOfOrigin = 'Country is required'
      if (!form.organizationName.trim()) errors.organizationName = 'Organization is required'
      if (!form.primaryRole.trim()) errors.primaryRole = 'Role is required'
      if (!form.distributionChannel.trim()) errors.distributionChannel = 'Distribution channel is required'
      if (!otpVerified || !otpVerificationToken) errors.otp = 'Verify your email before continuing'
    }
    if (step === 1) {
      if (!form.monthlyVolume) errors.monthlyVolume = 'Select monthly volume'
      if (!form.bottleneck) errors.bottleneck = 'Select a bottleneck'
      if (form.artStyles.length === 0) errors.artStyles = 'Select at least one art style'
    }
    if (step === 2) {
      if (!form.audienceResonanceImportance) errors.audienceResonanceImportance = 'Required'
      if (!form.multiLanguageStatus) errors.multiLanguageStatus = 'Required'
      if (!form.gcpVertexComfort) errors.gcpVertexComfort = 'Required'
    }
    if (step === 3) {
      if (!form.seriesConcept.trim()) errors.seriesConcept = 'Series concept is required'
      if (conceptWordCount > 200) errors.seriesConcept = 'Must be 200 words or fewer'
      if (!form.weeklyFeedbackCommitment) errors.weeklyFeedbackCommitment = 'Required'
    }
    return errors
  }

  const onEmailChanged = (value: string) => {
    update('email', value)
    setOtpSent(false)
    setOtpVerified(false)
    setOtpVerificationToken(null)
    setOtpCode('')
    setOtpMessage(null)
    setOtpError(null)
  }

  const requestOtp = async () => {
    setOtpError(null)
    setOtpMessage(null)
    const email = form.email.trim()
    if (!email || !email.includes('@')) {
      setOtpError('Enter a valid email before requesting a verification code.')
      return
    }
    setOtpRequesting(true)
    try {
      const res = await fetch('/api/early-access/otp/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) {
        setOtpError(data?.error || 'Failed to send verification code.')
        return
      }
      setOtpSent(true)
      setOtpMessage('Verification code sent. Check your inbox.')
    } catch {
      setOtpError('Network error while sending verification code.')
    } finally {
      setOtpRequesting(false)
    }
  }

  const verifyOtp = useCallback(async (codeOverride?: string) => {
    setOtpError(null)
    setOtpMessage(null)
    const email = form.email.trim()
    const code = (codeOverride ?? otpCode).trim()
    if (!email || code.length < 6) return

    setOtpVerifying(true)
    try {
      const res = await fetch('/api/early-access/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      })
      const data = await res.json()
      if (!res.ok) {
        setOtpError(data?.error || 'Failed to verify code.')
        return
      }
      setOtpVerified(true)
      setOtpVerificationToken(data.verificationToken)
      setOtpMessage('Email verified.')
      setFieldErrors((prev) => {
        const next = { ...prev }
        delete next.otp
        return next
      })
    } catch {
      setOtpError('Network error while verifying code.')
    } finally {
      setOtpVerifying(false)
    }
  }, [form.email, otpCode])

  useEffect(() => {
    if (otpSent && otpCode.length === 6 && !otpVerified && !otpVerifying) {
      verifyOtp(otpCode)
    }
  }, [otpCode, otpSent, otpVerified, otpVerifying, verifyOtp])

  const goNext = () => {
    const errors = validateStep(currentStep)
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return
    setCurrentStep((s) => Math.min(s + 1, WIZARD_STEPS.length - 1))
  }

  const goBack = () => setCurrentStep((s) => Math.max(s - 1, 0))

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitError(null)
    const errors = validateStep(3)
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/early-access/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, otpVerificationToken }),
      })
      const data = await res.json()
      if (!res.ok) {
        setSubmitError(data?.error || 'Submission failed. Please try again.')
        return
      }
      setSubmittedId(data.applicationId || 'submitted')
      setForm(DEFAULT_FORM)
      setCurrentStep(0)
      setOtpCode('')
      setOtpSent(false)
      setOtpVerified(false)
      setOtpVerificationToken(null)
      setOtpMessage(null)
      setOtpError(null)
    } catch {
      setSubmitError('Network error while submitting. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const fieldError = (key: string) =>
    fieldErrors[key] ? (
      <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
        <AlertCircle className="w-3 h-3" /> {fieldErrors[key]}
      </p>
    ) : null

  return (
    <main className="min-h-screen bg-[#050A18] text-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-cyan-300 hover:text-cyan-200">
          <ArrowLeft className="w-4 h-4" />
          Back to Landing
        </Link>

        <div className="mt-6 flex justify-center">
          <SceneFlowStudioBrand variant="landing" />
        </div>

        <section className="mt-8 rounded-2xl border border-cyan-500/20 bg-gradient-to-b from-slate-950 to-slate-900 p-6 sm:p-10">
          <p className="text-xs uppercase tracking-wider text-cyan-300">Summer of Production · August 2026 Cohort</p>
          <h1 className="mt-3 text-4xl sm:text-5xl font-bold leading-tight">Stop Generating. Start Architecting.</h1>
          <p className="mt-5 text-lg text-slate-300 max-w-3xl">
            Join the SceneFlow Early Access Program — an elite cohort shaping automated, consistent, global-scale cinema.
          </p>
        </section>

        <section className="mt-8 rounded-2xl border border-slate-700 bg-slate-900/60 p-6">
          <h3 className="text-2xl font-semibold">The August 2026 Cohort</h3>
          <ul className="mt-4 space-y-2 text-slate-200 list-disc pl-6">
            {WHAT_YOU_WILL_TEST.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <h4 className="mt-6 text-lg font-semibold">Program Milestones</h4>
          <ul className="mt-2 space-y-2 text-slate-300">
            {MILESTONES.map((m) => (
              <li key={m}>- {m}</li>
            ))}
          </ul>
        </section>

        <section className="mt-8 rounded-2xl border border-slate-700 bg-slate-900 p-6 sm:p-8">
          <h2 className="text-2xl sm:text-3xl font-bold">Early Access Application</h2>
          <p className="mt-2 text-slate-300">Step {currentStep + 1} of {WIZARD_STEPS.length}: {WIZARD_STEPS[currentStep].title}</p>

          <div className="mt-6 flex gap-2">
            {WIZARD_STEPS.map((step, index) => (
              <div key={step.id} className="flex-1">
                <div
                  className={`h-1.5 rounded-full ${
                    index <= currentStep ? 'bg-cyan-400' : 'bg-slate-700'
                  }`}
                />
                <p className={`mt-2 text-xs hidden sm:block ${index === currentStep ? 'text-cyan-300' : 'text-slate-500'}`}>
                  {step.title}
                </p>
              </div>
            ))}
          </div>

          {submittedId && (
            <div className="mt-6 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4 text-emerald-200">
              <div className="flex items-center gap-2 font-medium">
                <CheckCircle2 className="w-4 h-4" />
                Application submitted — check your email for confirmation.
              </div>
              <p className="mt-1 text-sm">Application ID: {submittedId}</p>
            </div>
          )}

          {submitError && (
            <div className="mt-6 rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-red-200">
              <div className="flex items-center gap-2 font-medium">
                <AlertCircle className="w-4 h-4" />
                {submitError}
              </div>
            </div>
          )}

          {!submittedId && (
            <form onSubmit={onSubmit} className="mt-8 space-y-6">
              {currentStep === 0 && (
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold">{WIZARD_STEPS[0].title}</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-sm text-slate-300">Full Name *</span>
                      <input className="mt-1 w-full rounded-md bg-slate-800 border border-slate-600 p-2" value={form.fullName} onChange={(e) => update('fullName', e.target.value)} />
                      {fieldError('fullName')}
                    </label>
                    <label className="block">
                      <span className="text-sm text-slate-300">Email *</span>
                      <input type="email" className="mt-1 w-full rounded-md bg-slate-800 border border-slate-600 p-2" value={form.email} onChange={(e) => onEmailChanged(e.target.value)} />
                      {fieldError('email')}
                    </label>
                    <label className="block">
                      <span className="text-sm text-slate-300">Country of Origin *</span>
                      <input className="mt-1 w-full rounded-md bg-slate-800 border border-slate-600 p-2" value={form.countryOfOrigin} onChange={(e) => update('countryOfOrigin', e.target.value)} />
                      {fieldError('countryOfOrigin')}
                    </label>
                    <label className="block">
                      <span className="text-sm text-slate-300">Organization/Studio Name *</span>
                      <input className="mt-1 w-full rounded-md bg-slate-800 border border-slate-600 p-2" value={form.organizationName} onChange={(e) => update('organizationName', e.target.value)} />
                      {fieldError('organizationName')}
                    </label>
                    <label className="block">
                      <span className="text-sm text-slate-300">Current Primary Role *</span>
                      <input className="mt-1 w-full rounded-md bg-slate-800 border border-slate-600 p-2" value={form.primaryRole} onChange={(e) => update('primaryRole', e.target.value)} />
                      {fieldError('primaryRole')}
                    </label>
                    <label className="block">
                      <span className="text-sm text-slate-300">Primary Distribution Channel *</span>
                      <input className="mt-1 w-full rounded-md bg-slate-800 border border-slate-600 p-2" value={form.distributionChannel} onChange={(e) => update('distributionChannel', e.target.value)} />
                      {fieldError('distributionChannel')}
                    </label>
                  </div>

                  <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-4 space-y-3">
                    <p className="text-sm text-slate-200 font-medium">Email verification</p>
                    {otpVerified ? (
                      <div className="flex items-center gap-2 p-3 rounded-md bg-emerald-950/40 border border-emerald-500/30">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        <span className="text-sm text-emerald-200 font-medium">Email verified</span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {!otpSent ? (
                          <Button type="button" variant="outline" onClick={requestOtp} disabled={otpRequesting || !form.email.includes('@')}>
                            {otpRequesting ? 'Sending...' : 'Send verification code'}
                          </Button>
                        ) : (
                          <div className="flex flex-col sm:flex-row gap-2">
                            <input
                              className="flex-1 rounded-md bg-slate-800 border border-cyan-500/50 p-2 text-sm tracking-widest"
                              placeholder="6-digit code"
                              value={otpCode}
                              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                              maxLength={6}
                              inputMode="numeric"
                            />
                            <Button type="button" variant="ghost" onClick={requestOtp} disabled={otpRequesting} className="text-slate-400">
                              Resend
                            </Button>
                          </div>
                        )}
                        {otpVerifying && <p className="text-cyan-300 text-sm">Verifying...</p>}
                        {otpMessage && <p className="text-cyan-300 text-sm">{otpMessage}</p>}
                        {otpError && <p className="text-red-400 text-sm">{otpError}</p>}
                        {fieldError('otp')}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {currentStep === 1 && (
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold">{WIZARD_STEPS[1].title}</h3>
                  <div>
                    <p className="text-sm text-slate-300">Current Monthly Video Volume *</p>
                    <div className="mt-2 space-y-2">
                      {['1–5 videos', '5–20 videos', '20+ videos (High-volume automation candidate)'].map((v) => (
                        <label key={v} className="flex items-center gap-2">
                          <input type="radio" name="monthlyVolume" checked={form.monthlyVolume === v} onChange={() => update('monthlyVolume', v)} />
                          <span>{v}</span>
                        </label>
                      ))}
                    </div>
                    {fieldError('monthlyVolume')}
                  </div>
                  <div>
                    <p className="text-sm text-slate-300">Biggest workflow bottleneck *</p>
                    <div className="mt-2 space-y-2">
                      {['Character/Location Consistency', 'Script-to-Screen Lead Time', 'Localization/Dubbing Costs', 'Asset Management across series'].map((v) => (
                        <label key={v} className="flex items-center gap-2">
                          <input type="radio" name="bottleneck" checked={form.bottleneck === v} onChange={() => update('bottleneck', v)} />
                          <span>{v}</span>
                        </label>
                      ))}
                    </div>
                    {fieldError('bottleneck')}
                  </div>
                  <div>
                    <p className="text-sm text-slate-300">Art Styles (select all that apply) *</p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {['Realistic / Photorealistic', 'Pixar / 3D Render', 'Anime / Comic Book', 'Concept Art / Digital Art', 'Other'].map((v) => (
                        <label key={v} className="flex items-center gap-2">
                          <input type="checkbox" checked={form.artStyles.includes(v)} onChange={() => toggleArtStyle(v)} />
                          <span>{v}</span>
                        </label>
                      ))}
                    </div>
                    {form.artStyles.includes('Other') && (
                      <input className="mt-2 w-full rounded-md bg-slate-800 border border-slate-600 p-2" placeholder="Other art style" value={form.artStyleOther} onChange={(e) => update('artStyleOther', e.target.value)} />
                    )}
                    {fieldError('artStyles')}
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold">{WIZARD_STEPS[2].title}</h3>
                  <label className="block">
                    <span className="text-sm text-slate-300">Audience Resonance Analysis importance (1-5) *</span>
                    <input type="range" min={1} max={5} value={form.audienceResonanceImportance} onChange={(e) => update('audienceResonanceImportance', e.target.value)} className="mt-2 w-full" />
                    <span className="text-sm text-cyan-300">Selected: {form.audienceResonanceImportance}</span>
                  </label>
                  <div>
                    <p className="text-sm text-slate-300">Do you currently produce in multiple languages? *</p>
                    <div className="mt-2 space-y-2">
                      {['Yes, we manually dub/sub.', 'Yes, we use basic AI translation.', 'No, but we want to scale globally using SceneFlow’s 75+ language engine.'].map((v) => (
                        <label key={v} className="flex items-center gap-2">
                          <input type="radio" name="multiLanguageStatus" checked={form.multiLanguageStatus === v} onChange={() => update('multiLanguageStatus', v)} />
                          <span>{v}</span>
                        </label>
                      ))}
                    </div>
                    {fieldError('multiLanguageStatus')}
                  </div>
                  <div>
                    <p className="text-sm text-slate-300">Comfort with GCP/Vertex AI environment *</p>
                    <div className="mt-2 space-y-2">
                      {['Yes, we are already on Google Cloud.', 'No, but we are ready to migrate/integrate.'].map((v) => (
                        <label key={v} className="flex items-center gap-2">
                          <input type="radio" name="gcpVertexComfort" checked={form.gcpVertexComfort === v} onChange={() => update('gcpVertexComfort', v)} />
                          <span>{v}</span>
                        </label>
                      ))}
                    </div>
                    {fieldError('gcpVertexComfort')}
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold">{WIZARD_STEPS[3].title}</h3>
                  <label className="block">
                    <span className="text-sm text-slate-300">Describe a series concept you want to build (200 words max) *</span>
                    <textarea className="mt-1 min-h-[140px] w-full rounded-md bg-slate-800 border border-slate-600 p-3" value={form.seriesConcept} onChange={(e) => update('seriesConcept', e.target.value)} />
                    <span className={`text-sm ${conceptWordCount > 200 ? 'text-red-300' : 'text-slate-400'}`}>{conceptWordCount}/200 words</span>
                    {fieldError('seriesConcept')}
                  </label>
                  <div>
                    <p className="text-sm text-slate-300">Weekly feedback + monthly sync commitment *</p>
                    <div className="mt-2 space-y-2">
                      {['Yes, I want to shape the future of SceneFlow.', 'No, I just want to use the tool.'].map((v) => (
                        <label key={v} className="flex items-center gap-2">
                          <input type="radio" name="weeklyFeedbackCommitment" checked={form.weeklyFeedbackCommitment === v} onChange={() => update('weeklyFeedbackCommitment', v)} />
                          <span>{v}</span>
                        </label>
                      ))}
                    </div>
                    {fieldError('weeklyFeedbackCommitment')}
                  </div>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={form.hasF2vExperience} onChange={(e) => update('hasF2vExperience', e.target.checked)} />
                    <span>We have prior F2V (Frame-to-Video) workflow experience.</span>
                  </label>
                </div>
              )}

              <div className="flex flex-wrap gap-3 pt-2">
                {currentStep > 0 && (
                  <Button type="button" variant="outline" onClick={goBack}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                )}
                {currentStep < WIZARD_STEPS.length - 1 ? (
                  <Button type="button" onClick={goNext}>
                    Continue
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <Button type="submit" variant="primary" disabled={isSubmitting || !otpVerified}>
                    {isSubmitting ? 'Submitting...' : 'Submit application'}
                    <Send className="ml-2 w-4 h-4" />
                  </Button>
                )}
              </div>
            </form>
          )}
        </section>
      </div>
    </main>
  )
}
