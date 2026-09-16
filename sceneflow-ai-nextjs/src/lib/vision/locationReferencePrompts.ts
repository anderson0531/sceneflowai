/**
 * Prompts and constants for location reference images used in Vision Production.
 */

import {
  LOCATION_STATE_KEYWORD_PATTERN,
  SET_PIECE_NOUN_PATTERN,
} from '@/lib/vision/locationStateAnalysis'

export const LOCATION_REFERENCE_ASPECT_RATIO = '16:9' as const

/** Generation: single extreme-wide establishing shot of the location. */
export const LOCATION_TURNAROUND_GENERATION_INSTRUCTION =
  'Single unified cinematic frame — extreme wide establishing shot of the location. ' +
  'One photograph capturing the full room/environment layout, furniture placement, and architectural features. ' +
  'NOT a 2x2 grid, NOT a multi-panel sheet, NOT split-screen, NOT a collage, NOT multiple camera angles. ' +
  'Empty scene with NO people or characters present.'

/** Downstream beat/frame generation: how to consume a location reference image. */
export const LOCATION_TURNAROUND_CONSUMPTION_INSTRUCTION =
  'LOCATION REFERENCE: Single wide-angle establishing shot of the environment. ' +
  'Match architectural layout, furniture placement, color palette, and spatial geometry from this reference. ' +
  'Render one unbroken single-camera frame. Match lighting to Global Style Anchor.'

/** Extra lock when the attached still is a post-change version, not the intact base. */
export const LOCATION_VERSION_CONSUMPTION_SUFFIX =
  'This image is the CURRENT set state. Match damaged, missing, or redressed elements exactly. ' +
  'Do not restore features that are absent from this reference.'

/** Generation: version still from the base establishing shot. Structural set only. */
export const LOCATION_VERSION_GENERATION_INSTRUCTION =
  'Same location as the attached base reference photograph — match architecture, layout, ' +
  'materials, palette, and any furniture that is NOT listed as changed, exactly. ' +
  'Paint ONLY lasting structural set-state changes as the new source of truth: architecture, ' +
  'doors, windows, walls, floors, built-in or overturned set furniture (desks, chairs bolted to the room), ' +
  'flooding, debris that is the room, boarded windows, exploded or missing architectural features. ' +
  'Do NOT add handheld objects, beat keyProps, or objects a character will introduce ' +
  '(journals, vellum, tools, weapons, papers, bags). If the state notes name those, ignore them and leave the set empty of that object. ' +
  'Do not restore pre-change dressing that the structural state notes say is gone, destroyed, or redressed.'

/**
 * Handheld / beat-prop nouns that must not bake into a location version still.
 * These belong on the beat frame when a character introduces them.
 */
export const HANDHELD_BEAT_PROP_PATTERN =
  /\b(?:(?:heavy\s+)?(?:roll(?:\s+of)?\s+)?(?:drafting\s+)?vellum|journals?|notebooks?|scrolls?|letters?|envelopes?|schematics?|blueprints?|documents?|maps?|tools?|weapons?|guns?|pistols?|rifles?|knives?|swords?|phones?|smartphones?|cameras?|flashlights?|lanterns?|briefcases?|handbags?|purses?|wallets?|books?|tablets?|laptops?|bottles?|cigarettes?|cigars?)\b/i

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function splitStateNoteClauses(notes: string): string[] {
  return notes
    .split(/\n+|(?<=[.!;])\s+/)
    .map((part) => part.trim().replace(/^[.!;,\s]+|[.!;,\s]+$/g, '').trim())
    .filter(Boolean)
}

function isSingleStructuralNoun(name: string): boolean {
  const trimmed = name.trim()
  if (!trimmed || /\s/.test(trimmed)) return false
  return SET_PIECE_NOUN_PATTERN.test(trimmed)
}

function usableCatalogPropNames(catalogPropNames?: string[]): string[] {
  const names = Array.isArray(catalogPropNames) ? catalogPropNames : []
  return names
    .map((name) => name.trim())
    .filter((name) => name.length >= 4 && !isSingleStructuralNoun(name))
}

function clauseMentionsCatalogProp(clause: string, catalogPropNames?: string[]): boolean {
  const lower = clause.toLowerCase()
  return usableCatalogPropNames(catalogPropNames).some((name) => lower.includes(name.toLowerCase()))
}

function stripCatalogPropPhrases(text: string, catalogPropNames?: string[]): string {
  let next = text
  for (const name of usableCatalogPropNames(catalogPropNames)) {
    next = next.replace(new RegExp(escapeRegExp(name), 'ig'), ' ')
  }
  return next
}

function stripHandheldAndCatalogFromClause(clause: string, catalogPropNames?: string[]): string {
  let next = stripCatalogPropPhrases(clause, catalogPropNames)
  next = next.replace(HANDHELD_BEAT_PROP_PATTERN, ' ')
  return next
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,;:])/g, '$1')
    .replace(/([,;:]){2,}/g, '$1')
    .replace(/^[,\s;:]+|[,\s;:]+$/g, '')
    .trim()
}

function clauseIsStructuralSet(clause: string): boolean {
  return LOCATION_STATE_KEYWORD_PATTERN.test(clause) && SET_PIECE_NOUN_PATTERN.test(clause)
}

/**
 * Drop beat keyProps / handheld objects from version `stateNotes` at image bake time.
 * Stored library notes stay as-is; only generation + prompt-builder seeds are cleaned.
 */
export function stripBeatPropsFromLocationStateNotes(
  stateNotes: string,
  catalogPropNames?: string[]
): string {
  const trimmed = (stateNotes || '').trim()
  if (!trimmed) return ''

  const kept: string[] = []
  for (const clause of splitStateNoteClauses(trimmed)) {
    const mentionsCatalog = clauseMentionsCatalogProp(clause, catalogPropNames)
    const mentionsHandheld = HANDHELD_BEAT_PROP_PATTERN.test(clause)
    if (!mentionsCatalog && !mentionsHandheld) {
      kept.push(clause)
      continue
    }

    const stripped = stripHandheldAndCatalogFromClause(clause, catalogPropNames)
    if (!stripped) continue
    if (clauseIsStructuralSet(stripped) || clauseIsStructuralSet(clause)) {
      kept.push(stripped)
    }
  }

  return kept.join('. ').replace(/\s+/g, ' ').trim()
}

/** Ensure a custom builder prompt still carries the structural-only contract. */
export function ensureLocationVersionPromptIsStructural(
  prompt: string,
  catalogPropNames?: string[]
): string {
  let next = (prompt || '').trim()
  if (!next) return LOCATION_VERSION_GENERATION_INSTRUCTION
  const lower = next.toLowerCase()
  if (
    !next.includes(LOCATION_VERSION_GENERATION_INSTRUCTION) &&
    !lower.includes('do not add handheld')
  ) {
    next = `${LOCATION_VERSION_GENERATION_INSTRUCTION} ${next}`
  }
  next = stripCatalogPropPhrases(next, catalogPropNames)
  return next.replace(/\s{2,}/g, ' ').trim()
}

export interface LocationVersionPromptInput {
  locationName: string
  stateNotes: string
  intExt?: string
  timeOfDay?: string
  description?: string
  catalogPropNames?: string[]
}

export function buildLocationVersionPrompt(input: LocationVersionPromptInput): string {
  const structuralNotes = stripBeatPropsFromLocationStateNotes(
    input.stateNotes,
    input.catalogPropNames
  )
  const lines = [
    LOCATION_TURNAROUND_GENERATION_INSTRUCTION,
    LOCATION_VERSION_GENERATION_INSTRUCTION,
    `Location: ${input.locationName}.`,
  ]
  if (input.description?.trim()) {
    lines.push(`Base set description: ${input.description.trim()}.`)
  }
  if (input.intExt) {
    lines.push(`Setting type: ${input.intExt}.`)
  }
  if (input.timeOfDay) {
    lines.push(`Time of day: ${input.timeOfDay}.`)
  }
  if (structuralNotes) {
    lines.push(
      `Current structural set state (source of truth — bake into this establishing shot; ignore handheld beat props): ${structuralNotes}.`
    )
  } else {
    lines.push(
      'No lasting structural set changes remain after removing beat props — match the intact base architecture and set furniture. Do not invent handheld objects.'
    )
  }
  lines.push(
    'Empty scene with NO people or characters present.',
    'Cinematic production design, professional film set quality. High resolution, sharp focus, detailed textures.'
  )
  return lines.join(' ')
}

/** Shorter hint for intelligence user prompts. */
export const LOCATION_TURNAROUND_USER_PROMPT_HINT =
  'single extreme-wide establishing shot — match layout and palette'

export function buildLocationReferenceLabel(
  locationName: string,
  referenceIndex: number
): string {
  return `Location reference ${referenceIndex}: ${locationName} (extreme-wide establishing shot)`
}

/**
 * `label` lets the caller reuse the exact label attached to the image part, so
 * the wrapper line and the image name the reference identically.
 */
export function buildLocationReferencePromptLine(
  locationName: string,
  referenceIndex: number,
  label?: string,
  options?: { currentSetState?: boolean }
): string {
  const heading = label ?? `Reference image ${referenceIndex}: LOCATION REFERENCE for "${locationName}"`
  const suffix = options?.currentSetState ? `\n  ${LOCATION_VERSION_CONSUMPTION_SUFFIX}` : ''
  return `- ${heading}\n  ${LOCATION_TURNAROUND_CONSUMPTION_INSTRUCTION}${suffix}`
}
