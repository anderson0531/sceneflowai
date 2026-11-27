/**
 * Provider-cost quote for SceneFlow credits.
 *
 * Face value is $0.01 per credit. Studio is $599 / 45,000 credits ($0.013311
 * per credit), aligned with `src/lib/billing/tierCatalog.ts`.
 *
 * credits = max(ceil(providerUsd * markup / 0.01), ceil(providerUsd / STUDIO_CASH_PER_CREDIT_USD))
 * Default markup is 2.0 (100% above list cost at face value).
 *
 * Live charges prefer a published credit_pricing row. These seeds are the
 * fallback when that table is empty or unreachable.
 */

export const DEFAULT_MARKUP = 2.0
export const CREDIT_FACE_USD = 0.01
export const STUDIO_CASH_PER_CREDIT_USD = 599 / 45000 // $0.013311/cr (Studio $599 / 45,000 cr)
export const REFERENCE_IMAGE_ADDON_CREDITS = 5

export const OMNI_MODEL_ID = 'gemini-omni-1.2-flash'
export const VEO_FAST_MODEL_ID = 'veo-3.1-fast-generate-001'
export const VEO_PREMIUM_MODEL_ID = 'veo-3.1-generate-001'
export const KLING_OMNI_MODEL_ID = 'kling-v3-omni'
export const GEMINI_STILL_MODEL_ID = 'gemini-3.1-flash-image'
export const GEMINI_PRO_STILL_MODEL_ID = 'gemini-3-pro-image-preview'

export const OMNI_PRICING_SOURCE_URL = 'https://ai.google.dev/gemini-api/docs/pricing'
export const KLING_PRICING_SOURCE_URL = 'https://kling.ai/document-api/pricing/base/video.md'
export const ELEVENLABS_PRICING_SOURCE_URL = 'https://elevenlabs.io/pricing/api'

export type VideoResolution = '360p' | '720p' | '1080p' | '4k'
export type MediaKind = 'reference' | 'still' | 'clip'
export type QuoteKind = MediaKind | 'audio' | 'other'
export type RateMetric =
  | 'per_second'
  | 'per_image'
  | 'per_clip'
  | 'per_track'
  | 'per_1k_chars'
  | 'per_minute'
export type QuoteProvider = 'google_vertex' | 'kling' | 'elevenlabs'

export interface SeededProviderRate {
  operation: string
  provider: QuoteProvider
  category:
    | 'video_generation'
    | 'image_generation'
    | 'audio_tts'
    | 'audio_sfx'
    | 'audio_music'
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
    operation: 'veo_fast',
    provider: 'google_vertex',
    category: 'video_generation',
    model: VEO_FAST_MODEL_ID,
    resolution: '1080p',
    audio: true,
    metric: 'per_second',
    usdPerUnit: 0.15,
    sourceUrl: OMNI_PRICING_SOURCE_URL,
    notes: 'Veo 3.1 Fast video output with native audio ($0.15/s)',
  },
  {
    operation: 'veo_premium',
    provider: 'google_vertex',
    category: 'video_generation',
    model: VEO_PREMIUM_MODEL_ID,
    resolution: '1080p',
    audio: true,
    metric: 'per_second',
    usdPerUnit: 0.4,
    sourceUrl: OMNI_PRICING_SOURCE_URL,
    notes: 'Veo 3.1 Standard/Premium 720p/1080p video output with native audio ($0.40/s)',
  },
  {
    operation: 'veo_premium_4k',
    provider: 'google_vertex',
    category: 'video_generation',
    model: VEO_PREMIUM_MODEL_ID,
    resolution: '4k',
    audio: true,
    metric: 'per_second',
    usdPerUnit: 0.6,
    sourceUrl: OMNI_PRICING_SOURCE_URL,
    notes: 'Veo 3.1 Standard/Premium native 4K video output with native audio ($0.60/s)',
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
    notes: 'Kling 3.0 Omni Direct API (0.6 Units/s), no video input, no native audio, 720p',
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
    notes: 'Kling 3.0 Omni Direct API (0.8 Units/s), no video input, native audio, 720p',
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
    notes: 'Kling 3.0 Omni Direct API (0.8 Units/s), no video input, no native audio, 1080p',
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
    notes: 'Kling 3.0 Omni Direct API (1.0 Unit/s), no video input, native audio, 1080p',
  },
  {
    operation: 'kling_omni_1080p_voice',
    provider: 'kling',
    category: 'video_generation',
    model: KLING_OMNI_MODEL_ID,
    resolution: '1080p',
    audio: true,
    metric: 'per_second',
    usdPerUnit: 0.224,
    sourceUrl: KLING_PRICING_SOURCE_URL,
    notes: 'Kling 3.0 Omni 1080p with Voice Control / video-ref surcharge (~1.6 Units/s; publish Fal rate if routed via Fal)',
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
    notes: 'Kling 3.0 Omni 4K (3.0 Units/s), flat rate with or without audio',
  },
  {
    operation: 'gemini_still',
    provider: 'google_vertex',
    category: 'image_generation',
    model: GEMINI_STILL_MODEL_ID,
    resolution: null,
    audio: null,
    metric: 'per_image',
    usdPerUnit: 0.067,
    sourceUrl: OMNI_PRICING_SOURCE_URL,
    notes: 'Gemini 3.1 Flash Image 1K still / draft reference ($0.067/image, 1,120 tokens).',
  },
  {
    operation: 'gemini_flash_still_2k',
    provider: 'google_vertex',
    category: 'image_generation',
    model: GEMINI_STILL_MODEL_ID,
    resolution: null,
    audio: null,
    metric: 'per_image',
    usdPerUnit: 0.101,
    sourceUrl: OMNI_PRICING_SOURCE_URL,
    notes: 'Gemini 3.1 Flash Image 2K still ($0.101/image, 1,680 tokens).',
  },
  {
    operation: 'gemini_pro_still_2k',
    provider: 'google_vertex',
    category: 'image_generation',
    model: GEMINI_PRO_STILL_MODEL_ID,
    resolution: null,
    audio: null,
    metric: 'per_image',
    usdPerUnit: 0.134,
    sourceUrl: OMNI_PRICING_SOURCE_URL,
    notes: 'Gemini 3 Pro Image 1K/2K (designer tier) with reference conditioning ($0.134/image, 30 credit floor).',
  },
  {
    operation: 'gemini_pro_still_4k',
    provider: 'google_vertex',
    category: 'image_generation',
    model: GEMINI_PRO_STILL_MODEL_ID,
    resolution: null,
    audio: null,
    metric: 'per_image',
    usdPerUnit: 0.24,
    sourceUrl: OMNI_PRICING_SOURCE_URL,
    notes: 'Gemini 3 Pro Image 4K (director tier) with reference conditioning ($0.240/image, 50 credit floor).',
  },
  {
    operation: 'veo_lite_sfx',
    provider: 'google_vertex',
    category: 'audio_sfx',
    model: 'veo-3.1-lite-generate-001',
    resolution: '720p',
    audio: true,
    metric: 'per_clip',
    usdPerUnit: 0.4,
    sourceUrl: OMNI_PRICING_SOURCE_URL,
    notes: 'Veo 3.1 Lite 8s video-to-SFX extraction (~$0.05/s × 8s = $0.40/clip).',
  },
  {
    operation: 'lyria_music',
    provider: 'google_vertex',
    category: 'audio_music',
    model: 'lyria-3-pro-preview',
    resolution: null,
    audio: true,
    metric: 'per_track',
    usdPerUnit: 0.08,
    sourceUrl: OMNI_PRICING_SOURCE_URL,
    notes: 'Google Lyria 3 Pro music generation ($0.08/song; 25 credit floor).',
  },
  {
    operation: 'gemini_tts',
    provider: 'google_vertex',
    category: 'audio_tts',
    model: 'gemini-2.5-flash-tts',
    resolution: null,
    audio: true,
    metric: 'per_1k_chars',
    usdPerUnit: 0.02,
    sourceUrl: OMNI_PRICING_SOURCE_URL,
    notes: 'Google Gemini Flash / Cloud TTS (~$0.02 per 1,000 characters; 10 cr/1k floor).',
  },
  {
    operation: 'gemini_tts_designed',
    provider: 'google_vertex',
    category: 'audio_tts',
    model: 'gemini-2.5-pro-tts',
    resolution: null,
    audio: true,
    metric: 'per_1k_chars',
    usdPerUnit: 0.04,
    sourceUrl: OMNI_PRICING_SOURCE_URL,
    notes: 'Google Gemini Designed Voice TTS (~$0.04 per 1,000 characters; 20 cr/1k floor).',
  },
  {
    operation: 'elevenlabs_tts',
    provider: 'elevenlabs',
    category: 'audio_tts',
    model: 'eleven_multilingual_v2',
    resolution: null,
    audio: true,
    metric: 'per_1k_chars',
    usdPerUnit: 0.08,
    sourceUrl: ELEVENLABS_PRICING_SOURCE_URL,
    notes: 'ElevenLabs Multilingual v2/v3/v4 API ($0.08/1k chars list; 80 cr/1k floor for overage protection).',
  },
  {
    operation: 'elevenlabs_tts_turbo',
    provider: 'elevenlabs',
    category: 'audio_tts',
    model: 'eleven_turbo_v2_5',
    resolution: null,
    audio: true,
    metric: 'per_1k_chars',
    usdPerUnit: 0.04,
    sourceUrl: ELEVENLABS_PRICING_SOURCE_URL,
    notes: 'ElevenLabs Turbo / Flash API ($0.04/1k chars list).',
  },
  {
    operation: 'elevenlabs_sfx',
    provider: 'elevenlabs',
    category: 'audio_sfx',
    model: 'sound_generation_v1',
    resolution: null,
    audio: true,
    metric: 'per_clip',
    usdPerUnit: 0.12,
    sourceUrl: ELEVENLABS_PRICING_SOURCE_URL,
    notes: 'ElevenLabs Sound Effects API (~$0.12 per generation / 200 EL credits).',
  },
  {
    operation: 'elevenlabs_music',
    provider: 'elevenlabs',
    category: 'audio_music',
    model: 'music_v1',
    resolution: null,
    audio: true,
    metric: 'per_minute',
    usdPerUnit: 0.15,
    sourceUrl: ELEVENLABS_PRICING_SOURCE_URL,
    notes: 'ElevenLabs Text-to-Music API (~$0.15/minute / 900 EL credits/min).',
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
  model?: string
  source?: 'seed' | 'published'
}

/** Map keyed by rate-card `operation` (e.g. `omni_1080p`, `kling_omni_1080p_audio`, `gemini_still`). */
export type RateCardMap = Record<string, AppliedRate>

export interface LiveRateCardSnapshot {
  version: string
  updatedAt: string
  isLive: boolean
  defaultMarkup: number
  creditFaceUsd: number
  studioCashPerCreditUsd: number
  referenceImageAddonCredits: number
  rates: RateCardMap
  publishedCount: number
}

export function getSeededRateCardMap(): RateCardMap {
  const map: RateCardMap = {}
  for (const seed of SEEDED_PROVIDER_RATES) {
    map[seed.operation] = {
      usdPerUnit: seed.usdPerUnit,
      markup: DEFAULT_MARKUP,
      creditsPerUnitOverride: null,
      model: seed.model,
      source: 'seed',
    }
  }
  return map
}

export function getSeededRateCardSnapshot(): LiveRateCardSnapshot {
  return {
    version: 'seed',
    updatedAt: new Date(0).toISOString(),
    isLive: false,
    defaultMarkup: DEFAULT_MARKUP,
    creditFaceUsd: CREDIT_FACE_USD,
    studioCashPerCreditUsd: STUDIO_CASH_PER_CREDIT_USD,
    referenceImageAddonCredits: REFERENCE_IMAGE_ADDON_CREDITS,
    rates: getSeededRateCardMap(),
    publishedCount: 0,
  }
}

export interface QuoteGenerationInput {
  kind: QuoteKind
  provider?: QuoteProvider
  model?: string
  resolution?: string | null
  durationSeconds?: number
  audio?: boolean
  voiceControl?: boolean
  imageCount?: number
  units?: number
  referenceImageCount?: number
  userKeyUsed?: boolean
  /** Keep stills and references near the existing catalog price. */
  floorCredits?: number
  /** Explicit single-operation rate override (from DB lookup). */
  rate?: AppliedRate
  /** Optional full live RateCardMap (from `useLiveRateCard()` or server snapshot). */
  rateCard?: RateCardMap
  /** Direct operation key override (e.g., `veo_lite_sfx`, `lyria_music`, `gemini_tts`). */
  operationOverride?: string
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

export function operationForImage(args: {
  model?: string | null
  resolution?: string | null
}): string {
  const model = (args.model || '').toLowerCase()
  const rawRes = (args.resolution || '').toLowerCase().replace(/\s+/g, '')
  if (model.includes('pro') || model.includes('designer') || model.includes('director')) {
    if (rawRes === '4k' || rawRes === '2160p' || rawRes === 'uhd' || model.includes('director')) {
      return 'gemini_pro_still_4k'
    }
    return 'gemini_pro_still_2k'
  }
  if (rawRes === '2k' || rawRes === '1440p' || rawRes === 'qhd') {
    return 'gemini_flash_still_2k'
  }
  return 'gemini_still'
}

export function operationForVideo(args: {
  provider?: QuoteProvider
  model?: string | null
  resolution?: string | null
  audio?: boolean
  voiceControl?: boolean
}): { operation: string; resolution: VideoResolution; audio: boolean | null } {
  const resolution = normalizeResolution(args.resolution)
  if (args.provider === 'kling') {
    if (resolution === '4k') {
      return { operation: 'kling_omni_4k', resolution, audio: null }
    }
    if (args.voiceControl && resolution === '1080p') {
      return { operation: 'kling_omni_1080p_voice', resolution, audio: true }
    }
    const audio = args.audio !== false
    const operation = `kling_omni_${resolution}_${audio ? 'audio' : 'silent'}`
    return { operation, resolution, audio }
  }
  const model = (args.model || '').toLowerCase()
  if (model.includes('veo')) {
    const audio = args.audio !== false
    if (model.includes('fast') || model.includes('lite')) {
      return { operation: 'veo_fast', resolution, audio }
    }
    if (resolution === '4k') {
      return { operation: 'veo_premium_4k', resolution, audio }
    }
    return { operation: 'veo_premium', resolution, audio }
  }
  return { operation: `omni_${resolution}`, resolution, audio: true }
}

export function quoteGenerationCredits(input: QuoteGenerationInput): GenerationQuote {
  const provider: QuoteProvider =
    input.provider === 'kling'
      ? 'kling'
      : input.provider === 'elevenlabs'
        ? 'elevenlabs'
        : 'google_vertex'
  const imageLike = input.kind === 'reference' || input.kind === 'still'
  const hasExplicitOp = Boolean(input.operationOverride)
  const video =
    imageLike || hasExplicitOp
      ? null
      : operationForVideo({
          provider,
          model: input.model,
          resolution: input.resolution,
          audio: input.audio,
          voiceControl: input.voiceControl,
        })
  const operation = hasExplicitOp
    ? input.operationOverride!
    : imageLike
      ? operationForImage({ model: input.model, resolution: input.resolution })
      : video!.operation
  const seed = getSeededRate(operation) ?? getSeededRate('gemini_still')!
  const appliedRate = input.rate ?? input.rateCard?.[operation]
  const usdPerUnit = appliedRate?.usdPerUnit ?? seed.usdPerUnit
  const markup = appliedRate?.markup ?? DEFAULT_MARKUP
  const units = hasExplicitOp
    ? Math.max(0.001, input.units ?? 1)
    : imageLike
      ? Math.max(1, input.imageCount ?? 1)
      : Math.max(1, input.durationSeconds ?? 10)
  const providerUsd = usdPerUnit * units
  let standardCredits = creditsForProviderUsd(
    providerUsd,
    markup,
    appliedRate?.creditsPerUnitOverride,
    units
  )
  if (input.floorCredits && input.floorCredits > 0) {
    standardCredits = Math.max(standardCredits, Math.ceil(input.floorCredits))
  }
  const referenceImageCount =
    imageLike || hasExplicitOp ? 0 : Math.max(0, input.referenceImageCount ?? 0)
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
    model: input.model || appliedRate?.model || seed.model,
    resolution: video ? video.resolution : seed.resolution,
    audio: video ? video.audio : seed.audio,
    metric: seed.metric,
    durationSeconds: video ? units : 0,
    units,
    usdPerUnit,
    providerUsd,
    markup,
    standardCredits,
    credits,
    byok,
    cogsUsd,
    source:
      input.rate || appliedRate?.source === 'published' ? 'rate_card' : 'seed',
    faceMarginPercent: margins.faceMarginPercent,
    studioMarginPercent: margins.studioMarginPercent,
  }
}

/**
 * Convenience helper for calculators & audio/SFX/music estimators to quote
 * any operation by key against a live `RateCardMap`.
 */
export function quoteOperationFromRateCard(args: {
  operation: string
  units?: number
  rateCard?: RateCardMap
  floorCredits?: number
  userKeyUsed?: boolean
  kind?: QuoteKind
}): GenerationQuote {
  const seed = getSeededRate(args.operation)
  const inferredKind: QuoteKind =
    args.kind ??
    (seed?.category === 'image_generation'
      ? 'still'
      : seed?.category === 'video_generation'
        ? 'clip'
        : 'audio')
  return quoteGenerationCredits({
    kind: inferredKind,
    provider: seed?.provider,
    operationOverride: args.operation,
    units: args.units ?? 1,
    rateCard: args.rateCard,
    floorCredits: args.floorCredits,
    userKeyUsed: args.userKeyUsed,
  })
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
