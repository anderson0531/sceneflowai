/**
 * Audience description refine + validation helpers.
 *
 * Turns a free-text (speech or typing) audience description into a validated,
 * clarified description plus structured signals used by resonance analysis:
 *   - enhancedDescription: clarified / expanded intent
 *   - derivedProfile: backward-compatible AudienceTargetProfile (chip values)
 *   - culturalSignals: cultures / locales / languages / faith / etc.
 *
 * The parsing logic lives here (not in the route) so it can be unit tested
 * without hitting the model.
 */

import {
  AGE_RANGE_OPTIONS,
  COMMUNITY_OPTIONS,
  DEFAULT_TARGET_AUDIENCE,
  EDUCATION_OPTIONS,
  GENDER_OPTIONS,
  REGION_OPTIONS,
  normalizeCulturalSignals,
  type AudienceCulturalSignals,
  type AudienceTargetProfile,
  type TargetAgeRange,
  type TargetCommunity,
  type TargetEducationLevel,
  type TargetGender,
  type TargetRegion,
} from '@/lib/types/audienceResonance'

export interface AudienceRefineContext {
  title?: string
  genre?: string
  format?: string
  logline?: string
  contentIntent?: string
}

export interface AudienceValidationIssue {
  /** Machine code for the issue */
  code: 'too-short' | 'too-vague' | 'contradictory' | 'missing-specificity' | 'other'
  /** Human-readable explanation */
  message: string
}

export interface AudienceRefineResult {
  valid: boolean
  issues: AudienceValidationIssue[]
  enhancedDescription: string
  summary: string
  derivedProfile: AudienceTargetProfile
  culturalSignals?: AudienceCulturalSignals
}

const MIN_DESCRIPTION_LENGTH = 8
const MIN_WORD_COUNT = 2

const VAGUE_ONLY_PATTERNS = [
  /^(everyone|everybody|all people|general|general audience|anyone|people|humans?)\.?$/i,
]

/**
 * Fast, model-free validation run on entry. Catches obviously-insufficient
 * descriptions before spending credits on the AI refine step.
 */
export function validateAudienceDescription(description: string): {
  valid: boolean
  issues: AudienceValidationIssue[]
} {
  const trimmed = (description || '').trim()
  const issues: AudienceValidationIssue[] = []

  if (trimmed.length < MIN_DESCRIPTION_LENGTH) {
    issues.push({
      code: 'too-short',
      message:
        'Add more detail about who this content is for (e.g. culture, age, location, interests).',
    })
  }

  const wordCount = trimmed.split(/\s+/).filter(Boolean).length
  if (trimmed.length >= MIN_DESCRIPTION_LENGTH && wordCount < MIN_WORD_COUNT) {
    issues.push({
      code: 'too-short',
      message: 'Describe the audience in a short phrase rather than a single word.',
    })
  }

  if (VAGUE_ONLY_PATTERNS.some((re) => re.test(trimmed))) {
    issues.push({
      code: 'too-vague',
      message:
        'This is very broad. Naming a culture, age band, region, or interest yields a sharper resonance analysis.',
    })
  }

  return { valid: issues.length === 0, issues }
}

function coerceEnum<T extends string>(
  value: unknown,
  options: { value: T }[],
  fallback: T
): T {
  if (typeof value !== 'string') return fallback
  const normalized = value.trim().toLowerCase().replace(/\s+/g, '-')
  const match = options.find(
    (o) =>
      o.value.toLowerCase() === value.trim().toLowerCase() ||
      o.value.toLowerCase() === normalized
  )
  return match ? match.value : fallback
}

export function coerceDerivedProfile(raw: unknown): AudienceTargetProfile {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  return {
    region: coerceEnum<TargetRegion>(obj.region, REGION_OPTIONS, DEFAULT_TARGET_AUDIENCE.region),
    ageRange: coerceEnum<TargetAgeRange>(
      obj.ageRange,
      AGE_RANGE_OPTIONS,
      DEFAULT_TARGET_AUDIENCE.ageRange
    ),
    gender: coerceEnum<TargetGender>(obj.gender, GENDER_OPTIONS, DEFAULT_TARGET_AUDIENCE.gender),
    educationLevel: coerceEnum<TargetEducationLevel>(
      obj.educationLevel,
      EDUCATION_OPTIONS,
      DEFAULT_TARGET_AUDIENCE.educationLevel
    ),
    community: coerceEnum<TargetCommunity>(
      obj.community,
      COMMUNITY_OPTIONS,
      DEFAULT_TARGET_AUDIENCE.community
    ),
  }
}

function coerceIssues(raw: unknown): AudienceValidationIssue[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item): AudienceValidationIssue | null => {
      if (typeof item === 'string') {
        return { code: 'other', message: item }
      }
      if (item && typeof item === 'object') {
        const obj = item as Record<string, unknown>
        const message = typeof obj.message === 'string' ? obj.message : ''
        if (!message) return null
        const code = typeof obj.code === 'string' ? obj.code : 'other'
        const allowed = ['too-short', 'too-vague', 'contradictory', 'missing-specificity', 'other']
        return {
          code: (allowed.includes(code) ? code : 'other') as AudienceValidationIssue['code'],
          message,
        }
      }
      return null
    })
    .filter((v): v is AudienceValidationIssue => v !== null)
}

/**
 * Parse the model's JSON response into a normalized refine result. Falls back
 * gracefully to the original description if the model output is unusable.
 */
export function parseRefineResult(
  parsed: Record<string, unknown> | null | undefined,
  originalDescription: string
): AudienceRefineResult {
  const fallbackDescription = (originalDescription || '').trim()
  const obj = parsed && typeof parsed === 'object' ? parsed : {}

  const enhancedDescription =
    typeof obj.enhancedDescription === 'string' && obj.enhancedDescription.trim()
      ? obj.enhancedDescription.trim()
      : fallbackDescription

  const summary =
    typeof obj.summary === 'string' && obj.summary.trim() ? obj.summary.trim() : ''

  const issues = coerceIssues(obj.issues)
  const valid = typeof obj.valid === 'boolean' ? obj.valid : issues.length === 0

  return {
    valid,
    issues,
    enhancedDescription,
    summary,
    derivedProfile: coerceDerivedProfile(obj.derivedProfile),
    culturalSignals: normalizeCulturalSignals(
      obj.culturalSignals as Partial<AudienceCulturalSignals> | null
    ),
  }
}

export function buildRefinePrompt(
  description: string,
  context?: AudienceRefineContext
): string {
  const contextLines: string[] = []
  if (context?.title) contextLines.push(`Working title: ${context.title}`)
  if (context?.genre) contextLines.push(`Genre: ${context.genre}`)
  if (context?.format) contextLines.push(`Format: ${context.format}`)
  if (context?.logline) contextLines.push(`Logline: ${context.logline}`)
  if (context?.contentIntent) contextLines.push(`Content intent: ${context.contentIntent}`)
  const contextBlock = contextLines.length
    ? `\nPROJECT CONTEXT:\n${contextLines.join('\n')}\n`
    : ''

  const regionValues = REGION_OPTIONS.map((o) => o.value).join(' | ')
  const ageValues = AGE_RANGE_OPTIONS.map((o) => o.value).join(' | ')
  const genderValues = GENDER_OPTIONS.map((o) => o.value).join(' | ')
  const educationValues = EDUCATION_OPTIONS.map((o) => o.value).join(' | ')
  const communityValues = COMMUNITY_OPTIONS.map((o) => o.value).join(' | ')

  return `You are an audience strategist helping a creator define their TARGET AUDIENCE for a video/film project.

The creator described their audience in their own words (speech or typing). Your job:
1. VALIDATE the description. Flag if it is too short, too vague, self-contradictory, or missing the specificity needed for a meaningful resonance analysis.
2. CLARIFY and ENHANCE their intent into a concrete, specific audience description (2-4 sentences). Preserve every specific detail they gave (culture, age, location, faith, interests). Do NOT invent facts that contradict them; only make their intent sharper.
3. EXTRACT structured cultural signals so downstream analysis can validate concrete cultural resonance (e.g. a "Thai audience" should imply Thai names, the Thai language, Thai customs and Buddhist context).
4. DERIVE a coarse structured profile using ONLY the allowed enum values below (for backward-compatible scoring). Pick the closest match; use defaults if unknown.

RAW AUDIENCE DESCRIPTION:
"""
${(description || '').trim()}
"""
${contextBlock}
ALLOWED PROFILE ENUM VALUES:
- region: ${regionValues}
- ageRange: ${ageValues}
- gender: ${genderValues}
- educationLevel: ${educationValues}
- community: ${communityValues}

Return ONLY valid JSON (no markdown):
{
  "valid": <boolean: false if the description is too weak for good analysis>,
  "issues": [{"code": "too-short|too-vague|contradictory|missing-specificity|other", "message": "specific, actionable guidance"}],
  "enhancedDescription": "<clarified, specific 2-4 sentence audience description>",
  "summary": "<one-line summary of who this audience is>",
  "derivedProfile": {"region": "...", "ageRange": "...", "gender": "...", "educationLevel": "...", "community": "..."},
  "culturalSignals": {
    "cultures": ["..."],
    "locales": ["..."],
    "languages": ["..."],
    "faith": ["..."],
    "subcultures": ["..."],
    "values": ["..."],
    "sensitivities": ["..."]
  }
}

Rules:
- Only include culturalSignals arrays that genuinely apply; omit or empty those that do not.
- If the audience names a nationality/culture (e.g. Thai, Nigerian, Korean), populate cultures, locales, and languages accordingly.
- Keep enhancedDescription faithful to the creator's intent.`
}
