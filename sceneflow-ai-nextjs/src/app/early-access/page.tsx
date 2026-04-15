'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Send, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'

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

const MILESTONES = [
  'June 15: Application Window Closes',
  'June 22: Selection Notifications & Onboarding Materials Sent',
  'July 1: Foundational Cohort Launch. Full access to the SceneFlow environment',
  'August 15: Mid-EAP Virtual Roundtable with the Engineering Team',
]

const WHAT_YOU_WILL_TEST = [
  'Persistent DNA: Lock character wardrobes, prop geometry, and location physics across an entire season.',
  'Global Resonance: Deploy content in 75+ languages with localized dubbing that maintains emotional tone.',
  'One-Take Accuracy: Master the F2V (Frame-to-Video) workflow for 4K scenes with unprecedented control.',
  'Intelligence-Driven Scripts: Use Vertex AI to optimize your script for specific audience segments before a single frame is rendered.',
]

export default function EarlyAccessPage() {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)
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
  }

  const toggleArtStyle = (value: string) => {
    setForm((prev) => {
      const exists = prev.artStyles.includes(value)
      return {
        ...prev,
        artStyles: exists ? prev.artStyles.filter((s) => s !== value) : [...prev.artStyles, value],
      }
    })
  }

  const validate = (): string | null => {
    if (!form.fullName.trim()) return 'Full Name is required.'
    if (!form.email.trim()) return 'Email is required.'
    if (!form.countryOfOrigin.trim()) return 'Country of origin is required.'
    if (!form.organizationName.trim()) return 'Organization/Studio Name is required.'
    if (!form.primaryRole.trim()) return 'Primary Role is required.'
    if (!form.distributionChannel.trim()) return 'Primary Distribution Channel is required.'
    if (!form.monthlyVolume) return 'Current Monthly Video Volume is required.'
    if (!form.bottleneck) return 'Biggest workflow bottleneck is required.'
    if (form.artStyles.length === 0) return 'Select at least one Art Style.'
    if (!form.audienceResonanceImportance) return 'Audience Resonance importance is required.'
    if (!form.multiLanguageStatus) return 'Multi-language status is required.'
    if (!form.gcpVertexComfort) return 'GCP/Vertex comfort level is required.'
    if (!form.seriesConcept.trim()) return 'Series concept is required.'
    if (conceptWordCount > 200) return 'Series concept must be 200 words or fewer.'
    if (!form.weeklyFeedbackCommitment) return 'Feedback commitment selection is required.'
    if (!otpVerified || !otpVerificationToken) return 'Please verify your email before submitting.'
    return null
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
      setOtpMessage('Verification code sent. Check your email inbox.')
    } catch {
      setOtpError('Network error while sending verification code.')
    } finally {
      setOtpRequesting(false)
    }
  }

  const verifyOtp = async () => {
    setOtpError(null)
    setOtpMessage(null)

    const email = form.email.trim()
    const code = otpCode.trim()

    if (!email || !code) {
      setOtpError('Enter your email and verification code.')
      return
    }

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
      setOtpMessage('Email verified. You can now submit your application.')
    } catch {
      setOtpError('Network error while verifying code.')
    } finally {
      setOtpVerifying(false)
    }
  }

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitError(null)
    const err = validate()
    if (err) {
      setSubmitError(err)
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/early-access/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          otpVerificationToken,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setSubmitError(data?.error || 'Submission failed. Please try again.')
        return
      }
      setSubmittedId(data.applicationId || 'submitted')
      setForm(DEFAULT_FORM)
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

  return (
    <main className="min-h-screen bg-[#121212] text-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-cyan-300 hover:text-cyan-200">
          <ArrowLeft className="w-4 h-4" />
          Back to Landing
        </Link>

        <section className="mt-8 rounded-2xl border border-cyan-500/20 bg-gradient-to-b from-slate-950 to-slate-900 p-6 sm:p-10">
          <p className="text-xs uppercase tracking-wider text-cyan-300">Summer of Production · July 2026 Cohort</p>
          <h1 className="mt-3 text-4xl sm:text-5xl font-bold leading-tight">
            Stop Generating. Start Architecting.
          </h1>
          <p className="mt-5 text-lg text-slate-300 max-w-3xl">
            Join the SceneFlow Early Access Program. An elite cohort of creators shaping the future of automated,
            consistent, and global-scale cinema. Starting July 2026.
          </p>
          <div className="mt-7 rounded-xl border border-slate-700 bg-slate-900/70 p-5">
            <h2 className="text-xl font-semibold">The Vision</h2>
            <p className="mt-3 text-slate-300">
              The era of the single prompt is over. The future belongs to producers who maintain narrative integrity
              across a series, localized for a global audience, with the push of a button.
            </p>
            <p className="mt-3 text-slate-300">
              SceneFlow AI Studio is a complete production stack built on Google Cloud and Vertex AI. From audience
              resonance analysis to 4K F2V generation via Veo 3.1, the workflow removes friction while keeping the
              soul of the story in your hands.
            </p>
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-slate-700 bg-slate-900/60 p-6">
          <h3 className="text-2xl font-semibold">The July 2026 Cohort</h3>
          <p className="mt-3 text-slate-300">
            We are opening the studio to a limited number of Foundational Architects. As a member of the EAP, you will
            help refine the logic of automated storytelling.
          </p>
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
          <h2 className="text-2xl sm:text-3xl font-bold">SceneFlow AI Studio: Early Access Application</h2>
          <p className="mt-2 text-slate-300">
            The future of automated production starts with your vision.
          </p>

          {submittedId && (
            <div className="mt-6 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4 text-emerald-200">
              <div className="flex items-center gap-2 font-medium">
                <CheckCircle2 className="w-4 h-4" />
                Application submitted successfully.
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

          <form onSubmit={onSubmit} className="mt-8 space-y-8">
            <div>
              <h3 className="text-xl font-semibold">Part 1: The Director’s Profile</h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm text-slate-300">Full Name *</span>
                  <input className="mt-1 w-full rounded-md bg-slate-800 border border-slate-600 p-2" value={form.fullName} onChange={(e) => update('fullName', e.target.value)} />
                </label>
                <label className="block">
                  <span className="text-sm text-slate-300">Email *</span>
                  <input
                    type="email"
                    className="mt-1 w-full rounded-md bg-slate-800 border border-slate-600 p-2"
                    value={form.email}
                    onChange={(e) => onEmailChanged(e.target.value)}
                  />
                </label>
                <label className="block">
                  <span className="text-sm text-slate-300">Country of Origin *</span>
                  <input
                    className="mt-1 w-full rounded-md bg-slate-800 border border-slate-600 p-2"
                    value={form.countryOfOrigin}
                    onChange={(e) => update('countryOfOrigin', e.target.value)}
                  />
                </label>
                <label className="block">
                  <span className="text-sm text-slate-300">Organization/Studio Name *</span>
                  <input className="mt-1 w-full rounded-md bg-slate-800 border border-slate-600 p-2" value={form.organizationName} onChange={(e) => update('organizationName', e.target.value)} />
                </label>
                <label className="block">
                  <span className="text-sm text-slate-300">Current Primary Role *</span>
                  <input className="mt-1 w-full rounded-md bg-slate-800 border border-slate-600 p-2" value={form.primaryRole} onChange={(e) => update('primaryRole', e.target.value)} />
                </label>
                <label className="block">
                  <span className="text-sm text-slate-300">Primary Distribution Channel *</span>
                  <input className="mt-1 w-full rounded-md bg-slate-800 border border-slate-600 p-2" value={form.distributionChannel} onChange={(e) => update('distributionChannel', e.target.value)} />
                </label>
              </div>
              <div className="mt-4 rounded-lg border border-slate-700 bg-slate-900/70 p-4 space-y-3">
                <p className="text-sm text-slate-200 font-medium">Email confirmation required before submit</p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button type="button" variant="outline" onClick={requestOtp} disabled={otpRequesting}>
                    {otpRequesting ? 'Sending code...' : otpSent ? 'Resend code' : 'Send code'}
                  </Button>
                  <input
                    className="flex-1 rounded-md bg-slate-800 border border-slate-600 p-2 text-sm"
                    placeholder="Enter verification code"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                  />
                  <Button type="button" variant="outline" onClick={verifyOtp} disabled={otpVerifying || !otpSent}>
                    {otpVerifying ? 'Verifying...' : 'Verify code'}
                  </Button>
                </div>
                {otpVerified && <p className="text-emerald-300 text-sm">Email verified.</p>}
                {otpMessage && !otpVerified && <p className="text-cyan-300 text-sm">{otpMessage}</p>}
                {otpError && <p className="text-red-300 text-sm">{otpError}</p>}
              </div>
            </div>

            <div>
              <h3 className="text-xl font-semibold">Part 2: Production Scale & Technical Fit</h3>
              <div className="mt-4 space-y-4">
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
                    <input
                      className="mt-2 w-full rounded-md bg-slate-800 border border-slate-600 p-2"
                      placeholder="Other art style"
                      value={form.artStyleOther}
                      onChange={(e) => update('artStyleOther', e.target.value)}
                    />
                  )}
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-semibold">Part 3: Testing the Feature Set</h3>
              <div className="mt-4 space-y-4">
                <label className="block">
                  <span className="text-sm text-slate-300">Audience Resonance Analysis importance (1-5) *</span>
                  <input
                    type="range"
                    min={1}
                    max={5}
                    value={form.audienceResonanceImportance}
                    onChange={(e) => update('audienceResonanceImportance', e.target.value)}
                    className="mt-2 w-full"
                  />
                  <span className="text-sm text-cyan-300">Selected: {form.audienceResonanceImportance}</span>
                </label>
                <div>
                  <p className="text-sm text-slate-300">Do you currently produce in multiple languages? *</p>
                  <div className="mt-2 space-y-2">
                    {[
                      'Yes, we manually dub/sub.',
                      'Yes, we use basic AI translation.',
                      'No, but we want to scale globally using SceneFlow’s 75+ language engine.',
                    ].map((v) => (
                      <label key={v} className="flex items-center gap-2">
                        <input type="radio" name="multiLanguageStatus" checked={form.multiLanguageStatus === v} onChange={() => update('multiLanguageStatus', v)} />
                        <span>{v}</span>
                      </label>
                    ))}
                  </div>
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
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-semibold">Part 4: The Creative Challenge</h3>
              <div className="mt-4 space-y-4">
                <label className="block">
                  <span className="text-sm text-slate-300">Describe a series concept you want to build in SceneFlow (200 words max) *</span>
                  <textarea
                    className="mt-1 min-h-[140px] w-full rounded-md bg-slate-800 border border-slate-600 p-3"
                    value={form.seriesConcept}
                    onChange={(e) => update('seriesConcept', e.target.value)}
                  />
                  <span className={`text-sm ${conceptWordCount > 200 ? 'text-red-300' : 'text-slate-400'}`}>
                    {conceptWordCount}/200 words
                  </span>
                </label>
                <div>
                  <p className="text-sm text-slate-300">
                    We require one detailed feedback report per week and a 30-minute monthly sync. Can you commit? *
                  </p>
                  <div className="mt-2 space-y-2">
                    {[
                      'Yes, I want to shape the future of SceneFlow.',
                      'No, I just want to use the tool.',
                    ].map((v) => (
                      <label key={v} className="flex items-center gap-2">
                        <input type="radio" name="weeklyFeedbackCommitment" checked={form.weeklyFeedbackCommitment === v} onChange={() => update('weeklyFeedbackCommitment', v)} />
                        <span>{v}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.hasF2vExperience}
                    onChange={(e) => update('hasF2vExperience', e.target.checked)}
                  />
                  <span>We have prior F2V (Frame-to-Video) workflow experience.</span>
                </label>
              </div>
            </div>

            <div className="pt-2">
              <Button type="submit" variant="primary" className="w-full sm:w-auto" disabled={isSubmitting || !otpVerified}>
                {isSubmitting ? 'Submitting...' : 'Submit'}
                <Send className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </form>
        </section>
      </div>
    </main>
  )
}
