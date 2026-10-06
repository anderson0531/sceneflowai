/**
 * Locale-aware long-form and shorts destinations for landing copy.
 *
 * Named platforms are examples, not a lock-in. Mainland China has no single
 * YouTube analog: Bilibili is the creator-upload home; Douyin is the trailer
 * layer. Do not promise one-click Bilibili or Douyin publish until those APIs
 * exist — zh-CN copy means download / upload.
 */

export type DistributionDestinations = {
  longForm: string
  shorts: string
}

export const DEFAULT_DISTRIBUTION_DESTINATIONS: DistributionDestinations = {
  longForm: 'YouTube',
  shorts: 'TikTok and Shorts',
}

export const ZH_CN_DISTRIBUTION_DESTINATIONS: DistributionDestinations = {
  longForm: '哔哩哔哩',
  shorts: '抖音',
}

export function normalizeDistributionLocale(locale: string | undefined | null): string {
  const raw = (locale || 'en').trim()
  if (raw === 'zh' || raw === 'zh-CN' || raw.startsWith('zh-CN') || raw === 'zh-Hans') {
    return 'zh-CN'
  }
  return raw
}

export function getDistributionDestinations(
  locale?: string | null
): DistributionDestinations {
  if (normalizeDistributionLocale(locale) === 'zh-CN') {
    return ZH_CN_DISTRIBUTION_DESTINATIONS
  }
  return DEFAULT_DISTRIBUTION_DESTINATIONS
}

export function interpolateDestinations(template: string, locale?: string | null): string {
  const { longForm, shorts } = getDistributionDestinations(locale)
  return template.replaceAll('{longForm}', longForm).replaceAll('{shorts}', shorts)
}
