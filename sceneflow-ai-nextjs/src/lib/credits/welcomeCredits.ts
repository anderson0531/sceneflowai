import { CreditService } from '@/services/CreditService'

/**
 * First-time account credits (matches trial tier marketing: ~1,500 free credits).
 * Set WELCOME_CREDITS_ON_SIGNUP=0 to disable.
 */
export function getWelcomeCreditsOnSignup(): number {
  const raw = process.env.WELCOME_CREDITS_ON_SIGNUP
  if (raw === '0') return 0
  if (raw != null && raw.trim() !== '') {
    const n = Number(raw)
    if (Number.isFinite(n) && n >= 0) return Math.floor(n)
  }
  return 1500
}

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
