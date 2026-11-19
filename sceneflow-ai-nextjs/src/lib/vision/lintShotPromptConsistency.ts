/**
 * Pre-Flight Prompt Consistency & Physics Linter
 *
 * Deterministic (<5ms) validation & optional auto-repair for Still and 10s Video Clip prompts
 * prior to spending generation credits. Catches the most common self-imposed prompt defects:
 * 1. Object state-transition paradoxes (e.g., "picks up the open jar, then opens the jar").
 * 2. Prop inclusion vs. exclusion contradictions ("props remain: X" + "Only these objects: Y").
 * 3. Identical Start/End frame timestamps in 10s clips (causes stalled or snap-back motion).
 * 4. Action overload in 10s clips (>3 chained sequential actions causing physics/morphing decay).
 * 5. Multi-character pronoun corruption ("The subject's ... The subject's ..." in two-shots).
 * 6. Celebrity / movie-star casting buzzwords that trigger Google Prominent People RAI blocks.
 */

export type PromptConsistencyIssueCode =
  | 'state_transition_paradox'
  | 'prop_exclusion_contradiction'
  | 'identical_start_end_frame'
  | 'ten_second_action_overload'
  | 'multi_subject_pronoun_corruption'
  | 'celebrity_casting_buzzword'
  | 'still_temporal_sequence'

export interface PromptConsistencyIssue {
  code: PromptConsistencyIssueCode
  severity: 'error' | 'warning'
  message: string
  matchedText?: string
  suggestedFix: string
}

export interface PromptConsistencyLintResult {
  ok: boolean
  issues: PromptConsistencyIssue[]
  /** Automatically sanitized version of the prompt when safe deterministic fixes apply. */
  sanitizedPrompt: string
  changed: boolean
}

const STATE_PARADOX_RULES: Array<{
  id: string
  regex: RegExp
  description: string
  fix: (prompt: string) => string
}> = [
  {
    id: 'open-then-open',
    regex:
      /\b(?:an?|the)\s+(?:already\s+)?open(?:ed)?\s+([a-z][a-z\s]{1,24}?)\b[\s\S]{0,120}\b(?:opens?|unscrews?|uncaps?|unlatches?)\s+(?:the\s+\1|it)\b/i,
    description: 'Object is described as already open before the action opens it.',
    fix: (p) =>
      p.replace(
        /\b((?:an?|the)\s+)(?:already\s+)?open(?:ed)?\s+([a-z][a-z\s]{1,24}?\b[\s\S]{0,120}\b(?:opens?|unscrews?|uncaps?|unlatches?)\s+(?:the\s+\2|it)\b)/i,
        '$1closed $2'
      ),
  },
  {
    id: 'closed-then-close',
    regex:
      /\b(?:an?|the)\s+(?:already\s+)?closed\s+([a-z][a-z\s]{1,24}?)\b[\s\S]{0,120}\b(?:closes?|shuts?|slams?\s+shut)\s+(?:the\s+\1|it)\b/i,
    description: 'Object is described as already closed before the action closes it.',
    fix: (p) =>
      p.replace(
        /\b((?:an?|the)\s+)(?:already\s+)?closed\s+([a-z][a-z\s]{1,24}?\b[\s\S]{0,120}\b(?:closes?|shuts?|slams?\s+shut)\s+(?:the\s+\2|it)\b)/i,
        '$1open $2'
      ),
  },
  {
    id: 'holding-then-picks-up',
    regex:
      /\b(?:already\s+)?holding\s+(?:an?|the)\s+([a-z][a-z\s]{1,24}?)\b[\s\S]{0,120}\bpicks?\s+up\s+(?:the\s+\1|it)\b/i,
    description: 'Subject is already holding the object before picking it up.',
    fix: (p) =>
      p.replace(
        /\b(?:already\s+)?holding\s+((?:an?|the)\s+[a-z][a-z\s]{1,24}?\b[\s\S]{0,120}\bpicks?\s+up\b)/i,
        'reaching toward $1'
      ),
  },
  {
    id: 'standing-then-stands-up',
    regex:
      /\b(?:already\s+)?standing\b[^.!?]{0,80}\b(?:stands?\s+up|rises?\s+to\s+(?:his|her|their)\s+feet)\b/i,
    description: 'Subject is already standing before standing up.',
    fix: (p) =>
      p.replace(
        /\b(?:already\s+)?standing\b([^.!?]{0,80}\b(?:stands?\s+up|rises?\s+to\s+(?:his|her|their)\s+feet)\b)/i,
        'seated$1'
      ),
  },
]

const CELEBRITY_CASTING_BUZZWORD_RE =
  /\b(?:hollywood\s+(?:star|actor|actress|leading\s+(?:man|lady))|movie\s+star\s+(?:looks?|face|charisma)|celebrity\s+(?:looks?|likeness|vibe)|a-list\s+(?:actor|actress|star)|looks?\s+like\s+[A-Z][a-z]+\s+[A-Z][a-z]+)\b/gi

export function lintShotPromptConsistency(input: {
  prompt: string
  assetKind: 'still' | 'clip'
  durationSec?: number
}): PromptConsistencyLintResult {
  const original = (input.prompt || '').trim()
  if (!original) {
    return { ok: true, issues: [], sanitizedPrompt: original, changed: false }
  }

  const issues: PromptConsistencyIssue[] = []
  let sanitized = original

  // 1. Object / posture state-transition paradoxes
  for (const rule of STATE_PARADOX_RULES) {
    const match = sanitized.match(rule.regex)
    if (match) {
      issues.push({
        code: 'state_transition_paradox',
        severity: 'error',
        message: rule.description,
        matchedText: match[0].slice(0, 120),
        suggestedFix: 'Align the opening state with the physical transition so the action does not contradict the starting pose.',
      })
      sanitized = rule.fix(sanitized)
    }
  }

  // 2. Prop inclusion ("props remain: X") contradicting strict exclusion ("Only these objects: Y")
  const remainMatch = sanitized.match(/\bprops remain:\s*([^.]+)\./i)
  const onlyObjectsMatch = sanitized.match(/\bOnly these objects:\s*([^.]+)\./i)
  if (remainMatch?.[1] && onlyObjectsMatch?.[1]) {
    const remainProps = remainMatch[1]
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    const allowedSet = new Set(
      onlyObjectsMatch[1]
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
    )
    const conflicting = remainProps.filter((p) => !allowedSet.has(p.toLowerCase()))
    if (conflicting.length > 0) {
      issues.push({
        code: 'prop_exclusion_contradiction',
        severity: 'error',
        message: `Incoming continuity keeps "${conflicting.join(', ')}" while fidelity close restricts objects to "${onlyObjectsMatch[1].trim()}".`,
        matchedText: remainMatch[0],
        suggestedFix: 'Intersect incoming props with the current beat keyProps so continuity never contradicts object guardrails.',
      })
      const kept = remainProps.filter((p) => allowedSet.has(p.toLowerCase()))
      sanitized =
        kept.length > 0
          ? sanitized.replace(remainMatch[0], `props remain: ${kept.join(', ')}.`)
          : sanitized.replace(remainMatch[0], '')
    }
  }

  // 3. Identical 0s-2s Start frame and 8s-10s End frame on 10s clips
  if (input.assetKind === 'clip') {
    const startMatch = sanitized.match(/\b0s[–-]2s\s*\(Start frame\):\s*([^.]+)\./i)
    const endMatch = sanitized.match(/\b8s[–-]10s\s*\(End frame\):\s*([^.]+)\./i)
    if (
      startMatch?.[1] &&
      endMatch?.[1] &&
      startMatch[1].trim().toLowerCase() === endMatch[1].trim().toLowerCase()
    ) {
      issues.push({
        code: 'identical_start_end_frame',
        severity: 'error',
        message: 'Start frame (0s–2s) and End frame (8s–10s) describe the exact same frozen instant, causing clip freeze or snap-back.',
        matchedText: endMatch[0],
        suggestedFix: 'Remove the duplicated End frame clause or specify the distinct resting state after the primary action completes.',
      })
      sanitized = sanitized.replace(endMatch[0], '')
    }

    // 4. Action overload in 10s clip (>3 chained temporal transitions)
    const chainMarkers = sanitized.match(/\b(?:and then|then\s+(?:he|she|they|it|person)|next,|afterward[s]?,|finally,)\b/gi)
    if ((chainMarkers?.length ?? 0) >= 3) {
      issues.push({
        code: 'ten_second_action_overload',
        severity: 'warning',
        message: `10s clip chains ${chainMarkers!.length + 1} sequential actions, which degrades physics permanence after second 5.`,
        suggestedFix: 'Focus the 10s clip on 1 primary physical action + 1 continuous camera movement + subtle ambient motion.',
      })
    }

    // 5. Multi-character pronoun corruption ("The subject's" appearing mid-sentence with person [2]+)
    if (/\bperson\s*\[[2-9]\]/i.test(sanitized) && /\bthe subject's\b/i.test(sanitized)) {
      issues.push({
        code: 'multi_subject_pronoun_corruption',
        severity: 'error',
        message: 'Two-shot prompt contains generic "the subject\'s" pronoun replacement alongside person [2], obscuring who performs each action.',
        suggestedFix: 'Preserve character-specific pronouns (his/her) or explicit person [1]/person [2] tokens in multi-character shots.',
      })
    }
  }

  // 6. Celebrity / movie-star casting buzzwords (RAI false-positive trigger)
  const celebMatches = sanitized.match(CELEBRITY_CASTING_BUZZWORD_RE)
  if (celebMatches?.length) {
    issues.push({
      code: 'celebrity_casting_buzzword',
      severity: 'warning',
      message: `Prompt contains celebrity/movie-star casting phrasing ("${celebMatches[0]}"), which increases Google Prominent People RAI false positives.`,
      matchedText: celebMatches[0],
      suggestedFix: 'Replace glamour/celebrity descriptors with ordinary, authentic documentary casting cues.',
    })
    sanitized = sanitized.replace(CELEBRITY_CASTING_BUZZWORD_RE, 'ordinary everyday non-celebrity person')
  }

  // 7. Still prompt containing multi-step video sequence ("first ... then ...")
  if (input.assetKind === 'still' && /\b(?:first|begins by)\b[^.]{5,80}\bthen\b/i.test(sanitized)) {
    issues.push({
      code: 'still_temporal_sequence',
      severity: 'warning',
      message: 'Still image prompt describes a multi-step temporal sequence instead of a single frozen instant.',
      suggestedFix: 'Describe only the single frozen t=0s physical pose and contact geometry.',
    })
  }

  sanitized = sanitized.replace(/\s{2,}/g, ' ').replace(/\.\s*\./g, '.').trim()
  const hasErrors = issues.some((i) => i.severity === 'error')
  return {
    ok: !hasErrors,
    issues,
    sanitizedPrompt: sanitized,
    changed: sanitized !== original,
  }
}
