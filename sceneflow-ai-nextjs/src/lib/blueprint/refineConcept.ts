/**
 * Project concept refine + validation helpers for the Create Blueprint dialog.
 *
 * Turns a free-text project description into a validated, clarified starting
 * description plus guiding questions the user can answer to strengthen their
 * concept before generating a Blueprint.
 *
 * The parsing/validation logic lives here (not in the route) so it can be unit
 * tested without hitting the model. Mirrors the shape of refineAudience.ts.
 */

import type { ContentIntent } from '@/lib/content/contentIntent'

export interface ConceptRefineContext {
  contentIntent?: ContentIntent
  genre?: string
  tone?: string
  targetAudience?: string
}

export interface ConceptValidationIssue {
  code: 'too-short' | 'too-vague' | 'missing-subject' | 'missing-takeaway' | 'other'
  message: string
}

export interface ConceptRefineResult {
  valid: boolean
  issues: ConceptValidationIssue[]
  clarifyingQuestions: string[]
  enhancedDescription: string
  summary: string
}

const MIN_DESCRIPTION_LENGTH = 15
const MIN_WORD_COUNT = 4

const VAGUE_ONLY_PATTERNS = [
  /^(a video|a film|a story|something|a project|content|make a video|video about stuff)\.?$/i,
]

/**
 * Fast, model-free validation run on entry. Catches obviously-insufficient
 * descriptions before spending credits on the AI refine step.
 */
export function validateConceptDescription(description: string): {
  valid: boolean
  issues: ConceptValidationIssue[]
} {
  const trimmed = (description || '').trim()
  const issues: ConceptValidationIssue[] = []

  if (trimmed.length < MIN_DESCRIPTION_LENGTH) {
    issues.push({
      code: 'too-short',
      message:
        'Add more detail about your project — the main topic, who or what it features, and what the audience should take away.',
    })
  }

  const wordCount = trimmed.split(/\s+/).filter(Boolean).length
  if (trimmed.length >= MIN_DESCRIPTION_LENGTH && wordCount < MIN_WORD_COUNT) {
    issues.push({
      code: 'too-short',
      message: 'Describe your project in a full sentence rather than a few words.',
    })
  }

  if (VAGUE_ONLY_PATTERNS.some((re) => re.test(trimmed))) {
    issues.push({
      code: 'too-vague',
      message:
        'This is very broad. Naming the subject, the goal, and the audience yields a stronger Blueprint.',
    })
  }

  return { valid: issues.length === 0, issues }
}

function coerceStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter((s): s is string => s.length > 0)
}

function coerceIssues(raw: unknown): ConceptValidationIssue[] {
  if (!Array.isArray(raw)) return []
  const allowed = ['too-short', 'too-vague', 'missing-subject', 'missing-takeaway', 'other']
  return raw
    .map((item): ConceptValidationIssue | null => {
      if (typeof item === 'string') {
        return { code: 'other', message: item }
      }
      if (item && typeof item === 'object') {
        const obj = item as Record<string, unknown>
        const message = typeof obj.message === 'string' ? obj.message : ''
        if (!message) return null
        const code = typeof obj.code === 'string' ? obj.code : 'other'
        return {
          code: (allowed.includes(code) ? code : 'other') as ConceptValidationIssue['code'],
          message,
        }
      }
      return null
    })
    .filter((v): v is ConceptValidationIssue => v !== null)
}

/**
 * Parse the model's JSON response into a normalized refine result. Falls back
 * gracefully to the original description if the model output is unusable.
 */
export function parseConceptRefineResult(
  parsed: Record<string, unknown> | null | undefined,
  originalDescription: string
): ConceptRefineResult {
  const fallbackDescription = (originalDescription || '').trim()
  const obj = parsed && typeof parsed === 'object' ? parsed : {}

  const enhancedDescription =
    typeof obj.enhancedDescription === 'string' && obj.enhancedDescription.trim()
      ? obj.enhancedDescription.trim()
      : fallbackDescription

  const summary =
    typeof obj.summary === 'string' && obj.summary.trim() ? obj.summary.trim() : ''

  const issues = coerceIssues(obj.issues)
  const clarifyingQuestions = coerceStringArray(obj.clarifyingQuestions)
  const valid = typeof obj.valid === 'boolean' ? obj.valid : issues.length === 0

  return {
    valid,
    issues,
    clarifyingQuestions,
    enhancedDescription,
    summary,
  }
}

export function buildConceptRefinePrompt(
  description: string,
  context?: ConceptRefineContext
): string {
  const contextLines: string[] = []
  if (context?.contentIntent) contextLines.push(`Content intent: ${context.contentIntent}`)
  if (context?.genre) contextLines.push(`Genre: ${context.genre}`)
  if (context?.tone) contextLines.push(`Tone: ${context.tone}`)
  if (context?.targetAudience) contextLines.push(`Target audience: ${context.targetAudience}`)
  const contextBlock = contextLines.length
    ? `\nPROJECT CONTEXT:\n${contextLines.join('\n')}\n`
    : ''

  return `You are a development producer helping a creator sharpen the STARTING DESCRIPTION of a video/film project before an AI generates a full Blueprint (treatment).

The creator described their project in their own words (speech or typing). Your job:
1. VALIDATE the description. Flag if it is too short, too vague, missing a clear subject/topic, or missing an intended audience takeaway.
2. Ask 2-4 CLARIFYING / GUIDING QUESTIONS that would most improve the Blueprint (e.g. "Who is the main subject or character?", "What should the audience feel or do afterward?", "What is the single most important message?"). Tailor questions to the content intent — do NOT ask fiction/character questions for a documentary, podcast, or commercial project.
3. Produce an ENHANCED starting description (2-4 sentences) that clarifies and organizes the creator's intent. PRESERVE their intent and every concrete detail. Do NOT invent a fictional plot, characters, or dramatized conflict for non-fiction intents (informational, commercial, conversational). Only make the intent sharper and more specific.

RAW PROJECT DESCRIPTION:
"""
${(description || '').trim()}
"""
${contextBlock}
Return ONLY valid JSON (no markdown):
{
  "valid": <boolean: false if the description is too weak for a good Blueprint>,
  "issues": [{"code": "too-short|too-vague|missing-subject|missing-takeaway|other", "message": "specific, actionable guidance"}],
  "clarifyingQuestions": ["question 1", "question 2"],
  "enhancedDescription": "<clarified, specific 2-4 sentence project description>",
  "summary": "<one-line summary of what this project is>"
}

Rules:
- Keep enhancedDescription faithful to the creator's intent and content type.
- For non-fiction intents, do NOT fictionalize — preserve real subjects, facts, and instructional or conversational structure.
- If the description is already strong, set valid=true, return an empty issues array, and still offer optional clarifying questions.`
}
