'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { toast } from 'sonner'
import {
  Download,
  Bot,
  Images,
  ChevronDown,
  ChevronUp,
  Film,
  Loader2,
  Play,
  Sparkles,
  Square,
  Clapperboard,
  Plus,
  Trash2,
  Globe,
  Target,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { AudienceDescriptionField } from '@/components/audience/AudienceDescriptionField'
import { PromoPlanDirectorDialog } from '@/components/publishing/PromoPlanDirectorDialog'
import { legacyOwnerIdFromStorage } from '@/lib/blueprint/createBlueprintShare'
import { GroupedLanguageSelector } from '@/components/vision/GroupedLanguageSelector'
import { getLanguageDisplayName } from '@/lib/publish/buildLanguageAudioTrack'
import { collectPromoPlanFindings, type PromoPlanFinding } from '@/lib/publish/promoPlanFindings'
import { buildPromoShotCatalog, isOptimizedShotDirection, slimPromoProductionState } from '@/lib/publish/promoShotCatalog'
import {
  movePromoShot,
  placePromoShot,
  promoNarrationStartSec,
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
  promoShotLocalizes,
  readPromoShotLocalization,
  seedPromoAudience,
  upsertPromoLanguageTrailer,
  type PromoAgentRunRequest,
  type PromoContinuityRunRequest,
  type PromoBeatClipRequest,
} from '@/lib/publish/promoLanguage'
import { PromoCutPreview, type PromoCutPreviewHandle } from '@/components/publishing/PromoCutPreview'
import {
  PROMO_CAMPAIGN_PRESETS,
  findPromoSceneIndex,
  findPromoScenes,
  getPromoCampaignPreset,
  isPromoCinematicScene,
} from '@/lib/publish/buildPromoScene'
import { getSceneBeats } from '@/lib/script/beatMigration'
import { treatmentBeatsFromMetadata } from '@/lib/script/sceneDecomposition'
import { isLanguageClipTarget } from '@/lib/scene/languageClipVersions'
import {
  directShotNumber,
  resolveDirectShotTarget,
  type DirectShotRequest,
} from '@/lib/vision/directShotTarget'
import { createAudienceDefinition, type AudienceDefinition } from '@/lib/types/audienceResonance'
import type {
  PromoCampaignPresetId,
  PromoFrameAspect,
  PromoTrailerBeatPlan,
  PromoTrailerAsset,
  ProjectPublishingPromo,
} from '@/types/publishingAssets'
import type { ProjectStream } from '@/lib/streams/projectStreams'
import type { SceneProductionData } from '@/components/vision/scene-production/types'

const MULTILANG_CAMPAIGN_CHOICES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'ja', label: 'Japanese' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'zh', label: 'Mandarin' },
  { code: 'ko', label: 'Korean' },
  { code: 'it', label: 'Italian' },
  { code: 'hi', label: 'Hindi' },
] as const

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
  /** Draw missing wardrobe, location, and prop plates for the included shots. */
  onRunContinuityAgent?: (input: PromoContinuityRunRequest) => Promise<void>
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
): { audioUrl?: string; line?: string; durationSec?: number } | undefined {
  const tracks = scene?.dialogueAudio as
    | Record<string, Array<{ audioUrl?: string; line?: string; durationSec?: number }>>
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

function narrationDetailFor(scene: Record<string, unknown> | null, language: string): string | undefined {
  const track = narrationTrackFor(scene, language)
  const line = typeof track?.line === 'string' ? track.line.trim() : ''
  const seconds = track?.durationSec
  const length =
    typeof seconds === 'number' && seconds > 0 ? `${Math.round(seconds)}s recording` : ''
  const short =
    typeof seconds === 'number' && seconds > 0 && seconds <= 12
      ? 'This recording is about 10 seconds. A full voice-over should cover the cut.'
      : ''
  const detail = [line, length, short].filter(Boolean).join(' · ')
  return detail || undefined
}

function PromoAudioRow({
  label,
  detail,
  ready,
  generating,
  disabled,
  onGenerate,
  extra,
}: {
  label: string
  detail?: string
  ready: boolean
  generating: boolean
  disabled: boolean
  onGenerate: () => void
  extra?: React.ReactNode
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
      {extra}
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
  onRunContinuityAgent,
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
  const [continuityRunning, setContinuityRunning] = useState(false)
  const [directorOpen, setDirectorOpen] = useState(false)
  const [analysis, setAnalysis] = useState<PromoPlanFinding[] | null>(null)
  const [optimizingKey, setOptimizingKey] = useState<string | null>(null)
  const [brokenBeatKeys, setBrokenBeatKeys] = useState<Set<string>>(() => new Set())
  const [watermarkEnabled, setWatermarkEnabled] = useState(() =>
    promoWatermarkEnabled(getPublishingState(metadata).promo?.watermarkEnabled)
  )
  const [addShotKey, setAddShotKey] = useState('')
  const [addSceneIndex, setAddSceneIndex] = useState<number | null>(null)
  const [addPosition, setAddPosition] = useState(1)
  const [narrationStartShotKey, setNarrationStartShotKey] = useState(
    () => getPublishingState(metadata).promo?.narrationStartShotKey || ''
  )
  const [timelineSaving, setTimelineSaving] = useState(false)
  const previewRef = useRef<PromoCutPreviewHandle>(null)
  const metadataRef = useRef(metadata)
  metadataRef.current = metadata
  const saveRef = useRef(onSaveMetadata)
  saveRef.current = onSaveMetadata
  const skipOptionPersist = useRef(true)

  const publishingState = useMemo(() => getPublishingState(metadata), [metadata])
  const defaultAspect = useMemo(() => resolvePromoFrameAspect(metadata), [metadata])

  const scenes = useMemo(() => {
    const s = script as { script?: { scenes?: unknown[] }; scenes?: unknown[] } | undefined
    return s?.script?.scenes ?? s?.scenes ?? []
  }, [script])

  const promoScenes = useMemo(() => findPromoScenes(scenes), [scenes])

  const [activePromoId, setActivePromoId] = useState<string>(() => {
    const storedActive = getPublishingState(metadata).promo?.activePromoId
    if (storedActive) return storedActive
    const existing = findPromoScenes(
      (script as { script?: { scenes?: unknown[] }; scenes?: unknown[] } | undefined)?.script
        ?.scenes ??
        (script as { scenes?: unknown[] } | undefined)?.scenes ??
        []
    )
    return existing[0]?.promoId || ''
  })

  const [campaignPreset, setCampaignPreset] = useState<PromoCampaignPresetId>(
    () =>
      (findPromoScenes(
        (script as { script?: { scenes?: unknown[] }; scenes?: unknown[] } | undefined)?.script
          ?.scenes ?? []
      )[0]?.preset as PromoCampaignPresetId | undefined) || 'theatrical_trailer'
  )
  const [campaignName, setCampaignName] = useState<string>(() => {
    const first = findPromoScenes(
      (script as { script?: { scenes?: unknown[] }; scenes?: unknown[] } | undefined)?.script
        ?.scenes ?? []
    )[0]
    return first?.name || 'Theatrical Main Trailer'
  })
  const [campaignObjective, setCampaignObjective] = useState<string>('')
  const [aspectOverride, setAspectOverride] = useState<PromoFrameAspect | null>(null)
  const [creatingNewPromo, setCreatingNewPromo] = useState(false)
  const [deletingPromoId, setDeletingPromoId] = useState<string | null>(null)
  const [confirmDeletePromoId, setConfirmDeletePromoId] = useState<string | null>(null)
  const [previewMode, setPreviewMode] = useState<'clips' | 'rendered'>('clips')
  const [selectedClipKey, setSelectedClipKey] = useState<string>('')
  const [selectedRenderedStreamId, setSelectedRenderedStreamId] = useState<string>('')
  const [multilangGenerating, setMultilangGenerating] = useState(false)

  const promoSceneIndex = useMemo(
    () => (creatingNewPromo ? -1 : findPromoSceneIndex(scenes, activePromoId || undefined)),
    [scenes, activePromoId, creatingNewPromo]
  )

  const promoScene = useMemo(() => {
    if (creatingNewPromo) return null
    return promoSceneIndex >= 0 ? (scenes[promoSceneIndex] as Record<string, unknown>) : null
  }, [scenes, promoSceneIndex, creatingNewPromo])

  const aspect: PromoFrameAspect = useMemo(() => {
    if (aspectOverride) return aspectOverride
    if (promoScene?.promoAspect === '9:16' || promoScene?.promoAspect === '16:9') {
      return promoScene.promoAspect
    }
    return defaultAspect
  }, [aspectOverride, promoScene, defaultAspect])

  // Sync activePromoId when promoScenes change and activePromoId is empty
  useEffect(() => {
    if (creatingNewPromo) return
    if (!activePromoId && promoScenes.length > 0) {
      const first = promoScenes[0]!
      setActivePromoId(first.promoId)
      if (first.name) setCampaignName(first.name)
      if (first.preset) setCampaignPreset(first.preset)
      if (first.aspect) setAspectOverride(first.aspect)
    }
  }, [promoScenes, activePromoId, creatingNewPromo])

  const handleSelectExistingPromo = useCallback(
    (summary: (typeof promoScenes)[number]) => {
      setCreatingNewPromo(false)
      setConfirmDeletePromoId(null)
      setPreviewing(false)
      setActivePromoId(summary.promoId)
      setCampaignName(summary.name)
      if (summary.preset) setCampaignPreset(summary.preset)
      if (summary.aspect) setAspectOverride(summary.aspect)
      const sceneRec = summary.scene
      if (typeof sceneRec.campaignObjective === 'string') {
        setCampaignObjective(sceneRec.campaignObjective)
      } else {
        setCampaignObjective('')
      }
      if (isPromoDuration(sceneRec.duration)) {
        setTargetDuration(sceneRec.duration)
      }
      if (Array.isArray(summary.languages) && summary.languages.length > 0) {
        setExtraLanguages((prev) => Array.from(new Set([...prev, ...summary.languages!])))
      }
      const storedPlan = Array.isArray(sceneRec.promoBeatPlan)
        ? (sceneRec.promoBeatPlan as PromoTrailerBeatPlan[])
        : []
      setBeatPlan(storedPlan)
    },
    []
  )

  const handleSelectCampaignPreset = useCallback(
    (presetId: PromoCampaignPresetId) => {
      const preset = getPromoCampaignPreset(presetId)
      if (!preset) return
      setCampaignPreset(presetId)
      setCampaignName((prev) => {
        const matchesAnyPreset = PROMO_CAMPAIGN_PRESETS.some((p) => p.name === prev)
        if (!prev.trim() || matchesAnyPreset || prev === 'Promo Trailer') {
          return preset.name
        }
        return prev
      })
      if (isPromoDuration(preset.defaultDurationSec)) {
        setTargetDuration(preset.defaultDurationSec)
      }
      setAspectOverride(preset.defaultAspect)
      if (!audience.description.trim() && preset.defaultAudienceHint) {
        setAudience(createAudienceDefinition({ description: preset.defaultAudienceHint }))
      }
      if (Array.isArray(preset.recommendedLanguages) && preset.recommendedLanguages.length > 0) {
        setExtraLanguages((prev) =>
          Array.from(new Set([...prev, ...preset.recommendedLanguages!]))
        )
      }
    },
    [audience.description]
  )

  const handleStartNewPromo = useCallback(
    (presetId?: PromoCampaignPresetId) => {
      const nextPresetId = presetId || 'social_vertical_hook'
      const preset = getPromoCampaignPreset(nextPresetId) || PROMO_CAMPAIGN_PRESETS[0]!
      const newId = `promo-${Date.now()}`
      const promoNumber = promoScenes.length + 1
      setCreatingNewPromo(true)
      setActivePromoId(newId)
      setCampaignPreset(preset.id)
      setCampaignName(`${preset.name}${promoNumber > 1 ? ` #${promoNumber}` : ''}`)
      setCampaignObjective('')
      setAspectOverride(preset.defaultAspect)
      if (isPromoDuration(preset.defaultDurationSec)) {
        setTargetDuration(preset.defaultDurationSec)
      }
      if (preset.defaultAudienceHint) {
        setAudience(createAudienceDefinition({ description: preset.defaultAudienceHint }))
      }
      if (Array.isArray(preset.recommendedLanguages) && preset.recommendedLanguages.length > 0) {
        setExtraLanguages((prev) =>
          Array.from(new Set([...prev, ...preset.recommendedLanguages!]))
        )
      }
      setBeatPlan([])
      setAnalysis(null)
    },
    [promoScenes.length]
  )

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
        ...(narrationStartShotKey ? { narrationStartShotKey } : {}),
      }
      if (!narrationStartShotKey) delete nextPromo.narrationStartShotKey
      if (audience.description.trim()) nextPromo.audienceDefinition = audience
      else delete nextPromo.audienceDefinition
      void saveRef.current(
        upsertPublishingState((metadataRef.current as Record<string, unknown>) || {}, {
          promo: nextPromo,
        })
      )
    }, 700)
    return () => window.clearTimeout(timer)
  }, [audience, targetDuration, languageKey, aspect, watermarkEnabled, narrationStartShotKey])

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
        const localizedBeat = { ...beat, ...readPromoShotLocalization(scenes, beat) }
        const playback = resolvePromoPlayback(
          localizedBeat,
          sceneProductionState as Record<string, unknown> | undefined,
          language
        )
        return {
          beat: localizedBeat,
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
      promoShotLocalizes(row.beat) !== null &&
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

  const promoProductionData = useMemo(() => {
    if (!sceneProductionState || !promoScene) return undefined
    const sceneId = String(promoScene.id || promoScene.sceneId || activePromoId || '')
    return (
      (sceneId ? sceneProductionState[sceneId] : undefined) ||
      (promoSceneIndex >= 0 ? sceneProductionState[`scene-${promoSceneIndex}`] : undefined)
    )
  }, [sceneProductionState, promoScene, activePromoId, promoSceneIndex])

  const renderedPromoStreams = useMemo(() => {
    const items: Array<{ id: string; label: string; mp4Url: string; language?: string }> = []
    const seenUrls = new Set<string>()
    const prodStreams = Array.isArray(promoProductionData?.productionStreams)
      ? promoProductionData.productionStreams
      : []
    for (const s of prodStreams) {
      const rec = s as { id?: string; mp4Url?: string; status?: string; language?: string; label?: string }
      if (rec?.mp4Url && (!rec.status || rec.status === 'complete' || rec.status === 'ready')) {
        if (!seenUrls.has(rec.mp4Url)) {
          seenUrls.add(rec.mp4Url)
          items.push({
            id: rec.id || `stream-${items.length}`,
            label:
              rec.label ||
              (rec.language ? `${promoLanguageName(rec.language)} Stream` : 'Rendered Promo Stream'),
            mp4Url: rec.mp4Url,
            language: rec.language,
          })
        }
      }
    }
    const directSceneUrl =
      (typeof promoProductionData?.renderedSceneUrl === 'string' && promoProductionData.renderedSceneUrl) ||
      (typeof promoScene?.renderedSceneUrl === 'string' && promoScene.renderedSceneUrl) ||
      ''
    if (directSceneUrl && !seenUrls.has(directSceneUrl)) {
      seenUrls.add(directSceneUrl)
      items.push({
        id: 'scene-render',
        label: 'Rendered Promo (Mixer)',
        mp4Url: directSceneUrl,
      })
    }
    const trailersByLang = publishingState.promo?.trailersByLanguage || {}
    for (const [langCode, asset] of Object.entries(trailersByLang)) {
      if (asset?.mp4Url && !seenUrls.has(asset.mp4Url)) {
        seenUrls.add(asset.mp4Url)
        items.push({
          id: `trailer-${langCode}`,
          label: `${promoLanguageName(langCode)} Promo (${Math.round(asset.durationSec || targetDuration)}s)`,
          mp4Url: asset.mp4Url,
          language: langCode,
        })
      }
    }
    if (activeTrailer?.mp4Url && !seenUrls.has(activeTrailer.mp4Url)) {
      seenUrls.add(activeTrailer.mp4Url)
      items.push({
        id: 'active-trailer',
        label: `${promoLanguageName(activeTrailer.language || language)} Promo`,
        mp4Url: activeTrailer.mp4Url,
        language: activeTrailer.language || language,
      })
    }
    return items
  }, [promoProductionData, promoScene, publishingState.promo, activeTrailer, language, targetDuration])

  const clipRows = useMemo(
    () =>
      timelineRows.filter(
        (row) => row.playback.hasClip && Boolean(row.playback.videoUrl) && !brokenBeatKeys.has(row.key)
      ),
    [timelineRows, brokenBeatKeys]
  )

  const activeClipRow = useMemo(() => {
    if (clipRows.length === 0) return null
    return clipRows.find((r) => r.key === selectedClipKey) ?? clipRows[0] ?? null
  }, [clipRows, selectedClipKey])

  const activeRenderedStream = useMemo(() => {
    if (renderedPromoStreams.length === 0) return null
    return (
      renderedPromoStreams.find((s) => s.id === selectedRenderedStreamId) ??
      renderedPromoStreams[0] ??
      null
    )
  }, [renderedPromoStreams, selectedRenderedStreamId])

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
    async (
      action: 'plan' | 'upsert' | 'timeline' | 'narration' | 'music',
      beatPlanBody?: PromoTrailerBeatPlan[],
      extraOpts?: { targetLanguages?: string[]; createNew?: boolean }
    ) => {
      const shouldCreateNew = extraOpts?.createNew ?? (creatingNewPromo && action === 'upsert')
      const res = await fetch('/api/publish/promo/scene', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          legacyOwnerId: legacyOwnerIdFromStorage(),
          action,
          promoId: activePromoId || undefined,
          createNew: shouldCreateNew,
          campaignName: campaignName.trim() || undefined,
          campaignPreset,
          campaignObjective: campaignObjective.trim() || undefined,
          targetLanguages: extraOpts?.targetLanguages || languages,
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
      if (data.promoScene && typeof data.promoScene.id === 'string') {
        setActivePromoId(data.promoScene.id)
        setCreatingNewPromo(false)
      }
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
        promoScene?: Record<string, unknown>
        generatedByLanguage?: Record<string, unknown>
      }
    },
    [
      projectId,
      activePromoId,
      creatingNewPromo,
      campaignName,
      campaignPreset,
      campaignObjective,
      languages,
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

  const handleDeletePromo = useCallback(
    async (promoIdToDelete: string) => {
      if (!promoIdToDelete) return
      setDeletingPromoId(promoIdToDelete)
      try {
        const res = await fetch('/api/publish/promo/scene', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId,
            legacyOwnerId: legacyOwnerIdFromStorage(),
            action: 'delete',
            promoId: promoIdToDelete,
            scenes,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to delete promo')
        if (Array.isArray(data.scenes)) {
          applyScenes(data.scenes, data.metadata)
          const remaining = findPromoScenes(data.scenes)
          if (remaining.length > 0) {
            handleSelectExistingPromo(remaining[0]!)
          } else {
            setActivePromoId('')
            setBeatPlan([])
          }
        }
        toast.success('Promo campaign deleted')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to delete promo')
      } finally {
        setDeletingPromoId(null)
        setConfirmDeletePromoId(null)
      }
    },
    [projectId, scenes, applyScenes, handleSelectExistingPromo]
  )

  const handleGenerateMultilangNarration = useCallback(async () => {
    if (languages.length === 0) return
    setMultilangGenerating(true)
    try {
      const data = await postScene('narration', undefined, { targetLanguages: languages })
      const count = data.generatedByLanguage ? Object.keys(data.generatedByLanguage).length : languages.length
      toast.success(`Narration generated for ${count} language${count === 1 ? '' : 's'}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Multilanguage narration failed')
    } finally {
      setMultilangGenerating(false)
    }
  }, [languages, postScene])

  const shotCatalog = useMemo(
    () =>
      buildPromoShotCatalog({
        scenes,
        sceneProductionState: sceneProductionState as Record<string, unknown> | undefined,
      }),
    [scenes, sceneProductionState]
  )

  const sceneChoices = useMemo(() => {
    const seen = new Map<number, string>()
    for (const shot of shotCatalog) {
      if (seen.has(shot.sceneIndex)) continue
      const heading = shot.heading?.trim()
      seen.set(
        shot.sceneIndex,
        heading ? `Scene ${shot.sceneIndex + 1} · ${heading}` : `Scene ${shot.sceneIndex + 1}`
      )
    }
    return [...seen.entries()]
  }, [shotCatalog])

  const selectedAddScene = sceneChoices.some(([index]) => index === addSceneIndex)
    ? addSceneIndex
    : (sceneChoices[0]?.[0] ?? null)

  const addableShots = shotCatalog.filter((shot) => shot.sceneIndex === selectedAddScene)

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
        ...readPromoShotLocalization(scenes, beat),
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
          clipLanguage: decision.localized ? language : undefined,
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
    [onGenerateBeatClip, language, aspect, scenes]
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

  const handleRunContinuityAgent = useCallback(async () => {
    const playing = timelineBeats.filter((beat) => promoShotIncluded(beat))
    if (!onRunContinuityAgent || playing.length === 0) {
      toast.error('Plan the promo first.')
      return
    }
    setContinuityRunning(true)
    try {
      await onRunContinuityAgent({
        beatPlan: playing.map((beat) => ({
          sceneIndex: beat.sceneIndex,
          beatId: beat.beatId,
        })),
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Continuity Agent failed')
    } finally {
      setContinuityRunning(false)
    }
  }, [onRunContinuityAgent, timelineBeats])

  const handleRenderTrailer = useCallback(async () => {
    const source = (beatPlan.length > 0 ? beatPlan : timelineBeats)
      .filter((beat) => promoShotIncluded(beat))
      .map((beat) => ({ ...beat, ...readPromoShotLocalization(scenes, beat) }))
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
        `Generate the ${promoLanguageName(language)} dialogue, title, and credit clips before rendering that promo.`
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
          narrationStartSec: promoNarrationStartSec(source, narrationStartShotKey),
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
    narrationStartShotKey,
    scenes,
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
  const activePresetDef = getPromoCampaignPreset(campaignPreset)

  return (
    <div className="space-y-4 overflow-y-auto flex-1 min-h-0 pr-1">
      <div className="rounded-xl border border-zinc-800/70 bg-zinc-950/45 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Film className="w-4 h-4 text-fuchsia-300" />
              Promo Versions & Shot Builder
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Build your Promo shot cut and manage Promo versions. Open any Promo in Studio to direct shots, audio, music, stills, clips, and streams.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {promoScene && onOpenPromoInStudio ? (
              <Button
                size="sm"
                data-testid="open-promo-in-studio-header-btn"
                className="h-8 border border-fuchsia-400/50 bg-gradient-to-r from-fuchsia-600 to-indigo-600 px-3 text-xs font-semibold text-white shadow-md shadow-fuchsia-950/50 hover:from-fuchsia-500 hover:to-indigo-500"
                onClick={() => onOpenPromoInStudio(String(promoScene.id || promoScene.sceneId || activePromoId || ''))}
              >
                <Clapperboard className="w-3.5 h-3.5 mr-1.5" />
                Open Promo Scene in Studio
              </Button>
            ) : null}
            <Button
              size="sm"
              variant="outline"
              data-testid="create-new-promo-button"
              onClick={() => handleStartNewPromo()}
              className="h-8 border-fuchsia-500/40 text-xs text-fuchsia-200 hover:bg-fuchsia-500/15"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              New Promo
            </Button>
          </div>
        </div>

        {/* Multi-Promo Version Switcher */}
        {(promoScenes.length > 0 || creatingNewPromo) && (
          <div className="mb-4 space-y-2">
            <div
              data-testid="promo-campaign-switcher"
              className="flex flex-wrap items-center gap-1.5 rounded-lg border border-zinc-800/80 bg-zinc-900/50 p-2"
            >
              {promoScenes.map((summary) => {
                const isSelected = !creatingNewPromo && summary.promoId === (promoScene?.id || activePromoId)
                return (
                  <div key={summary.promoId} className="inline-flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleSelectExistingPromo(summary)}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
                        isSelected
                          ? 'border-fuchsia-500/60 bg-fuchsia-500/20 text-fuchsia-100 shadow-sm'
                          : 'border-zinc-700/80 bg-zinc-950/70 text-zinc-300 hover:border-zinc-600 hover:text-white'
                      )}
                    >
                      <span className="rounded bg-fuchsia-500/30 px-1.5 py-0.5 text-[10px] font-bold uppercase text-fuchsia-200">
                        P{summary.promoNumber}
                      </span>
                      <span className="max-w-[14rem] truncate">{summary.name}</span>
                    </button>
                    {isSelected && (
                      <button
                        type="button"
                        data-testid="delete-promo-version-btn"
                        disabled={deletingPromoId === summary.promoId}
                        onClick={() => setConfirmDeletePromoId(summary.promoId)}
                        title="Delete this promo version"
                        className="inline-flex h-6 w-6 items-center justify-center rounded border border-zinc-800 text-zinc-400 hover:border-rose-500/50 hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-50"
                      >
                        {deletingPromoId === summary.promoId ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                      </button>
                    )}
                  </div>
                )
              })}
              {creatingNewPromo && (
                <span className="inline-flex items-center gap-1.5 rounded-md border border-fuchsia-500/60 bg-fuchsia-500/20 px-2.5 py-1 text-xs font-medium text-fuchsia-100">
                  <Sparkles className="h-3 w-3 text-fuchsia-300" />
                  New Promo: {campaignName || 'Untitled Promo'}
                </span>
              )}
            </div>

            {confirmDeletePromoId ? (
              <div
                data-testid="promo-delete-confirmation"
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-rose-500/40 bg-rose-950/30 px-3 py-2 text-xs text-rose-200"
              >
                <span>
                  Delete promo version{' '}
                  <strong className="font-semibold text-white">
                    {promoScenes.find((p) => p.promoId === confirmDeletePromoId)?.name || 'this promo'}
                  </strong>
                  ? This removes the promo scene and its shot plan.
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    data-testid="cancel-delete-promo-btn"
                    disabled={deletingPromoId === confirmDeletePromoId}
                    onClick={() => setConfirmDeletePromoId(null)}
                    className="h-7 px-2.5 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    data-testid="confirm-delete-promo-btn"
                    disabled={deletingPromoId === confirmDeletePromoId}
                    onClick={() => void handleDeletePromo(confirmDeletePromoId)}
                    className="h-7 bg-rose-600 px-3 text-xs font-medium text-white hover:bg-rose-500"
                  >
                    {deletingPromoId === confirmDeletePromoId ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    ) : (
                      <Trash2 className="h-3 w-3 mr-1" />
                    )}
                    Confirm Delete
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* Intelligent Targeted Marketing Campaign Presets */}
        <div className="mb-4 rounded-lg border border-zinc-800/80 bg-zinc-950/60 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-fuchsia-300 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5" />
              Promo Strategy & Archetype
            </p>
            <span className="text-[11px] text-zinc-500">
              Choose a campaign archetype to guide shot selection and trailer pacing
            </span>
          </div>
          <div
            data-testid="promo-campaign-presets"
            className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 mb-3"
          >
            {PROMO_CAMPAIGN_PRESETS.map((preset) => {
              const active = campaignPreset === preset.id
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectCampaignPreset(preset.id)}
                  className={cn(
                    'flex flex-col items-start rounded-lg border p-2.5 text-left transition-all',
                    active
                      ? 'border-fuchsia-500/60 bg-fuchsia-500/15 text-fuchsia-100 shadow-sm'
                      : 'border-zinc-800 bg-zinc-900/50 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-900'
                  )}
                >
                  <div className="flex w-full items-center justify-between gap-1.5 mb-1">
                    <span className="text-xs font-semibold text-white truncate">{preset.name}</span>
                    <span className="shrink-0 rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium text-fuchsia-300">
                      {preset.badge}
                    </span>
                  </div>
                  <p className="text-[11px] leading-snug text-zinc-400 line-clamp-2">
                    {preset.description}
                  </p>
                </button>
              )
            })}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-[10px] uppercase tracking-wider text-zinc-500">
              Promo Name
              <input
                type="text"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder={activePresetDef?.name || 'e.g., Theatrical Main Trailer'}
                className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-100 focus:border-fuchsia-500 focus:outline-none"
              />
            </label>
            <label className="block text-[10px] uppercase tracking-wider text-zinc-500">
              Campaign Hook / Editorial Focus (Optional)
              <input
                type="text"
                value={campaignObjective}
                onChange={(e) => setCampaignObjective(e.target.value)}
                placeholder="e.g., Emphasize mystery reveal & protagonist rivalry for sci-fi fans"
                className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-100 focus:border-fuchsia-500 focus:outline-none"
              />
            </label>
          </div>
        </div>

        <div className="mb-4 grid gap-4 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <div>
            <p className="mb-2 text-[10px] uppercase tracking-wider text-zinc-500">Target Duration</p>
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
          </div>

          <div>
            <p className="mb-2 text-[10px] uppercase tracking-wider text-zinc-500">Target audience</p>
            <AudienceDescriptionField
              value={audience}
              onChange={setAudience}
              variant="compact"
              rows={2}
              projectId={projectId}
              context={{ title: projectTitle }}
              placeholder="Who this promo is for — guides AI shot selection."
            />
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-fuchsia-500/35 bg-fuchsia-950/20 px-3 py-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              onClick={() => void handlePlan()}
              disabled={planning}
              className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-medium"
            >
              {planning ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Sparkles className="w-4 h-4 mr-1.5" />}
              {promoScene && !creatingNewPromo ? 'Rebuild Promo Shots' : 'Build Promo Shots'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setDirectorOpen(true)}
              disabled={planning}
              className="border-zinc-700 text-zinc-200 hover:bg-zinc-800"
            >
              <Clapperboard className="w-4 h-4 mr-1.5" />
              Promo Director
            </Button>
          </div>
          {promoScene && onOpenPromoInStudio ? (
            <Button
              size="sm"
              data-testid="open-promo-in-studio-btn"
              className="h-8 shrink-0 border border-fuchsia-400/50 bg-gradient-to-r from-fuchsia-600 to-indigo-600 px-3.5 text-xs font-semibold text-white shadow-md shadow-fuchsia-950/50 hover:from-fuchsia-500 hover:to-indigo-500"
              onClick={() => onOpenPromoInStudio(String(promoScene.id || promoScene.sceneId || activePromoId || ''))}
            >
              <Clapperboard className="w-3.5 h-3.5 mr-1.5" />
              Open Promo Scene in Studio
            </Button>
          ) : null}
        </div>

        {(timelineRows.length > 0 || renderedPromoStreams.length > 0) && (
          <div
            data-testid="promo-video-preview-panel"
            className="mb-4 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  data-testid="preview-mode-clips-btn"
                  onClick={() => setPreviewMode('clips')}
                  className={cn(
                    'rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
                    previewMode === 'clips'
                      ? 'border-fuchsia-500/60 bg-fuchsia-500/20 text-fuchsia-100'
                      : 'border-zinc-800 bg-zinc-900/70 text-zinc-400 hover:text-zinc-200'
                  )}
                >
                  Promo Shot Clips ({clipRows.length}/{includedRows.length})
                </button>
                <button
                  type="button"
                  data-testid="preview-mode-rendered-btn"
                  onClick={() => {
                    setPreviewing(false)
                    setPreviewMode('rendered')
                  }}
                  className={cn(
                    'rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
                    previewMode === 'rendered'
                      ? 'border-emerald-500/60 bg-emerald-500/20 text-emerald-100'
                      : 'border-zinc-800 bg-zinc-900/70 text-zinc-400 hover:text-zinc-200'
                  )}
                >
                  Rendered Promo ({renderedPromoStreams.length})
                </button>
              </div>

              {previewMode === 'clips' && previewShots.length > 0 ? (
                <div className="flex items-center gap-2">
                  {clipRows.length > 1 && !previewing ? (
                    <select
                      value={activeClipRow?.key || ''}
                      onChange={(e) => setSelectedClipKey(e.target.value)}
                      className="h-7 rounded border border-zinc-700 bg-zinc-950 px-2 text-xs text-zinc-100"
                    >
                      {clipRows.map((row) => (
                        <option key={row.key} value={row.key}>
                          {`S${row.sceneNumber}${row.shotNumber ? ` · Shot ${row.shotNumber}` : ''}${
                            row.beat.trailerRole ? ` (${row.beat.trailerRole})` : ''
                          }`}
                        </option>
                      ))}
                    </select>
                  ) : null}
                  <Button
                    size="sm"
                    variant="outline"
                    data-testid="play-all-promo-clips-btn"
                    className="h-7 px-2.5 text-xs border-zinc-700 text-zinc-200"
                    onClick={() => {
                      if (previewing) {
                        setPreviewing(false)
                        return
                      }
                      flushSync(() => setPreviewing(true))
                      previewRef.current?.start()
                    }}
                  >
                    {previewing ? (
                      <>
                        <Square className="w-3 h-3 mr-1" />
                        Stop Sequence
                      </>
                    ) : (
                      <>
                        <Play className="w-3 h-3 mr-1" />
                        Play Cut Sequence
                      </>
                    )}
                  </Button>
                </div>
              ) : null}

              {previewMode === 'rendered' && renderedPromoStreams.length > 1 ? (
                <select
                  value={activeRenderedStream?.id || ''}
                  onChange={(e) => setSelectedRenderedStreamId(e.target.value)}
                  className="h-7 rounded border border-zinc-700 bg-zinc-950 px-2 text-xs text-zinc-100"
                >
                  {renderedPromoStreams.map((stream) => (
                    <option key={stream.id} value={stream.id}>
                      {stream.label}
                    </option>
                  ))}
                </select>
              ) : null}
            </div>

            {previewMode === 'clips' ? (
              <div>
                <PromoCutPreview
                  ref={previewRef}
                  playing={previewing}
                  shots={previewShots}
                  narrationUrl={narrationAudioUrl}
                  narrationStartSec={promoNarrationStartSec(
                    timelineBeats.filter((beat) => promoShotIncluded(beat)),
                    narrationStartShotKey
                  )}
                  musicUrl={musicAudioUrl}
                  aspect={aspect}
                  watermark={watermarkEnabled}
                  onEnded={() => setPreviewing(false)}
                />
                {!previewing && activeClipRow?.playback.videoUrl ? (
                  <div className="space-y-1.5">
                    <div
                      className={cn(
                        'overflow-hidden rounded-lg border border-zinc-800 bg-black',
                        promoFrameClass(aspect),
                        aspect === '9:16' ? 'max-w-[220px]' : 'max-w-2xl'
                      )}
                    >
                      <video
                        key={activeClipRow.key}
                        data-testid="promo-shot-clip-video-player"
                        src={activeClipRow.playback.videoUrl}
                        controls
                        playsInline
                        preload="metadata"
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <p className="text-[11px] text-zinc-400">
                      Previewing clip:{' '}
                      <span className="font-medium text-zinc-200">
                        S{activeClipRow.sceneNumber}
                        {activeClipRow.shotNumber ? ` · Shot ${activeClipRow.shotNumber}` : ''}
                      </span>
                      {activeClipRow.beat.label ? ` — ${activeClipRow.beat.label}` : ''}
                    </p>
                  </div>
                ) : !previewing ? (
                  <p className="text-xs text-zinc-500">
                    No generated shot video clips yet. Open the Promo Scene in Studio to generate shot clips, or click{' '}
                    <strong className="text-zinc-300">Play Cut Sequence</strong> to preview the animatic frames.
                  </p>
                ) : null}
              </div>
            ) : activeRenderedStream ? (
              <div className="space-y-2">
                <div
                  className={cn(
                    'overflow-hidden rounded-lg border border-emerald-500/30 bg-black',
                    promoFrameClass(aspect),
                    aspect === '9:16' ? 'max-w-[220px]' : 'max-w-2xl'
                  )}
                >
                  <video
                    key={activeRenderedStream.mp4Url}
                    data-testid="promo-rendered-video-player"
                    src={activeRenderedStream.mp4Url}
                    controls
                    playsInline
                    preload="metadata"
                    className="h-full w-full object-contain"
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-emerald-200">{activeRenderedStream.label}</span>
                  <div className="flex items-center gap-2">
                    <a
                      href={activeRenderedStream.mp4Url}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                      className="inline-flex items-center rounded-md border border-emerald-500/30 px-2.5 py-1 text-xs font-medium text-emerald-200 hover:bg-emerald-500/10"
                    >
                      <Download className="w-3.5 h-3.5 mr-1" />
                      Download
                    </a>
                    {onPreviewPromo ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2.5 text-xs"
                        onClick={() => onPreviewPromo(activeRenderedStream.language || language)}
                      >
                        Play in Screening Room
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-zinc-500">
                No rendered Promo video yet. Open the Promo Scene in Studio and render the Promo in the Mixer to watch it here.
              </p>
            )}
          </div>
        )}

        {(timelineRows.length > 0 || shotCatalog.length > 0) && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                Shot timeline ({timelineRows.length} shots)
              </p>
              <p className="text-[11px] text-zinc-400">
                {includedRows.length} active
                {timelineRows.length > includedRows.length
                  ? ` · ${timelineRows.length - includedRows.length} excluded`
                  : ''}
                {' · '}Edit shot timing in Mixer
              </p>
            </div>
            {shotCatalog.length > 0 ? (
              <div className="mb-2 flex flex-wrap items-end gap-2">
                <label className="min-w-[10rem] text-[10px] text-zinc-500">
                  Scene
                  <select
                    value={selectedAddScene ?? ''}
                    onChange={(event) => {
                      const next = Number(event.target.value)
                      setAddSceneIndex(Number.isInteger(next) ? next : null)
                      setAddShotKey('')
                    }}
                    className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs text-zinc-100"
                  >
                    {sceneChoices.map(([index, label]) => (
                      <option key={index} value={index}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="min-w-[12rem] flex-1 text-[10px] text-zinc-500">
                  Add shot
                  <select
                    value={addableShots.some((shot) => promoShotKey(shot) === addShotKey) ? addShotKey : ''}
                    onChange={(event) => setAddShotKey(event.target.value)}
                    className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs text-zinc-100"
                  >
                    <option value="">Choose a shot</option>
                    {addableShots.map((shot) => {
                      const shotNumber =
                        directShotNumber(scenes[shot.sceneIndex], shot.beatId) ?? shot.beatIndex + 1
                      const title = shot.label?.trim()
                      return (
                        <option key={promoShotKey(shot)} value={promoShotKey(shot)}>
                          {`Shot ${shotNumber}${title ? ` · ${title}` : ''}`}
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
                const showImage = Boolean(playback.thumbnailUrl || beat.frameUrl) && !broken && !hasClip
                const showVideo = hasClip && Boolean(playback.videoUrl)
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
                        {beat.trailerRole ? ` · ${beat.trailerRole}` : ''}
                      </p>
                      {beat.label ? (
                        <p className="truncate text-[10px] text-zinc-500">{beat.label}</p>
                      ) : null}
                    </div>
                    {showVideo ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        data-testid={`preview-shot-clip-${key}`}
                        className={cn(
                          'h-7 shrink-0 px-2 text-[10px]',
                          previewMode === 'clips' && !previewing && activeClipRow?.key === key
                            ? 'text-fuchsia-300 bg-fuchsia-500/15'
                            : 'text-zinc-300'
                        )}
                        title="Preview this shot clip"
                        onClick={() => {
                          setPreviewing(false)
                          setPreviewMode('clips')
                          setSelectedClipKey(key)
                        }}
                      >
                        <Play className="h-3 w-3 mr-1" />
                        Preview Clip
                      </Button>
                    ) : null}
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
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

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
