/**
 * Conversational synopsis clarify + confirm for the New Series dialog.
 *
 * Turns a rough idea, production format, and target audience into a proposed
 * series synopsis the creator can confirm or keep revising. Parsing lives here
 * so it can be unit tested without calling the model.
 */

import {
  getSeriesProductionProfile,
  isNonFictionProductionFormat,
} from '@/config/series/productionFormats'
import { buildArtStylePromptBlock } from '@/lib/treatment/blueprintFoundation'

export type ClarifySynopsisSurface = 'series' | 'project'

export interface SynopsisMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ClarifySynopsisInput {
  productionFormat: string
  episodeCount: number
  targetAudience?: string
  messages: SynopsisMessage[]
  currentSynopsis?: string
  /** Preset id. Omitted prompts still name the default live-action look. */
  artStyle?: string
  /** Series bible vs a single blueprint production. */
  surface?: ClarifySynopsisSurface
  /** Project length hint. Series prompts use episode count instead. */
  scope?: string
  /** Existing baseline blueprint when clarifying new direction in Blueprint Director. */
  baselineBlueprint?: Record<string, unknown>
}

export interface ClarifySynopsisResult {
  assistantMessage: string
  synopsis: string
  readyToLock: boolean
  genre?: string
  tone?: string
}

export interface SeriesSynopsisLock {
  synopsis: string
  genre?: string
  tone?: string
}

export const MAX_SYNOPSIS_TURNS = 12

const DEFAULT_ASSISTANT_MESSAGE =
  "Here's a clearer synopsis. Confirm it, or tell me what to change."

export function sanitizeSynopsisMessages(raw: unknown): SynopsisMessage[] {
  if (!Array.isArray(raw)) return []
  const cleaned: SynopsisMessage[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const record = item as Record<string, unknown>
    const role = record.role
    const content = typeof record.content === 'string' ? record.content.trim() : ''
    if ((role === 'user' || role === 'assistant') && content) {
      cleaned.push({ role, content })
    }
  }
  return cleaned.slice(-MAX_SYNOPSIS_TURNS)
}

export function fallbackSynopsisText(input: {
  messages: SynopsisMessage[]
  currentSynopsis?: string
}): string {
  const current = (input.currentSynopsis || '').trim()
  if (current) return current
  for (let i = input.messages.length - 1; i >= 0; i--) {
    const message = input.messages[i]
    if (message.role === 'user' && message.content.trim()) return message.content.trim()
  }
  return ''
}

function optionalLabel(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined
  const trimmed = raw.trim()
  if (!trimmed || trimmed.toLowerCase() === 'any') return undefined
  return trimmed.slice(0, 80)
}

/**
 * Parse the model's JSON into a synopsis proposal. Falls back to the creator's
 * current text when the synopsis field is missing or empty.
 */
export function parseClarifySynopsisResult(
  parsed: Record<string, unknown> | null | undefined,
  fallbackSynopsis: string
): ClarifySynopsisResult {
  const obj = parsed && typeof parsed === 'object' ? parsed : {}
  const fallback = (fallbackSynopsis || '').trim()
  const synopsis =
    typeof obj.synopsis === 'string' && obj.synopsis.trim() ? obj.synopsis.trim() : fallback
  const assistantMessage =
    typeof obj.assistantMessage === 'string' && obj.assistantMessage.trim()
      ? obj.assistantMessage.trim()
      : DEFAULT_ASSISTANT_MESSAGE

  return {
    assistantMessage,
    synopsis,
    readyToLock: obj.readyToLock === true,
    genre: optionalLabel(obj.genre),
    tone: optionalLabel(obj.tone),
  }
}

function productionTypeLabel(format: string): string {
  return getSeriesProductionProfile(format)?.label || format || 'Narrative'
}

function formatGuidance(format: string, surface: ClarifySynopsisSurface): string {
  const kind = surface === 'project' ? 'production' : 'series'
  const profile = getSeriesProductionProfile(format)
  const label = productionTypeLabel(format)
  const craft = profile?.craft ? ` ${profile.craft}` : ''
  if (isNonFictionProductionFormat(format)) {
    const documentary =
      profile?.engine === 'documentary'
        ? ' Hosts and narrators present the creator\'s stated subject, and illustrations depict those events. Do not fill missing facts with invented drama.'
        : ''
    const hostedEscape =
      profile?.engine === 'podcast'
        ? ' If the creator explicitly describes a fictional audio story, follow that premise instead of forcing a hosted show.'
        : ''
    return `This is a non-fiction ${label} ${kind}. Do NOT invent a fictional plot, characters, or dramatized conflict. Preserve real subjects, facts, and the instructional, journalistic, or commercial structure the creator described.${documentary}${hostedEscape}${craft}`
  }
  return `This is a ${label} ${kind}. Clarify implied stakes and shape a dramatic premise, but do not replace the creator's characters, setting, or events.${craft}`
}

function formatBaselineBlueprintBlock(baseline?: Record<string, unknown>): string {
  if (!baseline || typeof baseline !== 'object') return ''
  const lines: string[] = []
  if (typeof baseline.title === 'string' && baseline.title.trim()) {
    lines.push(`Title: ${baseline.title.trim()}`)
  }
  if (typeof baseline.logline === 'string' && baseline.logline.trim()) {
    lines.push(`Logline: ${baseline.logline.trim()}`)
  }
  if (typeof baseline.genre === 'string' && baseline.genre.trim()) {
    lines.push(`Genre: ${baseline.genre.trim()}`)
  }
  const tone = baseline.tone_description || baseline.tone
  if (typeof tone === 'string' && tone.trim()) {
    lines.push(`Tone: ${tone.trim()}`)
  }
  const synopsis = baseline.synopsis || baseline.content
  if (typeof synopsis === 'string' && synopsis.trim()) {
    lines.push(`Baseline Synopsis: ${synopsis.trim().slice(0, 800)}`)
  }
  if (typeof baseline.protagonist === 'string' && baseline.protagonist.trim()) {
    lines.push(`Protagonist: ${baseline.protagonist.trim()}`)
  }
  if (typeof baseline.antagonist === 'string' && baseline.antagonist.trim()) {
    lines.push(`Antagonist / Conflict: ${baseline.antagonist.trim()}`)
  }
  if (Array.isArray(baseline.character_descriptions) && baseline.character_descriptions.length > 0) {
    const names = (baseline.character_descriptions as Array<{ name?: string; role?: string }>)
      .map((c) => (c?.name ? `${c.name}${c.role ? ` (${c.role})` : ''}` : ''))
      .filter(Boolean)
    if (names.length > 0) lines.push(`Cast: ${names.join(', ')}`)
  }
  if (Array.isArray(baseline.scene_descriptions) && baseline.scene_descriptions.length > 0) {
    const locs = (baseline.scene_descriptions as Array<{ name?: string }>)
      .map((s) => s?.name || '')
      .filter(Boolean)
    if (locs.length > 0) lines.push(`Locations: ${locs.join(', ')}`)
  }
  if (Array.isArray(baseline.prop_descriptions) && baseline.prop_descriptions.length > 0) {
    const props = (baseline.prop_descriptions as Array<{ name?: string }>)
      .map((p) => p?.name || '')
      .filter(Boolean)
    if (props.length > 0) lines.push(`Props: ${props.join(', ')}`)
  }
  if (Array.isArray(baseline.beats) && baseline.beats.length > 0) {
    lines.push(`Beats: ${baseline.beats.length} story beats`)
  }
  if (lines.length === 0) return ''
  return `\nBASELINE BLUEPRINT:\n"""\n${lines.join('\n')}\n"""\n`
}

export function buildClarifySynopsisPrompt(input: ClarifySynopsisInput): string {
  const messages = input.messages.slice(-MAX_SYNOPSIS_TURNS)
  const formatId = input.productionFormat
  const format = productionTypeLabel(formatId)
  const episodeCount = Math.max(1, Math.floor(Number(input.episodeCount) || 1))
  const audience = (input.targetAudience || '').trim()
  const current = (input.currentSynopsis || '').trim()
  const surface: ClarifySynopsisSurface = input.surface === 'project' ? 'project' : 'series'
  const scope = (input.scope || '').trim() || 'Let the story decide its length'
  const styleBlock = buildArtStylePromptBlock(input.artStyle).trim()
  const baselineBlock = formatBaselineBlueprintBlock(input.baselineBlueprint)
  const hasBaseline = Boolean(baselineBlock)
  const transcript = messages
    .map((message) => `${message.role === 'user' ? 'Creator' : 'You'}: ${message.content.trim()}`)
    .join('\n')

  const intro = hasBaseline
    ? `You are a development producer helping a creator clarify and confirm new direction for an existing production blueprint before an AI regenerates the blueprint from the baseline and new direction.

Use the baseline blueprint, the target audience, and the conversation to synthesize a clear, actionable direction brief that captures what should change and how the blueprint should evolve while preserving coherent baseline elements.

PRODUCTION TYPE: ${format}
SCOPE: ${scope}
TARGET AUDIENCE: ${audience || 'Not specified'}${baselineBlock}`
    : surface === 'project'
      ? `You are a development producer helping a creator ideate a single production before an AI writes the blueprint.

Use the production type, the locked art style, the target audience, and the conversation to write an optimized synopsis. The synopsis is the brief the blueprint generator will follow.

PRODUCTION TYPE: ${format}
SCOPE: ${scope}
TARGET AUDIENCE: ${audience || 'Not specified'}`
      : `You are a development producer helping a creator ideate a multi-episode series before an AI writes the full storyline.

Use the production type, the locked art style, the target audience, and the conversation to write an optimized series synopsis. The synopsis is the brief the storyline generator will follow.

PRODUCTION TYPE: ${format}
EPISODE COUNT: ${episodeCount}
TARGET AUDIENCE: ${audience || 'Not specified'}`

  const lengthInstruction = hasBaseline
    ? 'Write a clear 2-5 sentence direction brief describing the updated creative direction relative to the baseline blueprint.'
    : surface === 'project'
      ? 'Write a synopsis of 2-5 sentences for this single production.'
      : `Write a synopsis of 2-5 sentences shaped for ${episodeCount} episodes.`

  const synopsisField = hasBaseline
    ? '<optimized 2-5 sentence direction brief combining the creator direction with the baseline blueprint context>'
    : surface === 'project'
      ? '<optimized 2-5 sentence production synopsis>'
      : '<optimized 2-5 sentence series synopsis>'

  return `${intro}

${styleBlock}

${formatGuidance(formatId, surface)}

The locked art style is already chosen. Keep the synopsis visually coherent with it, and do not switch the production to a different medium.

CONVERSATION:
${transcript || '(no messages yet)'}

CURRENT PROPOSED SYNOPSIS:
"""
${current || '(none yet)'}
"""

${lengthInstruction} Preserve every concrete detail the creator gave. When something material is still missing, ask exactly one question in assistantMessage. If the synopsis is already specific enough to generate from, ask no question and set readyToLock to true.

assistantMessage is a short conversational reply in the second person (2-4 sentences). Do not use a bullet list.

Return ONLY valid JSON (no markdown):
{
  "assistantMessage": "<conversational reply>",
  "synopsis": "${synopsisField}",
  "readyToLock": <boolean>,
  "genre": "<optional short genre label, or empty string>",
  "tone": "<optional short tone label, or empty string>"
}`
}
