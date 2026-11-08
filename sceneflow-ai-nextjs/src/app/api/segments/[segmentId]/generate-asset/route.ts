import { NextRequest, NextResponse } from 'next/server'
import { generateImageWithGemini } from '@/lib/gemini/imageClient'
import { getEndpointStatus } from '@/lib/gemini/productionVideoClient'
import { classifyVertexRateLimitHttp } from '@/lib/gemini/vertexRateLimit'
import { uploadImageToBlob } from '@/lib/storage/blob'
import {
  generateSegmentVideoCore,
  SegmentVideoExtRefRequiredError,
  SegmentVideoAggregatorAsyncError,
  SegmentVideoAggregatorNotConfiguredError,
  SegmentVideoKlingAsyncError,
  SegmentVideoKlingNotConfiguredError,
  SegmentVideoRateLimitError,
  KlingSafetyGuardBlockedError,
} from '@/lib/video/generateSegmentVideo'
import { runInVideoGenerationGate } from '@/lib/video/videoGenerationGate'
import { getAggregatorCreditsForModel, getAggregatorModel } from '@/lib/aggregator/modelRegistry'
import { isAggregatorEnabled } from '@/lib/aggregator/config'
import { buildAggregatorRouteProbeResult, buildRoutingTrace } from '@/lib/aggregator/routeProbe'
import { CreditService } from '@/services/CreditService'
import { IMAGE_CREDITS, VIDEO_CREDITS } from '@/lib/credits/creditCosts'
import { logProviderCost } from '@/lib/credits/costTracking'
import { quoteAndCharge } from '@/lib/credits/chargeQuotedGeneration'
import { resolveGenerationQuote } from '@/lib/credits/resolveGenerationQuote'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { applyBeatsToScene, isBeatExcluded, isBeatFirstPipelineEnabled, getSceneBeats } from '@/lib/script/beatMigration'
import { enforceVideoGenerationUnlock } from '@/lib/script/enforceVideoGenerationUnlock'
import type { SceneBeat } from '@/lib/script/segmentTypes'
import { compileBeatVideoPromptFromDirection } from '@/lib/scene/beatVideoPromptCompiler'
import { buildSceneStateLedger } from '@/lib/scene/sceneStateLedger'
import { isBeatFrameStale } from '@/lib/storyboard/syncBeatStillPrompt'
import { buildExpressReferenceCatalog } from '@/lib/sceneGeneration/expressOrchestrator'
import {
  expectsUnstatedCast,
  plateNamesFromVideoRefs,
  rewriteThinClipPrompt,
} from '@/lib/intelligence/shotDirectionPreflight'
import {
  parsePersistedMusicCues,
  resolveBeatMusicCue,
} from '@/lib/script/sceneMusicCues'
import type { DetailedSceneDirection } from '@/types/scene-direction'
import { resolveProjectArtStyle } from '@/lib/vision/artStyle'
import Project from '@/models/Project'
import { sequelize } from '@/config/database'
import { resolveUserId } from '@/lib/userHelper'
import {
  type VideoGenerationMethod,
  promoteMethodForResolvedRefs,
  type MethodSelectionResult,
} from '@/lib/vision/intelligentMethodSelection'
import type { StemSeparationResult } from '@/lib/audio/stemSeparation'
import { autoSanitizePrompt } from '@/utils/promptModerator'
import { extractVeoRaiDetailsFromErrorString } from '@/lib/vertexai/safety'
import { normalizeReferenceImages, type VeoReferenceImage } from '@/lib/video/normalizeReferenceImages'
import {
  resolveBeatVideoReferences,
  resolveBeatElementSelection,
  shouldReplaceClientVideoReferences,
} from '@/lib/vision/resolveBeatVideoReferences'
import {
  findSceneById,
  getVisionScriptScenes,
} from '@/lib/script/resolveSceneById'
import {
  buildElementPromptBindings,
  collectKlingElementSources,
  persistKlingElementIdsToProject,
  resolveKlingElementsFromSources,
} from '@/lib/kling/elementRegistry'
import { resolveKlingApiModelName } from '@/lib/kling/types'
import {
  applyClipCaptionsDirective,
  cleanSpokenLineText,
  composeLanguageClipPrompt,
  extractPromptSignageText,
  extractPromptSignageTexts,
  extractSpokenLineFromPrompt,
  normalizeSpokenMatchKey,
  preferStoredSpokenTranslation,
  preserveSignageCaseAndFormulaStyle,
  type StoredSceneLines,
} from '@/lib/scene/languageClipPrompt'
import {
  isLanguageClipTarget,
  normalizeStreamLanguage,
} from '@/lib/scene/languageClipVersions'
import { translateWithVertexAI } from '@/lib/vertexai/translate'
import {
  isStoredTranslationTimedForShot,
  translateAndAdaptTimedDialogue,
} from '@/lib/translation/scriptAdaptation'
import type { PromoSceneBeat } from '@/lib/publish/buildPromoScene'

export const maxDuration = 300 // 5 minutes for video generation
export const runtime = 'nodejs'

interface GenerateAssetRequest {
  prompt: string
  genType: 'T2V' | 'I2V' | 'T2I' | 'UPLOAD'
  referenceImageIds?: string[]
  startFrameUrl?: string
  endFrameUrl?: string  // Veo 3.1: For Frame-to-Video (FTV) generation with end frame
  sourceVideoUrl?: string  // Veo 3.1: Source video URL for extension mode - Veo handles frame continuity automatically
  referenceImages?: Array<{ url: string; type?: 'style' | 'character'; name?: string; role?: string }> | string[]  // Veo 3.1: Up to 8 reference images
  generationMethod?: 'T2V' | 'I2V' | 'FTV' | 'EXT' | 'REF' | 'AUTO'  // Veo 3.1: Explicit generation method (AUTO = intelligent selection)
  sceneId: string
  projectId: string
  // Optional video settings from prompt builder
  negativePrompt?: string
  duration?: number
  aspectRatio?: '16:9' | '9:16'
  resolution?: '360p' | '720p' | '1080p' | '4k' | '4K'
  frameRate?: 24 | 30
  thinkingLevel?: 'minimal' | 'low' | 'medium' | 'high'
  omniMultiShot?: boolean
  qualityTier?: 'fast' | 'premium'  // Veo quality tier - FTV benefits from premium
  // Context for intelligent method selection
  segmentIndex?: number
  totalSegments?: number
  sceneImageUrl?: string
  previousSegmentAssetUrl?: string
  previousSegmentLastFrameUrl?: string
  previousSegmentVeoRef?: string
  previousSegmentVeoRefExpiry?: string
  isEstablishingShot?: boolean
  // Audio context for atmospheric guidance (Veo 3.1 native dialogue / ambience)
  audioContext?: {
    hasNarration?: boolean
    narrationText?: string
    emotionalTone?: string
    dialogueBeat?: string
    suggestedAtmosphere?: string
  }
  // Guide prompt containing voice/dialogue cues for Veo 3.1 native audio
  // Composed by GuidePromptEditor with proper voice anchors and Veo formatting
  guidePrompt?: string
  existingStemSourceAudioUrl?: string
  existingStemSourceHash?: string
  existingStemStatus?: string
  existingStemJobId?: string
  /** Beat-first: segment source beat for prompt compilation */
  beatId?: string
  /** Full API prompt override — skips server assembly and pre-flight rewrite */
  apiPromptOverride?: string
  /** Opt-in Vertex Veo backup when Kling policy blocks. Default true on Kling path. */
  allowPolicyFallback?: boolean
  /** Primary video backend for this generation. */
  videoProvider?: 'kling' | 'vertex' | 'aggregator'
  videoModel?: string
  klingModel?: string
  klingQuality?: 'std' | 'pro' | '4k'
  cfgScale?: number
  sound?: boolean
  watermarkEnabled?: boolean
  elementList?: string[]
  voiceList?: Array<{ voice_id: string; name?: string }>
  multiShot?: boolean
  shotType?: 'customize' | 'intelligence'
  multiPrompt?: Array<{ index: number; prompt: string; duration: string | number }>
  preset?: string
  allowVeoFallback?: boolean
  expressMode?: boolean
  /** Attach beat/animatic frame as start image. Default false for REF ingredients. */
  useBeatFrameAsStart?: boolean
  /** Target non-English stream language code when generating a localized clip take. */
  clipLanguage?: string
  /** When true, intentionally include burned-in captions in the clip prompt (default false). */
  includeCaptions?: boolean
  /** When true, verify aggregator routing without generating video or charging credits. */
  routeProbe?: boolean
  /** True only when this request ran on the user's own provider key. */
  userKeyUsed?: boolean
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ segmentId: string }> }
) {
  let requestBody: Partial<GenerateAssetRequest> = {}
  try {
    const { segmentId } = await params
    requestBody = await req.json()
    const body = requestBody as GenerateAssetRequest
    const clientPrompt = body.prompt?.trim() || ''
    let prompt = body.prompt
    let negativePrompt = body.negativePrompt
    let guidePrompt = body.guidePrompt
    let referenceImages = normalizeReferenceImages(
      body.referenceImages as string[] | GenerateAssetRequest['referenceImages'],
    )
    let genType = body.genType
    let startFrameUrl = body.startFrameUrl
    const {
      referenceImageIds, 
      endFrameUrl,
      sourceVideoUrl,
      generationMethod,
      sceneId, 
      projectId,
      duration,
      aspectRatio,
      resolution,
      frameRate,
      thinkingLevel,
      omniMultiShot,
      qualityTier,  // User-selected quality tier (FTV defaults to premium)
      // Context for intelligent method selection
      segmentIndex = 0,
      totalSegments = 1,
      sceneImageUrl,
      previousSegmentAssetUrl,
      previousSegmentLastFrameUrl,
      previousSegmentVeoRef,
      previousSegmentVeoRefExpiry,
      isEstablishingShot = false,
      // Audio context for atmospheric guidance
      audioContext,
      existingStemSourceAudioUrl,
      existingStemSourceHash,
      existingStemStatus
      ,
      existingStemJobId
      ,
      beatId,
      apiPromptOverride,
      allowPolicyFallback,
      videoProvider,
      videoModel,
      klingModel,
      klingQuality,
      cfgScale,
      sound,
      watermarkEnabled,
      elementList,
      voiceList,
      multiShot,
      shotType,
      multiPrompt,
      preset,
      allowVeoFallback,
      expressMode,
      useBeatFrameAsStart,
      clipLanguage,
      includeCaptions,
      routeProbe,
      userKeyUsed: userKeyUsedBody,
    } = body
    const userKeyUsed = userKeyUsedBody === true
    const clientRequestedCaptions = /\bInclude clear on-screen captions\b/i.test(clientPrompt)
    const effectiveIncludeCaptions =
      includeCaptions !== undefined ? includeCaptions === true : clientRequestedCaptions

    // Get user session for authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    let dbUserId = String(session.user.id)
    try {
      dbUserId = await resolveUserId(dbUserId)
    } catch {
      // Keep the session key. Provenance/cost inserts skip non-UUID values.
    }
    let resolvedGenerationMethod = generationMethod as VideoGenerationMethod | undefined

    const resolvedVideoProvider =
      videoProvider === 'aggregator'
        ? 'aggregator'
        : videoProvider === 'kling'
          ? 'kling'
          : 'vertex'

    if (
      routeProbe === true &&
      (genType === 'T2V' || genType === 'I2V')
    ) {
      if (resolvedVideoProvider === 'aggregator') {
        const probe = await buildAggregatorRouteProbeResult(videoModel)
        return NextResponse.json({
          success: true,
          routeProbe: true,
          segmentId,
          routingTrace: buildRoutingTrace('aggregator', 'aggregator'),
          routing: probe.routing,
          renderfulProbe: probe.renderfulProbe,
          diagnostics: probe.diagnostics,
        })
      }
      if (resolvedVideoProvider === 'kling') {
        const { isKlingConfigured, getKlingDefaultModel } = await import('@/lib/kling/config')
        return NextResponse.json({
          success: true,
          routeProbe: true,
          segmentId,
          routingTrace: buildRoutingTrace('kling', 'kling'),
          routing: {
            requestedProvider: 'kling',
            wouldRouteTo: 'kling',
            klingConfigured: isKlingConfigured(),
            defaultModel: getKlingDefaultModel(),
          },
        })
      }
      return NextResponse.json({
        success: true,
        routeProbe: true,
        segmentId,
        routingTrace: buildRoutingTrace('vertex', 'vertex'),
        routing: {
          requestedProvider: 'vertex',
          aggregatorEnabled: isAggregatorEnabled(),
          wouldRouteTo: 'vertex',
        },
      })
    }

    if (!prompt || !genType || !sceneId || !projectId) {
      return NextResponse.json(
        { error: 'Missing required fields: prompt, genType, sceneId, projectId' },
        { status: 400 }
      )
    }

    let cachedProject: Awaited<ReturnType<typeof Project.findByPk>> | null = null
    let cachedScene: Record<string, unknown> | undefined
    let cachedBeat: SceneBeat | undefined
    let resolvedTranslatedSpokenLine: string | undefined
    let resolvedSignageTranslatedText: string | undefined
    const resolvedSignageTranslations: Record<string, string> = {}

    const localizeCompiledBeatPrompt = async (
      beat: SceneBeat,
      compiledPrompt: string
    ): Promise<string> => {
      const englishLine = beat.line?.trim() || ''
      const clientSpoken = extractSpokenLineFromPrompt(clientPrompt)
      const clientHasTranslatedSpoken = Boolean(
        clientSpoken &&
          (!englishLine ||
            normalizeSpokenMatchKey(clientSpoken) !== normalizeSpokenMatchKey(englishLine))
      )
      const isLangClip = isLanguageClipTarget(clipLanguage)
      if (!isLangClip && !clientHasTranslatedSpoken) {
        if (includeCaptions !== undefined || clientRequestedCaptions) {
          return applyClipCaptionsDirective(compiledPrompt, {
            includeCaptions: effectiveIncludeCaptions,
            spokenLine: englishLine,
            targetLanguage: 'en',
            kind: beat.kind,
          })
        }
        return compiledPrompt
      }

      const langKey = isLangClip ? normalizeStreamLanguage(clipLanguage) : undefined
      const visionPhase = (cachedProject?.metadata?.visionPhase || {}) as Record<
        string,
        unknown
      >
      const translations = (visionPhase.translations || {}) as Record<
        string,
        Record<number, StoredSceneLines>
      >
      const scenes = getVisionScriptScenes(visionPhase)
      const sceneIdx = findSceneById(scenes, sceneId).index
      const promoBeat = beat as PromoSceneBeat

      if (!resolvedTranslatedSpokenLine) {
        const targetDurationSeconds = Math.min(
          10,
          Math.max(
            3,
            typeof duration === 'number' && duration > 0
              ? duration
              : typeof beat.durationSeconds === 'number' && beat.durationSeconds > 0
                ? beat.durationSeconds
                : 10
          )
        )
        const effectiveLang = langKey || normalizeStreamLanguage(clipLanguage) || 'es'
        if (
          clientHasTranslatedSpoken &&
          clientSpoken &&
          (beat.kind === 'title' ||
            !englishLine ||
            isStoredTranslationTimedForShot(
              englishLine,
              clientSpoken,
              effectiveLang,
              targetDurationSeconds
            ))
        ) {
          resolvedTranslatedSpokenLine = clientSpoken
        } else if (isLangClip && langKey && englishLine) {
          let stored = preferStoredSpokenTranslation({
            translation: sceneIdx >= 0 ? translations?.[langKey]?.[sceneIdx] : undefined,
            kind: beat.kind,
            lineId: beat.lineId,
            beatId: beat.beatId,
            dialogue: Array.isArray(cachedScene?.dialogue)
              ? (cachedScene.dialogue as unknown[])
              : undefined,
            englishLine,
          })
          if (
            !stored &&
            typeof promoBeat.sourceSceneIndex === 'number' &&
            promoBeat.sourceSceneIndex >= 0
          ) {
            const sourceScene = scenes[promoBeat.sourceSceneIndex] as
              | Record<string, unknown>
              | undefined
            const sourceBeats = sourceScene ? getSceneBeats(sourceScene) : []
            const sourceBeat = sourceBeats.find((b) => b.beatId === promoBeat.sourceBeatId)
            stored = preferStoredSpokenTranslation({
              translation: translations?.[langKey]?.[promoBeat.sourceSceneIndex],
              kind: beat.kind,
              lineId: sourceBeat?.lineId || beat.lineId,
              beatId: promoBeat.sourceBeatId || beat.beatId,
              dialogue: Array.isArray(sourceScene?.dialogue)
                ? (sourceScene.dialogue as unknown[])
                : undefined,
              englishLine,
            })
          }
          if (!stored && translations?.[langKey]) {
            for (let idx = 0; idx < scenes.length; idx += 1) {
              if (idx === sceneIdx) continue
              const candTrans = translations[langKey]?.[idx]
              if (!candTrans) continue
              const candScene = scenes[idx] as Record<string, unknown> | undefined
              const candBeats = candScene ? getSceneBeats(candScene) : []
              const sharedBeat = candBeats.find(
                (b) =>
                  b.beatId === beat.beatId ||
                  ((b as PromoSceneBeat).sourceSceneIndex === sceneIdx &&
                    (b as PromoSceneBeat).sourceBeatId === beat.beatId)
              )
              stored = preferStoredSpokenTranslation({
                translation: candTrans,
                kind: beat.kind,
                lineId: sharedBeat?.lineId || beat.lineId,
                beatId: sharedBeat?.beatId || beat.beatId,
                dialogue: Array.isArray(candScene?.dialogue)
                  ? (candScene.dialogue as unknown[])
                  : undefined,
                englishLine,
              })
              if (stored) break
            }
          }
          if (
            stored &&
            beat.kind !== 'title' &&
            !isStoredTranslationTimedForShot(englishLine, stored, langKey, targetDurationSeconds)
          ) {
            stored = undefined
          }
          if (stored) {
            resolvedTranslatedSpokenLine = stored
          } else {
            try {
              if (beat.kind === 'title') {
                const spokenToTranslate = cleanSpokenLineText(englishLine) || englishLine
                const result = await translateWithVertexAI({
                  text: spokenToTranslate,
                  targetLanguage: langKey,
                  sourceLanguage: 'en',
                })
                if (result.translatedText?.trim()) {
                  resolvedTranslatedSpokenLine =
                    cleanSpokenLineText(result.translatedText) || result.translatedText.trim()
                }
              } else {
                const adapted = await translateAndAdaptTimedDialogue({
                  sourceText: englishLine,
                  targetLanguage: langKey,
                  sourceLanguage: 'en',
                  targetDurationSeconds,
                })
                if (adapted.translatedText?.trim()) {
                  resolvedTranslatedSpokenLine =
                    cleanSpokenLineText(adapted.translatedText) || adapted.translatedText.trim()
                }
              }
            } catch (translateErr) {
              console.warn(
                `[Segment Asset Generation] Failed to translate beat line for ${langKey}:`,
                translateErr
              )
            }
          }
        }
      }

      const compiledSignageSources = extractPromptSignageTexts(compiledPrompt, englishLine)
      const compiledSignage = compiledSignageSources[0]
      const clientSignageSources = extractPromptSignageTexts(
        clientPrompt,
        resolvedTranslatedSpokenLine || englishLine
      )
      for (let i = 0; i < compiledSignageSources.length; i += 1) {
        const src = compiledSignageSources[i]
        if (resolvedSignageTranslations[src]) continue
        const clientCand = clientSignageSources[i]
        if (clientCand && clientCand !== src) {
          resolvedSignageTranslations[src] = preserveSignageCaseAndFormulaStyle(src, clientCand)
          continue
        }
        if (langKey) {
          const anyStoredSignage = Object.values(translations?.[langKey] || {})
            .map((t) => t?.signageByText?.[src])
            .find(Boolean)
          const storedSignage =
            (sceneIdx >= 0 ? translations?.[langKey]?.[sceneIdx]?.signageByText?.[src] : undefined) ||
            (typeof promoBeat.sourceSceneIndex === 'number' && promoBeat.sourceSceneIndex >= 0
              ? translations?.[langKey]?.[promoBeat.sourceSceneIndex]?.signageByText?.[src]
              : undefined) ||
            anyStoredSignage
          if (storedSignage) {
            resolvedSignageTranslations[src] = preserveSignageCaseAndFormulaStyle(
              src,
              storedSignage
            )
            continue
          }
          try {
            const result = await translateWithVertexAI({
              text: src,
              targetLanguage: langKey,
              sourceLanguage: 'en',
            })
            if (result.translatedText?.trim()) {
              resolvedSignageTranslations[src] = preserveSignageCaseAndFormulaStyle(
                src,
                result.translatedText
              )
            }
          } catch (signageErr) {
            console.warn(
              `[Segment Asset Generation] Failed to translate signage "${src}" for ${langKey}:`,
              signageErr
            )
          }
        }
      }
      if (!resolvedSignageTranslatedText && compiledSignage && resolvedSignageTranslations[compiledSignage]) {
        resolvedSignageTranslatedText = resolvedSignageTranslations[compiledSignage]
      }

      if (
        !resolvedTranslatedSpokenLine &&
        !resolvedSignageTranslatedText &&
        Object.keys(resolvedSignageTranslations).length === 0
      ) {
        return applyClipCaptionsDirective(compiledPrompt, {
          includeCaptions: effectiveIncludeCaptions,
          spokenLine: englishLine,
          targetLanguage: langKey,
          kind: beat.kind,
        })
      }

      const composed = composeLanguageClipPrompt({
        sourcePrompt: compiledPrompt,
        guidePrompt,
        character: beat.character,
        kind: beat.kind,
        englishLine,
        translatedLine: resolvedTranslatedSpokenLine,
        signageSourceText: compiledSignage,
        signageTranslatedText: resolvedSignageTranslatedText,
        signageTranslations: resolvedSignageTranslations,
        targetLanguage: langKey,
        includeCaptions: effectiveIncludeCaptions,
      })
      if (composed.guidePrompt) {
        guidePrompt = composed.guidePrompt
      }
      return composed.prompt || compiledPrompt
    }

    let englishCompiledPrompt = ''
    if (isBeatFirstPipelineEnabled()) {
      await sequelize.authenticate()
      const project = await Project.findByPk(projectId)
      const unlock = await enforceVideoGenerationUnlock(project, sceneId)
      if (!unlock.ok) return unlock.response
      const sceneRecord = unlock.scene
      cachedProject = project
      if (sceneRecord) cachedScene = sceneRecord as Record<string, unknown>

      if (
        beatId &&
        sceneRecord &&
        (genType === 'T2V' || genType === 'I2V' || generationMethod === 'REF')
      ) {
        const beats = getSceneBeats(sceneRecord as Record<string, unknown>)
        const activeBeats = beats.filter((b) => !isBeatExcluded(b))
        const beatIndex = beats.findIndex((b) => b.beatId === beatId)
        const activeBeatIndex = activeBeats.findIndex((b) => b.beatId === beatId)
        const beat = beatIndex >= 0 ? beats[beatIndex] : undefined
        cachedBeat = beat
        if (beat) {
          const artStyleId = resolveProjectArtStyle(project?.metadata)
          const sceneDirection =
            (sceneRecord as { sceneDirection?: unknown; detailedDirection?: unknown })
              .sceneDirection ??
            (sceneRecord as { detailedDirection?: unknown }).detailedDirection ??
            null
          const stateLedger = buildSceneStateLedger(activeBeats)
          // Music the beat plays under shapes how it should be shot, so the
          // clip's pacing matches the score that will sit beneath it.
          const musicCue = resolveBeatMusicCue(
            parsePersistedMusicCues(
              (sceneRecord as Record<string, unknown>).sceneMusicCues,
              activeBeats
            ),
            Math.max(activeBeatIndex, 0)
          )
          const targetMethodForPrompt: 'reference' | 'frame' =
            resolvedGenerationMethod === 'FTV' || resolvedGenerationMethod === 'I2V'
              ? 'frame'
              : 'reference'
          const compiled = compileBeatVideoPromptFromDirection(
            beat,
            sceneDirection as DetailedSceneDirection | null,
            {
              artStyleId,
              targetMethod: targetMethodForPrompt,
              previousBeat:
                activeBeatIndex > 0
                  ? activeBeats[activeBeatIndex - 1]
                  : beatIndex > 0
                    ? beats[beatIndex - 1]
                    : undefined,
              sceneState: activeBeatIndex >= 0 ? stateLedger[activeBeatIndex] : undefined,
              ...(musicCue ? { musicCue } : {}),
            }
          )
          englishCompiledPrompt = compiled.prompt
          prompt = await localizeCompiledBeatPrompt(beat, compiled.prompt)
          negativePrompt = negativePrompt || compiled.negativePrompt

          const trimmedStart = startFrameUrl?.trim()
          const hasDedicatedActionStart =
            Boolean(beat.storyboardStartImageUrl?.trim()) &&
            trimmedStart === beat.storyboardStartImageUrl?.trim()
          const startFrameDirection = beat.beatDirection?.startFrame?.trim() || ''
          const directsDarkStart =
            /\b(?:pitch-black|blackout|complete darkness|unlit|dark shadow|zero electrical light|without a single electric)\b/i.test(
              startFrameDirection
            )
          const stillDescribesLit =
            /\b(?:blazing|incandescent|illuminated|glowing|golden glare|amber highlights)\b/i.test(
              `${beat.beatDirection?.frozenMoment || ''} ${beat.storyboardImagePrompt || ''}`
            )
          if (
            resolvedVideoProvider === 'vertex' &&
            trimmedStart &&
            !endFrameUrl?.trim() &&
            resolvedGenerationMethod !== 'EXT' &&
            !hasDedicatedActionStart &&
            (isBeatFrameStale(beat) ||
              (Boolean(startFrameDirection) && trimmedStart !== beat.storyboardImageUrl?.trim()) ||
              (directsDarkStart && stillDescribesLit))
          ) {
            console.log(
              `[Segment Asset Generation] Dropping stale/mismatched startFrameUrl for beat ${beatId} so Omni follows timed 0s–2s startFrame prompt direction`
            )
            startFrameUrl = undefined
            if (genType === 'I2V') genType = 'T2V'
            if (resolvedGenerationMethod === 'I2V') resolvedGenerationMethod = 'T2V'
          }
        }
      }
    }

    if (resolvedGenerationMethod === 'FTV' || resolvedGenerationMethod === 'I2V') {
      referenceImages = undefined
    } else if (beatId && projectId) {
      try {
        let projectForRefs = cachedProject
        let sceneForRefs = cachedScene
        let beat = cachedBeat
        const knownAndKept =
          !!beat &&
          !!sceneForRefs &&
          !shouldReplaceClientVideoReferences(beat, referenceImages)
        if (!knownAndKept) {
          if (!beat || !sceneForRefs || !projectForRefs) {
            if (!projectForRefs) {
              await sequelize.authenticate()
              projectForRefs = await Project.findByPk(projectId)
              cachedProject = projectForRefs
            }
            const scenesForRefs = getVisionScriptScenes(
              projectForRefs?.metadata?.visionPhase as Record<string, unknown> | undefined
            )
            const found = findSceneById(scenesForRefs, sceneId)
            sceneForRefs = found.scene
              ? (found.scene as Record<string, unknown>)
              : undefined
            const beats = sceneForRefs ? getSceneBeats(sceneForRefs) : []
            beat = beats.find((b) => b.beatId === beatId)
          }
          if (
            beat &&
            sceneForRefs &&
            projectForRefs &&
            shouldReplaceClientVideoReferences(beat, referenceImages)
          ) {
            const scenesForIndex = getVisionScriptScenes(
              projectForRefs?.metadata?.visionPhase as Record<string, unknown> | undefined
            )
            const sceneIndex = findSceneById(scenesForIndex, sceneId).index
            const resolved = resolveBeatVideoReferences({
              scene: sceneForRefs,
              beat,
              sceneIndex: sceneIndex >= 0 ? sceneIndex : undefined,
              projectCharacters:
                projectForRefs?.metadata?.visionPhase?.characters ||
                projectForRefs?.metadata?.characters ||
                [],
              locationReferences:
                projectForRefs?.metadata?.visionPhase?.references?.locationReferences || [],
              objectReferences:
                projectForRefs?.metadata?.visionPhase?.references?.objectReferences || [],
            })
            const userLockedReferences = beat.referenceSelection?.source === 'user'
            if (userLockedReferences || resolved.labeledRefs.length > 0) {
              referenceImages = resolved.labeledRefs.map(
                (ref): VeoReferenceImage => ({
                  url: ref.url,
                  type: ref.type,
                  name: ref.name,
                  role: ref.role,
                  characterName: ref.characterName,
                  propName: ref.propName,
                  locationName: ref.locationName,
                  promptToken: ref.promptToken,
                  subjectOrdinal: ref.subjectOrdinal,
                })
              )
              console.log(
                `[Segment Asset Generation] Server-resolved ${referenceImages.length} labeled REF image(s) for beat ${beatId}`
              )
            }
          }
        }
      } catch (relabelError) {
        console.warn(
          '[Segment Asset Generation] Beat reference relabel failed; using client refs:',
          relabelError
        )
      }
    }

    if (
      isBeatFirstPipelineEnabled() &&
      beatId &&
      cachedBeat &&
      cachedScene &&
      cachedProject &&
      (genType === 'T2V' || genType === 'I2V' || generationMethod === 'REF')
    ) {
      try {
        const visionPhase = (cachedProject.metadata?.visionPhase || {}) as Record<string, unknown>
        const beats = getSceneBeats(cachedScene)
        const activeBeats = beats.filter((b) => !isBeatExcluded(b))
        const beatIndex = beats.findIndex((candidate) => candidate.beatId === beatId)
        const activeBeatIndex = activeBeats.findIndex((candidate) => candidate.beatId === beatId)
        const beat = beatIndex >= 0 ? beats[beatIndex] : cachedBeat
        const stateLedger = buildSceneStateLedger(activeBeats)
        const references = ((visionPhase.references || {}) as {
          objectReferences?: Array<{ name?: string; imageUrl?: string }>
          locationReferences?: Array<{ location?: string; name?: string; imageUrl?: string }>
        })
        const projectCharacters =
          (visionPhase.characters as Array<{ id?: string; name?: string }>) || []
        const sceneDirection =
          (cachedScene as { sceneDirection?: unknown; detailedDirection?: unknown }).sceneDirection ??
          (cachedScene as { detailedDirection?: unknown }).detailedDirection ??
          null
        const artStyleId = resolveProjectArtStyle(cachedProject.metadata)
        const musicCue = resolveBeatMusicCue(
          parsePersistedMusicCues(cachedScene.sceneMusicCues, activeBeats),
          Math.max(activeBeatIndex, 0)
        )
        const basePromptForPreflight = englishCompiledPrompt || prompt
        const prepared = await rewriteThinClipPrompt({
          beat,
          beats,
          beatIndex: Math.max(beatIndex, 0),
          prompt: basePromptForPreflight,
          plateNames: plateNamesFromVideoRefs(referenceImages || []),
          expectsCast: expectsUnstatedCast({
            scene: cachedScene,
            beat,
            projectCharacters,
            filmTitle: cachedProject.metadata?.title || cachedProject.title,
            objectReferences: references.objectReferences,
            locationReferences: references.locationReferences,
            promptText: basePromptForPreflight,
          }),
          sceneDirection: sceneDirection as DetailedSceneDirection | null,
          artStyleId,
          previousBeat:
            activeBeatIndex > 0
              ? activeBeats[activeBeatIndex - 1]
              : beatIndex > 0
                ? beats[beatIndex - 1]
                : undefined,
          sceneState: activeBeatIndex >= 0 ? stateLedger[activeBeatIndex] : undefined,
          ...(musicCue ? { musicCue } : {}),
          catalog: buildExpressReferenceCatalog(cachedProject),
        })
        if (
          prepared.beat !== beat ||
          !englishCompiledPrompt ||
          prepared.prompt !== englishCompiledPrompt
        ) {
          const isFrameMethod =
            resolvedGenerationMethod === 'FTV' || resolvedGenerationMethod === 'I2V'
          const recompiledPrompt = isFrameMethod
            ? compileBeatVideoPromptFromDirection(
                prepared.beat,
                sceneDirection as DetailedSceneDirection | null,
                {
                  artStyleId,
                  targetMethod: 'frame',
                  previousBeat:
                    activeBeatIndex > 0
                      ? activeBeats[activeBeatIndex - 1]
                      : beatIndex > 0
                        ? beats[beatIndex - 1]
                        : undefined,
                  sceneState: activeBeatIndex >= 0 ? stateLedger[activeBeatIndex] : undefined,
                  ...(musicCue ? { musicCue } : {}),
                }
              ).prompt
            : prepared.prompt
          prompt = await localizeCompiledBeatPrompt(prepared.beat, recompiledPrompt)
        }
        if (prepared.beat !== beat && beatIndex >= 0) {
          const nextBeats = [...beats]
          nextBeats[beatIndex] = prepared.beat
          const scenes = getVisionScriptScenes(visionPhase)
          const found = findSceneById(scenes, sceneId)
          if (found.scene && found.index >= 0) {
            scenes[found.index] = applyBeatsToScene(found.scene, nextBeats)
            cachedProject.changed('metadata', true)
            await cachedProject.save()
          }
        }
      } catch (preflightError) {
        console.warn(
          '[Segment Asset Generation] Preflight clip rewrite failed; using the compiled prompt:',
          preflightError
        )
      }
    }

    if ((genType === 'T2V' || genType === 'I2V') && String(cachedBeat?.kind) !== 'title') {
      const isLangClip = isLanguageClipTarget(clipLanguage)
      if (effectiveIncludeCaptions) {
        prompt = applyClipCaptionsDirective(prompt, {
          includeCaptions: true,
          spokenLine:
            resolvedTranslatedSpokenLine ||
            extractSpokenLineFromPrompt(prompt) ||
            cachedBeat?.line,
          targetLanguage: isLangClip ? normalizeStreamLanguage(clipLanguage) : 'en',
          kind: cachedBeat?.kind,
        })
        if (negativePrompt) {
          negativePrompt = negativePrompt
            .replace(/\b(?:subtitles|captions|text overlay|on-screen dialogue text)\b\s*,?\s*/gi, '')
            .replace(/,\s*$/, '')
            .trim()
        }
      } else if (isLangClip || includeCaptions === false) {
        prompt = applyClipCaptionsDirective(prompt, {
          includeCaptions: false,
          spokenLine:
            resolvedTranslatedSpokenLine ||
            extractSpokenLineFromPrompt(prompt) ||
            cachedBeat?.line,
          targetLanguage: isLangClip ? normalizeStreamLanguage(clipLanguage) : 'en',
          kind: cachedBeat?.kind,
        })
        const captionNeg = 'subtitles, captions, burned-in text, on-screen dialogue text'
        if (!negativePrompt) {
          negativePrompt = captionNeg
        } else if (!/\bcaptions\b/i.test(negativePrompt)) {
          negativePrompt = `${negativePrompt}, captions, burned-in text, on-screen dialogue text`
        }
      }
    }

    resolvedGenerationMethod = promoteMethodForResolvedRefs(
      resolvedGenerationMethod,
      genType,
      referenceImages?.length ?? 0
    )

    console.log(
      `[Segment Asset Generation] Generating asset for segment: ${segmentId} Type: ${genType} method: ${resolvedGenerationMethod || genType} refs: ${referenceImages?.length ?? 0}`
    )

    let assetUrl: string
    let assetType: 'video' | 'image'
    let lastFrameUrl: string | null = null
    let veoVideoRef: string | undefined = undefined  // Store Veo video reference for video extension
    let veoVideoRefExpiry: string | undefined = undefined  // ISO timestamp when veoVideoRef expires (48 hours)
    let methodSelectionResult: MethodSelectionResult | undefined = undefined
    let stemSeparation: StemSeparationResult | undefined = undefined
    let actualVideoDurationSeconds: number | null = null
    let requestedVideoDurationSeconds: number | undefined = undefined
    let generationProvider: 'vertex' | 'fal' | 'kling' | 'aggregator' | undefined
    let fallbackModelFamily: 'kling' | undefined
    let wasPolicyFallback: boolean | undefined
    let provenanceId: string | undefined
    let contentHash: string | undefined
    let aggregatorVendor: string | undefined
    let responseVideoModel: string | undefined
    let billingModelId: string | undefined
    let modelUpgraded: boolean | undefined
    let effectiveModel: string | undefined
    let upgradeLabel: string | undefined
    let responseResolution: '360p' | '720p' | '1080p' | '4k' | '4K' | undefined
    let responseQualityTier: 'fast' | 'premium' | undefined

    if (genType === 'T2V' || genType === 'I2V') {
      console.log(
        `[Segment Asset Generation] videoProvider=${resolvedVideoProvider} aggregatorEnabled=${isAggregatorEnabled()}`
      )

      if (resolvedVideoProvider === 'aggregator' && !isAggregatorEnabled()) {
        return NextResponse.json(
          {
            error:
              'Multiplatform video is not configured on the server. Set VIDEO_AGGREGATOR_API_KEY in Vercel.',
            code: 'AGGREGATOR_NOT_CONFIGURED',
            routingTrace: buildRoutingTrace('aggregator', 'vertex'),
          },
          { status: 503 }
        )
      }

      if (resolvedVideoProvider === 'aggregator') {
        console.log(
          `[Segment Asset Generation] Using multiplatform aggregator (model=${videoModel || 'default'})`
        )
      } else if (resolvedVideoProvider === 'kling') {
        const catalogModel = klingModel || 'kling-v3-omni'
        console.log(
          `[Segment Asset Generation] Using direct Kling API (catalog=${catalogModel}, api=${resolveKlingApiModelName(catalogModel)})`
        )
      } else {
        console.log('[Segment Asset Generation] Using Gemini Omni Flash for video generation')
        console.log(
          '[Segment Asset Generation] Endpoint status:',
          JSON.stringify(getEndpointStatus(['global']))
        )
      }

      let resolvedElementList = elementList
      let elementBindings: ReturnType<typeof buildElementPromptBindings> | undefined
      let effectivePrompt = prompt

      if (resolvedVideoProvider === 'kling' && beatId && projectId) {
        try {
          if (!cachedProject) {
            await sequelize.authenticate()
            cachedProject = await Project.findByPk(projectId)
          }
          const projectForElements = cachedProject
          const scenesForElements = getVisionScriptScenes(
            projectForElements?.metadata?.visionPhase as Record<string, unknown> | undefined
          )
          const { scene: sceneForElements, index: elementSceneIndex } = findSceneById(scenesForElements, sceneId)
          const beats = sceneForElements
            ? getSceneBeats(sceneForElements as Record<string, unknown>)
            : []
          const beat = beats.find((b) => b.beatId === beatId)
          if (beat && sceneForElements) {
            const visionMeta = (projectForElements?.metadata?.visionPhase || {}) as Record<
              string,
              unknown
            >
            const references = (visionMeta.references || {}) as {
              objectReferences?: unknown[]
              locationReferences?: unknown[]
            }
            const elementSelection = resolveBeatElementSelection({
              scene: sceneForElements,
              beat,
              sceneIndex: elementSceneIndex >= 0 ? elementSceneIndex : undefined,
              projectCharacters:
                (visionMeta.characters as Array<{ id?: string; name?: string }>) || [],
              locationReferences: (references.locationReferences || []) as never[],
              objectReferences: (references.objectReferences || []) as never[],
            })
            const sources = collectKlingElementSources({
              characters: (visionMeta.characters as never[]) || [],
              characterIds: elementSelection.characterIds,
              characterWardrobes: elementSelection.characterWardrobes,
              objectReferences: (references.objectReferences || []) as never[],
              objectRefIds: elementSelection.objectRefIds,
              locationReferences: (references.locationReferences || []) as never[],
              locationRefId: elementSelection.locationRefId,
              locationVersionId: elementSelection.locationVersionId,
            })
            const resolvedElements = await resolveKlingElementsFromSources(
              sources,
              klingModel
            )
            if (resolvedElements.elementIds.length) {
              resolvedElementList = [
                ...(resolvedElementList || []),
                ...resolvedElements.elementIds,
              ]
              elementBindings = buildElementPromptBindings(sources, resolvedElements.bindings)
            }
            if (resolvedElements.newRegistrations.length) {
              await persistKlingElementIdsToProject(
                projectId,
                resolvedElements.newRegistrations
              )
            }
          }
        } catch (elementErr) {
          console.warn('[Segment Asset Generation] Kling element resolution failed:', elementErr)
        }
      }

      const referenceImageCount = referenceImages?.length ?? 0
      const previewDuration = duration ?? 10
      const previewQuote = resolvedVideoProvider === 'kling'
        ? await resolveGenerationQuote({
            kind: 'clip',
            provider: 'kling',
            model: klingModel,
            resolution: klingQuality === 'std' ? '720p' : klingQuality === '4k' ? '4k' : resolution || '1080p',
            durationSeconds: previewDuration,
            audio: sound !== false,
            referenceImageCount,
            userKeyUsed,
          })
        : resolvedVideoProvider === 'vertex'
          ? await resolveGenerationQuote({
              kind: 'clip',
              provider: 'google_vertex',
              model: videoModel || undefined,
              resolution: resolution || (qualityTier === 'premium' ? '1080p' : '720p'),
              durationSeconds: previewDuration,
              audio: true,
              referenceImageCount,
              userKeyUsed,
            })
          : null
      const previewCredits = previewQuote
        ? previewQuote.credits
        : getAggregatorCreditsForModel(videoModel || '', previewDuration)
      const hasPreviewCredits = await CreditService.ensureCredits(dbUserId, previewCredits)
      if (!hasPreviewCredits) {
        return NextResponse.json(
          {
            error: 'Insufficient credits',
            code: 'INSUFFICIENT_CREDITS',
            required: previewCredits,
          },
          { status: 402 }
        )
      }

      const videoResult = await runInVideoGenerationGate(() => generateSegmentVideoCore({
        segmentId,
        projectId,
        sceneId,
        userId: dbUserId,
        prompt: effectivePrompt,
        negativePrompt,
        genType,
        generationMethod: resolvedGenerationMethod,
        startFrameUrl,
        endFrameUrl,
        sourceVideoUrl,
        previousSegmentVeoRef,
        previousSegmentVeoRefExpiry,
        previousSegmentAssetUrl,
        previousSegmentLastFrameUrl,
        referenceImages,
        sceneImageUrl,
        segmentIndex,
        totalSegments,
        duration,
        aspectRatio,
        resolution,
        frameRate,
        thinkingLevel,
        omniMultiShot,
        qualityTier,
        guidePrompt,
        isEstablishingShot,
        audioContext,
        existingStemSourceAudioUrl,
        existingStemSourceHash,
        existingStemStatus,
        existingStemJobId,
        requireVeoRefForExt:
          resolvedGenerationMethod === 'EXT' &&
          !sourceVideoUrl &&
          !previousSegmentVeoRef &&
          resolvedVideoProvider === 'vertex',
        apiPromptOverride,
        allowPolicyFallback: allowPolicyFallback === true,
        videoProvider: resolvedVideoProvider,
        videoModel,
        klingModel,
        klingQuality,
        cfgScale,
        sound,
        watermarkEnabled,
        elementList: resolvedElementList,
        elementBindings,
        voiceList,
        multiShot,
        shotType,
        multiPrompt,
        preset: preset as GenerateAssetRequest['preset'],
        allowVeoFallback: allowVeoFallback === true,
        expressMode: expressMode === true,
        useBeatFrameAsStart: useBeatFrameAsStart === true,
      }))

      assetUrl = videoResult.assetUrl
      assetType = videoResult.assetType
      lastFrameUrl = videoResult.lastFrameUrl
      veoVideoRef = videoResult.veoVideoRef
      veoVideoRefExpiry = videoResult.veoVideoRefExpiry
      methodSelectionResult = videoResult.methodSelection
      stemSeparation = videoResult.stemSeparation
      actualVideoDurationSeconds = videoResult.actualDurationSeconds ?? null
      requestedVideoDurationSeconds = videoResult.requestedDurationSeconds
      generationProvider = videoResult.generationProvider
      fallbackModelFamily = videoResult.fallbackModelFamily
      wasPolicyFallback = videoResult.wasPolicyFallback
      provenanceId = videoResult.provenanceId
      contentHash = videoResult.contentHash
      aggregatorVendor = videoResult.aggregatorVendor
      responseVideoModel = videoResult.videoModel
      billingModelId = videoResult.billingModelId
      modelUpgraded = videoResult.modelUpgraded
      effectiveModel = videoResult.effectiveAggregatorType
      upgradeLabel = videoResult.upgradeLabel
      responseResolution = videoResult.resolution
      responseQualityTier = videoResult.qualityTier

      const billedDuration = requestedVideoDurationSeconds ?? duration ?? 10
      const billedUserId = dbUserId

      if (generationProvider === 'kling') {
        await quoteAndCharge({
          userId: billedUserId,
          projectId,
          segmentId,
          quoteInput: {
            kind: 'clip',
            provider: 'kling',
            model: videoResult.klingModel || klingModel,
            resolution: klingQuality === 'std' ? '720p' : klingQuality === '4k' ? '4k' : resolution || '1080p',
            durationSeconds: billedDuration,
            audio: sound !== false,
            referenceImageCount,
            userKeyUsed,
          },
          meta: {
            generationProvider: 'kling',
            klingModel: videoResult.klingModel || klingModel,
            ...(videoResult.wasVeoFallback ? { wasVeoFallback: true } : {}),
          },
        })
      }

      if (wasPolicyFallback && generationProvider !== 'kling') {
        const klingCredits =
          billedDuration >= 8
            ? VIDEO_CREDITS.KLING_VIDEO_10S
            : VIDEO_CREDITS.KLING_VIDEO_5S
        await CreditService.charge(billedUserId, klingCredits, 'ai_usage', projectId, {
          operation: 'fal_kling_video',
          segmentId,
          generationProvider: generationProvider ?? 'fal',
        })
        await logProviderCost({
          userId: billedUserId,
          operation: 'fal_kling_video',
          provider: 'sceneflow-ai',
          model: 'fal-kling',
          creditsCharged: klingCredits,
          providerCostUsd: billedDuration >= 8 ? 1.1 : 0.65,
          marginPercent: 0,
          videoDurationSec: billedDuration,
          projectId,
          segmentId,
          timestamp: new Date(),
        })
      }

      if (generationProvider === 'aggregator' && videoModel) {
        const creditsModelId = billingModelId ?? videoModel
        const aggCredits = getAggregatorCreditsForModel(creditsModelId, billedDuration)
        const aggModel = getAggregatorModel(creditsModelId)
        await CreditService.charge(billedUserId, aggCredits, 'ai_usage', projectId, {
          operation: 'aggregator_video',
          segmentId,
          videoModel: creditsModelId,
          generationProvider: 'aggregator',
          ...(modelUpgraded ? { modelUpgraded: true, selectedVideoModel: videoModel } : {}),
        })
        await logProviderCost({
          userId: billedUserId,
          operation: 'aggregator_video',
          provider: 'sceneflow-ai',
          model: creditsModelId,
          creditsCharged: aggCredits,
          providerCostUsd: (aggModel?.costPerSecondUsd ?? 0.08) * Math.max(4, billedDuration),
          marginPercent: 0,
          videoDurationSec: billedDuration,
          projectId,
          segmentId,
          timestamp: new Date(),
        })
      }

      if (generationProvider === 'vertex' && !wasPolicyFallback) {
        await quoteAndCharge({
          userId: billedUserId,
          projectId,
          segmentId,
          quoteInput: {
            kind: 'clip',
            provider: 'google_vertex',
            model: responseVideoModel || videoModel || undefined,
            resolution: resolution || (qualityTier === 'premium' ? '1080p' : '720p'),
            durationSeconds: billedDuration,
            audio: true,
            referenceImageCount,
            userKeyUsed,
          },
          meta: {
            generationProvider: 'vertex',
            qualityTier: qualityTier || 'fast',
          },
        })
      }

    } else if (genType === 'T2I') {
      // Image generation using Gemini API
      const base64Image = await generateImageWithGemini(prompt, {
        aspectRatio: '16:9',
        numberOfImages: 1,
        imageSize: '2K',
        // TODO: Add reference images support when available
      })

      assetUrl = await uploadImageToBlob(
        base64Image,
        `segments/${segmentId}-${Date.now()}.png`
      )
      assetType = 'image'

      try {
        await quoteAndCharge({
          userId: dbUserId,
          projectId,
          segmentId,
          quoteInput: {
            kind: 'still',
            imageCount: 1,
            floorCredits: IMAGE_CREDITS.IMAGEN_4,
            userKeyUsed,
          },
          meta: { label: 'segment_still' },
        })
      } catch (chargeError: unknown) {
        console.error('[Segment Asset Generation] Failed to charge still credits:', chargeError)
      }

    } else {
      return NextResponse.json(
        { error: 'UPLOAD type should be handled via upload endpoint' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      segmentId,
      assetUrl,
      assetType,
      effectivePrompt: prompt,
      lastFrameUrl,
      veoVideoRef,  // Gemini Files API reference for video extension
      veoVideoRefExpiry,  // ISO timestamp when veoVideoRef expires (48 hours from generation)
      status: assetType === 'video' && assetUrl.startsWith('job:') ? 'QUEUED' : 'COMPLETE',
      jobId: assetType === 'video' && assetUrl.startsWith('job:') ? assetUrl.replace('job:', '') : undefined,
      requestedDurationSeconds: requestedVideoDurationSeconds,
      actualDurationSeconds: actualVideoDurationSeconds ?? undefined,
      resolution: responseResolution,
      qualityTier: responseQualityTier,
      // Method selection info for UI feedback
      methodSelection: methodSelectionResult ? {
        method: methodSelectionResult.method,
        confidence: methodSelectionResult.confidence,
        reasoning: methodSelectionResult.reasoning,
        warnings: methodSelectionResult.warnings,
      } : undefined,
      stemSeparation,
      generationProvider,
      fallbackModelFamily,
      wasPolicyFallback,
      usedBackupEngine: wasPolicyFallback === true,
      provenanceId,
      contentHash,
      videoModel: responseVideoModel,
      billingModelId,
      modelUpgraded,
      effectiveModel,
      upgradeLabel,
      aggregatorVendor,
      routingTrace: buildRoutingTrace(
        resolvedVideoProvider,
        generationProvider === 'aggregator' ? 'aggregator' : 'vertex'
      ),
    })
  } catch (error: any) {
    console.error('[Segment Asset Generation] Error:', error)

    if (error instanceof SegmentVideoKlingAsyncError) {
      return NextResponse.json(
        {
          success: true,
          status: 'PROCESSING',
          segmentId: (await params).segmentId,
          klingJobId: error.jobId,
          generationProvider: 'kling',
          klingModel: error.modelName,
        },
        { status: 202 }
      )
    }

    if (error instanceof SegmentVideoKlingNotConfiguredError) {
      return NextResponse.json(
        {
          error: error.message,
          code: 'KLING_NOT_CONFIGURED',
          routingTrace: buildRoutingTrace('kling', 'vertex'),
        },
        { status: 503 }
      )
    }

    if (error instanceof SegmentVideoAggregatorAsyncError) {
      return NextResponse.json(
        {
          success: true,
          status: 'PROCESSING',
          segmentId: (await params).segmentId,
          aggregatorJobId: error.jobId,
          generationProvider: 'aggregator',
          aggregatorVendor: error.vendor,
          videoModel: requestBody.videoModel,
        },
        { status: 202 }
      )
    }

    if (error instanceof SegmentVideoAggregatorNotConfiguredError) {
      return NextResponse.json(
        {
          error: error.message,
          code: 'AGGREGATOR_NOT_CONFIGURED',
          routingTrace: buildRoutingTrace(
            requestBody.videoProvider === 'aggregator' ? 'aggregator' : 'vertex',
            'vertex'
          ),
        },
        { status: 503 }
      )
    }

    if (error instanceof SegmentVideoRateLimitError) {
      const classified = classifyVertexRateLimitHttp(error.message)
      const retryAfter = classified?.retryAfter ?? error.retryAfter
      return NextResponse.json(
        {
          error: error.message,
          retryAfter,
          isRateLimited: true,
        },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } }
      )
    }

    if (error instanceof SegmentVideoExtRefRequiredError) {
      return NextResponse.json(
        {
          error: error.message,
          code: 'VEO_EXT_REF_REQUIRED',
        },
        { status: 400 }
      )
    }

    if (error instanceof KlingSafetyGuardBlockedError) {
      return NextResponse.json(
        {
          error: error.message,
          code: 'CONTENT_POLICY_VIOLATION',
          blocked: true,
          categories: error.flaggedCategories,
          source: 'kling_hive_guard',
        },
        { status: 422 }
      )
    }
    
    // Parse and simplify Vertex AI error messages
    let errorMessage = error.message || 'Failed to generate asset'
    let statusCode = 500
    let retryAfter: number | undefined = undefined

    const vertexRateLimit = classifyVertexRateLimitHttp(errorMessage)
    if (vertexRateLimit) {
      return NextResponse.json(
        {
          error: vertexRateLimit.error,
          retryAfter: vertexRateLimit.retryAfter,
          isRateLimited: true,
          routingTrace: buildRoutingTrace(
            requestBody.videoProvider === 'aggregator' ? 'aggregator' : 'vertex',
            requestBody.videoProvider === 'aggregator' && isAggregatorEnabled()
              ? 'aggregator'
              : 'vertex'
          ),
        },
        { status: vertexRateLimit.status, headers: vertexRateLimit.headers }
      )
    }
    
    // Extract cleaner error from Vertex AI JSON responses
    if (errorMessage.includes('Vertex AI error')) {
      try {
        // Try to parse the JSON error from Vertex AI
        const jsonMatch = errorMessage.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0])
          if (parsed.error?.message) {
            errorMessage = `Vertex AI: ${parsed.error.message}`
          }
        }
      } catch {
        // Keep original message if parsing fails
      }
    }
    
    // Handle common error types with user-friendly messages
    const originalErrorMessage = errorMessage // Preserve original for details
    // Determine the effective generation method for error context
    const effectiveGenerationMethod = requestBody.generationMethod || requestBody.genType
    const isFTVMethod = effectiveGenerationMethod === 'FTV'
    const hasMultipleFrames = !!(requestBody.startFrameUrl && requestBody.endFrameUrl)
    
    const errLow = errorMessage.toLowerCase()
    const isAggregatorRequest = requestBody.videoProvider === 'aggregator'

    if (
      !isAggregatorRequest &&
      (errorMessage.includes('Content Safety Filter') ||
        errorMessage.includes('Content Policy') ||
        errLow.includes('safety filter') ||
        errorMessage.includes('filtered') ||
        errorMessage.includes('violate') ||
        errorMessage.includes('usage guidelines'))
    ) {
      statusCode = 422 // Unprocessable Entity - indicates content issue, not server error

      const hints: string[] = [
        'Vertex reviews the full request: your text plus any start frame, end frame, or reference images. Dramatic abstract visuals are sometimes misread as explosions or harm—even when the frames were AI-generated.',
        'Preflight may show Low Risk while Vertex still blocks — different classifiers. Server uses VEO_SAFETY_SETTING (default block_only_high). Expand “Vertex RAI / safety details” when present to see categories and probabilities.',
        'If you used Frame-to-Video, try Image-to-Video with only the start frame, or swap one of the keyframes.',
        'If you used reference images, try Text-to-Video without them.',
        'You were not charged for a completed clip when the request is blocked; optional wording fixes below are suggestions only.',
      ]
      if (requestBody.allowPolicyFallback !== true) {
        hints.push(
          'Enable "Allow backup engine if blocked" in generation settings to try an alternate video provider when Vertex rejects the prompt.'
        )
      }

      const optionalSanitized: { prompt?: string; guidePrompt?: string } = {}
      const changeAcc: string[] = []
      if (requestBody.prompt?.trim()) {
        const sp = autoSanitizePrompt(requestBody.prompt, { logChanges: false })
        if (sp.wasModified) {
          optionalSanitized.prompt = sp.sanitizedPrompt
          changeAcc.push(...sp.changes)
        }
      }
      if (requestBody.guidePrompt?.trim()) {
        const sg = autoSanitizePrompt(requestBody.guidePrompt, { logChanges: false })
        if (sg.wasModified) {
          optionalSanitized.guidePrompt = sg.sanitizedPrompt
          changeAcc.push(...sg.changes)
        }
      }
      const sanitizationChanges = changeAcc.length > 0 ? changeAcc : undefined
      const optionalSanitizedOut =
        optionalSanitized.prompt || optionalSanitized.guidePrompt ? optionalSanitized : undefined

      if (isFTVMethod || hasMultipleFrames) {
        errorMessage =
          'Content policy: Vertex blocked this generation. For Frame-to-Video, filters often react to the pair of images or the imagined transition—not only your text. Try Image-to-Video with the start frame, change a keyframe, or use optional wording suggestions if they help.'
      } else {
        errorMessage =
          'Content policy: Vertex blocked this generation. The trigger may be your text or a reference/start image. Try optional wording suggestions, remove reference images, or simplify the prompt.'
      }

      const vertexRaiDetails = extractVeoRaiDetailsFromErrorString(originalErrorMessage) || undefined

      return NextResponse.json(
        {
          error: errorMessage,
          retryAfter,
          isRateLimited: false,
          code: 'CONTENT_POLICY_VIOLATION',
          generationMethod: effectiveGenerationMethod,
          isFTVRelated: isFTVMethod || hasMultipleFrames,
          suggestion: isFTVMethod || hasMultipleFrames ? 'RETRY_I2V' : 'REPHRASE_PROMPT',
          retryI2VData:
            (isFTVMethod || hasMultipleFrames) && requestBody.startFrameUrl
              ? {
                  startFrameUrl: requestBody.startFrameUrl,
                  prompt: requestBody.prompt,
                }
              : undefined,
          hints,
          optionalSanitized: optionalSanitizedOut,
          sanitizationChanges,
          vertexDetails: originalErrorMessage,
          /** Parsed categories / probabilities when includeRaiReason is enabled on Veo */
          vertexRaiDetails,
          details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined,
        },
        { status: 422 }
      )
    } else if (errorMessage.includes('Vertex AI Interactions error 400')) {
      statusCode = 400
    } else if (errorMessage.includes('Invalid JSON payload') || errorMessage.includes('INVALID_ARGUMENT')) {
      errorMessage = 'API Error: Invalid request format. Please try a different generation method.'
    } else if (errorMessage.includes('timeout') || errorMessage.includes('DEADLINE_EXCEEDED')) {
      errorMessage = 'Request timed out. The video generation is taking too long. Please try again.'
    }
    
    return NextResponse.json(
      {
        error: errorMessage,
        retryAfter,
        isRateLimited: statusCode === 429,
        routingTrace: buildRoutingTrace(
          requestBody.videoProvider === 'aggregator' ? 'aggregator' : 'vertex',
          requestBody.videoProvider === 'aggregator' && isAggregatorEnabled()
            ? 'aggregator'
            : 'vertex'
        ),
        ...(isAggregatorRequest
          ? {
              code: 'AGGREGATOR_GENERATION_FAILED',
              generationProvider: 'aggregator' as const,
              videoModel: requestBody.videoModel,
              hints: [
                'This request was routed to the multiplatform (Renderful) provider, not Google Veo.',
                'Check Vercel logs for Renderful submit/poll errors.',
              ],
            }
          : {}),
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined,
      },
      { status: statusCode }
    )
  }
}


