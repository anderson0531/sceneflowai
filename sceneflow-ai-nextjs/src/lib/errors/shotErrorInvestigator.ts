/**
 * Self-Healing Shot / Beat Error Investigator
 *
 * Mirrors the Audience Resonance one-click resolution pattern:
 * Evaluates a failing Still or 10s Video Clip's prompt, provider/mode, RAI error details,
 * and reference metadata to diagnose the root cause (celebrity likeness false positive,
 * action/violence intensity exceeding Google Veo/Omni policy, 429 quota, FTV policy, or
 * prompt contradiction) and return ranked one-click `ShotErrorResolution` cards.
 */

import { evaluateGenerationError, type GenerationMediaType } from '@/lib/errors/generationErrorIntelligence'
import { lintShotPromptConsistency } from '@/lib/vision/lintShotPromptConsistency'

export type ShotErrorRootCause =
  | 'celebrity_likeness_ref'
  | 'celebrity_name_text'
  | 'action_intensity_for_veo'
  | 'ftv_frame_policy'
  | 'prompt_policy_trigger'
  | 'prompt_consistency_defect'
  | 'rate_limit_429'
  | 'missing_prerequisite'
  | 'unexpected'

export type ShotErrorActionType =
  | 'switch_creative_kling_f2v'
  | 'apply_sanitized_prompt_and_retry'
  | 'mitigate_likeness_and_retry'
  | 'regenerate_non_celebrity_portrait'
  | 'downgrade_ftv_to_i2v'
  | 'open_director_rewrite'
  | 'open_references'
  | 'retry_after_cooldown'
  | 'rerun'

export interface ShotErrorResolutionPatch {
  revisedPrompt?: string
  targetMode?: 'creative' | 'standard'
  targetSourceMethod?: 'frame' | 'reference'
  flaggedReferenceName?: string
  portraitRewriteGuidance?: string
  retryAfterSeconds?: number
}

export interface ShotErrorResolution {
  id: string
  rootCause: ShotErrorRootCause
  confidence: 'high' | 'medium'
  title: string
  reason: string
  fixDescription: string
  recommended?: boolean
  actionType: ShotErrorActionType
  ctaLabel: string
  patch?: ShotErrorResolutionPatch
}

export interface ShotErrorReferenceSummary {
  name?: string
  role?: string
  imageUrl?: string
}

export interface ShotErrorInvestigationInput {
  mediaType: GenerationMediaType
  rawError?: string
  technicalDetails?: string
  vertexRaiDetails?: string
  errorCode?: string | null
  statusCode?: number
  provider?: string | null
  generationMethod?: string | null
  hasStartFrame?: boolean
  isFTVRelated?: boolean
  prompt?: string
  referenceImages?: ShotErrorReferenceSummary[]
  shotLabel?: string
}

export interface ShotErrorInvestigationResult {
  diagnosedCause: ShotErrorRootCause
  summary: string
  resolutions: ShotErrorResolution[]
  evaluatedBy: 'deterministic' | 'multimodal_ai'
}

const ACTION_INTENSITY_RE =
  /\b(?:fight|fighting|punch|punches|kick|kicks|combat|brawl|gun|pistol|rifle|shoot|shooting|gunfire|explosion|explodes|knife|blade|sword|stab|blood|bleeding|wound|bruise|choke|strangle|slam|slams|crash|collision|chase|pursuit|tackle|struggle|assault|battle|war|weapon|firearm|shatter|violence|violent|strike|strikes|hit|hits|impact|throw|throws\s+against)\b/i

const PROMINENT_PEOPLE_RE =
  /\b(?:prominent\s+people|celebrity|public\s+figure|famous\s+(?:person|people|actor|actress)|real\s+person\s+likeness|depicting\s+a\s+real|biometric|identity\s+policy|person\s+likeness)\b/i

const SAFETY_TRIGGER_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\b(?:bloodied|bloody|bleeding|blood-stained)\b/gi, 'weathered and dust-streaked'],
  [/\b(?:gun|pistol|rifle|firearm|handgun)\b/gi, 'metallic tool'],
  [/\b(?:knife|blade|dagger)\b/gi, 'compact metal implement'],
  [/\b(?:strangling|choking|stabbing|shooting)\b/gi, 'confronting'],
  [/\b(?:violent|violently|brutal|brutally|deadly|lethal)\b/gi, 'intense and kinetic'],
  [/\b(?:corpse|dead\s+body|lifeless\s+body)\b/gi, 'motionless figure'],
  [/\b(?:hollywood\s+star|movie\s+star|celebrity\s+lookalike)\b/gi, 'ordinary everyday non-celebrity person'],
]

export function softenPromptForSelfHealing(prompt: string): {
  revisedPrompt: string
  changed: boolean
} {
  if (!prompt?.trim()) return { revisedPrompt: '', changed: false }
  const linted = lintShotPromptConsistency({ prompt, assetKind: 'clip' })
  let text = linted.sanitizedPrompt
  for (const [regex, replacement] of SAFETY_TRIGGER_REPLACEMENTS) {
    text = text.replace(regex, replacement)
  }
  text = text.replace(/\s{2,}/g, ' ').trim()
  return { revisedPrompt: text, changed: text !== prompt.trim() }
}

/**
 * Deterministic instant diagnosis (<5ms) covering 429s, Prominent People / celebrity likeness,
 * high-intensity action shots on Google Veo/Omni (recommending Creative [Kling AI F2V]),
 * FTV policy blocks, and prompt contradictions.
 */
export function buildDeterministicShotInvestigation(
  input: ShotErrorInvestigationInput
): ShotErrorInvestigationResult {
  const evaluated = evaluateGenerationError({
    mediaType: input.mediaType,
    rawError: input.technicalDetails || input.rawError,
    statusCode: input.statusCode,
    errorCode: input.errorCode,
    generationMethod: input.generationMethod,
    provider: input.provider,
    hasStartFrame: input.hasStartFrame,
    isFTVRelated: input.isFTVRelated,
  })

  const combinedDiag = [
    input.rawError,
    input.technicalDetails,
    input.vertexRaiDetails,
    input.errorCode,
  ]
    .filter(Boolean)
    .join(' ')

  const promptText = (input.prompt || '').trim()
  const isClip = input.mediaType === 'clip'
  const isVertexOrStandard =
    !input.provider ||
    /vertex|veo|omni|google/i.test(input.provider)
  const isPolicyError =
    evaluated.category === 'content_policy' ||
    evaluated.category === 'ftv_content_policy' ||
    evaluated.category === 'character_likeness' ||
    evaluated.category === 'identity_declined'

  const resolutions: ShotErrorResolution[] = []

  // 1. Rate Limit (429)
  if (evaluated.category === 'rate_limited') {
    const waitSec = evaluated.retryAfterSeconds ?? 45
    resolutions.push({
      id: 'res-429-cooldown',
      rootCause: 'rate_limit_429',
      confidence: 'high',
      title: `Auto-Retry After ${waitSec}s Quota Cooldown`,
      reason:
        'Google Vertex AI returned a temporary 429 quota/rate-limit burst. No credits were charged and your prompt is valid.',
      fixDescription: `Wait ${waitSec}s for the rolling RPM window to reset, then automatically retry this ${isClip ? 'clip' : 'still'} with staggered pacing.`,
      recommended: true,
      actionType: 'retry_after_cooldown',
      ctaLabel: `Retry After Cooldown`,
      patch: { retryAfterSeconds: waitSec },
    })
    if (isClip && isVertexOrStandard) {
      resolutions.push({
        id: 'res-429-creative-kling',
        rootCause: 'rate_limit_429',
        confidence: 'medium',
        title: 'Run Now via Creative (Kling AI F2V)',
        reason: 'Bypass the temporary Google Vertex RPM queue immediately by rendering this shot on Kling AI F2V.',
        fixDescription: 'Switch this shot to Creative mode (Kling AI Frame-to-Video) using its Start Frame and generate right away.',
        actionType: 'switch_creative_kling_f2v',
        ctaLabel: 'Switch to Creative (Kling AI F2V)',
        patch: { targetMode: 'creative', targetSourceMethod: 'frame' },
      })
    }
    return {
      diagnosedCause: 'rate_limit_429',
      summary: 'Temporary 429 rate-limit burst on the generation quota — no prompt changes required.',
      resolutions,
      evaluatedBy: 'deterministic',
    }
  }

  // 2. Prominent People / Celebrity Likeness False Positive
  const isProminentPeople =
    PROMINENT_PEOPLE_RE.test(combinedDiag) ||
    evaluated.category === 'character_likeness' ||
    evaluated.category === 'identity_declined'

  if (isProminentPeople) {
    const firstCharRef = input.referenceImages?.find(
      (r) => !r.role || /identity|character|wardrobe/i.test(r.role)
    )
    const refLabel = firstCharRef?.name?.trim() || 'attached character reference'

    if (isClip && isVertexOrStandard) {
      resolutions.push({
        id: 'res-likeness-kling-f2v',
        rootCause: 'celebrity_likeness_ref',
        confidence: 'high',
        title: 'Switch to Creative (Kling AI F2V)',
        reason: `Google's Prominent People RAI filter frequently misidentifies photorealistic AI portraits (${refLabel}) as movie stars.`,
        fixDescription:
          'Render this 10s clip using Creative (Kling AI F2V) anchored to your Start Frame—preserving your character design without Google biometric false positives.',
        recommended: true,
        actionType: 'switch_creative_kling_f2v',
        ctaLabel: 'Switch to Creative (Kling AI F2V)',
        patch: { targetMode: 'creative', targetSourceMethod: 'frame' },
      })
    }

    const softened = softenPromptForSelfHealing(promptText)
    const likenessSafePrompt = softened.revisedPrompt
      ? `${softened.revisedPrompt.replace(/\.+$/, '')}. Original fictional non-celebrity character with natural everyday features, candid documentary framing.`
      : undefined

    resolutions.push({
      id: 'res-likeness-mitigate-shot',
      rootCause: 'celebrity_likeness_ref',
      confidence: 'high',
      title: 'Apply Non-Celebrity Framing & Retry',
      reason: 'Adding explicit fictional non-celebrity anchors and softening glamour descriptors helps clear biometric false positives.',
      fixDescription:
        'Update this shot prompt with non-celebrity everyday framing cues and retry immediately.',
      recommended: !isClip,
      actionType: 'mitigate_likeness_and_retry',
      ctaLabel: 'Apply Fix & Retry',
      patch: {
        ...(likenessSafePrompt ? { revisedPrompt: likenessSafePrompt } : {}),
        flaggedReferenceName: refLabel,
      },
    })

    resolutions.push({
      id: 'res-likeness-regen-portrait',
      rootCause: 'celebrity_likeness_ref',
      confidence: 'medium',
      title: `Root Fix: Regenerate Non-Celebrity Portrait (${refLabel})`,
      reason:
        'Auto-generated characters trained on film data can closely resemble actors, causing repeated blocks across every scene they appear in.',
      fixDescription:
        'Open Cast References to regenerate this portrait with ordinary, naturally asymmetrical non-celebrity features so all downstream shots pass cleanly.',
      actionType: 'regenerate_non_celebrity_portrait',
      ctaLabel: 'Fix Cast Reference',
      patch: {
        flaggedReferenceName: refLabel,
        portraitRewriteGuidance:
          'Ordinary everyday non-celebrity person, subtle natural facial asymmetry, unretouched authentic skin texture, candid documentary portrait, no movie-star or fashion-model likeness.',
      },
    })

    return {
      diagnosedCause: 'celebrity_likeness_ref',
      summary: `Likely Prominent People / celebrity-likeness false positive triggered by ${refLabel} or facial descriptors.`,
      resolutions,
      evaluatedBy: 'deterministic',
    }
  }

  // 3. Action / Violence / Intensity exceeding Google Veo / Omni policy -> Creative [Kling AI F2V]
  const hasActionIntensity = ACTION_INTENSITY_RE.test(promptText) || ACTION_INTENSITY_RE.test(combinedDiag)
  if (isPolicyError && isClip && isVertexOrStandard && hasActionIntensity) {
    resolutions.push({
      id: 'res-action-kling-f2v',
      rootCause: 'action_intensity_for_veo',
      confidence: 'high',
      title: 'Switch to Creative (Kling AI F2V) for Action Shot',
      reason:
        'This action/intensity beat exceeds Google Omni/Veo safety thresholds for physical conflict or weapons.',
      fixDescription:
        'Switch this shot to Creative (Kling AI F2V) using its Start Frame to achieve the intended cinematic action choreography (with post-render safety moderation).',
      recommended: true,
      actionType: 'switch_creative_kling_f2v',
      ctaLabel: 'Switch to Creative (Kling AI F2V)',
      patch: { targetMode: 'creative', targetSourceMethod: 'frame' },
    })

    const softened = softenPromptForSelfHealing(promptText)
    if (softened.changed) {
      resolutions.push({
        id: 'res-action-soften-prompt',
        rootCause: 'action_intensity_for_veo',
        confidence: 'medium',
        title: 'Soften Action Wording & Stay on Standard (Veo)',
        reason: 'Replacing explicit weapon/impact wording with kinetic camera tension allows Google Veo/Omni to render the beat.',
        fixDescription: 'Apply the sanitized action wording to this shot and retry on Standard mode.',
        actionType: 'apply_sanitized_prompt_and_retry',
        ctaLabel: 'Apply Clean Prompt & Retry',
        patch: { revisedPrompt: softened.revisedPrompt, targetMode: 'standard' },
      })
    }

    return {
      diagnosedCause: 'action_intensity_for_veo',
      summary:
        'Action/intensity wording exceeded Google Veo/Omni safety limits — Creative (Kling AI F2V) is recommended to preserve the shot.',
      resolutions,
      evaluatedBy: 'deterministic',
    }
  }

  // 4. FTV (Start+End Frame Transition) Policy Block
  if (evaluated.category === 'ftv_content_policy' || (isPolicyError && input.isFTVRelated)) {
    resolutions.push({
      id: 'res-ftv-to-i2v',
      rootCause: 'ftv_frame_policy',
      confidence: 'high',
      title: 'Retry with Start Frame Only (I2V)',
      reason:
        'Start+End frame interpolation triggered a transition safety block—usually because the end frame pose or prop position trips a strict check.',
      fixDescription: 'Drop the end-frame constraint and animate smoothly from the Start Frame alone.',
      recommended: true,
      actionType: 'downgrade_ftv_to_i2v',
      ctaLabel: 'Retry with Start Frame (I2V)',
      patch: { targetSourceMethod: 'frame' },
    })
    if (isClip && isVertexOrStandard) {
      resolutions.push({
        id: 'res-ftv-kling',
        rootCause: 'ftv_frame_policy',
        confidence: 'medium',
        title: 'Switch to Creative (Kling AI F2V)',
        reason: 'Creative mode animates directly from your Start Frame without Google Veo transition blocks.',
        fixDescription: 'Switch this shot to Creative (Kling AI F2V) and retry.',
        actionType: 'switch_creative_kling_f2v',
        ctaLabel: 'Switch to Creative (Kling AI F2V)',
        patch: { targetMode: 'creative', targetSourceMethod: 'frame' },
      })
    }
    return {
      diagnosedCause: 'ftv_frame_policy',
      summary: 'Frame-to-Frame transition was blocked by safety filters — switching to Start-Frame I2V or Creative (Kling AI F2V) resolves it.',
      resolutions,
      evaluatedBy: 'deterministic',
    }
  }

  // 5. General Content Policy or Prompt Consistency Defect
  const lint = lintShotPromptConsistency({
    prompt: promptText,
    assetKind: isClip ? 'clip' : 'still',
  })
  const softened = softenPromptForSelfHealing(promptText)

  if (isPolicyError) {
    if (isClip && isVertexOrStandard) {
      resolutions.push({
        id: 'res-policy-kling-f2v',
        rootCause: 'prompt_policy_trigger',
        confidence: 'high',
        title: 'Switch to Creative (Kling AI F2V)',
        reason: 'Google Veo/Omni rejected the prompt or attached reference frame under its automated safety filter.',
        fixDescription:
          'Generate this clip via Creative (Kling AI F2V) anchored to your Start Frame.',
        recommended: true,
        actionType: 'switch_creative_kling_f2v',
        ctaLabel: 'Switch to Creative (Kling AI F2V)',
        patch: { targetMode: 'creative', targetSourceMethod: 'frame' },
      })
    }
    if (softened.changed) {
      resolutions.push({
        id: 'res-policy-clean-prompt',
        rootCause: 'prompt_policy_trigger',
        confidence: 'high',
        title: 'Apply Policy-Safe Prompt Rewrite & Retry',
        reason: 'Removed trigger phrases and prompt contradictions that frequently trip automated safety classifiers.',
        fixDescription: 'Save the cleaned prompt onto this beat and retry generation immediately.',
        recommended: !isClip,
        actionType: 'apply_sanitized_prompt_and_retry',
        ctaLabel: 'Apply Clean Prompt & Retry',
        patch: { revisedPrompt: softened.revisedPrompt },
      })
    }
    resolutions.push({
      id: 'res-policy-director',
      rootCause: 'prompt_policy_trigger',
      confidence: 'medium',
      title: 'Rewrite Shot with AI Director (Safety Mode)',
      reason: 'Let the Shot Director re-stage the beat using policy-safe framing while keeping the story beat intact.',
      fixDescription: 'Run the Shot Director safety rewrite on this beat.',
      actionType: 'open_director_rewrite',
      ctaLabel: 'Rewrite with Director',
    })
    return {
      diagnosedCause: 'prompt_policy_trigger',
      summary: evaluated.explanation,
      resolutions,
      evaluatedBy: 'deterministic',
    }
  }

  // 6. Missing Prerequisite / References
  if (
    evaluated.category === 'missing_references' ||
    evaluated.category === 'missing_prerequisite'
  ) {
    resolutions.push({
      id: 'res-missing-refs',
      rootCause: 'missing_prerequisite',
      confidence: 'high',
      title: 'Attach Missing References or Start Frame',
      reason: evaluated.explanation,
      fixDescription: evaluated.suggestion,
      recommended: true,
      actionType: 'open_references',
      ctaLabel: 'Open References',
    })
    return {
      diagnosedCause: 'missing_prerequisite',
      summary: evaluated.explanation,
      resolutions,
      evaluatedBy: 'deterministic',
    }
  }

  // 7. Prompt consistency defects or transient unexpected error
  if (lint.changed) {
    resolutions.push({
      id: 'res-lint-fix',
      rootCause: 'prompt_consistency_defect',
      confidence: 'high',
      title: 'Fix Prompt Contradiction & Retry',
      reason: lint.issues[0]?.message || 'Detected a self-contradicting prompt clause.',
      fixDescription: lint.issues[0]?.suggestedFix || 'Apply cleaned prompt and retry.',
      recommended: true,
      actionType: 'apply_sanitized_prompt_and_retry',
      ctaLabel: 'Apply Fix & Retry',
      patch: { revisedPrompt: lint.sanitizedPrompt },
    })
  }

  resolutions.push({
    id: 'res-retry-default',
    rootCause: 'unexpected',
    confidence: 'medium',
    title: `Retry ${isClip ? 'Clip' : 'Still'} Generation`,
    reason: evaluated.explanation,
    fixDescription: evaluated.suggestion,
    recommended: resolutions.length === 0,
    actionType: 'rerun',
    ctaLabel: 'Retry Now',
  })

  return {
    diagnosedCause: lint.changed ? 'prompt_consistency_defect' : 'unexpected',
    summary: evaluated.explanation,
    resolutions,
    evaluatedBy: 'deterministic',
  }
}
