'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  Download,
  Bot,
  ChevronDown,
  ChevronUp,
  Film,
  Loader2,
  Play,
  Sparkles,
  Square,
  Clapperboard,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { AudienceDescriptionField } from '@/components/audience/AudienceDescriptionField'
import { PromoPlanDirectorDialog } from '@/components/publishing/PromoPlanDirectorDialog'
import { getLanguageDisplayName } from '@/lib/publish/buildLanguageAudioTrack'
import { collectPromoPlanFindings, type PromoPlanFinding } from '@/lib/publish/promoPlanFindings'
import { buildPromoShotCatalog, isOptimizedShotDirection, slimPromoProductionState } from '@/lib/publish/promoShotCatalog'
import {
  movePromoShot,
  placePromoShot,
  promoShotIncluded,
  promoShotKey,
  promoWatermarkEnabled,
  withPromoShotDuration,
  withPromoShotIncluded,
} from '@/lib/publish/promoTimeline'
import { DEFAULT_TRAILER_SEC } from '@/lib/publish/trailerPlanner'
import { resolvePromoPlayback, promoPlanForLanguage } from '@/lib/publish/promoBeatMedia'
import { buildPromoPreviewSequence } from '@/lib/publish/promoPreviewSequence'
import { parsePromoRenderBody, pollPromoRenderJob } from '@/lib/publish/promoRenderPoll'
import { getPublishingState, upsertPublishingState } from '@/lib/publish/publishingState'
import { promoFrameClass, resolvePromoFrameAspect } from '@/lib/publish/promoFrame'
import {
  promoAgentShotNeedsGeneration,
  promoAssetForLanguage,
  promoLanguageName,
  seedPromoAudience,
  upsertPromoLanguageTrailer,
  type PromoAgentRunRequest,
  type PromoBeatClipRequest,
} from '@/lib/publish/promoLanguage'
import { PromoCutPreview } from '@/components/publishing/PromoCutPreview'
import { findPromoSceneIndex, isPromoCinematicScene } from '@/lib/publish/buildPromoScene'
import { getSceneBeats } from '@/lib/script/beatMigration'
import { treatmentBeatsFromMetadata } from '@/lib/script/sceneDecomposition'
import { isLanguageClipTarget } from '@/lib/scene/languageClipVersions'
import {
  directShotNumber,
  resolveDirectShotTarget,
  type DirectShotRequest,
} from '@/lib/vision/directShotTarget'
import { LANGUAGE_CONFIGS } from '@/lib/types/finalCut'
import type { AudienceDefinition } from '@/lib/types/audienceResonance'
import type { PromoTrailerBeatPlan, PromoTrailerAsset, ProjectPublishingPromo } from '@/types/publishingAssets'
import type { ProjectStream } from '@/lib/streams/projectStreams'
import type { SceneProductionData } from '@/components/vision/scene-production/types'

export interface PublishingPromoTabProps {
  projectId: string
  projectTitle?: string
  metadata: unknown
  script?: unknown
  streams: ProjectStream[]
  userId?: string
  sceneProductionState?: Record<string, SceneProductionData>
  onSaveMetadata: (metadata: Record<string, unknown>) => Promise<void>
  /** Apply updated script scenes after promo upsert / audio. */
  onScriptScenesUpdated?: (scenes: unknown[]) => void
  /** Jump to Screening Room Promo mode after render. */
  onPreviewPromo?: (language?: string) => void
  /** Focus the promo scene in Studio / Director Console. */
  onOpenPromoInStudio?: (sceneId: string) => void
  /** Generate a source-frame clip, or a translated dialogue clip when clipLanguage is set. */
  onGenerateBeatClip?: (input: PromoBeatClipRequest) => Promise<void>
  /** Produce missing plan clips, narration, and music. The run lives on the page. */
  onRunPromoAgent?: (input: PromoAgentRunRequest) => Promise<void>
  /** Open this shot in Studio's Direct Shot dialog. */
  onOpenDirectShot?: (input: DirectShotRequest) => void
  /** Rewrite a source shot with Direct Shot optimize before it is generated. */
  onOptimizeDirection?: (input: DirectShotRequest & { policyBlocked?: boolean }) => Promise<void>
}

const TARGET_OPTIONS = [30, 45, 60, 90, 120] as const
type PromoDuration = (typeof TARGET_OPTIONS)[number]

function isPromoDuration(value: unknown): value is PromoDuration {
  return typeof value === 'number' && (TARGET_OPTIONS as readonly number[]).includes(value)
}

function initialDuration(metadata: unknown): PromoDuration {
  const stored = getPublishingState(metadata).promo?.targetDurationSec
  return isPromoDuration(stored) ? stored : DEFAULT_TRAILER_SEC
}

function sourceDirectionOptimized(scenes: unknown[], beat: PromoTrailerBeatPlan): boolean {
  const scene = scenes[beat.sceneIndex]
  if (!scene || typeof scene !== 'object') return false
  const source = getSceneBeats(scene as Record<string, unknown>).find(
    (entry) => entry.beatId === beat.beatId
  )
  return isOptimizedShotDirection(source?.beatDirection)
}

function narrationTrackFor(
  scene: Record<string, unknown> | null,
  language: string
): { audioUrl?: string; line?: string } | undefined {
  const tracks = scene?.dialogueAudio as
    | Record<string, Array<{ audioUrl?: string; line?: string }>>
    | undefined
  const track = tracks?.[language]?.[0]
  return track && typeof track === 'object' ? track : undefined
}

function narrationUrlFor(scene: Record<string, unknown> | null, language: string): string | undefined {
  const url = narrationTrackFor(scene, language)?.audioUrl
  return typeof url === 'string' && url.trim() ? url : undefined
}

function narrationLineFor(scene: Record<string, unknown> | null, language: string): string | undefined {
  const line = narrationTrackFor(scene, language)?.line
  return typeof line === 'string' && line.trim() ? line.trim() : undefined
}

function PromoAudioRow({
  label,
  detail,
  ready,
  generating,
  disabled,
  onGenerate,
}: {
  label: string
  detail?: string
  ready: boolean
  generating: boolean
  disabled: boolean
  onGenerate: () => void
}) {
  return (
    <div className="flex items-center gap-2 rounded border border-zinc-800 bg-zinc-950/80 px-2 py-1.5">
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-zinc-100">
          {label}
          <span className={cn('ml-2', ready ? 'text-zinc-500' : 'text-amber-300')}>
            {ready ? 'Ready' : 'Needed'}
          </span>
        </p>
        {detail ? <p className="truncate text-[10px] text-zinc-500">{detail}</p> : null}
      </div>
      <Button
        size="sm"
        variant="outline"
        className="h-7 shrink-0 px-2 text-[10px]"
        disabled={disabled}
        title={ready ? `Regenerate ${label.toLowerCase()}` : `Generate ${label.toLowerCase()}`}
        onClick={onGenerate}
      >
        {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : ready ? 'Regen' : 'Generate'}
      </Button>
    </div>
  )
}

export function PublishingPromoTab({
  projectId,
  projectTitle,
  metadata,
  script,
  streams,
  userId,
  sceneProductionState,
  onSaveMetadata,
  onScriptScenesUpdated,
  onPreviewPromo,
  onOpenPromoInStudio,
  onGenerateBeatClip,
  onRunPromoAgent,
  onOpenDirectShot,
  onOptimizeDirection,
}: PublishingPromoTabProps) {
  const [targetDuration, setTargetDuration] = useState<PromoDuration>(() => initialDuration(metadata))
  const [audience, setAudience] = useState<AudienceDefinition>(() => seedPromoAudience(metadata))
  const [language, setLanguage] = useState('en')
  const [extraLanguages, setExtraLanguages] = useState<string[]>([])
  const [beatPlan, setBeatPlan] = useState<PromoTrailerBeatPlan[]>([])
  const [planning, setPlanning] = useState(false)
  const [rendering, setRendering] = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const [generatingBeatKey, setGeneratingBeatKey] = useState<string | null>(null)
  const [audioGenerating, setAudioGenerating] = useState<'narration' | 'music' | null>(null)
  const [agentRunning, setAgentRunning] = useState(false)
  const [directorOpen, setDirectorOpen] = useState(false)
  const [analysis, setAnalysis] = useState<PromoPlanFinding[] | null>(null)
  const [optimizingKey, setOptimizingKey] = useState<string | null>(null)
  const [brokenBeatKeys, setBrokenBeatKeys] = useState<Set<string>>(() => new Set())
  const [watermarkEnabled, setWatermarkEnabled] = useState(() =>
    promoWatermarkEnabled(getPublishingState(metadata).promo?.watermarkEnabled)
  )
  const [addShotKey, setAddShotKey] = useState('')
  const [addPosition, setAddPosition] = useState(1)
  const [timelineSaving, setTimelineSaving] = useState(false)
  const metadataRef = useRef(metadata)
  metadataRef.current = metadata
  const saveRef = useRef(onSaveMetadata)
  saveRef.current = onSaveMetadata
  const skipOptionPersist = useRef(true)

  const publishingState = useMemo(() => getPublishingState(metadata), [metadata])
  const aspect = useMemo(() => resolvePromoFrameAspect(metadata), [metadata])

  const scenes = useMemo(() => {
    const s = script as { script?: { scenes?: unknown[] }; scenes?: unknown[] } | undefined
    return s?.script?.scenes ?? s?.scenes ?? []
  }, [script])

  const promoScene = useMemo(() => {
    const idx = findPromoSceneIndex(scenes)
    return idx >= 0 ? (scenes[idx] as Record<string, unknown>) : null
  }, [scenes])

  const languages = useMemo(() => {
    const codes = new Set<string>(['en', language, ...extraLanguages])
    for (const stream of streams) {
      if (stream.language) codes.add(stream.language)
    }
    for (const code of publishingState.promo?.languages || []) codes.add(code)
    const audio = promoScene?.dialogueAudio
    if (audio && typeof audio === 'object') {
      for (const code of Object.keys(audio as object)) codes.add(code)
    }
    for (const code of Object.keys(publishingState.promo?.trailersByLanguage || {})) codes.add(code)
    return Array.from(codes)
      .filter(Boolean)
      .sort((a, b) => {
        if (a === 'en') return -1
        if (b === 'en') return 1
        return getLanguageDisplayName(a).localeCompare(getLanguageDisplayName(b))
      })
  }, [language, extraLanguages, streams, publishingState.promo, promoScene])

  const languageKey = languages.join(',')
  const languagesRef = useRef(languages)
  languagesRef.current = languages

  const addableLanguages = useMemo(
    () =>
      Object.keys(LANGUAGE_CONFIGS)
        .filter((code) => !languages.includes(code))
        .sort((a, b) => getLanguageDisplayName(a).localeCompare(getLanguageDisplayName(b))),
    [languages]
  )

  useEffect(() => {
    if (skipOptionPersist.current) {
      skipOptionPersist.current = false
      return
    }
    const timer = window.setTimeout(() => {
      const current = getPublishingState(metadataRef.current).promo || {}
      const nextPromo: ProjectPublishingPromo = {
        ...current,
        targetDurationSec: targetDuration,
        aspect,
        languages: languagesRef.current,
        watermarkEnabled,
      }
      if (audience.description.trim()) nextPromo.audienceDefinition = audience
      else delete nextPromo.audienceDefinition
      void saveRef.current(
        upsertPublishingState((metadataRef.current as Record<string, unknown>) || {}, {
          promo: nextPromo,
        })
      )
    }, 700)
    return () => window.clearTimeout(timer)
  }, [audience, targetDuration, languageKey, aspect, watermarkEnabled])

  const timelineBeats = useMemo(() => {
    if (beatPlan.length > 0) return beatPlan
    const stored = promoScene?.promoBeatPlan
    return Array.isArray(stored) ? (stored as PromoTrailerBeatPlan[]) : []
  }, [beatPlan, promoScene])

  const liveFindings = useMemo(() => {
    if (timelineBeats.length === 0) return []
    const vision = (metadata as { visionPhase?: Record<string, unknown> } | null)?.visionPhase
    const references = (vision?.references as Record<string, unknown> | undefined) ?? {}
    return collectPromoPlanFindings({
      scenes,
      beatPlan: timelineBeats.filter((beat) => promoShotIncluded(beat)),
      sceneProductionState: sceneProductionState as Record<string, unknown> | undefined,
      blueprintBeats: treatmentBeatsFromMetadata(metadata as Record<string, unknown> | null),
      characters: Array.isArray(vision?.characters) ? vision.characters : [],
      locationReferences: Array.isArray(references.locationReferences)
        ? references.locationReferences
        : [],
      objectReferences: Array.isArray(references.objectReferences)
        ? references.objectReferences
        : [],
    })
  }, [timelineBeats, scenes, sceneProductionState, metadata])
  const directorFindings = analysis ?? liveFindings

  const timelineRows = useMemo(
    () =>
      timelineBeats.map((beat) => {
        const target = resolveDirectShotTarget(scenes, {
          sceneId: beat.sceneId,
          sceneIndex: beat.sceneIndex,
          beatId: beat.beatId,
        })
        const playback = resolvePromoPlayback(
          beat,
          sceneProductionState as Record<string, unknown> | undefined,
          language
        )
        return {
          beat,
          key: `${beat.sceneIndex}-${beat.beatId}`,
          playback,
          sceneNumber: (target?.sceneIndex ?? beat.sceneIndex) + 1,
          shotNumber: target ? directShotNumber(scenes[target.sceneIndex], beat.beatId) : null,
        }
      }),
    [timelineBeats, sceneProductionState, scenes, language]
  )

  const includedRows = timelineRows.filter((row) => promoShotIncluded(row.beat))

  const readyClipCount = includedRows.filter(
    (row) => row.playback.hasClip && !brokenBeatKeys.has(row.key)
  ).length

  const dialogueGaps = includedRows.filter(
    (row) =>
      isLanguageClipTarget(language) &&
      row.beat.beatKind === 'dialogue' &&
      !row.playback.hasLanguageClip
  ).length

  const previewShots = useMemo(
    () =>
      buildPromoPreviewSequence(
        timelineRows.filter(({ beat }) => promoShotIncluded(beat)).map(({ beat, key, playback }) => ({
          key,
          label: beat.label,
          durationSec: beat.durationSec ?? Math.max(0, beat.endSec - beat.startSec),
          videoUrl: playback.hasClip && !brokenBeatKeys.has(key) ? playback.videoUrl : undefined,
          imageUrl: brokenBeatKeys.has(key) ? undefined : playback.thumbnailUrl || beat.frameUrl,
          beatKind: beat.beatKind,
        }))
      ),
    [timelineRows, brokenBeatKeys]
  )

  const narrationAudioUrl = narrationUrlFor(promoScene, language)
  const musicAudioUrl = typeof promoScene?.musicAudio === 'string' ? promoScene.musicAudio : undefined
  const activeTrailer = promoAssetForLanguage(publishingState.promo, language)

  const markBeatBroken = useCallback((key: string) => {
    setBrokenBeatKeys((prev) => {
      if (prev.has(key)) return prev
      const next = new Set(prev)
      next.add(key)
      return next
    })
  }, [])

  const sceneScores = useMemo(() => {
    const review = (metadata as { audienceReview?: { sceneScores?: Record<number, number> } })
      ?.audienceReview
    return review?.sceneScores
  }, [metadata])

  const applyScenes = useCallback(
    (nextScenes: unknown[], nextMetadata?: Record<string, unknown>) => {
      onScriptScenesUpdated?.(nextScenes)
      if (nextMetadata) {
        metadataRef.current = nextMetadata
        void onSaveMetadata(nextMetadata)
      }
    },
    [onScriptScenesUpdated, onSaveMetadata]
  )

  const audiencePayload = audience.description.trim() ? audience : undefined

  const postScene = useCallback(
    async (action: 'plan' | 'upsert' | 'timeline' | 'narration' | 'music', beatPlanBody?: PromoTrailerBeatPlan[]) => {
      const res = await fetch('/api/publish/promo/scene', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          action,
          targetDurationSec: targetDuration,
          language,
          aspect,
          audienceDefinition: audiencePayload,
          sceneScores,
          scenes,
          sceneProductionState: slimPromoProductionState(sceneProductionState),
          ...(beatPlanBody?.length &&
          (action === 'plan' || action === 'upsert' || action === 'timeline')
            ? { beatPlan: beatPlanBody }
            : {}),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Promo request failed')
      if (Array.isArray(data.beatPlan)) setBeatPlan(data.beatPlan)
      if (Array.isArray(data.analysis)) setAnalysis(data.analysis as PromoPlanFinding[])
      if (Array.isArray(data.scenes)) applyScenes(data.scenes, data.metadata)
      else if (data.metadata) {
        metadataRef.current = data.metadata
        await onSaveMetadata(data.metadata)
      }
      return data as {
        beatPlan?: PromoTrailerBeatPlan[]
        totalDurationSec?: number
        source?: string
        analysis?: PromoPlanFinding[]
      }
    },
    [
      projectId,
      targetDuration,
      language,
      aspect,
      audiencePayload,
      sceneScores,
      scenes,
      sceneProductionState,
      applyScenes,
      onSaveMetadata,
    ]
  )

  const shotCatalog = useMemo(
    () =>
      buildPromoShotCatalog({
        scenes,
        sceneProductionState: sceneProductionState as Record<string, unknown> | undefined,
      }),
    [scenes, sceneProductionState]
  )

  const commitTimeline = useCallback(
    async (next: PromoTrailerBeatPlan[]) => {
      const previous = timelineBeats
      setBeatPlan(next)
      setTimelineSaving(true)
      try {
        await postScene('timeline', next)
      } catch (error) {
        setBeatPlan(previous)
        toast.error(error instanceof Error ? error.message : 'Promo timeline save failed')
      } finally {
        setTimelineSaving(false)
      }
    },
    [timelineBeats, postScene]
  )

  const handlePlan = useCallback(async () => {
    setPlanning(true)
    try {
      const data = await postScene('upsert')
      const nextPlan = Array.isArray(data.beatPlan) ? data.beatPlan : []
      const seconds = Math.round(data.totalDurationSec ?? targetDuration)
      toast.success(
        data.source === 'heuristic'
          ? `Plan: ${nextPlan.length} shots · ~${seconds}s (trailer arc)`
          : `Plan: ${nextPlan.length} shots · ~${seconds}s`
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Shot plan failed')
    } finally {
      setPlanning(false)
    }
  }, [postScene, targetDuration])

  const handleApplyDirectorPlan = useCallback(
    async (plan: PromoTrailerBeatPlan[]) => {
      setPlanning(true)
      try {
        await postScene('upsert', plan)
        toast.success('Plan applied')
      } finally {
        setPlanning(false)
      }
    },
    [postScene]
  )

  const handleRegenAudio = useCallback(
    async (action: 'narration' | 'music') => {
      setAudioGenerating(action)
      try {
        await postScene(action)
        toast.success(action === 'narration' ? 'Narration ready' : 'Music ready')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : action === 'narration' ? 'Narration failed' : 'Music failed')
      } finally {
        setAudioGenerating(null)
      }
    },
    [postScene]
  )

  const handleGenerateBeatClip = useCallback(
    async (key: string, beat: PromoTrailerBeatPlan, playback: { segmentId?: string; thumbnailUrl?: string }) => {
      if (!onGenerateBeatClip) return
      const decision = promoAgentShotNeedsGeneration({
        beatKind: beat.beatKind,
        language,
        hasMasterClip: false,
        hasLanguageClip: false,
      })
      setGeneratingBeatKey(key)
      try {
        await onGenerateBeatClip({
          sceneId: beat.sceneId,
          beatId: beat.beatId,
          sceneIndex: beat.sceneIndex,
          segmentId: playback.segmentId,
          frameUrl: playback.thumbnailUrl || beat.frameUrl,
          durationSec: beat.durationSec ?? Math.max(0, beat.endSec - beat.startSec),
          aspectRatio: aspect,
          beatKind: beat.beatKind,
          clipLanguage: decision.dialogue ? language : undefined,
        })
        setBrokenBeatKeys((prev) => {
          if (!prev.has(key)) return prev
          const next = new Set(prev)
          next.delete(key)
          return next
        })
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Clip generation failed')
      } finally {
        setGeneratingBeatKey(null)
      }
    },
    [onGenerateBeatClip, language, aspect]
  )

  const handleRunPromoAgent = useCallback(async () => {
    const playing = timelineBeats.filter((beat) => promoShotIncluded(beat))
    if (!onRunPromoAgent || playing.length === 0) {
      toast.error('Plan the promo first.')
      return
    }
    setAgentRunning(true)
    try {
      await onRunPromoAgent({
        beatPlan: playing,
        targetDurationSec: targetDuration,
        language,
        aspectRatio: aspect,
        audienceDefinition: audiencePayload,
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Promo Agent failed')
    } finally {
      setAgentRunning(false)
    }
  }, [onRunPromoAgent, timelineBeats, targetDuration, language, aspect, audiencePayload])

  const handleRenderTrailer = useCallback(async () => {
    const source = (beatPlan.length > 0 ? beatPlan : timelineBeats).filter((beat) =>
      promoShotIncluded(beat)
    )
    const plan = promoPlanForLanguage(
      source,
      sceneProductionState as Record<string, unknown> | undefined,
      language
    )

    if (plan.length === 0) {
      toast.error('Plan the promo first.')
      return
    }
    if (dialogueGaps > 0) {
      toast.error(
        `Generate the ${promoLanguageName(language)} dialogue clips before rendering that promo.`
      )
      return
    }
    if (includedRows.some((row) => !row.playback.hasClip)) {
      toast.error('Generate the missing clips before rendering the promo.')
      return
    }

    const hasClip = plan.some((beat) => beat.videoUrl)
    if (!hasClip) {
      toast.error('Generate the plan clips before rendering the promo.')
      return
    }

    setPreviewing(false)
    setRendering(true)
    try {
      const res = await fetch('/api/publish/trailer/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          userId,
          beatPlan: plan,
          targetDurationSec: targetDuration,
          title: projectTitle,
          narrationAudioUrl,
          musicAudioUrl,
          aspect,
          language,
          watermarkEnabled,
          promoSceneId: typeof promoScene?.id === 'string' ? promoScene.id : undefined,
        }),
      })
      const data = parsePromoRenderBody(res.status, await res.text())
      if (!res.ok) throw new Error(data.error || `Promo render failed (${res.status})`)

      let mp4Url =
        typeof data.mp4Url === 'string' && data.mp4Url.startsWith('http') ? data.mp4Url : ''
      if (!mp4Url) {
        const jobId = typeof data.jobId === 'string' ? data.jobId.trim() : ''
        if (!jobId) throw new Error('Promo stitch did not start')
        toast.loading('Stitching the promo…', { id: 'promo-render' })
        mp4Url = await pollPromoRenderJob({
          jobId,
          fetchStatus: async (id) => {
            const pollRes = await fetch(
              `/api/publish/stream/render?jobId=${encodeURIComponent(id)}`
            )
            return { status: pollRes.status, body: await pollRes.text() }
          },
        })
      }
      toast.dismiss('promo-render')

      const trailerAsset: PromoTrailerAsset = {
        mp4Url,
        aspect,
        language,
        durationSec: typeof data.durationSec === 'number' ? data.durationSec : targetDuration,
        targetDurationSec: targetDuration,
        beatPlan: plan,
        renderedAt: new Date().toISOString(),
        status: 'ready',
      }

      const nextMetadata = upsertPublishingState((metadata as Record<string, unknown>) || {}, {
        promo: upsertPromoLanguageTrailer(publishingState.promo, trailerAsset),
      })
      metadataRef.current = nextMetadata
      await onSaveMetadata(nextMetadata)
      setBeatPlan(plan)
      toast.success(`${promoLanguageName(language)} promo rendered`)
    } catch (err) {
      toast.dismiss('promo-render')
      toast.error(err instanceof Error ? err.message : 'Promo render failed')
    } finally {
      setRendering(false)
    }
  }, [
    beatPlan,
    timelineBeats,
    timelineRows,
    sceneProductionState,
    language,
    dialogueGaps,
    projectId,
    userId,
    targetDuration,
    projectTitle,
    narrationAudioUrl,
    musicAudioUrl,
    aspect,
    watermarkEnabled,
    includedRows,
    promoScene,
    metadata,
    publishingState.promo,
    onSaveMetadata,
  ])

  const languageLabel = promoLanguageName(language)

  return (
    <div className="space-y-4 overflow-y-auto flex-1 min-h-0 pr-1">
      <div className="rounded-xl border border-zinc-800/70 bg-zinc-950/45 p-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-1">
          <Film className="w-4 h-4 text-fuchsia-300" />
          Promo
        </h3>
        <p className="text-xs text-zinc-500 mb-4">
          A {aspect} trailer in the film&apos;s frame. Plan the cut, then Promo Agent builds the
          clips, narration, and music for {languageLabel}.
        </p>

        <div className="mb-4">
          <p className="mb-2 text-[10px] uppercase tracking-wider text-zinc-500">Duration</p>
          <div className="flex flex-wrap gap-2">
            {TARGET_OPTIONS.map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() => setTargetDuration(sec)}
                className={cn(
                  'rounded-full px-3 py-1 text-xs border transition-colors',
                  targetDuration === sec
                    ? 'border-fuchsia-500/50 bg-fuchsia-500/15 text-fuchsia-100'
                    : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'
                )}
              >
                {sec}s
              </button>
            ))}
          </div>
          <label className="mt-3 flex items-center gap-2 text-xs text-zinc-300">
            <input
              type="checkbox"
              checked={watermarkEnabled}
              onChange={(event) => setWatermarkEnabled(event.target.checked)}
            />
            Watermark · SceneFlow Studio
          </label>
        </div>

        <div className="mb-4 grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(12rem,0.8fr)]">
          <div>
            <p className="mb-2 text-[10px] uppercase tracking-wider text-zinc-500">Target audience</p>
            <AudienceDescriptionField
              value={audience}
              onChange={setAudience}
              variant="compact"
              rows={3}
              projectId={projectId}
              context={{ title: projectTitle }}
              placeholder="Who this promo is for — the same description Audience Resonance uses."
            />
          </div>
          <div>
            <p className="mb-2 text-[10px] uppercase tracking-wider text-zinc-500">Language</p>
            <label className="block text-[11px] text-zinc-400">
              Promo stream
              <select
                value={language}
                onChange={(event) => setLanguage(event.target.value)}
                className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs text-zinc-100"
              >
                {languages.map((code) => (
                  <option key={code} value={code}>
                    {getLanguageDisplayName(code)}
                  </option>
                ))}
              </select>
            </label>
            {addableLanguages.length > 0 ? (
              <label className="mt-2 block text-[11px] text-zinc-400">
                Add language
                <select
                  value=""
                  onChange={(event) => {
                    const code = event.target.value
                    if (!code) return
                    setExtraLanguages((current) => (current.includes(code) ? current : [...current, code]))
                    setLanguage(code)
                  }}
                  className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs text-zinc-100"
                >
                  <option value="">Choose a language</option>
                  {addableLanguages.map((code) => (
                    <option key={code} value={code}>
                      {getLanguageDisplayName(code)}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
              Dialogue clips and narration are made for this language. Silent shots stay on the
              source picture. Music is shared.
            </p>
          </div>
        </div>

        <div className="mb-3 grid gap-2 sm:grid-cols-3">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3">
            <p className="text-[10px] uppercase tracking-wider text-zinc-500">1 · Plan</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button size="sm" onClick={() => void handlePlan()} disabled={planning} className="bg-fuchsia-600 hover:bg-fuchsia-500">
                {planning ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Sparkles className="w-4 h-4 mr-1" />}
                Plan
              </Button>
              <Button size="sm" variant="outline" onClick={() => setDirectorOpen(true)} disabled={planning}>
                <Clapperboard className="w-4 h-4 mr-1" />
                Promo Director
              </Button>
            </div>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3">
            <p className="text-[10px] uppercase tracking-wider text-zinc-500">2 · Preview</p>
            <div className="mt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPreviewing((current) => !current)}
                disabled={rendering || previewShots.length === 0}
              >
                {previewing ? <Square className="w-4 h-4 mr-1" /> : <Play className="w-4 h-4 mr-1" />}
                {previewing ? 'Stop preview' : 'Preview'}
              </Button>
            </div>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3">
            <p className="text-[10px] uppercase tracking-wider text-zinc-500">3 · Render Promo</p>
            <div className="mt-2">
              <Button
                size="sm"
                onClick={() => void handleRenderTrailer()}
                disabled={rendering || timelineRows.length === 0}
                className="bg-fuchsia-600 hover:bg-fuchsia-500"
              >
                {rendering ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Film className="w-4 h-4 mr-1" />}
                Render Promo
              </Button>
            </div>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-fuchsia-500/25 bg-fuchsia-500/5 px-3 py-2.5">
          <Button
            size="sm"
            variant="outline"
            onClick={() => void handleRunPromoAgent()}
            disabled={agentRunning || !onRunPromoAgent || timelineBeats.length === 0}
            className="border-fuchsia-500/40 text-fuchsia-100"
          >
            {agentRunning ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Bot className="w-4 h-4 mr-1" />}
            Promo Agent
          </Button>
          <p className="min-w-0 flex-1 text-[11px] leading-relaxed text-zinc-400">
            Builds the missing clips, narration, and music for {languageLabel}. Only dialogue clips
            are translated and regenerated. Run it again to rebuild the audio.
          </p>
        </div>

        <PromoCutPreview
          playing={previewing}
          shots={previewShots}
          watermark={watermarkEnabled}
          narrationUrl={narrationAudioUrl}
          musicUrl={musicAudioUrl}
          aspect={aspect}
          onEnded={() => setPreviewing(false)}
        />

        {languages.length > 0 && timelineRows.length > 0 ? (
          <div className="mb-4 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
            <p className="mb-2 text-[10px] uppercase tracking-wider text-zinc-500">Promo streams</p>
            <div className="flex flex-col gap-1.5">
              {languages.map((code) => {
                const asset = promoAssetForLanguage(publishingState.promo, code)
                const narration = narrationUrlFor(promoScene, code)
                const playingBeats = timelineBeats.filter((beat) => promoShotIncluded(beat))
                const playback = playingBeats.map((beat) =>
                  resolvePromoPlayback(
                    beat,
                    sceneProductionState as Record<string, unknown> | undefined,
                    code
                  )
                )
                const dialogueBeats = playingBeats.filter((beat) => beat.beatKind === 'dialogue')
                const dialogueReady = dialogueBeats.filter((beat) =>
                  resolvePromoPlayback(
                    beat,
                    sceneProductionState as Record<string, unknown> | undefined,
                    code
                  ).hasLanguageClip
                ).length
                const readyForLanguage = playback.filter((row) => row.hasClip).length
                const active = code === language
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setLanguage(code)}
                    className={cn(
                      'flex flex-wrap items-center gap-x-3 gap-y-1 rounded border px-2 py-1.5 text-left text-[11px]',
                      active
                        ? 'border-fuchsia-500/40 bg-fuchsia-500/10 text-fuchsia-100'
                        : 'border-zinc-800 text-zinc-400 hover:border-zinc-600'
                    )}
                  >
                    <span className="font-medium text-zinc-100">{getLanguageDisplayName(code)}</span>
                    <span>
                      {isLanguageClipTarget(code)
                        ? `${dialogueReady}/${dialogueBeats.length} dialogue clips`
                        : `${readyForLanguage}/${playingBeats.length} clips`}
                    </span>
                    <span>{narration ? 'Narration' : 'No narration'}</span>
                    <span>{musicAudioUrl ? 'Music' : 'No music'}</span>
                    <span>{asset?.status === 'ready' ? 'Rendered' : 'Not rendered'}</span>
                  </button>
                )
              })}
            </div>
          </div>
        ) : null}

        {promoScene && onOpenPromoInStudio ? (
          <Button
            size="sm"
            variant="ghost"
            className="mb-3 text-xs text-zinc-400"
            onClick={() => onOpenPromoInStudio(String(promoScene.id || promoScene.sceneId || ''))}
          >
            Open promo scene in Studio
          </Button>
        ) : null}

        {(timelineRows.length > 0 || shotCatalog.length > 0) && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
            <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">
              Shot timeline ({timelineRows.length} shots)
            </p>
            <p className="text-[11px] text-zinc-400 mb-2">
              {readyClipCount} of {includedRows.length} clips
              {timelineRows.length > includedRows.length
                ? ` · ${timelineRows.length - includedRows.length} excluded`
                : ''}
              {dialogueGaps > 0 ? ` · ${dialogueGaps} dialogue clips still needed in ${languageLabel}` : ''}
            </p>
            {shotCatalog.length > 0 ? (
              <div className="mb-2 flex flex-wrap items-end gap-2">
                <label className="min-w-[12rem] flex-1 text-[10px] text-zinc-500">
                  Add shot
                  <select
                    value={addShotKey}
                    onChange={(event) => setAddShotKey(event.target.value)}
                    className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs text-zinc-100"
                  >
                    <option value="">Choose a shot</option>
                    {shotCatalog.map((shot) => {
                      const number = shot.sceneIndex + 1
                      const shotNumber =
                        directShotNumber(scenes[shot.sceneIndex], shot.beatId) ?? shot.beatIndex + 1
                      const title = shot.label?.trim()
                      return (
                        <option key={promoShotKey(shot)} value={promoShotKey(shot)}>
                          {`Scene ${number} · Shot ${shotNumber}${title ? ` · ${title}` : ''}`}
                        </option>
                      )
                    })}
                  </select>
                </label>
                <label className="text-[10px] text-zinc-500">
                  Position
                  <input
                    type="number"
                    min={1}
                    value={addPosition}
                    onChange={(event) => setAddPosition(Number(event.target.value))}
                    className="mt-1 h-7 w-16 rounded border border-zinc-700 bg-zinc-950 px-2 text-xs text-zinc-100"
                  />
                </label>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-[10px]"
                  disabled={!addShotKey || timelineSaving}
                  onClick={() => {
                    const shot = shotCatalog.find((entry) => promoShotKey(entry) === addShotKey)
                    if (!shot) return
                    void commitTimeline(placePromoShot(timelineBeats, shot, addPosition))
                  }}
                >
                  Add
                </Button>
              </div>
            ) : null}
            <div className="flex flex-col gap-1.5">
              {timelineRows.map(({ beat, key, playback, sceneNumber, shotNumber }, index) => {
                const broken = brokenBeatKeys.has(key)
                const hasClip = playback.hasClip && !broken
                const included = promoShotIncluded(beat)
                const durationSec = beat.durationSec ?? beat.endSec - beat.startSec
                const showImage = Boolean(playback.thumbnailUrl || beat.frameUrl) && !broken && !hasClip
                const showVideo = hasClip && Boolean(playback.videoUrl)
                const generating = generatingBeatKey === key
                const thumb = playback.thumbnailUrl || beat.frameUrl
                return (
                  <div
                    key={key}
                    className={cn(
                      'flex items-center gap-2 rounded border border-zinc-800 bg-zinc-950/80 px-2 py-1.5',
                      !included && 'opacity-50'
                    )}
                    title={beat.label}
                  >
                    <span className="w-5 shrink-0 text-center text-[11px] tabular-nums text-zinc-400">
                      {index + 1}
                    </span>
                    <div className="flex shrink-0 flex-col">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-4 w-5 px-0 text-zinc-400"
                        disabled={timelineSaving || index === 0}
                        title="Move shot earlier"
                        onClick={() =>
                          void commitTimeline(movePromoShot(timelineBeats, index, index - 1))
                        }
                      >
                        <ChevronUp className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-4 w-5 px-0 text-zinc-400"
                        disabled={timelineSaving || index === timelineRows.length - 1}
                        title="Move shot later"
                        onClick={() =>
                          void commitTimeline(movePromoShot(timelineBeats, index, index + 1))
                        }
                      >
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </div>
                    <div
                      className={cn(
                        'shrink-0 overflow-hidden rounded bg-black',
                        promoFrameClass(aspect),
                        aspect === '9:16' ? 'h-14 w-8' : 'h-11 w-20'
                      )}
                    >
                      {showImage && thumb ? (
                        <img
                          src={thumb}
                          alt=""
                          className="h-full w-full object-contain"
                          onError={() => markBeatBroken(key)}
                        />
                      ) : showVideo ? (
                        <video
                          src={playback.videoUrl}
                          muted
                          playsInline
                          preload="metadata"
                          className="h-full w-full object-contain"
                          onError={() => markBeatBroken(key)}
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] text-zinc-100">
                        S{sceneNumber}
                        {shotNumber ? ` · Shot ${shotNumber}` : ''}
                        {beat.trailerRole ? ` · ${beat.trailerRole}` : ''} · {durationSec}s
                        <span
                          className={cn(
                            'ml-2',
                            playback.policyBlocked && !hasClip ? 'text-amber-300' : 'text-zinc-500'
                          )}
                        >
                          {hasClip ? 'Clip' : playback.policyBlocked ? 'Blocked' : 'Needed'}
                        </span>
                      </p>
                      {beat.label ? (
                        <p className="truncate text-[10px] text-zinc-500">{beat.label}</p>
                      ) : null}
                    </div>
                    <label className="flex shrink-0 items-center gap-1 text-[10px] text-zinc-500">
                      <input
                        type="number"
                        min={1}
                        max={12}
                        step={1}
                        key={`${key}-${durationSec}`}
                        defaultValue={Math.round(durationSec)}
                        disabled={timelineSaving}
                        title="Shot length in seconds"
                        className="h-7 w-16 rounded border border-zinc-700 bg-zinc-950 px-1 text-center text-[11px] tabular-nums text-zinc-100 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        onBlur={(event) => {
                          const next = Number(event.target.value)
                          if (!Number.isFinite(next) || Math.round(next) === Math.round(durationSec)) return
                          void commitTimeline(
                            timelineBeats.map((row, rowIndex) =>
                              rowIndex === index ? withPromoShotDuration(row, next) : row
                            )
                          )
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') event.currentTarget.blur()
                        }}
                      />
                      s
                    </label>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 shrink-0 px-2 text-[10px]"
                      disabled={timelineSaving}
                      title={included ? 'Leave this shot out of the cut' : 'Put this shot back in the cut'}
                      onClick={() =>
                        void commitTimeline(
                          timelineBeats.map((row, rowIndex) =>
                            rowIndex === index ? withPromoShotIncluded(row, !included) : row
                          )
                        )
                      }
                    >
                      {included ? 'Exclude' : 'Include'}
                    </Button>
                    {onOpenDirectShot ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 shrink-0 gap-1 px-2 text-[10px] text-teal-200 hover:text-teal-100"
                        title="Open this shot in Direct Shot to rewrite its direction"
                        onClick={() =>
                          onOpenDirectShot({
                            sceneId: beat.sceneId,
                            sceneIndex: beat.sceneIndex,
                            beatId: beat.beatId,
                            safety: playback.policyBlocked === true && !hasClip,
                          })
                        }
                      >
                        <Clapperboard className="h-3 w-3" />
                        Direct Shot
                      </Button>
                    ) : null}
                    {onOptimizeDirection &&
                    (!hasClip &&
                      (!sourceDirectionOptimized(scenes, beat) || playback.policyBlocked)) ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 shrink-0 px-2 text-[10px] text-amber-200 hover:text-amber-100"
                        title="Rewrite this shot with Optimize direction before generating it"
                        disabled={optimizingKey === key}
                        onClick={() => {
                          setOptimizingKey(key)
                          void onOptimizeDirection({
                            sceneId: beat.sceneId,
                            sceneIndex: beat.sceneIndex,
                            beatId: beat.beatId,
                            safety: playback.policyBlocked === true,
                            policyBlocked: playback.policyBlocked === true,
                          })
                            .catch((error) => {
                              toast.error(error instanceof Error ? error.message : 'Direction optimize failed')
                            })
                            .finally(() => setOptimizingKey(null))
                        }}
                      >
                        {optimizingKey === key ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Optimize direction'}
                      </Button>
                    ) : null}
                    {!hasClip ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 shrink-0 px-2 text-[10px]"
                        disabled={!onGenerateBeatClip || generating}
                        title="Generate clip"
                        onClick={() => void handleGenerateBeatClip(key, beat, playback)}
                      >
                        {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Generate'}
                      </Button>
                    ) : null}
                  </div>
                )
              })}
              <PromoAudioRow
                label="Narration"
                detail={narrationLineFor(promoScene, language)}
                ready={Boolean(narrationAudioUrl)}
                generating={audioGenerating === 'narration'}
                disabled={audioGenerating !== null}
                onGenerate={() => void handleRegenAudio('narration')}
              />
              <PromoAudioRow
                label="Music"
                detail={typeof promoScene?.music === 'string' ? promoScene.music : undefined}
                ready={Boolean(musicAudioUrl)}
                generating={audioGenerating === 'music'}
                disabled={audioGenerating !== null}
                onGenerate={() => void handleRegenAudio('music')}
              />
            </div>
          </div>
        )}
      </div>

      {activeTrailer?.mp4Url ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
          <p className="text-xs text-emerald-200 mb-2">
            {promoLanguageName(activeTrailer.language || language)} promo ready ·{' '}
            {Math.round(activeTrailer.durationSec)}s · {activeTrailer.aspect}
          </p>
          <div className="flex flex-wrap gap-2">
            <a
              href={activeTrailer.mp4Url}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="inline-flex items-center rounded-md border border-emerald-500/30 px-3 py-1.5 text-xs font-medium text-emerald-200 hover:bg-emerald-500/10"
            >
              <Download className="w-3.5 h-3.5 mr-1" />
              Download
            </a>
            {onPreviewPromo ? (
              <Button size="sm" variant="outline" onClick={() => onPreviewPromo(language)}>
                Play in Screening Room
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {promoScene && isPromoCinematicScene(promoScene) ? (
        <p className="text-[11px] text-zinc-500">
          Promo scene is excluded from Animatic/Video film playthrough — use Screening Room → Promo.
        </p>
      ) : null}

      <PromoPlanDirectorDialog
        open={directorOpen}
        onOpenChange={setDirectorOpen}
        projectId={projectId}
        targetDurationSec={targetDuration}
        audienceDefinition={audiencePayload}
        scenes={scenes}
        sceneProductionState={sceneProductionState}
        sceneScores={sceneScores}
        currentPlan={timelineBeats}
        findings={directorFindings}
        onAnalysis={setAnalysis}
        onApply={handleApplyDirectorPlan}
      />
    </div>
  )
}
