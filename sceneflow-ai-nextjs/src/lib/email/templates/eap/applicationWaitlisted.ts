import { eapEmailLayout } from './layout'
import { getAppBaseUrl } from '@/lib/email/resendClient'

export function buildApplicationWaitlistedEmail(params: {
  fullName: string
}): { subject: string; html: string; text: string } {
  const { fullName } = params
  const baseUrl = getAppBaseUrl()
  const subject = 'SceneFlow Early Access — waitlist update'

  const text = `Hi ${fullName}, thank you for applying to SceneFlow Early Access. We're placing your application on our waitlist for a future cohort. Learn more at ${baseUrl}`

  const body = `
    <h1 style="margin:0 0 16px;font-size:22px;color:#ffffff;">You're on the waitlist</h1>
    <p style="margin:0 0 16px;color:#cbd5e1;">Hi ${fullName},</p>
    <p style="margin:0 0 16px;color:#cbd5e1;">Thank you for your interest in the SceneFlow Early Access Program. We've reviewed your application and are placing you on our waitlist for a future cohort.</p>
    <p style="margin:0;color:#cbd5e1;">We'll reach out if a spot opens up. In the meantime, you can follow our progress at <a href="${baseUrl}" style="color:#00F2FF;text-decoration:none;">sceneflowai.studio</a>.</p>
  `

  return {
    subject,
    text,
    html: eapEmailLayout(body, 'Early Access waitlist update'),
  }
}
