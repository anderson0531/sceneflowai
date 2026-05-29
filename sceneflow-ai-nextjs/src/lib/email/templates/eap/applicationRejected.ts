import { eapEmailLayout } from './layout'
import { getAppBaseUrl } from '@/lib/email/resendClient'

export function buildApplicationRejectedEmail(params: {
  fullName: string
}): { subject: string; html: string; text: string } {
  const { fullName } = params
  const baseUrl = getAppBaseUrl()
  const subject = 'SceneFlow Early Access — application update'

  const text = `Hi ${fullName}, thank you for applying to SceneFlow Early Access. We're unable to offer you a spot in the current cohort. Learn more at ${baseUrl}`

  const body = `
    <h1 style="margin:0 0 16px;font-size:22px;color:#ffffff;">Application update</h1>
    <p style="margin:0 0 16px;color:#cbd5e1;">Hi ${fullName},</p>
    <p style="margin:0 0 16px;color:#cbd5e1;">Thank you for taking the time to apply to the SceneFlow Early Access Program. After careful review, we're unable to offer you a spot in the current August 2026 cohort.</p>
    <p style="margin:0;color:#cbd5e1;">We appreciate your interest in automated production and encourage you to stay connected at <a href="${baseUrl}" style="color:#00F2FF;text-decoration:none;">sceneflowai.studio</a> for future opportunities.</p>
  `

  return {
    subject,
    text,
    html: eapEmailLayout(body, 'Early Access application update'),
  }
}
