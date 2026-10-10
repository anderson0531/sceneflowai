/**
 * Deterministic review of a promo cut.
 *
 * Audience Resonance scores the script. This pass scores the cut: the title
 * card, repeated introductions, dialogue that the clip will chop, plates the
 * designated shots still need, base shot direction, and blueprint coverage.
 * Story notes from the model are added later and do not replace these.
 */

import { getSceneBeats } from '@/lib/script/beatMigration'
import { PROMO_AUDIO_MIX, PROMO_MUSIC_BURIES_AT } from '@/lib/publish/promoAudioMix'
import { resolvePromoBeatMedia } from '@/lib/publish/promoBeatMedia'
import {
  findPromoTitleCard,
  isPromoCreditShot,
} from '@/lib/publish/promoPlanConstraints'
import {
  buildPromoShotCatalog,
  isOptimizedShotDirection,
  type PromoShotCatalogEntry,
} from '@/lib/publish/promoShotCatalog'
import type { PromoTrailerBeatPlan } from '@/types/publishingAssets'
import {
  resolveBeatReferenceRequirements,
  resolveProjectSceneRequirements,
  type SceneReferenceRequirement,
  type SceneRequirementCharacter,
  type SceneRequirementLocation,
  type SceneRequirementObject,
} from '@/lib/vision/sceneReferenceRequirements'
import {
  resolveReferenceReadiness,
  resolveSceneReferenceReadiness,
  type ReferenceReadiness,
} from '@/lib/vision/referenceReadiness'

export type PromoFindingCategory =
  | 'title'
  | 'redundancy'
  | 'dialogue'
  | 'references'
  | 'direction'
  | 'blueprint'
  | 'mix'

export interface PromoPlanFinding {
  category: PromoFindingCategory
  priority: 'high' | 'medium' | 'low'
  text: string
  /** Mix, plates, and direction are fixed outside the shot list. */
  revisesPlan: boolean
  sceneIndex?: number
  beatId?: string
}

export interface PromoBlueprintBeat {
  title?: string
  intent?: string
  synopsis?: string
  description?: string
}

export interface PromoPlanFindingsInput {
  scenes: unknown[]
  beatPlan: PromoTrailerBeatPlan[]
  sceneProductionState?: Record<string, unknown>
  blueprintBeats?: PromoBlueprintBeat[]
  characters?: SceneRequirementCharacter[] | null
  locationReferences?: SceneRequirementLocation[] | null
  objectReferences?: SceneRequirementObject[] | null
  /** Override for tests. Production uses the shared music bed. */
  musicLevel?: number
}

const PLAN_REVISING = new Set<PromoFindingCategory>([
  'title',
  'redundancy',
  'dialogue',
  'blueprint',
])

const FINDING_CATEGORIES = new Set<PromoFindingCategory>([
  'title',
  'redundancy',
  'dialogue',
  'references',
  'direction',
  'blueprint',
  'mix',
])

export function promoFindingRevisesPlan(category: PromoFindingCategory): boolean {
  return PLAN_REVISING.has(category)
}

function shotKey(sceneIndex: number, beatId: string): string {
  return `${sceneIndex}:${beatId}`
}

function plateNames(readiness: ReferenceReadiness): string[] {
  return [
    ...readiness.missingLocations.map((name) => `location ${name}`),
    ...readiness.missingObjects.map((name) => `prop ${name}`),
    ...readiness.missingCast.map((name) => `cast ${name}`),
  ]
}

function readinessForRequirements(
  requirements: SceneReferenceRequirement[],
  input: PromoPlanFindingsInput
): ReferenceReadiness {
  const fromRequirements = resolveSceneReferenceReadiness(requirements)
  const library = resolveReferenceReadiness({
    characters: (input.characters ?? []).filter((character) =>
      fromRequirements.missingCast.includes(character.name?.trim() || '')
    ),
    locationReferences: (input.locationReferences ?? []).filter((location) =>
      fromRequirements.missingLocations.some(
        (name) =>
          name === location.location?.trim() ||
          name === location.locationDisplay?.trim()
      )
    ),
    objectReferences: (input.objectReferences ?? []).filter((object) =>
      fromRequirements.missingObjects.includes(object.name?.trim() || '')
    ),
  })
  if (library.missingTotal > 0) return library
  return fromRequirements
}

function referenceFindings(input: PromoPlanFindingsInput): PromoPlanFinding[] {
  const findings: PromoPlanFinding[] = []
  let usedBeatSelection = false

  for (const row of input.beatPlan) {
    const scene = input.scenes[row.sceneIndex]
    if (!scene || typeof scene !== 'object') continue
    const beat = getSceneBeats(scene as Record<string, unknown>).find(
      (entry) => entry.beatId === row.beatId
    )
    const requirements = resolveBeatReferenceRequirements({
      beat,
      scene: scene as Record<string, unknown>,
      sceneIndex: row.sceneIndex,
      characters: input.characters,
      locationReferences: input.locationReferences,
      objectReferences: input.objectReferences,
    })
    if (!requirements) continue
    usedBeatSelection = true
    const names = plateNames(readinessForRequirements(requirements, input))
    if (names.length === 0) continue
    findings.push({
      category: 'references',
      priority: 'high',
      revisesPlan: false,
      sceneIndex: row.sceneIndex,
      beatId: row.beatId,
      text: `Draw ${names.join(', ')} before generating this promo shot. A missing plate makes the clip invent the place or the prop.`,
    })
  }

  if (usedBeatSelection) return findings

  const sceneIndices = [...new Set(input.beatPlan.map((row) => row.sceneIndex))]
  if (sceneIndices.length === 0) return findings
  const requirements = resolveProjectSceneRequirements(
    {
      metadata: {
        visionPhase: {
          scenes: input.scenes,
          characters: input.characters ?? [],
          references: {
            locationReferences: input.locationReferences ?? [],
            objectReferences: input.objectReferences ?? [],
          },
        },
      },
    },
    sceneIndices
  )
  const names = plateNames(readinessForRequirements(requirements, input))
  if (names.length === 0) return findings
  findings.push({
    category: 'references',
    priority: 'high',
    revisesPlan: false,
    text: `Draw ${names.join(', ')} before generating the promo. These plates belong to the planned shots, and a missing plate makes the clip invent them.`,
  })
  return findings
}

function blueprintTitle(beat: PromoBlueprintBeat, index: number): string {
  return beat.title?.trim() || beat.intent?.trim() || beat.synopsis?.trim() || `Beat ${index + 1}`
}

export function collectPromoPlanFindings(input: PromoPlanFindingsInput): PromoPlanFinding[] {
  const catalog = buildPromoShotCatalog({
    scenes: input.scenes,
    sceneProductionState: input.sceneProductionState,
  })
  const byKey = new Map(catalog.map((shot) => [shotKey(shot.sceneIndex, shot.beatId), shot]))
  const findings: PromoPlanFinding[] = []

  const title = findPromoTitleCard(catalog)
  const plannedShots = input.beatPlan
    .map((row) => byKey.get(shotKey(row.sceneIndex, row.beatId)))
    .filter((shot): shot is PromoShotCatalogEntry => !!shot)
  const credit = plannedShots.find((shot) => isPromoCreditShot(shot))
  if (title && !plannedShots.some((shot) => shot.beatId === title.beatId && shot.sceneIndex === title.sceneIndex)) {
    findings.push({
      category: 'title',
      priority: 'high',
      revisesPlan: true,
      sceneIndex: title.sceneIndex,
      beatId: title.beatId,
      text: credit
        ? `The cut includes the credit "${credit.label}" and leaves out the title card "${title.label}". End on the title reveal.`
        : `The cut leaves out the title card "${title.label}". End on the title reveal.`,
    })
  } else if (!title && credit) {
    findings.push({
      category: 'title',
      priority: 'high',
      revisesPlan: true,
      sceneIndex: credit.sceneIndex,
      beatId: credit.beatId,
      text: `The cut includes the credit "${credit.label}" and the script has no title-reveal shot to carry the film title.`,
    })
  }

  const intros = new Map<string, PromoShotCatalogEntry[]>()
  for (const shot of plannedShots) {
    const name = shot.introCharacter?.trim()
    if (!name) continue
    const key = name.toLowerCase()
    const group = intros.get(key) ?? []
    group.push(shot)
    intros.set(key, group)
  }
  for (const group of intros.values()) {
    if (group.length < 2) continue
    const name = group[0]!.introCharacter
    findings.push({
      category: 'redundancy',
      priority: 'high',
      revisesPlan: true,
      text: `${name} is introduced ${group.length} times. Keep one introduction.`,
    })
  }

  for (const row of input.beatPlan) {
    const shot = byKey.get(shotKey(row.sceneIndex, row.beatId))
    if (!shot || shot.beatKind !== 'dialogue') continue
    const spoken = shot.spokenDurationSec
    const planned = row.durationSec ?? row.endSec - row.startSec
    if (typeof spoken !== 'number' || spoken <= planned + 0.4) continue
    findings.push({
      category: 'dialogue',
      priority: 'high',
      revisesPlan: true,
      sceneIndex: row.sceneIndex,
      beatId: row.beatId,
      text: `"${shot.label}" runs about ${Math.round(spoken)}s and the cut gives it ${planned}s, so the line is cut off.`,
    })
  }

  findings.push(...referenceFindings(input))

  for (const row of input.beatPlan) {
    const scene = input.scenes[row.sceneIndex]
    const beat =
      scene && typeof scene === 'object'
        ? getSceneBeats(scene as Record<string, unknown>).find((entry) => entry.beatId === row.beatId)
        : undefined
    const media = resolvePromoBeatMedia(row, input.sceneProductionState)
    const optimized = isOptimizedShotDirection(beat?.beatDirection)
    const label = row.label || beat?.line || beat?.actionDescription || 'This shot'
    if (media.policyBlocked) {
      findings.push({
        category: 'direction',
        priority: 'high',
        revisesPlan: false,
        sceneIndex: row.sceneIndex,
        beatId: row.beatId,
        text: optimized
          ? `The last generate of "${label}" was blocked. Optimize direction with Safety, then generate again.`
          : `Shot direction on "${label}" is still the base direction and the last generate was blocked. Optimize direction with Safety, then generate again.`,
      })
    } else if (!media.hasClip && !optimized) {
      findings.push({
        category: 'direction',
        priority: 'medium',
        revisesPlan: false,
        sceneIndex: row.sceneIndex,
        beatId: row.beatId,
        text: `Shot direction on "${label}" has not been optimized. Optimize direction before generating this promo shot.`,
      })
    }
  }

  ;(input.blueprintBeats ?? []).forEach((beat, index) => {
    const covered = input.beatPlan.some((row) => {
      const scene = input.scenes[row.sceneIndex]
      if (!scene || typeof scene !== 'object') return false
      return (scene as { blueprintBeatIndex?: number }).blueprintBeatIndex === index
    })
    if (covered) return
    findings.push({
      category: 'blueprint',
      priority: 'medium',
      revisesPlan: true,
      text: `The promo never touches the blueprint beat "${blueprintTitle(beat, index)}". Cover that promise without replaying the blueprint in order.`,
    })
  })

  const speaks = input.beatPlan.some(
    (row) => row.beatKind === 'dialogue' || row.beatKind === 'narration'
  )
  const music = input.musicLevel ?? PROMO_AUDIO_MIX.music
  if (speaks && music >= PROMO_MUSIC_BURIES_AT) {
    findings.push({
      category: 'mix',
      priority: 'high',
      revisesPlan: false,
      text: 'Music is loud enough to cover dialogue and narration. Lower the bed under spoken shots.',
    })
  }

  return findings
}

export function promoRecommendationNotes(findings: PromoPlanFinding[]): string {
  return findings
    .filter((finding) => finding.revisesPlan)
    .map((finding) => finding.text.trim())
    .filter(Boolean)
    .join('\n')
}

export function buildPromoStoryNotesPrompt(input: {
  title?: string
  audienceText?: string
  blueprintBeats?: PromoBlueprintBeat[]
  beatPlan: PromoTrailerBeatPlan[]
  findings: PromoPlanFinding[]
}): string {
  const blueprint = (input.blueprintBeats ?? [])
    .map((beat, index) => blueprintTitle(beat, index))
    .filter(Boolean)
  const plan = input.beatPlan.map((beat, index) => ({
    order: index + 1,
    label: beat.label,
    role: beat.trailerRole,
    beatRole: beat.beatRole,
    kind: beat.beatKind,
    durationSec: beat.durationSec,
  }))
  const findings = input.findings.map((finding) => ({
    category: finding.category,
    text: finding.text,
  }))

  return `You are the Audience Resonance pass for this promo cut.
The deterministic findings are already decided. Do not contradict them and do not repeat them.
Add only story notes they do not already state: which blueprint promise is the strongest hook, which introduction to keep, and whether the button lands.
Cover the blueprint promises. Keep trailer order: hook, rise, peak, then the title as the button. Do not replay the blueprint in screenplay order.

Title: ${input.title?.trim() || 'Untitled'}
${input.audienceText?.trim() ? `Audience:\n${input.audienceText.trim()}\n` : ''}
Blueprint beats:
${blueprint.length ? blueprint.map((title, index) => `${index + 1}. ${title}`).join('\n') : '(none)'}

Current cut:
${JSON.stringify(plan)}

Findings already decided:
${JSON.stringify(findings)}

Return JSON only:
{"recommendations":[{"text":"...","priority":"high|medium|low","category":"title|redundancy|dialogue|references|direction|blueprint|mix"}]}`
}

function asPriority(value: unknown): PromoPlanFinding['priority'] {
  if (value === 'high' || value === 'low') return value
  return 'medium'
}

export function parsePromoStoryNotes(raw: unknown): PromoPlanFinding[] {
  const record = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : null
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray(record?.recommendations)
      ? record.recommendations
      : []
  const notes: PromoPlanFinding[] = []
  for (const entry of list) {
    if (!entry || typeof entry !== 'object') continue
    const item = entry as Record<string, unknown>
    const text = typeof item.text === 'string' ? item.text.trim() : ''
    const category = item.category
    if (!text || typeof category !== 'string' || !FINDING_CATEGORIES.has(category as PromoFindingCategory)) {
      continue
    }
    const typed = category as PromoFindingCategory
    notes.push({
      category: typed,
      priority: asPriority(item.priority),
      text,
      revisesPlan: promoFindingRevisesPlan(typed),
    })
  }
  return notes
}

export function mergePromoStoryNotes(
  findings: PromoPlanFinding[],
  notes: PromoPlanFinding[]
): PromoPlanFinding[] {
  const seen = new Set(findings.map((finding) => finding.text.trim().toLowerCase()))
  const extra = notes.filter((note) => {
    const text = note.text.trim().toLowerCase()
    if (!text || seen.has(text)) return false
    seen.add(text)
    return true
  })
  return [...findings, ...extra]
}
