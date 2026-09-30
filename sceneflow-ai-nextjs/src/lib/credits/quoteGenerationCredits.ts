/**
 * Provider-cost quote for SceneFlow credits.
 *
 * Face value is $0.01 per credit. Studio is the tightest paid rate at $0.008
 * per credit, so a fully spent Studio balance must still cover list COGS.
 *
 * credits = max(ceil(providerUsd * markup / 0.01), ceil(providerUsd / 0.008))
 * Default markup is 1.8 (80% above list cost at face value).
 *
 * Live charges prefer a published credit_pricing row. These seeds are the
 * fallback when that table is empty or unreachable.
 */

export const DEFAULT_MARKUP = 1.8
export const CREDIT_FACE_USD = 0.01
export const STUDIO_CASH_PER_CREDIT_USD = 0.008
export const REFERENCE_IMAGE_ADDON_CREDITS = 5

export const OMNI_MODEL_ID = 'gemini-omni-1.1-flash-preview'
export const KLING_OMNI_MODEL_ID = 'kling-v3-omni'
export const GEMINI_STILL_MODEL_ID = 'gemini-3.1-flash-image'

export const OMNI_PRICING_SOURCE_URL = 'https://ai.google.dev/gemini-api/docs/pricing'
export const KLING_PRICING_SOURCE_URL = 'https://kling.ai/document-api/pricing/base/video.md'

export type VideoResolution = '360p' | '720p' | '1080p' | '4k'
export type MediaKind = 'reference' | 'still' | 'clip'
export type QuoteKind = MediaKind | 'audio' | 'other'
export type RateMetric = 'per_second' | 'per_image'
export type QuoteProvider = 'google_vertex' | 'kling'

export interface SeededProviderRate {
  operation: string
  provider: QuoteProvider
  category: 'video_generation' | 'image_generation'
  model: string
  resolution: VideoResolution | null
  audio: boolean | null
  metric: RateMetric
  usdPerUnit: number
  sourceUrl: string
  notes: string
}

export const SEEDED_PROVIDER_RATES: SeededProviderRate[] = [
  {
    operation: 'omni_360p',
    provider: 'google_vertex',
    category: 'video_generation',
    model: OMNI_MODEL_ID,
    resolution: '360p',
    audio: true,
    metric: 'per_second',
    usdPerUnit: 0.034,
    sourceUrl: OMNI_PRICING_SOURCE_URL,
    notes: 'Gemini Omni preview video output, 360p (~1,931 tokens/s at $17.50/1M)',
  },
  {
    operation: 'omni_720p',
    provider: 'google_vertex',
    category: 'video_generation',
    model: OMNI_MODEL_ID,
    resolution: '720p',
    audio: true,
    metric: 'per_second',
    usdPerUnit: 0.101,
    sourceUrl: OMNI_PRICING_SOURCE_URL,
    notes: 'Gemini Omni preview video output, 720p (~5,792 tokens/s at $17.50/1M)',
  },
  {
    operation: 'omni_1080p',
    provider: 'google_vertex',
    category: 'video_generation',
    model: OMNI_MODEL_ID,
    resolution: '1080p',
    audio: true,
    metric: 'per_second',
    usdPerUnit: 0.152,
    sourceUrl: OMNI_PRICING_SOURCE_URL,
    notes: 'Gemini Omni preview video output, 1080p (~8,688 tokens/s at $17.50/1M)',
  },
  {
    operation: 'omni_4k',
    provider: 'google_vertex',
    category: 'video_generation',
    model: OMNI_MODEL_ID,
    resolution: '4k',
    audio: true,
    metric: 'per_second',
    usdPerUnit: 0.304,
    sourceUrl: OMNI_PRICING_SOURCE_URL,
    notes: 'Gemini Omni preview video output, 4K (~17,376 tokens/s at $17.50/1M)',
  },
  {
    operation: 'kling_omni_720p_silent',
    provider: 'kling',
    category: 'video_generation',
    model: KLING_OMNI_MODEL_ID,
    resolution: '720p',
    audio: false,
    metric: 'per_second',
    usdPerUnit: 0.084,
    sourceUrl: KLING_PRICING_SOURCE_URL,
    notes: 'Kling 3.0 Omni, no video input, no native audio, 720p',
  },
  {
    operation: 'kling_omni_720p_audio',
    provider: 'kling',
    category: 'video_generation',
    model: KLING_OMNI_MODEL_ID,
    resolution: '720p',
    audio: true,
    metric: 'per_second',
    usdPerUnit: 0.112,
    sourceUrl: KLING_PRICING_SOURCE_URL,
    notes: 'Kling 3.0 Omni, no video input, native audio, 720p',
  },
  {
    operation: 'kling_omni_1080p_silent',
    provider: 'kling',
    category: 'video_generation',
    model: KLING_OMNI_MODEL_ID,
    resolution: '1080p',
    audio: false,
    metric: 'per_second',
    usdPerUnit: 0.112,
    sourceUrl: KLING_PRICING_SOURCE_URL,
    notes: 'Kling 3.0 Omni, no video input, no native audio, 1080p',
  },
  {
    operation: 'kling_omni_1080p_audio',
    provider: 'kling',
    category: 'video_generation',
    model: KLING_OMNI_MODEL_ID,
    resolution: '1080p',
    audio: true,
    metric: 'per_second',
    usdPerUnit: 0.14,
    sourceUrl: KLING_PRICING_SOURCE_URL,
    notes: 'Kling 3.0 Omni, no video input, native audio, 1080p',
  },
  {
    operation: 'kling_omni_4k',
    provider: 'kling',
    category: 'video_generation',
    model: KLING_OMNI_MODEL_ID,
    resolution: '4k',
    audio: null,
    metric: 'per_second',
    usdPerUnit: 0.42,
    sourceUrl: KLING_PRICING_SOURCE_URL,
    notes: 'Kling 3.0 Omni 4K, flat rate with or without audio',
  },
  {
    operation: 'gemini_still',
    provider: 'google_vertex',
    category: 'image_generation',
    model: GEMINI_STILL_MODEL_ID,
    resolution: null,
    audio: null,
    metric: 'per_image',
    usdPerUnit: 0.04,
    sourceUrl: OMNI_PRICING_SOURCE_URL,
    notes: 'Gemini image still / reference. Callers keep a 10–15 credit floor.',
  },
]

const RATE_BY_OPERATION = new Map(SEEDED_PROVIDER_RATES.map((rate) => [rate.operation, rate]))

export function getSeededRate(operation: string): SeededProviderRate | undefined {
  return RATE_BY_OPERATION.get(operation)
}

export function normalizeResolution(value?: string | null): VideoResolution {
  const raw = (value || '').toLowerCase().replace(/\s+/g, '')
  if (raw === '360p' || raw === '360') return '360p'
  if (raw === '720p' || raw === '720') return '720p'
  if (raw === '4k' || raw === '2160p' || raw === 'uhd') return '4k'
  return '1080p'
}

export function isByokMediaKind(kind: string | null | undefined): kind is MediaKind {
  return kind === 'reference' || kind === 'still' || kind === 'clip'
}

export function creditsForProviderUsd(
  providerUsd: number,
  markup: number = DEFAULT_MARKUP,
  creditsPerUnitOverride?: number | null,
  units: number = 1
): number {
  if (!(providerUsd > 0)) return 0
  const safeUnits = Math.max(0, units)
  const floor = Math.ceil(Number((providerUsd / STUDIO_CASH_PER_CREDIT_USD).toFixed(6)))
  if (creditsPerUnitOverride != null && creditsPerUnitOverride > 0) {
    return Math.max(Math.ceil(creditsPerUnitOverride * safeUnits), floor)
  }
  const face = Math.ceil(Number(((providerUsd * markup) / CREDIT_FACE_USD).toFixed(6)))
  return Math.max(face, floor)
}

export function marginPercents(credits: number, providerUsd: number): {
  faceMarginPercent: number
  studioMarginPercent: number
} {
  const faceRevenue = credits * CREDIT_FACE_USD
  const studioRevenue = credits * STUDIO_CASH_PER_CREDIT_USD
  const faceMarginPercent = faceRevenue > 0 ? ((faceRevenue - providerUsd) / faceRevenue) * 100 : 0
  const studioMarginPercent =
    studioRevenue > 0 ? ((studioRevenue - providerUsd) / studioRevenue) * 100 : 0
  return { faceMarginPercent, studioMarginPercent }
}

export interface AppliedRate {
  usdPerUnit: number
  markup?: number
  creditsPerUnitOverride?: number | null
}

export interface QuoteGenerationInput {
  kind: QuoteKind
  provider?: QuoteProvider
  model?: string
  resolution?: string | null
  durationSeconds?: number
  audio?: boolean
  imageCount?: number
  referenceImageCount?: number
  userKeyUsed?: boolean
  /** Keep stills and references near the existing catalog price. */
  floorCredits?: number
  rate?: AppliedRate
}

export interface GenerationQuote {
  operation: string
  kind: QuoteKind
  provider: QuoteProvider
  model: string
  resolution: VideoResolution | null
  audio: boolean | null
  metric: RateMetric
  durationSeconds: number
  units: number
  usdPerUnit: number
  providerUsd: number
  markup: number
  standardCredits: number
  credits: number
  byok: boolean
  cogsUsd: number
  source: 'seed' | 'rate_card'
  faceMarginPercent: number
  studioMarginPercent: number
}

export function operationForVideo(args: {
  provider?: QuoteProvider
  resolution?: string | null
  audio?: boolean
}): { operation: string; resolution: VideoResolution; audio: boolean | null } {
  const resolution = normalizeResolution(args.resolution)
  if (args.provider === 'kling') {
    if (resolution === '4k') {
      return { operation: 'kling_omni_4k', resolution, audio: null }
    }
    const audio = args.audio !== false
    const operation = `kling_omni_${resolution}_${audio ? 'audio' : 'silent'}`
    return { operation, resolution, audio }
  }
  return { operation: `omni_${resolution}`, resolution, audio: true }
}

export function quoteGenerationCredits(input: QuoteGenerationInput): GenerationQuote {
  const provider: QuoteProvider = input.provider === 'kling' ? 'kling' : 'google_vertex'
  const imageLike = input.kind === 'reference' || input.kind === 'still'
  const video = imageLike
    ? null
    : operationForVideo({
        provider,
        resolution: input.resolution,
        audio: input.audio,
      })
  const operation = imageLike ? 'gemini_still' : video!.operation
  const seed = getSeededRate(operation) ?? getSeededRate('gemini_still')!
  const usdPerUnit = input.rate?.usdPerUnit ?? seed.usdPerUnit
  const markup = input.rate?.markup ?? DEFAULT_MARKUP
  const units = imageLike
    ? Math.max(1, input.imageCount ?? 1)
    : Math.max(1, input.durationSeconds ?? 10)
  const providerUsd = usdPerUnit * units
  let standardCredits = creditsForProviderUsd(
    providerUsd,
    markup,
    input.rate?.creditsPerUnitOverride,
    units
  )
  if (input.floorCredits && input.floorCredits > 0) {
    standardCredits = Math.max(standardCredits, Math.ceil(input.floorCredits))
  }
  const referenceImageCount = imageLike ? 0 : Math.max(0, input.referenceImageCount ?? 0)
  standardCredits += referenceImageCount * REFERENCE_IMAGE_ADDON_CREDITS

  const byok = Boolean(input.userKeyUsed) && isByokMediaKind(input.kind)
  const credits = byok
    ? Math.max(1, Math.ceil(standardCredits * 0.2))
    : standardCredits
  const cogsUsd = byok ? 0 : providerUsd
  const margins = marginPercents(credits, cogsUsd)

  return {
    operation,
    kind: input.kind,
    provider: seed.provider,
    model: input.model || seed.model,
    resolution: imageLike ? null : video!.resolution,
    audio: imageLike ? null : video!.audio,
    metric: seed.metric,
    durationSeconds: imageLike ? 0 : units,
    units,
    usdPerUnit,
    providerUsd,
    markup,
    standardCredits,
    credits,
    byok,
    cogsUsd,
    source: input.rate ? 'rate_card' : 'seed',
    faceMarginPercent: margins.faceMarginPercent,
    studioMarginPercent: margins.studioMarginPercent,
  }
}

export interface ParsedOmniRates {
  '360p': number | null
  '720p': number | null
  '1080p': number | null
  '4k': number | null
}

export interface ParsedKlingRates {
  p720Silent: number | null
  p720Audio: number | null
  p1080Silent: number | null
  p1080Audio: number | null
  p4k: number | null
}

function dollarNearLabel(text: string, label: string): number | null {
  const lower = text.toLowerCase()
  const needle = label.toLowerCase()
  let from = 0
  while (from < lower.length) {
    const idx = lower.indexOf(needle, from)
    if (idx < 0) return null
    const after = text.slice(idx + needle.length, idx + needle.length + 120)
    const match = after.match(/\$\s*([0-9]+(?:\.[0-9]+)?)/)
    if (match) {
      const value = Number(match[1])
      if (value > 0 && value < 5) return value
    }
    from = idx + needle.length
  }
  return null
}

function tokensPerSecond(text: string, label: string): number | null {
  const lower = text.toLowerCase()
  const idx = lower.indexOf(label.toLowerCase())
  if (idx < 0) return null
  const window = text.slice(idx, idx + 180)
  const match = window.match(/([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{3,6})\s*tokens?/i)
  if (!match) return null
  const tokens = Number(match[1].replace(/,/g, ''))
  return tokens > 100 ? tokens : null
}

function videoOutputUsdPerMillion(text: string): number | null {
  const match = text.match(/video output[^$\n]{0,80}\$\s*([0-9]+(?:\.[0-9]+)?)/i)
  if (!match) return null
  const value = Number(match[1])
  return value >= 1 ? value : null
}

export function parseOmniRatesFromText(text: string): ParsedOmniRates {
  const direct: ParsedOmniRates = {
    '360p': dollarNearLabel(text, '360p'),
    '720p': dollarNearLabel(text, '720p'),
    '1080p': dollarNearLabel(text, '1080p'),
    '4k': dollarNearLabel(text, '4k') ?? dollarNearLabel(text, '4K'),
  }
  const perMillion = videoOutputUsdPerMillion(text)
  if (!perMillion) return direct
  const resolutions: Array<keyof ParsedOmniRates> = ['360p', '720p', '1080p', '4k']
  for (const resolution of resolutions) {
    if (direct[resolution] != null) continue
    const label = resolution === '4k' ? '4K' : resolution
    const tokens = tokensPerSecond(text, label) ?? (resolution === '4k' ? tokensPerSecond(text, '4k') : null)
    if (!tokens) continue
    direct[resolution] = Math.round((tokens * (perMillion / 1_000_000)) * 1000) / 1000
  }
  return direct
}

function dollarsInOrder(line: string): number[] {
  return Array.from(line.matchAll(/\(\$\s*([0-9]+(?:\.[0-9]+)?)\)/g)).map((match) => Number(match[1]))
}

export function parseKlingOmniRatesFromMarkdown(text: string): ParsedKlingRates {
  const result: ParsedKlingRates = {
    p720Silent: null,
    p720Audio: null,
    p1080Silent: null,
    p1080Audio: null,
    p4k: null,
  }
  const lines = text.split(/\r?\n/)
  for (const line of lines) {
    if (!/kling\s*3\.0\s*omni/i.test(line)) continue
    if (/with video input/i.test(line)) continue
    const amounts = dollarsInOrder(line)
    if (amounts.length < 3) continue
    const [p720, p1080, p4k] = amounts
    if (/no native audio/i.test(line)) {
      result.p720Silent = p720
      result.p1080Silent = p1080
      result.p4k = p4k
    } else if (/with native audio/i.test(line)) {
      result.p720Audio = p720
      result.p1080Audio = p1080
      result.p4k = result.p4k ?? p4k
    }
  }
  return result
}

export function klingQuotesFromParsed(parsed: ParsedKlingRates): Array<{ operation: string; usdPerUnit: number }> {
  const rows: Array<{ operation: string; usdPerUnit: number | null }> = [
    { operation: 'kling_omni_720p_silent', usdPerUnit: parsed.p720Silent },
    { operation: 'kling_omni_720p_audio', usdPerUnit: parsed.p720Audio },
    { operation: 'kling_omni_1080p_silent', usdPerUnit: parsed.p1080Silent },
    { operation: 'kling_omni_1080p_audio', usdPerUnit: parsed.p1080Audio },
    { operation: 'kling_omni_4k', usdPerUnit: parsed.p4k },
  ]
  return rows.filter((row): row is { operation: string; usdPerUnit: number } => row.usdPerUnit != null && row.usdPerUnit > 0)
}

export function omniQuotesFromParsed(parsed: ParsedOmniRates): Array<{ operation: string; usdPerUnit: number }> {
  const rows: Array<{ operation: string; usdPerUnit: number | null }> = [
    { operation: 'omni_360p', usdPerUnit: parsed['360p'] },
    { operation: 'omni_720p', usdPerUnit: parsed['720p'] },
    { operation: 'omni_1080p', usdPerUnit: parsed['1080p'] },
    { operation: 'omni_4k', usdPerUnit: parsed['4k'] },
  ]
  return rows.filter((row): row is { operation: string; usdPerUnit: number } => row.usdPerUnit != null && row.usdPerUnit > 0)
}
