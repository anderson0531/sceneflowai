import crypto from 'crypto'
import { list, put } from '@vercel/blob'

const OTP_EXPIRES_MS = 10 * 60 * 1000
const VERIFIED_TOKEN_EXPIRES_MS = 30 * 60 * 1000
const REQUEST_COOLDOWN_MS = 60 * 1000
const MAX_VERIFY_ATTEMPTS = 5

interface OtpRecord {
  email: string
  codeHash: string
  expiresAt: string
  attempts: number
  lastSentAt: string
  verifiedTokenHash?: string
  verifiedTokenExpiresAt?: string
  verifiedAt?: string
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex')
}

function emailHash(email: string): string {
  return sha256(normalizeEmail(email))
}

function codeHash(email: string, code: string): string {
  return sha256(`${emailHash(email)}:${code}`)
}

function verificationTokenHash(token: string): string {
  return sha256(`verify:${token}`)
}

function otpPath(email: string): string {
  return `early-access/otp/${emailHash(email)}.json`
}

function generateOtpCode(): string {
  const value = crypto.randomInt(0, 1000000)
  return value.toString().padStart(6, '0')
}

async function readOtpRecord(email: string): Promise<OtpRecord | null> {
  const path = otpPath(email)
  const listing = await list({ prefix: path, limit: 1 })
  const blob = listing.blobs.find((item) => item.pathname === path) || listing.blobs[0]
  if (!blob?.url) return null

  const response = await fetch(blob.url, { cache: 'no-store' })
  if (!response.ok) return null
  return (await response.json()) as OtpRecord
}

async function writeOtpRecord(email: string, record: OtpRecord): Promise<void> {
  await put(otpPath(email), JSON.stringify(record, null, 2), {
    access: 'private',
    addRandomSuffix: false,
    contentType: 'application/json; charset=utf-8',
  })
}

async function sendOtpEmail(email: string, code: string): Promise<void> {
  const resendApiKey = process.env.RESEND_API_KEY
  const resendFrom = process.env.RESEND_FROM_EMAIL

  if (!resendApiKey || !resendFrom) {
    throw new Error('Email delivery is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL.')
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: resendFrom,
      to: [normalizeEmail(email)],
      subject: 'Your SceneFlow Early Access verification code',
      text: `Your verification code is ${code}. It expires in 10 minutes.`,
      html: `<p>Your verification code is <strong>${code}</strong>.</p><p>This code expires in 10 minutes.</p>`,
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Failed to send verification email: ${errorBody}`)
  }
}

export async function requestEmailOtp(rawEmail: string): Promise<void> {
  const email = normalizeEmail(rawEmail)
  const existing = await readOtpRecord(email)
  const now = Date.now()

  if (existing?.lastSentAt) {
    const elapsed = now - new Date(existing.lastSentAt).getTime()
    if (elapsed < REQUEST_COOLDOWN_MS) {
      const retrySeconds = Math.ceil((REQUEST_COOLDOWN_MS - elapsed) / 1000)
      throw new Error(`Please wait ${retrySeconds}s before requesting another code.`)
    }
  }

  const code = generateOtpCode()
  await sendOtpEmail(email, code)

  const record: OtpRecord = {
    email,
    codeHash: codeHash(email, code),
    expiresAt: new Date(now + OTP_EXPIRES_MS).toISOString(),
    attempts: 0,
    lastSentAt: new Date(now).toISOString(),
  }
  await writeOtpRecord(email, record)
}

export async function verifyEmailOtp(rawEmail: string, code: string): Promise<string> {
  const email = normalizeEmail(rawEmail)
  const record = await readOtpRecord(email)
  if (!record) throw new Error('Verification code not found. Request a new code.')

  const now = Date.now()
  if (now > new Date(record.expiresAt).getTime()) {
    throw new Error('Verification code expired. Request a new code.')
  }
  if (record.attempts >= MAX_VERIFY_ATTEMPTS) {
    throw new Error('Maximum verification attempts exceeded. Request a new code.')
  }

  const expected = codeHash(email, code.trim())
  if (expected !== record.codeHash) {
    await writeOtpRecord(email, {
      ...record,
      attempts: record.attempts + 1,
    })
    throw new Error('Invalid verification code.')
  }

  const verificationToken = crypto.randomBytes(24).toString('hex')
  await writeOtpRecord(email, {
    ...record,
    attempts: 0,
    codeHash: '',
    expiresAt: new Date(now).toISOString(),
    verifiedAt: new Date(now).toISOString(),
    verifiedTokenHash: verificationTokenHash(verificationToken),
    verifiedTokenExpiresAt: new Date(now + VERIFIED_TOKEN_EXPIRES_MS).toISOString(),
  })

  return verificationToken
}

export async function consumeVerifiedEmailToken(rawEmail: string, token: string): Promise<boolean> {
  const email = normalizeEmail(rawEmail)
  const record = await readOtpRecord(email)
  if (!record?.verifiedTokenHash || !record.verifiedTokenExpiresAt) return false

  const now = Date.now()
  if (now > new Date(record.verifiedTokenExpiresAt).getTime()) return false
  if (verificationTokenHash(token) !== record.verifiedTokenHash) return false

  await writeOtpRecord(email, {
    ...record,
    verifiedTokenHash: undefined,
    verifiedTokenExpiresAt: undefined,
  })
  return true
}
