import { BRAND } from '@/config/brand'
import { getAppBaseUrl, getBrandBadgeUrl } from '@/lib/email/resendClient'

export function eapEmailLayout(bodyHtml: string, previewText?: string): string {
  const baseUrl = getAppBaseUrl()
  const badgeUrl = getBrandBadgeUrl()
  const preview = previewText || 'SceneFlow Early Access Program'

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${BRAND.name}</title>
</head>
<body style="margin:0;padding:0;background-color:${BRAND.colors.navy};font-family:Inter,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <span style="display:none!important;visibility:hidden;opacity:0;height:0;width:0;overflow:hidden;">${preview}</span>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:${BRAND.colors.navy};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:linear-gradient(180deg,#0a1228 0%,#050a18 100%);border:1px solid rgba(0,242,255,0.2);border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:28px 32px 16px;text-align:center;border-bottom:1px solid rgba(0,242,255,0.12);">
              <img src="${badgeUrl}" alt="${BRAND.name}" width="48" height="48" style="display:inline-block;border-radius:10px;" />
              <div style="margin-top:12px;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:0.02em;">
                SceneFlow <span style="color:${BRAND.colors.cyan};">AI Studio</span>
              </div>
              <div style="margin-top:4px;font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em;">Early Access Program</div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;color:#e2e8f0;font-size:15px;line-height:1.6;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 28px;border-top:1px solid rgba(0,242,255,0.12);text-align:center;">
              <p style="margin:0 0 8px;font-size:12px;color:#64748b;">
                © ${new Date().getFullYear()} ${BRAND.name}
              </p>
              <p style="margin:0;font-size:12px;">
                <a href="${baseUrl}" style="color:${BRAND.colors.cyan};text-decoration:none;">${baseUrl.replace(/^https?:\/\//, '')}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function eapCtaButton(label: string, href: string): string {
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px auto 0;">
    <tr>
      <td style="border-radius:8px;background:${BRAND.colors.cyan};">
        <a href="${href}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:${BRAND.colors.navy};text-decoration:none;border-radius:8px;">${label}</a>
      </td>
    </tr>
  </table>`
}
