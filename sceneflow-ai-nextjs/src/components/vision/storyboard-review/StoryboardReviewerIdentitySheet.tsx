'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'

const IDENTITY_STORAGE_KEY = 'sceneflow-storyboard-reviewer-identity'

export interface ReviewerIdentity {
  firstName: string
  lastName: string
  email: string
}

interface StoryboardReviewerIdentitySheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  shareToken: string
  onVerifiedSubmit: (identity: ReviewerIdentity, verificationToken: string) => Promise<void>
  isSubmitting: boolean
  submitError: string | null
}

export function StoryboardReviewerIdentitySheet({
  open,
  onOpenChange,
  shareToken,
  onVerifiedSubmit,
  isSubmitting,
  submitError,
}: StoryboardReviewerIdentitySheetProps) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [verificationToken, setVerificationToken] = useState<string | null>(null)
  const [otpSending, setOtpSending] = useState(false)
  const [otpVerifying, setOtpVerifying] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const [otpSent, setOtpSent] = useState(false)

  useEffect(() => {
    if (!open) return
    try {
      const raw = sessionStorage.getItem(IDENTITY_STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as ReviewerIdentity
        if (parsed.firstName) setFirstName(parsed.firstName)
        if (parsed.lastName) setLastName(parsed.lastName)
        if (parsed.email) setEmail(parsed.email)
      }
    } catch {
      /* ignore */
    }
    setVerificationToken(null)
    setOtpCode('')
    setLocalError(null)
    setOtpSent(false)
  }, [open])

  const persistIdentity = (identity: ReviewerIdentity) => {
    try {
      sessionStorage.setItem(IDENTITY_STORAGE_KEY, JSON.stringify(identity))
    } catch {
      /* ignore */
    }
  }

  const handleSendOtp = async () => {
    setLocalError(null)
    if (!email.trim().includes('@')) {
      setLocalError('Enter a valid email address.')
      return
    }
    setOtpSending(true)
    try {
      const res = await fetch(
        `/api/vision/shared-project/${encodeURIComponent(shareToken)}/reviewer/otp/send`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim() }),
        }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send code')
      setOtpSent(true)
      setVerificationToken(null)
    } catch (err: unknown) {
      setLocalError(err instanceof Error ? err.message : 'Failed to send code')
    } finally {
      setOtpSending(false)
    }
  }

  const handleVerifyOtp = async () => {
    setLocalError(null)
    if (!otpCode.trim()) {
      setLocalError('Enter the 6-digit code from your email.')
      return
    }
    setOtpVerifying(true)
    try {
      const res = await fetch(
        `/api/vision/shared-project/${encodeURIComponent(shareToken)}/reviewer/otp/verify`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), code: otpCode.trim() }),
        }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Verification failed')
      setVerificationToken(data.verificationToken)
    } catch (err: unknown) {
      setLocalError(err instanceof Error ? err.message : 'Verification failed')
    } finally {
      setOtpVerifying(false)
    }
  }

  const handleSubmit = async () => {
    setLocalError(null)
    if (!firstName.trim() || !lastName.trim()) {
      setLocalError('First and last name are required.')
      return
    }
    if (!verificationToken) {
      setLocalError('Verify your email before submitting.')
      return
    }
    const identity = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
    }
    persistIdentity(identity)
    await onVerifiedSubmit(identity, verificationToken)
  }

  const displayError = localError || submitError

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-gray-800 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm your identity</DialogTitle>
          <DialogDescription className="text-gray-400">
            Verify your email to submit storyboard feedback. You can watch the storyboard without
            signing in.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">First name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                autoComplete="given-name"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Last name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                autoComplete="family-name"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Email</label>
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setVerificationToken(null)
                }}
                className="flex-1 bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                autoComplete="email"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleSendOtp}
                disabled={otpSending}
                className="shrink-0 border-gray-700 text-gray-200 hover:bg-gray-800"
              >
                {otpSending ? 'Sending…' : otpSent ? 'Resend' : 'Send code'}
              </Button>
            </div>
          </div>

          {otpSent && (
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Verification code
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="6-digit code"
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 tracking-widest"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleVerifyOtp}
                  disabled={otpVerifying || otpCode.length < 6}
                  className="shrink-0 border-gray-700 text-gray-200 hover:bg-gray-800"
                >
                  {otpVerifying ? '…' : verificationToken ? 'Verified' : 'Verify'}
                </Button>
              </div>
              {verificationToken && (
                <p className="text-xs text-emerald-400 mt-1">Email verified — you can submit.</p>
              )}
            </div>
          )}

          {displayError && (
            <p className="text-sm text-red-400 bg-red-950/40 border border-red-900/50 rounded-md px-3 py-2">
              {displayError}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-gray-700 text-gray-300 hover:bg-gray-800"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !verificationToken}
            className="bg-emerald-600 hover:bg-emerald-500 text-white"
          >
            {isSubmitting ? 'Submitting…' : 'Submit feedback'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
