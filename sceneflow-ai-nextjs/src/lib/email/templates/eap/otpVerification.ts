import { eapEmailLayout } from './layout'

export function buildOtpVerificationEmail(code: string): { subject: string; html: string; text: string } {
  const subject = 'Your SceneFlow Early Access verification code'
  const text = `Your SceneFlow Early Access verification code is ${code}. It expires in 10 minutes.`

  const body = `
    <h1 style="margin:0 0 16px;font-size:22px;color:#ffffff;">Verify your email</h1>
    <p style="margin:0 0 20px;color:#cbd5e1;">Enter this code to continue your Early Access application:</p>
    <div style="text-align:center;margin:24px 0;">
      <span style="display:inline-block;padding:16px 32px;font-size:32px;font-weight:700;letter-spacing:8px;color:#00F2FF;background:rgba(0,242,255,0.08);border:1px solid rgba(0,242,255,0.3);border-radius:12px;font-family:monospace;">${code}</span>
    </div>
    <p style="margin:0;color:#94a3b8;font-size:13px;">This code expires in 10 minutes. If you didn't request this, you can safely ignore this email.</p>
  `

  return {
    subject,
    text,
    html: eapEmailLayout(body, `Your verification code is ${code}`),
  }
}
