import { sendEmail } from '@/lib/email/resendClient'
import { buildOtpVerificationEmail } from './otpVerification'
import { buildApplicationReceivedEmail } from './applicationReceived'
import { buildApplicationApprovedEmail } from './applicationApproved'
import { buildApplicationWaitlistedEmail } from './applicationWaitlisted'
import { buildApplicationRejectedEmail } from './applicationRejected'

export async function sendEapOtpEmail(email: string, code: string): Promise<void> {
  const template = buildOtpVerificationEmail(code)
  await sendEmail({ to: email, ...template })
}

export async function sendApplicationReceivedEmail(
  email: string,
  params: { fullName: string; applicationId: string }
): Promise<void> {
  const template = buildApplicationReceivedEmail(params)
  await sendEmail({ to: email, ...template })
}

export async function sendApplicationApprovedEmail(
  email: string,
  params: { fullName: string; inviteUrl: string; expiresAt: string }
): Promise<void> {
  const template = buildApplicationApprovedEmail(params)
  await sendEmail({ to: email, ...template })
}

export async function sendApplicationWaitlistedEmail(
  email: string,
  params: { fullName: string }
): Promise<void> {
  const template = buildApplicationWaitlistedEmail(params)
  await sendEmail({ to: email, ...template })
}

export async function sendApplicationRejectedEmail(
  email: string,
  params: { fullName: string }
): Promise<void> {
  const template = buildApplicationRejectedEmail(params)
  await sendEmail({ to: email, ...template })
}
