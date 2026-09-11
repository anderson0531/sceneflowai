/**
 * Deterministic beat keyframe planner (client-safe, no Gemini).
 */

import {
  detectSceneType,
  extractDirectionMetadata,
  type FilmContext,
  type SceneType,
} from '@/lib/intelligence/scene-direction-metadata'
import {
  formatLookbookForPlannerPrompt,
  formatLookbookStyleAnchor,
  getSceneLookNote,
  type LookbookSceneSummary,
  type ProjectLookbook,
} from '@/lib/intelligence/project-lookbook-fallback'
import { adaptPromptForLyria } from '@/lib/audio/lyriaPromptAdapter'
import { isTitleOrCinematicScene } from '@/lib/script/sceneClassification'
import { actionFramingFromStoredPrompt } from '@/lib/imagen/structuredStillPrompt'
import { beatDirectionFingerprint } from '@/lib/script/beatDirectionFingerprint'
import { formatSceneArcBlock, getSceneMovements } from '@/lib/script/sceneMovements'
import type { BeatDirection, SceneBeat } from '@/lib/script/segmentTypes'

function getSceneDirection(scene: Record<string, unknown>): Record<string, any> | undefined {
  const d = scene.sceneDirection
  return d && typeof d === 'object' ? (d as Record<string, any>) : undefined
}

export type BeatRole =
  | 'opening'
  | 'progression'
  | 'climax'
  | 'title_reveal'
  | 'credit'
  | 'dissolve'
  | 'dialogue'
  | 'narration_backdrop'

export interface BeatKeyframePlan {
  beatIndex: number
  beatRole: BeatRole
  shotType: string
  frozenMoment: string
  prompt: string
  allowTypography: boolean
  durationSeconds?: number
  negativeAdditions?: string[]
  /** Key-light accent for this beat inside the film's lighting grammar. */
  lighting?: string
  /** Focal length for this beat inside the film's lens family. */
  lensMm?: string
  /** Where subjects sit and face, so consecutive beats hold the axis. */
  screenDirection?: string
  /** Visible state carried forward from the previous beat. */
  continuityNote?: string
}

/** The previous beat a frame must stay continuous with, across a scene cut. */
export interface BeatPlannerContinuityAnchor {
  shotType?: string
  frozenMoment?: string
  screenDirection?: string
}

/** Exact library labels the planner must use — appearance comes from reference images. */
export interface BeatSequenceReferenceCatalog {
  characterNames?: string[]
  propNames?: string[]
  locationNames?: string[]
}

export interface BeatSequencePlanRequest {
  scene: Record<string, unknown>
  beats: SceneBeat[]
  sceneNumber: number
  totalScenes?: number
  filmContext?: FilmContext
  artStyle?: string
  projectId?: string
  forceFallback?: boolean
  referenceCatalog?: BeatSequenceReferenceCatalog
  /** The one look every frame in this film shares. */
  lookbook?: ProjectLookbook
  /** One line per scene, so beats connect to the film and not just the scene. */
  storySpine?: LookbookSceneSummary[]
  /** Last beat of the preceding scene, for continuity across the cut. */
  previousSceneLastBeat?: BeatPlannerContinuityAnchor
  /** Code-owned realism anchor, folded in when the lookbook omits one. */
  artStyleAnchor?: string
}

export function formatBeatPlannerReferenceCatalog(
  catalog?: BeatSequenceReferenceCatalog
): string {
  const characters = (catalog?.characterNames ?? []).map((n) => n.trim()).filter(Boolean)
  const props = (catalog?.propNames ?? []).map((n) => n.trim()).filter(Boolean)
  const locations = (catalog?.locationNames ?? []).map((n) => n.trim()).filter(Boolean)
  if (characters.length === 0 && props.length === 0 && locations.length === 0) {
    return ''
  }

  const lines = [
    'REFERENCE LIBRARY (use these exact labels; do not invent appearance — they have reference images):',
  ]
  if (characters.length) lines.push(`Characters: ${characters.join(', ')}`)
  if (props.length) lines.push(`Props: ${props.join(', ')}`)
  if (locations.length) lines.push(`Locations: ${locations.join(', ')}`)
  return lines.join('\n')
}

export interface ComposeBeatStillPromptArgs {
  /** Blocking, shot, gaze, and prop handling for this beat. */
  actionFraming: string
  lookbook?: ProjectLookbook
  /** 0-based, for looking up this scene's departure from the master look. */
  sceneIndex: number
  artStyleAnchor?: string
  lighting?: string
  lensMm?: string
}

/**
 * Wrap a beat's action text in the film's `[GLOBAL STYLE ANCHOR]`.
 *
 * `parseStillPromptSource` lifts that header into the `[STYLE]` block of the
 * final still prompt, which is how a beat frame ends up with a look at all.
 * Without a lookbook this returns the bare action text, so callers with no
 * project look behave exactly as before.
 */
export function composeBeatStillPrompt(args: ComposeBeatStillPromptArgs): string {
  const actionFraming = args.actionFraming.trim()
  if (!args.lookbook || !actionFraming) return actionFraming

  const anchor = formatLookbookStyleAnchor(args.lookbook, {
    artStyleAnchor: args.artStyleAnchor,
    sceneLookNote: getSceneLookNote(args.lookbook, args.sceneIndex),
    beatLighting: args.lighting,
    beatLens: args.lensMm,
  })

  return `${anchor}\n\n[SCENE COMPOSITION & BEAT]\nAction/Framing: ${actionFraming}`
}

function asSentence(value: string): string {
  const trimmed = value.trim().replace(/\s+/g, ' ')
  if (!trimmed) return ''
  return /[.!?:;]$/.test(trimmed) ? trimmed : `${trimmed}.`
}

/**
 * Append a beat facet unless the text is already covered.
 *
 * The composed result is persisted and read back on the next generation, so
 * every facet has to be skipped when it is already present or a regenerated
 * frame would restate its own blocking and gaze each pass.
 */
function appendFacet(parts: string[], value: string | undefined, label?: string): void {
  const trimmed = value?.trim()
  if (!trimmed) return
  const alreadyPresent = parts.join(' ').toLowerCase()
  if (alreadyPresent.includes(trimmed.toLowerCase())) return
  parts.push(label ? `${label}: ${asSentence(trimmed)}` : asSentence(trimmed))
}

/**
 * Whether a beat's stored image prompt still describes its current direction.
 *
 * Express writes the composed prompt back after every generation, and the
 * composer reads it first, so without this check the first frame's wording won
 * forever: regenerating or hand-editing the direction changed nothing on the
 * image. `reconcileSceneBeatsFromScript` only clears the prompt on script
 * edits, which is a different path entirely.
 *
 * Prompts stored before the key existed have no recorded direction, so they are
 * only trusted for beats that have no direction to contradict them.
 */
export function storedPromptMatchesDirection(beat: SceneBeat): boolean {
  if (!beat.storyboardImagePrompt?.trim()) return false
  const currentKey = beatDirectionFingerprint(beat.beatDirection)
  const storedKey = beat.storyboardImagePromptDirectionKey
  if (storedKey === undefined) return currentKey === ''
  return storedKey === currentKey
}

/** Action/framing carried over from a previous generation, when still current. */
function currentStoredActionFraming(beat: SceneBeat): string {
  if (!storedPromptMatchesDirection(beat)) return ''
  return actionFramingFromStoredPrompt(beat.storyboardImagePrompt)
}

/**
 * Build the frame description for a beat out of its structured direction.
 *
 * The lookbook path skips scene-image intelligence entirely, so nothing else
 * would state who is on camera, how they are blocked, or which prop they are
 * handling. Library and cast names here are bound to person/prop tokens later,
 * during still assembly.
 */
export function composeBeatActionFraming(beat?: SceneBeat | null): string {
  if (!beat) return ''
  const direction = beat.beatDirection

  const storedBody = currentStoredActionFraming(beat)
  const body =
    storedBody ||
    direction?.frozenMoment?.trim() ||
    beat.actionDescription?.trim() ||
    beat.line?.trim() ||
    ''
  if (!body) return ''

  if (!storedBody && beat.storyboardImagePrompt?.trim()) {
    console.log(
      `[BeatFraming] Beat ${beat.beatId} — stored prompt is stale for current direction; recomposing`
    )
  }

  const parts: string[] = []
  appendFacet(parts, body)
  appendFacet(parts, direction?.blocking, 'Blocking')
  appendFacet(parts, direction?.propInteraction, 'Prop handling')
  appendFacet(parts, direction?.gaze, 'Gaze')

  // A prop reference is only attached when the frame names it, so a directed
  // key prop that no other facet mentions has to be stated here.
  const described = parts.join(' ').toLowerCase()
  const unmentionedProps = (direction?.keyProps ?? [])
    .map((prop) => prop.trim())
    .filter((prop) => prop && !described.includes(prop.toLowerCase()))
  if (unmentionedProps.length > 0) {
    parts.push(`Props in frame: ${unmentionedProps.join(', ')}.`)
  }

  // Framing leads the description, but a body read back from a previously
  // composed frame already opens with it.
  const shot = [direction?.shotType?.trim(), direction?.cameraAngle?.trim()]
    .filter(Boolean)
    .join(', ')
  if (shot && !described.includes(shot.toLowerCase())) {
    parts.unshift(asSentence(shot))
  }

  return parts.join(' ')
}

/** Action/Framing only — never the style header a lookbook wrap already owns. */
export function actionFramingFromBeat(beat?: SceneBeat | null): string {
  if (!beat) return ''
  return (
    composeBeatActionFraming(beat) ||
    currentStoredActionFraming(beat) ||
    beat.beatDirection?.frozenMoment?.trim() ||
    beat.actionDescription?.trim() ||
    beat.line?.trim() ||
    ''
  )
}

/**
 * When the film already has a look and this beat already has direction or a
 * stored still prompt, compose the frame in code and skip Flash intelligence.
 */
export function composePersistedLookbookBeatPrompt(args: {
  lookbook?: ProjectLookbook
  sceneIndex: number
  beat?: SceneBeat | null
  artStyleAnchor?: string
}): string | undefined {
  const { lookbook, beat } = args
  if (!lookbook || !beat) return undefined
  const hasStoredLook =
    Boolean(beat.beatDirection) || Boolean(beat.storyboardImagePrompt?.trim())
  if (!hasStoredLook) return undefined
  const actionFraming = actionFramingFromBeat(beat)
  if (!actionFraming) return undefined
  return composeBeatStillPrompt({
    actionFraming,
    lookbook,
    sceneIndex: args.sceneIndex,
    artStyleAnchor: args.artStyleAnchor,
    lighting: beat.beatDirection?.lightingAccent,
  })
}

export function buildPlannerSystemPrompt(): string {
  return `You are a cinematic still-frame planner for an animatic. Plan a CONTINUOUS SEQUENCE of live-action photoreal film stills — one frozen instant per beat — that read as coverage of one continuous moment in one film. These stills illustrate the beats for the animatic. They are NOT Veo/F2V start frames, NOT video clips, and NOT motion direction.

COVERAGE VARIES, THE LOOK DOES NOT. Beats differ in what the camera is pointed at. They never differ in palette, grade, key-light direction, or lens family.

CRITICAL RULES:
1. Vary coverage, not look. Each beat must change at least one of: subject, shot scale, or camera angle. Palette, key-light direction and quality, lens family, and grade stay locked to the PROJECT LOOKBOOK on every beat. Two beats sharing a look is correct; two beats sharing a camera setup is not.
2. Hold continuity across consecutive beats. Keep screen direction and eyelines consistent — a character facing frame-right stays facing frame-right, and do not cross the axis unless the beat calls for it. Carry visible state forward: a prop set down in beat 2 is still down in beat 3, a door opened stays open, dirt and damage accumulate and never reset.
3. NO camera movement and NO temporal/motion verbs (pulses, glitching, flickering, walking through). Describe a single photograph.
4. Title typography ONLY on beats with beatRole "title_reveal" or "credit". All other beats: NO on-screen text.
5. Map direction.camera.shots to beats when provided (beat 0 → shot 0, etc.).
6. Follow the narrative arc: opening → progression → climax → title_reveal (if title scene) → dissolve.
7. "lighting" and "lensMm" place THIS beat inside the film's established grammar — a key-light accent and a focal length, never a new look. Derive both from the PROJECT LOOKBOOK. Leave a field empty rather than contradict the lookbook.
8. The "prompt" field is Action/Framing ONLY: shot type, body blocking, who holds which named library prop, gaze. Do NOT write style dumps, lighting essays, exclusions, F2V, or start-frame language — the lookbook and code own those.
9. Use EXACT character / prop / location labels from the REFERENCE LIBRARY. Do not invent objects that are not listed. Do not describe the visual appearance of library props or locations (reference images own appearance).
10. When art style is photorealistic, keep action language photographic (no illustration, cartoon, or anime). Populate negativeAdditions with anti-illustration terms.

Output JSON:
{
  "reasoning": "brief arc explanation",
  "beats": [
    {
      "beatIndex": 0,
      "beatRole": "opening|progression|climax|title_reveal|credit|dissolve|dialogue|narration_backdrop",
      "shotType": "Wide Shot",
      "frozenMoment": "one-sentence frozen moment description",
      "prompt": "Action/Framing only for this beat",
      "lighting": "key-light accent for this beat within the film's lighting grammar",
      "lensMm": "35mm",
      "screenDirection": "who sits where in frame and which way they face",
      "continuityNote": "what carries over from the previous beat",
      "allowTypography": false,
      "durationSeconds": 4,
      "negativeAdditions": []
    }
  ]
}`
}

export function buildPlannerUserPrompt(request: BeatSequencePlanRequest): string {
  const { scene, beats, sceneNumber, totalScenes, filmContext, artStyle } = request
  const heading = String(scene.heading ?? '')
  const action = String(scene.action ?? '')
  const visualDescription = String(scene.visualDescription ?? '')
  const direction = getSceneDirection(scene)
  const sceneType = detectSceneType(heading, action || visualDescription, sceneNumber, totalScenes)
  const directionMeta = extractDirectionMetadata(direction)
  const shots = getDirectionShots(scene)

  const parts: string[] = []
  parts.push(
    `Plan ${beats.length} continuous frozen animatic stills for this scene (Action/Framing only — not video motion).`
  )
  parts.push('')

  if (request.lookbook) {
    parts.push(
      formatLookbookForPlannerPrompt(
        request.lookbook,
        getSceneLookNote(request.lookbook, sceneNumber - 1)
      )
    )
    parts.push('')
  }

  if (filmContext?.title) parts.push(`Film Title: "${filmContext.title}"`)
  if (filmContext?.genre?.length) parts.push(`Genre: ${filmContext.genre.join(', ')}`)
  if (filmContext?.tone) parts.push(`Tone: ${filmContext.tone}`)
  if (filmContext?.logline) parts.push(`Logline: ${filmContext.logline}`)
  if (filmContext?.visualStyle) parts.push(`Director's visual style: ${filmContext.visualStyle}`)
  parts.push(`Art Style: ${artStyle || 'photorealistic'}`)
  parts.push('')

  const spine = request.storySpine ?? []
  if (spine.length > 1) {
    parts.push('STORY SPINE (the whole film — these beats must belong to it):')
    for (const entry of spine) {
      const marker = entry.sceneIndex === sceneNumber - 1 ? '>' : ' '
      parts.push(
        `${marker} ${entry.sceneIndex + 1}. ${entry.heading || '(untitled)'} — ${entry.oneLine || '(no description)'}`
      )
    }
    parts.push('')
  }

  parts.push(`SCENE ${sceneNumber}${totalScenes ? ` of ${totalScenes}` : ''}: ${heading}`)
  parts.push(`Scene Type: ${sceneType.toUpperCase()}`)
  parts.push('')

  const anchor = request.previousSceneLastBeat
  const anchorCues = [anchor?.shotType, anchor?.frozenMoment, anchor?.screenDirection]
    .map((cue) => (cue ?? '').trim())
    .filter(Boolean)
  if (anchorCues.length > 0) {
    parts.push('PREVIOUS SCENE ENDED ON (match the look; the first beat here cuts from it):')
    parts.push(anchorCues.join(' — '))
    parts.push('')
  }

  parts.push('SCENE ACTION:')
  parts.push(action || visualDescription || '(none)')
  parts.push('')

  // The arc tells the planner which run of beats carries which part of the
  // scene, so coverage follows the story instead of spreading evenly.
  const movements = getSceneMovements(scene, beats)
  if (movements.length > 0) {
    parts.push(formatSceneArcBlock(movements))
    parts.push(
      'Plan each beat for its own movement. Beats inside one movement advance it; the frame at a movement boundary must show the story turning.'
    )
    parts.push('')
  }

  if (shots.length > 0) {
    parts.push('CAMERA SHOTS (map to beats in order):')
    shots.forEach((shot, i) => parts.push(`  ${i + 1}. ${shot}`))
    parts.push('')
  }

  const cues: string[] = []
  if (directionMeta.atmosphere) cues.push(`Atmosphere: ${directionMeta.atmosphere}`)
  if (directionMeta.lightingMood) cues.push(`Lighting: ${directionMeta.lightingMood}`)
  if (directionMeta.colorTemperature) cues.push(`Color: ${directionMeta.colorTemperature}`)
  if (directionMeta.keyProps?.length) cues.push(`Props: ${directionMeta.keyProps.join(', ')}`)
  if (directionMeta.locationDescription) cues.push(`Location: ${directionMeta.locationDescription}`)
  if (direction?.audio?.priorities) cues.push(`Audio mood: ${direction.audio.priorities}`)
  if (cues.length > 0) {
    parts.push('DIRECTION CUES:')
    parts.push(cues.join('\n'))
    parts.push('')
  }

  const catalogBlock = formatBeatPlannerReferenceCatalog(request.referenceCatalog)
  if (catalogBlock) {
    parts.push(catalogBlock)
    parts.push('')
  }

  parts.push('BEATS TO PLAN:')
  beats.forEach((beat, i) => {
    const label =
      beat.kind === 'action'
        ? beat.actionDescription ?? 'action beat'
        : beat.kind === 'narration'
          ? `narration: ${beat.line ?? ''}`
          : `dialogue: ${beat.character ?? ''} — ${beat.line ?? ''}`
    parts.push(`  Beat ${i} (${beat.kind}): ${label}`)
  })

  if (sceneType === 'title' && filmContext?.title) {
    parts.push('')
    parts.push(
      `TITLE SEQUENCE: Exactly ONE beat should use beatRole "title_reveal" with allowTypography true and centered "${filmContext.title}" typography. Other beats are atmospheric progression with NO text.`
    )
  }

  return parts.join('\n')
}

const BEAT_ROLES: readonly BeatRole[] = [
  'opening',
  'progression',
  'climax',
  'title_reveal',
  'credit',
  'dissolve',
  'dialogue',
  'narration_backdrop',
]

/** A `beatRole` read back off a stored beat is plain text; narrow it to the union. */
export function asBeatRole(value: unknown): BeatRole | undefined {
  return typeof value === 'string' && (BEAT_ROLES as readonly string[]).includes(value)
    ? (value as BeatRole)
    : undefined
}

/** Accepts a stored role, so an unrecognized or absent one forbids text. */
export function roleAllowsTypography(role: string | undefined): boolean {
  return role === 'title_reveal' || role === 'credit'
}

export function inferBeatRole(
  beat: SceneBeat,
  beatIndex: number,
  totalBeats: number,
  sceneType: SceneType,
  filmTitle?: string
): BeatRole {
  if (beat.kind === 'dialogue') return 'dialogue'
  if (beat.kind === 'narration') return 'narration_backdrop'

  const text = (beat.actionDescription ?? '').toLowerCase()
  const title = (filmTitle ?? '').toLowerCase()

  if (
    sceneType === 'title' ||
    sceneType === 'credits' ||
    text.includes('title card') ||
    text.includes('centered typography')
  ) {
    if (text.includes('written by') || text.includes('credit')) return 'credit'
    if (
      text.includes('title card') ||
      text.includes('bold centered') ||
      (title && text.includes(title))
    ) {
      return 'title_reveal'
    }
    if (text.includes('dissolve') || text.includes('fade') || text.includes('hold')) {
      return beatIndex === totalBeats - 1 ? 'dissolve' : 'progression'
    }
    if (beatIndex === 0) return 'opening'
    if (beatIndex === totalBeats - 1) return 'dissolve'
    return 'progression'
  }

  if (beatIndex === 0) return 'opening'
  if (beatIndex === totalBeats - 1) return 'climax'
  return 'progression'
}

function getDirectionShots(scene: Record<string, unknown>): string[] {
  const direction = getSceneDirection(scene)
  const shots = direction?.camera?.shots
  if (!Array.isArray(shots)) return []
  return shots.map((s) => String(s).trim()).filter(Boolean)
}

function getProgressiveMoments(scene: Record<string, unknown>, beatCount: number): string[] {
  const direction = getSceneDirection(scene)
  const sceneDescription = String(
    direction?.sceneDescription ?? scene.action ?? scene.visualDescription ?? ''
  ).trim()
  if (!sceneDescription) return []

  const sentences = sceneDescription.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 8)
  if (sentences.length === 0) return [sceneDescription]

  if (sentences.length >= beatCount) {
    return sentences.slice(0, beatCount)
  }

  const moments: string[] = []
  for (let i = 0; i < beatCount; i++) {
    const idx = Math.floor((i / beatCount) * sentences.length)
    moments.push(sentences[Math.min(idx, sentences.length - 1)])
  }
  return moments
}

function buildSetContext(scene: Record<string, unknown>, includeFull: boolean): string {
  const direction = getSceneDirection(scene)
  if (!includeFull) return ''
  const parts: string[] = []
  if (direction?.scene?.location) parts.push(String(direction.scene.location))
  if (direction?.scene?.atmosphere) parts.push(String(direction.scene.atmosphere))
  const props = direction?.scene?.keyProps
  if (Array.isArray(props) && props.length > 0) {
    parts.push(`Props: ${props.slice(0, 4).join(', ')}`)
  }
  const lighting = direction?.lighting
  if (lighting?.overallMood) parts.push(String(lighting.overallMood))
  if (lighting?.colorTemperature) parts.push(String(lighting.colorTemperature))
  return parts.filter(Boolean).join('. ')
}

function buildTitleDirectionContext(
  scene: Record<string, unknown>,
  directionMeta: ReturnType<typeof extractDirectionMetadata>,
  shotType: string
): string {
  const parts: string[] = []
  if (directionMeta.atmosphere) parts.push(`Atmosphere: ${directionMeta.atmosphere}`)
  if (directionMeta.lightingMood) parts.push(`Lighting: ${directionMeta.lightingMood}`)
  if (directionMeta.colorTemperature) parts.push(`Color: ${directionMeta.colorTemperature}`)
  if (directionMeta.locationDescription) parts.push(`Location: ${directionMeta.locationDescription}`)
  if (directionMeta.keyProps?.length) parts.push(`Props: ${directionMeta.keyProps.join(', ')}`)
  if (shotType) parts.push(`Camera: ${shotType}`)
  const direction = getSceneDirection(scene)
  if (direction?.audio?.priorities) parts.push(`Audio mood: ${direction.audio.priorities}`)
  return parts.filter(Boolean).join('. ')
}

export function buildFallbackBeatPlans(request: BeatSequencePlanRequest): BeatKeyframePlan[] {
  const { scene, beats, sceneNumber, totalScenes, filmContext } = request
  const heading = String(scene.heading ?? '')
  const action = String(scene.action ?? scene.visualDescription ?? '')
  const sceneType = detectSceneType(heading, action, sceneNumber, totalScenes)
  const shots = getDirectionShots(scene)
  const moments = getProgressiveMoments(scene, beats.length)
  const directionMeta = extractDirectionMetadata(getSceneDirection(scene))
  const filmTitle = filmContext?.title

  return beats.map((beat, beatIndex) => {
    const beatRole = inferBeatRole(beat, beatIndex, beats.length, sceneType, filmTitle)
    const shotType = shots[beatIndex] ?? shots[shots.length - 1] ?? 'Medium shot'
    const moment =
      beat.actionDescription?.trim() ||
      (beat.kind === 'dialogue'
        ? [beat.character, beat.line].filter(Boolean).join(' — ')
        : '') ||
      (beat.kind !== 'dialogue' ? moments[beatIndex] : '') ||
      `Beat ${beatIndex + 1} visual moment`
    const setContext = buildSetContext(scene, beatIndex === 0 || beatIndex === beats.length - 1)

    const frozenParts = [`${shotType}: ${moment}`]
    if (setContext) frozenParts.push(setContext)
    if (directionMeta.atmosphere && (beatIndex === 0 || sceneType === 'title')) {
      frozenParts.push(`Atmosphere: ${directionMeta.atmosphere}`)
    }

    const frozenMoment = frozenParts.join('. ').replace(/\.\s*\./g, '.').trim()
    const allowTypography = roleAllowsTypography(beatRole)
    const titleDirectionContext =
      sceneType === 'title' ? buildTitleDirectionContext(scene, directionMeta, shotType) : ''

    let prompt = `${shotType}: ${frozenMoment}`
    if (titleDirectionContext) {
      prompt += `. ${titleDirectionContext}. Abstract digital composition, no people, no character portraits`
    }
    if (allowTypography && filmTitle) {
      prompt += `. Centered bold typography displaying "${filmTitle}" as the main visual element`
    } else if (beat.kind === 'narration') {
      prompt += '. Voiceover backdrop — environment and mood only, no narrator on screen'
    } else if (beat.kind === 'dialogue' && beat.character) {
      prompt += `. Focus on ${beat.character}${beat.line ? `: "${beat.line}"` : ''}`
    }
    if (!allowTypography) {
      prompt += '. No on-screen text, no dialogue captions'
    }
    prompt += '.'

    const durationSeconds =
      beatRole === 'climax' ? 6 : beatRole === 'title_reveal' ? 5 : beatRole === 'dissolve' ? 3 : 4

    return {
      beatIndex,
      beatRole,
      shotType,
      frozenMoment,
      prompt: composeBeatStillPrompt({
        actionFraming: prompt.trim(),
        lookbook: request.lookbook,
        sceneIndex: sceneNumber - 1,
        artStyleAnchor: request.artStyleAnchor,
        lighting: directionMeta.lightingMood,
      }),
      allowTypography,
      durationSeconds,
      ...(directionMeta.lightingMood ? { lighting: directionMeta.lightingMood } : {}),
    }
  })
}

/**
 * Merge planner-derived direction into a beat's `beatDirection` WITHOUT
 * overwriting fields already authored by the LLM (or the user). Only fills
 * gaps. Marks the record `generatedBy: 'planner'` when the beat had no prior
 * direction so downstream consumers know provenance.
 */
function mergePlannerDirectionIntoBeat(
  beat: SceneBeat,
  plan: BeatKeyframePlan
): BeatDirection | undefined {
  const existing = beat.beatDirection
  const authored = existing?.generatedBy === 'llm' || existing?.generatedBy === 'user'

  const planShotType = plan.shotType?.trim() || undefined
  const planFrozenMoment = plan.frozenMoment?.trim() || undefined
  const planLighting = plan.lighting?.trim() || undefined

  if (!planShotType && !planFrozenMoment && !planLighting && !existing) return undefined

  const merged: BeatDirection = { ...(existing ?? {}) }
  if (!merged.shotType && planShotType) merged.shotType = planShotType
  if (!merged.frozenMoment && planFrozenMoment) merged.frozenMoment = planFrozenMoment
  if (!merged.lightingAccent && planLighting) merged.lightingAccent = planLighting

  merged.generatedBy = authored ? existing?.generatedBy : merged.generatedBy || 'planner'
  merged.updatedAt = new Date().toISOString()
  return merged
}

export function applyBeatKeyframePlansToScene(
  scene: Record<string, unknown>,
  plans: BeatKeyframePlan[]
): Record<string, unknown> {
  const beats = Array.isArray(scene.beats) ? [...(scene.beats as SceneBeat[])] : []
  for (const plan of plans) {
    const beat = beats[plan.beatIndex]
    if (!beat) continue
    const mergedDirection = mergePlannerDirectionIntoBeat(beat, plan)
    beats[plan.beatIndex] = {
      ...beat,
      beatRole: plan.beatRole,
      storyboardImagePrompt: plan.prompt,
      // The plan and the direction it merges are written together, so the
      // prompt is keyed to the direction as it will be after this write.
      storyboardImagePromptDirectionKey: beatDirectionFingerprint(
        mergedDirection ?? beat.beatDirection
      ),
      ...(plan.durationSeconds ? { durationSeconds: plan.durationSeconds } : {}),
      ...(mergedDirection ? { beatDirection: mergedDirection } : {}),
    }
  }
  return { ...scene, beats }
}

/** Ensure scene.music.description exists from direction audio cues. */
export function ensureSceneMusicFromDirection(
  scene: Record<string, unknown>
): Record<string, unknown> {
  const existing =
    typeof scene.music === 'string'
      ? scene.music
      : (scene.music as { description?: string } | undefined)?.description
  if (existing?.trim()) return scene

  const direction = getSceneDirection(scene)
  const audioParts: string[] = []
  if (direction?.audio?.priorities) audioParts.push(String(direction.audio.priorities))
  if (direction?.audio?.considerations) audioParts.push(String(direction.audio.considerations))

  const sceneDescription = String(direction?.sceneDescription ?? '').trim()
  const audioLine = sceneDescription.match(/audio[:\s]+([^.]+(?:\.[^.]+)*)/i)?.[1]
  if (audioLine) audioParts.push(audioLine.trim())

  const description = audioParts.filter(Boolean).join('. ').trim()
  if (!description) {
    if (isTitleOrCinematicScene(scene)) {
      return {
        ...scene,
        music: {
          description:
            'Cinematic orchestral score, building ethereal tension with layered digital synthesis and atmospheric pads, suitable for a title sequence.',
        },
      }
    }
    return scene
  }

  return {
    ...scene,
    music: { description: adaptPromptForLyria(description) },
  }
}
