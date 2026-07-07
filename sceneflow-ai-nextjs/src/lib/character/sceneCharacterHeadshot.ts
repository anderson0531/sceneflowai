/**
 * Scene-specific character headshot generation for beat frame consistency.
 * Combines identity reference + scene wardrobe + beat-directed appearance (makeup, bruises, hair).
 */

import { generateImageWithGeminiStudio } from '@/lib/gemini/geminiStudioImageClient'
import { uploadImageToBlob } from '@/lib/storage/blob'
import {
  buildCharacterHairAnchor,
  buildCharacterHairDescription,
  buildWardrobeDiptychReferenceLabel,
  resolveWardrobeForCharacter,
} from '@/lib/character/characterReferenceAssembly'
import { buildFullBodyWardrobePrompt } from '@/lib/character/characterReferencePrompts'
import { stripDialoguePrompt } from '@/lib/vision/framePromptBaseline'

export const FULL_BODY_WARDROBE_ASPECT_RATIO = '3:4' as const
export const FULL_BODY_WARDROBE_IMAGE_SIZE = '2K' as const
export const FULL_BODY_WARDROBE_MODEL_TIER = 'designer' as const

export const SCENE_CHARACTER_HEADSHOT_ASPECT_RATIO = '16:9' as const
export const SCENE_CHARACTER_HEADSHOT_IMAGE_SIZE = '2K' as const
export const SCENE_CHARACTER_HEADSHOT_MODEL_TIER = 'designer' as const

export const SCENE_CHARACTER_HEADSHOT_ANCHOR =
  'Photorealistic cinematic 16:9 character wardrobe reference diptych for scene beat consistency.'

/** How beat frame generation should consume a wardrobe diptych reference image. */
export const WARDROBE_DIPTYCH_CONSUMPTION_INSTRUCTION =
  'CRITICAL — WARDROBE CHARACTER REFERENCE (diptych): ' +
  'LEFT half = identity source of truth (face, hair, skin tone, age, ethnicity, makeup, injuries). ' +
  'RIGHT half = wardrobe source of truth (garments, footwear, accessories, fit, fabric, color). ' +
  'NEVER derive face or identity from the RIGHT panel. NEVER derive clothing or outfit from the LEFT panel. ' +
  'Render one seamless cinematic scene — do NOT reproduce the two-panel split, diptych layout, or reference sheet collage.'

/** Negative terms to prevent beat frames from reproducing the reference diptych layout. */
export const DIPTYCH_REPRODUCTION_NEGATIVE_PROMPT =
  'split-screen output, diptych, two-panel layout, reference sheet collage, side-by-side panels, outfit in close-up, face from full-body panel, mismatched identity between panels'

/** Negative terms when generating the wardrobe diptych reference itself. */
export const DIPTYCH_GENERATION_NEGATIVE_PROMPT =
  'outfit visible in left panel, clothing in close-up, different face between panels, identity mismatch between panels, full-body framing in left panel'

/** Reference image label for beat frame attachment. */
export { buildWardrobeDiptychReferenceLabel } from '@/lib/character/characterReferenceAssembly'

/** Per-character consumption line appended to beat frame prompts. */
export function buildWardrobeDiptychCharacterConsumptionLine(
  characterName: string,
  personTokenIndex?: number
): string {
  const personPart = personTokenIndex != null ? `person [${personTokenIndex}]` : characterName
  return `${characterName} (${personPart}): use LEFT panel for face/identity only, RIGHT panel for outfit/wardrobe only — outfit applies to ${personPart} only.`
}
/** Negative terms targeting physics violations and object hallucinations. */
export const PHYSICS_HALLUCINATION_NEGATIVE_PROMPT =
  'floating objects, missing limbs, physically impossible anatomy, multiple limbs, floating chairs, sitting without a chair, chairs on tables, hallucinated objects, impossible physics, mutated bodies, deformed furniture, objects defying gravity, clipping geometry'

const MAKEUP_PATTERN =
  /\b(makeup|lipstick|eyeliner|mascara|foundation|contour|blush|cosmetic|smudged makeup|runny mascara)\b/i
const INJURY_PATTERN =
  /\b(bruise|contusion|laceration|cut|scar|black eye|swelling|wound|injury|gash|scratch|bloodshot|split lip|bandage|stitches)\b/i
const HAIR_CHANGE_PATTERN =
  /\b(hair (?:pulled back|tied|in a bun|in a ponytail|down|wet|disheveled|mussed)|ponytail|topknot|slicked back|loose waves)\b/i

export interface SceneAppearanceDirectives {
  makeup?: string
  injuries?: string
  hairNotes?: string
  hasSceneSpecificChanges: boolean
}

export interface FullBodyWardrobeInput {
  characterName: string
  identityReferenceUrl: string
  wardrobeDescription?: string
  wardrobeAccessories?: string
  hairStyle?: string
  hairColor?: string
  appearanceDescription?: string
  /** Existing full-body wardrobe URL — reused unless forceRegenerate */
  existingFullBodyUrl?: string
  forceRegenerate?: boolean
}

export interface SceneCharacterHeadshotInput {
  characterName: string
  identityReferenceUrl: string
  wardrobeDescription?: string
  wardrobeAccessories?: string
  beatAction?: string
  sceneAction?: string
  emotion?: string
  hairStyle?: string
  hairColor?: string
  appearanceDescription?: string
  /** Makeup, hair state, visible injuries/marks for this wardrobe look */
  appearanceNotes?: string
  /** Existing wardrobe headshot — reused when no beat-specific appearance changes */
  existingWardrobeHeadshotUrl?: string
  /** When set, skip legacy diptych generation (face-first full-body wardrobe ref exists). */
  existingFullBodyWardrobeUrl?: string
  /** When true, always generate a fresh image (skip cache reuse) */
  forceRegenerate?: boolean
}

export interface SimplifiedBeatFramePromptInput {
  beatAction: string
  characters: Array<{ name: string; referenceIndex: number; emotion?: string }>
  artStyleSuffix?: string
  locationRefLine?: string
}

export interface ResolveSceneHeadshotCharacterInput {
  name: string
  referenceUrl?: string
  sceneHeadshotUrl?: string
  wardrobe?: string
  wardrobeAccessories?: string
  emotion?: string
  hairStyle?: string
  hairColor?: string
  appearance?: string
  /** Full character record for wardrobe resolution */
  characterRecord?: Record<string, unknown>
  scene?: Record<string, unknown> | null
  sceneIndex?: number
  selectedWardrobeId?: string
  /** When true, skip legacy diptych generation (identity + fullBodyUrl dual refs). */
  hasDualReferences?: boolean
}

/** Extract makeup, injury, and hair notes from beat/scene text for headshot generation. */
export function extractSceneAppearanceDirectives(
  beatAction?: string,
  sceneAction?: string
): SceneAppearanceDirectives {
  const source = `${beatAction || ''} ${sceneAction || ''}`.trim()
  if (!source) {
    return { hasSceneSpecificChanges: false }
  }

  const sentences = source
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)

  const makeupParts: string[] = []
  const injuryParts: string[] = []
  const hairParts: string[] = []

  for (const sentence of sentences) {
    if (MAKEUP_PATTERN.test(sentence)) makeupParts.push(sentence)
    if (INJURY_PATTERN.test(sentence)) injuryParts.push(sentence)
    if (HAIR_CHANGE_PATTERN.test(sentence)) hairParts.push(sentence)
  }

  const makeup = makeupParts.length ? makeupParts.join(' ') : undefined
  const injuries = injuryParts.length ? injuryParts.join(' ') : undefined
  const hairNotes = hairParts.length ? hairParts.join(' ') : undefined

  return {
    makeup,
    injuries,
    hairNotes,
    hasSceneSpecificChanges: !!(makeup || injuries || hairNotes),
  }
}

export function mergePhysicsNegativePrompt(existing?: string | null): string {
  const parts = [PHYSICS_HALLUCINATION_NEGATIVE_PROMPT]
  const trimmed = existing?.trim()
  if (trimmed) parts.push(trimmed)
  return [...new Set(parts.join(', ').split(/,\s*/).map((p) => p.trim()).filter(Boolean))].join(', ')
}

/** Merge physics + diptych reproduction negatives for beat frame generation. */
export function mergeBeatFrameNegativePrompt(existing?: string | null): string {
  return mergePhysicsNegativePrompt(
    [DIPTYCH_REPRODUCTION_NEGATIVE_PROMPT, existing].filter(Boolean).join(', ')
  )
}

/** Build merged scene/appearance context for directive extraction. */
function mergeAppearanceContext(input: SceneCharacterHeadshotInput): string {
  return [input.sceneAction, input.appearanceNotes].filter(Boolean).join(' ').trim()
}

/** Build cinematic 16:9 diptych reference prompt from identity + wardrobe + scene-directed appearance. */
export function buildSceneCharacterHeadshotPrompt(input: SceneCharacterHeadshotInput): string {
  const appearanceContext = mergeAppearanceContext(input)
  const directives = extractSceneAppearanceDirectives(input.beatAction, appearanceContext)
  const hairAnchor =
    buildCharacterHairAnchor({
      hairStyle: input.hairStyle,
      hairColor: input.hairColor,
      appearanceDescription: input.appearanceDescription,
    }) ??
    buildCharacterHairDescription({
      hairStyle: input.hairStyle,
      hairColor: input.hairColor,
    })

  const lines = [
    SCENE_CHARACTER_HEADSHOT_ANCHOR,
    '',
    `Character: ${input.characterName}. Same real human in both panels.`,
    '',
    'Layout: horizontal two-panel diptych, equal width, neutral soft studio background.',
    '',
    'LEFT panel (50% width) — IDENTITY close-up:',
    'Match the identity reference image exactly: face shape, skin tone, age, ethnicity, bone structure.',
    'Tight crop — face and hair fill the panel; neck only. NO clothing, NO outfit details visible.',
  ]

  const leftPanelDetails: string[] = []
  if (hairAnchor) {
    leftPanelDetails.push(`Hairstyle: ${hairAnchor}.`)
  } else if (directives.hairNotes) {
    leftPanelDetails.push(`Hairstyle: ${directives.hairNotes}.`)
  }
  if (directives.makeup) {
    leftPanelDetails.push(`Makeup: ${directives.makeup}.`)
  }
  if (directives.injuries) {
    leftPanelDetails.push(
      `Visible injuries/marks: ${directives.injuries}. Preserve reference hairstyle — do not restyle hair to expose injuries.`
    )
  }
  if (
    input.appearanceNotes?.trim() &&
    !directives.makeup &&
    !directives.injuries &&
    !directives.hairNotes
  ) {
    leftPanelDetails.push(`Scene appearance: ${input.appearanceNotes.trim()}.`)
  } else if (input.appearanceNotes?.trim()) {
    leftPanelDetails.push(`Scene appearance (continuity): ${input.appearanceNotes.trim()}.`)
  }
  if (input.emotion?.trim()) {
    leftPanelDetails.push(`Expression/emotion: ${input.emotion.trim()}.`)
  }
  if (leftPanelDetails.length) {
    lines.push(...leftPanelDetails)
  }

  lines.push(
    '',
    'RIGHT panel (50% width) — WARDROBE full body:',
    'Full-length front-facing standing pose — head to feet visible; relaxed neutral stand.',
    'This panel exists solely to show the complete outfit. Face must match the LEFT panel.',
    'Do NOT use this panel for identity in downstream frames — wardrobe fidelity only (fabric, color, fit, footwear, accessories).'
  )

  const wardrobeParts = [input.wardrobeDescription?.trim(), input.wardrobeAccessories?.trim()].filter(
    Boolean
  ) as string[]
  if (wardrobeParts.length) {
    lines.push(`Wearing: ${wardrobeParts.join('. ')}.`)
  }

  lines.push(
    '',
    'Output one 16:9 diptych reference sheet with exactly two photorealistic panels side by side.',
    'No text labels, watermarks, mannequins, multi-view turnaround grids, or 4-panel sheets.'
  )

  return lines.join('\n')
}

/** Simplified beat start-frame prompt — references wardrobe headshot only; includes directed emotion. */
export function buildSimplifiedBeatFramePrompt(input: SimplifiedBeatFramePromptInput): string {
  const subjects =
    input.characters.map((c) => `person [${c.referenceIndex}]`).join(' and ') || 'the subject'
  const action = stripDialoguePrompt(input.beatAction.trim())
  const emotionLines = input.characters
    .filter((c) => c.emotion?.trim())
    .map((c) => `${c.name}: ${c.emotion!.trim()}`)

  const lines = [
    `Cinematic film frame featuring ${subjects}.`,
    `Action: ${action}`,
  ]

  if (emotionLines.length) {
    lines.push(`Directed emotion: ${emotionLines.join('; ')}.`)
  }

  lines.push(
    'Match each character from their wardrobe diptych reference: LEFT panel for face, hair, skin, makeup, and injuries ONLY; RIGHT panel for full-body wardrobe and accessories ONLY.',
    'Do not describe clothing or costume in text — copy outfit from the RIGHT panel of each character diptych reference.',
    'NEVER derive face/identity from the RIGHT panel. NEVER derive clothing from the LEFT panel.'
  )

  if (input.locationRefLine?.trim()) {
    lines.push(input.locationRefLine.trim())
  }
  if (input.artStyleSuffix?.trim()) {
    lines.push(`Style: ${input.artStyleSuffix.trim()}`)
  }

  return lines.join('\n')
}

export function resolveWardrobeTextForCharacter(
  character: Record<string, unknown>,
  scene?: Record<string, unknown> | null,
  sceneIndex?: number,
  selectedWardrobeId?: string
): { description?: string; accessories?: string; headshotUrl?: string; fullBodyUrl?: string; appearanceNotes?: string } {
  let resolved = resolveWardrobeForCharacter(character, scene, undefined, sceneIndex)

  if (selectedWardrobeId && Array.isArray(character.wardrobes)) {
    const picked = (character.wardrobes as Record<string, unknown>[]).find(
      (w) => w.id === selectedWardrobeId
    )
    if (picked) resolved = picked
  }

  if (!resolved) {
    const legacy = character.defaultWardrobe as string | undefined
    return legacy ? { description: legacy } : {}
  }

  return {
    description: resolved.description as string | undefined,
    accessories: resolved.accessories as string | undefined,
    headshotUrl: resolved.headshotUrl as string | undefined,
    fullBodyUrl: resolved.fullBodyUrl as string | undefined,
    appearanceNotes: resolved.appearanceNotes as string | undefined,
  }
}

/** Decide whether to reuse an existing wardrobe headshot or generate a scene-specific one. */
export function shouldGenerateSceneHeadshot(
  input: SceneCharacterHeadshotInput
): boolean {
  if (!input.identityReferenceUrl?.trim()) return false
  // Face-first model: dedicated full-body wardrobe ref replaces diptych generation.
  if (input.existingFullBodyWardrobeUrl?.trim()) return false
  const appearanceContext = mergeAppearanceContext(input)
  const directives = extractSceneAppearanceDirectives(input.beatAction, appearanceContext)
  if (directives.hasSceneSpecificChanges) return true
  if (input.emotion?.trim()) return true
  if (input.wardrobeDescription?.trim() && !input.existingWardrobeHeadshotUrl) return true
  if (input.appearanceNotes?.trim() && !input.existingWardrobeHeadshotUrl) return true
  return false
}

export function pickSceneHeadshotUrl(input: SceneCharacterHeadshotInput): string | undefined {
  if (input.forceRegenerate) return undefined
  if (input.existingWardrobeHeadshotUrl && !shouldGenerateSceneHeadshot(input)) {
    return input.existingWardrobeHeadshotUrl
  }
  return undefined
}

export function pickFullBodyWardrobeUrl(input: FullBodyWardrobeInput): string | undefined {
  if (input.forceRegenerate) return undefined
  const existing = input.existingFullBodyUrl?.trim()
  return existing || undefined
}

export async function generateFullBodyWardrobeImage(
  input: FullBodyWardrobeInput
): Promise<{ imageBase64: string; prompt: string }> {
  const hairAnchor =
    buildCharacterHairAnchor({
      hairStyle: input.hairStyle,
      hairColor: input.hairColor,
      appearanceDescription: input.appearanceDescription,
    }) ??
    buildCharacterHairDescription({
      hairStyle: input.hairStyle,
      hairColor: input.hairColor,
    })

  const prompt = buildFullBodyWardrobePrompt({
    characterName: input.characterName,
    appearanceDescription: input.appearanceDescription,
    wardrobeDescription: input.wardrobeDescription,
    wardrobeAccessories: input.wardrobeAccessories,
    hairAnchor,
  })

  const result = await generateImageWithGeminiStudio({
    prompt,
    aspectRatio: FULL_BODY_WARDROBE_ASPECT_RATIO,
    imageSize: FULL_BODY_WARDROBE_IMAGE_SIZE,
    modelTier: FULL_BODY_WARDROBE_MODEL_TIER,
    referenceImages: [
      {
        imageUrl: input.identityReferenceUrl,
        name: `Identity: ${input.characterName}`,
      },
    ],
    negativePrompt: mergePhysicsNegativePrompt(
      'mannequin, faceless figure, turnaround sheet, diptych, split panel, illustration, cartoon'
    ),
  })

  return { imageBase64: result.imageBase64, prompt }
}

export async function generateAndUploadFullBodyWardrobe(
  input: FullBodyWardrobeInput,
  uploadPath: string
): Promise<{ imageUrl: string; prompt: string; generated: boolean }> {
  const cached = pickFullBodyWardrobeUrl(input)
  if (cached) {
    return { imageUrl: cached, prompt: 'Reused full-body wardrobe reference', generated: false }
  }

  const { imageUrl, prompt } = await (async () => {
    const { imageBase64, prompt } = await generateFullBodyWardrobeImage(input)
    const imageUrl = await uploadImageToBlob(imageBase64, uploadPath)
    return { imageUrl, prompt }
  })()
  return { imageUrl, prompt, generated: true }
}

export async function generateSceneCharacterHeadshotImage(
  input: SceneCharacterHeadshotInput
): Promise<{ imageBase64: string; prompt: string }> {
  const prompt = buildSceneCharacterHeadshotPrompt(input)
  const result = await generateImageWithGeminiStudio({
    prompt,
    aspectRatio: SCENE_CHARACTER_HEADSHOT_ASPECT_RATIO,
    imageSize: SCENE_CHARACTER_HEADSHOT_IMAGE_SIZE,
    modelTier: SCENE_CHARACTER_HEADSHOT_MODEL_TIER,
    referenceImages: [
      {
        imageUrl: input.identityReferenceUrl,
        name: `Identity: ${input.characterName}`,
      },
    ],
    negativePrompt: mergePhysicsNegativePrompt(DIPTYCH_GENERATION_NEGATIVE_PROMPT),
  })
  return { imageBase64: result.imageBase64, prompt }
}

export async function generateAndUploadSceneCharacterHeadshot(
  input: SceneCharacterHeadshotInput,
  uploadPath: string
): Promise<{ imageUrl: string; prompt: string; generated: boolean }> {
  const cached = pickSceneHeadshotUrl(input)
  if (cached) {
    return { imageUrl: cached, prompt: 'Reused wardrobe headshot reference', generated: false }
  }

  const { imageUrl, prompt } = await (async () => {
    const { imageBase64, prompt } = await generateSceneCharacterHeadshotImage(input)
    const imageUrl = await uploadImageToBlob(imageBase64, uploadPath)
    return { imageUrl, prompt }
  })()
  return { imageUrl, prompt, generated: true }
}

/** Resolve scene headshot URLs for beat frame generation (generate when needed). */
export async function resolveSceneHeadshotsForBeatCharacters(args: {
  characters: ResolveSceneHeadshotCharacterInput[]
  beatAction: string
  sceneAction?: string
  uploadPathPrefix: string
}): Promise<
  Array<{
    name: string
    sceneHeadshotUrl?: string
    emotion?: string
    generated: boolean
  }>
> {
  const results: Array<{
    name: string
    sceneHeadshotUrl?: string
    emotion?: string
    generated: boolean
  }> = []

  for (const char of args.characters) {
    if (!char.referenceUrl?.trim()) {
      results.push({ name: char.name, generated: false })
      continue
    }

    if (char.hasDualReferences) {
      results.push({ name: char.name, generated: false })
      continue
    }

    const record = char.characterRecord ?? {}
    const wardrobe = resolveWardrobeTextForCharacter(
      record,
      char.scene,
      char.sceneIndex,
      char.selectedWardrobeId
    )

    if (wardrobe.fullBodyUrl?.trim() && !wardrobe.headshotUrl?.trim()) {
      results.push({ name: char.name, generated: false })
      continue
    }

    const sceneMatchedHeadshotUrl = wardrobe.headshotUrl?.trim()

    if (char.sceneHeadshotUrl?.trim()) {
      const passedUrl = char.sceneHeadshotUrl.trim()
      if (sceneMatchedHeadshotUrl && passedUrl !== sceneMatchedHeadshotUrl) {
        console.warn(
          `[Scene Headshot] Stale sceneHeadshotUrl for ${char.name}; using scene-matched wardrobe diptych instead`
        )
      } else {
        results.push({
          name: char.name,
          sceneHeadshotUrl: passedUrl,
          emotion: char.emotion,
          generated: false,
        })
        continue
      }
    }

    const headshotInput: SceneCharacterHeadshotInput = {
      characterName: char.name,
      identityReferenceUrl: char.referenceUrl,
      wardrobeDescription: char.wardrobe || wardrobe.description,
      wardrobeAccessories: char.wardrobeAccessories || wardrobe.accessories,
      beatAction: args.beatAction,
      sceneAction: args.sceneAction,
      emotion: char.emotion,
      hairStyle: char.hairStyle,
      hairColor: char.hairColor,
      appearanceDescription: char.appearance,
      appearanceNotes: wardrobe.appearanceNotes,
      existingWardrobeHeadshotUrl: wardrobe.headshotUrl,
      existingFullBodyWardrobeUrl: wardrobe.fullBodyUrl,
    }

    const cached = pickSceneHeadshotUrl(headshotInput)
    if (cached) {
      results.push({
        name: char.name,
        sceneHeadshotUrl: cached,
        emotion: char.emotion,
        generated: false,
      })
      continue
    }

    const safeName = char.name.replace(/[^a-z0-9_-]+/gi, '-').toLowerCase()
    const uploadPath = `${args.uploadPathPrefix}/${safeName}-scene-headshot-${Date.now()}.png`
    const uploaded = await generateAndUploadSceneCharacterHeadshot(headshotInput, uploadPath)
    results.push({
      name: char.name,
      sceneHeadshotUrl: uploaded.imageUrl,
      emotion: char.emotion,
      generated: uploaded.generated,
    })
  }

  return results
}
