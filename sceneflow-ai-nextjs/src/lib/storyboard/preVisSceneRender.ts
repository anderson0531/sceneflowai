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
import { stitchFinalCutClips } from '@/lib/streams/stitchFinalCutMaster'
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
import type { ProductionLanguage } from '@/lib/types/finalCut'
import { applyHifiClipAudio, type AnimaticAudioMode } from '@/lib/storyboard/animaticAudioMode'
import { synthesizeGalleryKenBurnsSettings } from '@/lib/storyboard/kenBurnsFrame'
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
  CROSSFADE_DURATION_MS,
  DEFAULT_GALLERY_IMAGE_EFFECT_PREFS,
  getImageObjectFit,
  type GalleryImageEffectPrefs,
} from '@/lib/storyboard/storyboardImageEffects'
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
  getLocalRenderService,
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
  /**
   * Still-image camera motion preferences matching Screening Room `GalleryImageEffectPrefs`.
   * Defaults to `{ mode: 'kenBurns', kenBurnsIntensity: 'medium' }` so Pre-Vis renders
   * include Ken Burns camera motion by default.
   */
  imageEffectPrefs?: GalleryImageEffectPrefs
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

/** Max duration (1 hour) allowed when falling back to local multi-scene Pre-Vis rendering. */
export const PREVIS_MULTI_SCENE_MAX_DURATION_SEC = 3600

export interface StitchablePreVisSceneClip {
  sceneId: string
  sceneIndex: number
  sceneNumber: number
  duration: number
  uploadedUrl?: string
  blob?: Blob
  mimeType?: string
}

export interface StitchPreVisScenesOptions {
  projectId?: string
  projectTitle?: string
  language: string
  resolution?: '720p' | '1080p' | '4K'
  /** Optional local multi-scene plan used only if both server stitchers are unavailable. */
  fallbackMultiPlan?: MultiScenePreVisRenderPlan
  isCancelled?: () => boolean
  onProgress?: (progress: { progress: number; message: string }) => void
}

export interface StitchPreVisScenesResult {
  /** Browser-downloadable URL (preferring same-origin `blob:` URL so custom filenames work). */
  downloadUrl: string
  /** True when `downloadUrl` is a newly created `blob:` URL that should be revoked on unmount. */
  isObjectUrl: boolean
  /** Public cloud URL when stitched via server/cloud storage. */
  cloudUrl?: string
  mimeType: string
  totalDuration: number
  sceneCount: number
  strategy: 'server-ffmpeg' | 'cloud-run' | 'local-render'
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
    const rawBeat = beat as unknown as {
      audioUrl?: string
      sfxUrl?: string
      sfxAudio?: { url?: string }
    }
    if (typeof rawBeat.audioUrl === 'string' && rawBeat.audioUrl.trim()) {
      urls.push(rawBeat.audioUrl.trim())
    }
    if (typeof rawBeat.sfxUrl === 'string' && rawBeat.sfxUrl.trim()) {
      urls.push(rawBeat.sfxUrl.trim())
    }
    if (typeof rawBeat.sfxAudio?.url === 'string' && rawBeat.sfxAudio.url.trim()) {
      urls.push(rawBeat.sfxAudio.url.trim())
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
  const effectiveImagePrefs = options.imageEffectPrefs ?? DEFAULT_GALLERY_IMAGE_EFFECT_PREFS

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
    const directionIndex = Math.max(0, sceneIndex) * 7 + i
    const segmentKenBurns = frame.kenBurns?.enabled
      ? frame.kenBurns
      : synthesizeGalleryKenBurnsSettings({
          mode: effectiveImagePrefs.mode,
          intensity: effectiveImagePrefs.kenBurnsIntensity,
          directionIndex,
        })
    const dissolveInSec =
      frame.transitionIn === 'dissolve'
        ? frame.transitionInSec && frame.transitionInSec > 0
          ? frame.transitionInSec
          : CROSSFADE_DURATION_MS / 1000
        : !isFirst &&
            frame.transitionIn !== 'fade' &&
            effectiveImagePrefs.mode === 'crossfade'
          ? CROSSFADE_DURATION_MS / 1000
          : undefined

    segments.push({
      segmentId: frame.clipId || `${sceneId}-seg-${i}`,
      assetUrl: resolvedImageUrl,
      assetType: 'image',
      endFrameUrl: frame.endImageUrl?.trim() || undefined,
      startTime: segStart,
      duration: segDuration,
      kenBurns: segmentKenBurns,
      fadeInSec: frame.transitionIn === 'fade' ? frame.transitionInSec : undefined,
      fadeOutSec: frame.transitionOut === 'fade' ? frame.transitionOutSec : undefined,
      ...(dissolveInSec ? { dissolveInSec } : {}),
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
    const clipVol = (clip as { volume?: number }).volume
    audioClips.push({
      url: clip.url.trim(),
      startTime: Math.max(0, clip.startTime),
      duration: Math.max(0.1, clip.duration),
      volume: clampUnitVolume((clipVol ?? 1) * dialogueGain, dialogueGain),
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
    const sfxExtras = clip as {
      volume?: number
      fadeInSec?: number
      fadeOutSec?: number
    }
    audioClips.push({
      url: clip.url.trim(),
      startTime: Math.max(0, clip.startTime),
      duration: Math.max(0.1, clip.duration),
      volume: clampUnitVolume((sfxExtras.volume ?? 1) * sfxGain, sfxGain),
      type: 'sfx',
      fadeInSec: sfxExtras.fadeInSec,
      fadeOutSec: sfxExtras.fadeOutSec,
    })
  }

  const frameFit = getImageObjectFit(effectiveImagePrefs.mode)
  const config: LocalRenderConfig = {
    segments,
    audioClips,
    textOverlays: textOverlays.length > 0 ? textOverlays : undefined,
    resolution: options.resolution ?? '1080p',
    fps: options.fps ?? 30,
    totalDuration,
    exportFormat: 'mp4',
    ensureAudioTrack: true,
    trustSegmentDurations: true,
    ...(frameFit === 'contain' ? { frameFit } : {}),
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
    language: language as ProductionLanguage,
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
    plan.segments[0]?.assetUrl

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

  const effectiveImagePrefs = options.imageEffectPrefs ?? DEFAULT_GALLERY_IMAGE_EFFECT_PREFS
  const frameFit = getImageObjectFit(effectiveImagePrefs.mode)
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
      exportFormat: 'mp4',
      ensureAudioTrack: true,
      trustSegmentDurations: true,
      maxDurationSec: PREVIS_MULTI_SCENE_MAX_DURATION_SEC,
      ...(frameFit === 'contain' ? { frameFit } : {}),
    },
  }
}

async function verifyRenderedBlobHasVisualTrack(
  blobUrl: string
): Promise<'ok' | 'missing-video' | 'unverifiable'> {
  if (
    typeof document === 'undefined' ||
    typeof document.createElement !== 'function' ||
    (typeof navigator !== 'undefined' && /jsdom|happy-dom/i.test(navigator.userAgent || ''))
  ) {
    return 'unverifiable'
  }

  return new Promise((resolve) => {
    let settled = false
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.muted = true
    video.playsInline = true

    const finish = (status: 'ok' | 'missing-video' | 'unverifiable') => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      video.onloadedmetadata = null
      video.onerror = null
      try {
        video.removeAttribute('src')
        video.load()
      } catch {
        // Ignore cleanup errors
      }
      resolve(status)
    }

    const timer = setTimeout(() => finish('unverifiable'), 1500)

    video.onloadedmetadata = () => {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        finish('ok')
      } else {
        finish('missing-video')
      }
    }

    video.onerror = () => {
      finish('unverifiable')
    }

    try {
      video.src = blobUrl
    } catch {
      finish('unverifiable')
    }
  })
}

export interface UploadPreVisSceneOutputParams {
  projectId: string
  sceneId: string
  sceneNumber: number
  language: string
  blob: Blob
  mimeType: string
  totalDuration: number
  resolution?: '720p' | '1080p' | '4K'
  fps?: number
  onProgress?: (progress: LocalRenderProgress) => void
  persistStream?: (
    projectId: string,
    sceneId: string,
    stream: ProductionStream
  ) => Promise<unknown>
}

/**
 * Upload a rendered Pre-Vis scene blob to Vercel Blob and persist its `animatic`
 * `ProductionStream`. Exported so batch dialogs can pipeline cloud uploads in the
 * background while `LocalRenderService` immediately begins rendering the next scene.
 */
export async function uploadAndPersistPreVisSceneOutput(
  params: UploadPreVisSceneOutputParams
): Promise<{ uploadedUrl: string; stream: ProductionStream }> {
  const {
    projectId,
    sceneId,
    sceneNumber,
    language,
    blob,
    mimeType,
    totalDuration,
    resolution = '1080p',
    fps = 30,
    onProgress,
    persistStream = appendSceneRenderClient,
  } = params

  const totalFrames = Math.ceil(totalDuration * fps)
  onProgress?.({
    phase: 'encoding',
    progress: 92,
    currentFrame: totalFrames,
    totalFrames,
    message: `Uploading Scene ${sceneNumber} Pre-Vis MP4 to cloud storage...`,
  })

  const ext = mimeType.includes('mp4') ? 'mp4' : 'webm'
  const safeSceneId = sceneId.replace(/[^a-zA-Z0-9_-]/g, '-')
  const pathname = `renders/previs/${projectId}/${safeSceneId}-${language}-${Date.now()}.${ext}`

  const file = new File([blob], `${safeSceneId}-${language}.${ext}`, {
    type: mimeType,
  })

  const uploadedBlob = await upload(pathname, file, {
    access: 'public',
    handleUploadUrl: '/api/segments/upload-video-url',
  })

  const uploadedUrl = uploadedBlob.url
  const stream: ProductionStream = {
    id: `previs-animatic-${safeSceneId}-${language}-${Date.now()}`,
    language,
    languageLabel: getLanguageName(language),
    status: 'complete',
    streamType: 'animatic',
    mp4Url: uploadedUrl,
    completedAt: new Date().toISOString(),
    source: 'render',
    duration: totalDuration,
    resolution,
  }

  dispatchAppendedSceneRender(sceneId, stream)
  await persistStream(projectId, sceneId, stream)

  onProgress?.({
    phase: 'complete',
    progress: 100,
    currentFrame: totalFrames,
    totalFrames,
    message: `Scene ${sceneNumber} Pre-Vis saved to project streams!`,
  })

  return { uploadedUrl, stream }
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

  const renderService = getLocalRenderService()
  const scale = saveToStreams && projectId ? 0.88 : 1
  let renderResult = await renderService.render(plan.config, (progress) => {
    if (!onProgress) return
    onProgress({
      ...progress,
      progress: Math.round(progress.progress * scale),
    })
  })

  // If the browser's hardware H.264 MediaRecorder dropped the visual track (audio-only MP4),
  // automatically re-encode this scene using software WebM (VP8/VP9) so no scene loses video.
  if (renderResult.success && renderResult.blobUrl && plan.config.exportFormat !== 'webm') {
    const visualStatus = await verifyRenderedBlobHasVisualTrack(renderResult.blobUrl)
    if (visualStatus === 'missing-video') {
      console.warn(
        `[PreVisSceneRender] Scene ${plan.sceneNumber} MP4 output had no visual video track; retrying with WebM software encoder`
      )
      try {
        URL.revokeObjectURL(renderResult.blobUrl)
      } catch {
        // Ignore
      }
      renderResult = await renderService.render(
        { ...plan.config, exportFormat: 'webm' },
        (progress) => {
          if (!onProgress) return
          onProgress({
            ...progress,
            progress: Math.round(progress.progress * scale),
          })
        }
      )
    }
  }

  if (!renderResult.success || !renderResult.blob || !renderResult.blobUrl) {
    throw new Error(renderResult.error || `Failed to render Scene ${plan.sceneNumber} Pre-Vis.`)
  }

  const resolvedMimeType = renderResult.mimeType || 'video/mp4'
  let uploadedUrl: string | undefined
  let stream: ProductionStream | undefined

  if (saveToStreams && projectId) {
    const persisted = await uploadAndPersistPreVisSceneOutput({
      projectId,
      sceneId: plan.sceneId,
      sceneNumber: plan.sceneNumber,
      language,
      blob: renderResult.blob,
      mimeType: resolvedMimeType,
      totalDuration: plan.totalDuration,
      resolution: planOptions.resolution ?? '1080p',
      fps: plan.config.fps ?? 30,
      onProgress,
    })
    uploadedUrl = persisted.uploadedUrl
    stream = persisted.stream
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

async function materializeDownloadableResult(
  cloudUrl: string,
  serverDownloadUrl: string | undefined,
  fallbackMimeType: string,
  onProgress?: (progress: { progress: number; message: string }) => void
): Promise<{ downloadUrl: string; isObjectUrl: boolean; mimeType: string }> {
  if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
    try {
      onProgress?.({
        progress: 88,
        message: 'Preparing combined Pre-Vis video for download...',
      })
      const response = await fetch(cloudUrl)
      if (response.ok) {
        const blob = await response.blob()
        if (blob.size > 0) {
          const mimeType = blob.type || fallbackMimeType
          return {
            downloadUrl: URL.createObjectURL(blob),
            isObjectUrl: true,
            mimeType,
          }
        }
      }
    } catch (fetchErr) {
      console.warn(
        '[stitchPreVisSceneOutputs] Could not materialize local blob URL, falling back to cloud download URL:',
        fetchErr
      )
    }
  }

  return {
    downloadUrl: serverDownloadUrl || cloudUrl,
    isObjectUrl: false,
    mimeType: fallbackMimeType,
  }
}

/**
 * Stitch already-rendered per-scene Pre-Vis clips into one continuous video without
 * re-rendering every scene on Canvas or hitting the 300-second browser render cap.
 *
 * Tier 1: Server-side lossless FFmpeg concat (`/api/export/previs-stitch`) — completes in seconds.
 * Tier 2: Cloud Run FFmpeg stitch (`stitchFinalCutClips` / `/api/publish/stream/render`).
 * Tier 3: Local browser composition fallback (`maxDurationSec: 3600`).
 */
export async function stitchPreVisSceneOutputs(
  clips: readonly StitchablePreVisSceneClip[],
  options: StitchPreVisScenesOptions
): Promise<StitchPreVisScenesResult> {
  if (clips.length < 2) {
    throw new Error('At least 2 rendered scenes are required to stitch a combined Pre-Vis video.')
  }

  const orderedClips = [...clips].sort((a, b) => a.sceneIndex - b.sceneIndex)
  const totalDuration = orderedClips.reduce(
    (sum, clip) => sum + (Number.isFinite(clip.duration) && clip.duration > 0 ? clip.duration : 0),
    0
  )

  const resolvedUrls: Array<string | undefined> = orderedClips.map((c) => c.uploadedUrl?.trim() || undefined)
  const missingUploadIndices = orderedClips
    .map((clip, idx) => (!resolvedUrls[idx] && clip.blob ? idx : -1))
    .filter((idx) => idx >= 0)

  // If the user unchecked "Save to Scene & Publishing Streams", upload temporary blobs
  // for server stitching without mutating project streams.
  if (missingUploadIndices.length > 0) {
    const safeProject = (options.projectId || 'local').replace(/[^a-zA-Z0-9_-]/g, '-')
    let uploadedTempCount = 0
    try {
      await runBoundedPool(
        missingUploadIndices,
        3,
        async (clipIdx) => {
          if (options.isCancelled?.()) return
          const clip = orderedClips[clipIdx]
          if (!clip?.blob) return
          const mime = clip.mimeType || clip.blob.type || 'video/mp4'
          const ext = mime.includes('mp4') ? 'mp4' : 'webm'
          const safeScene = clip.sceneId.replace(/[^a-zA-Z0-9_-]/g, '-')
          const pathname = `renders/previs-temp/${safeProject}/${safeScene}-${options.language}-${Date.now()}.${ext}`
          const file = new File([clip.blob], `${safeScene}-${options.language}.${ext}`, {
            type: mime,
          })
          const uploadedBlob = await upload(pathname, file, {
            access: 'public',
            handleUploadUrl: '/api/segments/upload-video-url',
          })
          resolvedUrls[clipIdx] = uploadedBlob.url
          uploadedTempCount += 1
          const pct = Math.min(30, 5 + Math.round((uploadedTempCount / missingUploadIndices.length) * 25))
          options.onProgress?.({
            progress: pct,
            message: `Uploading temporary clip ${uploadedTempCount} of ${missingUploadIndices.length} for stitching...`,
          })
        },
        options.isCancelled
      )
    } catch (tempUploadErr) {
      console.warn('[stitchPreVisSceneOutputs] Temporary blob upload failed:', tempUploadErr)
    }
  }

  if (options.isCancelled?.()) {
    throw new Error('Render aborted')
  }

  const allPublicUrls = resolvedUrls.filter((u): u is string => Boolean(u))
  let serverStitchError: string | undefined

  // Tier 1: Normalized server FFmpeg stitch (handles MP4/WebM, stream-index swaps, and avcC normalization)
  if (allPublicUrls.length === orderedClips.length) {
    try {
      options.onProgress?.({
        progress: 35,
        message: `Stitching ${orderedClips.length} scenes into combined Pre-Vis video...`,
      })

      const response = await fetch('/api/export/previs-stitch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          urls: allPublicUrls,
          projectId: options.projectId,
          language: options.language,
          container: 'mp4',
          durations: orderedClips.map((c) => c.duration),
          resolution: options.resolution,
        }),
      })

      const payload = (await response.json().catch(() => ({}))) as {
        success?: boolean
        url?: string
        downloadUrl?: string
        mimeType?: string
        error?: string
      }

      if (!response.ok || !payload.url) {
        throw new Error(payload.error || `Server Pre-Vis stitch failed (${response.status})`)
      }

      if (options.isCancelled?.()) {
        throw new Error('Render aborted')
      }

      const fallbackMime = payload.mimeType || 'video/mp4'
      const materialized = await materializeDownloadableResult(
        payload.url,
        payload.downloadUrl,
        fallbackMime,
        options.onProgress
      )

      options.onProgress?.({
        progress: 100,
        message: `Combined ${orderedClips.length} scenes`,
      })

      return {
        downloadUrl: materialized.downloadUrl,
        isObjectUrl: materialized.isObjectUrl,
        cloudUrl: payload.url,
        mimeType: materialized.mimeType,
        totalDuration,
        sceneCount: orderedClips.length,
        strategy: 'server-ffmpeg',
      }
    } catch (tier1Err) {
      if (options.isCancelled?.()) throw tier1Err
      serverStitchError =
        tier1Err instanceof Error ? tier1Err.message : 'Server Pre-Vis stitch failed'
      console.warn('[stitchPreVisSceneOutputs] Tier 1 server stitch failed:', serverStitchError)
    }
  }

  const inputClipMissingVideo = Boolean(
    serverStitchError && serverStitchError.includes('missing visual video stream')
  )

  // Tier 2: Cloud Run FFmpeg stitch fallback (forced onto Cloud Run so browser `<video>` seeking
  // is never used on unindexed MediaRecorder fragmented MP4 / WebM clips; skipped if an input
  // clip itself lacks a video track so Tier 3 can re-render from storyboard stills).
  if (options.projectId && allPublicUrls.length === orderedClips.length && !inputClipMissingVideo) {
    try {
      options.onProgress?.({
        progress: 45,
        message: `Cloud stitching ${orderedClips.length} scenes...`,
      })

      let clipCursor = 0
      const finalCutClips = orderedClips.map((clip, idx) => {
        const dur = Math.max(1, clip.duration)
        const startTime = clipCursor
        const endTime = startTime + dur
        clipCursor = endTime
        return {
          sceneId: clip.sceneId,
          sceneNumber: clip.sceneNumber,
          startTime,
          endTime,
          duration: dur,
          url: allPublicUrls[idx],
          streamType: 'animatic' as const,
          language: options.language as ProductionLanguage,
          availableVersions: [],
          status: 'ready' as const,
        }
      })

      const cloudUrl = await stitchFinalCutClips({
        projectId: options.projectId,
        filenameLabel: `${options.projectTitle || 'previs'}-${options.language}`,
        resolution: options.resolution ?? '1080p',
        clips: finalCutClips,
        forceCloudRun: true,
        onProgress: (msg) => {
          options.onProgress?.({
            progress: 65,
            message: msg,
          })
        },
      })

      if (options.isCancelled?.()) {
        throw new Error('Render aborted')
      }

      const fallbackMime = cloudUrl.toLowerCase().includes('.webm') ? 'video/webm' : 'video/mp4'
      const materialized = await materializeDownloadableResult(
        cloudUrl,
        undefined,
        fallbackMime,
        options.onProgress
      )

      options.onProgress?.({
        progress: 100,
        message: `Combined ${orderedClips.length} scenes`,
      })

      return {
        downloadUrl: materialized.downloadUrl,
        isObjectUrl: materialized.isObjectUrl,
        cloudUrl,
        mimeType: materialized.mimeType,
        totalDuration,
        sceneCount: orderedClips.length,
        strategy: 'cloud-run',
      }
    } catch (tier2Err) {
      if (options.isCancelled?.()) throw tier2Err
      console.warn('[stitchPreVisSceneOutputs] Tier 2 cloud stitch failed:', tier2Err)
    }
  }

  // Tier 3: Local browser render fallback (uses maxDurationSec: 3600 so >300s timelines work)
  if (options.fallbackMultiPlan) {
    const fallbackPlan: MultiScenePreVisRenderPlan = {
      ...options.fallbackMultiPlan,
      config: {
        ...options.fallbackMultiPlan.config,
        ensureAudioTrack: true,
        maxDurationSec: Math.max(
          PREVIS_MULTI_SCENE_MAX_DURATION_SEC,
          Math.ceil(options.fallbackMultiPlan.totalDuration) + 60
        ),
      },
    }

    const combinedResult = await getLocalRenderService().render(fallbackPlan.config, (prog) => {
      options.onProgress?.({
        progress: prog.progress,
        message: prog.message || `Rendering combined Pre-Vis locally (${prog.progress}%)...`,
      })
    })

    if (!combinedResult.success || !combinedResult.blobUrl) {
      throw new Error(
        combinedResult.error ||
          serverStitchError ||
          'Failed to stitch combined Pre-Vis video'
      )
    }

    return {
      downloadUrl: combinedResult.blobUrl,
      isObjectUrl: true,
      mimeType: combinedResult.mimeType || 'video/mp4',
      totalDuration: fallbackPlan.totalDuration,
      sceneCount: fallbackPlan.scenePlans.length,
      strategy: 'local-render',
    }
  }

  throw new Error(serverStitchError || 'Failed to stitch combined Pre-Vis video')
}
