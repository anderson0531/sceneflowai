import type { BlueprintFixSection } from '@/lib/types/audienceResonance'
import { createHash } from 'crypto'

export const BLUEPRINT_SECTION_ORDER: BlueprintFixSection[] = [
  'core',
  'story',
  'characters',
  'beats',
  'tone',
]

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : v != null ? String(v).trim() : ''
}

function joinParts(parts: (string | false | null | undefined)[], sep = '. '): string {
  return parts.filter((p) => typeof p === 'string' && p.length > 0).join(sep)
}

function normalizeBeats(variant: Record<string, unknown>) {
  const beats = variant.beats as Array<{
    title?: string
    synopsis?: string
    intent?: string
    minutes?: number | string
  }>
  if (Array.isArray(beats) && beats.length > 0) return beats
  const outline = variant.beat_outline as Array<{
    beat_title?: string
    beat_description?: string
  }>
  if (Array.isArray(outline)) {
    return outline.map((b) => ({
      title: b.beat_title,
      synopsis: b.beat_description,
    }))
  }
  return []
}

function normalizeCharacters(variant: Record<string, unknown>) {
  const rich = variant.character_descriptions as Array<{
    name?: string
    role?: string
    description?: string
    externalGoal?: string
    internalNeed?: string
  }>
  if (Array.isArray(rich) && rich.length > 0) return rich
  const simple = variant.characters as Array<{ name?: string; role?: string; description?: string }>
  return Array.isArray(simple) ? simple : []
}

/** Factual narration script for blueprint TTS; delivery tone is set via ElevenLabs audio tag. */
export function buildBlueprintSectionNarrationText(
  treatment: Record<string, unknown>,
  section: BlueprintFixSection
): string {
  switch (section) {
    case 'core': {
      const parts = [
        str(treatment.title) ? `Title: ${treatment.title}` : '',
        str(treatment.logline) ? `Logline: ${treatment.logline}` : '',
        str(treatment.genre) ? `Genre: ${treatment.genre}` : '',
        str(treatment.format_length) ? `Format: ${treatment.format_length}` : '',
        str(treatment.target_audience) ? `Target audience: ${treatment.target_audience}` : '',
        str(treatment.author_writer) ? `Writer: ${treatment.author_writer}` : '',
      ]
      return joinParts(parts)
    }
    case 'story': {
      const synopsis = str(treatment.synopsis || treatment.content)
      const parts = [
        synopsis ? `Synopsis: ${synopsis}` : '',
        str(treatment.setting) ? `Setting: ${treatment.setting}` : '',
        str(treatment.protagonist) ? `Protagonist: ${treatment.protagonist}` : '',
        str(treatment.antagonist) ? `Antagonist: ${treatment.antagonist}` : '',
      ]
      return joinParts(parts)
    }
    case 'characters': {
      const chars = normalizeCharacters(treatment)
      if (chars.length === 0) return ''
      return chars
        .map((c, i) => {
          const name = str(c.name) || `Character ${i + 1}`
          const role = str(c.role)
          const desc = str(c.description)
          const goal = str((c as { externalGoal?: string }).externalGoal)
          const need = str((c as { internalNeed?: string }).internalNeed)
          return joinParts(
            [
              `${name}${role ? `, ${role}` : ''}`,
              desc,
              goal ? `External goal: ${goal}` : '',
              need ? `Internal need: ${need}` : '',
            ],
            '. '
          )
        })
        .join('\n\n')
    }
    case 'beats': {
      const beats = normalizeBeats(treatment)
      if (beats.length === 0) return ''
      return beats
        .map((b, i) => {
          const title = str(b.title) || `Beat ${i + 1}`
          const mins = b.minutes != null && b.minutes !== '' ? ` (${b.minutes} min)` : ''
          const body = str(b.synopsis || b.intent)
          return `${i + 1}. ${title}${mins}${body ? ` — ${body}` : ''}`
        })
        .join('\n')
    }
    case 'tone': {
      const themes = Array.isArray(treatment.themes)
        ? (treatment.themes as string[]).filter(Boolean).join(', ')
        : str(treatment.themes)
      const parts = [
        str(treatment.tone) ? `Tone: ${treatment.tone}` : '',
        str(treatment.tone_description) ? `Tone description: ${treatment.tone_description}` : '',
        str(treatment.style) ? `Style: ${treatment.style}` : '',
        str(treatment.visual_style) ? `Visual style: ${treatment.visual_style}` : '',
        themes ? `Themes: ${themes}` : '',
        Array.isArray(treatment.mood_references) && treatment.mood_references.length
          ? `Mood references: ${(treatment.mood_references as string[]).join(', ')}`
          : '',
      ]
      return joinParts(parts)
    }
    default:
      return ''
  }
}

/** SHA-256 hex of narration text for cache invalidation. */
export function hashSectionNarrationText(text: string): string {
  return createHash('sha256').update(text.trim()).digest('hex')
}

/** Split long narration at sentence/paragraph boundaries when possible. */
export function chunkNarrationText(text: string, maxLen = 1200): string[] {
  const trimmed = text.trim()
  if (!trimmed) return []
  if (trimmed.length <= maxLen) return [trimmed]

  const chunks: string[] = []
  const paragraphs = trimmed.split(/\n\n+/)
  let current = ''

  const flush = () => {
    if (current.trim()) chunks.push(current.trim())
    current = ''
  }

  for (const para of paragraphs) {
    const sentences = para.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [para]
    for (const sentence of sentences) {
      const piece = sentence.trim()
      if (!piece) continue
      if (`${current} ${piece}`.trim().length > maxLen) {
        flush()
        if (piece.length > maxLen) {
          let cursor = 0
          while (cursor < piece.length) {
            chunks.push(piece.slice(cursor, cursor + maxLen))
            cursor += maxLen
          }
        } else {
          current = piece
        }
      } else {
        current = current ? `${current} ${piece}` : piece
      }
    }
    flush()
  }
  flush()

  return chunks.length > 0 ? chunks : [trimmed.slice(0, maxLen)]
}

export function getAllSectionNarrationTexts(
  treatment: Record<string, unknown>
): Partial<Record<BlueprintFixSection, string>> {
  const out: Partial<Record<BlueprintFixSection, string>> = {}
  for (const section of BLUEPRINT_SECTION_ORDER) {
    const text = buildBlueprintSectionNarrationText(treatment, section)
    if (text.trim()) out[section] = text
  }
  return out
}
