/**
 * Film treatment import helpers for the Start Project (Create Blueprint) dialog.
 *
 * Takes a pasted or uploaded treatment document (synopsis, characters, etc.) and
 * extracts a clean project description plus a coarse classification (content
 * intent, genre, tone) used to prefill the dialog. Character/subject detail is
 * folded into the description prose; the Blueprint model re-derives structured
 * fields downstream.
 *
 * Parsing/validation lives here (not in the route) so it can be unit tested
 * without hitting the model. Mirrors the shape of refineConcept.ts.
 */

import type { ContentIntent } from '@/lib/content/contentIntent'

export interface TreatmentImportResult {
  synopsis: string
  contentIntent: ContentIntent | null
  genre: string
  tone: string
  summary: string
}

const VALID_INTENTS: ContentIntent[] = [
  'fiction',
  'informational',
  'commercial',
  'conversational',
]

const MIN_TEXT_LENGTH = 20

export function isTreatmentTextUsable(text: string): boolean {
  return (text || '').trim().length >= MIN_TEXT_LENGTH
}

function coerceIntent(raw: unknown): ContentIntent | null {
  if (typeof raw !== 'string') return null
  const key = raw.trim().toLowerCase()
  return (VALID_INTENTS as string[]).includes(key) ? (key as ContentIntent) : null
}

function coerceString(raw: unknown): string {
  return typeof raw === 'string' ? raw.trim() : ''
}

/**
 * Parse the model's JSON response into a normalized import result. Falls back to
 * a trimmed slice of the original text when the model output is unusable.
 */
export function parseTreatmentImportResult(
  parsed: Record<string, unknown> | null | undefined,
  originalText: string
): TreatmentImportResult {
  const fallback = (originalText || '').trim().slice(0, 1200)
  const obj = parsed && typeof parsed === 'object' ? parsed : {}

  const synopsis = coerceString(obj.synopsis) || fallback

  return {
    synopsis,
    contentIntent: coerceIntent(obj.contentIntent),
    genre: coerceString(obj.genre),
    tone: coerceString(obj.tone),
    summary: coerceString(obj.summary),
  }
}

export function buildTreatmentImportPrompt(text: string): string {
  return `You are a development producer. A creator pasted or uploaded a FILM TREATMENT or project document (it may contain a synopsis, characters, setting, tone, beats, or loose notes). Convert it into a clean starting point for generating a Blueprint.

Your job:
1. Write a clear 2-4 sentence PROJECT DESCRIPTION capturing the core idea, main subject(s) or character(s), and the intended audience takeaway. Fold key character/subject detail into the prose. Do NOT invent facts; preserve the creator's intent. For non-fiction material (documentary, education, commercial, podcast/interview) do NOT fictionalize.
2. CLASSIFY the content intent as exactly one of: fiction, informational, commercial, conversational.
3. Extract a concise free-form GENRE (e.g. "nature documentary", "neo-noir thriller", "product explainer") and TONE (e.g. "warm and hopeful", "suspenseful and gritty"). Leave a field empty only if truly indeterminable.

TREATMENT / DOCUMENT:
"""
${(text || '').trim().slice(0, 12000)}
"""

Return ONLY valid JSON (no markdown):
{
  "synopsis": "<clean 2-4 sentence project description>",
  "contentIntent": "fiction|informational|commercial|conversational",
  "genre": "<concise genre>",
  "tone": "<concise tone>",
  "summary": "<one-line summary of the project>"
}`
}
