/**
 * Backdrop Generator
 * 
 * Generates backdrop prompts from scene direction metadata using 4 distinct modes:
 * 1. Atmospheric B-Roll - Focus on environmental details and mood
 * 2. Silent Portrait - Character psychology without dialogue
 * 3. Establishing Master - Location and spatial geography
 * 4. Storybeat Animatic - Stylized storyboard/sketch visualization
 */

import { DetailedSceneDirection } from '@/types/scene-direction'

export type BackdropMode = 'atmospheric' | 'portrait' | 'master' | 'animatic'

export interface BackdropModeConfig {
  id: BackdropMode
  name: string
  subtitle: string
  description: string
  bestFor: string[]
  icon: string // Lucide icon name
  allowPeople: boolean
  priorityFields: string[]
  styleModifiers: string[]
  lensDefault: string
  negativePrompt?: string
}

export const BACKDROP_MODES: Record<BackdropMode, BackdropModeConfig> = {
  atmospheric: {
    id: 'atmospheric',
    name: 'Atmospheric B-Roll',
    subtitle: 'Focus on Details',
    description: 'Build subconscious tension by focusing on the environment rather than actors. Avoids uncanny valley of characters staring blankly.',
    bestFor: ['Thrillers', 'Establishing mood', 'Show, Don\'t Tell'],
    icon: 'Sparkles',
    allowPeople: false,
    priorityFields: ['keyProps', 'atmosphere', 'audioPriorities'],
    styleModifiers: ['Cinematic macro', 'High contrast lighting', 'Shallow depth of field'],
    lensDefault: '100mm macro lens',
    negativePrompt: 'people, characters, faces, crowds, humans, actors',
  },
  portrait: {
    id: 'portrait',
    name: 'Silent Portrait',
    subtitle: 'Focus on Psychology',
    description: 'Visualize the internal state of the character. A "living portrait" where the character breathes, reacts, but does not speak.',
    bestFor: ['Character-driven intros', 'Internal monologue', 'Emotional beats'],
    icon: 'User',
    allowPeople: true,
    priorityFields: ['emotionalBeat', 'keyLight', 'keyActions', 'blocking'],
    styleModifiers: ['Intimate framing', 'Slow motion', 'Intense eye contact'],
    lensDefault: '85mm lens',
  },
  master: {
    id: 'master',
    name: 'Establishing Master',
    subtitle: 'Focus on Geography',
    description: 'Ground the viewer in the location and spatial relationships before cutting to close-ups.',
    bestFor: ['Clarifying setting', 'Complex blocking', 'Multi-character scenes'],
    icon: 'Map',
    allowPeople: false,
    priorityFields: ['location', 'blocking', 'colorTemperature', 'practicalLights'],
    styleModifiers: ['Wide angle', 'Cinematic composition', 'Deep focus'],
    lensDefault: '24mm wide angle lens',
    negativePrompt: 'people, characters, faces, crowds, humans, actors',
  },
  animatic: {
    id: 'animatic',
    name: 'Storybeat Animatic',
    subtitle: 'Focus on Style',
    description: 'Non-photorealistic storyboard-style visualization. Preview blocking without spending resources on photorealism.',
    bestFor: ['Rapid prototyping', 'True Crime aesthetic', 'Concept visualization'],
    icon: 'Pencil',
    allowPeople: true,
    priorityFields: ['cameraAngle', 'cameraShots', 'location', 'blocking'],
    styleModifiers: ['Rough charcoal storyboard sketch', 'High contrast black and white', 'Noir style', 'Rough lines', 'Concept art'],
    lensDefault: '',
  },
}

export interface BackdropPromptResult {
  prompt: string
  mode: BackdropMode
  usedFields: string[]
  styleNotes: string[]
}

/**
 * Builds a backdrop prompt from scene direction based on the selected mode
 */
export function buildBackdropPrompt(
  mode: BackdropMode,
  sceneDirection: DetailedSceneDirection | null | undefined,
  characterName?: string,
  characterDescription?: string
): BackdropPromptResult {
  const config = BACKDROP_MODES[mode]

  if (!sceneDirection) {
    return {
      prompt: getDefaultPromptForMode(mode, characterName),
      mode,
      usedFields: [],
      styleNotes: config.styleModifiers,
    }
  }

  switch (mode) {
    case 'atmospheric':
      return buildAtmosphericPrompt(sceneDirection, config)
    case 'portrait':
      return buildPortraitPrompt(sceneDirection, config, characterName, characterDescription)
    case 'master':
      return buildMasterPrompt(sceneDirection, config)
    case 'animatic':
      return buildAnimaticPrompt(sceneDirection, config)
    default:
      return buildMasterPrompt(sceneDirection, config)
  }
}

function buildAtmosphericPrompt(
  sd: DetailedSceneDirection,
  config: BackdropModeConfig
): BackdropPromptResult {
  const parts: string[] = []
  const usedFields: string[] = []

  // Opening style
  parts.push('Cinematic macro close-up')

  // Key props focus
  if (sd.scene?.keyProps && sd.scene.keyProps.length > 0) {
    const prop = sd.scene.keyProps[0]
    parts.push(`of ${prop}`)
    usedFields.push('scene.keyProps')
  }

  // Location context (blurred background)
  if (sd.scene?.location) {
    parts.push(`in ${sd.scene.location}`)
    usedFields.push('scene.location')
  }

  // Atmosphere and mood
  if (sd.scene?.atmosphere) {
    parts.push(`${sd.scene.atmosphere} atmosphere`)
    usedFields.push('scene.atmosphere')
  }

  // Lighting
  if (sd.lighting?.overallMood) {
    parts.push(`${sd.lighting.overallMood} lighting`)
    usedFields.push('lighting.overallMood')
  }

  // Color temperature
  if (sd.lighting?.colorTemperature) {
    parts.push(`${sd.lighting.colorTemperature} color temperature`)
    usedFields.push('lighting.colorTemperature')
  }

  // Practical lights as background elements
  if (sd.lighting?.practicals) {
    parts.push(`In the background, out of focus, ${sd.lighting.practicals} glows`)
    usedFields.push('lighting.practicals')
  }

  // Style modifiers
  parts.push('High contrast lighting')
  parts.push(config.lensDefault)
  parts.push('Shallow depth of field')
  parts.push('No people visible')

  return {
    prompt: parts.join('. ') + '.',
    mode: 'atmospheric',
    usedFields,
    styleNotes: config.styleModifiers,
  }
}

function buildPortraitPrompt(
  sd: DetailedSceneDirection,
  config: BackdropModeConfig,
  characterName?: string,
  characterDescription?: string
): BackdropPromptResult {
  const parts: string[] = []
  const usedFields: string[] = []

  // Shot type
  parts.push('Medium close-up')

  // Character
  if (characterName) {
    if (characterDescription) {
      parts.push(`of ${characterName} (${characterDescription})`)
    } else {
      parts.push(`of ${characterName}`)
    }
  } else {
    parts.push('of a person')
  }

  // Location
  if (sd.scene?.location) {
    parts.push(`in ${sd.scene.location}`)
    usedFields.push('scene.location')
  }

  // Key lighting on character
  if (sd.lighting?.keyLight) {
    parts.push(`bathed in ${sd.lighting.keyLight}`)
    usedFields.push('lighting.keyLight')
  }

  // Emotional beat - the key for portrait mode
  if (sd.talent?.emotionalBeat) {
    parts.push(`Expressing ${sd.talent.emotionalBeat}`)
    usedFields.push('talent.emotionalBeat')
  }

  // Non-verbal key actions
  if (sd.talent?.keyActions && sd.talent.keyActions.length > 0) {
    const nonVerbalActions = sd.talent.keyActions.filter(
      a => !a.toLowerCase().includes('speak') && 
           !a.toLowerCase().includes('say') &&
           !a.toLowerCase().includes('talk')
    )
    if (nonVerbalActions.length > 0) {
      parts.push(nonVerbalActions.slice(0, 2).join(', '))
      usedFields.push('talent.keyActions')
    }
  }

  // Style modifiers
  parts.push('Slow motion')
  parts.push(config.lensDefault)
  parts.push('Intense eye contact with camera')
  parts.push('Cinematic portrait')

  return {
    prompt: parts.join('. ') + '.',
    mode: 'portrait',
    usedFields,
    styleNotes: config.styleModifiers,
  }
}

function buildMasterPrompt(
  sd: DetailedSceneDirection,
  config: BackdropModeConfig
): BackdropPromptResult {
  const parts: string[] = []
  const usedFields: string[] = []

  // Opening - wide shot
  parts.push('Wide angle establishing shot')

  // Location
  if (sd.scene?.location) {
    parts.push(sd.scene.location)
    usedFields.push('scene.location')
  }

  // Blocking - spatial relationships (without naming people)
  if (sd.talent?.blocking) {
    const spatialDescription = convertBlockingToSpatial(sd.talent.blocking)
    if (spatialDescription) {
      parts.push(spatialDescription)
      usedFields.push('talent.blocking')
    }
  }

  // Key props in scene
  if (sd.scene?.keyProps && sd.scene.keyProps.length > 0) {
    parts.push(`Key elements: ${sd.scene.keyProps.join(', ')}`)
    usedFields.push('scene.keyProps')
  }

  // Lighting description
  if (sd.lighting?.colorTemperature) {
    parts.push(`${sd.lighting.colorTemperature} lighting`)
    usedFields.push('lighting.colorTemperature')
  }

  // Practical lights
  if (sd.lighting?.practicals) {
    parts.push(`Visible lights: ${sd.lighting.practicals}`)
    usedFields.push('lighting.practicals')
  }

  // Atmosphere
  if (sd.scene?.atmosphere) {
    parts.push(`${sd.scene.atmosphere} atmosphere`)
    usedFields.push('scene.atmosphere')
  }

  // Style
  parts.push('Cinematic composition')
  parts.push(config.lensDefault)
  parts.push('Deep focus')
  parts.push('Empty environment, no people')

  return {
    prompt: parts.join('. ') + '.',
    mode: 'master',
    usedFields,
    styleNotes: config.styleModifiers,
  }
}

function buildAnimaticPrompt(
  sd: DetailedSceneDirection,
  config: BackdropModeConfig
): BackdropPromptResult {
  const parts: string[] = []
  const usedFields: string[] = []

  // Style opening
  parts.push('Rough charcoal storyboard sketch')

  // Location
  if (sd.scene?.location) {
    parts.push(`of ${sd.scene.location}`)
    usedFields.push('scene.location')
  }

  // Camera angle
  if (sd.camera?.angle) {
    parts.push(`${sd.camera.angle} angle`)
    usedFields.push('camera.angle')
  }

  // Camera movement indication
  if (sd.camera?.movement) {
    parts.push(`Arrows indicating ${sd.camera.movement}`)
    usedFields.push('camera.movement')
  }

  // Blocking as rough shapes
  if (sd.talent?.blocking) {
    parts.push('Figure silhouettes showing positions')
    usedFields.push('talent.blocking')
  }

  // Style modifiers
  parts.push('High contrast black and white')
  parts.push('Noir style')
  parts.push('Rough sketch lines')
  parts.push('Concept art aesthetic')
  parts.push('Frame annotations')

  return {
    prompt: parts.join('. ') + '.',
    mode: 'animatic',
    usedFields,
    styleNotes: config.styleModifiers,
  }
}

/**
 * Converts blocking instructions to spatial descriptions without people
 */
function convertBlockingToSpatial(blocking: string): string | null {
  const spatial = blocking
    .replace(/[A-Z][a-z]+ [A-Z][a-z]+/g, '') // Remove proper names
    .replace(/\b(he|she|they|him|her|them)\b/gi, '')
    .replace(/\b(sits?|stands?|walks?|moves?)\b/gi, 'position')
    .replace(/opposite each other/gi, 'facing arrangement')
    .replace(/\s+/g, ' ')
    .trim()

  if (spatial.length > 10) {
    return `Spatial layout: ${spatial}`
  }
  return null
}

/**
 * Returns a default prompt when no scene direction is available
 */
function getDefaultPromptForMode(mode: BackdropMode, characterName?: string): string {
  switch (mode) {
    case 'atmospheric':
      return 'Cinematic macro close-up of an environmental detail. Dramatic lighting, shallow depth of field. 100mm macro lens. No people visible.'
    case 'portrait':
      return `Medium close-up portrait of ${characterName || 'a person'}. Dramatic lighting, 85mm lens, intense expression, cinematic.`
    case 'master':
      return 'Wide establishing shot of the location. Cinematic composition, 24mm wide angle lens, deep focus. Empty environment, no people.'
    case 'animatic':
      return 'Rough charcoal storyboard sketch. High contrast black and white. Noir style, rough sketch lines, concept art aesthetic.'
    default:
      return 'Cinematic establishing shot. Dramatic lighting, professional composition.'
  }
}

/**
 * Gets the appropriate personGeneration setting for the mode
 */
export function getPersonGenerationForMode(mode: BackdropMode): 'allow_adult' | 'dont_allow' {
  return BACKDROP_MODES[mode].allowPeople ? 'allow_adult' : 'dont_allow'
}

/**
 * Gets the negative prompt for the mode
 */
export function getNegativePromptForMode(mode: BackdropMode): string | undefined {
  return BACKDROP_MODES[mode].negativePrompt
}
