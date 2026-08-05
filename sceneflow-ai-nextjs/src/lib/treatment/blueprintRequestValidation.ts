/**
 * Fast, model-free validation of a blueprint revision request.
 *
 * Every rule here corresponds to a real pipeline limit, so a request that trips
 * one would either be rejected downstream or silently lose part of what the user
 * asked for. Running it before submit keeps those failures off the credit meter.
 *
 * Pure and synchronous: safe to call on every keystroke.
 */

import {
  MAX_SUPPORTED_RUNTIME_MINUTES,
  MIN_SUPPORTED_RUNTIME_MINUTES,
  parseRequestedRuntimeMinutes,
} from './duration'
import {
  inferTargetedSections,
  MAX_BEATS,
  type BlueprintFixSection,
} from './blueprintRevisionTypes'
import { BLUEPRINT_ASPECT_RATIOS } from './blueprintFoundation'
import { FIX_SECTION_LABELS } from '@/lib/constants/blueprint-optimization'

/** Point at which buildRewriterPrompt truncates the user's direction. */
export const MAX_INTENT_CHARS = 800

/** capPatchSize ceiling on character_descriptions. */
export const MAX_CHARACTERS = 8

/**
 * Minutes per beat above which a beat stops being a usable unit of story and
 * starts being a whole act. Used to warn that MAX_BEATS cannot cover a runtime
 * at workable pacing.
 */
export const MAX_COMFORTABLE_MINUTES_PER_BEAT = 4

const MIN_INTENT_CHARS = 15
const MIN_INTENT_WORDS = 4

export type RequestIssueSeverity = 'blocker' | 'warning'

export type RequestIssueCode =
  | 'runtime_unsupported'
  | 'runtime_coarse_beats'
  | 'existing_beats_over_cap'
  | 'instruction_too_long'
  | 'instruction_too_vague'
  | 'aspect_ratio_unsupported'
  | 'character_count_over_cap'
  | 'scope_mismatch'

export type RequestIssue = {
  code: RequestIssueCode
  severity: RequestIssueSeverity
  message: string
}

export type ValidateRevisionRequestInput = {
  intentText: string
  focusScope: BlueprintFixSection | 'all'
  variant?: Record<string, unknown> | null
  /** True when the user picked resonance recommendations, which carry their own direction. */
  hasSelectedRecommendations?: boolean
}

function roundOneDp(n: number): number {
  return Math.round(n * 10) / 10
}

function describeRuntime(minutes: number): string {
  return minutes < 1
    ? `${Math.round(minutes * 60)} seconds`
    : `${roundOneDp(minutes)} minutes`
}

function checkRuntime(intentText: string, issues: RequestIssue[]): void {
  const requested = parseRequestedRuntimeMinutes(intentText)
  if (requested === null) return

  if (
    requested < MIN_SUPPORTED_RUNTIME_MINUTES ||
    requested > MAX_SUPPORTED_RUNTIME_MINUTES
  ) {
    issues.push({
      code: 'runtime_unsupported',
      severity: 'blocker',
      message: `${describeRuntime(requested)} is outside the supported range of ${MIN_SUPPORTED_RUNTIME_MINUTES}–${MAX_SUPPORTED_RUNTIME_MINUTES} minutes. Ask for a runtime inside that range.`,
    })
    return
  }

  const minutesPerBeat = requested / MAX_BEATS
  if (minutesPerBeat > MAX_COMFORTABLE_MINUTES_PER_BEAT) {
    issues.push({
      code: 'runtime_coarse_beats',
      severity: 'warning',
      message: `A revision carries at most ${MAX_BEATS} beats, so ${describeRuntime(requested)} works out to about ${roundOneDp(minutesPerBeat)} minutes per beat. Expect coarse beats — for this length, regenerate the blueprint at a longer scope instead of revising.`,
    })
  }
}

function checkExistingBeats(
  variant: Record<string, unknown> | null | undefined,
  issues: RequestIssue[]
): void {
  const beats = variant?.beats
  if (!Array.isArray(beats) || beats.length <= MAX_BEATS) return

  issues.push({
    code: 'existing_beats_over_cap',
    severity: 'warning',
    message: `This blueprint has ${beats.length} beats and a revision keeps at most ${MAX_BEATS}, so ${beats.length - MAX_BEATS} would be dropped. Edit a single section instead, or shorten the beat sheet first.`,
  })
}

function checkIntentText(
  intentText: string,
  hasSelectedRecommendations: boolean,
  issues: RequestIssue[]
): void {
  const trimmed = intentText.trim()

  if (trimmed.length > MAX_INTENT_CHARS) {
    const ignored = trimmed.length - MAX_INTENT_CHARS
    issues.push({
      code: 'instruction_too_long',
      severity: 'warning',
      message: `Only the first ${MAX_INTENT_CHARS} characters are sent to the model, so the last ${ignored} would be ignored. Tighten your direction to the essentials.`,
    })
  }

  if (hasSelectedRecommendations || !trimmed) return

  const words = trimmed.split(/\s+/).filter(Boolean)
  if (trimmed.length < MIN_INTENT_CHARS || words.length < MIN_INTENT_WORDS) {
    issues.push({
      code: 'instruction_too_vague',
      severity: 'warning',
      message:
        'This direction is very short, so the revision may not change much. Say what should change and why.',
    })
  }
}

function checkAspectRatio(intentText: string, issues: RequestIssue[]): void {
  const matches = intentText.match(/\b(\d{1,2})\s*[:x]\s*(\d{1,2})\b/gi)
  if (!matches) return

  const unsupported = [
    ...new Set(
      matches
        .map((raw) => raw.replace(/\s*[x]\s*/i, ':').replace(/\s+/g, ''))
        .filter((ratio) => !BLUEPRINT_ASPECT_RATIOS.includes(ratio as never))
    ),
  ]
  if (unsupported.length === 0) return

  issues.push({
    code: 'aspect_ratio_unsupported',
    severity: 'blocker',
    message: `${unsupported.join(', ')} is not a supported aspect ratio. Choose one of ${BLUEPRINT_ASPECT_RATIOS.join(', ')}.`,
  })
}

function checkCharacterCount(intentText: string, issues: RequestIssue[]): void {
  const match = intentText.match(
    /\b(\d{1,3})\s+(?:new\s+|more\s+|additional\s+|extra\s+)?(?:characters|cast\s+members|roles)\b/i
  )
  if (!match) return

  const requested = parseInt(match[1], 10)
  if (!Number.isFinite(requested) || requested <= MAX_CHARACTERS) return

  issues.push({
    code: 'character_count_over_cap',
    severity: 'warning',
    message: `A revision keeps at most ${MAX_CHARACTERS} characters, so asking for ${requested} would lose the extras.`,
  })
}

function checkScope(
  intentText: string,
  focusScope: BlueprintFixSection | 'all',
  issues: RequestIssue[]
): void {
  if (focusScope === 'all') return

  const targeted = inferTargetedSections(intentText).filter(
    (section) => section !== focusScope
  )
  if (targeted.length === 0) return

  const names = targeted.map((s) => FIX_SECTION_LABELS[s] || s).join(', ')
  issues.push({
    code: 'scope_mismatch',
    severity: 'warning',
    message: `You are editing ${FIX_SECTION_LABELS[focusScope] || focusScope}, but this direction also asks about ${names}. A single-section edit only returns ${FIX_SECTION_LABELS[focusScope] || focusScope} fields — switch to Full blueprint balance to change the rest.`,
  })
}

export function validateRevisionRequest(
  input: ValidateRevisionRequestInput
): RequestIssue[] {
  const { intentText, focusScope, variant, hasSelectedRecommendations = false } = input
  const text = intentText || ''
  const issues: RequestIssue[] = []

  checkRuntime(text, issues)
  checkExistingBeats(variant, issues)
  checkIntentText(text, hasSelectedRecommendations, issues)
  checkAspectRatio(text, issues)
  checkCharacterCount(text, issues)
  checkScope(text, focusScope, issues)

  return issues
}

export function hasBlockingIssue(issues: RequestIssue[]): boolean {
  return issues.some((i) => i.severity === 'blocker')
}
