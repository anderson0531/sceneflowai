/** Client-safe welcome credit config (no DB imports). */
export function getWelcomeCreditsOnSignup(): number {
  const raw = process.env.NEXT_PUBLIC_WELCOME_CREDITS_ON_SIGNUP ?? process.env.WELCOME_CREDITS_ON_SIGNUP
  if (raw === '0') return 0
  if (raw != null && raw.trim() !== '') {
    const n = Number(raw)
    if (Number.isFinite(n) && n >= 0) return Math.floor(n)
  }
  return 1500
}
