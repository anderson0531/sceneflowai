/**
 * Blueprint Hero Image Prompt & Continuity Reference Engine
 *
 * Unifies:
 * 1. Continuity Library reference resolution (Series Production Bible + Project VisionPhase + Blueprint descriptions)
 * 2. Live Blueprint synchronization (title, logline, synopsis, genre, setting, tone, themes, visual_style,
 *    protagonist, antagonist, opening_hook, beats, character_descriptions, scene_descriptions, prop_descriptions)
 * 3. Distinct, cinematography-grade prompt construction for all 8 Poster Composition Archetypes:
 *    - Hero Portrait (`hero-portrait`): Single character dominant, dramatic pose
 *    - Ensemble Shot (`ensemble`): Multiple characters arranged cinematically
 *    - Dramatic Silhouette (`dramatic-silhouette`): Backlit figure, mysterious mood
 *    - Key Art (`key-art`): Iconic imagery representing the story
 *    - Environment Hero (`environment-hero`): Setting as main focus with character integration
 *    - Confrontation (`confrontation`): Hero vs antagonist visual tension
 *    - Action Moment (`action-moment`): Frozen peak action sequence
 *    - Intimate Portrait (`intimate-portrait`): Close emotional character study
 */

import { artStylePresets } from '@/constants/artStylePresets'
import {
  resolveBlueprintContinuity,
  type BlueprintCastItem,
  type BlueprintLocationItem,
  type BlueprintPropItem,
  type SharedContinuitySource,
} from '@/lib/blueprint/blueprintContinuity'
import type { ReferenceImage } from '@/lib/gemini/imageClient'
import { toCanonicalName } from '@/lib/character/canonical'

export type PosterShotTypeId =
  | 'hero-portrait'
  | 'ensemble'
  | 'dramatic-silhouette'
  | 'key-art'
  | 'environment-hero'
  | 'confrontation'
  | 'action-moment'
  | 'intimate-portrait'

export interface PosterShotTypeConfig {
  id: PosterShotTypeId
  name: string
  description: string
  defaultCameraAngle: 'eye-level' | 'low-angle' | 'high-angle' | 'birds-eye' | 'dutch-angle'
  defaultLighting: 'natural' | 'golden-hour' | 'dramatic' | 'soft' | 'harsh' | 'backlit'
  defaultAtmosphere:
    | 'neutral'
    | 'serene'
    | 'tense'
    | 'mysterious'
    | 'energetic'
    | 'melancholic'
    | 'hopeful'
    | 'dramatic'
  defaultTimeOfDay: 'dawn' | 'day' | 'dusk' | 'night' | 'golden-hour'
  characterSelectionMode:
    | 'protagonist'
    | 'ensemble'
    | 'confrontation'
    | 'protagonist-in-world'
    | 'action-cast'
  prioritizeLocationRef: boolean
  prioritizePropRef: boolean
  compositionDirective: string
}

export const POSTER_SHOT_TYPES: PosterShotTypeConfig[] = [
  {
    id: 'hero-portrait',
    name: 'Hero Portrait',
    description: 'Single character dominant, dramatic pose',
    defaultCameraAngle: 'low-angle',
    defaultLighting: 'dramatic',
    defaultAtmosphere: 'dramatic',
    defaultTimeOfDay: 'golden-hour',
    characterSelectionMode: 'protagonist',
    prioritizeLocationRef: true,
    prioritizePropRef: true,
    compositionDirective:
      'Heroic Single-Character Key Art Portrait (50mm-85mm portrait lens, medium-full three-quarter framing). Position the sole lead character dominantly in the upper two-thirds of the composition in a commanding, dramatic pose with clear negative space in the lower 25% for title placement.',
  },
  {
    id: 'ensemble',
    name: 'Ensemble Shot',
    description: 'Multiple characters arranged cinematically',
    defaultCameraAngle: 'eye-level',
    defaultLighting: 'dramatic',
    defaultAtmosphere: 'dramatic',
    defaultTimeOfDay: 'golden-hour',
    characterSelectionMode: 'ensemble',
    prioritizeLocationRef: true,
    prioritizePropRef: false,
    compositionDirective:
      'Cinematic Theatrical Ensemble Key Art (35mm anamorphic widescreen framing). Stage multiple characters in tiered depth planes — protagonist anchored foreground-center, flanked in staggered midground planes by key supporting and opposing characters — with distinct silhouettes, non-overlapping faces, and cohesive multi-plane dramatic lighting.',
  },
  {
    id: 'dramatic-silhouette',
    name: 'Dramatic Silhouette',
    description: 'Backlit figure, mysterious mood',
    defaultCameraAngle: 'low-angle',
    defaultLighting: 'backlit',
    defaultAtmosphere: 'mysterious',
    defaultTimeOfDay: 'night',
    characterSelectionMode: 'protagonist',
    prioritizeLocationRef: true,
    prioritizePropRef: true,
    compositionDirective:
      'High-Contrast Chiaroscuro Silhouette Key Art (35mm lens, contra-jour backlighting). Frame the solitary figure as a striking rim-lit silhouette against a powerful environmental light source (glowing doorway, horizon, volumetric fog, or architectural beam), keeping facial features shrouded in deep mysterious shadow while crisp rim light traces their profile and wardrobe contour.',
  },
  {
    id: 'key-art',
    name: 'Key Art',
    description: 'Iconic imagery representing the story',
    defaultCameraAngle: 'eye-level',
    defaultLighting: 'dramatic',
    defaultAtmosphere: 'dramatic',
    defaultTimeOfDay: 'golden-hour',
    characterSelectionMode: 'protagonist',
    prioritizeLocationRef: true,
    prioritizePropRef: true,
    compositionDirective:
      'Iconic Symbolic Theatrical Key Art (50mm prime lens, balanced golden-ratio graphic composition). Center the story’s defining visual metaphor, signature prop/emblem, and thematic core integrated with the lead character to create an instantly recognizable flagship poster image.',
  },
  {
    id: 'environment-hero',
    name: 'Environment Hero',
    description: 'Setting as main focus with character integration',
    defaultCameraAngle: 'low-angle',
    defaultLighting: 'golden-hour',
    defaultAtmosphere: 'dramatic',
    defaultTimeOfDay: 'golden-hour',
    characterSelectionMode: 'protagonist-in-world',
    prioritizeLocationRef: true,
    prioritizePropRef: false,
    compositionDirective:
      'Sweeping Anamorphic Environment-First Hero Vista (21mm ultra-wide lens). The architectural or landscape setting is the dominant subject occupying 75%+ of the frame with monumental scale, depth, and atmospheric perspective, while the protagonist is integrated at small-to-medium scale (15-25% of frame height) within the world.',
  },
  {
    id: 'confrontation',
    name: 'Confrontation',
    description: 'Hero vs antagonist visual tension',
    defaultCameraAngle: 'dutch-angle',
    defaultLighting: 'dramatic',
    defaultAtmosphere: 'tense',
    defaultTimeOfDay: 'night',
    characterSelectionMode: 'confrontation',
    prioritizeLocationRef: true,
    prioritizePropRef: true,
    compositionDirective:
      'High-Tension Protagonist vs. Antagonist Confrontation Key Art (35mm-50mm lens, dynamic split-plane two-shot). Stage the hero and antagonist in opposing halves or foreground/midground planes of the frame with contrasting warm/cool lighting vectors and locked or colliding sightlines that visualize their central conflict.',
  },
  {
    id: 'action-moment',
    name: 'Action Moment',
    description: 'Frozen peak action sequence',
    defaultCameraAngle: 'dutch-angle',
    defaultLighting: 'dramatic',
    defaultAtmosphere: 'energetic',
    defaultTimeOfDay: 'night',
    characterSelectionMode: 'action-cast',
    prioritizeLocationRef: true,
    prioritizePropRef: true,
    compositionDirective:
      'Frozen Peak Kinetic Action Key Art (28mm wide-medium dynamic lens, 1/2000s high-shutter-speed freeze-frame). Capture the climax of physical motion along a bold diagonal axis with dynamic body mechanics, airborne environmental particles/sparks/rain/debris, and visceral momentum.',
  },
  {
    id: 'intimate-portrait',
    name: 'Intimate Portrait',
    description: 'Close emotional character study',
    defaultCameraAngle: 'eye-level',
    defaultLighting: 'soft',
    defaultAtmosphere: 'melancholic',
    defaultTimeOfDay: 'golden-hour',
    characterSelectionMode: 'protagonist',
    prioritizeLocationRef: true,
    prioritizePropRef: false,
    compositionDirective:
      'Intimate Emotional Character Study Key Art (85mm f/1.4 portrait prime, tight medium-close to close-up framing). Shallow depth of field with creamy background bokeh, intimate Rembrandt or practical window key lighting, tactile skin and fabric texture, and luminous eye catchlights conveying raw inner emotion.',
  },
]

export interface HeroPromptCharacterInput {
  id?: string
  name: string
  description?: string
  referenceImage?: string | null
  appearanceDescription?: string
  appearance?: string
  ethnicity?: string
  role?: string
  subject?: string
  keyFeature?: string
  hairStyle?: string
  hairColor?: string
  eyeColor?: string
  expression?: string
  build?: string
  defaultWardrobe?: string
  wardrobeAccessories?: string
  externalGoal?: string
  internalNeed?: string
  fatalFlaw?: string
  arcStartingState?: string
  arcShift?: string
  arcEndingState?: string
  isSharedFromSeries?: boolean
}

export interface HeroPromptSceneRefInput {
  id: string
  name: string
  description?: string
  location?: string
  atmosphere?: string
  furniture_props?: string
  imageUrl?: string | null
  referenceImage?: string | null
  type?: 'scene'
  isSharedFromSeries?: boolean
}

export interface HeroPromptObjectRefInput {
  id: string
  name: string
  description?: string
  significance?: string
  importance?: string
  category?: string
  imageUrl?: string | null
  referenceImage?: string | null
  type?: 'object'
  isSharedFromSeries?: boolean
}

export interface HeroPromptBlueprintInput {
  title?: string
  logline?: string
  synopsis?: string
  content?: string
  genre?: string
  setting?: string
  tone?: string
  themes?: string[] | string
  visual_style?: string
  visualStyle?: string
  artStyle?: string
  aspectRatio?: string
  protagonist?: string
  antagonist?: string
  opening_hook?: string
  character_descriptions?: Array<Record<string, any>>
  scene_descriptions?: Array<Record<string, any>>
  prop_descriptions?: Array<Record<string, any>>
  beats?: Array<{
    title?: string
    intent?: string
    minutes?: number
    synopsis?: string
    description?: string
  }>
  act_breakdown?: {
    act1?: string
    act2?: string
    act3?: string
  }
}

export interface HeroPromptStructure {
  posterType: PosterShotTypeId
  setting: string
  timeOfDay: string
  atmosphere: string
  cameraAngle: string
  lighting: string
  lightingMood: string
  characters: string[]
  characterPoses: string
  emotionalTone: string
  keyProps: string
  artStyle: string
  additionalDetails: string
  negativePrompt: string
}

const DEFAULT_NEGATIVE_PROMPT =
  'blurry, low quality, distorted anatomy, deformed hands, poor composition, amateur, text, title letters, typography, watermark, logo, signature, captions, UI elements'

function normalizeKey(value: unknown): string {
  const raw = typeof value === 'string' ? value.trim() : ''
  if (!raw) return ''
  return toCanonicalName(raw).toLowerCase()
}

function asCleanString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function truncateSentence(text: string, maxChars = 220): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length <= maxChars) return clean
  const sliced = clean.slice(0, maxChars)
  const lastSpace = sliced.lastIndexOf(' ')
  return `${(lastSpace > 80 ? sliced.slice(0, lastSpace) : sliced).replace(/[.,;:!?-]+$/, '')}...`
}

export function getPosterShotTypeConfig(posterType?: string | null): PosterShotTypeConfig {
  return (
    POSTER_SHOT_TYPES.find((p) => p.id === posterType) || POSTER_SHOT_TYPES[0]
  )
}

/**
 * Find the lead protagonist and primary antagonist from available characters + treatment metadata.
 */
export function resolveCastRolesForHero(
  treatment: HeroPromptBlueprintInput,
  availableCharacters: HeroPromptCharacterInput[] = []
): {
  protagonist?: HeroPromptCharacterInput
  antagonist?: HeroPromptCharacterInput
  supporting: HeroPromptCharacterInput[]
  allCharacters: HeroPromptCharacterInput[]
} {
  // Merge treatment.character_descriptions if availableCharacters is empty or partial
  const mergedMap = new Map<string, HeroPromptCharacterInput>()
  const mergedList: HeroPromptCharacterInput[] = []

  const addChar = (raw: any) => {
    if (!raw || typeof raw !== 'object') return
    const name = asCleanString(raw.name)
    if (!name) return
    const key = normalizeKey(name)
    const prev = mergedMap.get(key)
    const next: HeroPromptCharacterInput = {
      ...(prev || {}),
      ...raw,
      name: prev?.name || name,
      role: asCleanString(raw.role || prev?.role) || 'supporting',
      description: asCleanString(raw.description || prev?.description),
      appearanceDescription: asCleanString(
        raw.appearanceDescription || raw.appearance || prev?.appearanceDescription || prev?.appearance
      ),
      appearance: asCleanString(
        raw.appearance || raw.appearanceDescription || prev?.appearance || prev?.appearanceDescription
      ),
      ethnicity: asCleanString(raw.ethnicity || prev?.ethnicity),
      defaultWardrobe: asCleanString(raw.defaultWardrobe || prev?.defaultWardrobe),
      wardrobeAccessories: asCleanString(raw.wardrobeAccessories || prev?.wardrobeAccessories),
      keyFeature: asCleanString(raw.keyFeature || prev?.keyFeature),
      hairStyle: asCleanString(raw.hairStyle || prev?.hairStyle),
      hairColor: asCleanString(raw.hairColor || prev?.hairColor),
      eyeColor: asCleanString(raw.eyeColor || prev?.eyeColor),
      expression: asCleanString(raw.expression || prev?.expression),
      build: asCleanString(raw.build || prev?.build),
      externalGoal: asCleanString(raw.externalGoal || prev?.externalGoal),
      internalNeed: asCleanString(raw.internalNeed || prev?.internalNeed),
      fatalFlaw: asCleanString(raw.fatalFlaw || prev?.fatalFlaw),
      arcStartingState: asCleanString(raw.arcStartingState || prev?.arcStartingState),
      arcShift: asCleanString(raw.arcShift || prev?.arcShift),
      arcEndingState: asCleanString(raw.arcEndingState || prev?.arcEndingState),
      referenceImage: raw.referenceImage || raw.imageUrl || prev?.referenceImage || null,
      isSharedFromSeries: Boolean(raw.isSharedFromSeries || prev?.isSharedFromSeries),
    }
    if (!prev) mergedList.push(next)
    else {
      const idx = mergedList.findIndex((c) => normalizeKey(c.name) === key)
      if (idx >= 0) mergedList[idx] = next
    }
    mergedMap.set(key, next)
  }

  for (const c of availableCharacters) addChar(c)
  if (Array.isArray(treatment?.character_descriptions)) {
    for (const c of treatment.character_descriptions) addChar(c)
  }

  const protHint = normalizeKey(treatment?.protagonist?.split(/[,(—-]/)[0])
  const antHint = normalizeKey(treatment?.antagonist?.split(/[,(—-]/)[0])

  const protagonist =
    mergedList.find((c) => {
      const role = (c.role || '').toLowerCase()
      return role.includes('protagonist') || role.includes('lead') || role.includes('hero')
    }) ||
    (protHint
      ? mergedList.find((c) => {
          const k = normalizeKey(c.name)
          return k === protHint || k.includes(protHint) || protHint.includes(k)
        })
      : undefined) ||
    mergedList[0]

  const antagonist =
    mergedList.find((c) => {
      if (protagonist && normalizeKey(c.name) === normalizeKey(protagonist.name)) return false
      const role = (c.role || '').toLowerCase()
      return (
        role.includes('antagonist') ||
        role.includes('villain') ||
        role.includes('rival') ||
        role.includes('nemesis') ||
        role.includes('opposing')
      )
    }) ||
    (antHint
      ? mergedList.find((c) => {
          if (protagonist && normalizeKey(c.name) === normalizeKey(protagonist.name)) return false
          const k = normalizeKey(c.name)
          return k === antHint || k.includes(antHint) || antHint.includes(k)
        })
      : undefined) ||
    mergedList.find(
      (c) => !protagonist || normalizeKey(c.name) !== normalizeKey(protagonist.name)
    )

  const supporting = mergedList.filter((c) => {
    const k = normalizeKey(c.name)
    if (protagonist && k === normalizeKey(protagonist.name)) return false
    if (antagonist && k === normalizeKey(antagonist.name)) return false
    return true
  })

  return {
    protagonist,
    antagonist,
    supporting,
    allCharacters: mergedList,
  }
}

/**
 * Format a single character's physical appearance, wardrobe, and continuity traits for a poster prompt.
 */
export function formatCharacterForHeroPrompt(char: HeroPromptCharacterInput): string {
  const traits: string[] = []
  if (char.ethnicity) traits.push(`${char.ethnicity} ethnicity`)
  if (char.build) traits.push(`${char.build} build`)
  const hairParts = [char.hairColor, char.hairStyle].filter(Boolean).join(' ')
  if (hairParts) traits.push(`${hairParts} hair`)
  if (char.eyeColor) traits.push(`${char.eyeColor} eyes`)
  if (char.keyFeature) traits.push(`distinctive ${char.keyFeature}`)

  const baseAppearance = char.appearanceDescription || char.appearance || char.description || ''
  if (baseAppearance) {
    traits.push(truncateSentence(baseAppearance, 180))
  }

  const wardrobeParts: string[] = []
  if (char.defaultWardrobe) wardrobeParts.push(`wearing ${char.defaultWardrobe}`)
  if (char.wardrobeAccessories) wardrobeParts.push(`with ${char.wardrobeAccessories}`)

  const roleLabel = char.role ? ` (${char.role})` : ''
  const detailStr = [...traits, ...wardrobeParts].filter(Boolean).join(', ')
  return detailStr ? `${char.name}${roleLabel}: ${detailStr}` : `${char.name}${roleLabel}`
}

/**
 * Extract the peak action beat or opening hook from the current Blueprint.
 */
function extractBlueprintActionMoment(treatment: HeroPromptBlueprintInput): string {
  const beats = Array.isArray(treatment.beats) ? treatment.beats : []
  if (beats.length > 0) {
    const kineticMatches = (text: string): number => {
      const matches = text.match(
        /\b(chase|chases|escape|escapes|confront|confronts|ambush|breach|leap|leaps|clash|explosion|explodes|storm|sprint|sprints|fight|fights|battle|rescue|collapse|collapsing|shatter|shattering|race|strike|strikes|plunge|plunges|detonate|hijack|showdown|fires|shockwave|climax|action)\b/gi
      )
      return matches ? matches.length : 0
    }

    let bestBeat = beats[Math.floor(beats.length * 0.7)] || beats[0]
    let bestScore = -1
    beats.forEach((b, idx) => {
      const combined = `${b.title || ''} ${b.synopsis || b.description || ''} ${b.intent || ''}`
      // Score by kinetic keyword density + slight preference for midpoint/climax beats
      const score = kineticMatches(combined) * 10 + idx
      if (score > bestScore) {
        bestScore = score
        bestBeat = b
      }
    })

    const beatDesc = asCleanString(
      bestBeat?.synopsis || bestBeat?.description || bestBeat?.intent || bestBeat?.title
    )
    if (beatDesc) {
      return truncateSentence(beatDesc, 180)
    }
  }

  if (treatment.opening_hook) {
    return truncateSentence(treatment.opening_hook, 180)
  }

  if (treatment.act_breakdown?.act2 || treatment.act_breakdown?.act3) {
    return truncateSentence(
      asCleanString(treatment.act_breakdown.act3 || treatment.act_breakdown.act2),
      180
    )
  }

  if (treatment.logline) {
    return truncateSentence(treatment.logline, 180)
  }

  return 'Peak high-stakes kinetic turning point in mid-motion'
}

/**
 * Extract symbolic / iconic story motif for Key Art from themes, props, and logline.
 */
function extractBlueprintSymbolicMotif(
  treatment: HeroPromptBlueprintInput,
  objectReferences: HeroPromptObjectRefInput[] = []
): { motifSummary: string; keyPropsText: string } {
  const rawProps: HeroPromptObjectRefInput[] = [...objectReferences]
  if (Array.isArray(treatment.prop_descriptions)) {
    for (const p of treatment.prop_descriptions) {
      if (p?.name && !rawProps.some((r) => normalizeKey(r.name) === normalizeKey(p.name))) {
        rawProps.push({
          id: p.id || p.name,
          name: p.name,
          description: p.description,
          significance: p.significance,
          importance: p.importance,
          category: p.category,
          imageUrl: p.referenceImage || p.imageUrl,
        })
      }
    }
  }

  const criticalProp =
    rawProps.find((p) => p.importance === 'critical' || p.importance === 'high' || p.importance === 'important') ||
    rawProps[0]

  const themesList = Array.isArray(treatment.themes)
    ? treatment.themes.filter(Boolean).slice(0, 3)
    : typeof treatment.themes === 'string' && treatment.themes.trim()
      ? [treatment.themes.trim()]
      : []

  const propClause = criticalProp
    ? `${criticalProp.name}${criticalProp.description ? ` (${truncateSentence(criticalProp.description, 90)})` : ''}${criticalProp.significance ? ` symbolizing ${truncateSentence(criticalProp.significance, 80)}` : ''}`
    : ''

  const themeClause =
    themesList.length > 0 ? `visualizing the themes of ${themesList.join(', ')}` : ''

  const motifSummary =
    [propClause, themeClause].filter(Boolean).join(' — ') ||
    truncateSentence(treatment.logline || treatment.synopsis || 'Central narrative emblem of the story', 160)

  const keyPropsText = rawProps
    .slice(0, 2)
    .map((p) => (p.description ? `${p.name} (${truncateSentence(p.description, 70)})` : p.name))
    .join('; ')

  return { motifSummary, keyPropsText }
}

/**
 * Derive a complete, Blueprint-aware HeroPromptStructure and auto-selected Continuity Library reference IDs
 * for any of the 8 `POSTER_SHOT_TYPES`.
 */
export function deriveHeroPromptPreset(options: {
  treatment: HeroPromptBlueprintInput
  posterType?: PosterShotTypeId
  availableCharacters?: HeroPromptCharacterInput[]
  sceneReferences?: HeroPromptSceneRefInput[]
  objectReferences?: HeroPromptObjectRefInput[]
}): {
  structure: HeroPromptStructure
  selectedSceneRefIds: string[]
  selectedObjectRefIds: string[]
} {
  const {
    treatment,
    posterType = 'hero-portrait',
    availableCharacters = [],
    sceneReferences = [],
    objectReferences = [],
  } = options

  const config = getPosterShotTypeConfig(posterType)
  const { protagonist, antagonist, supporting, allCharacters } = resolveCastRolesForHero(
    treatment,
    availableCharacters
  )

  // Merge scene descriptions with sceneReferences for setting enrichment
  const primarySceneDesc = Array.isArray(treatment.scene_descriptions)
    ? treatment.scene_descriptions[0]
    : undefined
  const primarySceneRef =
    sceneReferences.find((r) => Boolean(r.imageUrl || r.referenceImage)) || sceneReferences[0]

  const baseSetting = asCleanString(
    treatment.setting ||
      primarySceneRef?.location ||
      primarySceneRef?.description ||
      primarySceneDesc?.location ||
      primarySceneDesc?.name
  )
  const locationAtmosphere = asCleanString(
    primarySceneRef?.atmosphere || primarySceneDesc?.atmosphere
  )
  const locationProps = asCleanString(
    primarySceneRef?.furniture_props || primarySceneDesc?.furniture_props
  )

  const { motifSummary, keyPropsText } = extractBlueprintSymbolicMotif(
    treatment,
    objectReferences
  )

  // Resolve art style from Blueprint
  let resolvedArtStyle = 'photorealistic'
  const rawArtStyle = asCleanString(treatment.artStyle)
  if (rawArtStyle && artStylePresets.some((s) => s.id === rawArtStyle)) {
    resolvedArtStyle = rawArtStyle
  } else if (treatment.visual_style || treatment.visualStyle) {
    const vs = asCleanString(treatment.visual_style || treatment.visualStyle).toLowerCase()
    if (vs.includes('anime')) resolvedArtStyle = 'anime'
    else if (vs.includes('concept') || vs.includes('painted') || vs.includes('stylized'))
      resolvedArtStyle = 'concept-art'
    else if (vs.includes('comic') || vs.includes('graphic novel')) resolvedArtStyle = 'comic-book'
  }

  // Tone-based defaults
  const toneLower = asCleanString(treatment.tone || treatment.genre).toLowerCase()
  let toneAtmosphere = config.defaultAtmosphere
  let toneLighting = config.defaultLighting
  let toneTimeOfDay = config.defaultTimeOfDay
  let lightingMood = 'cinematic'

  if (toneLower.includes('noir') || toneLower.includes('dark') || toneLower.includes('gritty')) {
    lightingMood = 'noir'
    if (posterType !== 'intimate-portrait' && posterType !== 'environment-hero') {
      toneAtmosphere = posterType === 'dramatic-silhouette' ? 'mysterious' : 'tense'
    }
    toneTimeOfDay = 'night'
  } else if (toneLower.includes('warm') || toneLower.includes('uplifting') || toneLower.includes('hopeful')) {
    lightingMood = 'warm'
    if (posterType === 'hero-portrait' || posterType === 'environment-hero') {
      toneAtmosphere = 'hopeful'
    }
  } else if (toneLower.includes('sci-fi') || toneLower.includes('cyber') || toneLower.includes('thriller')) {
    lightingMood = 'cool'
  }

  // Select characters & compose pose/staging, emotionalTone, setting, and keyProps per archetype
  let selectedChars: string[] = []
  let characterPoses = ''
  let emotionalTone = ''
  let setting = baseSetting
  let keyProps = keyPropsText
  let negativePrompt = DEFAULT_NEGATIVE_PROMPT

  const protName = protagonist?.name || asCleanString(treatment.protagonist?.split(/[,(—-]/)[0]) || ' the protagonist'
  const antName = antagonist?.name || asCleanString(treatment.antagonist?.split(/[,(—-]/)[0]) || 'the antagonist'

  switch (posterType) {
    case 'hero-portrait': {
      if (protagonist) selectedChars = [protagonist.name]
      const goalClause = protagonist?.externalGoal
        ? ` driven by ${truncateSentence(protagonist.externalGoal, 90)}`
        : protagonist?.arcStartingState
          ? ` in a state of ${truncateSentence(protagonist.arcStartingState, 80)}`
          : ''
      characterPoses = `Single dominant character portrait of ${protName} in a dramatic, commanding three-quarter heroic pose in the upper two-thirds of the frame${goalClause}, intense gaze directed slightly off-camera`
      emotionalTone =
        protagonist?.expression ||
        (treatment.tone ? `${treatment.tone}, resolute determination and magnetic presence` : 'Commanding resolve, simmering dramatic intensity')
      if (protagonist?.wardrobeAccessories && !keyProps) {
        keyProps = protagonist.wardrobeAccessories
      }
      negativePrompt = `${DEFAULT_NEGATIVE_PROMPT}, crowd, multiple people, extra figures, distant tiny subject`
      break
    }

    case 'ensemble': {
      const castSelection = [
        protagonist,
        antagonist,
        ...supporting,
      ]
        .filter((c): c is HeroPromptCharacterInput => Boolean(c?.name))
        .slice(0, 4)
      selectedChars =
        castSelection.length > 0
          ? castSelection.map((c) => c.name)
          : allCharacters.slice(0, 4).map((c) => c.name)

      const supportingNames = selectedChars.slice(1).join(', ')
      characterPoses =
        selectedChars.length >= 2
          ? `Cinematic tiered ensemble blocking: ${selectedChars[0]} prominent in foreground-center, flanked in staggered depth planes by ${supportingNames}, each angled distinctly with non-overlapping sightlines that reflect their narrative hierarchy`
          : `Theatrical widescreen ensemble staging anchored by ${protName} with layered depth and dramatic negative space`
      emotionalTone = `Shared high-stakes destiny, contrasting allegiances, and unified ${treatment.tone || 'cinematic'} tension`
      break
    }

    case 'dramatic-silhouette': {
      if (protagonist) selectedChars = [protagonist.name]
      toneLighting = 'backlit'
      toneAtmosphere = 'mysterious'
      toneTimeOfDay = 'night'
      characterPoses = `Solitary figure of ${protName} poised in stark high-contrast contra-jour silhouette against a glowing environmental light source in ${baseSetting || 'the shadows'}; razor-sharp rim light traces their profile, hair outline, and signature coat/wardrobe while facial features remain shrouded in atmospheric mystery`
      emotionalTone = 'Enigmatic solitude, quiet suspense, and haunting chiaroscuro mood'
      negativePrompt = `${DEFAULT_NEGATIVE_PROMPT}, flat front lighting, overexposed face, bright studio key light, crowd`
      break
    }

    case 'key-art': {
      if (protagonist) selectedChars = [protagonist.name]
      characterPoses = `Iconic symbolic key-art composition centering ${protName} in visual dialogue with the story's core motif — ${motifSummary} — framed with bold graphic symmetry and theatrical negative space`
      emotionalTone = Array.isArray(treatment.themes) && treatment.themes.length > 0
        ? `Symbolic thematic resonance of ${treatment.themes.slice(0, 3).join(', ')}`
        : 'Iconic mythic weight, unforgettable theatrical poster presence'
      break
    }

    case 'environment-hero': {
      if (protagonist) selectedChars = [protagonist.name]
      const enrichedSetting = [
        baseSetting,
        locationAtmosphere ? `(${locationAtmosphere})` : '',
        locationProps ? `with ${locationProps}` : '',
      ]
        .filter(Boolean)
        .join(' ')
      setting = enrichedSetting || baseSetting || 'sweeping cinematic environment'
      characterPoses = `Vast sweeping ultra-wide establishing vista where ${setting} dominates 75%+ of the composition with monumental architectural/environmental scale; ${protName} is integrated at small-to-medium scale in the foreground/midground surveying the world`
      emotionalTone = locationAtmosphere || 'Monumental world scale, immersive atmospheric wonder, and environmental storytelling'
      negativePrompt = `${DEFAULT_NEGATIVE_PROMPT}, tight close-up, cropped background, shallow studio backdrop, portrait headshot`
      break
    }

    case 'confrontation': {
      if (protagonist && antagonist) {
        selectedChars = [protagonist.name, antagonist.name]
      } else if (allCharacters.length >= 2) {
        selectedChars = [allCharacters[0].name, allCharacters[1].name]
      } else if (protagonist) {
        selectedChars = [protagonist.name]
      }
      toneAtmosphere = 'tense'
      toneLighting = 'dramatic'
      const conflictNote =
        protagonist?.externalGoal && antagonist?.externalGoal
          ? ` (${truncateSentence(protagonist.externalGoal, 70)} clashing against ${truncateSentence(antagonist.externalGoal, 70)})`
          : ''
      characterPoses = `High-tension split-plane confrontation between ${protName} (protagonist, left/foreground plane) and ${antName} (antagonist, right/opposing plane)${conflictNote}, locked in an intense visual standoff divided by contrasting warm vs. cold rim lighting`
      emotionalTone = 'Palpable psychological and physical opposition, ideological collision, razor-sharp standoff'
      break
    }

    case 'action-moment': {
      const actionBeat = extractBlueprintActionMoment(treatment)
      // Check if antagonist is mentioned in the action beat
      const includeAntagonist =
        antagonist &&
        actionBeat.toLowerCase().includes(antagonist.name.split(' ')[0].toLowerCase())
      selectedChars = [
        ...(protagonist ? [protagonist.name] : []),
        ...(includeAntagonist && antagonist ? [antagonist.name] : []),
      ]
      toneAtmosphere = 'energetic'
      toneLighting = 'dramatic'
      characterPoses = `Frozen peak high-shutter-speed action moment: ${actionBeat} — ${protName} caught mid-motion along a dynamic diagonal trajectory with intense physical commitment, flying sparks/rain/debris, and kinetic energy`
      emotionalTone = 'Adrenaline-charged urgency, visceral kinetic impact, life-or-death stakes'
      negativePrompt = `${DEFAULT_NEGATIVE_PROMPT}, static stiff pose, standing still, passport photo, calm idle posture`
      break
    }

    case 'intimate-portrait': {
      if (protagonist) selectedChars = [protagonist.name]
      toneLighting = 'soft'
      const innerStudy =
        protagonist?.internalNeed ||
        protagonist?.fatalFlaw ||
        protagonist?.arcStartingState ||
        treatment.logline ||
        ''
      characterPoses = `Intimate 85mm f/1.4 close-up emotional character study of ${protName}, shallow depth of field with soft out-of-focus background bokeh, delicate Rembrandt key light catching the eyes, raw unguarded micro-expression${innerStudy ? ` reflecting ${truncateSentence(innerStudy, 100)}` : ''}`
      emotionalTone =
        protagonist?.internalNeed
          ? `Deep emotional vulnerability and inner conflict (${truncateSentence(protagonist.internalNeed, 90)})`
          : 'Quiet vulnerability, soulful introspection, and piercing human intimacy'
      negativePrompt = `${DEFAULT_NEGATIVE_PROMPT}, wide distant shot, tiny face, sunglasses hiding eyes, crowd, multiple people`
      break
    }
  }

  // Auto-select Continuity Library Scene & Object References relevant to this preset
  const selectedSceneRefIds: string[] = []
  if (sceneReferences.length > 0 && config.prioritizeLocationRef) {
    const primaryWithImg = sceneReferences.find((r) => Boolean(r.imageUrl || r.referenceImage))
    const chosenScene = primaryWithImg || sceneReferences[0]
    if (chosenScene?.id) {
      selectedSceneRefIds.push(chosenScene.id)
    }
    if (posterType === 'environment-hero' && sceneReferences.length > 1) {
      const secondWithImg = sceneReferences.find(
        (r) => r.id !== chosenScene?.id && Boolean(r.imageUrl || r.referenceImage)
      )
      if (secondWithImg?.id) selectedSceneRefIds.push(secondWithImg.id)
    }
  }

  const selectedObjectRefIds: string[] = []
  if (objectReferences.length > 0 && config.prioritizePropRef) {
    const prioritizedObjects = [...objectReferences].sort((a, b) => {
      const aHasImg = Boolean(a.imageUrl || a.referenceImage) ? 1 : 0
      const bHasImg = Boolean(b.imageUrl || b.referenceImage) ? 1 : 0
      if (aHasImg !== bHasImg) return bHasImg - aHasImg
      const aCrit = a.importance === 'critical' || a.importance === 'high' ? 1 : 0
      const bCrit = b.importance === 'critical' || b.importance === 'high' ? 1 : 0
      return bCrit - aCrit
    })
    const maxProps = posterType === 'key-art' ? 2 : 1
    for (const obj of prioritizedObjects.slice(0, maxProps)) {
      if (obj?.id) selectedObjectRefIds.push(obj.id)
    }
  }

  const additionalDetailsParts: string[] = []
  const visualStyleText = asCleanString(treatment.visual_style || treatment.visualStyle)
  if (visualStyleText) {
    additionalDetailsParts.push(`Visual style: ${truncateSentence(visualStyleText, 160)}`)
  }
  if (treatment.logline && posterType === 'key-art') {
    additionalDetailsParts.push(`Story premise: ${truncateSentence(treatment.logline, 160)}`)
  }

  const structure: HeroPromptStructure = {
    posterType,
    setting: setting || 'cinematic story environment',
    timeOfDay: toneTimeOfDay,
    atmosphere: toneAtmosphere,
    cameraAngle: config.defaultCameraAngle,
    lighting: toneLighting,
    lightingMood,
    characters: selectedChars,
    characterPoses,
    emotionalTone,
    keyProps,
    artStyle: resolvedArtStyle,
    additionalDetails: additionalDetailsParts.join('. '),
    negativePrompt,
  }

  return {
    structure,
    selectedSceneRefIds,
    selectedObjectRefIds,
  }
}

/**
 * Construct a rich, multi-layered cinematic Hero Image prompt from `HeroPromptStructure`,
 * current Blueprint data, and selected Continuity Library references.
 */
export function buildHeroImagePrompt(options: {
  treatment: HeroPromptBlueprintInput
  structure: HeroPromptStructure
  availableCharacters?: HeroPromptCharacterInput[]
  sceneReferences?: HeroPromptSceneRefInput[]
  selectedSceneRefIds?: string[]
  objectReferences?: HeroPromptObjectRefInput[]
  selectedObjectRefIds?: string[]
}): string {
  const {
    treatment,
    structure,
    availableCharacters = [],
    sceneReferences = [],
    selectedSceneRefIds = [],
    objectReferences = [],
    selectedObjectRefIds = [],
  } = options

  const config = getPosterShotTypeConfig(structure.posterType)
  const { allCharacters } = resolveCastRolesForHero(treatment, availableCharacters)

  const selectedCharObjs = structure.characters
    .map((name) => {
      const key = normalizeKey(name)
      return (
        allCharacters.find((c) => normalizeKey(c.name) === key) || {
          name,
          role: 'character',
        }
      )
    })
    .filter(Boolean)

  // 1. Composition Archetype & Subject Count Guardrail
  const subjectGuardrail =
    selectedCharObjs.length === 1
      ? `SINGLE SUBJECT ONLY: Feature ONLY ${selectedCharObjs[0].name} in the frame — no secondary people, extra figures, or background crowd.`
      : selectedCharObjs.length >= 2
        ? `SUBJECT COUNT: Feature EXACTLY ${selectedCharObjs.length} characters (${selectedCharObjs.map((c) => c.name).join(', ')}) with distinct, non-overlapping silhouettes and identities. Do not invent extra people.`
        : ''

  const compositionLayer = `(Composition — ${config.name}): ${config.compositionDirective}${subjectGuardrail ? ` ${subjectGuardrail}` : ''}`

  // 2. Subject, Wardrobe & Pose Layer
  const charDescriptions = selectedCharObjs.map((c) => formatCharacterForHeroPrompt(c))
  const subjectParts: string[] = []
  if (charDescriptions.length > 0) {
    subjectParts.push(`Featured Cast — ${charDescriptions.join(' | ')}`)
  }
  if (structure.characterPoses) {
    subjectParts.push(`Staging & Pose: ${structure.characterPoses}`)
  }
  if (structure.emotionalTone) {
    subjectParts.push(`Emotional Expression & Tone: ${structure.emotionalTone}`)
  }
  const subjectLayer =
    subjectParts.length > 0
      ? `(Subject): ${subjectParts.join('. ')}.`
      : `(Subject): Dramatic central subject embodying "${treatment.title || 'Untitled'}" (${treatment.genre || 'cinematic drama'}).`

  // 3. Environment, World & Key Props Layer
  const timeLabels: Record<string, string> = {
    dawn: 'at dawn with early horizon glow',
    day: 'in crisp natural daylight',
    dusk: 'at twilight dusk with deep indigo skies',
    night: 'at night with atmospheric practical and environmental lighting',
    'golden-hour': 'during warm golden hour with long directional shadows',
  }
  const timePhrase = timeLabels[structure.timeOfDay] || structure.timeOfDay || ''

  const selectedSceneRefs = sceneReferences.filter((r) => selectedSceneRefIds.includes(r.id))
  const sceneRefDescriptions = selectedSceneRefs
    .map((r) => {
      const parts = [r.name, r.description || r.location, r.atmosphere ? `atmosphere: ${r.atmosphere}` : ''].filter(
        Boolean
      )
      return parts.join(' — ')
    })
    .filter(Boolean)

  const selectedObjectRefs = objectReferences.filter((r) => selectedObjectRefIds.includes(r.id))
  const objectRefDescriptions = selectedObjectRefs
    .map((r) => (r.description ? `${r.name} (${truncateSentence(r.description, 80)})` : r.name))
    .filter(Boolean)

  const envParts: string[] = []
  if (structure.setting) {
    envParts.push(`Set in ${structure.setting}${timePhrase ? ` ${timePhrase}` : ''}`)
  } else if (timePhrase) {
    envParts.push(`Set ${timePhrase}`)
  }
  if (sceneRefDescriptions.length > 0) {
    envParts.push(`Continuity Location Reference: ${sceneRefDescriptions.join('; ')}`)
  }
  const combinedProps = [
    structure.keyProps,
    ...objectRefDescriptions.filter(
      (obj) => !structure.keyProps?.toLowerCase().includes(obj.split(' (')[0].toLowerCase())
    ),
  ]
    .filter(Boolean)
    .join('; ')
  if (combinedProps) {
    envParts.push(`Key Narrative Props & Motifs: ${combinedProps}`)
  }
  if (treatment.genre) {
    envParts.push(`Genre context: ${treatment.genre}`)
  }
  const environmentLayer = `(Environment): ${envParts.join('. ')}.`

  // 4. Lighting, Mood & Atmosphere Layer
  const atmosphereLabels: Record<string, string> = {
    neutral: 'balanced cinematic',
    serene: 'serene, contemplative, and tranquil',
    tense: 'tense, foreboding, and high-stakes',
    mysterious: 'mysterious, enigmatic, and shadow-drenched',
    energetic: 'kinetic, visceral, and adrenaline-charged',
    melancholic: 'melancholic, intimate, and emotionally resonant',
    hopeful: 'luminous, hopeful, and inspiring',
    dramatic: 'dramatic, high-contrast theatrical',
  }
  const lightingLabels: Record<string, string> = {
    natural: 'motivated natural environmental lighting',
    'golden-hour': 'warm directional golden-hour key light with rich amber highlights and cool shadow fill',
    dramatic: 'dramatic chiaroscuro cinematic lighting with sculpted key light, deep shadows, and crisp rim separation',
    soft: 'soft diffused Rembrandt key lighting with gentle shadow falloff and luminous eye catchlights',
    harsh: 'stark high-contrast hard lighting with sharp geometric shadows',
    backlit: 'powerful contra-jour backlighting with glowing volumetric rim light and deep silhouette contrast',
  }

  const lightingParts: string[] = [
    lightingLabels[structure.lighting] || structure.lighting || 'dramatic cinematic lighting',
    `${atmosphereLabels[structure.atmosphere] || structure.atmosphere || 'dramatic'} atmosphere`,
  ]
  if (structure.lightingMood && structure.lightingMood !== 'neutral') {
    lightingParts.push(`${structure.lightingMood} color grading`)
  }
  if (structure.additionalDetails) {
    lightingParts.push(structure.additionalDetails)
  }
  const lightingLayer = `(Lighting/Mood): ${lightingParts.join(', ')}.`

  // 5. Cinematography, Art Style & Poster Safe Zone Layer
  const angleLabels: Record<string, string> = {
    'eye-level': 'eye-level theatrical framing',
    'low-angle': 'heroic low-angle perspective looking slightly up at the subject',
    'high-angle': 'elevated high-angle perspective',
    'birds-eye': "overhead bird's-eye architectural perspective",
    'dutch-angle': 'dynamic tilted Dutch-angle tension framing',
  }
  const stylePreset =
    artStylePresets.find((s) => s.id === structure.artStyle) || artStylePresets[0]

  const cinematographyParts: string[] = [
    angleLabels[structure.cameraAngle] || 'cinematic framing',
    stylePreset?.promptSuffix || 'ultra-detailed photorealistic cinematography, 8K theatrical key art',
    'widescreen theatrical movie poster composition with clean darker negative space in the lower 25% for title overlay',
    'NO text, NO title letters, NO typography, NO watermarks, NO logos',
  ]
  const cinematographyLayer = `(Cinematography): ${cinematographyParts.join(', ')}.`

  return [
    compositionLayer,
    subjectLayer,
    environmentLayer,
    lightingLayer,
    cinematographyLayer,
  ].join(' ')
}

/**
 * Resolve Continuity Library reference images (Characters, Locations, Props)
 * for `/api/treatment/generate-visual` and format them for `generateImageWithGemini`.
 */
export function resolveHeroContinuityReferences(options: {
  treatment: HeroPromptBlueprintInput
  posterType?: PosterShotTypeId
  selectedCharacters?: HeroPromptCharacterInput[]
  selectedSceneRefs?: HeroPromptSceneRefInput[]
  selectedObjectRefs?: HeroPromptObjectRefInput[]
  sharedContinuitySource?: SharedContinuitySource | null
  explicitReferenceImages?: ReferenceImage[]
  maxReferenceImages?: number
}): {
  resolvedContinuity: ReturnType<typeof resolveBlueprintContinuity>
  referenceImages: ReferenceImage[]
  referenceBindingPromptBlock: string
} {
  const {
    treatment,
    posterType = 'hero-portrait',
    selectedCharacters = [],
    selectedSceneRefs = [],
    selectedObjectRefs = [],
    sharedContinuitySource = null,
    explicitReferenceImages = [],
    maxReferenceImages = 6,
  } = options

  const config = getPosterShotTypeConfig(posterType)
  const resolvedContinuity = resolveBlueprintContinuity(
    treatment as Record<string, any>,
    sharedContinuitySource
  )

  // Merge cast from resolvedContinuity + selectedCharacters
  const allCast: HeroPromptCharacterInput[] = [
    ...selectedCharacters,
    ...resolvedContinuity.cast,
  ]
  const { protagonist, antagonist, supporting } = resolveCastRolesForHero(treatment, allCast)

  // Determine which characters should be bound for this posterType
  let targetCharacters: HeroPromptCharacterInput[] = []
  if (selectedCharacters.length > 0) {
    // Match selected characters against resolvedContinuity so we pick up referenceImage if missing on client object
    targetCharacters = selectedCharacters.map((sc) => {
      const key = normalizeKey(sc.name)
      const fromContinuity = resolvedContinuity.cast.find((c) => normalizeKey(c.name) === key)
      return {
        ...fromContinuity,
        ...sc,
        referenceImage: sc.referenceImage || fromContinuity?.referenceImage || null,
      }
    })
  } else {
    switch (config.characterSelectionMode) {
      case 'confrontation':
        targetCharacters = [protagonist, antagonist].filter(
          (c): c is HeroPromptCharacterInput => Boolean(c)
        )
        break
      case 'ensemble':
        targetCharacters = [protagonist, antagonist, ...supporting]
          .filter((c): c is HeroPromptCharacterInput => Boolean(c))
          .slice(0, 4)
        break
      case 'action-cast':
        targetCharacters = [protagonist, antagonist]
          .filter((c): c is HeroPromptCharacterInput => Boolean(c))
          .slice(0, 2)
        break
      case 'protagonist':
      case 'protagonist-in-world':
      default:
        targetCharacters = protagonist ? [protagonist] : []
        break
    }
  }

  // Merge locations from selectedSceneRefs + resolvedContinuity.locations
  const candidateLocations: Array<{ name: string; imageUrl: string; description?: string }> = []
  const seenLocUrls = new Set<string>()
  const pushLoc = (name: string, url?: string | null, description?: string) => {
    const cleanUrl = asCleanString(url)
    if (!cleanUrl || seenLocUrls.has(cleanUrl)) return
    seenLocUrls.add(cleanUrl)
    candidateLocations.push({ name: name || 'Primary Setting', imageUrl: cleanUrl, description })
  }

  for (const s of selectedSceneRefs) {
    pushLoc(s.name, s.imageUrl || s.referenceImage, s.description)
  }
  for (const loc of resolvedContinuity.locations) {
    pushLoc(loc.name, loc.referenceImage, loc.description || loc.location)
  }

  // Merge props from selectedObjectRefs + resolvedContinuity.props
  const candidateProps: Array<{ name: string; imageUrl: string; description?: string }> = []
  const seenPropUrls = new Set<string>()
  const pushProp = (name: string, url?: string | null, description?: string) => {
    const cleanUrl = asCleanString(url)
    if (!cleanUrl || seenPropUrls.has(cleanUrl)) return
    seenPropUrls.add(cleanUrl)
    candidateProps.push({ name: name || 'Key Prop', imageUrl: cleanUrl, description })
  }

  for (const o of selectedObjectRefs) {
    pushProp(o.name, o.imageUrl || o.referenceImage, o.description)
  }
  for (const prop of resolvedContinuity.props) {
    pushProp(prop.name, prop.referenceImage, prop.description)
  }

  // Assemble prioritized ReferenceImage[] list
  const referenceImages: ReferenceImage[] = []
  const bindingLines: string[] = []
  const seenUrls = new Set<string>()

  const addRef = (imageUrl: string, subjectDescription: string) => {
    const clean = asCleanString(imageUrl)
    if (!clean || seenUrls.has(clean) || referenceImages.length >= maxReferenceImages) return
    seenUrls.add(clean)
    const refId = referenceImages.length + 1
    const labeledDesc = `Reference [${refId}] — ${subjectDescription}`
    referenceImages.push({
      referenceId: refId,
      imageUrl: clean,
      subjectDescription: labeledDesc,
    })
    bindingLines.push(`- ${labeledDesc}`)
  }

  // 0. Explicit reference images if passed directly
  for (const exp of explicitReferenceImages) {
    const url = exp.imageUrl || exp.base64Image
    if (url) {
      addRef(url, exp.subjectDescription || 'Continuity visual reference')
    }
  }

  // 1. For `environment-hero`, attach primary Location reference FIRST so environment anchors composition
  if (posterType === 'environment-hero' && candidateLocations.length > 0) {
    const loc = candidateLocations[0]
    addRef(
      loc.imageUrl,
      `Primary environment & architecture reference for "${loc.name}": match world layout, architectural scale, terrain, and atmosphere as the dominant 75%+ setting`
    )
  }

  // 2. For `key-art`, attach primary Key Prop reference FIRST alongside protagonist
  if (posterType === 'key-art' && candidateProps.length > 0) {
    const prop = candidateProps[0]
    addRef(
      prop.imageUrl,
      `Central symbolic key-art prop reference for "${prop.name}": match object design, materials, and iconic silhouette`
    )
  }

  // 3. Attach Character Identity & Wardrobe continuity references
  for (const char of targetCharacters) {
    const imgUrl = asCleanString(char.referenceImage)
    if (!imgUrl) continue
    if (posterType === 'dramatic-silhouette') {
      addRef(
        imgUrl,
        `Character silhouette & wardrobe reference for ${char.name} (${char.role || 'lead'}): match body proportions, hair outline, and signature attire contour in backlit rim light`
      )
    } else {
      addRef(
        imgUrl,
        `Character identity & wardrobe reference for ${char.name} (${char.role || 'cast'}): match facial features, bone structure, hair, skin tone, and signature wardrobe`
      )
    }
  }

  // 4. Attach Location reference (if not already added for environment-hero)
  if (candidateLocations.length > 0) {
    const loc = candidateLocations[0]
    if (posterType === 'intimate-portrait') {
      addRef(
        loc.imageUrl,
        `Environment lighting & color reference for "${loc.name}": match ambient color palette and lighting tone in soft out-of-focus background bokeh`
      )
    } else {
      addRef(
        loc.imageUrl,
        `Environment / setting reference for "${loc.name}": match architectural style, atmosphere, and color palette in the scene environment`
      )
    }
  }

  // 5. Attach Key Prop reference (if selected or prioritized for posterType)
  if (
    candidateProps.length > 0 &&
    (selectedObjectRefs.length > 0 || config.prioritizePropRef)
  ) {
    for (const prop of candidateProps.slice(0, posterType === 'key-art' ? 2 : 1)) {
      addRef(
        prop.imageUrl,
        `Key story prop reference for "${prop.name}": match object design, materials, and visual details`
      )
    }
  }

  const referenceBindingPromptBlock =
    bindingLines.length > 0
      ? `[CONTINUITY LIBRARY REFERENCES]\nUse the attached reference image(s) to maintain visual continuity with the project library:\n${bindingLines.join('\n')}\n\n`
      : ''

  return {
    resolvedContinuity,
    referenceImages,
    referenceBindingPromptBlock,
  }
}
