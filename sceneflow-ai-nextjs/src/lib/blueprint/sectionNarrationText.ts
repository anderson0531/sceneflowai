import type { BlueprintFixSection } from '@/lib/types/audienceResonance'
import { createHash } from 'crypto'

export const BLUEPRINT_SECTION_ORDER: BlueprintFixSection[] = [
  'core',
  'story',
  'characters',
  'beats',
  'tone',
]

const SECTION_OPENERS: Record<BlueprintFixSection, string> = {
  core: 'Let me pull you into this story.',
  story: 'Here is where the world comes alive.',
  characters: 'Now meet the people who drive every choice and every risk.',
  beats: 'Feel the story build, beat by beat.',
  tone: 'And this is how the story lands emotionally.',
}

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : v != null ? String(v).trim() : ''
}

function joinSentences(parts: (string | false | null | undefined)[]): string {
  return parts.filter((p) => typeof p === 'string' && p.length > 0).join(' ')
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

/**
 * Engaging spoken script for blueprint share TTS — narrative hooks, not field labels.
 */
export function buildBlueprintSectionNarrationText(
  treatment: Record<string, unknown>,
  section: BlueprintFixSection
): string {
  const opener = SECTION_OPENERS[section]
  let body = ''

  switch (section) {
    case 'core': {
      const title = str(treatment.title)
      const logline = str(treatment.logline)
      const genre = str(treatment.genre)
      const format = str(treatment.format_length)
      const audience = str(treatment.target_audience)
      body = joinSentences([
        title ? `It's called ${title}.` : '',
        logline ? `Picture this: ${logline}` : '',
        genre ? `This is a ${genre} story` : '',
        format ? `shaped as ${format}` : '',
        audience ? `— crafted for ${audience}.` : genre || format ? '.' : '',
      ])
      break
    }
    case 'story': {
      const synopsis = str(treatment.synopsis || treatment.content)
      const setting = str(treatment.setting)
      const protagonist = str(treatment.protagonist)
      const antagonist = str(treatment.antagonist)
      body = joinSentences([
        synopsis || '',
        setting ? `It all unfolds in ${setting}.` : '',
        protagonist ? `At the heart of it is ${protagonist}.` : '',
        antagonist ? `Standing in the way: ${antagonist}.` : '',
      ])
      break
    }
    case 'characters': {
      const chars = normalizeCharacters(treatment)
      if (chars.length === 0) return ''
      body = chars
        .map((c, i) => {
          const name = str(c.name) || `this character`
          const role = str(c.role)
          const desc = str(c.description)
          const goal = str((c as { externalGoal?: string }).externalGoal)
          const need = str((c as { internalNeed?: string }).internalNeed)
          const lead =
            i === 0
              ? `First, ${name}${role ? `, our ${role}` : ''}.`
              : `Then ${name}${role ? `, the ${role}` : ''}.`
          return joinSentences([
            lead,
            desc,
            goal ? `They want ${goal}.` : '',
            need ? `But what they truly need is ${need}.` : '',
          ])
        })
        .join(' ')
      break
    }
    case 'beats': {
      const beats = normalizeBeats(treatment)
      if (beats.length === 0) return ''
      body = beats
        .map((b, i) => {
          const title = str(b.title) || `beat ${i + 1}`
          const synopsis = str(b.synopsis || b.intent)
          const transition =
            i === 0
              ? `It opens with ${title}.`
              : i === beats.length - 1
                ? `And it culminates in ${title}.`
                : `Then comes ${title}.`
          return joinSentences([
            transition,
            synopsis,
            b.minutes != null && b.minutes !== '' ? `Roughly ${b.minutes} minutes on screen.` : '',
          ])
        })
        .join(' ')
      break
    }
    case 'tone': {
      const tone = str(treatment.tone)
      const toneDesc = str(treatment.tone_description)
      const style = str(treatment.style)
      const visual = str(treatment.visual_style)
      const themes = Array.isArray(treatment.themes)
        ? (treatment.themes as string[]).filter(Boolean).join(', ')
        : str(treatment.themes)
      const moods =
        Array.isArray(treatment.mood_references) && treatment.mood_references.length
          ? (treatment.mood_references as string[]).join(', ')
          : ''
      body = joinSentences([
        tone ? `The emotional register is ${tone}.` : '',
        toneDesc,
        themes ? `Themes that echo throughout: ${themes}.` : '',
        style ? `Told in a ${style} style.` : '',
        visual ? `Visually, imagine ${visual}.` : '',
        moods ? `Mood references include ${moods}.` : '',
      ])
      break
    }
    default:
      return ''
  }

  if (!body.trim()) return ''
  return `${opener} ${body}`.replace(/\s+/g, ' ').trim()
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
