/**
 * Script & Film Treatment import helpers for the Start Project (Create Blueprint) dialog.
 *
 * Takes a pasted or uploaded screenplay, beat sheet, or treatment document and
 * extracts a structured project brief plus classification (content intent,
 * genre, tone) used to prefill the Blueprint dialog. When the user supplies a
 * complete script or detailed multi-scene treatment, the extracted synopsis
 * preserves named characters, locations, and act/scene progression so the
 * Blueprint model builds a high-fidelity foundation.
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
  const fallback = (originalText || '').trim().slice(0, 4000)
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
  return `You are a senior development producer. A creator pasted or uploaded a SCREENPLAY, FILM TREATMENT, BEAT SHEET, or project document. Convert it into a structured, high-fidelity project brief for generating a SceneFlow Blueprint.

Your job:
1. Write a comprehensive PROJECT BRIEF in "synopsis" that preserves the depth of the source material:
   - If the source is a short concept or brief treatment, write a clear 1-2 paragraph project description capturing the premise, main character(s) or subject(s), setting, and audience takeaway.
   - If the source is a COMPLETE SCRIPT, SCREENPLAY, or DETAILED MULTI-SCENE TREATMENT, do NOT compress it into 2 sentences. Write a rich, structured multi-paragraph brief (up to 400-800 words) that preserves:
     • Title (if present) and core premise / logline
     • Named characters or subjects with their roles, traits, and key relationships
     • Primary locations, world-building, and visual atmosphere
     • Act-by-act or scene-by-scene narrative progression, key turning points, central conflict, and resolution
   - Do NOT invent facts; preserve the creator's exact character names, locations, and story beats. For non-fiction material (documentary, education, commercial, podcast/interview) do NOT fictionalize.
2. CLASSIFY the content intent as exactly one of: fiction, informational, commercial, conversational.
3. Extract a concise free-form GENRE (e.g. "nature documentary", "neo-noir thriller", "product explainer") and TONE (e.g. "warm and hopeful", "suspenseful and gritty"). Leave a field empty only if truly indeterminable.

SCRIPT / TREATMENT DOCUMENT:
"""
${(text || '').trim().slice(0, 32000)}
"""

Return ONLY valid JSON (no markdown):
{
  "synopsis": "<comprehensive project brief preserving premise, characters, locations, and story progression>",
  "contentIntent": "fiction|informational|commercial|conversational",
  "genre": "<concise genre>",
  "tone": "<concise tone>",
  "summary": "<one-line summary of the project>"
}`
}
