/**
 * Landing-page currency conversion & formatting matched to the selected locale.
 *
 * Keeps exchange rates aligned with `customerPortalAnimaticCopy.ts` across all
 * 7 supported landing locales (`en`, `es`, `pt`, `hi`, `zh-CN`, `ar`, `th`).
 */

export interface LandingCurrencyConfig {
  code: 'USD' | 'MXN' | 'BRL' | 'INR' | 'CNY' | 'SAR' | 'THB'
  symbol: string
  rate: number
  placement: 'prefix' | 'suffix'
  numberLocale: string
}

export const LANDING_CURRENCY_BY_LOCALE: Record<string, LandingCurrencyConfig> = {
  en: { code: 'USD', symbol: '$', rate: 1, placement: 'prefix', numberLocale: 'en-US' },
  es: { code: 'MXN', symbol: 'MX$', rate: 18.85, placement: 'prefix', numberLocale: 'es-MX' },
  pt: { code: 'BRL', symbol: 'R$', rate: 5.86, placement: 'prefix', numberLocale: 'pt-BR' },
  hi: { code: 'INR', symbol: '₹', rate: 93.8, placement: 'prefix', numberLocale: 'en-IN' },
  'zh-CN': { code: 'CNY', symbol: '¥', rate: 6.65, placement: 'prefix', numberLocale: 'zh-CN' },
  ar: { code: 'SAR', symbol: 'ر.س', rate: 3.75, placement: 'suffix', numberLocale: 'en-US' },
  th: { code: 'THB', symbol: '฿', rate: 34, placement: 'prefix', numberLocale: 'th-TH' },
}

export function getLandingCurrencyConfig(locale?: string | null): LandingCurrencyConfig {
  if (!locale) return LANDING_CURRENCY_BY_LOCALE.en
  const trimmed = locale.trim()
  if (LANDING_CURRENCY_BY_LOCALE[trimmed]) {
    return LANDING_CURRENCY_BY_LOCALE[trimmed]
  }
  const lower = trimmed.toLowerCase()
  if (lower.startsWith('zh')) return LANDING_CURRENCY_BY_LOCALE['zh-CN']
  const base = lower.split(/[-_]/)[0]
  return LANDING_CURRENCY_BY_LOCALE[base] ?? LANDING_CURRENCY_BY_LOCALE.en
}

export function convertUsdToLocale(usdAmount: number, locale?: string | null): number {
  const cfg = getLandingCurrencyConfig(locale)
  if (cfg.rate === 1) return Math.round(usdAmount)
  return Math.round(usdAmount * cfg.rate)
}

export function formatLandingCurrency(usdAmount: number, locale?: string | null): string {
  const cfg = getLandingCurrencyConfig(locale)
  const converted = convertUsdToLocale(usdAmount, locale)
  const sign = converted < 0 ? '-' : ''
  const absFormatted = Math.abs(converted).toLocaleString(cfg.numberLocale)
  if (cfg.placement === 'suffix') {
    return `${sign}${absFormatted} ${cfg.symbol}`
  }
  return `${sign}${cfg.symbol}${absFormatted}`
}

/**
 * Replaces inline USD amounts (`$9`, `$149`, `$1,200–$4,500+`, `@$50/ชม.`) inside
 * localized landing copy with the selected locale's converted currency.
 * Preserves already-prefixed symbols like `MX$` and `R$`.
 */
export function localizeUsdText(text: string, locale?: string | null): string {
  if (!text) return text
  const cfg = getLandingCurrencyConfig(locale)
  if (cfg.code === 'USD') return text
  return text.replace(
    /(?<![A-Za-z])\$(\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)/g,
    (_match, rawNum: string) => {
      const numeric = Number(rawNum.replace(/,/g, ''))
      if (!Number.isFinite(numeric)) return _match
      return formatLandingCurrency(numeric, locale)
    }
  )
}
