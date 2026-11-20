import crypto from 'crypto'
import { list, put } from '@vercel/blob'
import { LEGAL_SUPPORT_EMAIL } from '@/config/legal/legalCopy'
import { escapeHtml } from '@/lib/email/officialEmail'
import { getAppBaseUrl, getResendFromEmail, sendEmail } from '@/lib/email/resendClient'
import {
  fetchPrivateBlobJson,
  getPrivateBlobToken,
  hasPrivateBlobToken,
} from '@/lib/storage/privateBlob'
import type {
  GenerationErrorCategory,
  GenerationMediaType,
} from '@/lib/errors/generationErrorIntelligence'

export const SUPPORT_REPORT_BLOB_PREFIX = 'support/generation-errors/'

export type SupportReportStatus = 'open' | 'resolved'

export type SupportReportMediaType =
  | GenerationMediaType
  | 'audio'
  | 'export'
  | 'billing'
  | 'agency'
  | 'general'

const SUPPORT_MEDIA_LABELS: Record<SupportReportMediaType, string> = {
  still: 'Shot Still',
  clip: 'Video Clip',
  audio: 'Audio & Dubbing',
  export: 'Export & Streams',
  billing: 'Billing & Credits',
  agency: 'White-Label & Agency Ops',
  general: 'General Studio Support',
}

export function getSupportMediaLabel(mediaType: SupportReportMediaType): string {
  return SUPPORT_MEDIA_LABELS[mediaType] || 'Studio Support'
}

/**
 * Scrub bearer tokens, API keys, webhook secrets, and auth query params before
 * persisting diagnostics to Blob storage or emailing via Resend.
 */
export function redactSensitiveDiagnostics(input?: string): string | undefined {
  if (!input) return undefined
  const trimmed = input.trim()
  if (!trimmed) return undefined
  return trimmed
    .replace(/(Bearer\s+)[A-Za-z0-9._~+/=-]{8,}/gi, '$1[REDACTED]')
    .replace(/\bAIza[0-9A-Za-z_-]{20,}\b/g, '[REDACTED_API_KEY]')
    .replace(/\b(?:sk|pk|whsec|re|rk)_[0-9A-Za-z_-]{12,}\b/g, '[REDACTED_SECRET]')
    .replace(/([?&](?:token|key|api_key|apikey|secret|password|sig|signature|auth)=)[^&\s#]+/gi, '$1[REDACTED]')
}

export interface SupportReportContext {
  projectId?: string
  projectTitle?: string
  sceneId?: string
  sceneNumber?: number
  beatId?: string
  segmentId?: string
  shotNumber?: number
  shotLabel?: string
  frameRole?: string
  generationMethod?: string
  provider?: string
  model?: string
  qualityTier?: string
  resolution?: string
  pageUrl?: string
  userAgent?: string
}

export interface GenerationErrorSupportReport {
  ticketId: string
  createdAt: string
  updatedAt: string
  status: SupportReportStatus
  resolvedAt?: string
  resolvedBy?: string
  resolutionNote?: string
  user: {
    id?: string
    email?: string
    name?: string
  }
  mediaType: SupportReportMediaType
  category: GenerationErrorCategory
  title: string
  explanation: string
  recommendedAction: string
  context: SupportReportContext
  prompt?: string
  technicalDetails?: string
  userNote?: string
  emailSent: boolean
  confirmationEmailSent?: boolean
  resolutionEmailSent?: boolean
}

const memoryFallbackReports = new Map<string, GenerationErrorSupportReport>()

export function generateSupportTicketId(now = new Date()): string {
  const yy = String(now.getUTCFullYear()).slice(-2)
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(now.getUTCDate()).padStart(2, '0')
  const suffix = crypto.randomBytes(2).toString('hex').toUpperCase()
  return `SF-${yy}${mm}${dd}-${suffix}`
}

export function supportReportBlobPath(ticketId: string): string {
  const safe = ticketId.replace(/[^A-Za-z0-9_-]/g, '')
  return `${SUPPORT_REPORT_BLOB_PREFIX}${safe}.json`
}

export function getSupportEscalationRecipient(): string {
  return process.env.SUPPORT_ESCALATION_EMAIL?.trim() || LEGAL_SUPPORT_EMAIL
}

export async function saveSupportErrorReport(
  report: GenerationErrorSupportReport
): Promise<void> {
  memoryFallbackReports.set(report.ticketId, report)
  if (!hasPrivateBlobToken()) return
  await put(supportReportBlobPath(report.ticketId), JSON.stringify(report, null, 2), {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json; charset=utf-8',
    token: getPrivateBlobToken(),
  })
}

export async function readSupportErrorReport(
  ticketId: string
): Promise<GenerationErrorSupportReport | null> {
  if (hasPrivateBlobToken()) {
    const path = supportReportBlobPath(ticketId)
    const listing = await list({ prefix: path, limit: 1, token: getPrivateBlobToken() })
    const blob = listing.blobs.find((item) => item.pathname === path) || listing.blobs[0]
    if (blob?.url) {
      const stored = await fetchPrivateBlobJson<GenerationErrorSupportReport>(blob.url)
      if (stored) return stored
    }
  }
  return memoryFallbackReports.get(ticketId) ?? null
}

export async function listSupportErrorReports(
  limit = 50
): Promise<GenerationErrorSupportReport[]> {
  if (hasPrivateBlobToken()) {
    const listing = await list({
      prefix: SUPPORT_REPORT_BLOB_PREFIX,
      limit: Math.min(Math.max(limit, 1), 100),
      token: getPrivateBlobToken(),
    })
    const sortedBlobs = [...listing.blobs].sort(
      (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    )
    const records = await Promise.all(
      sortedBlobs.map((blob) =>
        fetchPrivateBlobJson<GenerationErrorSupportReport>(blob.url).catch(() => null)
      )
    )
    const valid = records.filter((r): r is GenerationErrorSupportReport => Boolean(r?.ticketId))
    valid.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    return valid
  }

  return [...memoryFallbackReports.values()]
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, limit)
}

export async function updateSupportErrorReportStatus(
  ticketId: string,
  status: SupportReportStatus,
  resolvedBy?: string,
  resolutionNote?: string
): Promise<GenerationErrorSupportReport | null> {
  const existing = await readSupportErrorReport(ticketId)
  if (!existing) return null
  const nowIso = new Date().toISOString()
  const cleanNote = resolutionNote?.trim().slice(0, 1500) || undefined
  const updated: GenerationErrorSupportReport = {
    ...existing,
    status,
    updatedAt: nowIso,
    resolvedAt: status === 'resolved' ? nowIso : undefined,
    resolvedBy: status === 'resolved' ? resolvedBy : undefined,
    resolutionNote: status === 'resolved' ? cleanNote : undefined,
  }
  if (status === 'resolved' && updated.user.email) {
    const resEmail = await sendSupportResolutionEmail(updated)
    updated.resolutionEmailSent = resEmail.sent
  }
  await saveSupportErrorReport(updated)
  return updated
}

export function buildSupportEscalationEmailContent(
  report: GenerationErrorSupportReport
): { subject: string; html: string; text: string } {
  const mediaLabel = getSupportMediaLabel(report.mediaType)
  const userLabel = report.user.email || report.user.name || report.user.id || 'Authenticated User'
  const subject = `[Escalation ${report.ticketId}] ${mediaLabel} Error (${report.category}) — ${userLabel}`
  const adminUrl = `${getAppBaseUrl()}/dashboard/settings/admin`

  const ctx = report.context
  const contextRows: Array<[string, string | undefined]> = [
    ['Ticket ID', report.ticketId],
    ['Timestamp (UTC)', report.createdAt],
    ['User', [report.user.name, report.user.email, report.user.id].filter(Boolean).join(' · ') || 'Unknown'],
    ['Asset Type', mediaLabel],
    ['Error Category', report.category],
    ['Recommended CTA', report.recommendedAction],
    ['Project', [ctx.projectTitle, ctx.projectId].filter(Boolean).join(' · ') || undefined],
    [
      'Scene / Shot',
      [
        ctx.sceneNumber != null ? `Scene ${ctx.sceneNumber}` : ctx.sceneId,
        ctx.shotNumber != null ? `Shot ${ctx.shotNumber}` : undefined,
        ctx.shotLabel,
        ctx.frameRole ? `(${ctx.frameRole})` : undefined,
      ]
        .filter(Boolean)
        .join(' · ') || undefined,
    ],
    ['Beat / Segment ID', [ctx.beatId, ctx.segmentId].filter(Boolean).join(' / ') || undefined],
    [
      'Engine & Settings',
      [ctx.provider, ctx.model, ctx.generationMethod, ctx.qualityTier, ctx.resolution]
        .filter(Boolean)
        .join(' · ') || undefined,
    ],
    ['Page URL', ctx.pageUrl],
  ]

  const rowsHtml = contextRows
    .filter(([, val]) => Boolean(val))
    .map(
      ([label, val]) =>
        `<tr><td style="padding:6px 10px;border-bottom:1px solid #1e293b;color:#94a3b8;font-size:12px;white-space:nowrap;vertical-align:top;">${escapeHtml(label)}</td><td style="padding:6px 10px;border-bottom:1px solid #1e293b;color:#f8fafc;font-size:12px;word-break:break-word;">${escapeHtml(val || '')}</td></tr>`
    )
    .join('')

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:24px;background:#020617;color:#e2e8f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:680px;margin:0 auto;background:#0f172a;border:1px solid #1e293b;border-radius:12px;padding:24px;">
    <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#22d3ee;">SceneFlow Support Escalation</p>
    <h1 style="margin:0 0 12px;font-size:20px;color:#f8fafc;">${escapeHtml(report.ticketId)} · ${escapeHtml(report.title)}</h1>
    <p style="margin:0 0 16px;font-size:14px;line-height:20px;color:#cbd5e1;">${escapeHtml(report.explanation)}</p>
    ${
      report.userNote?.trim()
        ? `<div style="margin:0 0 16px;padding:12px;border-radius:8px;background:#1e293b;border-left:3px solid #22d3ee;"><p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;color:#94a3b8;">Creator Note</p><p style="margin:0;font-size:13px;color:#f8fafc;white-space:pre-wrap;">${escapeHtml(report.userNote.trim())}</p></div>`
        : ''
    }
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:16px;border:1px solid #1e293b;border-radius:8px;">
      ${rowsHtml}
    </table>
    ${
      report.prompt?.trim()
        ? `<p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#94a3b8;">Prompt</p><pre style="margin:0 0 16px;padding:12px;background:#020617;border:1px solid #1e293b;border-radius:8px;color:#e2e8f0;font-size:11px;white-space:pre-wrap;word-break:break-word;">${escapeHtml(report.prompt.trim().slice(0, 4000))}</pre>`
        : ''
    }
    ${
      report.technicalDetails?.trim()
        ? `<p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#fca5a5;">Raw Technical Error</p><pre style="margin:0 0 16px;padding:12px;background:#020617;border:1px solid #7f1d1d;border-radius:8px;color:#fecaca;font-size:11px;white-space:pre-wrap;word-break:break-word;">${escapeHtml(report.technicalDetails.trim().slice(0, 6000))}</pre>`
        : ''
    }
    <p style="margin:16px 0 0;font-size:12px;color:#94a3b8;">
      <a href="${escapeHtml(adminUrl)}" style="color:#22d3ee;font-weight:600;">Open Admin Panel → Support Escalations</a>
      ${report.user.email ? ` · Reply directly to this email to respond to <strong>${escapeHtml(report.user.email)}</strong>.` : ''}
    </p>
  </div>
</body>
</html>`

  const textLines = [
    `SceneFlow Support Escalation — ${report.ticketId}`,
    `${report.title}: ${report.explanation}`,
    '',
    ...(report.userNote?.trim() ? [`Creator Note: ${report.userNote.trim()}`, ''] : []),
    ...contextRows.filter(([, v]) => Boolean(v)).map(([k, v]) => `${k}: ${v}`),
    '',
    ...(report.prompt?.trim() ? ['--- Prompt ---', report.prompt.trim().slice(0, 4000), ''] : []),
    ...(report.technicalDetails?.trim()
      ? ['--- Raw Technical Error ---', report.technicalDetails.trim().slice(0, 6000), '']
      : []),
    `Admin Panel: ${adminUrl}`,
  ]

  return { subject, html, text: textLines.join('\n') }
}

export async function sendSupportEscalationEmail(
  report: GenerationErrorSupportReport
): Promise<{ sent: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY?.trim()) {
    return { sent: false, error: 'RESEND_API_KEY not configured' }
  }
  try {
    const { subject, html, text } = buildSupportEscalationEmailContent(report)
    await sendEmail({
      to: getSupportEscalationRecipient(),
      subject,
      html,
      text,
      from: getResendFromEmail(),
      replyTo: report.user.email || undefined,
      allowFallbackFrom: true,
    })
    return { sent: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn('[SupportEscalation] Email delivery failed:', msg)
    return { sent: false, error: msg }
  }
}

export async function sendSupportConfirmationEmail(
  report: GenerationErrorSupportReport
): Promise<{ sent: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY?.trim() || !report.user.email?.trim()) {
    return { sent: false, error: 'Missing RESEND_API_KEY or user email' }
  }
  try {
    const helpUrl = `${getAppBaseUrl()}/dashboard/help`
    const mediaLabel = getSupportMediaLabel(report.mediaType)
    const subject = `We received your SceneFlow Support ticket (${report.ticketId})`
    const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:24px;background:#020617;color:#e2e8f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#0f172a;border:1px solid #1e293b;border-radius:12px;padding:24px;">
    <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#22d3ee;">SceneFlow Customer Support</p>
    <h1 style="margin:0 0 12px;font-size:20px;color:#f8fafc;">Ticket ${escapeHtml(report.ticketId)} Received</h1>
    <p style="margin:0 0 12px;font-size:14px;line-height:20px;color:#cbd5e1;">Thanks for reaching out. Our engineering and support team received your <strong>${escapeHtml(mediaLabel)}</strong> report (<em>${escapeHtml(report.title)}</em>) and will follow up within 24 hours.</p>
    <p style="margin:0 0 16px;font-size:13px;color:#94a3b8;">You can reply directly to this email if you want to add screenshots or extra context, or browse <a href="${escapeHtml(helpUrl)}" style="color:#22d3ee;">SceneFlow Studio Academy</a> for self-service fixes.</p>
  </div>
</body>
</html>`
    const text = [
      `SceneFlow Support — Ticket ${report.ticketId} Received`,
      `Category: ${mediaLabel} — ${report.title}`,
      'Our team received your report and will respond within 24 hours. Reply directly to this email to add context.',
      `Studio Academy: ${helpUrl}`,
    ].join('\n')

    await sendEmail({
      to: report.user.email,
      subject,
      html,
      text,
      from: getResendFromEmail(),
      replyTo: getSupportEscalationRecipient(),
      allowFallbackFrom: true,
    })
    return { sent: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn('[SupportEscalation] User confirmation email failed:', msg)
    return { sent: false, error: msg }
  }
}

export async function sendSupportResolutionEmail(
  report: GenerationErrorSupportReport
): Promise<{ sent: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY?.trim() || !report.user.email?.trim()) {
    return { sent: false, error: 'Missing RESEND_API_KEY or user email' }
  }
  try {
    const subject = `Update on SceneFlow Support ticket ${report.ticketId} — Resolved`
    const noteHtml = report.resolutionNote
      ? `<div style="margin:0 0 16px;padding:12px;border-radius:8px;background:#1e293b;border-left:3px solid #10b981;"><p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;color:#6ee7b7;">Support Resolution Note</p><p style="margin:0;font-size:13px;color:#f8fafc;white-space:pre-wrap;">${escapeHtml(report.resolutionNote)}</p></div>`
      : ''
    const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:24px;background:#020617;color:#e2e8f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#0f172a;border:1px solid #1e293b;border-radius:12px;padding:24px;">
    <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#10b981;">SceneFlow Support Update</p>
    <h1 style="margin:0 0 12px;font-size:20px;color:#f8fafc;">Ticket ${escapeHtml(report.ticketId)} Marked Resolved</h1>
    <p style="margin:0 0 12px;font-size:14px;line-height:20px;color:#cbd5e1;">Your report regarding <strong>${escapeHtml(report.title)}</strong> has been resolved by our team.</p>
    ${noteHtml}
    <p style="margin:0;font-size:13px;color:#94a3b8;">If you are still seeing the issue, simply reply to this email and we will reopen the ticket immediately.</p>
  </div>
</body>
</html>`
    const text = [
      `SceneFlow Support — Ticket ${report.ticketId} Marked Resolved`,
      `Issue: ${report.title}`,
      ...(report.resolutionNote ? [`Resolution Note: ${report.resolutionNote}`] : []),
      'If you still need help, reply directly to this email.',
    ].join('\n')

    await sendEmail({
      to: report.user.email,
      subject,
      html,
      text,
      from: getResendFromEmail(),
      replyTo: getSupportEscalationRecipient(),
      allowFallbackFrom: true,
    })
    return { sent: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn('[SupportEscalation] Resolution email failed:', msg)
    return { sent: false, error: msg }
  }
}
