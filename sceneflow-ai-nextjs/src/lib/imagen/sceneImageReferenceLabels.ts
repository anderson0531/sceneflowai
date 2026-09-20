/**
 * Reference image labels for scene and beat frame generation.
 *
 * Every channel in one request has to name a reference the same way. Before
 * this, a single character arrived as "Identity reference 1: Char_Gideon_Croft"
 * on the image, "Reference image 1: IDENTITY REFERENCE = person [1]" in the
 * wrapper, "person [1] = Gideon Croft" in the legend, and "person [1]" in the
 * action — four names for one subject, and nothing stating they were the same.
 * These labels lead with the send index the wrapper uses and carry the person
 * token the action uses, so the binding is stated rather than inferred.
 *
 * The video pipeline keeps its own `Char_` aliased labels
 * (`characterPromptAlias`): its prompt text is written in aliases, so its
 * labels have to match that, not these.
 */

import { isWideEstablishingShotType } from '@/lib/character/characterReferenceAssembly'
import { propScaleClause } from '@/lib/imagen/propScaleClause'
import { buildLocationPromptToken, buildPropPromptToken } from '@/lib/imagen/structuredStillPrompt'
import {
  isMediumCoverageLocationShot,
  resolveStillShotClass,
} from '@/lib/imagen/stillFramingNormalize'
import { extractMountedSetFixturePhrases } from '@/lib/vision/mountedSetFixtures'

export const LOCATION_PLATE_NAMED_HARDWARE_CLAUSE =
  'built-in hardware in this plate is the named object — use it, do not invent a second copy'

function referencePrefix(sendIndex?: number): string {
  return sendIndex != null ? `Reference image ${sendIndex} — ` : ''
}

function subjectSuffix(characterName: string, personTokenIndex?: number): string {
  return personTokenIndex != null
    ? `person [${personTokenIndex}] (${characterName})`
    : characterName
}

export function buildSceneImageIdentityLabel(
  characterName: string,
  sendIndex?: number,
  personTokenIndex?: number
): string {
  return `${referencePrefix(sendIndex)}IDENTITY of ${subjectSuffix(characterName, personTokenIndex)}`
}

export function buildSceneImageWardrobeLabel(
  characterName: string,
  sendIndex?: number,
  personTokenIndex?: number
): string {
  return `${referencePrefix(sendIndex)}WARDROBE of ${subjectSuffix(
    characterName,
    personTokenIndex
  )} — full-body outfit`
}

export function buildSceneImageDiptychLabel(
  characterName: string,
  sendIndex?: number,
  personTokenIndex?: number
): string {
  return `${referencePrefix(sendIndex)}CHARACTER REFERENCE of ${subjectSuffix(
    characterName,
    personTokenIndex
  )} — face and full-body wardrobe of the same person`
}

export function buildSceneImagePropLabel(
  propName: string,
  sendIndex?: number,
  promptToken?: string,
  description?: string
): string {
  const token = promptToken || (sendIndex != null ? buildPropPromptToken(sendIndex) : '')
  const scale = propScaleClause(description, propName)
  return `${referencePrefix(sendIndex)}PROP ${token ? `${token} ` : ''}(${propName}): ${scale}`
}

export function buildSceneImageLocationLabel(
  locationName: string,
  sendIndex?: number,
  promptToken?: string,
  options?: {
    shotType?: string | null
    actionFraming?: string | null
    emptyCast?: boolean
  }
): string {
  const token = promptToken || (sendIndex != null ? buildLocationPromptToken(sendIndex) : '')
  const shot = resolveStillShotClass(options?.shotType, options?.actionFraming)
  const emptyCast = options?.emptyCast ?? false
  const hint = shot.shotHint || options?.shotType || ''
  const asEnvironment =
    (emptyCast && shot.isInsertOrEcu) ||
    isMediumCoverageLocationShot(hint) ||
    (!!hint.trim() && !shot.isDetail && !isWideEstablishingShotType(hint))
  let dialect = 'extreme-wide establishing shot'
  if (emptyCast && shot.isInsertOrEcu) {
    dialect =
      'environment plate — match near-field materials, not a wide establishing shot'
  } else if (shot.isDetail && !isMediumCoverageLocationShot(hint)) {
    dialect = 'environment plate — match lighting and palette in background bokeh'
  } else if (asEnvironment) {
    dialect =
      'environment plate — match architecture, palette, and lighting; not a second wide subject'
  }
  if (extractMountedSetFixturePhrases(options?.actionFraming || '').length > 0) {
    dialect = `${dialect}; ${LOCATION_PLATE_NAMED_HARDWARE_CLAUSE}`
  }
  return `${referencePrefix(sendIndex)}LOCATION ${
    token ? `${token} ` : ''
  }(${locationName}) — ${dialect}`
}
