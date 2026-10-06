/**
 * One-beat rewrite used when a shot is about to generate from thin direction.
 * The scene-wide Still Director is chunked; this pass covers whatever that
 * chunk still left unnamed.
 */

import 'server-only'

import { directBeatStills } from '@/lib/intelligence/beat-still-director'
import { applyStillDirectorPatch } from '@/lib/intelligence/beat-still-director-fallback'
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
    for (const candidate of [ref.characterName, ref.propName, ref.locationName]) {
      const name = candidate?.trim()
      if (name && name.length >= 3) names.add(name)
    }
  }
  return [...names]
}

function stillCheck(
  beat: SceneBeat,
  check: ShotDirectionRewriteCheck
): boolean {
  const composed = check.composedText ?? composeBeatActionFraming(beat)
  return shotNeedsDirectionRewrite(beat, { ...check, composedText: composed })
}

export async function rewriteThinStillBeat(args: {
  beat: SceneBeat
  beats: SceneBeat[]
  beatIndex: number
  catalog?: { characterNames: string[]; propNames: string[]; locationNames: string[] }
  check: ShotDirectionRewriteCheck
}): Promise<SceneBeat> {
  if (!stillCheck(args.beat, args.check)) return args.beat
  const { beat, beats, beatIndex } = args
  const result = await directBeatStills({
    mode: 'optimize',
    beats: [
      {
        beatIndex,
        beat,
        previousMoment:
          beatIndex > 0 ? composeBeatActionFraming(beats[beatIndex - 1]) : undefined,
        nextMoment:
          beatIndex + 1 < beats.length
            ? composeBeatActionFraming(beats[beatIndex + 1])
            : undefined,
      },
    ],
    catalog: args.catalog,
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
  musicCue?: SceneMusicCue
  catalog?: { characterNames: string[]; propNames: string[]; locationNames: string[] }
}): Promise<{ beat: SceneBeat; prompt: string }> {
  let beat = await rewriteThinStillBeat({
    beat: args.beat,
    beats: args.beats,
    beatIndex: args.beatIndex,
    catalog: args.catalog,
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
      ...(args.musicCue ? { musicCue: args.musicCue } : {}),
    }).prompt
  }
  const unnamedPlate = args.plateNames.some((name) => {
    const trimmed = name.trim()
    if (trimmed.length < 3) return false
    const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return !new RegExp(`\\b${escaped}\\b`, 'i').test(prompt)
  })
  if (!unnamedPlate || beat.beatDirection?.generatedBy === 'user') {
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
        generatedBy: beat.beatDirection?.generatedBy === 'user' ? 'user' : 'director',
        updatedAt: new Date().toISOString(),
      },
    },
    prompt: videoPrompt,
  }
}
