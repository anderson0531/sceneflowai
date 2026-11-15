/**
 * Shot-aligned Narration Cue projection & elastic pacing for the Production Mixer.
 *
 * Parallel to `mixerScoreMusic.ts` (`resolveMixerMusicClips`), this module maps
 * `SceneNarrationCue[]` (`beatStart..beatEnd`) onto the Mixer's active segments
 * (matched by `beatId` so reorders/exclusions stay aligned), computes elastic
 * Intro Freeze / Slow-Mo / Close Freeze adjustments per shot, and builds unified
 * speech-ducking windows across both Dialogue (`A1`) and Narration (`A2`).
 *
 * Pure client-safe TypeScript — zero server-only imports.
 */

import type {
  AudioTrackConfig,
  MixerLanguageShotConfig,
  MixerNarrationCueConfig,
  MixerSegmentAudioConfig,
  SceneSegment,
  ShotHoldStyle,
  ShotPreHoldStyle,
} from '@/components/vision/scene-production/types'
import { clampVideoPlaybackRate } from '@/lib/scene/languageShotLocalize'
import type { SpeechDuckWindow } from '@/lib/scene/mixerScoreMusic'
import { getVisualBaseDuration, MIXER_MIN_SEGMENT_VISUAL_SEC } from '@/lib/scene/mixerTiming'
import { getSceneBeats } from '@/lib/script/beatMigration'
import {
  estimateNarrationWordsDurationSec,
  formatNarrationCueRange,
  getSceneNarrationCues,
} from '@/lib/script/sceneNarrationCues'
import type { NarrationAlignmentMode, SceneNarrationCue } from '@/lib/script/segmentTypes'

export interface MixerNarrationClip {
  id: string
  cueId: string
  url: string
  startTime: number
  duration: number
  volume: number
  label: string
  speakerLabel: string
  speakerType: 'narrator' | 'character'
  characterId?: string
  text: string
  beatStart: number
  beatEnd: number
  coveredSegmentIds: string[]
  spanStartSec: number
  spanEndSec: number
  alignmentMode: NarrationAlignmentMode
  overrunSec: number
}

export interface NarrationShotAdjustment {
  addedPreHoldSec: number
  suggestedPreHoldStyle?: ShotPreHoldStyle
  effectiveVideoPlaybackRate: number
  addedPostHoldSec: number
  suggestedHoldStyle?: ShotHoldStyle
  drivenByCueId?: string
}

/**
 * Resolve manual (non-elastic) picture playback speed for a shot across ALL languages.
 * Explicit `segmentAudioConfigs[id].videoPlaybackRate` takes precedence, falling back
 * to `languageShotConfigs[id].videoPlaybackRate` and finally `1.0`.
 */
export function resolveUnifiedManualVideoRate(
  segmentId: string,
  segmentAudioConfigs?: Record<string, Partial<MixerSegmentAudioConfig>>,
  languageShotConfigs?: Record<string, MixerLanguageShotConfig>
): number {
  const segRate = segmentAudioConfigs?.[segmentId]?.videoPlaybackRate
  if (typeof segRate === 'number' && Number.isFinite(segRate) && segRate > 0) {
    return clampVideoPlaybackRate(segRate)
  }
  const langRate = languageShotConfigs?.[segmentId]?.videoPlaybackRate
  if (typeof langRate === 'number' && Number.isFinite(langRate) && langRate > 0) {
    return clampVideoPlaybackRate(langRate)
  }
  return 1
}

function resolveCueCoveredSegmentIndices(
  cue: SceneNarrationCue,
  segments: SceneSegment[],
  beatIndexById: Map<string, number>
): number[] {
  const anchorSet =
    cue.anchorBeatIds && cue.anchorBeatIds.length > 0
      ? new Set(cue.anchorBeatIds)
      : null

  const matched: number[] = []
  segments.forEach((seg, segIdx) => {
    const beatId = seg.beatId
    if (beatId && anchorSet?.has(beatId)) {
      matched.push(segIdx)
      return
    }
    if (beatId && beatIndexById.has(beatId)) {
      const bIdx = beatIndexById.get(beatId)!
      if (bIdx >= cue.beatStart && bIdx <= cue.beatEnd) {
        matched.push(segIdx)
      }
      return
    }
    if (!beatId && segIdx >= cue.beatStart && segIdx <= cue.beatEnd) {
      matched.push(segIdx)
    }
  })

  if (matched.length > 0) return matched

  // Fallback by clamped positional range when beatIds were synthesized fresh
  if (segments.length > 0) {
    const start = Math.max(0, Math.min(segments.length - 1, cue.beatStart))
    const end = Math.max(start, Math.min(segments.length - 1, cue.beatEnd))
    const positional: number[] = []
    for (let i = start; i <= end; i++) positional.push(i)
    return positional
  }

  return []
}

function resolveCueAudioDurationSec(
  cue: SceneNarrationCue,
  language: string,
  probedDurations?: Record<string, number>
): { url: string; durationSec: number; text: string } | null {
  const lang = language.trim().toLowerCase() || 'en'
  const entry = cue.byLanguage?.[lang]
  if (!entry) return null
  const url = entry.audioUrl?.trim()
  if (!url) return null
  const clipKey = `narration-${cue.cueId}`
  const probed = probedDurations?.[clipKey] ?? probedDurations?.[cue.cueId]
  const durationSec =
    (typeof probed === 'number' && Number.isFinite(probed) && probed > 0
      ? probed
      : undefined) ??
    (typeof entry.durationSec === 'number' &&
    Number.isFinite(entry.durationSec) &&
    entry.durationSec > 0
      ? entry.durationSec
      : undefined) ??
    Math.max(1.5, estimateNarrationWordsDurationSec(entry.text))
  return {
    url,
    durationSec,
    text: entry.text || '',
  }
}

/**
 * Compute deterministic elastic pacing adjustments (`Intro Freeze`, `Slow-Mo`, `Close Freeze`)
 * for every Mixer shot based on active `SceneNarrationCue` spans and alignment modes.
 */
export function computeNarrationElasticAdjustments(options: {
  scene?: Record<string, unknown> | null
  segments: SceneSegment[]
  language: string
  narrationEnabled: boolean
  narrationCueConfigs?: Record<string, Partial<MixerNarrationCueConfig>>
  segmentAudioConfigs?: Record<string, Partial<MixerSegmentAudioConfig>>
  languageShotConfigs?: Record<string, MixerLanguageShotConfig>
  measuredVideoDurations?: Record<string, number>
  probedDurations?: Record<string, number>
  /** Base playback duration of a shot before narration elastic holds are applied. */
  getBaseShotDuration: (segment: SceneSegment, manualRate: number) => number
}): Record<string, NarrationShotAdjustment> {
  const adjustments: Record<string, NarrationShotAdjustment> = {}
  for (const seg of options.segments) {
    adjustments[seg.segmentId] = {
      addedPreHoldSec: 0,
      effectiveVideoPlaybackRate: resolveUnifiedManualVideoRate(
        seg.segmentId,
        options.segmentAudioConfigs,
        options.languageShotConfigs
      ),
      addedPostHoldSec: 0,
    }
  }

  if (!options.narrationEnabled || !options.scene || options.segments.length === 0) {
    return adjustments
  }

  const beats = getSceneBeats(options.scene)
  const cues = getSceneNarrationCues(options.scene, beats)
  if (cues.length === 0) return adjustments

  const beatIndexById = new Map(beats.map((b, i) => [b.beatId, i]))

  for (const cue of cues) {
    const override = options.narrationCueConfigs?.[cue.cueId]
    if (override?.enabled === false) continue

    const audio = resolveCueAudioDurationSec(cue, options.language, options.probedDurations)
    if (!audio) continue

    const covered = resolveCueCoveredSegmentIndices(cue, options.segments, beatIndexById)
    if (covered.length === 0) continue

    const mode: NarrationAlignmentMode =
      override?.alignmentMode ?? cue.alignmentMode ?? 'flow'
    const startOffsetSec = override?.startOffsetSec ?? cue.startOffsetSec ?? 0
    const requiredWindowSec = Math.max(0, startOffsetSec) + audio.durationSec

    let baseSpanSec = 0
    let stretcheableVideoMotionSec = 0
    const videoBaseBySegId = new Map<string, number>()

    for (const idx of covered) {
      const seg = options.segments[idx]
      const manualRate = adjustments[seg.segmentId].effectiveVideoPlaybackRate
      const baseShotDur = options.getBaseShotDuration(seg, manualRate)
      baseSpanSec += baseShotDur
      if (seg.assetType !== 'image') {
        const rawVisual = Math.max(
          MIXER_MIN_SEGMENT_VISUAL_SEC,
          getVisualBaseDuration(seg, options.measuredVideoDurations?.[seg.segmentId])
        )
        const currentMotion = rawVisual / manualRate
        stretcheableVideoMotionSec += currentMotion
        videoBaseBySegId.set(seg.segmentId, rawVisual)
      }
    }

    const overrunSec = requiredWindowSec - baseSpanSec
    const firstSeg = options.segments[covered[0]]
    const lastSeg = options.segments[covered[covered.length - 1]]

    if (mode === 'manual') {
      continue
    }

    if (mode === 'intro-freeze') {
      const requestedIntro =
        typeof cue.introNarrationSec === 'number' && cue.introNarrationSec > 0
          ? Math.min(10, cue.introNarrationSec)
          : Math.min(
              10,
              Math.max(
                overrunSec > 0 ? overrunSec : 1.5,
                Math.round(Math.min(audio.durationSec * 0.4, 3.5) * 10) / 10
              )
            )
      const existingPre =
        options.segmentAudioConfigs?.[firstSeg.segmentId]?.preSegmentHoldSec ?? 0
      const addedIntro = Math.max(0, requestedIntro - existingPre)
      adjustments[firstSeg.segmentId].addedPreHoldSec += addedIntro
      adjustments[firstSeg.segmentId].suggestedPreHoldStyle =
        options.segmentAudioConfigs?.[firstSeg.segmentId]?.preHoldStyle ?? 'push'
      adjustments[firstSeg.segmentId].drivenByCueId = cue.cueId

      const remainingAfterIntro = overrunSec - addedIntro
      if (remainingAfterIntro > 0.05) {
        adjustments[lastSeg.segmentId].addedPostHoldSec +=
          Math.round(remainingAfterIntro * 100) / 100
        adjustments[lastSeg.segmentId].suggestedHoldStyle =
          options.segmentAudioConfigs?.[lastSeg.segmentId]?.holdStyle ?? 'push'
        adjustments[lastSeg.segmentId].drivenByCueId = cue.cueId
      }
      continue
    }

    if (overrunSec <= 0.05) {
      continue
    }

    if (mode === 'outro-freeze') {
      adjustments[lastSeg.segmentId].addedPostHoldSec +=
        Math.round(overrunSec * 100) / 100
      adjustments[lastSeg.segmentId].suggestedHoldStyle =
        options.segmentAudioConfigs?.[lastSeg.segmentId]?.holdStyle ?? 'push'
      adjustments[lastSeg.segmentId].drivenByCueId = cue.cueId
      continue
    }

    if (mode === 'slow-mo-fit') {
      if (stretcheableVideoMotionSec > 0) {
        const targetMotionSec = stretcheableVideoMotionSec + overrunSec
        let absorbedBySlowMo = 0
        for (const idx of covered) {
          const seg = options.segments[idx]
          const rawVisual = videoBaseBySegId.get(seg.segmentId)
          if (!rawVisual) continue
          const prevRate = adjustments[seg.segmentId].effectiveVideoPlaybackRate
          const prevDur = rawVisual / prevRate
          const shareRatio = stretcheableVideoMotionSec / targetMotionSec
          const nextRate = clampVideoPlaybackRate(prevRate * shareRatio)
          const nextDur = rawVisual / nextRate
          adjustments[seg.segmentId].effectiveVideoPlaybackRate = nextRate
          adjustments[seg.segmentId].drivenByCueId = cue.cueId
          absorbedBySlowMo += Math.max(0, nextDur - prevDur)
        }
        const remainder = overrunSec - absorbedBySlowMo
        if (remainder > 0.05) {
          adjustments[lastSeg.segmentId].addedPostHoldSec +=
            Math.round(remainder * 100) / 100
          adjustments[lastSeg.segmentId].suggestedHoldStyle =
            options.segmentAudioConfigs?.[lastSeg.segmentId]?.holdStyle ?? 'push'
        }
      } else {
        adjustments[lastSeg.segmentId].addedPostHoldSec +=
          Math.round(overrunSec * 100) / 100
      }
      continue
    }

    // Default `'flow'` mode:
    // Absorb subtle overruns (<= 20% of motion) via imperceptible 0.84x-0.98x slow-mo;
    // place larger deltas into a gentle 103% Slow Push hold on `beatEnd`.
    let absorbedBySubtleSlowMo = 0
    if (stretcheableVideoMotionSec > 0) {
      const maxGentleStretchSec = stretcheableVideoMotionSec * 0.18
      const desiredMotionStretch = Math.min(overrunSec, maxGentleStretchSec)
      if (desiredMotionStretch > 0.05) {
        const ratio =
          stretcheableVideoMotionSec /
          (stretcheableVideoMotionSec + desiredMotionStretch)
        for (const idx of covered) {
          const seg = options.segments[idx]
          const rawVisual = videoBaseBySegId.get(seg.segmentId)
          if (!rawVisual) continue
          const prevRate = adjustments[seg.segmentId].effectiveVideoPlaybackRate
          const prevDur = rawVisual / prevRate
          const nextRate = clampVideoPlaybackRate(Math.max(0.84, prevRate * ratio))
          const nextDur = rawVisual / nextRate
          adjustments[seg.segmentId].effectiveVideoPlaybackRate = nextRate
          adjustments[seg.segmentId].drivenByCueId = cue.cueId
          absorbedBySubtleSlowMo += Math.max(0, nextDur - prevDur)
        }
      }
    }

    const remainingHold = overrunSec - absorbedBySubtleSlowMo
    if (remainingHold > 0.05) {
      adjustments[lastSeg.segmentId].addedPostHoldSec +=
        Math.round(remainingHold * 100) / 100
      adjustments[lastSeg.segmentId].suggestedHoldStyle =
        options.segmentAudioConfigs?.[lastSeg.segmentId]?.holdStyle ?? 'push'
      adjustments[lastSeg.segmentId].drivenByCueId = cue.cueId
    }
  }

  return adjustments
}

/**
 * Project active `SceneNarrationCue[]` onto the Mixer timeline using the
 * final playback segment durations. Falls back to legacy single-blob narration
 * only when no `SceneNarrationCue` exists.
 */
export function resolveMixerNarrationClips(options: {
  scene?: Record<string, unknown> | null
  segments: SceneSegment[]
  language: string
  getPlaybackSegmentDuration: (segment: SceneSegment) => number
  narrationConfig: AudioTrackConfig
  narrationCueConfigs?: Record<string, Partial<MixerNarrationCueConfig>>
  probedDurations?: Record<string, number>
  legacyNarrationUrl?: string
  legacyNarrationDuration?: number
}): {
  clips: MixerNarrationClip[]
  usingCues: boolean
  hasAnyCueForLanguage: boolean
} {
  const segmentBounds: Array<{ startTime: number; endTime: number; duration: number }> = []
  let cursor = 0
  for (const seg of options.segments) {
    const dur = Math.max(0, options.getPlaybackSegmentDuration(seg))
    segmentBounds.push({ startTime: cursor, endTime: cursor + dur, duration: dur })
    cursor += dur
  }

  if (options.scene) {
    const beats = getSceneBeats(options.scene)
    const cues = getSceneNarrationCues(options.scene, beats)
    if (cues.length > 0) {
      const beatIndexById = new Map(beats.map((b, i) => [b.beatId, i]))
      const clips: MixerNarrationClip[] = []
      let hasAnyCueForLanguage = false

      for (const cue of cues) {
        const audio = resolveCueAudioDurationSec(
          cue,
          options.language,
          options.probedDurations
        )
        if (audio) hasAnyCueForLanguage = true

        const override = options.narrationCueConfigs?.[cue.cueId]
        if (override?.enabled === false || !audio) continue

        const covered = resolveCueCoveredSegmentIndices(
          cue,
          options.segments,
          beatIndexById
        )
        if (covered.length === 0) continue

        const spanStartSec = segmentBounds[covered[0]]?.startTime ?? 0
        const spanEndSec =
          segmentBounds[covered[covered.length - 1]]?.endTime ??
          spanStartSec + audio.durationSec

        const offsetSec = override?.startOffsetSec ?? cue.startOffsetSec ?? 0
        const startTime = Math.max(0, spanStartSec + offsetSec)
        const cueVol = override?.volume ?? cue.volume ?? 1
        const speakerLabel =
          cue.speakerType === 'character' && cue.characterName?.trim()
            ? `${cue.characterName.trim()} (V.O.)`
            : 'NARRATOR'
        const rangeLabel = formatNarrationCueRange(cue)
        const mode = override?.alignmentMode ?? cue.alignmentMode ?? 'flow'
        const overrunSec = Math.max(0, startTime + audio.durationSec - spanEndSec)

        clips.push({
          id: `narration-${cue.cueId}`,
          cueId: cue.cueId,
          url: audio.url,
          startTime,
          duration: audio.durationSec,
          volume: Math.max(0, Math.min(1.5, cueVol)),
          label: `${speakerLabel} · ${rangeLabel}`,
          speakerLabel,
          speakerType: cue.speakerType,
          characterId: cue.characterId,
          text: audio.text,
          beatStart: cue.beatStart,
          beatEnd: cue.beatEnd,
          coveredSegmentIds: covered.map((idx) => options.segments[idx].segmentId),
          spanStartSec,
          spanEndSec,
          alignmentMode: mode,
          overrunSec,
        })
      }

      return {
        clips: clips.sort((a, b) => a.startTime - b.startTime),
        usingCues: true,
        hasAnyCueForLanguage,
      }
    }
  }

  const legacyUrl = options.legacyNarrationUrl?.trim()
  if (!legacyUrl || options.segments.length === 0) {
    return { clips: [], usingCues: false, hasAnyCueForLanguage: false }
  }

  const totalVideoSec = segmentBounds[segmentBounds.length - 1]?.endTime ?? 4
  const duration =
    options.legacyNarrationDuration && options.legacyNarrationDuration > 0
      ? options.legacyNarrationDuration
      : Math.max(3, totalVideoSec)
  const startTime = Math.max(0, options.narrationConfig.startOffset || 0)

  return {
    clips: [
      {
        id: 'narration-legacy',
        cueId: 'narration-legacy',
        url: legacyUrl,
        startTime,
        duration,
        volume: 1,
        label: 'Voiceover Narration',
        speakerLabel: 'NARRATOR',
        speakerType: 'narrator',
        text: '',
        beatStart: 0,
        beatEnd: Math.max(0, options.segments.length - 1),
        coveredSegmentIds: options.segments.map((s) => s.segmentId),
        spanStartSec: 0,
        spanEndSec: totalVideoSec,
        alignmentMode: 'flow',
        overrunSec: Math.max(0, startTime + duration - totalVideoSec),
      },
    ],
    usingCues: false,
    hasAnyCueForLanguage: true,
  }
}

/**
 * Merge active Dialogue (`A1`) and Narration (`A2`) speech intervals into sorted,
 * coalesced `SpeechDuckWindow[]` so Score (`A4`) and SFX (`A3`) duck `-8 dB`
 * whenever any voice is speaking.
 */
export function buildCombinedSpeechDuckWindows(options: {
  dialogueWindows?: SpeechDuckWindow[]
  narrationClips?: Array<{ startTime: number; duration: number }>
  narrationEnabled?: boolean
}): SpeechDuckWindow[] {
  const raw: SpeechDuckWindow[] = []
  if (options.dialogueWindows) {
    for (const w of options.dialogueWindows) {
      if (Number.isFinite(w.startTime) && Number.isFinite(w.endTime) && w.endTime > w.startTime) {
        raw.push({ startTime: w.startTime, endTime: w.endTime })
      }
    }
  }
  if (options.narrationEnabled && options.narrationClips) {
    for (const c of options.narrationClips) {
      if (Number.isFinite(c.startTime) && Number.isFinite(c.duration) && c.duration > 0) {
        raw.push({ startTime: c.startTime, endTime: c.startTime + c.duration })
      }
    }
  }
  if (raw.length <= 1) return raw

  const sorted = [...raw].sort((a, b) => a.startTime - b.startTime)
  const merged: SpeechDuckWindow[] = [{ ...sorted[0] }]
  for (let i = 1; i < sorted.length; i++) {
    const prev = merged[merged.length - 1]
    const curr = sorted[i]
    // Merge windows within 180ms breathing gap to avoid pumping the music bed between words
    if (curr.startTime <= prev.endTime + 0.18) {
      prev.endTime = Math.max(prev.endTime, curr.endTime)
    } else {
      merged.push({ ...curr })
    }
  }
  return merged
}

/**
 * Serialize active `MixerNarrationClip[]` for Cloud Run FFmpeg export (`audioTracks.narration`)
 * and compute any extra tail hold required on the final video shot so trailing narration
 * is never chopped off.
 */
export function mixerNarrationClipsToRenderPayload(
  clips: MixerNarrationClip[],
  narrationConfig: AudioTrackConfig,
  videoTotalDurationSec: number
): {
  narrationRenderClips: Array<{
    url: string
    startTime: number
    duration: number
    volume: number
    fadeInSec?: number
    fadeOutSec?: number
    warmBroadcastEq?: boolean
  }>
  extraFinalHoldSec: number
} {
  if (!narrationConfig.enabled || clips.length === 0) {
    return { narrationRenderClips: [], extraFinalHoldSec: 0 }
  }

  let maxEndSec = 0
  const narrationRenderClips = clips.map((clip) => {
    const endSec = clip.startTime + clip.duration
    if (endSec > maxEndSec) maxEndSec = endSec
    const effectiveVol = Math.max(
      0,
      Math.min(1.5, (narrationConfig.volume ?? 0.9) * (clip.volume ?? 1))
    )
    return {
      url: clip.url,
      startTime: clip.startTime,
      duration: clip.duration,
      volume: effectiveVol,
      fadeInSec: 0.03,
      fadeOutSec: 0.05,
      warmBroadcastEq: narrationConfig.warmBroadcastEq !== false,
    }
  })

  const extraFinalHoldSec =
    maxEndSec > videoTotalDurationSec + 0.05
      ? Math.round((maxEndSec - videoTotalDurationSec + 0.15) * 100) / 100
      : 0

  return { narrationRenderClips, extraFinalHoldSec }
}
