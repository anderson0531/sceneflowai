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

import { buildLocationPromptToken, buildPropPromptToken } from '@/lib/imagen/structuredStillPrompt'

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
  return `${referencePrefix(sendIndex)}IDENTITY + WARDROBE of ${subjectSuffix(
    characterName,
    personTokenIndex
  )} — LEFT panel = face, RIGHT panel = outfit`
}

export function buildSceneImagePropLabel(
  propName: string,
  sendIndex?: number,
  promptToken?: string
): string {
  const token = promptToken || (sendIndex != null ? buildPropPromptToken(sendIndex) : '')
  return `${referencePrefix(sendIndex)}PROP ${token ? `${token} ` : ''}(${propName})`
}

export function buildSceneImageLocationLabel(
  locationName: string,
  sendIndex?: number,
  promptToken?: string
): string {
  const token = promptToken || (sendIndex != null ? buildLocationPromptToken(sendIndex) : '')
  return `${referencePrefix(sendIndex)}LOCATION ${
    token ? `${token} ` : ''
  }(${locationName}) — extreme-wide establishing shot`
}
