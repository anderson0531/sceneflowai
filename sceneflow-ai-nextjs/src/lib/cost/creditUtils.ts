export const DEFAULT_CREDIT_VALUE_USD = 0.0001
export const DEFAULT_MARKUP_MULTIPLIER = 4

const creditValueEnv = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_CREDIT_VALUE_USD : undefined
const markupEnv = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_MARKUP_MULTIPLIER : undefined

export const CREDIT_VALUE_USD = creditValueEnv ? Number(creditValueEnv) : DEFAULT_CREDIT_VALUE_USD
export const MARKUP_MULTIPLIER = markupEnv ? Number(markupEnv) : DEFAULT_MARKUP_MULTIPLIER

export function usdToCredits(usd: number): number {
  if (!Number.isFinite(usd) || usd <= 0) return 0
  const divisor = CREDIT_VALUE_USD > 0 ? CREDIT_VALUE_USD : DEFAULT_CREDIT_VALUE_USD
  const multiplier = MARKUP_MULTIPLIER > 0 ? MARKUP_MULTIPLIER : DEFAULT_MARKUP_MULTIPLIER
  return Math.max(0, Math.ceil((usd * multiplier) / divisor))
}

export function creditsToUsd(credits: number): number {
  if (!Number.isFinite(credits) || credits <= 0) return 0
  const divisor = MARKUP_MULTIPLIER > 0 ? MARKUP_MULTIPLIER : DEFAULT_MARKUP_MULTIPLIER
  const value = CREDIT_VALUE_USD > 0 ? CREDIT_VALUE_USD : DEFAULT_CREDIT_VALUE_USD
  return (credits * value) / divisor
}
