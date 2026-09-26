/**
 * Captions for scene and beat frame plates.
 *
 * The text part immediately before each image says what that image is, using
 * the same `person [N]` / `prop [N]` / `location [N]` token as the instruction.
 * Shot rules (bokeh, near-field, do not copy the card) stay in the task.
 */

import { buildLocationPromptToken, buildPropPromptToken } from '@/lib/imagen/structuredStillPrompt'
import { formatNextImageCaption } from '@/lib/vision/referenceImageBinding'

function personToken(sendIndex?: number, personTokenIndex?: number): string {
  if (personTokenIndex != null) return `person [${personTokenIndex}]`
  if (sendIndex != null) return `person [${sendIndex}]`
  return 'person [1]'
}

export function buildSceneImageIdentityLabel(
  _characterName: string,
  sendIndex?: number,
  personTokenIndex?: number
): string {
  return formatNextImageCaption({ role: 'identity', token: personToken(sendIndex, personTokenIndex) })
}

export function buildSceneImageWardrobeLabel(
  _characterName: string,
  sendIndex?: number,
  personTokenIndex?: number
): string {
  return formatNextImageCaption({ role: 'wardrobe', token: personToken(sendIndex, personTokenIndex) })
}

export function buildSceneImageDiptychLabel(
  _characterName: string,
  sendIndex?: number,
  personTokenIndex?: number
): string {
  return formatNextImageCaption({ role: 'character', token: personToken(sendIndex, personTokenIndex) })
}

export function buildSceneImagePropLabel(
  _propName: string,
  sendIndex?: number,
  promptToken?: string,
  _description?: string
): string {
  const token = promptToken || (sendIndex != null ? buildPropPromptToken(sendIndex) : 'prop [1]')
  return formatNextImageCaption({ role: 'prop', token })
}

export function buildSceneImageLocationLabel(
  _locationName: string,
  sendIndex?: number,
  promptToken?: string,
  _options?: {
    shotType?: string | null
    actionFraming?: string | null
    emptyCast?: boolean
  }
): string {
  const token =
    promptToken || (sendIndex != null ? buildLocationPromptToken(sendIndex) : 'location [1]')
  return formatNextImageCaption({ role: 'location', token })
}
