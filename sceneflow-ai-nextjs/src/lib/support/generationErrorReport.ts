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
  user: {
    id?: string
    email?: string
    name?: string
  }
  mediaType: GenerationMediaType
  category: GenerationErrorCategory
  title: string
  explanation: string
  recommendedAction: string
  context: SupportReportContext
  prompt?: string
  technicalDetails?: string
  userNote?: string
  emailSent: boolean
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
  resolvedBy?: string
): Promise<GenerationErrorSupportReport | null> {
  const existing = await readSupportErrorReport(ticketId)
  if (!existing) return null
  const nowIso = new Date().toISOString()
  const updated: GenerationErrorSupportReport = {
    ...existing,
    status,
    updatedAt: nowIso,
    resolvedAt: status === 'resolved' ? nowIso : undefined,
    resolvedBy: status === 'resolved' ? resolvedBy : undefined,
  }
  await saveSupportErrorReport(updated)
  return updated
}

export function buildSupportEscalationEmailContent(
  report: GenerationErrorSupportReport
): { subject: string; html: string; text: string } {
  const mediaLabel = report.mediaType === 'clip' ? 'Video Clip' : 'Shot Still'
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
