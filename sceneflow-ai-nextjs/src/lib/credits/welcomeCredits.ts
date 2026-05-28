import { CreditService } from '@/services/CreditService'
import { getWelcomeCreditsOnSignup } from '@/lib/credits/welcomeCreditsConfig'

/** Grant welcome credits once for a newly created account; failures are logged only. */
export async function grantWelcomeCreditsToNewUser(
  userId: string,
  context: 'email_register' | 'oauth_auto_create'
): Promise<void> {
  const n = getWelcomeCreditsOnSignup()
  if (n <= 0) return
  try {
    await CreditService.grantCredits(userId, n, 'welcome_signup', null, { context })
    console.log(`[welcomeCredits] Granted ${n} credits (${context}) user=${userId}`)
  } catch (err) {
    console.error('[welcomeCredits] Failed to grant welcome credits:', err)
  }
}
