import { describe, expect, it } from 'vitest'
import {
  convertUsdToLocale,
  formatLandingCurrency,
  getLandingCurrencyConfig,
  localizeUsdText,
} from '@/lib/i18n/landingCurrency'

describe('landingCurrency — locale-matched currency conversion', () => {
  it('converts USD amounts to THB (฿) for Thai locale', () => {
    expect(getLandingCurrencyConfig('th').code).toBe('THB')
    expect(convertUsdToLocale(599, 'th')).toBe(20366)
    expect(formatLandingCurrency(349, 'th')).toBe('฿11,866')
    expect(formatLandingCurrency(599, 'th')).toBe('฿20,366')
    expect(formatLandingCurrency(1250, 'th')).toBe('฿42,500')
    expect(formatLandingCurrency(9, 'th')).toBe('฿306')
  })

  it('converts inline USD strings & ranges in Thai calculator labels to THB', () => {
    expect(localizeUsdText('$1,200–$4,500+', 'th')).toBe('฿40,800–฿153,000+')
    expect(localizeUsdText('แพ็กเกจ Pro ($149/เดือน)', 'th')).toBe('แพ็กเกจ Pro (฿5,066/เดือน)')
    expect(localizeUsdText('เวลาผู้ดูแล / PM (@$50/ชม.)', 'th')).toBe('เวลาผู้ดูแล / PM (@฿1,700/ชม.)')
    expect(localizeUsdText('เปิดสตูดิโอ ($9)', 'th')).toBe('เปิดสตูดิโอ (฿306)')
  })

  it('preserves USD untouched for English locale', () => {
    expect(formatLandingCurrency(599, 'en')).toBe('$599')
    expect(localizeUsdText('$1,200–$4,500+', 'en')).toBe('$1,200–$4,500+')
  })

  it('formats all 14 supported landing locales consistently', () => {
    expect(formatLandingCurrency(100, 'es')).toBe('MX$1,885')
    expect(formatLandingCurrency(100, 'pt')).toBe('R$586')
    expect(formatLandingCurrency(100, 'hi')).toBe('₹9,380')
    expect(formatLandingCurrency(100, 'zh-CN')).toBe('¥665')
    expect(formatLandingCurrency(100, 'ar')).toBe('375 ر.س')
    expect(formatLandingCurrency(100, 'th')).toBe('฿3,400')
    expect(formatLandingCurrency(100, 'ja')).toBe('¥15,500')
    expect(formatLandingCurrency(100, 'ko')).toBe('₩140,000')
    expect(formatLandingCurrency(100, 'de')).toBe('92 €')
    expect(formatLandingCurrency(100, 'fr')).toBe('92 €')
    expect(formatLandingCurrency(100, 'it')).toBe('92 €')
    expect(formatLandingCurrency(100, 'nl')).toBe('€92')
    expect(formatLandingCurrency(100, 'ru')).toBe('9\u00a0600 ₽')
  })

  it('does not double-convert already-prefixed MX$ or R$ strings', () => {
    expect(localizeUsdText('MX$547', 'es')).toBe('MX$547')
    expect(localizeUsdText('R$170', 'pt')).toBe('R$170')
  })
})
