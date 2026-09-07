import { BRAND } from '@/config/brand'
import {
  LEGAL_ADDRESS,
  LEGAL_COMPANY_NAME,
  LEGAL_SUPPORT_EMAIL,
  LEGAL_WEBSITE,
} from '@/config/legal/legalCopy'
import { getBrandBadgeUrl } from '@/lib/email/resendClient'

export interface OfficialEmailContent {
  html: string
  text: string
}

export interface OfficialEmailInput {
  preheader: string
  heading: string
  paragraphs: string[]
  ctaLabel: string
  ctaUrl: string
  whyReceived: string
  unsubscribeUrl: string
  bodyHtml?: string
  bodyText?: string
}

export function isFullHtmlDocument(html: string): boolean {
  return /<html[\s>]/i.test(html)
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function listUnsubscribeHeaders(unsubscribeUrl: string): Record<string, string> {
  return {
    'List-Unsubscribe': `<${unsubscribeUrl}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  }
}

function footerText(unsubscribeUrl: string, whyReceived: string): string {
  return [
    whyReceived,
    '',
    `Unsubscribe: ${unsubscribeUrl}`,
    '',
    `${LEGAL_COMPANY_NAME}`,
    LEGAL_ADDRESS,
    LEGAL_WEBSITE,
    `Questions? Reply to this message or write ${LEGAL_SUPPORT_EMAIL}.`,
  ].join('\n')
}

export function buildOfficialEmail(input: OfficialEmailInput): OfficialEmailContent {
  const badgeUrl = getBrandBadgeUrl()
  const bodyHtml =
    input.bodyHtml?.trim() ||
    input.paragraphs
      .map((paragraph) => `<p style="margin:0 0 16px;font-size:16px;line-height:24px;color:#e2e8f0">${escapeHtml(paragraph)}</p>`)
      .join('')
  const bodyText =
    input.bodyText?.trim() ||
    [
      input.heading,
      '',
      ...input.paragraphs,
      '',
      `${input.ctaLabel}: ${input.ctaUrl}`,
    ].join('\n')

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(input.heading)}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.colors.navy};color:#e2e8f0;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(input.preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.colors.navy};padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#0f172a;border:1px solid #1e293b;border-radius:12px;">
          <tr>
            <td style="padding:28px 32px 12px;text-align:left;">
              <img src="${escapeHtml(badgeUrl)}" width="${BRAND.badge.width}" height="${BRAND.badge.height}" alt="${escapeHtml(BRAND.name)}" style="display:block;border:0;" />
              <p style="margin:12px 0 0;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:${BRAND.colors.cyan};">${escapeHtml(BRAND.name)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 8px;">
              <h1 style="margin:0 0 16px;font-size:24px;line-height:32px;color:#f8fafc;">${escapeHtml(input.heading)}</h1>
              ${bodyHtml}
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 16px;">
                <tr>
                  <td style="border-radius:8px;background:#0891b2;">
                    <a href="${escapeHtml(input.ctaUrl)}" style="display:inline-block;padding:12px 20px;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;">${escapeHtml(input.ctaLabel)}</a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 16px;font-size:13px;line-height:20px;color:#94a3b8;word-break:break-all;">Or paste this link into your browser:<br /><a href="${escapeHtml(input.ctaUrl)}" style="color:${BRAND.colors.cyan};">${escapeHtml(input.ctaUrl)}</a></p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 28px;border-top:1px solid #1e293b;">
              <p style="margin:0 0 12px;font-size:12px;line-height:18px;color:#94a3b8;">${escapeHtml(input.whyReceived)}</p>
              <p style="margin:0 0 12px;font-size:12px;line-height:18px;color:#94a3b8;"><a href="${escapeHtml(input.unsubscribeUrl)}" style="color:${BRAND.colors.cyan};">Unsubscribe</a> from future SceneFlow launch emails.</p>
              <p style="margin:0;font-size:12px;line-height:18px;color:#64748b;">${escapeHtml(LEGAL_COMPANY_NAME)}<br />${escapeHtml(LEGAL_ADDRESS)}<br /><a href="${escapeHtml(LEGAL_WEBSITE)}" style="color:${BRAND.colors.cyan};">${escapeHtml(LEGAL_WEBSITE)}</a><br />Questions? Reply or write <a href="mailto:${LEGAL_SUPPORT_EMAIL}" style="color:${BRAND.colors.cyan};">${LEGAL_SUPPORT_EMAIL}</a>.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  const text = [bodyText, '', footerText(input.unsubscribeUrl, input.whyReceived)].join('\n')
  return { html, text }
}

export function ensureOfficialHtml(
  html: string,
  options: Pick<OfficialEmailInput, 'preheader' | 'heading' | 'ctaLabel' | 'ctaUrl' | 'whyReceived' | 'unsubscribeUrl' | 'bodyText'>
): OfficialEmailContent {
  if (isFullHtmlDocument(html)) {
    return { html, text: options.bodyText || '' }
  }
  return buildOfficialEmail({
    ...options,
    paragraphs: [],
    bodyHtml: html,
  })
}
