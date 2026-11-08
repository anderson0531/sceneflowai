import type { BeatVideoClip } from '@/components/vision/scene-production/BeatVideoGallery'
import type { DirectorQueueItem, SceneSegment } from '@/components/vision/scene-production/types'
import {
  formatPromoSourceBadge,
  formatPromoSourceLongLabel,
  type PromoSceneBeat,
} from '@/lib/publish/buildPromoScene'
import {
  beatDirectionOwnsVideoPrompt,
  compileBeatVideoPromptFromDirection,
  isStaleSavedVideoPrompt,
} from '@/lib/scene/beatVideoPromptCompiler'
import {
  composeLanguageClipPrompt,
  englishSpokenLine,
  extractPromptSignageText,
  extractPromptSignageTexts,
  extractSpokenLineFromPrompt,
  normalizeSpokenMatchKey,
  preferStoredSpokenTranslation,
  segmentNeedsLanguageClip,
  type StoredSceneLines,
} from '@/lib/scene/languageClipPrompt'
import {
  isLanguageClipTarget,
  normalizeStreamLanguage,
} from '@/lib/scene/languageClipVersions'
import { isStoredTranslationTimedForShot } from '@/lib/translation/timedDialogueMetrics'
import { getSceneBeats, isBeatExcluded } from '@/lib/script/beatMigration'
import { parsePersistedMusicCues, resolveBeatMusicCue } from '@/lib/script/sceneMusicCues'
import {
  resolveSegmentClipTier,
  segmentHasPlayableVideo,
} from '@/lib/storyboard/mediaVersions'
import { isBeatFrameStale } from '@/lib/storyboard/syncBeatStillPrompt'
import {
  f2vStartFromPreviousEnd,
  resolveEffectiveStartFrameUrl,
  resolveF2VFrameUrls,
} from '@/lib/vision/segmentConfigBuilder'
import type { DetailedSceneDirection } from '@/types/scene-direction'

export interface BuildBeatVideoClipsArgs {
  scene: Record<string, unknown> | null | undefined
  segments: SceneSegment[]
  queue: DirectorQueueItem[]
  languageShotConfigs?: Record<
    string,
    { method?: 'double' | 'lipsync' | 'regenerate'; signageText?: string }
  >
  streamLanguage?: string | null
  sceneIndex?: number
  scenes?: Array<Record<string, unknown> | null | undefined>
  sceneTranslations?: Record<string, Record<number, StoredSceneLines>>
}

/**
 * Build the ordered list of clip rows for the Clips tab (`BeatVideoGallery`).
 *
 * Key invariants:
 * - Only non-excluded beats appear in `fromBeats`.
 * - Each beat keeps its canonical 1-based shot number (`beat.sequenceIndex + 1`)
 *   so Shot 2..Shot 15 stay numbered 2..15 when Shot 1 is excluded (matching
 *   Direction, Audio, Continuity, and Stills).
 * - Preserved segments belonging to excluded beats (`excludedBeatIds`) are
 *   never appended to `orphanClips` (preventing an excluded Shot 1's clip from
 *   appearing at the end as a fake "Shot 15" with `imageTier: undefined` /
 *   status "Missing" and then migrating back to Shot 1 when re-included).
 */
export function buildBeatVideoClips({
  scene,
  segments,
  queue,
  languageShotConfigs,
  streamLanguage,
  sceneIndex,
  scenes,
  sceneTranslations,
}: BuildBeatVideoClipsArgs): BeatVideoClip[] {
  const sceneRecord = scene ?? null
  const isLangStream = isLanguageClipTarget(streamLanguage)
  const langKey = isLangStream ? normalizeStreamLanguage(streamLanguage) : ''
  const allBeats = getSceneBeats(sceneRecord)
  const beats = allBeats.filter((beat) => !isBeatExcluded(beat))
  const excludedBeatIds = new Set(
    allBeats.filter((beat) => isBeatExcluded(beat)).map((beat) => beat.beatId)
  )
  const sceneDirection = ((sceneRecord?.sceneDirection ?? sceneRecord?.detailedDirection ?? null) ||
    null) as DetailedSceneDirection | null
  const persistedMusicCues = parsePersistedMusicCues(sceneRecord?.sceneMusicCues, allBeats)
  const used = new Set<string>()

  const fromBeats: BeatVideoClip[] = beats.map((beat, index) => {
    const matches = segments.filter((segment) => segment.beatId === beat.beatId)
    for (const row of matches) {
      used.add(row.segmentId)
    }
    const segment =
      matches.find((row) => segmentHasPlayableVideo(row)) ??
      matches.find((row) => (row.dialoguePortion?.partIndex ?? 0) === 0) ??
      matches[0]
    if (segment) used.add(segment.segmentId)
    const item = segment ? queue.find((entry) => entry.segmentId === segment.segmentId) : undefined
    const f2v = segment
      ? resolveF2VFrameUrls(segment, sceneRecord ?? undefined)
      : {
          startFrameUrl:
            beat.storyboardStartImageUrl?.trim() || beat.storyboardImageUrl?.trim() || null,
          endFrameUrl: beat.storyboardEndImageUrl?.trim() || null,
        }
    const previousBeat = index > 0 ? beats[index - 1] : undefined
    const previousSegment = previousBeat
      ? segments.find((row) => row.beatId === previousBeat.beatId)
      : undefined
    const previousEndFrameUrl = f2vStartFromPreviousEnd(
      (previousSegment
        ? resolveF2VFrameUrls(previousSegment, sceneRecord ?? undefined).endFrameUrl
        : null) ||
        previousBeat?.storyboardEndImageUrl?.trim() ||
        null
    )
    const effectiveStartFrameUrl = segment
      ? resolveEffectiveStartFrameUrl(segment, sceneRecord ?? undefined)
      : beat.storyboardStartImageUrl?.trim() || beat.storyboardImageUrl?.trim() || null
    const thumbnail =
      effectiveStartFrameUrl ||
      beat.storyboardStartImageUrl?.trim() ||
      beat.storyboardImageUrl?.trim() ||
      f2v.startFrameUrl ||
      item?.thumbnailUrl ||
      segment?.startFrameUrl ||
      segment?.references?.startFrameUrl ||
      undefined
    const spoken = beat.kind === 'action' ? beat.actionDescription : beat.line
    const rawBeatIndex = allBeats.findIndex((entry) => entry.beatId === beat.beatId)
    const beatNumber =
      (typeof beat.sequenceIndex === 'number'
        ? beat.sequenceIndex
        : rawBeatIndex >= 0
          ? rawBeatIndex
          : index) + 1
    const musicCue =
      rawBeatIndex >= 0 ? resolveBeatMusicCue(persistedMusicCues, rawBeatIndex) : undefined
    const compiledFromDirection = compileBeatVideoPromptFromDirection(beat, sceneDirection, {
      previousBeat,
      ...(musicCue ? { musicCue } : {}),
    }).prompt
    const narrationLine = beat.kind === 'narration' ? beat.line?.trim() : undefined
    const spokenForStaleCheck = narrationLine || beat.line?.trim()
    const userEdited = segment?.userEditedPrompt?.trim()
    const hasGenuineUserEditedPrompt = Boolean(
      userEdited && !isStaleSavedVideoPrompt(beat, userEdited, spokenForStaleCheck)
    )
    const rawCandidatePrompt =
      (hasGenuineUserEditedPrompt ? userEdited : undefined) ||
      item?.config.prompt ||
      segment?.generatedPrompt ||
      beat.beatDirection?.videoPrompt?.trim() ||
      compiledFromDirection
    const narrationSnippet = narrationLine
      ? narrationLine.slice(0, Math.min(20, narrationLine.length))
      : undefined
    const resolvedPrompt =
      !hasGenuineUserEditedPrompt &&
      (beatDirectionOwnsVideoPrompt(beat) ||
        (narrationSnippet &&
          (/no spoken dialogue/i.test(rawCandidatePrompt) ||
            /^medium shot,\s*promo trailer voice-over/i.test(rawCandidatePrompt) ||
            !rawCandidatePrompt.includes(narrationSnippet))) ||
        isStaleSavedVideoPrompt(beat, rawCandidatePrompt, spokenForStaleCheck))
        ? compiledFromDirection
        : rawCandidatePrompt
    const promoBeat = beat as PromoSceneBeat
    const hasSharedSource =
      Boolean(promoBeat.sourceBeatId) &&
      typeof promoBeat.sourceSceneIndex === 'number' &&
      promoBeat.sourceSceneIndex >= 0
    const shotCfg = segment ? languageShotConfigs?.[segment.segmentId] : undefined
    const needsLanguageClip = segmentNeedsLanguageClip({
      beatKind: beat.kind,
      beatCharacter: beat.character,
      beatLine: beat.line,
      excerpt: segment?.dialoguePortion?.excerpt,
      dialogueLines: segment?.dialogueLines,
      sourcePrompt: resolvedPrompt,
      shotMethod: shotCfg?.method,
      customSignageText: shotCfg?.signageText,
    })

    let displayPrompt = resolvedPrompt
    let displaySpoken = spoken
    if (isLangStream && langKey) {
      const englishLine = englishSpokenLine({
        excerpt: segment?.dialoguePortion?.excerpt,
        beatLine: beat.line,
        dialogueLines: segment?.dialogueLines,
      })
      const isExcerpt = !beat.line?.trim() && !!segment?.dialoguePortion?.excerpt?.trim()
      let translatedLine = preferStoredSpokenTranslation({
        translation:
          sceneIndex != null ? sceneTranslations?.[langKey]?.[sceneIndex] : undefined,
        kind: beat.kind,
        lineId: beat.lineId || segment?.dialoguePortion?.lineId,
        beatId: beat.beatId,
        dialogue: Array.isArray(sceneRecord?.dialogue)
          ? (sceneRecord.dialogue as unknown[])
          : undefined,
        englishLine,
        isExcerpt,
      })
      if (
        !translatedLine &&
        hasSharedSource &&
        typeof promoBeat.sourceSceneIndex === 'number'
      ) {
        const sourceScene = scenes?.[promoBeat.sourceSceneIndex]
        const sourceBeats = sourceScene ? getSceneBeats(sourceScene) : []
        const sourceBeat = sourceBeats.find((b) => b.beatId === promoBeat.sourceBeatId)
        translatedLine = preferStoredSpokenTranslation({
          translation: sceneTranslations?.[langKey]?.[promoBeat.sourceSceneIndex],
          kind: beat.kind,
          lineId:
            sourceBeat?.lineId ||
            beat.lineId ||
            segment?.dialoguePortion?.lineId,
          beatId: promoBeat.sourceBeatId || beat.beatId,
          dialogue: Array.isArray(sourceScene?.dialogue)
            ? (sourceScene.dialogue as unknown[])
            : undefined,
          englishLine,
          isExcerpt,
        })
      }
      if (segment?.languageVersions?.[langKey]) {
        const langSet = segment.languageVersions[langKey]
        const langTake =
          langSet.takes.find((t) => t.id === langSet.currentTakeId) ??
          langSet.takes[langSet.takes.length - 1]
        const fromTakePrompt = extractSpokenLineFromPrompt(langTake?.prompt)
        if (
          fromTakePrompt &&
          normalizeSpokenMatchKey(fromTakePrompt) !==
            normalizeSpokenMatchKey(englishLine) &&
          (!translatedLine ||
            !isStoredTranslationTimedForShot(englishLine, translatedLine, langKey))
        ) {
          translatedLine = fromTakePrompt
        }
      }
      const signageTranslatedText = shotCfg?.signageText?.trim() || undefined
      const sceneTrans =
        sceneIndex != null ? sceneTranslations?.[langKey]?.[sceneIndex] : undefined
      const sourceSceneTrans =
        hasSharedSource && typeof promoBeat.sourceSceneIndex === 'number'
          ? sceneTranslations?.[langKey]?.[promoBeat.sourceSceneIndex]
          : undefined
      const signageSources = extractPromptSignageTexts(resolvedPrompt, englishLine)
      const signageTranslations: Record<string, string> = {}
      for (const src of signageSources) {
        const fromStored =
          sceneTrans?.signageByText?.[src] ||
          sourceSceneTrans?.signageByText?.[src] ||
          (src === beat.overlayText?.trim()
            ? sceneTrans?.beatsByBeatId?.[beat.beatId]?.overlayText?.trim() ||
              (promoBeat.sourceBeatId
                ? sourceSceneTrans?.beatsByBeatId?.[promoBeat.sourceBeatId]?.overlayText?.trim()
                : undefined)
            : undefined)
        if (fromStored) {
          signageTranslations[src] = fromStored
        }
      }
      if (translatedLine || signageTranslatedText || Object.keys(signageTranslations).length > 0) {
        const composed = composeLanguageClipPrompt({
          sourcePrompt: resolvedPrompt,
          character: beat.character || segment?.dialogueLines?.[0]?.character,
          kind: beat.kind,
          englishLine,
          translatedLine,
          signageSourceText: extractPromptSignageText(resolvedPrompt, englishLine),
          signageTranslatedText,
          signageTranslations,
          targetLanguage: langKey,
        })
        if (composed.prompt) {
          displayPrompt = composed.prompt
        }
        if (translatedLine && beat.kind !== 'action') {
          displaySpoken = translatedLine
        }
      }
    }

    return {
      key: beat.beatId,
      beatId: beat.beatId,
      beatNumber,
      label: (displaySpoken || beat.kind || `Shot ${beatNumber}`).replace(/\s+/g, ' ').trim(),
      prompt: displayPrompt,
      kind: beat.kind,
      thumbnailUrl: thumbnail,
      hasStartFrame: !!thumbnail,
      f2vStartUrl: f2v.startFrameUrl,
      f2vEndUrl: f2v.endFrameUrl,
      previousEndFrameUrl,
      segment,
      queueItem: item,
      imageTier: resolveSegmentClipTier(beat, segment, item?.config),
      promptChanged:
        segment?.isStale !== undefined ? Boolean(segment.isStale) : isBeatFrameStale(beat),
      needsLanguageClip,
      ...(hasSharedSource
        ? {
            sourceSceneLabel: formatPromoSourceBadge(promoBeat),
            sourceSceneLongLabel: formatPromoSourceLongLabel(promoBeat),
            sourceSceneIndex: promoBeat.sourceSceneIndex,
          }
        : {}),
    }
  })

  const maxBeatNumber = fromBeats.reduce(
    (max, clip) => Math.max(max, clip.beatNumber),
    allBeats.length
  )

  const orphanClips: BeatVideoClip[] = segments
    .filter(
      (segment) =>
        !used.has(segment.segmentId) &&
        !(segment.beatId && excludedBeatIds.has(segment.beatId)) &&
        segmentHasPlayableVideo(segment)
    )
    .map((segment, index) => {
      const item = queue.find((entry) => entry.segmentId === segment.segmentId)
      const beatNumber = maxBeatNumber + index + 1
      const orphanPrompt =
        item?.config.prompt || segment.userEditedPrompt || segment.generatedPrompt
      const shotCfg = languageShotConfigs?.[segment.segmentId]
      return {
        key: segment.segmentId,
        beatNumber,
        label: (orphanPrompt || `Clip ${beatNumber}`).replace(/\s+/g, ' ').trim(),
        prompt: orphanPrompt,
        thumbnailUrl:
          item?.thumbnailUrl ||
          segment.startFrameUrl ||
          segment.references?.startFrameUrl ||
          undefined,
        hasStartFrame: !!(
          item?.thumbnailUrl ||
          segment.startFrameUrl ||
          segment.references?.startFrameUrl
        ),
        segment,
        queueItem: item,
        imageTier: resolveSegmentClipTier(undefined, segment, item?.config),
        promptChanged: !!segment.isStale,
        needsLanguageClip: segmentNeedsLanguageClip({
          excerpt: segment.dialoguePortion?.excerpt,
          dialogueLines: segment.dialogueLines,
          sourcePrompt: orphanPrompt,
          shotMethod: shotCfg?.method,
          customSignageText: shotCfg?.signageText,
        }),
      }
    })

  if (allBeats.length > 0) return [...fromBeats, ...orphanClips]

  return queue
    .filter((item) => !used.has(item.segmentId))
    .map((item, index) => {
      const segment = segments.find((row) => row.segmentId === item.segmentId)
      return {
        key: item.segmentId,
        beatNumber: index + 1,
        label: item.config.prompt || `Clip ${index + 1}`,
        prompt: item.config.prompt,
        thumbnailUrl: item.thumbnailUrl || undefined,
        hasStartFrame: !!(item.thumbnailUrl || segment?.startFrameUrl),
        segment,
        queueItem: item,
        imageTier: resolveSegmentClipTier(undefined, segment, item.config),
        promptChanged: !!segment?.isStale,
      }
    })
}
