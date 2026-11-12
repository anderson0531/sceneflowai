/**
 * One-beat rewrite used when a shot is about to generate from thin direction.
 * The scene-wide Still Director is chunked; this pass covers whatever that
 * chunk still left unnamed.
 */

import 'server-only'

import { directBeatStills } from '@/lib/intelligence/beat-still-director'
import {
  applyStillDirectorPatch,
  type StillDirectorBoundContinuity,
  type StillDirectorSceneContext,
} from '@/lib/intelligence/beat-still-director-fallback'
import { directBeatVideo } from '@/lib/intelligence/beat-video-director'
import {
  composeBeatActionFraming,
  shotNeedsDirectionRewrite,
  type ShotDirectionRewriteCheck,
} from '@/lib/intelligence/beat-sequence-planner-fallback'
import {
  detectCharactersNamedInBeat,
  titleBeatNeedsCastClarify,
} from '@/lib/vision/beatFrameGenerationContext'
import { compileBeatVideoPromptFromDirection } from '@/lib/scene/beatVideoPromptCompiler'
import type { CumulativeSceneStateAtBeat } from '@/lib/scene/sceneStateLedger'
import type { SceneBeat } from '@/lib/script/segmentTypes'
import type { DetailedSceneDirection } from '@/types/scene-direction'
import type { SceneMusicCue } from '@/lib/script/segmentTypes'

export function expectsUnstatedCast(args: {
  scene: Record<string, unknown>
  beat: SceneBeat
  sceneNumber?: number
  projectCharacters: Array<{ id?: string; name?: string }>
  filmTitle?: string
  objectReferences?: Array<{ id?: string; name?: string; imageUrl?: string }>
  locationReferences?: Array<{ id?: string; name?: string; location?: string; imageUrl?: string }>
  promptText?: string
}): boolean {
  if (Array.isArray(args.beat.beatDirection?.castInFrame)) return false
  const clarifyArgs = args as Parameters<typeof titleBeatNeedsCastClarify>[0]
  if (titleBeatNeedsCastClarify(clarifyArgs)) return true
  return detectCharactersNamedInBeat(clarifyArgs).length > 0
}

export function plateNamesFromSelection(args: {
  selectedCharacters: string[]
  objectReferences: Array<{ name?: string }>
  projectCharacters: Array<{ id?: string; name?: string }>
}): string[] {
  const names = new Set<string>()
  for (const id of args.selectedCharacters) {
    const match = args.projectCharacters.find(
      (character) => character.id === id || character.name === id
    )
    const name = (match?.name || id).trim()
    if (name.length >= 3 && name !== id) names.add(name)
    else if (match?.name && match.name.trim().length >= 3) names.add(match.name.trim())
  }
  for (const objectRef of args.objectReferences) {
    const name = objectRef.name?.trim()
    if (name && name.length >= 3) names.add(name)
  }
  return [...names]
}

export function plateNamesFromVideoRefs(
  refs: Array<{ characterName?: string; propName?: string; locationName?: string }>
): string[] {
  const names = new Set<string>()
  for (const ref of refs) {
    // Location plates are bound via the scene/location setting block rather than
    // actor/prop action framing; requiring locationName in action framing forced
    // a redundant LLM rewrite on every clip with a location reference.
    for (const candidate of [ref.characterName, ref.propName]) {
      const name = candidate?.trim()
      if (name && name.length >= 3) names.add(name)
    }
  }
  return [...names]
}

export function hasCompleteAuthoredBeatDirection(beat: SceneBeat | null | undefined): boolean {
  const dir = beat?.beatDirection
  if (!dir) return false
  if (dir.generatedBy === 'user') return true
  if (dir.generatedBy !== 'director' && dir.generatedBy !== 'llm') return false
  if (dir.generatedBy === 'director' && dir.videoPrompt?.trim()) return true
  const hasCast = !Array.isArray(dir.castInFrame) || dir.castInFrame.length > 0
  return Boolean(
    dir.shotType?.trim() &&
      dir.frozenMoment?.trim() &&
      Array.isArray(dir.castInFrame) &&
      (!hasCast || dir.blocking?.trim() || dir.clipAction?.trim())
  )
}

function stillCheck(
  beat: SceneBeat,
  check: ShotDirectionRewriteCheck
): boolean {
  if (hasCompleteAuthoredBeatDirection(beat)) return false
  const composed = check.composedText ?? composeBeatActionFraming(beat)
  return shotNeedsDirectionRewrite(beat, { ...check, composedText: composed })
}

export async function rewriteThinStillBeat(args: {
  beat: SceneBeat
  beats: SceneBeat[]
  beatIndex: number
  catalog?: { characterNames?: string[]; propNames?: string[]; locationNames?: string[] }
  boundContinuity?: StillDirectorBoundContinuity
  sceneContext?: StillDirectorSceneContext
  check: ShotDirectionRewriteCheck
}): Promise<SceneBeat> {
  if (!stillCheck(args.beat, args.check)) return args.beat
  const { beat, beats, beatIndex } = args
  const normalizedCatalog = args.catalog
    ? {
        characterNames: args.catalog.characterNames ?? [],
        propNames: args.catalog.propNames ?? [],
        locationNames: args.catalog.locationNames ?? [],
      }
    : undefined
  const result = await directBeatStills({
    mode: 'optimize',
    beats: [
      {
        beatIndex,
        beat,
        ...(args.boundContinuity ? { boundContinuity: args.boundContinuity } : {}),
        previousMoment:
          beatIndex > 0 ? composeBeatActionFraming(beats[beatIndex - 1]) : undefined,
        nextMoment:
          beatIndex + 1 < beats.length
            ? composeBeatActionFraming(beats[beatIndex + 1])
            : undefined,
      },
    ],
    catalog: normalizedCatalog,
    ...(args.sceneContext ? { sceneContext: args.sceneContext } : {}),
  })
  const directed = result.patches[0]
  if (!directed) return beat
  const applied = applyStillDirectorPatch(beat, directed.patch, {
    generatedBy: 'director',
    skipIfProtected: false,
  })
  return applied.beat
}

export async function rewriteThinClipPrompt(args: {
  beat: SceneBeat
  beats: SceneBeat[]
  beatIndex: number
  prompt: string
  plateNames: string[]
  expectsCast: boolean
  sceneDirection?: DetailedSceneDirection | null
  artStyleId?: string
  previousBeat?: SceneBeat
  sceneState?: CumulativeSceneStateAtBeat | null
  musicCue?: SceneMusicCue
  catalog?: { characterNames?: string[]; propNames?: string[]; locationNames?: string[] }
  boundContinuity?: StillDirectorBoundContinuity
  sceneContext?: StillDirectorSceneContext
}): Promise<{ beat: SceneBeat; prompt: string }> {
  if (hasCompleteAuthoredBeatDirection(args.beat)) {
    return { beat: args.beat, prompt: args.prompt }
  }
  let beat = await rewriteThinStillBeat({
    beat: args.beat,
    beats: args.beats,
    beatIndex: args.beatIndex,
    catalog: args.catalog,
    boundContinuity: args.boundContinuity,
    sceneContext: args.sceneContext,
    check: {
      composedText: composeBeatActionFraming(args.beat),
      plateNames: args.plateNames,
      expectsCast: args.expectsCast,
    },
  })
  let prompt = args.prompt
  if (beat !== args.beat) {
    prompt = compileBeatVideoPromptFromDirection(beat, args.sceneDirection, {
      artStyleId: args.artStyleId,
      previousBeat: args.previousBeat,
      ...(args.sceneState ? { sceneState: args.sceneState } : {}),
      ...(args.musicCue ? { musicCue: args.musicCue } : {}),
    }).prompt
  }
  const unnamedPlate = args.plateNames.some((name) => {
    const trimmed = name.trim()
    if (trimmed.length < 3) return false
    const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return !new RegExp(`\\b${escaped}\\b`, 'i').test(prompt)
  })
  if (
    !unnamedPlate ||
    beat.beatDirection?.generatedBy === 'user' ||
    beat.beatDirection?.generatedBy === 'director'
  ) {
    return { beat, prompt }
  }
  const directed = await directBeatVideo({
    mode: 'optimize',
    currentPrompt: prompt,
    actionFraming: composeBeatActionFraming(beat),
    beatLabel: `Shot ${args.beatIndex + 1}`,
  })
  const videoPrompt = directed.videoPrompt.trim()
  if (!videoPrompt || videoPrompt === prompt.trim()) return { beat, prompt }
  return {
    beat: {
      ...beat,
      beatDirection: {
        ...(beat.beatDirection ?? {}),
        videoPrompt,
        generatedBy: 'director',
        updatedAt: new Date().toISOString(),
      },
    },
    prompt: videoPrompt,
  }
}
