/**
 * Synced Pre-Vis (Animatic) Scene Rendering Engine
 *
 * Reproduces the exact Screening Room Pre-Vis timeline (storyboard beat stills,
 * in-beat end-frame crossfades, authored Ken Burns motion, black fade-in/out,
 * narration/dialogue/beat voice clips, music cues with loop & fades, SFX clips,
 * per-scene mixer track volumes, and optional beat captions) as an MP4 via
 * `LocalRenderService` and optionally persists the rendered `animatic`
 * `ProductionStream` to the project.
 */

import { upload } from '@vercel/blob/client'
import type {
  ProductionStream,
  SceneProductionData,
} from '@/components/vision/scene-production/types'
import { getLanguageName } from '@/constants/languages'
import { getAudioDuration } from '@/lib/audio/audioDuration'
import { AUDIO_PROBE_CONCURRENCY, runBoundedPool } from '@/lib/audio/audioProbePool'
import { resolveSceneStreamUrl } from '@/lib/final-cut/resolveSegmentMedia'
import {
  appendSceneRenderClient,
  dispatchAppendedSceneRender,
} from '@/lib/projects/appendSceneRenderClient'
import { isPromoCinematicScene } from '@/lib/publish/buildPromoScene'
import {
  clampUnitVolume,
  effectiveScreeningDialogueVolume,
  effectiveScreeningTrackVolume,
  sceneMixerTrackVolumes,
} from '@/lib/scene/screeningTrackVolume'
import { getSceneBeats } from '@/lib/script/beatMigration'
import type { BeatDirectionTransition } from '@/lib/script/segmentTypes'
import { applyHifiClipAudio, type AnimaticAudioMode } from '@/lib/storyboard/animaticAudioMode'
import {
  buildStoryboardMusicClips,
  collectSceneMusicUrls,
  resolveSceneMusicFileDuration,
} from '@/lib/storyboard/musicPlayback'
import {
  defaultBeatOverlayType,
  resolveBeatCaptionText,
  type SceneTranslation,
} from '@/lib/storyboard/playerTranslations'
import { resolvePreVisSceneDisplay } from '@/lib/storyboard/preVisSceneDisplay'
import { buildBeatAlignedStoryboardSfxClips } from '@/lib/storyboard/sfxPlayback'
import {
  buildBeatFirstPlaybackTimeline,
  buildStoryboardVisualTimeline,
  buildStoryboardVoiceClips,
  getEstablishingFrameUrl,
  getScenePlayableThumbnailUrl,
  getScreeningPosterUrl,
  sceneHasPlayablePreVisAudio,
  type StoryboardVisualFrame,
} from '@/lib/storyboard/types'
import {
  localRenderService,
  type LocalRenderAudioClip,
  type LocalRenderConfig,
  type LocalRenderProgress,
  type LocalRenderResult,
  type LocalRenderSegment,
  type LocalRenderTextOverlay,
} from '@/lib/video/LocalRenderService'

export interface PreVisSceneSummary {
  sceneId: string
  sceneIndex: number
  sceneNumber: number
  heading: string
  isPromo: boolean
  frameCount: number
  voiceClipCount: number
  hasMusic: boolean
  sfxCount: number
  estimatedDurationSec: number
  isPlayable: boolean
  hasExistingAnimaticRender: boolean
  existingAnimaticUrl: string | null
  thumbnailUrl?: string
}

export interface BuildPreVisSceneRenderPlanOptions {
  resolution?: '720p' | '1080p' | '4K'
  fps?: number
  masterVolume?: number
  sceneProductionData?: SceneProductionData | null
  sceneTransitionIn?: BeatDirectionTransition
  audioMode?: AnimaticAudioMode
  clipAudioByBeatId?: Record<string, string>
  includeCaptions?: boolean
  tailHoldSec?: number
}

export interface PreVisSceneRenderPlan {
  sceneId: string
  sceneIndex: number
  sceneNumber: number
  heading: string
  language: string
  totalDuration: number
  segments: LocalRenderSegment[]
  audioClips: LocalRenderAudioClip[]
  textOverlays: LocalRenderTextOverlay[]
  config: LocalRenderConfig
  voiceClipCount: number
  hasMusic: boolean
  sfxCount: number
  frameCount: number
}

export interface MultiScenePreVisRenderPlan {
  language: string
  totalDuration: number
  config: LocalRenderConfig
  scenePlans: PreVisSceneRenderPlan[]
}

export interface RenderPreVisSceneOptions extends BuildPreVisSceneRenderPlanOptions {
  projectId?: string
  saveToStreams?: boolean
  dynamicDurations?: Record<string, number>
  onProgress?: (progress: LocalRenderProgress) => void
}

export interface RenderPreVisSceneOutput {
  sceneId: string
  sceneIndex: number
  sceneNumber: number
  language: string
  plan: PreVisSceneRenderPlan
  renderResult: LocalRenderResult
  uploadedUrl?: string
  stream?: ProductionStream
}

/**
 * Resolve the canonical scene ID used across Screening Room, Scene Production,
 * and Publishing (`scene.id || scene.sceneId || scene-${sceneIndex}`).
 */
export function resolvePreVisSceneId(
  scene: Record<string, unknown> | null | undefined,
  sceneIndex: number
): string {
  if (typeof scene?.id === 'string' && scene.id.trim().length > 0) {
    return scene.id.trim()
  }
  if (typeof scene?.sceneId === 'string' && scene.sceneId.trim().length > 0) {
    return scene.sceneId.trim()
  }
  return `scene-${sceneIndex}`
}

/**
 * Resolve a human-readable heading for a scene in the requested language.
 */
export function resolvePreVisSceneHeading(
  scene: Record<string, unknown> | null | undefined,
  sceneIndex: number,
  language = 'en'
): string {
  const sceneNumber =
    typeof scene?.sceneNumber === 'number' && Number.isFinite(scene.sceneNumber)
      ? scene.sceneNumber
      : sceneIndex + 1
  if (!scene) return `Scene ${sceneNumber}`

  const translations = scene.translations as Record<string, SceneTranslation> | undefined
  const translation = language !== 'en' ? translations?.[language] : undefined
  if (typeof translation?.heading === 'string' && translation.heading.trim().length > 0) {
    return translation.heading.trim()
  }

  const rawHeading = scene.heading
  if (typeof rawHeading === 'string' && rawHeading.trim().length > 0) {
    return rawHeading.trim()
  }
  if (
    rawHeading &&
    typeof rawHeading === 'object' &&
    'text' in rawHeading &&
    typeof (rawHeading as { text?: unknown }).text === 'string' &&
    (rawHeading as { text: string }).text.trim().length > 0
  ) {
    return (rawHeading as { text: string }).text.trim()
  }

  const display = resolvePreVisSceneDisplay(scene, sceneIndex, {
    language,
    sceneTranslation: translation,
  })
  if (display.titleLine && display.titleLine.trim().length > 0) {
    return display.titleLine.trim()
  }

  return `Scene ${sceneNumber}`
}

/**
 * Discover all languages that have playable audio or translations across scenes.
 * Always includes `'en'` first.
 */
export function collectPreVisLanguages(
  scenes: Array<Record<string, unknown>> | null | undefined,
  extraLanguages?: string[]
): string[] {
  const codes = new Set<string>(['en'])

  if (Array.isArray(extraLanguages)) {
    for (const lang of extraLanguages) {
      if (typeof lang === 'string' && lang.trim()) {
        codes.add(lang.trim())
      }
    }
  }

  if (Array.isArray(scenes)) {
    for (const scene of scenes) {
      if (!scene || typeof scene !== 'object') continue

      const narrationAudio = scene.narrationAudio as
        | Record<string, { url?: string } | undefined>
        | undefined
      if (narrationAudio && typeof narrationAudio === 'object') {
        for (const [lang, entry] of Object.entries(narrationAudio)) {
          if (lang && typeof entry?.url === 'string' && entry.url.trim()) {
            codes.add(lang.trim())
          }
        }
      }

      const dialogueAudio = scene.dialogueAudio as
        | Record<string, Array<{ audioUrl?: string; url?: string }> | undefined>
        | undefined
      if (dialogueAudio && typeof dialogueAudio === 'object' && !Array.isArray(dialogueAudio)) {
        for (const [lang, entries] of Object.entries(dialogueAudio)) {
          if (
            lang &&
            Array.isArray(entries) &&
            entries.some((item) => Boolean(item?.audioUrl?.trim() || item?.url?.trim()))
          ) {
            codes.add(lang.trim())
          }
        }
      }

      const translations = scene.translations as Record<string, unknown> | undefined
      if (translations && typeof translations === 'object') {
        for (const [lang, val] of Object.entries(translations)) {
          if (lang && val && typeof val === 'object') {
            codes.add(lang.trim())
          }
        }
      }
    }
  }

  const rest = Array.from(codes)
    .filter((code) => code !== 'en')
    .sort((a, b) => a.localeCompare(b))
  return ['en', ...rest]
}

/**
 * Collect every audio URL referenced by a scene for a given language so browser
 * metadata probing can measure exact clip durations before rendering.
 */
export function collectScenePreVisAudioUrls(
  scene: Record<string, unknown> | null | undefined,
  language: string,
  clipAudioByBeatId?: Record<string, string>
): string[] {
  if (!scene) return []
  const urls: string[] = []

  const narrationAudio = scene.narrationAudio as
    | Record<string, { url?: string } | undefined>
    | undefined
  const narrationUrl =
    narrationAudio?.[language]?.url ??
    narrationAudio?.en?.url ??
    (typeof scene.narrationAudioUrl === 'string' ? scene.narrationAudioUrl : undefined)
  if (narrationUrl?.trim()) {
    urls.push(narrationUrl.trim())
  }

  const dialogueAudioObj = scene.dialogueAudio as
    | Record<string, Array<{ audioUrl?: string; url?: string }> | undefined>
    | Array<{ audioUrl?: string; url?: string }>
    | undefined
  const dialogueList = Array.isArray(dialogueAudioObj)
    ? dialogueAudioObj
    : dialogueAudioObj?.[language] ?? dialogueAudioObj?.en ?? []
  if (Array.isArray(dialogueList)) {
    for (const entry of dialogueList) {
      const url = entry?.audioUrl || entry?.url
      if (typeof url === 'string' && url.trim()) {
        urls.push(url.trim())
      }
    }
  }

  for (const beat of getSceneBeats(scene)) {
    if (typeof beat.audioUrl === 'string' && beat.audioUrl.trim()) {
      urls.push(beat.audioUrl.trim())
    }
    if (typeof beat.sfxUrl === 'string' && beat.sfxUrl.trim()) {
      urls.push(beat.sfxUrl.trim())
    }
    if (typeof beat.sfxAudio?.url === 'string' && beat.sfxAudio.url.trim()) {
      urls.push(beat.sfxAudio.url.trim())
    }
  }

  for (const musicUrl of collectSceneMusicUrls(scene)) {
    if (musicUrl?.trim()) {
      urls.push(musicUrl.trim())
    }
  }

  const sfxArray = scene.sfxAudio
  if (Array.isArray(sfxArray)) {
    for (const sfx of sfxArray) {
      const url = typeof sfx === 'string' ? sfx : (sfx as { url?: string } | null)?.url
      if (typeof url === 'string' && url.trim()) {
        urls.push(url.trim())
      }
    }
  }

  if (clipAudioByBeatId) {
    for (const url of Object.values(clipAudioByBeatId)) {
      if (typeof url === 'string' && url.trim()) {
        urls.push(url.trim())
      }
    }
  }

  return Array.from(new Set(urls))
}

/**
 * Probe audio metadata durations in the browser using a bounded concurrency pool.
 * Safe in SSR/Node environments (returns `existingDurations` when `Audio` is unavailable).
 */
export async function probePreVisAudioDurations(
  urls: readonly string[],
  existingDurations?: Record<string, number>,
  isCancelled?: () => boolean
): Promise<Record<string, number>> {
  const result: Record<string, number> = { ...(existingDurations ?? {}) }
  if (typeof Audio === 'undefined' || urls.length === 0) {
    return result
  }

  const pendingUrls = Array.from(new Set(urls)).filter(
    (url) => Boolean(url?.trim()) && !(Number.isFinite(result[url]) && result[url] > 0)
  )
  if (pendingUrls.length === 0) {
    return result
  }

  await runBoundedPool(
    pendingUrls,
    AUDIO_PROBE_CONCURRENCY,
    async (url) => {
      if (isCancelled?.()) return
      try {
        const duration = await getAudioDuration(url)
        if (!isCancelled?.() && Number.isFinite(duration) && duration > 0) {
          result[url] = duration
        }
      } catch {
        // Keep authored fallback duration when metadata probe fails
      }
    },
    isCancelled
  )

  return result
}

function buildCaptionOverlayForFrame(
  frame: StoryboardVisualFrame,
  captionText: string,
  startTime: number,
  duration: number
): LocalRenderTextOverlay {
  const overlayType = frame.overlayType ?? defaultBeatOverlayType(undefined)
  const isTitle = overlayType === 'title'
  const isLowerThird = overlayType === 'lower_third'

  return {
    id: `previs-caption-${frame.clipId}-${Math.round(startTime * 1000)}`,
    text: captionText,
    position: {
      x: 50,
      y: isTitle ? 50 : isLowerThird ? 84 : 88,
      anchor: isTitle ? 'center' : 'bottom-center',
    },
    style: {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: isTitle ? 4.2 : 2.8,
      fontWeight: isTitle ? 700 : 600,
      color: '#FFFFFF',
      backgroundColor: '#000000',
      backgroundOpacity: isTitle ? 0.45 : 0.65,
      textShadow: true,
    },
    timing: {
      startTime,
      duration: Math.max(0.2, duration),
      fadeInMs: 180,
      fadeOutMs: 180,
    },
  }
}

/**
 * Build a complete, contiguous `LocalRenderConfig` for a single scene that matches
 * Screening Room Pre-Vis playback.
 */
export function buildPreVisSceneRenderPlan(
  scene: Record<string, unknown> | null | undefined,
  sceneIndex: number,
  language = 'en',
  dynamicDurations: Record<string, number> = {},
  options: BuildPreVisSceneRenderPlanOptions = {}
): PreVisSceneRenderPlan {
  const safeScene = scene ?? {}
  const sceneId = resolvePreVisSceneId(safeScene, sceneIndex)
  const sceneNumber =
    typeof safeScene.sceneNumber === 'number' && Number.isFinite(safeScene.sceneNumber)
      ? safeScene.sceneNumber
      : sceneIndex + 1
  const heading = resolvePreVisSceneHeading(safeScene, sceneIndex, language)
  const tailHoldSec =
    typeof options.tailHoldSec === 'number' && Number.isFinite(options.tailHoldSec)
      ? Math.max(0, options.tailHoldSec)
      : 1.5

  const hasBeats = Array.isArray(safeScene.beats) && safeScene.beats.length > 0
  const beatPlayback = hasBeats
    ? buildBeatFirstPlaybackTimeline(safeScene, language, dynamicDurations, {
        preVisAnimatic: true,
        sceneTransitionIn: options.sceneTransitionIn,
      })
    : null

  const voiceClips =
    beatPlayback?.voiceClips ?? buildStoryboardVoiceClips(safeScene, language, dynamicDurations)

  const rawVisualFrames: StoryboardVisualFrame[] =
    beatPlayback && beatPlayback.visualFrames.length > 0
      ? beatPlayback.visualFrames
      : buildStoryboardVisualTimeline(safeScene, voiceClips, {
          language,
          dynamicDurations,
          preVisAnimatic: true,
        })

  const fallbackImageUrl =
    getEstablishingFrameUrl(safeScene) ??
    getScenePlayableThumbnailUrl(safeScene) ??
    getScreeningPosterUrl(safeScene) ??
    rawVisualFrames.find((frame) => Boolean(frame.imageUrl?.trim()))?.imageUrl?.trim()

  const visualFrames: StoryboardVisualFrame[] =
    rawVisualFrames.length > 0
      ? rawVisualFrames
      : fallbackImageUrl
        ? [
            {
              clipId: `establishing-${sceneId}`,
              frameType: 'establishing',
              imageUrl: fallbackImageUrl,
              startTime: 0,
              duration:
                voiceClips.length > 0
                  ? Math.max(
                      3,
                      voiceClips[voiceClips.length - 1].startTime +
                        voiceClips[voiceClips.length - 1].duration
                    )
                  : 5,
              label: heading,
              isSceneStart: true,
              isSceneEnd: true,
            },
          ]
        : []

  const lastFrameEnd =
    visualFrames.length > 0
      ? visualFrames[visualFrames.length - 1].startTime +
        visualFrames[visualFrames.length - 1].duration
      : 0
  const lastVoiceEnd =
    voiceClips.length > 0
      ? voiceClips[voiceClips.length - 1].startTime +
        voiceClips[voiceClips.length - 1].duration
      : 0

  const totalDuration = Math.max(
    1,
    (Math.max(lastFrameEnd, lastVoiceEnd) || 5) + tailHoldSec
  )

  // Build contiguous visual segments from t=0 to totalDuration so LocalRenderService
  // sequential segment placement preserves exact sync with audioClips.
  const segments: LocalRenderSegment[] = []
  const textOverlays: LocalRenderTextOverlay[] = []
  const translations = safeScene.translations as Record<string, SceneTranslation> | undefined
  const sceneTranslation = language !== 'en' ? translations?.[language] : undefined
  const includeCaptions = options.includeCaptions ?? true

  let carryImageUrl = fallbackImageUrl
  for (let i = 0; i < visualFrames.length; i++) {
    const frame = visualFrames[i]
    const resolvedImageUrl = frame.imageUrl?.trim() || carryImageUrl || fallbackImageUrl
    if (!resolvedImageUrl) continue
    carryImageUrl = resolvedImageUrl

    const isFirst = segments.length === 0
    const isLast = i === visualFrames.length - 1
    const segStart = isFirst ? 0 : frame.startTime
    const nextStart = !isLast ? visualFrames[i + 1].startTime : totalDuration
    const segDuration = Math.max(0.1, nextStart - segStart)

    segments.push({
      segmentId: frame.clipId || `${sceneId}-seg-${i}`,
      videoUrl: resolvedImageUrl,
      endFrameUrl: frame.endImageUrl?.trim() || undefined,
      startTime: segStart,
      duration: segDuration,
      mediaType: 'image',
      kenBurns: frame.kenBurns,
      fadeInSec: frame.transitionIn === 'fade' ? frame.transitionInSec : undefined,
      fadeOutSec: frame.transitionOut === 'fade' ? frame.transitionOutSec : undefined,
    })

    if (includeCaptions) {
      const captionText = resolveBeatCaptionText(
        sceneTranslation,
        frame.beatId,
        frame.overlayText
      )
      if (captionText) {
        textOverlays.push(
          buildCaptionOverlayForFrame(frame, captionText, frame.startTime, frame.duration)
        )
      }
    }
  }

  // Compute effective track volumes matching Screening Room mixer settings
  const mixerVolumes = sceneMixerTrackVolumes(options.sceneProductionData, language)
  const masterVolume =
    typeof options.masterVolume === 'number' && Number.isFinite(options.masterVolume)
      ? clampUnitVolume(options.masterVolume, 0.8)
      : 0.8
  const dialogueGain = effectiveScreeningDialogueVolume({
    muted: false,
    master: masterVolume,
    trackVolume: mixerVolumes.dialogue,
  })
  const musicGain = effectiveScreeningTrackVolume({
    muted: false,
    master: masterVolume,
    trackVolume: mixerVolumes.music,
  })
  const sfxGain = effectiveScreeningTrackVolume({
    muted: false,
    master: masterVolume,
    trackVolume: mixerVolumes.sfx,
  })

  const voiceEndTime = lastVoiceEnd > 0 ? lastVoiceEnd : undefined
  const rawSfxClips = buildBeatAlignedStoryboardSfxClips(safeScene, visualFrames, {
    voiceEndTime,
    sceneDuration: totalDuration,
    dynamicDurations,
  })

  const mixed =
    options.audioMode === 'hifi'
      ? applyHifiClipAudio({
          voiceClips,
          sfxClips: rawSfxClips,
          visualFrames,
          beats: getSceneBeats(safeScene),
          clipAudioByBeatId: options.clipAudioByBeatId ?? {},
        })
      : { voiceClips, sfxClips: rawSfxClips }

  const audioClips: LocalRenderAudioClip[] = []

  for (const clip of mixed.voiceClips) {
    if (!clip.url?.trim()) continue
    audioClips.push({
      url: clip.url.trim(),
      startTime: Math.max(0, clip.startTime),
      duration: Math.max(0.1, clip.duration),
      volume: clampUnitVolume((clip.volume ?? 1) * dialogueGain, dialogueGain),
      type: 'dialogue',
    })
  }

  const musicFileDuration = resolveSceneMusicFileDuration(safeScene, dynamicDurations)
  const musicClips = buildStoryboardMusicClips(
    safeScene,
    visualFrames,
    totalDuration,
    musicFileDuration,
    dynamicDurations
  )
  for (const clip of musicClips) {
    if (!clip.url?.trim()) continue
    audioClips.push({
      url: clip.url.trim(),
      startTime: Math.max(0, clip.startTime),
      duration: Math.max(0.1, clip.duration),
      trimStart: clip.trimStart,
      volume: clampUnitVolume((clip.volume ?? 1) * musicGain, musicGain),
      type: 'music',
      loop: clip.loop,
      fadeInSec: clip.fadeInSec,
      fadeOutSec: clip.fadeOutSec,
    })
  }

  for (const clip of mixed.sfxClips) {
    if (!clip.url?.trim()) continue
    audioClips.push({
      url: clip.url.trim(),
      startTime: Math.max(0, clip.startTime),
      duration: Math.max(0.1, clip.duration),
      volume: clampUnitVolume((clip.volume ?? 1) * sfxGain, sfxGain),
      type: 'sfx',
      fadeInSec: clip.fadeInSec,
      fadeOutSec: clip.fadeOutSec,
    })
  }

  const config: LocalRenderConfig = {
    segments,
    audioClips,
    textOverlays: textOverlays.length > 0 ? textOverlays : undefined,
    resolution: options.resolution ?? '1080p',
    fps: options.fps ?? 30,
    totalDuration,
  }

  return {
    sceneId,
    sceneIndex,
    sceneNumber,
    heading,
    language,
    totalDuration,
    segments,
    audioClips,
    textOverlays,
    config,
    voiceClipCount: mixed.voiceClips.filter((c) => Boolean(c.url?.trim())).length,
    hasMusic: musicClips.length > 0,
    sfxCount: mixed.sfxClips.filter((c) => Boolean(c.url?.trim())).length,
    frameCount: segments.length,
  }
}

/**
 * Summarize a scene's Pre-Vis readiness and existing animatic render status for
 * display in `PreVisRenderDialog`.
 */
export function getPreVisSceneSummary(
  scene: Record<string, unknown> | null | undefined,
  sceneIndex: number,
  language = 'en',
  sceneProductionData?: SceneProductionData | null,
  dynamicDurations?: Record<string, number>
): PreVisSceneSummary {
  const safeScene = scene ?? {}
  const sceneId = resolvePreVisSceneId(safeScene, sceneIndex)
  const plan = buildPreVisSceneRenderPlan(safeScene, sceneIndex, language, dynamicDurations, {
    sceneProductionData,
  })

  const stateMap: Record<string, unknown> = sceneProductionData
    ? { [sceneId]: sceneProductionData }
    : {}
  const existingAnimaticUrl = resolveSceneStreamUrl(stateMap, sceneId, {
    format: 'animatic',
    language,
  }).url

  const hasAudio =
    plan.voiceClipCount > 0 ||
    plan.hasMusic ||
    plan.sfxCount > 0 ||
    sceneHasPlayablePreVisAudio(safeScene, language)

  const thumbnailUrl =
    getScenePlayableThumbnailUrl(safeScene) ??
    getEstablishingFrameUrl(safeScene) ??
    getScreeningPosterUrl(safeScene) ??
    plan.segments[0]?.videoUrl

  return {
    sceneId,
    sceneIndex,
    sceneNumber: plan.sceneNumber,
    heading: plan.heading,
    isPromo: isPromoCinematicScene(safeScene),
    frameCount: plan.frameCount,
    voiceClipCount: plan.voiceClipCount,
    hasMusic: plan.hasMusic,
    sfxCount: plan.sfxCount,
    estimatedDurationSec: plan.totalDuration,
    isPlayable: plan.frameCount > 0 && (hasAudio || plan.frameCount > 0),
    hasExistingAnimaticRender: Boolean(existingAnimaticUrl),
    existingAnimaticUrl: existingAnimaticUrl ?? null,
    thumbnailUrl,
  }
}

/**
 * Combine multiple scenes into a single contiguous Pre-Vis render plan so users
 * can export a stitched multi-scene or full-project Pre-Vis MP4 in one pass.
 */
export function buildMultiScenePreVisRenderPlan(
  scenesWithIndices: ReadonlyArray<{
    scene: Record<string, unknown>
    sceneIndex: number
    sceneProductionData?: SceneProductionData | null
  }>,
  language = 'en',
  dynamicDurations: Record<string, number> = {},
  options: Omit<BuildPreVisSceneRenderPlanOptions, 'sceneProductionData' | 'sceneTransitionIn'> = {}
): MultiScenePreVisRenderPlan {
  const scenePlans: PreVisSceneRenderPlan[] = []
  const combinedSegments: LocalRenderSegment[] = []
  const combinedAudioClips: LocalRenderAudioClip[] = []
  const combinedTextOverlays: LocalRenderTextOverlay[] = []

  let cumulativeOffset = 0
  let prevTransitionToNext: BeatDirectionTransition | undefined

  for (const item of scenesWithIndices) {
    const plan = buildPreVisSceneRenderPlan(
      item.scene,
      item.sceneIndex,
      language,
      dynamicDurations,
      {
        ...options,
        sceneProductionData: item.sceneProductionData,
        sceneTransitionIn: prevTransitionToNext,
      }
    )
    prevTransitionToNext = item.scene?.transitionToNext as BeatDirectionTransition | undefined
    if (plan.segments.length === 0) continue

    scenePlans.push(plan)

    for (const seg of plan.segments) {
      combinedSegments.push({
        ...seg,
        segmentId: `${plan.sceneId}-${seg.segmentId}`,
        startTime: seg.startTime + cumulativeOffset,
      })
    }

    for (const clip of plan.audioClips) {
      combinedAudioClips.push({
        ...clip,
        startTime: clip.startTime + cumulativeOffset,
      })
    }

    for (const overlay of plan.textOverlays) {
      combinedTextOverlays.push({
        ...overlay,
        id: `${plan.sceneId}-${overlay.id}`,
        timing: {
          ...overlay.timing,
          startTime: overlay.timing.startTime + cumulativeOffset,
        },
      })
    }

    cumulativeOffset += plan.totalDuration
  }

  const totalDuration = Math.max(1, cumulativeOffset)
  return {
    language,
    totalDuration,
    scenePlans,
    config: {
      segments: combinedSegments,
      audioClips: combinedAudioClips,
      textOverlays: combinedTextOverlays.length > 0 ? combinedTextOverlays : undefined,
      resolution: options.resolution ?? '1080p',
      fps: options.fps ?? 30,
      totalDuration,
    },
  }
}

/**
 * Render a single scene's Pre-Vis timeline to MP4 in the browser and optionally
 * upload to Vercel Blob + persist as an `animatic` `ProductionStream`.
 */
export async function renderPreVisSceneToBlobAndStream(
  scene: Record<string, unknown>,
  sceneIndex: number,
  language: string,
  options: RenderPreVisSceneOptions = {}
): Promise<RenderPreVisSceneOutput> {
  const {
    projectId,
    saveToStreams = true,
    dynamicDurations = {},
    onProgress,
    ...planOptions
  } = options

  const plan = buildPreVisSceneRenderPlan(
    scene,
    sceneIndex,
    language,
    dynamicDurations,
    planOptions
  )

  if (plan.segments.length === 0) {
    throw new Error(
      `Scene ${plan.sceneNumber} (${plan.heading}) has no storyboard frames to render.`
    )
  }

  const renderResult = await localRenderService.render(plan.config, (progress) => {
    if (!onProgress) return
    // Scale render progress to 0..88% when uploading to streams after encoding
    const scale = saveToStreams && projectId ? 0.88 : 1
    onProgress({
      ...progress,
      progress: Math.round(progress.progress * scale),
    })
  })

  let uploadedUrl: string | undefined
  let stream: ProductionStream | undefined

  if (saveToStreams && projectId) {
    onProgress?.({
      phase: 'encoding',
      progress: 92,
      currentFrame: Math.ceil(plan.totalDuration * (plan.config.fps ?? 30)),
      totalFrames: Math.ceil(plan.totalDuration * (plan.config.fps ?? 30)),
      message: `Uploading Scene ${plan.sceneNumber} Pre-Vis MP4 to cloud storage...`,
    })

    const ext = renderResult.mimeType.includes('mp4') ? 'mp4' : 'webm'
    const safeSceneId = plan.sceneId.replace(/[^a-zA-Z0-9_-]/g, '-')
    const pathname = `renders/previs/${projectId}/${safeSceneId}-${language}-${Date.now()}.${ext}`

    const file = new File([renderResult.blob], `${safeSceneId}-${language}.${ext}`, {
      type: renderResult.mimeType || 'video/mp4',
    })

    const uploadedBlob = await upload(pathname, file, {
      access: 'public',
      handleUploadUrl: '/api/segments/upload-video-url',
    })

    uploadedUrl = uploadedBlob.url
    stream = {
      id: `previs-animatic-${safeSceneId}-${language}-${Date.now()}`,
      language,
      languageLabel: getLanguageName(language),
      status: 'complete',
      streamType: 'animatic',
      mp4Url: uploadedUrl,
      completedAt: new Date().toISOString(),
      source: 'render',
      duration: plan.totalDuration,
      resolution: planOptions.resolution ?? '1080p',
    }

    dispatchAppendedSceneRender(plan.sceneId, stream)
    await appendSceneRenderClient(projectId, plan.sceneId, stream)

    onProgress?.({
      phase: 'complete',
      progress: 100,
      currentFrame: Math.ceil(plan.totalDuration * (plan.config.fps ?? 30)),
      totalFrames: Math.ceil(plan.totalDuration * (plan.config.fps ?? 30)),
      message: `Scene ${plan.sceneNumber} Pre-Vis saved to project streams!`,
    })
  }

  return {
    sceneId: plan.sceneId,
    sceneIndex,
    sceneNumber: plan.sceneNumber,
    language,
    plan,
    renderResult,
    uploadedUrl,
    stream,
  }
}
