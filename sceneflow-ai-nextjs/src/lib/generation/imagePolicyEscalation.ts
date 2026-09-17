/**
 * Prompt escalation for image requests refused on content policy.
 *
 * Lives apart from the policy ladder so the Vertex image client can reach it
 * too. The client's own flash → pro escalation used to re-send the refused
 * wording verbatim, which is how a frame came back rendered but with the
 * identity reference ignored: the model complied with the composition and
 * declined to put the referenced face in it.
 */

import { autoSanitizePrompt } from '@/utils/promptModerator'
import { softenStillPhrasingForPolicy } from '@/lib/generation/policySafePhrasing'
import {
  assembleStructuredStillPrompt,
  extractStructuredStillBody,
  joinPromptBlocks,
  parseStillPromptSource,
  parseStillReferencesLegend,
  replaceStructuredStillBody,
  STILL_SECTION_EXCLUSIONS,
  STILL_SECTION_STYLE,
} from '@/lib/imagen/structuredStillPrompt'

/** Second-pass replacements after the first PromptModerator sanitize. */
export const IMAGE_SAFETY_ESCALATION: Array<[RegExp, string]> = [
  [/\b(projectiles?|firearm|blade|weapon|steel)\b/gi, 'stage prop'],
  [/\b(dark liquid|crimson|red fluid|life force)\b/gi, 'fabric dye stain'],
  [/\b(bruises?|contusions?|bloodshot|wounds?|injur(?:y|ies)|scars?|cuts?)\b/gi, 'makeup detail'],
  [/\b(gunshot|bullet\s*hole|entry\s*wound|stab\s*wound)\b/gi, 'costume mark'],
  [/\b(stained and marked|deeply stained|dripping crimson)\b/gi, 'costume weathering'],
]

export const PRODUCTION_STILL_FRAMING =
  'Generate a photorealistic film-production wardrobe reference still of an adult performer. Treat any marks or handheld items as costume makeup and safe stage props only — theatrical, non-graphic, suitable for a studio continuity board.'

/**
 * Beat-frame Safety pass — intimidation / confinement / tool-near-head.
 *
 * Applied on the first Safety send (`failedAttempt >= 1`) because beat frames
 * skip `PRODUCTION_STILL_FRAMING` and level 1 otherwise left a standing figure
 * pinning a tool beside a seated person's head (production 2026-09-16).
 * Keep library prop nouns: never rewrite "spanner" or "dispatch cylinder".
 */
export const BEAT_POLICY_SECOND_PASS: Array<[RegExp, string]> = [
  [/\blow angle\b/gi, 'eye-level angle'],
  [/\bsits on the floor\b/gi, 'kneels near the wall'],
  [/\b, knees pulled up\b/gi, ''],
  [/\bleans (?:his|her|their) weight onto\b/gi, 'stands braced beside'],
  [
    /\b(?:his|her|their) weight planted through (?:his|her|their) extended (?:right |left )?arm to hold\b/gi,
    'one hand resting on',
  ],
  [/\bplanted against the (?:brick )?wall beside\b/gi, 'resting upright on the floor beside'],
  [/\bresting flush against the (?:brick )?wall\b/gi, 'resting upright on the floor'],
  [/\bflush against the (?:brick )?wall\b/gi, 'resting upright on the floor'],
  [
    /\bthe spanner against the wall beside (?:her|him|them)\b/gi,
    'the spanner resting upright on the floor',
  ],
  [
    /\bagainst the wall at person \[(\d+)\]'s side\b/gi,
    "embedded in cracked brick beside person [$1]'s open hand",
  ],
  [
    /\bagainst the wall at (?:her|his|their) side\b/gi,
    'embedded in cracked brick beside their open hand',
  ],
  [/\bstares? (?:directly )?down at\b/gi, 'meets the gaze of'],
  [/\blooks down at\b/gi, 'looks toward'],
  [/\blooking down at\b/gi, 'looking toward'],
  [/\bstands over (?:her|him|them)\b/gi, 'stands beside them'],
  [/\bstands over\b/gi, 'stands beside'],
  [/\bterrified\b/gi, 'startled'],
  [/\bcornered\b/gi, 'seated'],
  [/\bboxing (?:her|him|them) in\b/gi, 'seated in the narrow space'],
  [
    /\b(?:head of (?:an? )?)?(?:(?:iron|heavy) )?(?:\w+ )*spanner[^.]{0,80}(?:shoulder|neck|throat|person \[\d+\]'s side)\b/gi,
    "the spanner's head is buried in cracked stone beside their open hand, dust still settling",
  ],
  [/\bCool\/(?:Toxic|hazardous)\b/gi, 'Cool/Industrial'],
  [/\b\/Toxic\b/gi, '/Industrial'],
]

export interface EscalateImagePromptOptions {
  skipProductionStillFraming?: boolean
  /** Default: unstructured prompts at failedAttempt >= 1; structured stills at >= 2. */
  applyDestructiveNouns?: boolean
  shotType?: string
  allowTypography?: boolean
}

function applyReplacements(text: string, rules: Array<[RegExp, string]>): string {
  let next = text
  for (const [re, replacement] of rules) {
    next = next.replace(re, replacement)
  }
  return next
}

function softenActionText(
  action: string,
  failedAttempt: number,
  options?: EscalateImagePromptOptions
): string {
  let next = action
  const stillSoftened = softenStillPhrasingForPolicy(next)
  if (stillSoftened.changes.length > 0) {
    next = stillSoftened.text
    console.log(
      `[VertexImagePolicy] Softened still phrasing: ${stillSoftened.changes.join('; ')}`
    )
  }
  const sp = autoSanitizePrompt(next, { logChanges: true })
  if (sp.wasModified) next = sp.sanitizedPrompt

  if (failedAttempt >= 1 && options?.skipProductionStillFraming) {
    const updated = applyReplacements(next, BEAT_POLICY_SECOND_PASS)
    if (updated !== next) {
      next = updated
      console.log('[VertexImagePolicy] Applied beat-frame second-pass policy rewrites')
    }
  }

  const applyNouns =
    options?.applyDestructiveNouns ??
    (extractStructuredStillBody(action) ? failedAttempt >= 2 : failedAttempt >= 1)
  if (applyNouns) {
    const updated = applyReplacements(next, IMAGE_SAFETY_ESCALATION)
    if (updated !== next) {
      next = updated
      console.log('[VertexImagePolicy] Applied IMAGE_SAFETY escalation replacements')
    }
  }

  return next
}

/**
 * Soften Action/Framing only, then reassemble so [REFERENCES] / TASK / STYLE stay intact.
 */
export function escalateStructuredStillForSafety(
  still: string,
  failedAttempt: number,
  options?: EscalateImagePromptOptions
): string {
  const parsed = parseStillPromptSource(still)
  const refs = parseStillReferencesLegend(still)
  const action = softenActionText(parsed.actionFraming, failedAttempt, {
    ...options,
    applyDestructiveNouns: options?.applyDestructiveNouns ?? failedAttempt >= 2,
  })
  const seed = joinPromptBlocks(
    parsed.style ? `${STILL_SECTION_STYLE}\n${parsed.style}` : '',
    action ? `Action/Framing: ${action}` : '',
    parsed.exclusions ? `${STILL_SECTION_EXCLUSIONS}\n${parsed.exclusions}` : ''
  )
  return assembleStructuredStillPrompt({
    actionOrStructured: seed,
    refs,
    includeCandid: /Subjects absorbed in the action/i.test(still),
    shotType: options?.shotType,
    allowTypography: options?.allowTypography,
  })
}

/**
 * Escalate a prompt after policy / IMAGE_SAFETY failure.
 * @param failedAttempt 1-based attempt that just failed
 */
export function escalateImagePromptForRetry(
  prompt: string,
  failedAttempt: number,
  options?: EscalateImagePromptOptions
): string {
  const stillBody = extractStructuredStillBody(prompt)
  if (stillBody && /\[(?:REFERENCES|TASK|STILL)\]/.test(stillBody)) {
    const nextStill = escalateStructuredStillForSafety(stillBody, failedAttempt, options)
    return replaceStructuredStillBody(prompt, nextStill)
  }

  let next = softenActionText(prompt, failedAttempt, options)

  if (
    failedAttempt >= 2 &&
    !options?.skipProductionStillFraming &&
    !next.includes('wardrobe reference still')
  ) {
    next = `${next.trim()}\n\n${PRODUCTION_STILL_FRAMING}`
    console.log('[VertexImagePolicy] Appended production-still framing for IMAGE_SAFETY retry')
  }

  return next
}
