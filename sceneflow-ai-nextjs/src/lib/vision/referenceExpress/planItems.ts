import '@/models'
import { Project } from '@/models/Project'
import { resolveCharacterId } from '@/lib/vision/updateCharacterReference'
import type { CastingBriefVoiceConfig } from '@/lib/character/applyCastingBriefUpdate'
import type { ScreenplayContext } from '@/lib/voiceRecommendation'
import { fingerprintSource, type ReferenceExpressItem } from './types'

export type CastSource = {
  id?: string
  name?: string
  type?: string
  role?: string
  gender?: string
  ethnicity?: string
  referenceImage?: string
  description?: string
  appearance?: string
  appearanceDescription?: string
  age?: string | number
  personality?: string
  defaultWardrobe?: string
  wardrobeAccessories?: string
  voiceDescription?: string
  voiceConfig?: CastingBriefVoiceConfig
  wardrobes?: Array<{ description?: string; accessories?: string; isDefault?: boolean }>
  [key: string]: unknown
}

export type LocationSource = {
  id: string
  location?: string
  locationDisplay?: string
  imageUrl?: string
  intExt?: string
  timeOfDay?: string
  description?: string
  [key: string]: unknown
}

export type PropSource = {
  id: string
  name?: string
  imageUrl?: string
  description?: string
  generationPrompt?: string
  category?: string
  [key: string]: unknown
}

export type ReferenceExpressPlanInput = {
  characters: CastSource[]
  locations: LocationSource[]
  props: PropSource[]
}

/** Age arrives as either a band ("late 50s") or a number, depending on the source. */
export function castAgeText(age?: string | number): string | undefined {
  return age == null || age === '' ? undefined : String(age)
}

/** Prompt inputs for a cast item, in the order `buildCharacterReferencePrompt` reads them. */
export function castFingerprint(character: CastSource): string {
  const defaultWardrobe = (character.wardrobes || []).find((w) => w?.isDefault)
  return fingerprintSource([
    character.name,
    character.description,
    character.appearance,
    character.appearanceDescription,
    castAgeText(character.age),
    character.personality,
    character.defaultWardrobe ?? defaultWardrobe?.description,
    character.wardrobeAccessories ?? defaultWardrobe?.accessories,
  ])
}

export function locationFingerprint(location: LocationSource): string {
  return fingerprintSource([
    location.location,
    location.intExt,
    location.timeOfDay,
    location.description,
  ])
}

export function propFingerprint(prop: PropSource): string {
  return fingerprintSource([
    prop.name,
    prop.description,
    prop.generationPrompt,
    prop.category,
  ])
}

const hasImage = (url?: string): boolean => Boolean(url && url.trim())

/**
 * Plan the batch: every reference still missing an image, cast first so
 * character identity exists before locations and props are drawn around it.
 *
 * Narrators are skipped — they have no on-screen appearance to render.
 */
export function planReferenceExpressItems(
  input: ReferenceExpressPlanInput
): ReferenceExpressItem[] {
  const items: ReferenceExpressItem[] = []

  input.characters.forEach((character, index) => {
    if (character.type === 'narrator') return
    if (hasImage(character.referenceImage)) return
    items.push({
      kind: 'cast',
      targetId: resolveCharacterId(character, index),
      label: character.name?.trim() || `Character ${index + 1}`,
      sourceFingerprint: castFingerprint(character),
    })
  })

  input.locations.forEach((location) => {
    if (hasImage(location.imageUrl)) return
    if (!location.id) return
    items.push({
      kind: 'location',
      targetId: location.id,
      label: location.location?.trim() || location.locationDisplay?.trim() || 'Location',
      sourceFingerprint: locationFingerprint(location),
    })
  })

  input.props.forEach((prop) => {
    if (hasImage(prop.imageUrl)) return
    if (!prop.id) return
    items.push({
      kind: 'prop',
      targetId: prop.id,
      label: prop.name?.trim() || 'Prop',
      sourceFingerprint: propFingerprint(prop),
    })
  })

  return items
}

export type ReferenceExpressContext = ReferenceExpressPlanInput & {
  /** Same shape the vision page passes to the Casting Brief generator. */
  screenplayContext: ScreenplayContext
}

/** Read the reference slices of a project's metadata. */
export async function loadReferenceExpressContext(
  projectId: string
): Promise<ReferenceExpressContext | null> {
  const project = await Project.findByPk(projectId)
  if (!project) return null

  const metadata: Record<string, any> = project.metadata || {}
  const visionPhase: Record<string, any> = metadata.visionPhase || {}
  const references: Record<string, any> = visionPhase.references || {}
  const treatment: Record<string, any> = metadata.filmTreatmentVariant || {}

  return {
    characters: Array.isArray(visionPhase.characters) ? visionPhase.characters : [],
    locations: Array.isArray(references.locationReferences)
      ? references.locationReferences
      : [],
    props: Array.isArray(references.objectReferences) ? references.objectReferences : [],
    screenplayContext: {
      genre: project.genre,
      tone: project.tone || treatment.tone_description || treatment.tone,
      setting: treatment.setting,
      logline: visionPhase.script?.logline || project.description,
    },
  }
}
