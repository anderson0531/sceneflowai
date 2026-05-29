import { eapEmailLayout } from './layout'

export function buildApplicationReceivedEmail(params: {
  fullName: string
  applicationId: string
}): { subject: string; html: string; text: string } {
  const { fullName, applicationId } = params
  const subject = 'We received your SceneFlow Early Access application'
  const text = `Hi ${fullName}, we received your Early Access application (ID: ${applicationId}). Our team will review it and follow up with next steps.`

  const body = `
    <h1 style="margin:0 0 16px;font-size:22px;color:#ffffff;">Application received</h1>
    <p style="margin:0 0 16px;color:#cbd5e1;">Hi ${fullName},</p>
    <p style="margin:0 0 16px;color:#cbd5e1;">Thank you for applying to the SceneFlow Early Access Program — August 2026 cohort. We've saved your submission and our team will review it shortly.</p>
    <p style="margin:0 0 8px;color:#94a3b8;font-size:13px;">Application ID</p>
    <p style="margin:0 0 20px;font-family:monospace;color:#00F2FF;font-size:14px;">${applicationId}</p>
    <p style="margin:0;color:#cbd5e1;"><strong>What happens next?</strong></p>
    <ul style="margin:12px 0 0;padding-left:20px;color:#cbd5e1;">
      <li style="margin-bottom:8px;">Our team reviews your production profile and creative challenge.</li>
      <li style="margin-bottom:8px;">If selected, you'll receive an invite email with a secure link to choose your plan.</li>
      <li>Keep an eye on your inbox — we aim to respond before the cohort launch window closes.</li>
    </ul>
  `

  return {
    subject,
    text,
    html: eapEmailLayout(body, 'Your Early Access application was received'),
  }
}
