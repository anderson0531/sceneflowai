/**
 * Music cues: which stretches of a scene play scored, and what for.
 *
 * A scene used to carry one music file looped from its first frame to its
 * last, which cannot follow a scene that swings from dread to violence to
 * revelation — and, because `musicEnabled` defaults to off on every beat,
 * usually played not at all. A cue names a contiguous run of beats, the
 * emotion it is placed to trigger, and the brief its track is generated from,
 * so a scene can hold a few distinct pieces of music with deliberate silence
 * between them.
 *
 * Cues are placed by the script LLM when available (`generatedBy: 'llm'`) and
 * derived from the scene's movements otherwise, so scripts written before cues
 * existed still get scored. A cue that has already been generated is never
 * recomputed: its audio is the scene's, and re-planning would orphan it.
 */

import { adaptPromptForLyria } from '@/lib/audio/lyriaPromptAdapter'
import type {
  MusicCueEntry,
  MusicCueExit,
  SceneBeat,
  SceneMovement,
  SceneMusicCue,
  SceneMusicCueSource,
} from '@/lib/script/segmentTypes'

/**
 * Upper bound on cues per scene.
 *
 * Each cue is its own generated track, and a scene that changes music five
 * times stops reading as scored and starts reading as restless.
 */
export const MAX_MUSIC_CUES = 4

/** Descriptions shorter than this are not a music brief. */
const MIN_DESCRIPTION_LENGTH = 8

/** Briefs longer than this are trimmed before reaching Lyria. */
const MAX_DESCRIPTION_LENGTH = 240

/** Intents longer than this are trimmed before reaching a video prompt. */
const MAX_INTENT_LENGTH = 120

const ENTRY_VALUES: MusicCueEntry[] = ['fade', 'hard', 'swell']
const EXIT_VALUES: MusicCueExit[] = ['fade', 'hard', 'tail']

/**
 * How a scored moment sounds, keyed by the emotion driving it.
 *
 * `charge` is how strongly the emotion asks to be scored at all: a scene turn
 * into grief or violence carries music, a procedural exchange does not.
 */
interface MusicProfile {
  family: string
  intent: string
  brief: string
  charge: number
  entry: MusicCueEntry
  exit: MusicCueExit
}

const MUSIC_PROFILES: Record<string, MusicProfile> = {
  dread: {
    family: 'dread',
    intent: 'rising dread',
    brief: 'Cinematic orchestral score, ominous mood, low strings and sub-bass drone, slow tempo',
    charge: 3,
    entry: 'fade',
    exit: 'tail',
  },
  violence: {
    family: 'violence',
    intent: 'the turn into violence',
    brief: 'Cinematic orchestral score, aggressive mood, low brass and distorted strings, driving tempo',
    charge: 3,
    entry: 'hard',
    exit: 'hard',
  },
  grief: {
    family: 'grief',
    intent: 'grief settling in',
    brief: 'Cinematic orchestral score, mournful mood, solo piano and sustained cello, slow tempo',
    charge: 3,
    entry: 'fade',
    exit: 'tail',
  },
  revelation: {
    family: 'revelation',
    intent: 'the weight of a revelation landing',
    brief: 'Cinematic orchestral score, awestruck mood, swelling strings and choral pads, building tempo',
    charge: 3,
    entry: 'swell',
    exit: 'tail',
  },
  urgency: {
    family: 'urgency',
    intent: 'urgency tightening',
    brief: 'Cinematic orchestral score, urgent mood, staccato strings and driving percussion, fast tempo',
    charge: 3,
    entry: 'hard',
    exit: 'hard',
  },
  unease: {
    family: 'unease',
    intent: 'unease the audience cannot place',
    brief: 'Ambient electronic score, uneasy mood, ethereal synth pads and muted bells, slow tempo',
    charge: 2,
    entry: 'fade',
    exit: 'fade',
  },
  hope: {
    family: 'hope',
    intent: 'hope breaking through',
    brief: 'Cinematic orchestral score, hopeful mood, warm piano and soft strings, moderate tempo',
    charge: 2,
    entry: 'swell',
    exit: 'fade',
  },
  triumph: {
    family: 'triumph',
    intent: 'triumph earned',
    brief: 'Cinematic orchestral score, triumphant mood, bright brass and rhythmic strings, upbeat tempo',
    charge: 2,
    entry: 'swell',
    exit: 'tail',
  },
  tenderness: {
    family: 'tenderness',
    intent: 'tenderness between the characters',
    brief: 'Cinematic acoustic score, tender mood, felt piano and soft guitar, slow tempo',
    charge: 2,
    entry: 'fade',
    exit: 'fade',
  },
}

/** Emotion words that map a beat or movement onto a music profile. */
const EMOTION_LEXICON: Array<{ pattern: RegExp; family: string }> = [
  { pattern: /\b(dread|terror|fear|afraid|foreboding|menace|menacing|ominous|threat|threatening|stalk)/i, family: 'dread' },
  { pattern: /\b(rage|fury|furious|anger|angry|violent|violence|attack|strike|fight|brutal|savage|slam)/i, family: 'violence' },
  { pattern: /\b(grief|grieving|mourn|sorrow|sorrowful|loss|devastat|heartbreak|weep|tears|despair)/i, family: 'grief' },
  { pattern: /\b(revelation|reveals?|realiz|recognit|awe|astonish|stunned|dawning|epiphan|truth)/i, family: 'revelation' },
  { pattern: /\b(urgen|frantic|panic|race|racing|chase|hurry|desperate|scramble|escape|flee)/i, family: 'urgency' },
  { pattern: /\b(unease|uneasy|suspense|suspicious|wary|tense|tension|anxious|anxiety|disquiet|eerie)/i, family: 'unease' },
  { pattern: /\b(hope|hopeful|relief|relieved|reassur|calm|resolve|resolute|determin)/i, family: 'hope' },
  { pattern: /\b(triumph|victor|elated|joy|joyful|exhilarat|jubilant|celebrat)/i, family: 'triumph' },
  { pattern: /\b(tender|affection|intimate|warmth|gentle|loving|compassion|comfort)/i, family: 'tenderness' },
]

function cleanText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return ''
  const trimmed = value.replace(/\s+/g, ' ').trim()
  if (!trimmed) return ''
  return trimmed.length > maxLength
    ? `${trimmed.slice(0, maxLength - 1).trimEnd()}…`
    : trimmed
}

/**
 * Cue ids are a function of the range so a re-run of the same plan produces
 * the same ids — generated audio stays attached to its cue across migrations.
 */
export function buildMusicCueId(beatStart: number, beatEnd: number): string {
  return `cue-${beatStart}-${beatEnd}`
}

function coerceEntry(value: unknown): MusicCueEntry | undefined {
  return typeof value === 'string' && (ENTRY_VALUES as string[]).includes(value)
    ? (value as MusicCueEntry)
    : undefined
}

function coerceExit(value: unknown): MusicCueExit | undefined {
  return typeof value === 'string' && (EXIT_VALUES as string[]).includes(value)
    ? (value as MusicCueExit)
    : undefined
}

/**
 * Drop cues that fall outside the beat list, overlap an earlier cue, or run
 * backwards. Overlapping cues would stack two tracks over the same beats.
 */
function sanitizeRanges(cues: SceneMusicCue[], beatCount: number): SceneMusicCue[] {
  const ordered = [...cues].sort((a, b) => a.beatStart - b.beatStart)
  const kept: SceneMusicCue[] = []
  let lastEnd = -1

  for (const cue of ordered) {
    const beatStart = Math.max(0, Math.min(beatCount - 1, Math.round(cue.beatStart)))
    const beatEnd = Math.max(beatStart, Math.min(beatCount - 1, Math.round(cue.beatEnd)))
    if (beatStart <= lastEnd) continue
    kept.push({ ...cue, beatStart, beatEnd, cueId: buildMusicCueId(beatStart, beatEnd) })
    lastEnd = beatEnd
    if (kept.length >= MAX_MUSIC_CUES) break
  }

  return kept
}

/**
 * Normalize the script LLM's `musicCues` array against the scene's beats.
 *
 * Beat numbers arrive 0-based from the schema, but a model that slips into
 * 1-based numbering would otherwise shift every cue by one beat, so a plan
 * whose last cue runs exactly one past the final beat is read as 1-based.
 */
export function planSceneMusicCues(
  raw: unknown,
  beats: SceneBeat[],
  source: SceneMusicCueSource = 'llm'
): SceneMusicCue[] {
  if (!Array.isArray(raw) || beats.length === 0) return []

  const parsed: Array<{ beatStart: number; beatEnd: number; cue: SceneMusicCue }> = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const raw = cleanText(row.description ?? row.music ?? row.brief, MAX_DESCRIPTION_LENGTH)
    if (raw.length < MIN_DESCRIPTION_LENGTH) continue
    // Adapted here rather than at the call site so every entry point — script
    // generation, scene revision, manual edits — reaches Lyria with a brief it
    // will not reject as recitation.
    const description = adaptPromptForLyria(raw)

    const beatStart = Number(row.beatStart)
    const beatEnd = Number(row.beatEnd ?? row.beatStart)
    if (!Number.isFinite(beatStart) || !Number.isFinite(beatEnd)) continue
    if (beatEnd < beatStart) continue

    parsed.push({
      beatStart,
      beatEnd,
      cue: {
        cueId: buildMusicCueId(beatStart, beatEnd),
        beatStart,
        beatEnd,
        description,
        intent: cleanText(row.intent ?? row.emotion ?? row.purpose, MAX_INTENT_LENGTH),
        ...(coerceEntry(row.entry) ? { entry: coerceEntry(row.entry) } : {}),
        ...(coerceExit(row.exit) ? { exit: coerceExit(row.exit) } : {}),
        generatedBy: source,
      },
    })
  }

  if (parsed.length === 0) return []

  const oneBased =
    parsed.every((entry) => entry.beatStart >= 1) &&
    parsed.some((entry) => entry.beatEnd === beats.length)
  const shift = oneBased ? 1 : 0

  return sanitizeRanges(
    parsed.map((entry) => ({
      ...entry.cue,
      beatStart: entry.beatStart - shift,
      beatEnd: entry.beatEnd - shift,
    })),
    beats.length
  )
}

/** Prose a movement's emotional temperature can be read from. */
function movementEmotionText(
  movement: SceneMovement,
  beats: SceneBeat[]
): string {
  const parts: string[] = [movement.summary, movement.intent ?? '']
  for (let index = movement.beatStart; index <= movement.beatEnd; index++) {
    const beat = beats[index]
    if (!beat) continue
    if (beat.beatDirection?.emotion) parts.push(beat.beatDirection.emotion)
    if (beat.voiceDirection) parts.push(beat.voiceDirection)
    if (beat.actionDescription) parts.push(beat.actionDescription)
  }
  return parts.filter(Boolean).join(' ')
}

interface MovementCharge {
  movement: SceneMovement
  profile: MusicProfile | undefined
  charge: number
}

/** Read each movement's dominant emotion and how strongly it asks to be scored. */
function chargeMovements(
  movements: SceneMovement[],
  beats: SceneBeat[]
): MovementCharge[] {
  return movements.map((movement) => {
    const text = movementEmotionText(movement, beats)
    const hits = new Map<string, number>()
    for (const { pattern, family } of EMOTION_LEXICON) {
      const matches = text.match(new RegExp(pattern.source, 'gi'))
      if (matches) hits.set(family, (hits.get(family) ?? 0) + matches.length)
    }

    let family: string | undefined
    let best = 0
    // Ties resolve toward the lexicon's own order, which runs strongest first.
    for (const { family: candidate } of EMOTION_LEXICON) {
      const count = hits.get(candidate) ?? 0
      if (count > best) {
        best = count
        family = candidate
      }
    }

    const profile = family ? MUSIC_PROFILES[family] : undefined
    return {
      movement,
      profile,
      charge: profile ? profile.charge + Math.min(2, best - 1) : 0,
    }
  })
}

/**
 * How many of a scene's movements should carry music.
 *
 * Scoring every movement is the same mistake as scoring none: with nothing
 * unscored to cut against, the music stops marking anything. Scenes of three
 * or more movements always keep at least one dry.
 */
export function musicCueBudget(movementCount: number): number {
  if (movementCount <= 0) return 0
  if (movementCount === 1) return 1
  if (movementCount === 2) return 1
  return Math.min(MAX_MUSIC_CUES, Math.min(movementCount - 1, Math.ceil(movementCount / 2)))
}

/**
 * Place cues on the movements whose emotion is strongest or whose arrival is
 * the sharpest turn from the movement before it — where a composer scores.
 */
function selectMovementsToScore(
  charges: MovementCharge[],
  budget: number
): MovementCharge[] {
  const scored = charges
    .map((entry, index) => {
      // The opening movement turns from nothing, so it is weighed on its own
      // charge alone — otherwise every scene scores its first beats and the
      // climax it was building toward plays dry.
      const previous = index > 0 ? charges[index - 1].charge : entry.charge
      const turn = Math.abs(entry.charge - previous)
      return { entry, index, weight: entry.charge * 2 + turn }
    })
    .filter((row) => row.entry.profile && row.weight > 0)
    .sort((a, b) => b.weight - a.weight || a.index - b.index)
    .slice(0, budget)

  return scored.sort((a, b) => a.index - b.index).map((row) => row.entry)
}

/**
 * Merge cues that sit back to back on the same emotion into one.
 *
 * Two adjacent movements reaching for the same music is one cue that runs
 * through the boundary, not a restart — and it is one generation instead of two.
 */
function mergeAdjacentSameFamily(
  selected: Array<{ charge: MovementCharge; profile: MusicProfile }>
): Array<{ start: number; end: number; profile: MusicProfile }> {
  const merged: Array<{ start: number; end: number; profile: MusicProfile }> = []
  for (const { charge, profile } of selected) {
    const last = merged[merged.length - 1]
    if (
      last &&
      last.profile.family === profile.family &&
      last.end + 1 === charge.movement.beatStart
    ) {
      last.end = charge.movement.beatEnd
      continue
    }
    merged.push({
      start: charge.movement.beatStart,
      end: charge.movement.beatEnd,
      profile,
    })
  }
  return merged
}

/** The scene's own music brief, when the script wrote one. */
function sceneMusicDescription(scene: Record<string, unknown>): string {
  const music = scene.music
  if (typeof music === 'string') return cleanText(music, MAX_DESCRIPTION_LENGTH)
  if (music && typeof music === 'object') {
    return cleanText(
      (music as Record<string, unknown>).description,
      MAX_DESCRIPTION_LENGTH
    )
  }
  return ''
}

/**
 * Cut cues from the scene's movements for scripts written before cues existed.
 *
 * The scene's own `music.description` scores the first cue when it has one —
 * it was written for this scene — and the remaining cues take the brief their
 * emotion calls for, so a scene's cues do not all sound the same.
 */
export function deriveSceneMusicCues(
  scene: Record<string, unknown>,
  beats: SceneBeat[],
  movements: SceneMovement[]
): SceneMusicCue[] {
  if (beats.length === 0 || movements.length === 0) return []

  const charges = chargeMovements(movements, beats)
  const budget = musicCueBudget(movements.length)
  const selected = selectMovementsToScore(charges, budget)
  if (selected.length === 0) return []

  const ranges = mergeAdjacentSameFamily(
    selected.map((charge) => ({ charge, profile: charge.profile as MusicProfile }))
  )

  const sceneBrief = sceneMusicDescription(scene)

  return sanitizeRanges(
    ranges.map((range, index) => {
      const brief = index === 0 && sceneBrief ? sceneBrief : range.profile.brief
      return {
        cueId: buildMusicCueId(range.start, range.end),
        beatStart: range.start,
        beatEnd: range.end,
        description: adaptPromptForLyria(brief),
        intent: range.profile.intent,
        entry: range.profile.entry,
        exit: range.profile.exit,
        generatedBy: 'derived' as const,
      }
    }),
    beats.length
  )
}

/** Read a persisted cue list, keeping generated audio and repairing drift. */
export function parsePersistedMusicCues(
  raw: unknown,
  beats: SceneBeat[]
): SceneMusicCue[] {
  if (!Array.isArray(raw) || raw.length === 0 || beats.length === 0) return []

  const parsed: SceneMusicCue[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const description = cleanText(row.description, MAX_DESCRIPTION_LENGTH)
    if (!description) continue
    const beatStart = Number(row.beatStart)
    const beatEnd = Number(row.beatEnd)
    if (!Number.isInteger(beatStart) || !Number.isInteger(beatEnd)) continue
    if (beatEnd < beatStart) continue

    const generatedBy = row.generatedBy
    const url = typeof row.url === 'string' && row.url.trim() ? row.url.trim() : undefined
    const duration = Number(row.duration)
    const fileDuration = Number(row.fileDuration)

    parsed.push({
      cueId:
        typeof row.cueId === 'string' && row.cueId.trim()
          ? row.cueId.trim()
          : buildMusicCueId(beatStart, beatEnd),
      beatStart,
      beatEnd,
      description,
      intent: cleanText(row.intent, MAX_INTENT_LENGTH),
      ...(coerceEntry(row.entry) ? { entry: coerceEntry(row.entry) } : {}),
      ...(coerceExit(row.exit) ? { exit: coerceExit(row.exit) } : {}),
      ...(url ? { url } : {}),
      ...(duration > 0 ? { duration } : {}),
      ...(fileDuration > 0 ? { fileDuration } : {}),
      generatedBy:
        generatedBy === 'llm' || generatedBy === 'user' || generatedBy === 'derived'
          ? generatedBy
          : 'derived',
      ...(typeof row.updatedAt === 'string' ? { updatedAt: row.updatedAt } : {}),
    })
  }

  if (parsed.length === 0) return []

  // Clamp into the current beat list without re-planning: a cue that drifted
  // because beats moved keeps its brief and any track already generated for it.
  const clamped = parsed.map((cue) => ({
    ...cue,
    beatStart: Math.max(0, Math.min(beats.length - 1, cue.beatStart)),
    beatEnd: Math.max(0, Math.min(beats.length - 1, cue.beatEnd)),
  }))

  const ordered = [...clamped].sort((a, b) => a.beatStart - b.beatStart)
  const kept: SceneMusicCue[] = []
  let lastEnd = -1
  for (const cue of ordered) {
    if (cue.beatStart <= lastEnd) continue
    kept.push({ ...cue, beatEnd: Math.max(cue.beatStart, cue.beatEnd) })
    lastEnd = kept[kept.length - 1].beatEnd
  }
  return kept.slice(0, MAX_MUSIC_CUES)
}

/** True once a cue holds a generated track. */
export function isMusicCueScored(cue: SceneMusicCue | undefined): boolean {
  return !!cue?.url?.trim()
}

/**
 * The scene's cues, in order of authority: an already-persisted plan, then the
 * raw `musicCues` the script LLM emitted, then a plan cut from the movements.
 *
 * A persisted plan is never recomputed, even a derived one. Cues spend credits
 * and hold the tracks those credits bought, and the scene fields a derived plan
 * reads from are rewritten by the beat migration itself — re-deriving on every
 * pass would reshuffle a scene's score, and leave paid-for tracks sitting under
 * beats they were not written for. Re-planning is an explicit action.
 */
export function getSceneMusicCues(
  scene: Record<string, unknown> | null | undefined,
  beats: SceneBeat[],
  movements: SceneMovement[]
): SceneMusicCue[] {
  if (!scene || beats.length === 0) return []

  const persisted = parsePersistedMusicCues(scene.sceneMusicCues, beats)
  if (persisted.length > 0) return persisted

  const fromLlm = planSceneMusicCues(scene.musicCues, beats, 'llm')
  if (fromLlm.length > 0) return fromLlm

  return deriveSceneMusicCues(scene, beats, movements)
}

/** Stable fingerprint of a cue plan's coverage, used to detect a re-plan. */
function coverageSignature(cues: SceneMusicCue[]): string {
  return cues.map((cue) => `${cue.beatStart}-${cue.beatEnd}`).join(',')
}

/**
 * Rebuild a cue with a fixed field order.
 *
 * Cues are persisted, read back, and compared as JSON by the project
 * migration. Without one canonical shape a cue written by the planner and the
 * same cue read back differ only in key order, which reads as a change and
 * makes the migration rewrite every scene on every run.
 */
function normalizeCueShape(cue: SceneMusicCue): SceneMusicCue {
  return {
    cueId: cue.cueId,
    beatStart: cue.beatStart,
    beatEnd: cue.beatEnd,
    description: cue.description,
    intent: cue.intent,
    ...(cue.entry ? { entry: cue.entry } : {}),
    ...(cue.exit ? { exit: cue.exit } : {}),
    ...(cue.url ? { url: cue.url } : {}),
    ...(cue.duration && cue.duration > 0 ? { duration: cue.duration } : {}),
    ...(cue.fileDuration && cue.fileDuration > 0 ? { fileDuration: cue.fileDuration } : {}),
    ...(cue.generatedBy ? { generatedBy: cue.generatedBy } : {}),
    ...(cue.updatedAt ? { updatedAt: cue.updatedAt } : {}),
  }
}

/**
 * Persist the cues and switch `musicEnabled` on the beats they cover.
 *
 * Beat flags are only rewritten when the coverage itself changed. Once a plan
 * is applied the flags belong to the user, whose per-beat overrides in the
 * script panel would otherwise be undone by the next migration pass.
 */
export function applySceneMusicCues(
  scene: Record<string, unknown>,
  cues: SceneMusicCue[],
  beats: SceneBeat[]
): { scene: Record<string, unknown>; beats: SceneBeat[] } {
  if (cues.length === 0) return { scene, beats }

  const signature = coverageSignature(cues)
  const alreadyApplied = scene.musicCueCoverage === signature

  const nextBeats = alreadyApplied
    ? beats
    : beats.map((beat, index) => {
        const covered = cues.some(
          (cue) => index >= cue.beatStart && index <= cue.beatEnd
        )
        return beat.musicEnabled === covered ? beat : { ...beat, musicEnabled: covered }
      })

  const nextScene: Record<string, unknown> = {
    ...scene,
    sceneMusicCues: cues.map(normalizeCueShape),
    musicCueCoverage: signature,
  }
  // `musicCues` is the raw LLM field; `sceneMusicCues` is the normalized record.
  delete nextScene.musicCues

  return { scene: nextScene, beats: nextBeats }
}

/**
 * Hand a scene's pre-cue music track to the cue that was written from the same
 * brief, so upgrading a project does not strand a track the user already paid
 * to generate — or silently regenerate it.
 */
export function adoptLegacySceneTrack(
  scene: Record<string, unknown>,
  cues: SceneMusicCue[]
): SceneMusicCue[] {
  if (cues.length === 0 || cues.some(isMusicCueScored)) return cues

  const url = typeof scene.musicAudio === 'string' ? scene.musicAudio.trim() : ''
  if (!url) return cues

  const brief = sceneMusicDescription(scene)
  if (!brief) return cues
  // Only the cue written from the scene's own brief can claim the scene's own
  // track; a cue with its own brief would be playing the wrong music.
  if (cues[0].description !== adaptPromptForLyria(brief)) return cues

  const fileDuration = Number(scene.musicFileDuration)
  const duration = Number(scene.musicDuration)

  return cues.map((cue, index) =>
    index === 0
      ? {
          ...cue,
          url,
          ...(fileDuration > 0 ? { fileDuration } : {}),
          ...(duration > 0 ? { duration } : {}),
        }
      : cue
  )
}

/** Resolve the scene's cues and persist them together with the beat flags. */
export function ensureSceneMusicCues(
  scene: Record<string, unknown>,
  beats: SceneBeat[],
  movements: SceneMovement[]
): { scene: Record<string, unknown>; beats: SceneBeat[] } {
  const cues = adoptLegacySceneTrack(scene, getSceneMusicCues(scene, beats, movements))
  return applySceneMusicCues(scene, cues, beats)
}

/** The cue scoring a beat, if any. */
export function resolveBeatMusicCue(
  cues: SceneMusicCue[],
  beatIndex: number
): SceneMusicCue | undefined {
  return cues.find((cue) => beatIndex >= cue.beatStart && beatIndex <= cue.beatEnd)
}

/**
 * The cue as direction for the video model — how the moment should feel and
 * move, never what it should sound like.
 *
 * The score is generated separately and mixed under the clip, so the video
 * prompt must not ask for audio: it only tells the model what emotional
 * temperature the picture is cut to, so the pacing and performance match the
 * music that will sit beneath them.
 */
export function formatMusicCueSteer(cue: SceneMusicCue | undefined): string {
  const intent = cue?.intent?.trim()
  if (!intent) return ''
  return `Scored moment: ${intent} — carry that in the pacing and performance`
}

/**
 * Fallback beat length when a beat has no measured duration, matching the
 * animatic's own default hold for an action beat.
 */
const ASSUMED_BEAT_DURATION_SEC = 4

/**
 * How long the cue plays, summed from the beats it covers.
 *
 * Lyria returns a fixed ~30s clip whatever is asked for, so this is not a
 * length the generator honours — it is what the mixer loops or trims the track
 * to, and what the cue is labelled with.
 */
export function estimateMusicCueDuration(
  cue: SceneMusicCue,
  beats: SceneBeat[]
): number {
  let total = 0
  for (let index = cue.beatStart; index <= cue.beatEnd; index++) {
    const beat = beats[index]
    if (!beat) continue
    total +=
      typeof beat.durationSeconds === 'number' && beat.durationSeconds > 0
        ? beat.durationSeconds
        : ASSUMED_BEAT_DURATION_SEC
  }
  return total > 0 ? Math.round(total) : ASSUMED_BEAT_DURATION_SEC
}

/** Human label for a cue's beat span, 1-based for the UI. */
export function formatMusicCueRange(cue: SceneMusicCue): string {
  return cue.beatStart === cue.beatEnd
    ? `Beat ${cue.beatStart + 1}`
    : `Beats ${cue.beatStart + 1}-${cue.beatEnd + 1}`
}
