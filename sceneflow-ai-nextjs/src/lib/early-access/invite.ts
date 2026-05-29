import crypto from 'crypto'
import { list } from '@vercel/blob'
import { getAppBaseUrl } from '@/lib/email/resendClient'
import { fetchPrivateBlobJson, getPrivateBlobToken } from '@/lib/early-access/privateBlob'
import type { EapReviewRecord } from '@/lib/early-access/applications'
import { getEapApplication } from '@/lib/early-access/applications'

export const INVITE_EXPIRES_DAYS = 14

export function hashInviteToken(token: string): string {
  return crypto.createHash('sha256').update(`eap-invite:${token}`).digest('hex')
}

export function generateInviteToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

export function buildInviteUrl(token: string): string {
  return `${getAppBaseUrl()}/early-access/invite/${token}`
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!local || !domain) return email
  const visible = local.slice(0, Math.min(2, local.length))
  return `${visible}${'*'.repeat(Math.max(local.length - 2, 2))}@${domain}`
}

export function isInviteExpired(review: EapReviewRecord): boolean {
  if (!review.inviteExpiresAt) return true
  return Date.now() > new Date(review.inviteExpiresAt).getTime()
}

export function isInviteRedeemed(review: EapReviewRecord): boolean {
  return Boolean(review.activatedAt)
}

async function loadAllReviewsWithInvites(): Promise<EapReviewRecord[]> {
  const listing = await list({ prefix: 'early-access/reviews/', limit: 1000, token: getPrivateBlobToken() })
  const reviews: EapReviewRecord[] = []

  for (const blob of listing.blobs) {
    const review = await fetchPrivateBlobJson<EapReviewRecord>(blob.url)
    if (review?.inviteTokenHash) reviews.push(review)
  }

  return reviews
}

export async function findApplicationByInviteToken(token: string) {
  const tokenHash = hashInviteToken(token)
  const reviews = await loadAllReviewsWithInvites()
  const review = reviews.find((r) => r.inviteTokenHash === tokenHash)
  if (!review) return null

  const data = await getEapApplication(review.applicationId)
  if (!data) return null

  return {
    application: data.application,
    review: data.review,
  }
}

export function getInviteExpiryDate(from = new Date()): string {
  const expires = new Date(from)
  expires.setDate(expires.getDate() + INVITE_EXPIRES_DAYS)
  return expires.toISOString()
}
