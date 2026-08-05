/**
 * Declares how every piece of stored creative content is treated by
 * localization.
 *
 * This registry exists because the studios store three kinds of text that all
 * look like English prose in a JSONB blob:
 *
 *  - `display` — read by humans. Localize it.
 *  - `spoken`  — performed by TTS. Follows the *delivery* language, not the
 *                interface language, and already has its own pipeline.
 *  - `machine` — fed to Imagen/Veo/Kling. Must stay English: the generation
 *                models produce materially worse results from translated
 *                prompts, and a silently translated `videoPrompt` degrades
 *                output in a way nobody would connect back to a language
 *                setting.
 *  - `opaque`  — ids, urls, enum values, timestamps. Never touch.
 *
 * Unclassified paths resolve to `opaque`, so a new prose field is left in its
 * source language until someone deliberately classifies it. Failing closed is
 * the whole point: the cost of forgetting to translate a label is a small UX
 * wart, while the cost of accidentally translating a prompt is broken renders.
 */

export type FieldKind = 'display' | 'spoken' | 'machine' | 'opaque'

/**
 * Path patterns use `[]` for array elements, e.g. `beatSheet[].summary`.
 * Paths are matched after normalization, so `beatSheet.3.summary` and
 * `beatSheet[3].summary` both resolve here.
 */
export const CONTENT_FIELDS: Record<string, FieldKind> = {
  // ── Project scalars (projects table) ────────────────────────────────────
  title: 'display',
  description: 'display',
  concept: 'display',
  key_message: 'display',
  target_audience: 'display',
  tone: 'display',
  genre: 'display',
  style: 'display',

  // ── Blueprint: ProductionGuide (src/types/productionGuide.ts) ───────────
  filmTreatment: 'display',
  fullScriptText: 'display',

  'treatmentDetails.title': 'display',
  'treatmentDetails.logline': 'display',
  'treatmentDetails.synopsis': 'display',
  'treatmentDetails.keyCharacters': 'display',
  'treatmentDetails.toneAndStyle': 'display',
  'treatmentDetails.themes': 'display',
  'treatmentDetails.visualLanguage': 'display',
  'treatmentDetails.billboardImageUrl': 'opaque',

  'treatmentVariants[].id': 'opaque',
  'treatmentVariants[].label': 'display',
  'treatmentVariants[].content': 'display',
  'treatmentVariants[].title': 'display',
  'treatmentVariants[].logline': 'display',
  'treatmentVariants[].synopsis': 'display',
  'treatmentVariants[].setting': 'display',
  'treatmentVariants[].protagonist': 'display',
  'treatmentVariants[].antagonist': 'display',
  'treatmentVariants[].opening_hook': 'display',
  'treatmentVariants[].cta': 'display',
  'treatmentVariants[].tone': 'display',
  'treatmentVariants[].tone_description': 'display',
  'treatmentVariants[].target_audience': 'display',
  'treatmentVariants[].genre': 'display',
  'treatmentVariants[].themes': 'display',
  'treatmentVariants[].format_length': 'opaque',
  // Feeds the image pipeline, so it stays in English like the other visual
  // prompt fields.
  'treatmentVariants[].visual_style': 'machine',
  'treatmentVariants[].audio_direction': 'machine',
  'treatmentVariants[].beats[].title': 'display',
  'treatmentVariants[].beats[].intent': 'display',
  'treatmentVariants[].beats[].synopsis': 'display',
  'treatmentVariants[].mood_references[]': 'display',
  'treatmentVariants[].heroImage': 'opaque',
  'treatmentVariants[].character_descriptions[].name': 'opaque',
  'treatmentVariants[].character_descriptions[].subject': 'opaque',
  'treatmentVariants[].character_descriptions[].role': 'opaque',
  'treatmentVariants[].character_descriptions[].description': 'display',
  'treatmentVariants[].character_descriptions[].externalGoal': 'display',
  'treatmentVariants[].character_descriptions[].internalNeed': 'display',
  'treatmentVariants[].character_descriptions[].fatalFlaw': 'display',
  'treatmentVariants[].character_descriptions[].arcStartingState': 'display',
  'treatmentVariants[].character_descriptions[].arcShift': 'display',
  'treatmentVariants[].character_descriptions[].arcEndingState': 'display',
  // Everything below feeds character reference image generation.
  'treatmentVariants[].character_descriptions[].appearance': 'machine',
  'treatmentVariants[].character_descriptions[].ethnicity': 'machine',
  'treatmentVariants[].character_descriptions[].keyFeature': 'machine',
  'treatmentVariants[].character_descriptions[].hairStyle': 'machine',
  'treatmentVariants[].character_descriptions[].hairColor': 'machine',
  'treatmentVariants[].character_descriptions[].eyeColor': 'machine',
  'treatmentVariants[].character_descriptions[].expression': 'machine',
  'treatmentVariants[].character_descriptions[].build': 'machine',
  'treatmentVariants[].character_descriptions[].defaultWardrobe': 'machine',
  'treatmentVariants[].character_descriptions[].wardrobeAccessories': 'machine',

  'beatSheet[].id': 'opaque',
  'beatSheet[].act': 'opaque',
  'beatSheet[].title': 'display',
  'beatSheet[].summary': 'display',
  'beatSheet[].structuralPurpose': 'display',
  'beatSheet[].boneyardReason': 'display',
  'beatSheet[].keywords[]': 'display',
  'beatSheet[].productionTags.location': 'display',
  'beatSheet[].productionTags.weatherCondition': 'display',
  'beatSheet[].productionTags.mood': 'display',

  // Character names are proper nouns: translating them breaks continuity with
  // the series bible, prompt tokens, and generated reference images.
  'characters[].id': 'opaque',
  'characters[].name': 'opaque',
  'characters[].archetype': 'display',
  'characters[].motivation': 'display',
  'characters[].internalConflict': 'display',
  'characters[].externalConflict': 'display',
  'characters[].arc.act1': 'display',
  'characters[].arc.act2': 'display',
  'characters[].arc.act3': 'display',

  // ── Series (src/types/series.ts, models/Series.ts) ──────────────────────
  logline: 'display',
  'production_bible.logline': 'display',
  'production_bible.synopsis': 'display',
  'production_bible.setting': 'display',
  'production_bible.toneGuidelines': 'display',
  'production_bible.visualGuidelines': 'display',
  'production_bible.audioGuidelines': 'display',
  'production_bible.consistencyRules[]': 'display',
  'production_bible.worldBuildingNotes[]': 'display',
  'production_bible.characters[].id': 'opaque',
  'production_bible.characters[].name': 'opaque',
  'production_bible.characters[].role': 'opaque',
  'production_bible.characters[].description': 'display',
  'production_bible.characters[].appearance': 'display',
  'production_bible.characters[].backstory': 'display',
  'production_bible.characters[].personality': 'display',
  'production_bible.characters[].lockedPromptTokens[]': 'machine',
  'production_bible.locations[].id': 'opaque',
  'production_bible.locations[].name': 'opaque',
  'production_bible.locations[].description': 'display',
  'production_bible.locations[].visualDescription': 'machine',
  'production_bible.locations[].lockedPromptTokens[]': 'machine',
  'production_bible.props[].name': 'opaque',
  'production_bible.props[].description': 'display',
  'production_bible.props[].lockedPromptTokens[]': 'machine',

  'episode_blueprints[].id': 'opaque',
  'episode_blueprints[].title': 'display',
  'episode_blueprints[].logline': 'display',
  'episode_blueprints[].synopsis': 'display',
  'episode_blueprints[].episodeHook': 'display',
  'episode_blueprints[].plotDevelopments[]': 'display',
  'episode_blueprints[].beats[].title': 'display',
  'episode_blueprints[].beats[].description': 'display',
  'episode_blueprints[].characters[].episodeArc': 'display',
  'episode_blueprints[].storyThreads[].name': 'display',
  'episode_blueprints[].storyThreads[].description': 'display',

  'keyEvents[].description': 'display',
  'episodeSummaries[].title': 'display',
  'episodeSummaries[].summary': 'display',
  'storyThreads[].name': 'display',
  'storyThreads[].description': 'display',

  // ── Production: scenes (src/types/vision.ts) ────────────────────────────
  'scenes[].id': 'opaque',
  'scenes[].heading': 'display',
  'scenes[].heading.text': 'display',
  'scenes[].visualDescription': 'display',
  'scenes[].narration': 'spoken',
  'scenes[].music': 'display',
  'scenes[].music.description': 'display',
  'scenes[].audienceAnalysis.notes': 'display',
  'scenes[].audienceAnalysis.recommendations[]': 'display',
  'scenes[].audienceAnalysis.recommendations[].text': 'display',
  'scenes[].imageUrl': 'opaque',

  // ── Production: segmented script (src/lib/script/segmentTypes.ts) ───────
  'scenes[].segments[].segmentId': 'opaque',
  // Performance direction is read by the director *and* injected into video
  // prompts, so it stays in the source language rather than being localized.
  'scenes[].segments[].segmentDirection': 'machine',
  'scenes[].segments[].emotionalBeat': 'display',
  'scenes[].segments[].dialogue[].character': 'opaque',
  'scenes[].segments[].dialogue[].line': 'spoken',
  'scenes[].segments[].dialogue[].voiceDirection': 'machine',
  'scenes[].segments[].sfx[].description': 'machine',
  'scenes[].segments[].startFramePrompt': 'machine',
  'scenes[].segments[].endFramePrompt': 'machine',
  'scenes[].segments[].videoPrompt': 'machine',
  'scenes[].segments[].references.startFrameDescription': 'machine',
  'scenes[].segments[].references.endFrameDescription': 'machine',

  // ── Production: storyboard beats ────────────────────────────────────────
  'scenes[].beats[].beatId': 'opaque',
  'scenes[].beats[].line': 'spoken',
  'scenes[].beats[].actionDescription': 'machine',
  'scenes[].beats[].voiceDirection': 'machine',
  // On-screen captions are burned into rendered frames, so they follow the
  // delivery language via textOverlayTranslations rather than the UI language.
  'scenes[].beats[].overlayText': 'spoken',

  // ── Production: characters (VisionCharacter) ────────────────────────────
  'visionPhase.characters[].id': 'opaque',
  'visionPhase.characters[].name': 'opaque',
  'visionPhase.characters[].description': 'display',
  'visionPhase.characters[].appearanceDescription': 'machine',
  'visionPhase.characters[].voiceDescription': 'machine',
  'visionPhase.characters[].wardrobeAccessories': 'machine',
  'visionPhase.characters[].wardrobes[].name': 'display',
  'visionPhase.characters[].wardrobes[].description': 'machine',
  'visionPhase.characters[].wardrobes[].accessories': 'machine',
  'visionPhase.characters[].wardrobes[].appearanceNotes': 'machine',
}

/**
 * Path segments whose value is always a generation prompt.
 *
 * A rule rather than an enumeration because prompt fields are added often and
 * an unlisted one must never fall through to being translated.
 */
const MACHINE_SEGMENT_PATTERN = /(^|[._])(prompt|prompts)$|Prompt$|PromptElements$|promptTokens$/i

/** Path segments that are structural rather than textual. */
const OPAQUE_SEGMENT_PATTERN =
  /(^|[._])(id|ids|url|urls|uri|href|slug|key|hash|token|at|createdAt|updatedAt|gcsPath|audioUrl|imageUrl)$/i

/**
 * Normalize `a.0.b`, `a[0].b`, and `a[var_1].b` to the registry's `a[].b` form.
 *
 * Any bracket content collapses, not just digits, so callers can key overrides
 * by a stable entity id (`treatmentVariants[A].logline`) instead of an array
 * index that shifts when a variant is reordered or deleted.
 */
export function normalizeFieldPath(path: string): string {
  return path
    .replace(/\[[^\]]*\]/g, '[]')
    .replace(/\.(\d+)(?=\.|$)/g, '[]')
    .replace(/\[\]\./g, '[].')
}

/**
 * Classify a stored field path.
 *
 * Order matters: explicit registry entries win, then the machine-prompt rule
 * (so an unlisted `*Prompt` is protected), then the structural rule, then the
 * fail-closed default.
 */
export function classifyField(path: string): FieldKind {
  const normalized = normalizeFieldPath(path)

  const exact = CONTENT_FIELDS[normalized]
  if (exact) return exact

  // Try progressively shorter suffixes so `metadata.visionPhase.script.script.
  // scenes[0].segments[1].videoPrompt` still matches `scenes[].segments[].
  // videoPrompt`.
  const segments = normalized.split('.')
  for (let i = 1; i < segments.length; i++) {
    const suffix = segments.slice(i).join('.')
    const match = CONTENT_FIELDS[suffix]
    if (match) return match
  }

  const leaf = segments[segments.length - 1] ?? ''
  if (MACHINE_SEGMENT_PATTERN.test(leaf)) return 'machine'
  if (OPAQUE_SEGMENT_PATTERN.test(leaf)) return 'opaque'

  return 'opaque'
}

/** True when a field should be shown to the reader in their interface language. */
export function isTranslatableField(path: string): boolean {
  return classifyField(path) === 'display'
}

/** True when a field must remain in English for the generation models. */
export function isMachineField(path: string): boolean {
  return classifyField(path) === 'machine'
}

/**
 * Filter a batch of `{ path, text }` items down to those safe to translate.
 * Returns the kept items and, for diagnostics, what was dropped and why.
 */
export function partitionTranslatable<T extends { path: string }>(
  items: T[]
): { translatable: T[]; skipped: Array<T & { kind: FieldKind }> } {
  const translatable: T[] = []
  const skipped: Array<T & { kind: FieldKind }> = []

  for (const item of items) {
    const kind = classifyField(item.path)
    if (kind === 'display') translatable.push(item)
    else skipped.push({ ...item, kind })
  }

  return { translatable, skipped }
}
