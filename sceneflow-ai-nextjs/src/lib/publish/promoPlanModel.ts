/**
 * Model composition for a promo trailer.
 *
 * The catalog lists every shot. The model picks an editorial order. A plan
 * that names unknown shots, misses the length, or fails to parse falls back
 * to the cinematic heuristic.
 */

import { getGeminiTextModel } from '@/lib/config/modelConfig'
import {
  dialogueClipDuration,
  dropExtraIntroShots,
  findPromoTitleCard,
  isPromoTitleCard,
} from '@/lib/publish/promoPlanConstraints'
import {
  buildPromoShotCatalog,
  trailerRoleForBeatRole,
  type PromoShotCatalogEntry,
} from '@/lib/publish/promoShotCatalog'
import {
  MAX_TRAILER_SEC,
  MIN_TRAILER_SEC,
  planPromoTrailer,
  type TrailerPlannerInput,
  type TrailerPlannerResult,
} from '@/lib/publish/trailerPlanner'
import { generateText } from '@/lib/vertexai/gemini'
import type { PromoTrailerBeatPlan, PromoTrailerRole } from '@/types/publishingAssets'

const TRAILER_ROLES = new Set<PromoTrailerRole>(['hook', 'rise', 'peak', 'button'])

export interface PromoModelPlanInput extends TrailerPlannerInput {
  title?: string
  logline?: string
  genre?: string
  /** Audience Resonance text. Steers which shots and what pacing the model keeps. */
  audienceText?: string
  /** Blueprint beat titles. Coverage, not screenplay order. */
  blueprintBeats?: Array<{ title?: string; intent?: string }>
  /** Promo Director note for this revision. */
  directorNotes?: string
  /** Plan the director is revising. Omitted on a first composition. */
  currentPlan?: PromoTrailerBeatPlan[]
}

interface ModelPick {
  sceneIndex: number
  beatId: string
  durationSec: number
  trailerRole?: PromoTrailerRole
}

function clampTarget(targetDurationSec: number | undefined): number {
  const target = targetDurationSec ?? 60
  return Math.min(MAX_TRAILER_SEC, Math.max(MIN_TRAILER_SEC, target))
}

function clampClip(
  shot: PromoShotCatalogEntry,
  durationSec: number
): number {
  return dialogueClipDuration(shot, durationSec)
}

function asTrailerRole(value: unknown, beatRole?: string): PromoTrailerRole {
  if (typeof value === 'string' && TRAILER_ROLES.has(value as PromoTrailerRole)) {
    return value as PromoTrailerRole
  }
  return trailerRoleForBeatRole(beatRole)
}

function readPicks(raw: unknown): unknown[] | null {
  if (Array.isArray(raw)) return raw
  if (!raw || typeof raw !== 'object') return null
  const record = raw as Record<string, unknown>
  if (Array.isArray(record.shots)) return record.shots
  if (Array.isArray(record.beatPlan)) return record.beatPlan
  return null
}

function toBeatPlan(shot: PromoShotCatalogEntry, pick: ModelPick, score: number): PromoTrailerBeatPlan {
  return {
    sceneId: shot.sceneId,
    beatId: shot.beatId,
    sceneIndex: shot.sceneIndex,
    startSec: 0,
    endSec: pick.durationSec,
    durationSec: pick.durationSec,
    score,
    label: shot.label,
    frameUrl: shot.frameUrl,
    videoUrl: shot.videoUrl,
    beatRole: shot.beatRole,
    beatKind: shot.beatKind,
    trailerRole: pick.trailerRole,
    ...(shot.cinematicType ? { cinematicType: shot.cinematicType } : {}),
    ...(shot.overlayText ? { overlayText: shot.overlayText } : {}),
  }
}

function sumDuration(picks: ModelPick[]): number {
  return picks.reduce((sum, pick) => sum + pick.durationSec, 0)
}

/**
 * Keep the model's order. Drop unknown ids. Force the title card and hero shots in.
 * Dialogue clips follow the spoken line. A plan that cannot land in 30–120s is rejected.
 */
export function normalizePromoModelPlan(opts: {
  catalog: PromoShotCatalogEntry[]
  picks: unknown
  targetDurationSec?: number
  directorNotes?: string
}): TrailerPlannerResult | null {
  const rawPicks = readPicks(opts.picks)
  if (!rawPicks) return null

  const targetDurationSec = clampTarget(opts.targetDurationSec)
  const byKey = new Map(opts.catalog.map((shot) => [`${shot.sceneIndex}:${shot.beatId}`, shot]))
  const selected: Array<{ shot: PromoShotCatalogEntry; pick: ModelPick }> = []
  const seen = new Set<string>()

  const push = (shot: PromoShotCatalogEntry, durationSec: number, trailerRole: unknown, index: number) => {
    const key = `${shot.sceneIndex}:${shot.beatId}`
    if (seen.has(key)) return
    seen.add(key)
    selected.splice(index, 0, {
      shot,
      pick: {
        sceneIndex: shot.sceneIndex,
        beatId: shot.beatId,
        durationSec: clampClip(shot, durationSec),
        trailerRole: asTrailerRole(trailerRole, shot.beatRole),
      },
    })
  }

  for (const raw of rawPicks) {
    if (!raw || typeof raw !== 'object') continue
    const record = raw as Record<string, unknown>
    const sceneIndex = typeof record.sceneIndex === 'number' ? record.sceneIndex : Number(record.sceneIndex)
    const beatId = typeof record.beatId === 'string' ? record.beatId : ''
    if (!beatId || !Number.isInteger(sceneIndex)) continue
    const shot = byKey.get(`${sceneIndex}:${beatId}`)
    if (!shot) continue
    const duration =
      typeof record.durationSec === 'number'
        ? record.durationSec
        : typeof record.endSec === 'number' && typeof record.startSec === 'number'
          ? record.endSec - record.startSec
          : shot.durationSec
    push(shot, duration, record.trailerRole, selected.length)
  }

  for (const shot of opts.catalog) {
    if (!shot.hero || seen.has(`${shot.sceneIndex}:${shot.beatId}`)) continue
    const insertAt = selected.findIndex(
      (item) => item.pick.trailerRole === 'peak' || item.pick.trailerRole === 'button'
    )
    push(shot, shot.durationSec, trailerRoleForBeatRole(shot.beatRole), insertAt >= 0 ? insertAt : selected.length)
  }

  const keptIntros = dropExtraIntroShots(selected, opts.directorNotes)
  selected.length = 0
  selected.push(...keptIntros)

  const title = findPromoTitleCard(opts.catalog)
  if (title) {
    const titleKey = `${title.sceneIndex}:${title.beatId}`
    const existing = selected.findIndex(
      (item) => `${item.shot.sceneIndex}:${item.shot.beatId}` === titleKey
    )
    if (existing >= 0) {
      const [item] = selected.splice(existing, 1)
      item!.pick.trailerRole = 'button'
      selected.push(item!)
    } else {
      push(title, title.durationSec, 'button', selected.length)
    }
  }

  if (selected.length === 0) return null

  while (sumDuration(selected.map((item) => item.pick)) > targetDurationSec) {
    let dropAt = -1
    for (let i = selected.length - 1; i >= 0; i--) {
      if (!selected[i]!.shot.hero && !isPromoTitleCard(selected[i]!.shot)) {
        dropAt = i
        break
      }
    }
    if (dropAt < 0) break
    const nextTotal =
      sumDuration(selected.map((item) => item.pick)) - selected[dropAt]!.pick.durationSec
    if (nextTotal < MIN_TRAILER_SEC && sumDuration(selected.map((item) => item.pick)) <= MAX_TRAILER_SEC) {
      break
    }
    selected.splice(dropAt, 1)
  }

  const totalDurationSec = sumDuration(selected.map((item) => item.pick))
  if (totalDurationSec < MIN_TRAILER_SEC) return null
  if (totalDurationSec > MAX_TRAILER_SEC && selected.some((item) => !item.shot.hero)) return null

  return {
    beatPlan: selected.map((item, index) =>
      toBeatPlan(item.shot, item.pick, Math.max(1, selected.length - index))
    ),
    totalDurationSec,
    targetDurationSec,
    source: 'model',
  }
}

export function buildPromoPlanPrompt(input: {
  title?: string
  logline?: string
  genre?: string
  targetDurationSec: number
  catalog: PromoShotCatalogEntry[]
  audienceText?: string
  directorNotes?: string
  blueprintBeats?: Array<{ title?: string; intent?: string }>
  currentPlan?: PromoTrailerBeatPlan[]
}): string {
  const shots = input.catalog.map((shot) => ({
    sceneIndex: shot.sceneIndex,
    beatId: shot.beatId,
    heading: shot.heading,
    role: shot.beatRole,
    kind: shot.beatKind,
    text: shot.label,
    direction: shot.direction,
    audience: shot.audienceScore,
    hero: shot.hero || undefined,
    hasStill: shot.hasStill,
    hasClip: shot.hasClip,
  }))

  const current = input.currentPlan?.map((beat) => ({
    sceneIndex: beat.sceneIndex,
    beatId: beat.beatId,
    durationSec: beat.durationSec,
    trailerRole: beat.trailerRole,
    label: beat.label,
  }))

  const audience = input.audienceText?.trim()
  const notes = input.directorNotes?.trim()
  const blueprint = (input.blueprintBeats ?? [])
    .map((beat, index) => {
      const name = beat.title?.trim() || beat.intent?.trim()
      return name ? `${index + 1}. ${name}` : ''
    })
    .filter(Boolean)
    .join('\n')

  return `Compose the most effective cinematic promo trailer for this production.

Title: ${input.title?.trim() || 'Untitled'}
${input.logline?.trim() ? `Logline: ${input.logline.trim()}` : ''}
${input.genre?.trim() ? `Genre: ${input.genre.trim()}` : ''}
Target length: ${input.targetDurationSec} seconds (stay between 30 and 120).
${audience ? `\nTarget audience:\n${audience}\n` : ''}
${notes ? `\nDirector notes:\n${notes}\n` : ''}
${blueprint ? `\nBlueprint beats to cover (coverage, not screenplay order):\n${blueprint}\n` : ''}
${current?.length ? `\nCurrent plan to revise:\n${JSON.stringify(current)}\n` : ''}
Shots (every shot in the production; choose from these ids only):
${JSON.stringify(shots)}

Rules:
- Judge the shot by its dramatic and visual promise, not by whether a still or clip already exists.
- hasStill and hasClip are production notes. A shot with neither can still be the best shot in the trailer.
- Choose shots and pacing that resonate with the target audience.
- When director notes are present, follow them and revise the current plan instead of ignoring it.
- Order the trailer for impact: hook, then rising shots, then a peak, then the title as the button. Do not follow screenplay order.
- Cover the blueprint beat promises. Do not replay them in screenplay order.
- End on the title_reveal shot from the title sequence. A credit beat is not the title.
- Include every shot marked hero.
- At most one introduction of each protagonist, unless the director note asks to keep another.
- Dialogue durationSec is the spoken length, an integer from 4 to 10. Action, title, and credit shots stay between 4 and 6.
- The durations should add up close to the target.
- Do not invent sceneIndex or beatId values.
- trailerRole is one of: hook, rise, peak, button.

Return JSON only:
{"shots":[{"sceneIndex":0,"beatId":"...","durationSec":5,"trailerRole":"hook"}]}`
}

function parseModelJson(text: string): unknown {
  const cleaned = text.replace(/```json\s*|\s*```/g, '').trim()
  return JSON.parse(cleaned)
}

/** Ask the model for a trailer. Fall back to the heuristic arc when that plan is unusable. */
export async function planPromoTrailerWithModel(
  input: PromoModelPlanInput
): Promise<TrailerPlannerResult> {
  const catalog = buildPromoShotCatalog(input)
  const fallback = () => planPromoTrailer(input)
  if (catalog.length === 0) return fallback()

  const targetDurationSec = clampTarget(input.targetDurationSec)
  try {
    const result = await generateText(buildPromoPlanPrompt({
      title: input.title,
      logline: input.logline,
      genre: input.genre,
      targetDurationSec,
      catalog,
      audienceText: input.audienceText,
      directorNotes: input.directorNotes,
      blueprintBeats: input.blueprintBeats,
      currentPlan: input.currentPlan,
    }), {
      model: getGeminiTextModel('flash'),
      temperature: 0.4,
      maxOutputTokens: 4096,
      responseMimeType: 'application/json',
      thinkingLevel: 'minimal',
    })
    const normalized = normalizePromoModelPlan({
      catalog,
      picks: parseModelJson(result.text),
      targetDurationSec,
      directorNotes: input.directorNotes,
    })
    if (normalized) return normalized
  } catch (error) {
    console.warn('[Promo plan] Model composition failed, using trailer arc:', error)
  }
  return fallback()
}
