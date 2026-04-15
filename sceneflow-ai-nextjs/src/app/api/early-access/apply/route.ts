import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { consumeVerifiedEmailToken } from '@/lib/early-access/otp'

export const runtime = 'nodejs'

type Payload = {
  fullName?: string
  email?: string
  countryOfOrigin?: string
  organizationName?: string
  primaryRole?: string
  distributionChannel?: string
  monthlyVolume?: string
  bottleneck?: string
  artStyles?: string[]
  artStyleOther?: string
  audienceResonanceImportance?: string
  multiLanguageStatus?: string
  gcpVertexComfort?: string
  seriesConcept?: string
  weeklyFeedbackCommitment?: string
  hasF2vExperience?: boolean
  otpVerificationToken?: string
}

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((v): v is string => typeof v === 'string').map((v) => v.trim()).filter(Boolean)
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

function slugify(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 40) || 'applicant'
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Payload

    const payload = {
      fullName: normalizeText(body.fullName),
      email: normalizeText(body.email).toLowerCase(),
      countryOfOrigin: normalizeText(body.countryOfOrigin),
      organizationName: normalizeText(body.organizationName),
      primaryRole: normalizeText(body.primaryRole),
      distributionChannel: normalizeText(body.distributionChannel),
      monthlyVolume: normalizeText(body.monthlyVolume),
      bottleneck: normalizeText(body.bottleneck),
      artStyles: normalizeStringArray(body.artStyles),
      artStyleOther: normalizeText(body.artStyleOther),
      audienceResonanceImportance: normalizeText(body.audienceResonanceImportance),
      multiLanguageStatus: normalizeText(body.multiLanguageStatus),
      gcpVertexComfort: normalizeText(body.gcpVertexComfort),
      seriesConcept: normalizeText(body.seriesConcept),
      weeklyFeedbackCommitment: normalizeText(body.weeklyFeedbackCommitment),
      hasF2vExperience: body.hasF2vExperience === true,
      otpVerificationToken: normalizeText(body.otpVerificationToken),
    }

    const required: Array<[string, string]> = [
      ['fullName', payload.fullName],
      ['email', payload.email],
      ['countryOfOrigin', payload.countryOfOrigin],
      ['organizationName', payload.organizationName],
      ['primaryRole', payload.primaryRole],
      ['distributionChannel', payload.distributionChannel],
      ['monthlyVolume', payload.monthlyVolume],
      ['bottleneck', payload.bottleneck],
      ['audienceResonanceImportance', payload.audienceResonanceImportance],
      ['multiLanguageStatus', payload.multiLanguageStatus],
      ['gcpVertexComfort', payload.gcpVertexComfort],
      ['seriesConcept', payload.seriesConcept],
      ['weeklyFeedbackCommitment', payload.weeklyFeedbackCommitment],
    ]
    const missing = required.filter(([, value]) => !value).map(([name]) => name)
    if (missing.length > 0) {
      return NextResponse.json({ error: `Missing required fields: ${missing.join(', ')}` }, { status: 400 })
    }
    if (payload.artStyles.length === 0) {
      return NextResponse.json({ error: 'At least one art style is required.' }, { status: 400 })
    }
    if (countWords(payload.seriesConcept) > 200) {
      return NextResponse.json({ error: 'Series concept must be 200 words or fewer.' }, { status: 400 })
    }
    if (!payload.otpVerificationToken) {
      return NextResponse.json({ error: 'Email verification is required before submitting.' }, { status: 400 })
    }

    const hasVerifiedToken = await consumeVerifiedEmailToken(payload.email, payload.otpVerificationToken)
    if (!hasVerifiedToken) {
      return NextResponse.json({ error: 'Email verification is invalid or expired. Verify again and retry.' }, { status: 400 })
    }

    const submittedAt = new Date().toISOString()
    const applicationId = `${Date.now()}-${slugify(payload.organizationName || payload.fullName)}`
    const blobPath = `early-access/applications/${applicationId}.json`

    const record = {
      applicationId,
      submittedAt,
      source: '/early-access',
      userAgent: request.headers.get('user-agent') || 'unknown',
      ...payload,
    }
    delete (record as any).otpVerificationToken

    await put(blobPath, JSON.stringify(record, null, 2), {
      access: 'private',
      contentType: 'application/json; charset=utf-8',
      addRandomSuffix: false,
    })

    return NextResponse.json({ success: true, applicationId })
  } catch (error: any) {
    console.error('[Early Access Apply] Error:', error)
    return NextResponse.json({ error: error?.message || 'Failed to submit application' }, { status: 500 })
  }
}
