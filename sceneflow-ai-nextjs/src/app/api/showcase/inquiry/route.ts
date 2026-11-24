import { NextRequest, NextResponse } from 'next/server'
import { LEGAL_SUPPORT_EMAIL } from '@/config/legal/legalCopy'
import { sendEmail } from '@/lib/email/resendClient'

export const runtime = 'nodejs'

export type ShowcaseInquiryType = 'pm_full_motion_upgrade' | 'operator_walkthrough'

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      inquiryType?: ShowcaseInquiryType
      name?: string
      email?: string
      referenceOrBrand?: string
      nicheOrScope?: string
      notes?: string
      locale?: string
    }

    const inquiryType: ShowcaseInquiryType =
      body.inquiryType === 'operator_walkthrough'
        ? 'operator_walkthrough'
        : 'pm_full_motion_upgrade'

    const name = String(body.name || '').trim()
    const email = String(body.email || '').trim().toLowerCase()
    const referenceOrBrand = String(body.referenceOrBrand || '').trim()
    const nicheOrScope = String(body.nicheOrScope || '').trim()
    const notes = String(body.notes || '').trim()
    const locale = String(body.locale || 'en').trim()

    if (!name || name.length < 2) {
      return NextResponse.json(
        { success: false, error: 'Please enter your name.' },
        { status: 400 }
      )
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid email address.' },
        { status: 400 }
      )
    }

    const isWalkthrough = inquiryType === 'operator_walkthrough'
    const subject = isWalkthrough
      ? `[SceneFlow Studio · Operator Walkthrough] ${name}`
      : `[Keepsake Cinema · PM Full-Motion Upgrade] ${name}`

    const field1Label = isWalkthrough ? 'Brand / Custom Domain' : 'Blueprint / Order Reference'
    const field2Label = isWalkthrough ? 'Target Niche Preset' : 'Full-Motion Scope'

    const textLines = [
      isWalkthrough
        ? 'New White-Label Operator Walkthrough Request'
        : 'New PM-Directed Full-Motion Upgrade Request',
      '------------------------------------------------------------',
      `Name: ${name}`,
      `Email: ${email}`,
      `Locale: ${locale}`,
      referenceOrBrand ? `${field1Label}: ${referenceOrBrand}` : null,
      nicheOrScope ? `${field2Label}: ${nicheOrScope}` : null,
      notes ? `Notes:\n${notes}` : null,
    ].filter(Boolean)

    const html = `
      <div style="font-family: system-ui, -apple-system, sans-serif; color: #0f172a; max-width: 600px;">
        <h2 style="margin-bottom: 12px;">
          ${escapeHtml(
            isWalkthrough
              ? 'New White-Label Operator Walkthrough Request'
              : 'New PM-Directed Full-Motion Upgrade Request'
          )}
        </h2>
        <table style="border-collapse: collapse; width: 100%; font-size: 14px;">
          <tr><td style="padding: 6px 0; font-weight: 600;">Name</td><td>${escapeHtml(name)}</td></tr>
          <tr><td style="padding: 6px 0; font-weight: 600;">Email</td><td>${escapeHtml(email)}</td></tr>
          <tr><td style="padding: 6px 0; font-weight: 600;">Locale</td><td>${escapeHtml(locale)}</td></tr>
          ${
            referenceOrBrand
              ? `<tr><td style="padding: 6px 0; font-weight: 600;">${escapeHtml(field1Label)}</td><td>${escapeHtml(referenceOrBrand)}</td></tr>`
              : ''
          }
          ${
            nicheOrScope
              ? `<tr><td style="padding: 6px 0; font-weight: 600;">${escapeHtml(field2Label)}</td><td>${escapeHtml(nicheOrScope)}</td></tr>`
              : ''
          }
        </table>
        ${
          notes
            ? `<div style="margin-top: 16px; padding: 12px; background: #f8fafc; border-radius: 8px; white-space: pre-wrap;">${escapeHtml(notes)}</div>`
            : ''
        }
      </div>
    `

    let deliveryMode: 'email' | 'logged' = 'email'
    if (process.env.RESEND_API_KEY) {
      try {
        await sendEmail({
          to: LEGAL_SUPPORT_EMAIL,
          subject,
          html,
          text: textLines.join('\n'),
          replyTo: email,
          allowFallbackFrom: true,
        })
      } catch (emailErr) {
        console.warn('[POST /api/showcase/inquiry] Email send failed, logging lead:', emailErr)
        deliveryMode = 'logged'
      }
    } else {
      deliveryMode = 'logged'
    }

    console.info('[POST /api/showcase/inquiry] Recorded inquiry:', {
      inquiryType,
      name,
      email,
      referenceOrBrand,
      nicheOrScope,
      locale,
      deliveryMode,
    })

    return NextResponse.json({
      success: true,
      inquiryType,
      deliveryMode,
    })
  } catch (err) {
    console.error('[POST /api/showcase/inquiry] Error:', err)
    return NextResponse.json(
      { success: false, error: 'Unable to submit request right now. Please try again.' },
      { status: 500 }
    )
  }
}
