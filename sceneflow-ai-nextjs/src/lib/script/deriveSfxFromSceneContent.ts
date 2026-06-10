/**
 * Derive scene.sfx[] cues from scene direction, inline script lines, and key actions.
 * Assigns each cue to the best-matching beat via sourceBeatId.
 */

import {
  buildSegmentSfx,
  coerceSceneSfxFlatArray,
  mintSfxId,
} from '@/lib/script/segmentScript'
import type { SceneBeat } from '@/lib/script/segmentTypes'

export interface SceneSfxCue {
  description: string
  time?: number
  sourceBeatId?: string
  sourceLineId?: string
  sfxId?: string
  legacyIndex?: number
}

type SceneDirectionShape = {
  audio?: { priorities?: string; considerations?: string } | string
  talent?: { keyActions?: string[]; blocking?: string }
  camera?: { shots?: string[] }
}

const PRODUCTION_INSTRUCTION =
  /\b(capture\s+clean\s+dialogue|prioritize|silence\s+on\s+set|room\s+tone|hvac|mix(?:ing)?|duck(?:ing)?|considerations?|on\s+set|clean\s+dialogue|ambient\s+bed\s+only)\b/i

const SOUND_KEYWORD =
  /\b(click|clack|clacking|hum|buzz|beep|ring|bang|crash|thud|whoosh|rustle|creak|slam|whistle|echo|rumble|hiss|drip|scrape|footstep|knock|tap|sizzle|crackle|roar|growl|chirp|wind|rain|thunder|typing|keyboard|mouse|fan|door|engine|siren|alarm|glass|metal|wood|hardwood|static|pop|snap|crunch|pound|punch|swish|flutter|breath|gasp|sigh|laugh|cry|scream|shout|whisper|murmur|mumble|phone|notification|alert)\b/i

const DIALOGUE_ANCHOR =
  /\b(dialogue|under\s+dialogue|over\s+dialogue|beneath\s+dialogue|with\s+dialogue|during\s+dialogue|spoken\s+line)\b/i

const AMBIENT_KEYWORD =
  /\b(hum|fan|room\s+tone|ambient|wind|rain|traffic|distant|background|atmosphere|drone|buzz)\b/i

function normalizeDescription(text: string): string {
  return text.trim().replace(/\s+/g, ' ').toLowerCase()
}

function isProductionOnlyClause(text: string): boolean {
  const t = text.trim()
  if (!t) return true
  if (PRODUCTION_INSTRUCTION.test(t) && !SOUND_KEYWORD.test(t)) return true
  return false
}

function stripLeadingArticles(text: string): string {
  return text.replace(/^(the|a|an)\s+/i, '').trim()
}

/** Split compound audio direction into candidate SFX descriptions. */
export function extractSfxDescriptionsFromAudioText(raw: string): string[] {
  let text = String(raw ?? '').trim()
  if (!text) return []

  text = text.replace(/^audio:\s*/i, '').trim()

  const segments = text
    .split(
      /\s+(?:over|with|under|alongside|against|mixed\s+with|beneath|during)\s+|;\s*|\.\s+(?=[A-Z])|,\s*(?=[a-z])/i
    )
    .map((s) => s.trim())
    .filter(Boolean)

  const splitOnAnd = segments.flatMap((segment) => {
    if (/\band\b/i.test(segment) && SOUND_KEYWORD.test(segment)) {
      return segment.split(/\s+and\s+/i).map((s) => s.trim()).filter(Boolean)
    }
    return [segment]
  })

  const cues: string[] = []
  for (const segment of splitOnAnd) {
    const cleaned = stripLeadingArticles(segment.replace(/[.;]+$/, '').trim())
    if (cleaned.length < 3) continue
    if (isProductionOnlyClause(cleaned)) continue
    if (!SOUND_KEYWORD.test(cleaned) && !/\bsound\b/i.test(cleaned)) continue
    cues.push(cleaned)
  }

  return dedupeDescriptions(cues)
}

function dedupeDescriptions(descriptions: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const d of descriptions) {
    const key = normalizeDescription(d)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(d)
  }
  return out
}

/** Parse inline `SFX:` lines from action / beat text. */
export function extractInlineSfxFromActionText(action: string): string[] {
  if (!action?.trim()) return []
  const cues: string[] = []
  for (const line of action.split('\n')) {
    const match = line.trim().match(/^SFX:\s*(.+)$/i)
    if (match?.[1]?.trim()) cues.push(match[1].trim())
  }
  return dedupeDescriptions(cues)
}

function extractSfxFromKeyActions(keyActions: string[]): string[] {
  const cues: string[] = []
  for (const action of keyActions) {
    const text = String(action ?? '').trim()
    if (!text || !SOUND_KEYWORD.test(text)) continue
    if (isProductionOnlyClause(text)) continue
    cues.push(text)
  }
  return dedupeDescriptions(cues)
}

function readSceneDirectionAudio(scene: Record<string, unknown>): string[] {
  const raw = scene.sceneDirection
  if (!raw || typeof raw !== 'object') return []
  const direction = raw as SceneDirectionShape
  const audio = direction.audio
  const parts: string[] = []
  if (typeof audio === 'string' && audio.trim()) {
    parts.push(audio.trim())
  } else if (audio && typeof audio === 'object') {
    if (audio.priorities?.trim()) parts.push(audio.priorities.trim())
    if (audio.considerations?.trim()) parts.push(audio.considerations.trim())
  }
  return parts.flatMap(extractSfxDescriptionsFromAudioText)
}

function collectRawSfxDescriptions(
  scene: Record<string, unknown>,
  beats: SceneBeat[]
): string[] {
  const fromAudio = readSceneDirectionAudio(scene)
  const fromAction = extractInlineSfxFromActionText(
    String(scene.action ?? scene.visualDescription ?? '')
  )
  const fromBeats = beats.flatMap((b) =>
    b.kind === 'action'
      ? extractInlineSfxFromActionText(b.actionDescription ?? '')
      : []
  )

  const direction =
    scene.sceneDirection && typeof scene.sceneDirection === 'object'
      ? (scene.sceneDirection as SceneDirectionShape)
      : undefined
  const keyActions = Array.isArray(direction?.talent?.keyActions)
    ? direction!.talent!.keyActions!
    : []
  const fromKeyActions = extractSfxFromKeyActions(keyActions.map(String))

  return dedupeDescriptions([
    ...fromAudio,
    ...fromAction,
    ...fromBeats,
    ...fromKeyActions,
  ])
}

function tokenizeForMatch(text: string): string[] {
  return normalizeDescription(text)
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2)
}

function scoreBeatForSfx(
  beat: SceneBeat,
  beatIndex: number,
  cueDescription: string,
  scene: Record<string, unknown>,
  beats: SceneBeat[]
): number {
  const cueTokens = tokenizeForMatch(cueDescription)
  if (cueTokens.length === 0) return 0

  const direction =
    scene.sceneDirection && typeof scene.sceneDirection === 'object'
      ? (scene.sceneDirection as SceneDirectionShape)
      : undefined
  const keyActions = Array.isArray(direction?.talent?.keyActions)
    ? direction!.talent!.keyActions!.map(String)
    : []
  const shots = Array.isArray(direction?.camera?.shots)
    ? direction!.camera!.shots!.map(String)
    : []

  const texts: string[] = []
  if (beat.actionDescription) texts.push(beat.actionDescription)
  if (keyActions[beatIndex]) texts.push(keyActions[beatIndex])
  if (shots[beatIndex]) texts.push(shots[beatIndex])
  if (beat.line) texts.push(beat.line)

  const haystack = normalizeDescription(texts.join(' '))
  let score = 0
  for (const token of cueTokens) {
    if (haystack.includes(token)) score += 2
  }

  if (beat.kind === 'action' && beatIndex === 0 && AMBIENT_KEYWORD.test(cueDescription)) {
    score += 1
  }

  return score
}

function isSpokenKind(kind: BeatKind): boolean {
  return kind === 'dialogue' || kind === 'narration'
}

function findBestBeatForCue(
  cueDescription: string,
  beats: SceneBeat[],
  scene: Record<string, unknown>,
  legacyIndex: number
): { beatId?: string; sourceLineId?: string } {
  if (beats.length === 0) return {}

  if (DIALOGUE_ANCHOR.test(cueDescription)) {
    const spoken = beats.filter((b) => isSpokenKind(b.kind))
    const target = spoken[0] ?? beats.find((b) => isSpokenKind(b.kind))
    if (target) {
      return {
        beatId: target.beatId,
        sourceLineId: target.lineId,
      }
    }
  }

  let bestBeat = beats[0]
  let bestScore = -1
  beats.forEach((beat, index) => {
    const score = scoreBeatForSfx(beat, index, cueDescription, scene, beats)
    if (score > bestScore) {
      bestScore = score
      bestBeat = beat
    }
  })

  if (bestScore <= 0) {
    const fallbackIdx = Math.min(Math.max(0, legacyIndex), beats.length - 1)
    bestBeat = beats[fallbackIdx]
  }

  return {
    beatId: bestBeat.beatId,
    sourceLineId: isSpokenKind(bestBeat.kind) ? bestBeat.lineId : undefined,
  }
}

function coerceExistingCue(raw: unknown, legacyIndex: number): SceneSfxCue | null {
  if (raw == null) return null
  if (typeof raw === 'string') {
    const description = raw.trim()
    if (!description) return null
    return { description, legacyIndex }
  }
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>
    const description = String(o.description ?? o.text ?? o.name ?? '').trim()
    if (!description) return null
    return {
      description,
      time: typeof o.time === 'number' ? o.time : undefined,
      sourceBeatId:
        typeof o.sourceBeatId === 'string' ? o.sourceBeatId : undefined,
      sourceLineId:
        typeof o.sourceLineId === 'string' ? o.sourceLineId : undefined,
      sfxId: typeof o.sfxId === 'string' ? o.sfxId : undefined,
      legacyIndex:
        typeof o.legacyIndex === 'number' ? o.legacyIndex : legacyIndex,
    }
  }
  return null
}

function descriptionsMatch(a: string, b: string): boolean {
  return normalizeDescription(a) === normalizeDescription(b)
}

/** Assign sourceBeatId / sourceLineId to extracted cue descriptions. */
export function assignSfxToBeats(
  descriptions: string[],
  beats: SceneBeat[],
  scene: Record<string, unknown>
): SceneSfxCue[] {
  return descriptions.map((description, legacyIndex) => {
    const { beatId, sourceLineId } = findBestBeatForCue(
      description,
      beats,
      scene,
      legacyIndex
    )
    return {
      ...buildSegmentSfx(description, { sourceLineId, sourceBeatId: beatId }),
      legacyIndex,
    }
  })
}

/** Derive SFX cues from scene content and assign to beats. */
export function deriveSfxFromSceneContent(
  scene: Record<string, unknown>,
  beats: SceneBeat[]
): SceneSfxCue[] {
  const descriptions = collectRawSfxDescriptions(scene, beats)
  if (descriptions.length === 0) return []
  return assignSfxToBeats(descriptions, beats, scene)
}

/**
 * Merge derived SFX into scene without duplicating descriptions.
 * Preserves user cues whose descriptions are not in the derived set.
 */
export function applyDerivedSfxToScene(
  scene: Record<string, unknown>,
  beats: SceneBeat[]
): Record<string, unknown> {
  const derived = deriveSfxFromSceneContent(scene, beats)
  const existing = coerceSceneSfxFlatArray(scene.sfx)
    .map((item, idx) => coerceExistingCue(item, idx))
    .filter((c): c is SceneSfxCue => c != null)

  if (derived.length === 0) {
    return scene
  }

  const derivedKeys = new Set(derived.map((d) => normalizeDescription(d.description)))
  const preserved = existing.filter(
    (c) => !derivedKeys.has(normalizeDescription(c.description))
  )

  const merged: SceneSfxCue[] = [...preserved]
  for (const cue of derived) {
    const existingIdx = merged.findIndex((c) =>
      descriptionsMatch(c.description, cue.description)
    )
    if (existingIdx >= 0) {
      merged[existingIdx] = {
        ...merged[existingIdx],
        sourceBeatId: cue.sourceBeatId ?? merged[existingIdx].sourceBeatId,
        sourceLineId: cue.sourceLineId ?? merged[existingIdx].sourceLineId,
        sfxId: merged[existingIdx].sfxId ?? cue.sfxId ?? mintSfxId(),
        legacyIndex: merged[existingIdx].legacyIndex ?? cue.legacyIndex,
      }
    } else {
      merged.push({
        ...cue,
        sfxId: cue.sfxId ?? mintSfxId(),
      })
    }
  }

  return {
    ...scene,
    sfx: merged.map(({ description, time, sourceBeatId, sourceLineId, sfxId, legacyIndex }) => ({
      description,
      ...(time !== undefined ? { time } : {}),
      ...(sourceBeatId ? { sourceBeatId } : {}),
      ...(sourceLineId ? { sourceLineId } : {}),
      ...(sfxId ? { sfxId } : {}),
      ...(legacyIndex !== undefined ? { legacyIndex } : {}),
    })),
  }
}

const BEAT_SFX_DESCRIPTION_MAX = 200

function truncateBeatSfxDescription(text: string): string {
  const trimmed = text.trim().replace(/\s+/g, ' ')
  if (trimmed.length <= BEAT_SFX_DESCRIPTION_MAX) return trimmed
  return `${trimmed.slice(0, BEAT_SFX_DESCRIPTION_MAX - 1)}…`
}

export interface BeatSfxSlot {
  sfxIndex: number
  sfxId: string
  description: string
  sourceBeatId: string
  /** True when a new cue was appended to scene.sfx. */
  created: boolean
}

/** Find or append an sfx[] entry scoped to a storyboard beat. */
export function resolveBeatSfxSlot(
  scene: Record<string, unknown>,
  beat: Pick<SceneBeat, 'beatId' | 'actionDescription' | 'kind'>
): BeatSfxSlot {
  if (beat.kind !== 'action') {
    throw new Error('resolveBeatSfxSlot requires an action beat')
  }

  const actionText = String(beat.actionDescription ?? '').trim()
  if (!actionText) {
    throw new Error('Action beat has no description for SFX generation')
  }

  const existing = coerceSceneSfxFlatArray(scene.sfx)
    .map((item, idx) => ({ cue: coerceExistingCue(item, idx), idx }))
    .filter((row): row is { cue: SceneSfxCue; idx: number } => row.cue != null)

  const match = existing.find((row) => row.cue.sourceBeatId === beat.beatId)
  if (match) {
    return {
      sfxIndex: match.idx,
      sfxId: match.cue.sfxId ?? mintSfxId(),
      description: match.cue.description,
      sourceBeatId: beat.beatId,
      created: false,
    }
  }

  const sfxIndex = existing.length
  const sfxId = mintSfxId()
  return {
    sfxIndex,
    sfxId,
    description: truncateBeatSfxDescription(actionText),
    sourceBeatId: beat.beatId,
    created: true,
  }
}

/** In-place upsert of beat-scoped sfx cue on a scene object (for PATCH / client). */
export function upsertBeatSfxCueOnScene(
  scene: Record<string, unknown>,
  beat: Pick<SceneBeat, 'beatId' | 'actionDescription' | 'kind'>
): BeatSfxSlot {
  const slot = resolveBeatSfxSlot(scene, beat)
  if (!slot.created) return slot

  const list = coerceSceneSfxFlatArray(scene.sfx)
  list.push({
    description: slot.description,
    sourceBeatId: slot.sourceBeatId,
    sfxId: slot.sfxId,
    legacyIndex: slot.sfxIndex,
  })
  scene.sfx = list
  return slot
}
