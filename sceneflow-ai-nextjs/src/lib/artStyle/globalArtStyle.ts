import { artStylePresets, type ArtStylePreset } from '@/constants/artStylePresets'

export type ArtStyleMedium =
  | 'live-action'
  | '3d-animation'
  | '2d-animation'
  | 'painterly'
  | 'graphic-illustration'
  | 'mixed-media'

export interface ArtStyleSpec {
  /** Concise human-facing title, e.g. "Hand-Painted Gouache Storybook" or "Anamorphic 35mm Neo-Noir" */
  title: string
  /** Broad rendering medium — controls camera vs illustration framing and negative style guardrails */
  medium: ArtStyleMedium
  /** Optional preset ID when backed by or seeded from a preset, or 'custom' */
  presetId?: string
  /** Why this visual art style fits the storyline, tone, and audience */
  rationale?: string
  /** Optional raw user typed or voice-dictated art direction */
  userDirection?: string
  /** Canonical master style prompt injected into Lookbook, Stills, and LLM scene/treatment prompts */
  stylePrompt: string
  /** Tailored rendering directive for Character Continuity References (headshots & wardrobe plates) */
  characterRefDirective: string
  /** Tailored rendering directive for Location / Set Continuity References */
  locationRefDirective: string
  /** Tailored rendering directive for Key Prop / Object Continuity References */
  propRefDirective: string
  /** Tailored motion & temporal aesthetic directive for Video Clips (free of static-still freeze words) */
  videoMotionDirective: string
  /** Color palette, lighting grammar, and surface texture notes */
  paletteAndLighting?: string
  /** Explicit negative terms preventing medium drift */
  negativeTerms: string[]
  /** True once explicitly confirmed/locked by the creator */
  confirmed?: boolean
  confirmedAt?: string
  /** Origin stage where the style was established */
  source?: 'series' | 'blueprint' | 'production' | 'ai-recommended' | 'preset'
  /** Set when inherited from or locked at a Series level */
  lockedBySeriesId?: string
  lockedBySeriesTitle?: string
}

export interface ArtStyleStoryContext {
  title?: string
  storyline?: string
  logline?: string
  genre?: string | string[]
  tone?: string
  targetAudience?: string
  format?: string
  aspectRatio?: string
  isSeries?: boolean
  episodeCount?: number
}

export const DEFAULT_GLOBAL_ART_STYLE_ID = 'photorealistic'

const PRESET_MEDIUM_MAP: Record<string, ArtStyleMedium> = {
  photorealistic: 'live-action',
  'cinematic-3d': '3d-animation',
  pixar: '3d-animation',
  'anime-90s': '2d-animation',
  ghibli: '2d-animation',
  'comic-book': 'graphic-illustration',
  'concept-art': 'painterly',
  'flat-vector': 'graphic-illustration',
  storyboard: 'graphic-illustration',
  'digital-art': 'graphic-illustration',
  watercolor: 'painterly',
  sketch: 'graphic-illustration',
  'oil-painting': 'painterly',
}

const LEGACY_STYLE_ALIAS_MAP: Record<string, string> = {
  cinematic: 'photorealistic',
  documentary: 'photorealistic',
  realistic: 'photorealistic',
  'hyper-realistic': 'photorealistic',
  'live-action': 'photorealistic',
  'live action': 'photorealistic',
  animation: 'pixar',
  animated: 'pixar',
}

export const LIVE_ACTION_NEGATIVE_TERMS = [
  'anime',
  'cartoon',
  'illustration',
  'painting',
  'sketch',
  'cel shading',
  '3D render',
  'CGI',
]

export const STYLIZED_ANTI_PHOTOREAL_NEGATIVE_TERMS: Record<
  Exclude<ArtStyleMedium, 'live-action'>,
  string[]
> = {
  '3d-animation': [
    'photorealistic live-action photography',
    'real human DSLR photograph',
    'raw camera skin pores',
    '2D flat line art',
    'mixed media style drift',
  ],
  '2d-animation': [
    'photorealistic live-action photography',
    'real human photograph',
    'hyperrealistic skin pores',
    '3D CGI plastic render',
    'uncanny valley realism',
    'mixed media style drift',
  ],
  painterly: [
    'photorealistic live-action photography',
    'crisp digital DSLR snapshot',
    'hyperrealistic skin pores',
    'glossy 3D CGI plastic',
    'mixed media style drift',
  ],
  'graphic-illustration': [
    'photorealistic live-action photography',
    'real human DSLR photograph',
    'hyperrealistic skin pores',
    'glossy 3D CGI render',
    'mixed media style drift',
  ],
  'mixed-media': [
    'generic unstyled snapshot',
    'inconsistent visual medium',
    'unintended raw DSLR selfie',
  ],
}

function cleanText(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.trim().replace(/\s+/g, ' ')
}

export function findArtStylePreset(idOrName?: string | null): ArtStylePreset | undefined {
  const raw = cleanText(idOrName)
  if (!raw) return undefined
  const lower = raw.toLowerCase()
  const direct = artStylePresets.find(
    (p) => p.id.toLowerCase() === lower || p.name.toLowerCase() === lower
  )
  if (direct) return direct
  const mappedId = LEGACY_STYLE_ALIAS_MAP[lower]
  if (mappedId) {
    return artStylePresets.find((p) => p.id === mappedId)
  }
  return undefined
}

export function inferArtStyleMedium(input?: string | ArtStyleSpec | null): ArtStyleMedium {
  if (!input) return 'live-action'
  if (typeof input === 'object') {
    if (input.medium) return input.medium
    return inferArtStyleMedium(input.presetId || input.stylePrompt || input.title)
  }
  const trimmed = cleanText(input)
  if (!trimmed) return 'live-action'

  const preset = findArtStylePreset(trimmed)
  if (preset && PRESET_MEDIUM_MAP[preset.id]) {
    return PRESET_MEDIUM_MAP[preset.id]
  }

  const lower = trimmed.toLowerCase()
  if (
    /\b(anime|manga|cel[- ]?shad|ghibli|2d animat|hand[- ]?drawn animat|saturday morning cartoon|donghua|manhwa)\b/.test(
      lower
    )
  ) {
    return '2d-animation'
  }
  if (
    /\b(pixar|3d animat|cgi|unreal engine|blender|claymation|stop[- ]?motion|miniature puppet|stylized 3d|octane render)\b/.test(
      lower
    )
  ) {
    return '3d-animation'
  }
  if (
    /\b(watercolor|gouache|oil paint|acrylic|impasto|impressionis|pastel|ink wash|sumi-e|painterly|matte painting)\b/.test(
      lower
    )
  ) {
    return 'painterly'
  }
  if (
    /\b(comic|graphic novel|halftone|flat vector|motion graphic|storyboard|animatic|sketch|charcoal|line art|woodcut|linocut|pop art|illustration|cel|vector)\b/.test(
      lower
    )
  ) {
    return 'graphic-illustration'
  }
  if (/\b(mixed[- ]media|collage|spider-verse|cutout|hybrid 2d\/3d)\b/.test(lower)) {
    return 'mixed-media'
  }
  return 'live-action'
}

export function isPhotorealisticArtStyle(input?: string | ArtStyleSpec | null): boolean {
  return inferArtStyleMedium(input) === 'live-action'
}

function toVideoSafeMotionPrompt(stylePrompt: string, medium: ArtStyleMedium): string {
  const stripped = stylePrompt
    .replace(/\bcinematic film still\b/gi, 'cinematic motion')
    .replace(/\bfilm still\b/gi, 'cinematic footage')
    .replace(/\bstill frame\b/gi, 'moving shot')
    .split(',')
    .map((p) => p.trim())
    .filter((p) => {
      const t = p.toLowerCase()
      return Boolean(t) && t !== '8k' && t !== 'sharp focus' && t !== 'photograph'
    })
    .join(', ')

  if (medium === 'live-action') {
    return stripped || 'photorealistic live-action cinematography, natural film grain, coherent motion'
  }
  if (medium === '2d-animation') {
    return `${stripped}, fluid 2D animated motion, consistent linework and cel shading across frames`
  }
  if (medium === '3d-animation') {
    return `${stripped}, expressive 3D animated performance, physically coherent lighting and motion`
  }
  if (medium === 'painterly') {
    return `${stripped}, living painted motion, coherent brushwork texture across frames`
  }
  if (medium === 'graphic-illustration') {
    return `${stripped}, stylized illustrated motion, consistent ink lines and graphic shading across frames`
  }
  return `${stripped}, cohesive stylized motion`
}

export function buildContinuityDirectivesForMedium(
  title: string,
  stylePrompt: string,
  medium: ArtStyleMedium
): Pick<
  ArtStyleSpec,
  | 'characterRefDirective'
  | 'locationRefDirective'
  | 'propRefDirective'
  | 'videoMotionDirective'
  | 'negativeTerms'
> {
  if (medium === 'live-action') {
    const customClause =
      stylePrompt &&
      stylePrompt !== artStylePresets[0]?.promptSuffix
        ? ` Aesthetic grade & lens character: ${stylePrompt}.`
        : ''
    return {
      characterRefDirective: `Photorealistic live-action casting portrait with natural human skin texture, authentic hair detail, and neutral studio key light.${customClause}`,
      locationRefDirective: `Photorealistic live-action architectural location scout plate, wide establishing view, authentic physical materials, empty set with no people.${customClause}`,
      propRefDirective: `Photorealistic live-action hero prop reference plate, authentic physical material wear and studio/practical lighting, isolated object.${customClause}`,
      videoMotionDirective: toVideoSafeMotionPrompt(stylePrompt, medium),
      negativeTerms: [...LIVE_ACTION_NEGATIVE_TERMS],
    }
  }

  return {
    characterRefDirective: `Render character strictly in ${title} (${stylePrompt}). Maintain crisp character silhouette, consistent facial feature design, expressive medium-authentic shading, neutral plain backdrop, NO live-action human photography or photorealistic skin pores.`,
    locationRefDirective: `Render environment strictly in ${title} (${stylePrompt}). Single unified wide establishing background plate with cohesive perspective, palette, and medium-authentic surface brushwork/linework; empty set with NO characters and NO live-action photography.`,
    propRefDirective: `Render hero prop strictly in ${title} (${stylePrompt}). Clean isolated object reference with consistent line weight, shading, and material stylization matching the world aesthetic; NO live-action product photography.`,
    videoMotionDirective: toVideoSafeMotionPrompt(stylePrompt, medium),
    negativeTerms: [...STYLIZED_ANTI_PHOTOREAL_NEGATIVE_TERMS[medium]],
  }
}

export function buildArtStyleSpecFromPreset(
  presetId: string,
  overrides?: Partial<ArtStyleSpec>
): ArtStyleSpec {
  const preset = findArtStylePreset(presetId) ?? artStylePresets[0]
  const medium = overrides?.medium ?? PRESET_MEDIUM_MAP[preset.id] ?? 'live-action'
  const title = cleanText(overrides?.title) || preset.name
  const stylePrompt = cleanText(overrides?.stylePrompt) || preset.promptSuffix
  const directives = buildContinuityDirectivesForMedium(title, stylePrompt, medium)

  return {
    title,
    medium,
    presetId: preset.id,
    stylePrompt,
    characterRefDirective: overrides?.characterRefDirective || directives.characterRefDirective,
    locationRefDirective: overrides?.locationRefDirective || directives.locationRefDirective,
    propRefDirective: overrides?.propRefDirective || directives.propRefDirective,
    videoMotionDirective: overrides?.videoMotionDirective || directives.videoMotionDirective,
    negativeTerms:
      Array.isArray(overrides?.negativeTerms) && overrides.negativeTerms.length > 0
        ? overrides.negativeTerms
        : directives.negativeTerms,
    rationale: overrides?.rationale,
    userDirection: overrides?.userDirection,
    paletteAndLighting: overrides?.paletteAndLighting,
    confirmed: overrides?.confirmed,
    confirmedAt: overrides?.confirmedAt,
    source: overrides?.source ?? 'preset',
    lockedBySeriesId: overrides?.lockedBySeriesId,
    lockedBySeriesTitle: overrides?.lockedBySeriesTitle,
  }
}

export function isArtStyleSpecLike(value: unknown): value is Partial<ArtStyleSpec> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const rec = value as Record<string, unknown>
  return typeof rec.stylePrompt === 'string' || typeof rec.title === 'string'
}

export function normalizeArtStyleSpec(
  raw: Partial<ArtStyleSpec> | null | undefined,
  fallbackStyle?: string | null
): ArtStyleSpec {
  if (!raw || typeof raw !== 'object') {
    return buildArtStyleSpecFromValue(fallbackStyle)
  }
  const presetMatch = findArtStylePreset(raw.presetId || raw.title || fallbackStyle || undefined)
  const rawPrompt = cleanText(raw.stylePrompt) || cleanText(fallbackStyle)
  if (presetMatch && (!rawPrompt || rawPrompt === presetMatch.promptSuffix || rawPrompt === presetMatch.id)) {
    return buildArtStyleSpecFromPreset(presetMatch.id, raw)
  }

  const stylePrompt =
    rawPrompt || presetMatch?.promptSuffix || artStylePresets[0]?.promptSuffix || 'photorealistic cinematic'
  const medium =
    raw.medium &&
    ['live-action', '3d-animation', '2d-animation', 'painterly', 'graphic-illustration', 'mixed-media'].includes(
      raw.medium
    )
      ? raw.medium
      : inferArtStyleMedium(stylePrompt)
  const title =
    cleanText(raw.title) ||
    presetMatch?.name ||
    (stylePrompt.length <= 48 ? stylePrompt : `${stylePrompt.slice(0, 45).trimEnd()}…`)
  const directives = buildContinuityDirectivesForMedium(title, stylePrompt, medium)

  return {
    title,
    medium,
    presetId: raw.presetId || presetMatch?.id || 'custom',
    rationale: cleanText(raw.rationale) || undefined,
    userDirection: cleanText(raw.userDirection) || undefined,
    stylePrompt,
    characterRefDirective: cleanText(raw.characterRefDirective) || directives.characterRefDirective,
    locationRefDirective: cleanText(raw.locationRefDirective) || directives.locationRefDirective,
    propRefDirective: cleanText(raw.propRefDirective) || directives.propRefDirective,
    videoMotionDirective: cleanText(raw.videoMotionDirective) || directives.videoMotionDirective,
    paletteAndLighting: cleanText(raw.paletteAndLighting) || undefined,
    negativeTerms:
      Array.isArray(raw.negativeTerms) && raw.negativeTerms.filter(Boolean).length > 0
        ? raw.negativeTerms.map((t) => cleanText(t)).filter(Boolean)
        : directives.negativeTerms,
    confirmed: Boolean(raw.confirmed),
    confirmedAt: cleanText(raw.confirmedAt) || undefined,
    source: raw.source || 'ai-recommended',
    lockedBySeriesId: cleanText(raw.lockedBySeriesId) || undefined,
    lockedBySeriesTitle: cleanText(raw.lockedBySeriesTitle) || undefined,
  }
}

export function buildArtStyleSpecFromValue(
  value?: string | ArtStyleSpec | null,
  specOverride?: Partial<ArtStyleSpec> | null
): ArtStyleSpec {
  if (specOverride && isArtStyleSpecLike(specOverride)) {
    return normalizeArtStyleSpec(
      specOverride,
      typeof value === 'string' ? value : value?.stylePrompt
    )
  }
  if (value && typeof value === 'object') {
    return normalizeArtStyleSpec(value)
  }
  const trimmed = cleanText(value)
  if (!trimmed) {
    return buildArtStyleSpecFromPreset(DEFAULT_GLOBAL_ART_STYLE_ID)
  }
  const preset = findArtStylePreset(trimmed)
  if (preset) {
    return buildArtStyleSpecFromPreset(preset.id)
  }
  const medium = inferArtStyleMedium(trimmed)
  // Derive a clean short title if string is "Title — prompt" or "Title: prompt" (allowing hyphens inside title)
  const sepMatch = trimmed.match(/^([^:—–]{3,56}?)\s*(?:—|–|:)\s+(.+)$/)
  const title = sepMatch
    ? sepMatch[1].trim()
    : trimmed.length <= 44
      ? trimmed
      : `${trimmed.slice(0, 41).trimEnd()}…`
  const stylePrompt = sepMatch ? sepMatch[2].trim() : trimmed
  const directives = buildContinuityDirectivesForMedium(title, stylePrompt, medium)

  return {
    title,
    medium,
    presetId: 'custom',
    stylePrompt,
    ...directives,
    source: 'ai-recommended',
  }
}

/**
 * Serialize an ArtStyleSpec into the compact `artStyle` string stored alongside `artStyleSpec`.
 * - Unmodified presets serialize to their canonical preset ID (e.g. `'ghibli'`, `'photorealistic'`)
 *   for 100% compatibility with legacy code and tests.
 * - Custom / AI-optimized styles serialize to their descriptive prompt string so every
 *   string-based prompt consumer automatically receives the full visual directive!
 */
export function serializeArtStyleValue(spec: ArtStyleSpec): string {
  const preset = spec.presetId && spec.presetId !== 'custom' ? findArtStylePreset(spec.presetId) : undefined
  if (preset && cleanText(spec.stylePrompt) === cleanText(preset.promptSuffix)) {
    return preset.id
  }
  const title = cleanText(spec.title)
  const prompt = cleanText(spec.stylePrompt)
  if (!prompt) return preset?.id || DEFAULT_GLOBAL_ART_STYLE_ID
  if (title && !prompt.toLowerCase().includes(title.toLowerCase())) {
    return `${title}: ${prompt}`
  }
  return prompt
}

function nonDefaultStyleString(value: unknown): string | undefined {
  const s = cleanText(value)
  if (!s) return undefined
  return s
}

/**
 * Authoritative Project Art Style Spec resolver across Series Lock, Production (`visionPhase`),
 * top-level `metadata`, and Blueprint (`filmTreatmentVariant`).
 *
 * Fixes the split-brain precedence bug where `metadata.filmTreatmentVariant` defaulted to
 * `'photorealistic'` and shadowed `visionPhase.artStyle`, `metadata.artStyle`, and Series locks.
 */
export function resolveProjectArtStyleSpec(metadata: unknown): ArtStyleSpec {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return buildArtStyleSpecFromPreset(DEFAULT_GLOBAL_ART_STYLE_ID)
  }
  const meta = metadata as Record<string, unknown>
  const seriesId = cleanText(meta.seriesId)
  const seriesBibleRef =
    meta.seriesBibleRef && typeof meta.seriesBibleRef === 'object'
      ? (meta.seriesBibleRef as Record<string, unknown>)
      : undefined
  const seriesAesthetic =
    seriesBibleRef?.aesthetic && typeof seriesBibleRef.aesthetic === 'object'
      ? (seriesBibleRef.aesthetic as Record<string, unknown>)
      : undefined
  const blueprintPrime =
    meta.blueprintPrime && typeof meta.blueprintPrime === 'object'
      ? (meta.blueprintPrime as Record<string, unknown>)
      : undefined
  const visionPhase =
    meta.visionPhase && typeof meta.visionPhase === 'object'
      ? (meta.visionPhase as Record<string, unknown>)
      : undefined
  const variant =
    meta.filmTreatmentVariant && typeof meta.filmTreatmentVariant === 'object'
      ? (meta.filmTreatmentVariant as Record<string, unknown>)
      : undefined

  // 1. Series Consistency Lock Rule: if linked to a Series and Series aesthetic defines an art style,
  //    enforce the Series Art Style across every episode!
  if (seriesId) {
    const seriesSpecRaw =
      (isArtStyleSpecLike(seriesAesthetic?.artStyleSpec) && seriesAesthetic?.artStyleSpec) ||
      (isArtStyleSpecLike(blueprintPrime?.seriesArtStyleSpec) && blueprintPrime?.seriesArtStyleSpec) ||
      undefined
    const seriesStyleStr =
      nonDefaultStyleString(seriesAesthetic?.artStyle) ||
      nonDefaultStyleString(blueprintPrime?.seriesArtStyle) ||
      nonDefaultStyleString(seriesAesthetic?.visualStyle)
    if (seriesSpecRaw || seriesStyleStr) {
      const resolved = buildArtStyleSpecFromValue(
        seriesStyleStr,
        seriesSpecRaw as Partial<ArtStyleSpec> | undefined
      )
      return {
        ...resolved,
        confirmed: true,
        source: 'series',
        lockedBySeriesId: seriesId,
        lockedBySeriesTitle:
          cleanText(seriesBibleRef?.seriesTitle) ||
          cleanText(meta.seriesTitle) ||
          resolved.lockedBySeriesTitle,
      }
    }
  }

  // 2. Explicit structured ArtStyleSpec on metadata, visionPhase, or filmTreatmentVariant
  const explicitSpec =
    (isArtStyleSpecLike(meta.artStyleSpec) && meta.artStyleSpec) ||
    (isArtStyleSpecLike(visionPhase?.artStyleSpec) && visionPhase?.artStyleSpec) ||
    (isArtStyleSpecLike(variant?.artStyleSpec) && variant?.artStyleSpec) ||
    undefined

  // 3. Explicit artStyle string on variant, visionPhase, or top-level metadata.
  //    Prefer non-default explicit strings over an untouched 'photorealistic' fallback on another slice!
  const candidates = [
    nonDefaultStyleString(meta.artStyle),
    nonDefaultStyleString(visionPhase?.artStyle),
    nonDefaultStyleString(variant?.artStyle),
  ].filter((v): v is string => Boolean(v))

  const nonDefaultCandidate = candidates.find((c) => c !== DEFAULT_GLOBAL_ART_STYLE_ID)
  const chosenString = nonDefaultCandidate ?? candidates[0]

  if (explicitSpec) {
    return normalizeArtStyleSpec(explicitSpec, chosenString)
  }
  if (chosenString) {
    return buildArtStyleSpecFromValue(chosenString)
  }

  // 4. Legacy Blueprint `visual_style` / `style` fallback (only when artStyle wasn't set)
  const legacyVisualStyle =
    nonDefaultStyleString(variant?.visual_style) || nonDefaultStyleString(variant?.style)
  if (legacyVisualStyle) {
    const preset = findArtStylePreset(legacyVisualStyle)
    if (preset) return buildArtStyleSpecFromPreset(preset.id)
    return buildArtStyleSpecFromValue(legacyVisualStyle)
  }

  return buildArtStyleSpecFromPreset(DEFAULT_GLOBAL_ART_STYLE_ID)
}

export function resolveSeriesArtStyleSpec(source: {
  id?: string
  title?: string
  seriesId?: string
  seriesTitle?: string
  artStyle?: unknown
  artStyleSpec?: unknown
  metadata?: Record<string, unknown> | null
  productionBible?: {
    aesthetic?: {
      artStyle?: unknown
      artStyleSpec?: unknown
      visualStyle?: unknown
    }
  } | null
  production_bible?: {
    aesthetic?: {
      artStyle?: unknown
      artStyleSpec?: unknown
      visualStyle?: unknown
    }
  } | null
}): ArtStyleSpec {
  const meta =
    source.metadata && typeof source.metadata === 'object' && !Array.isArray(source.metadata)
      ? source.metadata
      : {}
  const visionPhase =
    meta.visionPhase && typeof meta.visionPhase === 'object' && !Array.isArray(meta.visionPhase)
      ? (meta.visionPhase as Record<string, unknown>)
      : {}
  const aesthetic = source.productionBible?.aesthetic ?? source.production_bible?.aesthetic
  const specCandidate =
    (isArtStyleSpecLike(source.artStyleSpec) && source.artStyleSpec) ||
    (isArtStyleSpecLike(aesthetic?.artStyleSpec) && aesthetic?.artStyleSpec) ||
    (isArtStyleSpecLike(meta.artStyleSpec) && meta.artStyleSpec) ||
    (isArtStyleSpecLike(visionPhase.artStyleSpec) && visionPhase.artStyleSpec) ||
    undefined

  const explicitTop = nonDefaultStyleString(source.artStyle)
  const stringCandidates = [
    explicitTop,
    nonDefaultStyleString(aesthetic?.artStyle),
    nonDefaultStyleString(meta.artStyle),
    nonDefaultStyleString(visionPhase.artStyle),
    nonDefaultStyleString(aesthetic?.visualStyle),
  ].filter((v): v is string => Boolean(v))

  const chosen =
    explicitTop ??
    stringCandidates.find((c) => c !== DEFAULT_GLOBAL_ART_STYLE_ID) ??
    stringCandidates[0]

  const spec = specCandidate
    ? normalizeArtStyleSpec(specCandidate, chosen)
    : buildArtStyleSpecFromValue(chosen)

  return {
    ...spec,
    source: 'series',
    lockedBySeriesId: source.seriesId || source.id || spec.lockedBySeriesId,
    lockedBySeriesTitle: source.seriesTitle || source.title || spec.lockedBySeriesTitle,
  }
}

/**
 * Atomically stamp a confirmed Global Art Style across all Project metadata slices
 * (`metadata.artStyle`, `metadata.artStyleSpec`, `metadata.visionPhase`, `metadata.filmTreatmentVariant`)
 * and clear any cached `visionPhase.lookbook` if the art style changed.
 */
export function applyArtStyleToProjectMetadata(
  existingMetadata: Record<string, unknown> | null | undefined,
  inputSpec: ArtStyleSpec | string,
  specOverride?: Partial<ArtStyleSpec> | null
): Record<string, unknown> {
  const base = existingMetadata && typeof existingMetadata === 'object' ? { ...existingMetadata } : {}
  const prevStyle = serializeArtStyleValue(resolveProjectArtStyleSpec(base))
  const spec = specOverride
    ? buildArtStyleSpecFromValue(inputSpec, specOverride)
    : typeof inputSpec === 'string'
      ? buildArtStyleSpecFromValue(inputSpec)
      : normalizeArtStyleSpec(inputSpec)
  const serialized =
    typeof inputSpec === 'string' && inputSpec.trim() && specOverride
      ? inputSpec.trim()
      : serializeArtStyleValue(spec)
  const styleChanged = prevStyle !== serialized

  const nextVisionPhase =
    base.visionPhase && typeof base.visionPhase === 'object'
      ? { ...(base.visionPhase as Record<string, unknown>) }
      : {}
  nextVisionPhase.artStyle = serialized
  nextVisionPhase.artStyleSpec = spec
  if (styleChanged && 'lookbook' in nextVisionPhase) {
    nextVisionPhase.lookbook = null
  }

  const nextMeta: Record<string, unknown> = {
    ...base,
    artStyle: serialized,
    artStyleSpec: spec,
    visionPhase: nextVisionPhase,
  }

  if (base.filmTreatmentVariant && typeof base.filmTreatmentVariant === 'object') {
    const existingVariant = base.filmTreatmentVariant as Record<string, unknown>
    nextMeta.filmTreatmentVariant = {
      ...existingVariant,
      artStyle: serialized,
      art_style: serialized,
      artStyleSpec: spec,
      art_style_spec: spec,
      visual_style: spec.stylePrompt || existingVariant.visual_style || spec.title,
    }
  }

  return nextMeta
}

/**
 * Deterministic storyline-aware recommender (used as instant fallback when Gemini is unavailable).
 */
export function recommendArtStyleFallback(context: ArtStyleStoryContext): {
  recommended: ArtStyleSpec
  alternatives: ArtStyleSpec[]
} {
  const corpus = [
    context.title,
    context.storyline,
    context.logline,
    Array.isArray(context.genre) ? context.genre.join(' ') : context.genre,
    context.tone,
    context.targetAudience,
    context.format,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  let primary: ArtStyleSpec
  if (/\b(fable|folklore|fairy|whimsical|magical|myth|enchanted|spirit|ghibli)\b/.test(corpus)) {
    primary = normalizeArtStyleSpec({
      title: 'Hand-Painted Gouache & Cel Animation',
      medium: '2d-animation',
      presetId: 'ghibli',
      rationale:
        'Hand-painted gouache backgrounds paired with warm cel-shaded character animation amplify mythic wonder and emotional warmth across recurring locations and characters.',
      stylePrompt:
        'hand-painted Studio Ghibli-inspired 2D animation, lush gouache watercolor backgrounds, expressive warm cel-shaded characters, atmospheric natural light, organic hand-drawn linework',
      paletteAndLighting: 'Sun-dappled warm earth tones, soft atmospheric haze, luminous sky gradients',
      source: 'ai-recommended',
    })
  } else if (/\b(cyberpunk|mecha|shonen|isekai|neon tokyo|anime|katana|synth)\b/.test(corpus)) {
    primary = normalizeArtStyleSpec({
      title: 'High-Contrast Cel-Shaded Neo-Anime',
      medium: '2d-animation',
      presetId: 'anime-90s',
      rationale:
        'Crisp cel-shaded linework, dramatic rim lighting, and kinetic anime framing heighten stylized action and futuristic world-building.',
      stylePrompt:
        ' theatrical feature anime style, crisp hand-inked contours, multi-plane cel shading, dramatic neon rim lighting, atmospheric halation, rich shadow contrast',
      paletteAndLighting: 'Electric cyan and magenta accents against deep indigo shadow masses',
      source: 'ai-recommended',
    })
  } else if (/\b(kids|children|family adventure|talking animal|pixar|toy|playful)\b/.test(corpus)) {
    primary = normalizeArtStyleSpec({
      title: 'Tactile Stylized 3D Feature Animation',
      medium: '3d-animation',
      presetId: 'pixar',
      rationale:
        'Tactile stylized 3D character proportions and soft global illumination create immediate warmth, family appeal, and unmistakable character silhouettes across episodes.',
      stylePrompt:
        'stylized 3D animated feature film, tactile fabric and hair micro-textures, expressive character silhouettes, warm subsurface scattering, soft bounce global illumination',
      paletteAndLighting: 'Warm sunlit golds, saturated primaries, soft rim-lit volumetric depth',
      source: 'ai-recommended',
    })
  } else if (/\b(explainer|saas|startup|curriculum|corporate training|infographic|how-to)\b/.test(corpus)) {
    primary = normalizeArtStyleSpec({
      title: 'Editorial Geometric Motion Illustration',
      medium: 'graphic-illustration',
      presetId: 'flat-vector',
      rationale:
        'Clean geometric silhouettes and high-contrast editorial color blocking keep complex concepts visually clear and instantly readable.',
      stylePrompt:
        'modern editorial vector illustration, clean geometric forms, subtle paper grain texture, bold intentional color blocking, crisp minimal shading',
      paletteAndLighting: 'High-contrast editorial palette with clean directional graphic highlights',
      source: 'ai-recommended',
    })
  } else if (/\b(noir|detective|heist|thriller|crime|conspiracy|gritty|rain)\b/.test(corpus)) {
    primary = normalizeArtStyleSpec({
      title: 'Anamorphic 35mm Chiaroscuro Neo-Noir',
      medium: 'live-action',
      presetId: 'custom',
      rationale:
        'Anamorphic 35mm live-action cinematography with deep chiaroscuro contrast, tungsten practicals, and fine photochemical grain grounds suspense and moral tension.',
      stylePrompt:
        'photorealistic anamorphic 35mm live-action cinematography, chiaroscuro low-key lighting, warm tungsten practical lamps against cool rain-slicked shadows, subtle Kodak 5219 film grain, shallow depth of field',
      paletteAndLighting: 'Deep obsidian shadows, amber practical tungsten pools, cool steel-blue night fill',
      source: 'ai-recommended',
    })
  } else if (/\b(sci-fi|space|colony|orbital|dystopia|alien|starship)\b/.test(corpus)) {
    primary = normalizeArtStyleSpec({
      title: 'Large-Format Grounded Sci-Fi Cinematography',
      medium: 'live-action',
      presetId: 'custom',
      rationale:
        'Large-format live-action cinematography with tactile industrial surfaces and volumetric atmospheric light gives speculative worlds physical weight and believability.',
      stylePrompt:
        'photorealistic large-format 65mm live-action cinematography, tactile weathered industrial materials, volumetric atmospheric shafts of light, grounded naturalistic skin tones, crisp architectural scale',
      paletteAndLighting: 'Desaturated slate steel, cold atmospheric haze, warm amber instrument glow',
      source: 'ai-recommended',
    })
  } else {
    primary = normalizeArtStyleSpec({
      title: 'Naturalistic 35mm Cinema Live-Action',
      medium: 'live-action',
      presetId: 'photorealistic',
      rationale:
        'Naturalistic 35mm live-action cinematography with motivated lighting and authentic physical textures anchors human performance and visual continuity.',
      stylePrompt:
        'photorealistic 35mm live-action cinema, motivated natural and practical lighting, authentic skin and wardrobe textures, organic film grain, shallow cinematic depth of field',
      paletteAndLighting: 'Balanced cinematic color grade with motivated key-to-fill contrast',
      source: 'ai-recommended',
    })
  }

  const alt1 =
    primary.medium === 'live-action'
      ? buildArtStyleSpecFromPreset('concept-art', {
          title: 'Cinematic Painterly Concept Illustration',
          rationale:
            'Heightens world atmosphere and mythic scale through expressive brushwork while keeping dramatic cinematic lighting.',
          source: 'ai-recommended',
        })
      : buildArtStyleSpecFromPreset('photorealistic', {
          title: 'Grounded 35mm Live-Action Cinema',
          rationale:
            'Trades stylized rendering for intimate live-action human performance and physical location realism.',
          source: 'ai-recommended',
        })

  const alt2 =
    primary.medium === '3d-animation'
      ? buildArtStyleSpecFromPreset('comic-book', {
          title: 'Graphic Novel Ink & Halftone',
          rationale:
            'Bold hand-inked contours and graphic shadow shapes give every frame striking poster-like punch.',
          source: 'ai-recommended',
        })
      : buildArtStyleSpecFromPreset('cinematic-3d', {
          title: 'Stylized Feature 3D Animation',
          rationale:
            'Locks repeatable 3D character geometry, lighting, and set continuity across complex camera moves.',
          source: 'ai-recommended',
        })

  return {
    recommended: primary,
    alternatives: [alt1, alt2],
  }
}

/**
 * Deterministic user-direction optimizer (used when offline or if LLM fails).
 */
export function optimizeArtStyleDirectionFallback(
  userDirection: string,
  context?: ArtStyleStoryContext
): ArtStyleSpec {
  const cleaned = cleanText(userDirection)
  if (!cleaned) {
    return recommendArtStyleFallback(context ?? {}).recommended
  }
  const medium = inferArtStyleMedium(cleaned)
  const words = cleaned.split(/\s+/).slice(0, 5).join(' ')
  const title =
    cleaned.length <= 40
      ? cleaned.replace(/^\w/, (c) => c.toUpperCase())
      : `${words.replace(/^\w/, (c) => c.toUpperCase())}…`

  const mediumQualifier: Record<ArtStyleMedium, string> = {
    'live-action': 'photorealistic live-action cinematography',
    '3d-animation': 'cohesive 3D animated feature rendering',
    '2d-animation': 'cohesive 2D animated illustration with consistent linework and shading',
    painterly: 'cohesive painterly fine-art rendering with consistent brushwork',
    'graphic-illustration': 'cohesive graphic illustration with consistent ink and color language',
    'mixed-media': 'cohesive hybrid mixed-media visual treatment',
  }

  const stylePrompt = cleaned.toLowerCase().includes(medium.replace('-', ' '))
    ? cleaned
    : `${cleaned}, ${mediumQualifier[medium]}`

  const directives = buildContinuityDirectivesForMedium(title, stylePrompt, medium)
  return {
    title,
    medium,
    presetId: 'custom',
    userDirection: cleaned,
    rationale: context?.storyline
      ? `Custom creator-directed ${medium.replace('-', ' ')} visual language tailored to your storyline.`
      : `Optimized global ${medium.replace('-', ' ')} directive for consistent character, location, prop, still, and clip generation.`,
    stylePrompt,
    ...directives,
    source: 'ai-recommended',
  }
}
