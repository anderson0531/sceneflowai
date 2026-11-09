/**
 * Pre-flight prompt risk scoring + choreography neutralization before Vertex video calls.
 * Keeps Kling fallback rare by rewriting borderline/high-risk prompts via Gemini Flash.
 */

import { createHash } from 'crypto'
import { generateText, generateWithVision } from '@/lib/vertexai/gemini'
import { getGeminiTextModel } from '@/lib/config/modelConfig'
import { autoSanitizePrompt, moderatePrompt } from '@/utils/promptModerator'
import type { VideoGenerationMethod } from '@/lib/vision/intelligentMethodSelection'

export type PromptRiskLevel = 'low' | 'borderline' | 'high'

export interface PromptRiskScore {
  level: PromptRiskLevel
  flaggedCount: number
  severity: 'none' | 'low' | 'medium' | 'high'
  triggers: string[]
}

export interface PreflightNeutralizeInput {
  prompt: string
  guidePrompt?: string
  method?: VideoGenerationMethod
  startFrameUrl?: string
}

export interface PreflightNeutralizeResult {
  prompt: string
  guidePrompt?: string
  wasRewritten: boolean
  riskScore: PromptRiskScore
  /** True when high risk persists after rewrite */
  requiresUserReview?: boolean
}

const REWRITE_CACHE_MAX = 256
const rewriteCache = new Map<string, { prompt: string; guidePrompt?: string }>()

/** Extra semantic triggers not covered by promptModerator word lists */
const SEMANTIC_RISK_PATTERNS: Array<{ pattern: RegExp; label: string; weight: number }> = [
  // Criminal "framed me" — not "framed photograph" / "framed portrait".
  { pattern: /\b(?:was|got|been|being)\s+framed\b|\bframed\s+me\b/i, label: 'framed', weight: 2 },
  { pattern: /\bcompromised\b/i, label: 'compromised', weight: 2 },
  { pattern: /\binnocen(?:ce|t)\b/i, label: 'innocence', weight: 1 },
  { pattern: /\binterrogat/i, label: 'interrogation', weight: 2 },
  { pattern: /\bplead(?:s|ing|ed)?\b/i, label: 'pleading', weight: 1 },
  { pattern: /\baccus/i, label: 'accusation', weight: 2 },
  { pattern: /\bdesperat/i, label: 'desperate', weight: 1 },
  { pattern: /\bdefian(?:ce|t)\b/i, label: 'defiance', weight: 1 },
  { pattern: /\bpolice\b/i, label: 'police', weight: 1 },
  { pattern: /\barrest/i, label: 'arrest', weight: 2 },
  { pattern: /\bhostage/i, label: 'hostage', weight: 3 },
  { pattern: /\bthreat/i, label: 'threat', weight: 2 },
  { pattern: /\bhypotherm/i, label: 'hypothermia', weight: 2 },
  { pattern: /\bacute\s+pain\b/i, label: 'acute-pain', weight: 2 },
  { pattern: /\bgauze\s+dressing\b/i, label: 'medical-dressing', weight: 2 },
  {
    pattern: /\bhaul(?:s|ing|ed)?\s+(?:person\s*\[\d+\]|[A-Z][a-z]+)\b[^.]{0,40}\barm\b/i,
    label: 'physical-hauling',
    weight: 2,
  },
]

const CHOREOGRAPHY_SYSTEM = `You rewrite video generation prompts so they pass strict AI safety filters while preserving cinematic intent.

Rules:
1. Replace emotionally/criminally/physically-loaded phrasing (blood/gore stains, medical bandages/shock, acute pain, physical hauling/grabbing, threats, or accusations) with neutral cinematic choreography, weathered costume textures, and supportive blocking (describe only what occupies the frame).
2. Avoid introducing negations in descriptive action prose, and remove injury, threat, accusation, or medical-distress terms.
3. Preserve dialogue lines verbatim when quoted (e.g. CHARACTER says: '...').
4. Preserve character names, blocking, camera moves, location context, and ALL reference-binding headers and structural directives verbatim when present (including "Use the images above.", bracketed tokens such as "person [1]", "prop [1]", "location [1]", and trailing occupancy/audio rules such as "Only these people are visible: ...", "No other people.", "Only these objects: ...", "Do not add other objects.", "No spoken dialogue.").
5. When the prompt contains timed phase headers (e.g. "0s–2s (Start frame):", "2s–5s (Action):", "5s–8s (Action progression):", "8s–10s (End frame):"), preserve every timed phase header and its opening-to-closing progression intact. Otherwise keep output to at most 2 sentences for scene/action prose; leave dialogue blocks intact.
6. Examples:
   - "desperate defiance as she pleads her innocence... framed me" -> "leaning forward earnestly, speaking with urgent conviction during a formal interview."
   - "sags against his side in her blood-stained torn canvas parka... hauling person [2] forward by her upper arm... acute pain... hypothermic shock... brutal exposure to the lethal elements" -> "leans beside him in her weather-worn dark canvas parka... steadying person [2] by the arm while stepping forward... strained focus... shivering in the biting wind... enduring the harsh winter storm"

Return JSON only: {"prompt":"...","guidePrompt":"..."} — omit guidePrompt key if unchanged/empty.`

function isPreflightRewriteEnabled(): boolean {
  return process.env.PREFLIGHT_REWRITE_ENABLED !== 'false'
}

function isPreflightImageCheckEnabled(): boolean {
  return process.env.PREFLIGHT_IMAGE_CHECK_ENABLED === 'true'
}

function hashPrompt(prompt: string, guidePrompt?: string): string {
  return createHash('sha256').update(`${prompt}\0${guidePrompt ?? ''}`).digest('hex')
}

function extractBase64FromUrl(url: string): { mime: string; data: string } | null {
  const match = url.match(/^data:([^;]+);base64,(.+)$/)
  if (!match) return null
  return { mime: match[1], data: match[2] }
}

/**
 * Fast local risk score using promptModerator trigger maps + semantic patterns.
 */
export function scorePromptRisk(
  prompt: string,
  options?: { guidePrompt?: string; imageBase64?: string }
): PromptRiskScore {
  const combined = [prompt, options?.guidePrompt].filter(Boolean).join('\n')
  const moderation = moderatePrompt(combined)
  const triggers = moderation.flaggedTerms.map((t) => t.term)

  let semanticWeight = 0
  for (const { pattern, label, weight } of SEMANTIC_RISK_PATTERNS) {
    if (pattern.test(combined)) {
      triggers.push(label)
      semanticWeight += weight
    }
  }

  const flaggedCount = triggers.length
  let level: PromptRiskLevel = 'low'

  if (
    moderation.severity === 'high' ||
    semanticWeight >= 4 ||
    flaggedCount >= 5
  ) {
    level = 'high'
  } else if (
    moderation.severity === 'medium' ||
    moderation.severity === 'low' ||
    semanticWeight >= 2 ||
    flaggedCount >= 1
  ) {
    level = 'borderline'
  }

  return {
    level,
    flaggedCount,
    severity: moderation.severity,
    triggers: [...new Set(triggers)],
  }
}

async function maybeBoostRiskFromImage(
  score: PromptRiskScore,
  imageBase64?: string
): Promise<PromptRiskScore> {
  if (!isPreflightImageCheckEnabled() || !imageBase64 || score.level !== 'high') {
    return score
  }

  try {
    const result = await generateWithVision(
      [
        {
          text: 'Does this image depict violence, weapons, distress, or law-enforcement confrontation? Reply JSON only: {"risky":true|false}',
        },
        {
          inlineData: {
            mimeType: 'image/png',
            data: imageBase64.replace(/^data:[^;]+;base64,/, ''),
          },
        },
      ],
      {
        model: getGeminiTextModel('flash'),
        temperature: 0,
        maxOutputTokens: 64,
        timeoutMs: 8000,
        thinkingLevel: 'minimal',
      }
    )

    const parsed = JSON.parse(result.text.replace(/```json\s*|\s*```/g, '').trim()) as {
      risky?: boolean
    }
    if (parsed.risky) {
      return { ...score, level: 'high', triggers: [...score.triggers, 'image-risk'] }
    }
  } catch {
    // Fall through — never block on image check failure
  }

  return score
}

async function rewriteWithFlash(
  prompt: string,
  guidePrompt?: string
): Promise<{ prompt: string; guidePrompt?: string } | null> {
  const cacheKey = hashPrompt(prompt, guidePrompt)
  const cached = rewriteCache.get(cacheKey)
  if (cached) return cached

  const userPayload = JSON.stringify({
    prompt,
    guidePrompt: guidePrompt ?? '',
  })

  try {
    const result = await generateText(userPayload, {
      model: getGeminiTextModel('flash'),
      systemInstruction: CHOREOGRAPHY_SYSTEM,
      responseMimeType: 'application/json',
      temperature: 0.2,
      maxOutputTokens: 4096,
      timeoutMs: 12000,
      thinkingLevel: 'minimal',
      maxRetries: 0,
    })

    const parsed = JSON.parse(result.text.replace(/```json\s*|\s*```/g, '').trim()) as {
      prompt?: string
      guidePrompt?: string
    }

    if (!parsed.prompt?.trim()) return null

    const out = {
      prompt: parsed.prompt.trim(),
      guidePrompt: parsed.guidePrompt?.trim() || guidePrompt,
    }

    if (rewriteCache.size >= REWRITE_CACHE_MAX) {
      const firstKey = rewriteCache.keys().next().value
      if (firstKey) rewriteCache.delete(firstKey)
    }
    rewriteCache.set(cacheKey, out)
    return out
  } catch (err) {
    console.warn(
      '[PreflightPromptGuard] Flash rewrite failed, using original prompt:',
      err instanceof Error ? err.message : err
    )
    return null
  }
}

/**
 * Score prompt risk and optionally rewrite via Gemini Flash before Vertex video generation.
 */
export async function neutralizePromptForVeo(
  input: PreflightNeutralizeInput
): Promise<PreflightNeutralizeResult> {
  let { prompt, guidePrompt, startFrameUrl } = input

  const imageData = startFrameUrl ? extractBase64FromUrl(startFrameUrl) : null
  let riskScore = scorePromptRisk(prompt, { guidePrompt })
  riskScore = await maybeBoostRiskFromImage(riskScore, imageData?.data)

  if (!isPreflightRewriteEnabled() || riskScore.level === 'low') {
    return { prompt, guidePrompt, wasRewritten: false, riskScore }
  }

  const rewritten = await rewriteWithFlash(prompt, guidePrompt)
  if (!rewritten) {
    // Deterministic fallback: scrub explicit gore/blood/violence trigger words
    // when Flash fails (e.g. timeout/429/JSON error), while leaving purely
    // semantic prompts untouched.
    const fallbackPrompt = autoSanitizePrompt(prompt, { logChanges: true })
    const fallbackGuide = guidePrompt
      ? autoSanitizePrompt(guidePrompt, { logChanges: true })
      : undefined
    const nextPrompt = fallbackPrompt.wasModified ? fallbackPrompt.sanitizedPrompt : prompt
    const nextGuide = fallbackGuide?.wasModified ? fallbackGuide.sanitizedPrompt : guidePrompt
    const wasModified = nextPrompt !== prompt || nextGuide !== guidePrompt
    const postFallbackRisk = wasModified
      ? scorePromptRisk(nextPrompt, { guidePrompt: nextGuide })
      : riskScore

    return {
      prompt: nextPrompt,
      guidePrompt: nextGuide,
      wasRewritten: wasModified,
      riskScore: postFallbackRisk,
      requiresUserReview: riskScore.level === 'high' && postFallbackRisk.level === 'high',
    }
  }

  const postRisk = scorePromptRisk(rewritten.prompt, { guidePrompt: rewritten.guidePrompt })

  return {
    prompt: rewritten.prompt,
    guidePrompt: rewritten.guidePrompt,
    wasRewritten: rewritten.prompt !== prompt || rewritten.guidePrompt !== guidePrompt,
    riskScore: postRisk,
    requiresUserReview: riskScore.level === 'high' && postRisk.level === 'high',
  }
}

/** Reset in-memory cache (tests) */
export function clearPreflightRewriteCache(): void {
  rewriteCache.clear()
}
