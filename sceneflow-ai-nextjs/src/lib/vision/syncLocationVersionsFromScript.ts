/**
 * LLM catalog sync: lasting set-state versions for one location from the script.
 *
 * Shared by the interactive Update Locations route and Location Agent's
 * background catalog-sync phase.
 */

import { generateText } from '@/lib/vertexai/gemini'
import { safeParseJsonFromText } from '@/lib/safeJson'
import { getSceneBeats } from '@/lib/script/beatMigration'
import {
  formatSceneForLocationVersionAnalysis,
  type LocationAnalysisSceneInput,
} from '@/lib/vision/locationStateAnalysis'
import {
  buildLocationVersionSyncDiff,
  enrichSuggestionsWithBeatLocationState,
  summarizeLocationVersionSyncDiff,
  type ExistingLocationVersionLike,
  type LocationVersionSuggestionLike,
  type LocationVersionSyncDiff,
} from '@/lib/vision/locationScriptSync'
import type { LocationVersionAppliesFrom } from '@/types/visionReferences'

export type LocationVersionSyncTarget = {
  id: string
  location: string
  description?: string
  versions?: ExistingLocationVersionLike[]
}

export type LocationVersionSyncScreenplayContext = {
  genre?: string
  tone?: string
  setting?: string
  logline?: string
}

export function parseLocationVersionAppliesFrom(
  raw: unknown
): LocationVersionAppliesFrom | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const rec = raw as Record<string, unknown>
  const sceneNumber = Number(rec.sceneNumber)
  const beatIndex = Number(rec.beatIndex)
  if (!Number.isFinite(sceneNumber) || sceneNumber < 1) return undefined
  if (!Number.isFinite(beatIndex) || beatIndex < 0) return undefined
  const beatId = typeof rec.beatId === 'string' && rec.beatId.trim() ? rec.beatId.trim() : undefined
  return { sceneNumber, beatIndex, beatId }
}

/**
 * Map an LLM `appliesFrom` onto a real beat in that scene.
 * `beatIndex` must be the 0-based `[Beat N]` index. A value equal to the beat
 * count is treated as 1-based (the last beat). Anything still outside the
 * scene is dropped so versions are not stamped onto beats that do not exist.
 */
export function snapLocationVersionAppliesFrom(
  appliesFrom: LocationVersionAppliesFrom | undefined,
  scenes: LocationAnalysisSceneInput[]
): LocationVersionAppliesFrom | undefined {
  if (!appliesFrom) return undefined
  const scene = scenes.find((row) => row.sceneNumber === appliesFrom.sceneNumber)
  if (!scene) return undefined
  const beats = scene.beats ?? []
  if (beats.length === 0) {
    return { sceneNumber: appliesFrom.sceneNumber, beatIndex: 0 }
  }

  if (appliesFrom.beatId) {
    const byId = beats.findIndex((beat) => beat.beatId === appliesFrom.beatId)
    if (byId >= 0) {
      return {
        sceneNumber: appliesFrom.sceneNumber,
        beatIndex: byId,
        beatId: appliesFrom.beatId,
      }
    }
  }

  let beatIndex = Math.floor(appliesFrom.beatIndex)
  if (beatIndex === beats.length) beatIndex -= 1
  if (beatIndex < 0 || beatIndex >= beats.length) return undefined
  const beat = beats[beatIndex]
  return {
    sceneNumber: appliesFrom.sceneNumber,
    beatIndex,
    beatId: beat?.beatId,
  }
}

function headingText(scene: Record<string, unknown>): string | undefined {
  const heading = scene.heading
  if (typeof heading === 'string') return heading
  if (heading && typeof heading === 'object' && 'text' in heading) {
    const text = (heading as { text?: unknown }).text
    return typeof text === 'string' ? text : undefined
  }
  return undefined
}

/** Payload the version-sync LLM reads — one row per scene, beats included. */
export function buildLocationVersionAnalysisScenes(
  scenes: unknown[],
  sceneNumbers?: number[]
): LocationAnalysisSceneInput[] {
  return scenes.map((raw, idx) => {
    const scene = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
    const sceneDirection = scene.sceneDirection as
      | { scene?: { location?: string; atmosphere?: string } }
      | undefined
    const beats = getSceneBeats(scene)
    const explicit = sceneNumbers?.[idx]
    const sceneNumber =
      typeof explicit === 'number' && Number.isFinite(explicit) && explicit >= 1
        ? explicit
        : idx + 1
    return {
      sceneNumber,
      heading: headingText(scene),
      action: typeof scene.action === 'string' ? scene.action : undefined,
      visualDescription:
        typeof scene.visualDescription === 'string' ? scene.visualDescription : undefined,
      locationDescription: sceneDirection?.scene?.location,
      atmosphere: sceneDirection?.scene?.atmosphere,
      beats:
        beats.length > 0
          ? beats.map((beat) => ({
              beatId: beat.beatId,
              kind: beat.kind,
              actionDescription: beat.actionDescription?.trim() || undefined,
              line: beat.line?.trim() || undefined,
              frozenMoment: beat.beatDirection?.frozenMoment,
              propInteraction: beat.beatDirection?.propInteraction,
              lightingAccent: beat.beatDirection?.lightingAccent,
              blocking: beat.beatDirection?.blocking,
            }))
          : undefined,
    }
  })
}

export async function analyzeLocationVersionsFromScript(input: {
  location: LocationVersionSyncTarget
  scenes: LocationAnalysisSceneInput[]
  screenplayContext?: LocationVersionSyncScreenplayContext
}): Promise<{
  diff: LocationVersionSyncDiff
  totals: ReturnType<typeof summarizeLocationVersionSyncDiff>
  analyzedScenes: number
}> {
  const { location, scenes, screenplayContext } = input
  const locationName = location.location
  const existing = location.versions || []
  const sceneContext = scenes
    .map((scene) => formatSceneForLocationVersionAnalysis(scene, locationName))
    .join('\n\n---\n\n')

  const existingList = existing.length
    ? `\n\nEXISTING VERSIONS (prefer UPDATING these — match by name/state; remap sceneNumbers; only create when truly new):\n${existing
        .map(
          (version) =>
            `- id=${version.id} name="${version.name}" scenes=[${(version.sceneNumbers || []).join(', ')}] notes="${(version.stateNotes || '').slice(0, 160)}"`
        )
        .join('\n')}`
    : ''

  const analysisPrompt = `You are a production designer and set-continuity supervisor RESYNCING set-state versions after a script edit for ${locationName}.

LOCATION: ${locationName}
Description: ${location.description || 'Not specified'}

SCREENPLAY CONTEXT:
Genre: ${screenplayContext?.genre || 'Drama'}
Tone: ${screenplayContext?.tone || 'Neutral'}
Setting: ${screenplayContext?.setting || 'Contemporary'}
Logline: ${screenplayContext?.logline || 'Not specified'}

SCENES AT THIS LOCATION (including beat-level detail):
${sceneContext}
${existingList}

TASK: Produce the DISTINCT lasting set-state versions ${locationName} needs NOW based on the current script.

RESYNC RULES:
1. Prefer updating an existing version (same name / same damage) with refreshed sceneNumbers and stateNotes over creating near-duplicates.
2. Create a new version only for a clearly different lasting set state.
3. stateNotes is the COMPLETE current STRUCTURAL set state (accumulated), used for image generation. stateNotes must NOT include beat keyProps, propInteraction, or objects a character handles or introduces (journals, vellum, tools, weapons). Those belong on the beat frame, not this still.
4. Lasting practical set changes DO include doors/windows/gates opening or shutting and practical lights/lamps going on or off — including when a character only says it ("Shut the damn door", "kill the lights"). Do NOT invent versions for mood lighting, camera, people walking, or handheld beat props.
5. The intact base is not a version — omit it.
6. appliesFrom is the first beat where this state is visible. Spoken commands count as that beat. beatIndex is the 0-based [Beat N] number inside that scene and must be less than that scene's beat count. sceneNumber is the script scene number shown on the Scene line, not a renumbered subset.

For each DISTINCT version, provide name, stateNotes, sceneNumbers, appliesFrom, reason, confidence.

Respond with valid JSON only:
{
  "suggestions": [
    {
      "name": "string",
      "stateNotes": "string",
      "sceneNumbers": [1],
      "appliesFrom": { "sceneNumber": 1, "beatIndex": 1 },
      "reason": "string",
      "confidence": 0.9
    }
  ],
  "analysis": "Brief overall analysis"
}`

  const result = await generateText(analysisPrompt, {
    temperature: 0.5,
    maxOutputTokens: 4096,
    responseMimeType: 'application/json',
  })

  let suggestions: LocationVersionSuggestionLike[] = []
  let analysis = ''

  try {
    const parsed = safeParseJsonFromText(result.text)
    suggestions = (parsed.suggestions || []).map((suggestion: Record<string, unknown>) => ({
      name: String(suggestion.name || ''),
      stateNotes: String(suggestion.stateNotes || suggestion.description || ''),
      sceneNumbers: Array.isArray(suggestion.sceneNumbers) ? suggestion.sceneNumbers : [],
      appliesFrom: parseLocationVersionAppliesFrom(suggestion.appliesFrom),
      reason: String(suggestion.reason || ''),
      confidence: typeof suggestion.confidence === 'number' ? suggestion.confidence : 0.7,
    }))
    analysis = typeof parsed.analysis === 'string' ? parsed.analysis : ''
  } catch (parseError) {
    console.error('[Location Version Sync] Failed to parse AI response:', parseError)
    console.error('[Location Version Sync] Raw response:', result.text)
  }

  suggestions = enrichSuggestionsWithBeatLocationState(suggestions, scenes, existing).map(
    (suggestion) => ({
      ...suggestion,
      appliesFrom: snapLocationVersionAppliesFrom(suggestion.appliesFrom, scenes),
    })
  )

  suggestions.sort((a, b) => {
    const aFirst = a.appliesFrom?.sceneNumber ?? Math.min(...(a.sceneNumbers || [999]))
    const bFirst = b.appliesFrom?.sceneNumber ?? Math.min(...(b.sceneNumbers || [999]))
    if (aFirst !== bFirst) return aFirst - bFirst
    return (a.appliesFrom?.beatIndex ?? 0) - (b.appliesFrom?.beatIndex ?? 0)
  })

  const diff = buildLocationVersionSyncDiff(
    location.id,
    locationName,
    existing,
    suggestions,
    analysis
  )

  return {
    diff,
    totals: summarizeLocationVersionSyncDiff(diff),
    analyzedScenes: scenes.length,
  }
}
