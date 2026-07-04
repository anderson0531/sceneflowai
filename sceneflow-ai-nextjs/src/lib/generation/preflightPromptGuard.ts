/**
 * Pre-flight prompt risk scoring + choreography neutralization before Vertex video calls.
 * Keeps Kling fallback rare by rewriting borderline/high-risk prompts via Gemini Flash.
 */

import { createHash } from 'crypto'
import { generateText, generateWithVision } from '@/lib/vertexai/gemini'
import { getGeminiTextModel } from '@/lib/config/modelConfig'
import { moderatePrompt } from '@/utils/promptModerator'
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
  /** True when high risk persists after rewrite — caller may surface ContentPolicyAlert */
  requiresUserReview?: boolean
}

const REWRITE_CACHE_MAX = 256
const rewriteCache = new Map<string, { prompt: string; guidePrompt?: string }>()

/** Extra semantic triggers not covered by promptModerator word lists */
const SEMANTIC_RISK_PATTERNS: Array<{ pattern: RegExp; label: string; weight: number }> = [
  { pattern: /\bframed\b/i, label: 'framed', weight: 2 },
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
]

const CHOREOGRAPHY_SYSTEM = `You rewrite video generation prompts so they pass strict AI safety filters while preserving cinematic intent.

Rules:
1. Replace emotionally/criminally-loaded phrasing with neutral cinematic choreography and additive affirmation (describe only what occupies the frame).
2. No negations ("no", "without", "avoid"). No injury, threat, accusation, or distress verbs.
3. Preserve dialogue lines verbatim when quoted (e.g. CHARACTER says: '...').
4. Preserve character names, blocking, camera moves, and location context.
5. Keep output to at most 2 sentences for scene/action prose; leave dialogue blocks intact.
6. Example: "desperate defiance as she pleads her innocence... framed me" -> "leaning forward earnestly, speaking with urgent conviction during a formal interview."

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
      maxOutputTokens: 1024,
      timeoutMs: 8000,
      thinkingLevel: 'minimal',
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
    return {
      prompt,
      guidePrompt,
      wasRewritten: false,
      riskScore,
      requiresUserReview: riskScore.level === 'high',
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
