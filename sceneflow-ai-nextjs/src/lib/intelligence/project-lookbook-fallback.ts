/**
 * Project Visual Lookbook — the one look every frame in a film shares.
 *
 * Before this existed, an Express beat frame's `[STYLE]` section was a fixed
 * realism disclaimer, identical for every beat of every project, so frames had
 * no palette, lighting grammar, lens, or grade to agree on. The lookbook is
 * derived once from the treatment plus every scene's description and direction,
 * then injected into every beat prompt on every generation path.
 *
 * Client-safe half: types, fingerprinting, deterministic fallback, and the
 * prompt builders. The Gemini call lives in `project-lookbook.ts`.
 */

import {
  extractDirectionMetadata,
  type FilmContext,
} from '@/lib/intelligence/scene-direction-metadata'
import { normalizeStillLens } from '@/lib/imagen/stillFramingNormalize'
import { fingerprintSource } from '@/lib/utils/fingerprint'

export const PROJECT_LOOKBOOK_VERSION = 1

export interface ProjectLookbookSceneLook {
  sceneIndex: number
  /** How this scene departs from the master look without breaking it. */
  lookNote: string
}

export interface ProjectLookbook {
  version: number
  /** Digest of the treatment + scene inputs this look was derived from. */
  fingerprint: string
  masterStyle: string
  colorPalette: string
  lightingGrammar: string
  lensAndFormat: string
  textureAndGrade: string
  negativeStyleTerms: string[]
  sceneLooks?: ProjectLookbookSceneLook[]
  generatedAt: string
  /** False when Gemini was unavailable and the deterministic look was used. */
  usedAI?: boolean
}

/** One scene reduced to just the fields that inform a project-wide look. */
export interface LookbookSceneSummary {
  sceneIndex: number
  heading: string
  oneLine: string
  lightingMood?: string
  colorTemperature?: string
  timeOfDay?: string
  atmosphere?: string
  lensChoice?: string
}

export interface ProjectLookbookRequest {
  scenes: LookbookSceneSummary[]
  filmContext?: FilmContext
  artStyle?: string
  projectId?: string
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

const MIN_ONE_LINE_CHARS = 40

/**
 * Opening sentence of a scene's prose. Screenplay text is full of abbreviations
 * ("INT.", "Mr.") that a naive split truncates to nothing, so keep taking
 * sentences until the result carries some meaning.
 */
function firstSentence(value: string, maxChars = 180): string {
  const trimmed = value.replace(/\s+/g, ' ').trim()
  if (!trimmed) return ''

  const sentences = trimmed.split(/(?<=[.!?])\s+/)
  let result = ''
  for (const sentence of sentences) {
    result = result ? `${result} ${sentence}` : sentence
    if (result.length >= MIN_ONE_LINE_CHARS) break
  }

  return result.length > maxChars ? `${result.slice(0, maxChars).trimEnd()}…` : result
}

/** Reduce raw scenes to lookbook inputs. Accepts both script and vision shapes. */
export function summarizeScenesForLookbook(scenes: unknown[]): LookbookSceneSummary[] {
  if (!Array.isArray(scenes)) return []
  return scenes.map((raw, sceneIndex) => {
    const scene = (raw ?? {}) as Record<string, unknown>
    const headingValue = scene.heading
    const heading =
      typeof headingValue === 'string'
        ? headingValue
        : text((headingValue as { text?: string } | undefined)?.text)
    const direction = (
      scene.sceneDirection && typeof scene.sceneDirection === 'object'
        ? scene.sceneDirection
        : undefined
    ) as Record<string, any> | undefined
    const meta = extractDirectionMetadata(direction)
    // A heading is a slug, not prose — never run it through the sentence split.
    const prose =
      meta.sceneDescription || text(scene.action) || text(scene.visualDescription)
    const oneLine = prose ? firstSentence(prose) : heading.replace(/\s+/g, ' ').trim()

    return {
      sceneIndex,
      heading,
      oneLine,
      lightingMood: meta.lightingMood,
      colorTemperature: meta.colorTemperature,
      timeOfDay: meta.timeOfDay,
      atmosphere: meta.atmosphere,
      lensChoice: text(direction?.camera?.lensChoice) || undefined,
    }
  })
}

export function fingerprintLookbookSource(request: ProjectLookbookRequest): string {
  const fc = request.filmContext
  const parts: Array<string | undefined> = [
    String(PROJECT_LOOKBOOK_VERSION),
    request.artStyle || 'photorealistic',
    fc?.title,
    fc?.logline,
    fc?.genre?.join(','),
    fc?.tone,
    fc?.visualStyle,
  ]
  for (const scene of request.scenes) {
    parts.push(
      scene.heading,
      scene.oneLine,
      scene.lightingMood,
      scene.colorTemperature,
      scene.timeOfDay,
      scene.atmosphere,
      scene.lensChoice
    )
  }
  return fingerprintSource(parts)
}

/** Most frequent non-empty value, ties broken by first appearance. */
function modalValue(values: Array<string | undefined>): string {
  const counts = new Map<string, { count: number; original: string }>()
  for (const value of values) {
    const trimmed = text(value)
    if (!trimmed) continue
    const key = trimmed.toLowerCase()
    const entry = counts.get(key)
    if (entry) entry.count += 1
    else counts.set(key, { count: 1, original: trimmed })
  }
  let best: { count: number; original: string } | undefined
  for (const entry of counts.values()) {
    if (!best || entry.count > best.count) best = entry
  }
  return best?.original ?? ''
}

/**
 * Join style cues, dropping any that a preceding cue already stated.
 *
 * A beat's lighting accent and lens are frequently the same values the master
 * look was derived from — the film-wide grammar is the modal value across the
 * scenes — so joining them verbatim restated the same cue two and three times
 * in one style block, and repetition reads as emphasis to the image model.
 */
/** Below this length a phrase matches too much by accident to judge by containment. */
const CUE_CONTAINMENT_FLOOR = 6

function joinCues(...cues: Array<string | undefined>): string {
  const kept: string[] = []
  for (const cue of cues) {
    for (const clause of text(cue).split(';')) {
      const trimmed = clause.trim().replace(/\s+/g, ' ')
      if (!trimmed) continue
      const key = trimmed.toLowerCase()
      const stated = kept.some((held) => {
        const lower = held.toLowerCase()
        return lower === key || (key.length >= CUE_CONTAINMENT_FLOOR && lower.includes(key))
      })
      if (stated) continue
      kept.push(trimmed)
    }
  }
  return kept.join('; ')
}

const PHOTOREAL_NEGATIVE_STYLE_TERMS = [
  'illustration',
  'cartoon',
  'anime',
  '3D render',
  'plastic skin',
  'storyboard sketch',
]

/**
 * Deterministic look derived from the treatment and the modal direction values
 * across the whole script. Used when Gemini is unavailable — a consistent look
 * from weaker inputs still beats no look at all.
 */
export function buildFallbackProjectLookbook(
  request: ProjectLookbookRequest
): ProjectLookbook {
  const artStyle = request.artStyle || 'photorealistic'
  const isPhotoreal = artStyle === 'photorealistic'
  const fc = request.filmContext
  const scenes = request.scenes

  const genre = fc?.genre?.filter(Boolean).join(' / ')
  const masterStyle =
    text(fc?.visualStyle) ||
    joinCues(
      genre ? `${genre} cinematography` : 'narrative cinematography',
      fc?.tone ? `${fc.tone} tone` : undefined,
      isPhotoreal ? 'live-action photoreal film still' : artStyle
    )

  const modalColor = modalValue(scenes.map((s) => s.colorTemperature))
  const modalAtmosphere = modalValue(scenes.map((s) => s.atmosphere))
  const modalLighting = modalValue(scenes.map((s) => s.lightingMood))
  const modalTimeOfDay = modalValue(scenes.map((s) => s.timeOfDay))
  const modalLens = modalValue(scenes.map((s) => s.lensChoice))

  return {
    version: PROJECT_LOOKBOOK_VERSION,
    fingerprint: fingerprintLookbookSource(request),
    masterStyle,
    colorPalette:
      joinCues(modalColor, modalAtmosphere) || 'naturalistic palette, restrained saturation',
    lightingGrammar:
      joinCues(modalLighting, modalTimeOfDay) ||
      'motivated key with soft ambient fill, consistent key direction',
    lensAndFormat: joinCues(modalLens || 'Standard (50mm)', '16:9 framing'),
    textureAndGrade: isPhotoreal
      ? 'fine natural film grain, filmic contrast, gentle highlight rolloff'
      : `consistent ${artStyle} rendering across every frame`,
    negativeStyleTerms: isPhotoreal ? [...PHOTOREAL_NEGATIVE_STYLE_TERMS] : [],
    generatedAt: new Date().toISOString(),
    usedAI: false,
  }
}

export function buildLookbookSystemPrompt(): string {
  return `You are a cinematographer and colorist setting the single visual look for an entire film. Every animatic frame in this production will be generated from your lookbook, so it must be specific enough that two different frames from two different scenes read as the same movie.

RULES:
1. Define ONE look for the whole film. Do not describe individual shots, story events, characters, or props.
2. Be concrete and photographic: name the palette, the key-light direction and quality, the lens family, and the grade. Avoid vague adjectives like "cinematic", "beautiful", or "high quality" on their own.
3. Honor the supplied Art Style. When it is photorealistic, describe real photographic behavior (film stock, grain, contrast curve, falloff) and never illustration language.
4. The lighting grammar must be reusable in any location. Describe HOW light behaves in this film (source motivation, contrast ratio, falloff, practicals), not where a lamp sits in one room.
5. sceneLooks is for scenes that must legitimately depart from the master look (a night exterior inside a daylight film, a title card). Each note is one short clause describing the departure, and only include scenes that genuinely need one. Omit the array when every scene shares the master look.
6. negativeStyleTerms are rendering styles to suppress, not story content.

Output JSON only:
{
  "masterStyle": "the film's overall visual identity in one sentence",
  "colorPalette": "dominant hues, saturation, and how shadows and highlights are tinted",
  "lightingGrammar": "how light is motivated and shaped across the whole film",
  "lensAndFormat": "lens family, depth of field character, and framing energy",
  "textureAndGrade": "grain, contrast curve, and finishing texture",
  "negativeStyleTerms": ["rendering styles to avoid"],
  "sceneLooks": [{ "sceneIndex": 0, "lookNote": "short departure clause" }],
  "reasoning": "one sentence on why this look serves the story"
}`
}

export function buildLookbookUserPrompt(request: ProjectLookbookRequest): string {
  const fc = request.filmContext
  const parts: string[] = []

  parts.push('Define the single visual look for this film.')
  parts.push('')
  if (fc?.title) parts.push(`FILM: "${fc.title}"`)
  if (fc?.genre?.length) parts.push(`Genre: ${fc.genre.join(', ')}`)
  if (fc?.tone) parts.push(`Tone: ${fc.tone}`)
  if (fc?.logline) parts.push(`Logline: ${fc.logline}`)
  if (fc?.visualStyle) {
    parts.push(`Director's visual style (authoritative — build the look around this): ${fc.visualStyle}`)
  }
  parts.push(`Art Style: ${request.artStyle || 'photorealistic'}`)
  parts.push('')

  parts.push(`SCENES (${request.scenes.length} total — the look must serve all of them):`)
  for (const scene of request.scenes) {
    const cues = joinCues(
      scene.lightingMood,
      scene.colorTemperature,
      scene.timeOfDay,
      scene.atmosphere,
      scene.lensChoice
    )
    parts.push(
      `  ${scene.sceneIndex + 1}. ${scene.heading || '(untitled)'} — ${scene.oneLine || '(no description)'}${
        cues ? ` [direction: ${cues}]` : ''
      }`
    )
  }

  return parts.join('\n')
}

export interface LookbookStyleAnchorOverrides {
  /** Code-owned realism anchor appended when the master style omits one. */
  artStyleAnchor?: string
  /** Scene-level departure from the master look. */
  sceneLookNote?: string
  /** Per-beat lighting accent inside the film's lighting grammar. */
  beatLighting?: string
  /** Per-beat lens choice inside the film's lens family. */
  beatLens?: string
  /**
   * This beat's shot scale, so a detail lens is not asked of a frame that
   * cannot hold one. The film's lens family is the modal value across every
   * scene, so one scene's macro insert becomes the whole film's lens.
   */
  beatShotType?: string
}

const PHOTOREAL_PATTERN = /photorealistic|live-action|live action|photographed on real camera/i

/**
 * Render the lookbook as a `[GLOBAL STYLE ANCHOR]` section.
 *
 * `parseStillPromptSource` already lifts this header into the `[STYLE]` block of
 * the final still prompt, so emitting it is all that is needed to give a frame
 * a look — no change to the image route.
 */
export function formatLookbookStyleAnchor(
  lookbook: ProjectLookbook,
  overrides: LookbookStyleAnchorOverrides = {}
): string {
  const masterStyle = joinCues(
    lookbook.masterStyle,
    overrides.artStyleAnchor && !PHOTOREAL_PATTERN.test(lookbook.masterStyle)
      ? overrides.artStyleAnchor
      : undefined
  )
  const lightingCamera = joinCues(
    lookbook.lightingGrammar,
    overrides.beatLighting,
    normalizeStillLens(lookbook.lensAndFormat, overrides.beatShotType),
    normalizeStillLens(overrides.beatLens, overrides.beatShotType)
  )
  const paletteGrade = joinCues(
    lookbook.colorPalette,
    lookbook.textureAndGrade,
    overrides.sceneLookNote ? `Scene look: ${overrides.sceneLookNote}` : undefined
  )

  const lines = ['[GLOBAL STYLE ANCHOR]']
  if (masterStyle) lines.push(`Master Style: ${masterStyle}`)
  if (lightingCamera) lines.push(`Lighting & Camera: ${lightingCamera}`)
  if (paletteGrade) lines.push(`Palette & Grade: ${paletteGrade}`)
  return lines.join('\n')
}

export function getSceneLookNote(
  lookbook: ProjectLookbook | undefined,
  sceneIndex: number
): string | undefined {
  return lookbook?.sceneLooks?.find((look) => look.sceneIndex === sceneIndex)?.lookNote
}

/** Compact lookbook rendering for LLM prompts that plan rather than generate. */
export function formatLookbookForPlannerPrompt(
  lookbook: ProjectLookbook,
  sceneLookNote?: string
): string {
  const lines = [
    'PROJECT LOOKBOOK (authoritative — every frame in this film shares this look; do not invent a new one):',
    `Master Style: ${lookbook.masterStyle}`,
    `Color Palette: ${lookbook.colorPalette}`,
    `Lighting Grammar: ${lookbook.lightingGrammar}`,
    `Lens & Format: ${lookbook.lensAndFormat}`,
    `Texture & Grade: ${lookbook.textureAndGrade}`,
  ]
  if (sceneLookNote) lines.push(`This scene's departure: ${sceneLookNote}`)
  if (lookbook.negativeStyleTerms.length > 0) {
    lines.push(`Never render as: ${lookbook.negativeStyleTerms.join(', ')}`)
  }
  return lines.join('\n')
}
