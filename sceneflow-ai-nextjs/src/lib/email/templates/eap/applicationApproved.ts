import { eapCtaButton, eapEmailLayout } from './layout'

export function buildApplicationApprovedEmail(params: {
  fullName: string
  inviteUrl: string
  expiresAt: string
}): { subject: string; html: string; text: string } {
  const { fullName, inviteUrl, expiresAt } = params
  const expiryDate = new Date(expiresAt).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  const subject = "You're in — SceneFlow Early Access invite"
  const text = `Congratulations ${fullName}! You've been approved for the SceneFlow Early Access Program. Choose your plan here: ${inviteUrl} (expires ${expiryDate}).`

  const body = `
    <h1 style="margin:0 0 16px;font-size:22px;color:#ffffff;">You're in the August 2026 cohort</h1>
    <p style="margin:0 0 16px;color:#cbd5e1;">Congratulations, ${fullName}!</p>
    <p style="margin:0 0 16px;color:#cbd5e1;">You've been approved for the SceneFlow Early Access Program. Click below to create your account and choose the plan that fits your production workflow.</p>
    ${eapCtaButton('Accept invite & choose plan', inviteUrl)}
    <p style="margin:24px 0 0;color:#94a3b8;font-size:13px;">This invite link expires on ${expiryDate}. If it expires, contact us and we'll send a fresh link.</p>
  `

  return {
    subject,
    text,
    html: eapEmailLayout(body, "You're approved for SceneFlow Early Access"),
  }
}
