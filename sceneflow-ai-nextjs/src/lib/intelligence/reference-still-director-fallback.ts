/**
 * Reference Still Director — rewrite a library plate prompt (client-safe).
 *
 * Cast / wardrobe / location / object stills are identity plates, not beat
 * frames. Gemini lives in the server-only sibling.
 */

import { escalateImagePromptForRetry } from '@/lib/generation/imagePolicyEscalation'
import { buildPolicySafePhrasingRules } from '@/lib/generation/policySafePhrasing'
import { buildCharacterHairAnchor } from '@/lib/character/characterReferenceAssembly'
import {
  CHARACTER_IDENTITY_REFERENCE_ANCHOR,
  FULL_BODY_WARDROBE_REFERENCE_ANCHOR,
  buildCharacterIdentityReferencePromptFromCharacter,
  buildFullBodyWardrobePrompt,
} from '@/lib/character/characterReferencePrompts'
import {
  LOCATION_TURNAROUND_GENERATION_INSTRUCTION,
  LOCATION_VERSION_GENERATION_INSTRUCTION,
  buildLocationBasePrompt,
  buildLocationVersionPrompt,
} from '@/lib/vision/locationReferencePrompts'
import {
  OBJECT_REFERENCE_PURPOSE,
  withObjectReferenceInstruction,
} from '@/lib/vision/objectReferencePrompts'
import { buildObjectReferencePrompt } from '@/lib/vision/referenceExpressPrompts'
import {
  buildArtStyleSpecFromValue,
  isPhotorealisticArtStyle,
} from '@/lib/artStyle/globalArtStyle'
import type { VisualReference } from '@/types/visionReferences'

export const REFERENCE_STILL_KINDS = [
  'cast',
  'wardrobe',
  'location',
  'locationVersion',
  'object',
] as const

export type ReferenceStillKind = (typeof REFERENCE_STILL_KINDS)[number]

export type ReferenceStillDirectorMode = 'optimize' | 'rewrite'

export interface ReferenceStillDirectorContext {
  name?: string
  appearance?: string
  outfit?: string
  accessories?: string
  appearanceNotes?: string
  locationName?: string
  intExt?: string
  timeOfDay?: string
  description?: string
  stateNotes?: string
  category?: string
}

export interface DirectReferenceStillRequest {
  kind: ReferenceStillKind
  mode: ReferenceStillDirectorMode
  currentPrompt: string
  userDirection?: string
  policyCompliance?: boolean
  context?: ReferenceStillDirectorContext
  artStyle?: string | null
}

export function isReferenceStillKind(value: unknown): value is ReferenceStillKind {
  return typeof value === 'string' && (REFERENCE_STILL_KINDS as readonly string[]).includes(value)
}

export function overlayUserDirectionOnPrompt(
  currentPrompt: string,
  userDirection?: string
): string {
  const base = currentPrompt.trim()
  const notes = userDirection?.trim()
  if (!notes) return base
  if (!base) return notes
  if (base.includes(notes)) return base
  return `${base.replace(/[. ]*$/, '')}. ${notes}`
}

export function applyPolicyComplianceToPrompt(prompt: string): string {
  const trimmed = prompt.trim()
  if (!trimmed) return trimmed
  return escalateImagePromptForRetry(trimmed, 1, { skipProductionStillFraming: true })
}

export function parseReferenceStillDirectorResponse(raw: unknown): string | undefined {
  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    return trimmed || undefined
  }
  if (!raw || typeof raw !== 'object') return undefined
  const record = raw as Record<string, unknown>
  if (typeof record.prompt === 'string' && record.prompt.trim()) {
    return record.prompt.trim()
  }
  return undefined
}

function kindAnchor(kind: ReferenceStillKind, artStyle?: string | null): string {
  const rawStyle = artStyle?.trim()
  const isLiveAction = !rawStyle || rawStyle === 'photorealistic' || isPhotorealisticArtStyle(rawStyle)
  if (!isLiveAction && rawStyle) {
    const spec = buildArtStyleSpecFromValue(rawStyle)
    switch (kind) {
      case 'cast':
        return `${spec.title} character identity reference portrait.`
      case 'wardrobe':
        return `${spec.title} full-body wardrobe reference for cinematic character consistency.`
      case 'location':
        return LOCATION_TURNAROUND_GENERATION_INSTRUCTION.replace(
          'One photograph capturing',
          `One unified ${spec.title} establishing plate capturing`
        )
      case 'locationVersion':
        return LOCATION_VERSION_GENERATION_INSTRUCTION.replace(/photograph/g, 'reference plate')
      case 'object':
        return `${OBJECT_REFERENCE_PURPOSE} ${spec.propRefDirective}`
    }
  }
  switch (kind) {
    case 'cast':
      return CHARACTER_IDENTITY_REFERENCE_ANCHOR
    case 'wardrobe':
      return FULL_BODY_WARDROBE_REFERENCE_ANCHOR
    case 'location':
      return LOCATION_TURNAROUND_GENERATION_INSTRUCTION
    case 'locationVersion':
      return LOCATION_VERSION_GENERATION_INSTRUCTION
    case 'object':
      return OBJECT_REFERENCE_PURPOSE
  }
}

export function ensureReferenceKindAnchor(
  kind: ReferenceStillKind,
  prompt: string,
  artStyle?: string | null
): string {
  const trimmed = prompt.trim()
  const anchor = kindAnchor(kind, artStyle)
  if (!trimmed) return anchor
  if (trimmed.includes(anchor) || (kind === 'location' && /empty scene with no people/i.test(trimmed))) {
    return trimmed
  }
  if (kind === 'object') {
    return withObjectReferenceInstruction(trimmed, artStyle)
  }
  return `${anchor}\n\n${trimmed}`
}

export function preferredStoredOrBuiltPrompt(
  stored: string | undefined,
  built: string
): string {
  const existing = stored?.trim()
  return existing || built
}

type CastIdentityPromptCharacter = Parameters<
  typeof buildCharacterIdentityReferencePromptFromCharacter
>[0] & {
  imagePrompt?: string | null
}

/**
 * A stored plate prompt is the director's last still instruction. It stays in
 * force only while it still contains the current body description AND matches
 * the active Global Art Style medium. A newer body description or medium shift
 * rebuilds the identity prompt instead of redrawing a stale plate.
 */
export function resolveCastIdentityGenerationPrompt(
  character: CastIdentityPromptCharacter,
  artStyle?: string | null
): { prompt: string; rawMode: boolean } {
  const stored = typeof character.imagePrompt === 'string' ? character.imagePrompt.trim() : ''
  const appearance =
    typeof character.appearanceDescription === 'string'
      ? character.appearanceDescription.trim()
      : ''
  const rawStyle = artStyle?.trim()
  const styleConflict = Boolean(
    rawStyle &&
      rawStyle !== 'photorealistic' &&
      !isPhotorealisticArtStyle(rawStyle) &&
      (stored.includes(CHARACTER_IDENTITY_REFERENCE_ANCHOR) ||
        /\bphotorealistic human photography\b/i.test(stored))
  )
  if (stored && !styleConflict && (!appearance || stored.includes(appearance))) {
    return { prompt: stored, rawMode: true }
  }
  return {
    prompt: buildCharacterIdentityReferencePromptFromCharacter(character, artStyle),
    rawMode: false,
  }
}

export function seedCastDirectorPrompt(
  character: CastIdentityPromptCharacter,
  artStyle?: string | null
): string {
  return resolveCastIdentityGenerationPrompt(character, artStyle).prompt
}

export function seedWardrobeDirectorPrompt(input: {
  storedPrompt?: string
  characterName: string
  appearanceDescription?: string
  hairStyle?: string
  hairColor?: string
  wardrobeDescription?: string
  wardrobeAccessories?: string
  appearanceNotes?: string
  artStyle?: string | null
}): string {
  const hairAnchor = buildCharacterHairAnchor({
    hairStyle: input.hairStyle,
    hairColor: input.hairColor,
    appearanceDescription: input.appearanceDescription,
  })
  return preferredStoredOrBuiltPrompt(
    input.storedPrompt,
    buildFullBodyWardrobePrompt({
      characterName: input.characterName,
      appearanceDescription: input.appearanceDescription,
      wardrobeDescription: input.wardrobeDescription,
      wardrobeAccessories: input.wardrobeAccessories,
      hairAnchor,
      appearanceNotes: input.appearanceNotes,
      artStyle: input.artStyle,
    })
  )
}

export function seedLocationDirectorPrompt(input: {
  storedPrompt?: string
  locationName: string
  intExt?: string
  timeOfDay?: string
  description?: string
  artStyle?: string | null
}): string {
  return preferredStoredOrBuiltPrompt(
    input.storedPrompt,
    buildLocationBasePrompt(
      input.locationName,
      input.intExt,
      input.timeOfDay,
      input.description,
      input.artStyle ? { artStyle: input.artStyle } : undefined
    )
  )
}

export function seedLocationVersionDirectorPrompt(input: {
  storedPrompt?: string
  locationName: string
  stateNotes: string
  intExt?: string
  timeOfDay?: string
  description?: string
  catalogPropNames?: string[]
  artStyle?: string | null
}): string {
  return preferredStoredOrBuiltPrompt(
    input.storedPrompt,
    buildLocationVersionPrompt({
      locationName: input.locationName,
      stateNotes: input.stateNotes,
      intExt: input.intExt,
      timeOfDay: input.timeOfDay,
      description: input.description,
      catalogPropNames: input.catalogPropNames,
      artStyle: input.artStyle,
    })
  )
}

export function seedObjectDirectorPrompt(
  reference: VisualReference,
  artStyle?: string | null
): string {
  return buildObjectReferencePrompt(reference, artStyle)
}

function kindRules(kind: ReferenceStillKind, artStyle?: string | null): string {
  const rawStyle = artStyle?.trim()
  const isLiveAction = !rawStyle || rawStyle === 'photorealistic' || isPhotorealisticArtStyle(rawStyle)
  if (!isLiveAction && rawStyle) {
    const spec = buildArtStyleSpecFromValue(rawStyle)
    const castAnchor = kindAnchor('cast', rawStyle)
    const wardrobeAnchor = kindAnchor('wardrobe', rawStyle)
    const locAnchor = kindAnchor('location', rawStyle)
    const locVerAnchor = kindAnchor('locationVersion', rawStyle)
    switch (kind) {
      case 'cast':
        return `CAST IDENTITY PLATE (LOCKED ART STYLE — ${spec.title}):
- Render strictly in ${spec.title} (${spec.stylePrompt}). NO live-action human photography.
- Vertical 9:16 head-and-shoulders character reference portrait. Face dominant, eyes in the upper third.
- Neutral relaxed expression, mouth closed, direct eye contact. Plain neutral gray studio backdrop.
- Preserve the character's design (age, ethnicity, facial features, hair, skin tone). Do not invent a celebrity likeness.
- Keep the lead sentence: "${castAnchor}"`
      case 'wardrobe':
        return `WARDROBE PLATE (LOCKED ART STYLE — ${spec.title}):
- Render strictly in ${spec.title} (${spec.stylePrompt}). NO live-action human photography.
- Full-body front-facing standing plate, head to feet including footwear.
- Hands empty at the sides. NO handheld or story props — tools, weapons, bags, documents, phones, cups.
- Exact same character design and face as the attached identity reference.
- Plain neutral gray studio backdrop. Single subject, no collage or turnaround sheet.
- Keep the lead sentence: "${wardrobeAnchor}"`
      case 'location':
        return `LOCATION BASE PLATE (LOCKED ART STYLE — ${spec.title}):
- Render strictly in ${spec.title} (${spec.stylePrompt}). NO live-action photography.
- Extreme-wide establishing shot of an EMPTY set. NO people, silhouettes, or faces.
- Keep architecture, furniture placement, and time-of-day lighting. One unbroken establishing plate, not a grid.
- Keep: "${locAnchor}"`
      case 'locationVersion':
        return `LOCATION SET-VERSION PLATE (LOCKED ART STYLE — ${spec.title}):
- Render strictly in ${spec.title} (${spec.stylePrompt}).
- Same architecture as the base location. Bake ONLY lasting structural set state (damage, redress, flooding).
- NO people. Do NOT add handheld beat props (journals, tools, weapons, bags).
- Keep: "${locVerAnchor}"`
      case 'object':
        return `OBJECT / PROP PLATE (LOCKED ART STYLE — ${spec.title}):
- Render strictly in ${spec.title} (${spec.stylePrompt}). NO live-action product photography.
- Isolated studio reference plate of THIS object only. No people, hands, tables, or staged scenes.
- Entire object visible, true real-world scale, plain backdrop.
- Keep the purpose line: "${OBJECT_REFERENCE_PURPOSE}"`
    }
  }
  switch (kind) {
    case 'cast':
      return `CAST IDENTITY PLATE:
- Keep this a photorealistic 9:16 head-and-shoulders casting headshot. Face dominant, eyes in the upper third.
- Neutral relaxed expression, mouth closed, direct eye contact. Plain neutral gray studio backdrop.
- Preserve the person's appearance (age, ethnicity, bone structure, hair, skin). Do not invent a celebrity likeness.
- Do not write a scene, action beat, or full-body wardrobe turnaround. Outfit may appear at collar/shoulders only.
- Keep the lead sentence: "${CHARACTER_IDENTITY_REFERENCE_ANCHOR}"`
    case 'wardrobe':
      return `WARDROBE PLATE:
- Keep this a photorealistic full-body front-facing standing plate, head to feet including footwear.
- Hands empty at the sides. NO handheld or story props — tools, weapons, bags, documents, phones, cups.
- Same real person as the attached identity reference. Match the face exactly.
- Plain neutral gray studio backdrop. Single subject, no collage or turnaround sheet.
- Keep the lead sentence: "${FULL_BODY_WARDROBE_REFERENCE_ANCHOR}"`
    case 'location':
      return `LOCATION BASE PLATE:
- Extreme-wide establishing shot of an EMPTY set. NO people, silhouettes, or faces.
- Keep architecture, furniture placement, and time-of-day lighting. One unbroken photograph, not a grid.
- Keep: "${LOCATION_TURNAROUND_GENERATION_INSTRUCTION}"`
    case 'locationVersion':
      return `LOCATION SET-VERSION PLATE:
- Same architecture as the base location. Bake ONLY lasting structural set state (damage, redress, flooding).
- NO people. Do NOT add handheld beat props (journals, tools, weapons, bags).
- Keep: "${LOCATION_VERSION_GENERATION_INSTRUCTION}"`
    case 'object':
      return `OBJECT / PROP PLATE:
- Isolated studio product plate of THIS object only. No people, hands, tables, or staged scenes.
- Entire object visible, true real-world scale, plain backdrop.
- Keep the purpose line: "${OBJECT_REFERENCE_PURPOSE}"`
  }
}

export function buildReferenceStillDirectorSystemPrompt(
  kind: ReferenceStillKind,
  artStyle?: string | null
): string {
  const rawStyle = artStyle?.trim()
  const isLiveAction = !rawStyle || rawStyle === 'photorealistic' || isPhotorealisticArtStyle(rawStyle)
  const specificityRule = isLiveAction
    ? '5. The prompt must remain English, concise, and photographically specific.'
    : `5. The prompt must remain English, concise, and faithful to the locked Global Art Style (${buildArtStyleSpecFromValue(rawStyle!).title}) with zero live-action photography drift.`
  return `You are a specialist rewriting a film-production REFERENCE IMAGE prompt so Gemini Image can render a useful library plate on the first attempt.

This is NOT a storyboard beat. Do not invent a scene, camera coverage of action, or extra characters.

${kindRules(kind, artStyle)}

HARD RULES:
1. Keep the subject's identity. Do not rename the person, location, or object. Do not invent new people or handheld props.
2. One still plate. No temporal verbs that imply a beat of action in progress.
3. ${buildPolicySafePhrasingRules()}
4. Return JSON only: { "prompt": "full rewritten generation prompt" }
${specificityRule}`
}

export function buildReferenceStillDirectorUserPrompt(
  request: DirectReferenceStillRequest
): string {
  const parts: string[] = []
  if (request.mode === 'rewrite') {
    parts.push(
      'Rewrite the generation prompt so the plate is photographically unambiguous. Honor USER NOTES; they override conflicting framing but not the plate kind or identity.'
    )
  } else {
    parts.push(
      'Optimize the generation prompt for first-try plate quality. Keep identity. Thicken photographic specifics that this plate kind requires.'
    )
  }
  if (request.policyCompliance) {
    parts.push(
      'SAFETY COMPLIANCE (authoritative): Rewrite so Google Gemini Image RAI will accept the still. Follow these rules. Keep the subject name.'
    )
    parts.push(buildPolicySafePhrasingRules())
  }
  parts.push('')
  parts.push(`KIND: ${request.kind}`)

  const ctx = request.context
  if (ctx) {
    const lines = [
      ctx.name && `Name: ${ctx.name}`,
      ctx.appearance && `Appearance: ${ctx.appearance}`,
      ctx.outfit && `Outfit: ${ctx.outfit}`,
      ctx.accessories && `Accessories: ${ctx.accessories}`,
      ctx.appearanceNotes && `Appearance notes: ${ctx.appearanceNotes}`,
      ctx.locationName && `Location: ${ctx.locationName}`,
      ctx.intExt && `INT/EXT: ${ctx.intExt}`,
      ctx.timeOfDay && `Time of day: ${ctx.timeOfDay}`,
      ctx.description && `Description: ${ctx.description}`,
      ctx.stateNotes && `Set state: ${ctx.stateNotes}`,
      ctx.category && `Category: ${ctx.category}`,
    ].filter(Boolean)
    if (lines.length > 0) {
      parts.push('ASSET CONTEXT:')
      parts.push(lines.join('\n'))
      parts.push('')
    }
  }

  const notes = request.userDirection?.trim()
  if (notes) {
    parts.push('USER NOTES (authoritative for this plate; do not replace identity):')
    parts.push(notes)
    parts.push('')
  }

  parts.push('CURRENT PROMPT:')
  parts.push(request.currentPrompt.trim() || '(empty)')
  return parts.join('\n')
}

export function fallbackReferenceStillPrompt(request: DirectReferenceStillRequest): string {
  const overlaid = overlayUserDirectionOnPrompt(request.currentPrompt, request.userDirection)
  const anchored = ensureReferenceKindAnchor(request.kind, overlaid, request.artStyle)
  return request.policyCompliance ? applyPolicyComplianceToPrompt(anchored) : anchored
}
