/**
 * Build a master-timeline audio clip list for a given language.
 * Reuses Final Cut scene durations and audioTrackBuilder per-scene scheduling.
 */

import { buildFinalCutClips } from '@/lib/final-cut/useFinalCutClips'
import {
  buildAudioTracksWithBaselineTiming,
  detectAvailableLanguages,
} from '@/components/vision/scene-production/audioTrackBuilder'
import type { FinalCutSelection } from '@/lib/types/finalCut'
import { LANGUAGE_CONFIGS } from '@/lib/types/finalCut'

export interface ScheduledAudioClip {
  url: string
  startTime: number
  duration: number
  volume?: number
  type?: 'narration' | 'dialogue' | 'music' | 'sfx' | 'voiceover'
}

export interface LanguageAudioTrackPlan {
  language: string
  clips: ScheduledAudioClip[]
  totalDuration: number
}

interface ProjectLike {
  id?: string
  metadata?: unknown
}

interface ScriptSceneLike {
  id?: string
  sceneId?: string
  sceneNumber?: number
  languagePlaybackOffsets?: Record<string, number>
  [key: string]: unknown
}

const DEFAULT_SELECTION: FinalCutSelection = {
  format: 'full-video',
  language: 'en',
}

function readScriptScenes(metadata: unknown): ScriptSceneLike[] {
  if (!metadata || typeof metadata !== 'object') return []
  const m = metadata as Record<string, unknown>
  const visionPhase = m.visionPhase as Record<string, unknown> | undefined
  const candidates: unknown[] = [
    (visionPhase?.script as { script?: { scenes?: unknown } } | undefined)?.script?.scenes,
    visionPhase?.scenes,
  ]
  for (const c of candidates) {
    if (Array.isArray(c) && c.length > 0) return c as ScriptSceneLike[]
  }
  for (const c of candidates) {
    if (Array.isArray(c)) return c as ScriptSceneLike[]
  }
  return []
}

function sceneIdFor(scene: ScriptSceneLike, index: number): string {
  return scene.id || scene.sceneId || `scene-${index}`
}

function readFinalCutSelection(metadata: unknown): FinalCutSelection {
  if (!metadata || typeof metadata !== 'object') return DEFAULT_SELECTION
  const stored = (metadata as { finalCut?: FinalCutSelection }).finalCut
  if (stored?.format && stored?.language) return stored
  return DEFAULT_SELECTION
}

function pushClip(
  clips: ScheduledAudioClip[],
  url: string | null | undefined,
  startTime: number,
  duration: number,
  volume: number,
  type: ScheduledAudioClip['type']
) {
  if (!url || typeof url !== 'string' || !url.trim() || duration <= 0) return
  clips.push({
    url: url.trim(),
    startTime: Math.max(0, startTime),
    duration,
    volume,
    type,
  })
}

/**
 * Languages with translated/generated audio available for MLA publish.
 */
export function getAvailablePublishLanguages(metadata: unknown): string[] {
  const scenes = readScriptScenes(metadata)
  const langs = new Set<string>()

  const translations = (metadata as { visionPhase?: { translations?: Record<string, unknown> } })
    ?.visionPhase?.translations
  if (translations) {
    Object.keys(translations).forEach((l) => langs.add(l))
  }

  for (const scene of scenes) {
    for (const l of detectAvailableLanguages(scene)) {
      langs.add(l)
    }
  }

  if (langs.size === 0) langs.add('en')
  return Array.from(langs).sort()
}

export function getLanguageDisplayName(code: string): string {
  return LANGUAGE_CONFIGS[code as keyof typeof LANGUAGE_CONFIGS]?.name ?? code.toUpperCase()
}

/**
 * Schedule per-language TTS + global music/SFX onto the master Final Cut timeline.
 */
export function buildLanguageAudioTrack(
  project: ProjectLike,
  language: string
): LanguageAudioTrackPlan {
  const metadata = project.metadata
  const selection = readFinalCutSelection(metadata)
  const masterSelection: FinalCutSelection = {
    ...selection,
    language: selection.language || 'en',
  }

  const finalCutClips = buildFinalCutClips({ project, selection: masterSelection })
  const scriptScenes = readScriptScenes(metadata)
  const sceneById = new Map<string, ScriptSceneLike>()
  scriptScenes.forEach((scene, index) => {
    sceneById.set(sceneIdFor(scene, index), scene)
  })

  const clips: ScheduledAudioClip[] = []
  let totalDuration = 0

  for (const fcClip of finalCutClips) {
    const scene = sceneById.get(fcClip.sceneId)
    if (!scene) continue

    const sceneOffset =
      typeof scene.languagePlaybackOffsets?.[language] === 'number'
        ? scene.languagePlaybackOffsets[language]
        : 0

    const sceneStart = fcClip.startTime
    const sceneEnd = fcClip.endTime
    const sceneDuration = fcClip.duration

    const tracks = buildAudioTracksWithBaselineTiming(scene, language, selection.language || 'en', {
      packDialogueToSegmentTimeline: true,
      segmentPlaybackOffsetSeconds: 1.0,
    })

    if (tracks.voiceover?.url) {
      const localStart = (tracks.voiceover.startTime ?? 0) + sceneOffset
      const dur = Math.min(tracks.voiceover.duration ?? sceneDuration, sceneEnd - (sceneStart + localStart))
      pushClip(clips, tracks.voiceover.url, sceneStart + localStart, dur, 1, 'voiceover')
    }

    for (const d of tracks.dialogue) {
      if (!d.url) continue
      const localStart = (d.startTime ?? 0) + sceneOffset
      const absStart = sceneStart + localStart
      const maxDur = Math.max(0, sceneEnd - absStart)
      const dur = Math.min(d.duration ?? 3, maxDur)
      pushClip(clips, d.url, absStart, dur, 1, 'dialogue')
    }

    if (tracks.music?.url) {
      const localStart = (tracks.music.startTime ?? 0) + sceneOffset
      const absStart = sceneStart + localStart
      const maxDur = Math.max(0, sceneEnd - absStart)
      const dur = Math.min(tracks.music.duration ?? sceneDuration, maxDur)
      pushClip(clips, tracks.music.url, absStart, dur, 0.4, 'music')
    }

    for (const s of tracks.sfx) {
      if (!s.url) continue
      const localStart = (s.startTime ?? 0) + sceneOffset
      const absStart = sceneStart + localStart
      const maxDur = Math.max(0, sceneEnd - absStart)
      const dur = Math.min(s.duration ?? 5, maxDur)
      pushClip(clips, s.url, absStart, dur, 0.6, 'sfx')
    }

    totalDuration = Math.max(totalDuration, sceneEnd)
  }

  if (finalCutClips.length === 0 && clips.length === 0) {
    totalDuration = 0
  }

  return { language, clips, totalDuration }
}
