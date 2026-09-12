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
import {
  collapseCameraAngleProgression,
  collapseThenSequence,
} from '@/lib/imagen/providerStillPromptEmit'
import { actionFramingFromStoredPrompt } from '@/lib/imagen/structuredStillPrompt'
import { storedStillDirectionKeyMatches } from '@/lib/script/beatDirectionFingerprint'
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
  /** Shot scale used to drop incompatible lookbook insert/wide lenses. */
  shotType?: string
}

/**
 * Wrap a beat's action text in `[SCENE COMPOSITION & BEAT]`, under the film's
 * `[GLOBAL STYLE ANCHOR]` when there is a lookbook.
 *
 * `parseStillPromptSource` lifts those headers into the `[STYLE]` and
 * Action/Framing blocks of the final still prompt, which is how a beat frame
 * ends up with a look at all.
 *
 * The composition section is emitted with or without a lookbook. It is what
 * `isStructuredStillPrompt` keys on, and a beat prompt that fails that test is
 * handed to the rules optimizer, which rewrites it into its own template —
 * declaring the frame to be "about" every attached character and discarding the
 * shot language written here. A project whose lookbook failed to resolve used
 * to lose its beat prompts to that path.
 */
export function composeBeatStillPrompt(args: ComposeBeatStillPromptArgs): string {
  const actionFraming = args.actionFraming.trim()
  if (!actionFraming) return ''

  const composition = `[SCENE COMPOSITION & BEAT]\nAction/Framing: ${actionFraming}`
  if (!args.lookbook) {
    const anchor = args.artStyleAnchor?.trim()
    return anchor
      ? `[GLOBAL STYLE ANCHOR]\nMaster Style: ${anchor}\n\n${composition}`
      : composition
  }

  const anchor = formatLookbookStyleAnchor(args.lookbook, {
    artStyleAnchor: args.artStyleAnchor,
    sceneLookNote: getSceneLookNote(args.lookbook, args.sceneIndex),
    beatLighting: args.lighting,
    beatLens: args.lensMm,
    beatShotType: args.shotType,
  })

  return `${anchor}\n\n${composition}`
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
 * Answers "is the text we last sent the image model still worth showing" — it
 * does not decide what the next frame is composed from. `composeBeatActionFraming`
 * derives that from the direction regardless, because a stored prompt keyed to
 * the direction it shipped with looks current even when its wording was wrong
 * from the start.
 *
 * Prompts stored before the key existed have no recorded direction, so they are
 * only trusted for beats that have no direction to contradict them.
 */
export function storedPromptMatchesDirection(beat: SceneBeat): boolean {
  if (!beat.storyboardImagePrompt?.trim()) return false
  return storedStillDirectionKeyMatches(
    beat.storyboardImagePromptDirectionKey,
    beat.beatDirection
  )
}

/** Action/framing carried over from a previous generation, when still current. */
function currentStoredActionFraming(beat: SceneBeat): string {
  if (!storedPromptMatchesDirection(beat)) return ''
  return actionFramingFromStoredPrompt(beat.storyboardImagePrompt)
}

/**
 * Build the frame description for a beat out of its structured direction.
 *
 * A pure function of the direction and the beat's own prose. It deliberately
 * does not read `storyboardImagePrompt`: that field holds whatever text was
 * last sent to the image model, and reading it back made the first wording win
 * forever. A planner sentence that placed the wrong cast in the wrong shot was
 * keyed to the direction it was generated alongside, so the staleness check
 * passed and the direction never got a say. Direction is the reliable record,
 * so it is the source here and the stored prompt is only ever an output.
 *
 * Library and cast names are bound to person/prop tokens later, during still
 * assembly.
 */
export function composeBeatActionFraming(beat?: SceneBeat | null): string {
  if (!beat) return ''
  const direction = beat.beatDirection

  const frozen = direction?.frozenMoment?.trim()
  const described = beat.actionDescription?.trim() || beat.line?.trim() || ''

  const parts: string[] = []
  // Frozen moment is the only action sentence when present. The beat's prose
  // usually spans time; appending it is what splits one frame into two beats.
  appendFacet(parts, frozen || described)
  appendFacet(parts, direction?.blocking, 'Blocking')
  appendFacet(parts, collapseThenSequence(direction?.propInteraction, frozen), 'Prop handling')
  appendFacet(parts, direction?.gaze, 'Gaze')

  // A prop reference is only attached when the frame names it, so a directed
  // key prop that no other facet mentions has to be stated here.
  const soFar = parts.join(' ').toLowerCase()
  const unmentionedProps = (direction?.keyProps ?? [])
    .map((prop) => prop.trim())
    .filter((prop) => prop && !soFar.includes(prop.toLowerCase()))
  if (unmentionedProps.length > 0) {
    parts.push(`Props in frame: ${unmentionedProps.join(', ')}.`)
  }

  // Occupancy is stated rather than left to the prose. Prose says "she reaches
  // for the lever" or says nothing about people at all, and an image model
  // reading either one is free to decide how many people that means — which is
  // how a close-up of a pressure gauge came back with a character mid-fall.
  // The empty list is the load-bearing case: it is the only way to say that a
  // frame of a gauge or a hatch has nobody standing in it.
  const cast = direction?.castInFrame
  if (Array.isArray(cast)) {
    const named = cast.map((name) => name.trim()).filter(Boolean)
    parts.push(
      named.length === 0
        ? 'No people in frame: no faces, no hands, no silhouettes, no figures.'
        : `Cast in frame: ${named.join(', ')} — and no other people.`
    )
  }

  // Framing leads the description, unless the beat's own prose already names
  // this shot and would otherwise state it twice.
  const shot = [
    direction?.shotType?.trim(),
    collapseCameraAngleProgression(direction?.cameraAngle, frozen),
  ]
    .filter(Boolean)
    .join(', ')
  if (shot && !soFar.includes(shot.toLowerCase())) {
    parts.unshift(asSentence(shot))
  }

  return parts.join(' ')
}

/**
 * Action/Framing only — never the style header a lookbook wrap already owns.
 *
 * The stored prompt is the last resort rather than the first, and it is only
 * reachable for a beat carrying no direction facet and no prose of its own —
 * a legacy beat hydrated from `scene.imagePrompt`. Anything the direction can
 * describe, it describes.
 */
export function actionFramingFromBeat(beat?: SceneBeat | null): string {
  if (!beat) return ''
  return composeBeatActionFraming(beat) || currentStoredActionFraming(beat)
}

/**
 * Lead-in for a title or credit beat, which is typography rather than coverage.
 *
 * Stated inside the composition section rather than ahead of it, because
 * everything before the first section header is dropped when the prompt is
 * parsed back for assembly.
 */
export const TITLE_BEAT_ACTION_LEAD_IN =
  'Abstract cinematic digital composition with NO people and NO character portraits. Centered title typography is the primary subject.'

/**
 * When this beat already has direction or a stored still prompt, compose the
 * frame in code and skip Flash intelligence.
 *
 * A lookbook only adds the style anchor. It is not a precondition: the
 * composition section has to be emitted either way so the result survives
 * `isStructuredStillPrompt` instead of being rewritten by the rules optimizer.
 */
export function composePersistedBeatStillPrompt(args: {
  lookbook?: ProjectLookbook
  sceneIndex: number
  beat?: SceneBeat | null
  artStyleAnchor?: string
  /** Prepended inside the composition, for title and credit beats. */
  actionLeadIn?: string
}): string | undefined {
  const { lookbook, beat } = args
  if (!beat) return undefined
  const hasStoredLook =
    Boolean(beat.beatDirection) || Boolean(beat.storyboardImagePrompt?.trim())
  if (!hasStoredLook) return undefined
  const composed = actionFramingFromBeat(beat)
  if (!composed) return undefined
  const leadIn = args.actionLeadIn?.trim()
  const actionFraming =
    leadIn && !composed.includes(leadIn) ? `${asSentence(leadIn)} ${composed}` : composed
  return composeBeatStillPrompt({
    actionFraming,
    lookbook,
    sceneIndex: args.sceneIndex,
    artStyleAnchor: args.artStyleAnchor,
    lighting: beat.beatDirection?.lightingAccent,
    shotType: beat.beatDirection?.shotType,
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

/**
 * The set this beat sits in — where it is and what the air is like.
 *
 * Scene `keyProps` is deliberately excluded. It is the catalog of props present
 * somewhere in the scene, and the beat decides which of them the frame shows;
 * dumping it here asked one beat's frame for up to four props staged in other
 * beats. Lighting mood and colour temperature are excluded for the same reason
 * a beat does not restate the film's look: the lookbook style anchor owns them.
 * All of it was persisted onto `beatDirection.frozenMoment`, so it came back on
 * every regeneration of that frame.
 */
function buildSetContext(scene: Record<string, unknown>): string {
  const direction = getSceneDirection(scene)
  return [direction?.scene?.location, direction?.scene?.atmosphere]
    .map((value) => (value ? String(value).trim() : ''))
    .filter(Boolean)
    .join('. ')
}

/**
 * Direction facets for an abstract title card, which has no staged action to
 * carry them. Facets the frozen moment already states are skipped, so the set
 * is not described twice in one prompt.
 */
function buildTitleDirectionContext(
  scene: Record<string, unknown>,
  directionMeta: ReturnType<typeof extractDirectionMetadata>,
  shotType: string,
  frozenMoment: string
): string {
  const stated = frozenMoment.toLowerCase()
  const parts: string[] = []
  const append = (label: string, value?: string) => {
    const trimmed = value?.trim()
    if (!trimmed || stated.includes(trimmed.toLowerCase())) return
    parts.push(`${label}: ${trimmed}`)
  }
  append('Atmosphere', directionMeta.atmosphere)
  append('Lighting', directionMeta.lightingMood)
  append('Color', directionMeta.colorTemperature)
  append('Location', directionMeta.locationDescription)
  append('Props', directionMeta.keyProps?.join(', '))
  append('Camera', shotType)
  append('Audio mood', getSceneDirection(scene)?.audio?.priorities)
  return parts.join('. ')
}

/**
 * Drop a framing prefix the moment text already carries.
 *
 * `deriveActionBeatsFromDirection` composes `actionDescription` as
 * `${shot}: ${moment}` from the same direction shot list this planner reads, so
 * a beat's moment usually already opens with the framing the prompt is about to
 * state — the source of `Medium shot: Medium shot: ...` frames. Only prefixes
 * drawn from that list are removed; an arbitrary `Word:` opening is the
 * writer's, not ours.
 */
function stripLeadingShotPrefix(text: string, candidates: string[]): string {
  const known = candidates.map((c) => c.trim().toLowerCase()).filter(Boolean)
  let out = text.trim()
  // Two layers can stack: one from the beat's stored action, one from the shot
  // the direction assigned to the same index.
  for (let pass = 0; pass < 2; pass++) {
    const colon = out.indexOf(':')
    if (colon <= 0) break
    if (!known.includes(out.slice(0, colon).trim().toLowerCase())) break
    const rest = out.slice(colon + 1).trim()
    if (!rest) break
    out = rest
  }
  return out || text.trim()
}

/**
 * Join prompt clauses into sentences without doubling terminators.
 *
 * Clauses come from direction text that may or may not already end in
 * punctuation, and the composed prompt is written back onto the beat and read
 * again on the next generation — so a stray `vault..` survives every
 * regeneration of that frame rather than being a one-off cosmetic slip.
 */
function joinPromptClauses(parts: string[]): string {
  const joined = parts
    .map((part) => part.trim().replace(/[.\s]+$/, ''))
    .filter(Boolean)
    .join('. ')
    .replace(/\s{2,}/g, ' ')
    .trim()
  if (!joined) return ''
  return /[.!?]["'’”]?$/.test(joined) ? joined : `${joined}.`
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
    const rawMoment =
      beat.actionDescription?.trim() ||
      (beat.kind === 'dialogue'
        ? [beat.character, beat.line].filter(Boolean).join(' — ')
        : '') ||
      (beat.kind !== 'dialogue' ? moments[beatIndex] : '') ||
      `Beat ${beatIndex + 1} visual moment`
    const moment = stripLeadingShotPrefix(rawMoment, [shotType, ...shots])
    // Every beat of a scene stands in the same set, so every beat states it.
    // Gating this on the first and last beat left the middle of a scene
    // unanchored while loading its two ends with scene-wide detail.
    const setContext = buildSetContext(scene)

    // Framing is deliberately absent here: `frozenMoment` is persisted onto
    // `beat.beatDirection`, which already carries `shotType` as its own field
    // and has `composeBeatActionFraming` prepend it when composing a frame.
    const frozenParts = [moment]
    if (setContext && !moment.toLowerCase().includes(setContext.toLowerCase())) {
      frozenParts.push(setContext)
    }

    const frozenMoment = joinPromptClauses(frozenParts)
    const allowTypography = roleAllowsTypography(beatRole)
    const titleDirectionContext =
      sceneType === 'title'
        ? buildTitleDirectionContext(scene, directionMeta, shotType, frozenMoment)
        : ''

    const promptParts = [`${shotType}: ${frozenMoment}`]
    if (titleDirectionContext) {
      promptParts.push(
        titleDirectionContext,
        'Abstract digital composition, no people, no character portraits'
      )
    }
    if (allowTypography && filmTitle) {
      promptParts.push(
        `Centered bold typography displaying "${filmTitle}" as the main visual element`
      )
    } else if (beat.kind === 'narration') {
      promptParts.push('Voiceover backdrop — environment and mood only, no narrator on screen')
    } else if (beat.kind === 'dialogue' && beat.character) {
      promptParts.push(`Focus on ${beat.character}${beat.line ? `: "${beat.line}"` : ''}`)
    }
    if (!allowTypography) {
      promptParts.push('No on-screen text, no dialogue captions')
    }

    const prompt = joinPromptClauses(promptParts)

    const durationSeconds =
      beatRole === 'climax' ? 6 : beatRole === 'title_reveal' ? 5 : beatRole === 'dissolve' ? 3 : 4

    return {
      beatIndex,
      beatRole,
      shotType,
      frozenMoment,
      prompt: composeBeatStillPrompt({
        actionFraming: prompt,
        lookbook: request.lookbook,
        sceneIndex: sceneNumber - 1,
        artStyleAnchor: request.artStyleAnchor,
        lighting: directionMeta.lightingMood,
        shotType,
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

/**
 * Write a plan's structured findings onto its beat: role, duration, and any
 * direction facet the beat did not already state.
 *
 * The plan's prose is deliberately not written to `storyboardImagePrompt`. That
 * field records what was last sent to the image model, and generation stamps it
 * with the direction it describes. Writing planner wording there in advance
 * made a hallucinated sentence look like a current, direction-keyed prompt
 * before any frame existed to justify it. The planner's cinematography reaches
 * the frame through the direction fields instead, where it is visible and
 * editable on the scene card.
 */
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
