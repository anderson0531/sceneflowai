'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clapperboard,
  Clock,
  Eye,
  Film,
  Layers,
  Loader2,
  Play,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Video,
  Wand2,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import type { StillDirectorPatch } from '@/lib/intelligence/beat-still-director-fallback'
import type { ProjectLookbook } from '@/lib/intelligence/project-lookbook-fallback'
import {
  ANOMALY_CATEGORY_LABELS,
  RECOMMENDATION_CATEGORY_LABELS,
  applyShotDirectorRecommendationsToScenes,
  mergeShotDirectorPatches,
  normalizeRecommendationShotPatch,
  resolveBeatForRecommendation,
  type AnomalyOrigin,
  type AnomalySeverity,
  type SceneVideoAnomaly,
  type SceneVideoRecommendation,
  type SceneVideoReviewResult,
  type SceneVideoReviewSourceMode,
  type ShotReviewAssessment,
} from '@/lib/intelligence/scene-video-reviewer-types'
import { getSceneBeats, isBeatExcluded } from '@/lib/script/beatMigration'

// ============================================================================
// Props & Types
// ============================================================================

export interface SceneVideoReviewerPanelProps {
  projectId?: string
  sceneId: string
  sceneNumber: number
  sceneIndex: number
  scene: Record<string, any>
  scenes: any[]
  script: any
  onScriptChange?: (updatedScript: any) => void
  /** Production data for this scene (segments, productionStreams, renderedSceneUrl) */
  productionData?: {
    segments?: Array<Record<string, any>>
    productionStreams?: Array<Record<string, any>>
    renderedSceneUrl?: string | null
  } | null
  onSegmentPromptChange?: (
    sceneId: string,
    segmentId: string,
    newPrompt: string
  ) => void
  onProductionDataChange?: (
    sceneId: string,
    updatedData: Record<string, any>
  ) => void
  characters?: Array<{
    id?: string
    name: string
    description?: string
    appearanceDescription?: string
    referenceImage?: string
    type?: string
  }>
  locationReferences?: Array<{
    id: string
    name?: string
    location?: string
    description?: string
    imageUrl?: string
    sceneNumbers?: number[]
  }>
  objectReferences?: Array<{
    id: string
    name: string
    description?: string
    imageUrl?: string
    sceneNumbers?: number[]
  }>
  promptComposition?: {
    artStyleAnchor?: string
    lookbook?: ProjectLookbook
  }
  /** Opens Direct Shot (BeatDirectorDialog) for a specific beat with optional instruction & patch */
  onOpenDirectShotWithRecommendation?: (args: {
    beatId: string
    instruction: string
    patch?: StillDirectorPatch
    safety?: boolean
  }) => void
  /** Opens Scene Director (SceneEditorModalV2) with selected scene-level recommendations */
  onEditSceneWithRecommendations?: (
    sceneIdx: number,
    recommendations: string[],
    options?: {
      revisionDepth?: 'light' | 'moderate' | 'deep'
      PreserveBeatCount?: boolean
      recSource?: 'director' | 'audience'
    }
  ) => void
  /** Callback when a new review is completed so parent can sync state if needed */
  onReviewComplete?: (review: SceneVideoReviewResult) => void
  className?: string
}

export interface SceneVideoReviewerDialogProps extends SceneVideoReviewerPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type RecommendationFilter = 'all' | 'shot_director' | 'scene_director' | 'unapplied'

// ============================================================================
// Formatting & Styling Helpers
// ============================================================================

function getScoreBadgeColor(score: number): string {
  if (score >= 85) return 'text-emerald-300 border-emerald-500/40 bg-emerald-500/15'
  if (score >= 70) return 'text-amber-300 border-amber-500/40 bg-amber-500/15'
  return 'text-rose-300 border-rose-500/40 bg-rose-500/15'
}

function getScoreBarColor(score: number): string {
  if (score >= 85) return 'bg-emerald-500'
  if (score >= 70) return 'bg-amber-500'
  return 'bg-rose-500'
}

function getSeverityBadge(severity: AnomalySeverity): {
  label: string
  className: string
} {
  switch (severity) {
    case 'critical':
      return {
        label: 'Critical',
        className: 'border-rose-500/50 bg-rose-500/20 text-rose-200',
      }
    case 'major':
      return {
        label: 'Major',
        className: 'border-amber-500/50 bg-amber-500/20 text-amber-200',
      }
    default:
      return {
        label: 'Minor',
        className: 'border-sky-500/40 bg-sky-500/15 text-sky-200',
      }
  }
}

function getOriginBadge(origin: AnomalyOrigin): {
  label: string
  hint: string
  className: string
} {
  switch (origin) {
    case 'frame':
      return {
        label: 'Keyframe Origin',
        hint: 'Originated in the start still frame — update Shot Direction & regenerate keyframe',
        className: 'border-cyan-500/40 bg-cyan-950/60 text-cyan-200',
      }
    case 'motion':
      return {
        label: 'Motion / Clip Origin',
        hint: 'Introduced during video clip generation — update Shot Direction motion/negative prompt & retake clip',
        className: 'border-purple-500/40 bg-purple-950/60 text-purple-200',
      }
    case 'script':
      return {
        label: 'Script / Pacing Origin',
        hint: 'Structural or dialogue issue in the scene script — route to Scene Director',
        className: 'border-indigo-500/40 bg-indigo-950/60 text-indigo-200',
      }
    case 'audio':
      return {
        label: 'Audio / Sync Origin',
        hint: 'Timing or lip-sync mismatch between audio and visual track',
        className: 'border-emerald-500/40 bg-emerald-950/60 text-emerald-200',
      }
    default:
      return {
        label: 'Frame + Motion',
        hint: 'Affects both keyframe composition and clip motion',
        className: 'border-teal-500/40 bg-teal-950/60 text-teal-200',
      }
  }
}

function parseStartSecFromTimecode(tc?: string): number | null {
  if (!tc) return null
  const match = tc.match(/(\d{1,2}):(\d{2})/)
  if (!match) return null
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10)
}

function formatPatchSummaryEntries(
  patch?: StillDirectorPatch
): Array<{ label: string; value: string }> {
  if (!patch) return []
  const entries: Array<{ label: string; value: string }> = []
  const add = (label: string, val?: string) => {
    if (val && val.trim()) entries.push({ label, value: val.trim() })
  }
  add('Shot Type', patch.shotType)
  add('Camera Angle', patch.cameraAngle)
  add('Camera Movement', patch.cameraMovement)
  add('Frozen Moment', patch.frozenMoment || patch.actionFraming)
  add('Action', patch.actionDescription)
  add('Blocking', patch.blocking)
  add('Gaze', patch.gaze)
  add('Emotion', patch.emotion)
  add('Prop Interaction', patch.propInteraction)
  add('Lighting', patch.lightingAccent)
  if (Array.isArray(patch.castInFrame) && patch.castInFrame.length > 0) {
    add('Cast in Frame', patch.castInFrame.join(', '))
  }
  if (Array.isArray(patch.keyProps) && patch.keyProps.length > 0) {
    add('Key Props', patch.keyProps.join(', '))
  }
  return entries
}

// ============================================================================
// Main Component: SceneVideoReviewerPanel
// ============================================================================

export function SceneVideoReviewerPanel({
  projectId,
  sceneId,
  sceneNumber,
  sceneIndex,
  scene,
  scenes,
  script,
  onScriptChange,
  productionData,
  onSegmentPromptChange,
  onProductionDataChange,
  characters = [],
  locationReferences = [],
  objectReferences = [],
  promptComposition,
  onOpenDirectShotWithRecommendation,
  onEditSceneWithRecommendations,
  onReviewComplete,
  className = '',
}: SceneVideoReviewerPanelProps) {
  const persistedReview = (scene?.videoReview ?? null) as SceneVideoReviewResult | null
  const [review, setReview] = useState<SceneVideoReviewResult | null>(persistedReview)
  const [isReviewing, setIsReviewing] = useState(false)
  const [sourceMode, setSourceMode] = useState<SceneVideoReviewSourceMode>('auto')
  const [selectedStreamId, setSelectedStreamId] = useState<string>('')
  const [activePerspectiveTab, setActivePerspectiveTab] = useState<'both' | 'audience' | 'director'>('both')
  const [recFilter, setRecFilter] = useState<RecommendationFilter>('all')
  const [selectedRecIds, setSelectedRecIds] = useState<Set<string>>(new Set())
  const [applyingRecId, setApplyingRecId] = useState<string | null>(null)
  const [isApplyingBatch, setIsApplyingBatch] = useState(false)
  const [selectedShotNumber, setSelectedShotNumber] = useState<number>(1)
  const [monitorMode, setMonitorMode] = useState<'stream' | 'shot'>('shot')
  const [expandedRecIds, setExpandedRecIds] = useState<Set<string>>(new Set())
  const videoRef = useRef<HTMLVideoElement | null>(null)

  // Sync when scene changes or persisted review updates
  useEffect(() => {
    if (scene?.videoReview) {
      setReview(scene.videoReview as SceneVideoReviewResult)
    }
  }, [scene?.videoReview, sceneId])

  // Auto-select unapplied high-priority recommendations when a fresh review arrives
  useEffect(() => {
    if (!review?.recommendations) return
    const initialSelected = new Set<string>()
    for (const rec of review.recommendations) {
      if (!rec.applied && (rec.priority === 'high' || rec.priority === 'medium')) {
        initialSelected.add(rec.id)
      }
    }
    setSelectedRecIds(initialSelected)
  }, [review?.generatedAt])

  // Extract segments, streams, and beats for readiness counters and monitor playback
  const segments = useMemo(() => {
    if (Array.isArray(productionData?.segments) && productionData!.segments.length > 0) {
      return productionData!.segments
    }
    if (Array.isArray(scene?.segments)) {
      return scene.segments
    }
    return []
  }, [productionData?.segments, scene?.segments])

  const completedStreams = useMemo(() => {
    const raw =
      Array.isArray(productionData?.productionStreams) &&
      productionData!.productionStreams.length > 0
        ? productionData!.productionStreams
        : Array.isArray(scene?.productionStreams)
          ? scene.productionStreams
          : []
    return raw.filter((s: any) => s && s.mp4Url && s.status === 'complete')
  }, [productionData?.productionStreams, scene?.productionStreams])

  const renderedSceneUrl =
    productionData?.renderedSceneUrl || scene?.renderedSceneUrl || null

  const activeBeats = useMemo(() => {
    return getSceneBeats(scene || {}).filter((b) => !isBeatExcluded(b))
  }, [scene])

  const shotMediaItems = useMemo(() => {
    const count = Math.max(activeBeats.length, segments.length)
    const items: Array<{
      shotNumber: number
      beatId?: string
      segmentId?: string
      videoUrl?: string
      frameUrl?: string
      label: string
    }> = []

    for (let i = 0; i < count; i++) {
      const beat = activeBeats[i]
      const seg =
        (beat ? segments.find((s: any) => s.beatId === beat.beatId) : undefined) ??
        segments[i]
      const latestTakeUrl =
        Array.isArray(seg?.takes) && seg.takes.length > 0
          ? seg.takes[seg.takes.length - 1]?.assetUrl
          : undefined
      const rawUrl = seg?.activeAssetUrl || latestTakeUrl || undefined
      const isVideo =
        !!rawUrl &&
        (seg?.assetType === 'video' ||
          /\.(mp4|webm|mov)(\?|$)/i.test(rawUrl) ||
          seg?.status === 'COMPLETE' ||
          seg?.status === 'UPLOADED')
      const frameUrl =
        seg?.startFrameUrl ||
        seg?.references?.startFrameUrl ||
        beat?.storyboardImageUrl ||
        undefined
      items.push({
        shotNumber: i + 1,
        beatId: beat?.beatId || seg?.beatId,
        segmentId: seg?.segmentId,
        videoUrl: isVideo ? rawUrl : undefined,
        frameUrl,
        label:
          beat?.kind === 'spoken' && beat?.speaker
            ? `Shot ${i + 1} · ${beat.speaker}`
            : `Shot ${i + 1}`,
      })
    }
    return items
  }, [activeBeats, segments])

  const readyClipCount = useMemo(
    () => shotMediaItems.filter((item) => !!item.videoUrl).length,
    [shotMediaItems]
  )
  const readyKeyframeCount = useMemo(
    () => shotMediaItems.filter((item) => !!item.frameUrl).length,
    [shotMediaItems]
  )
  const hasRenderedStream = completedStreams.length > 0 || !!renderedSceneUrl

  const activeStreamUrl = useMemo(() => {
    if (selectedStreamId) {
      const found = completedStreams.find((s: any) => s.id === selectedStreamId)
      if (found?.mp4Url) return found.mp4Url as string
    }
    const videoStream = completedStreams.find((s: any) => s.streamType === 'video')
    return (
      (videoStream?.mp4Url as string | undefined) ||
      (completedStreams[completedStreams.length - 1]?.mp4Url as string | undefined) ||
      renderedSceneUrl ||
      review?.reviewedVideoUrl ||
      null
    )
  }, [completedStreams, selectedStreamId, renderedSceneUrl, review?.reviewedVideoUrl])

  // Switch monitor to stream if rendered_mp4 was reviewed and no shot clip exists
  useEffect(() => {
    if (activeStreamUrl && readyClipCount === 0) {
      setMonitorMode('stream')
    }
  }, [activeStreamUrl, readyClipCount])

  const seekOrFocusShot = useCallback(
    (shotNumber?: number, timecode?: string) => {
      if (typeof shotNumber === 'number' && shotNumber >= 1) {
        setSelectedShotNumber(shotNumber)
      }
      const sec = parseStartSecFromTimecode(timecode)
      if (monitorMode === 'stream' && videoRef.current && sec !== null) {
        try {
          videoRef.current.currentTime = sec
          void videoRef.current.play().catch(() => {})
        } catch {
          // Ignore seek errors before metadata loaded
        }
      }
    },
    [monitorMode]
  )

  // ============================================================================
  // Run Multimodal Scene Review
  // ============================================================================

  const handleRunReview = async () => {
    setIsReviewing(true)
    try {
      const response = await fetch('/api/vision/review-scene-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          sceneIndex,
          sceneId,
          sourceMode,
          streamId: selectedStreamId || undefined,
          sceneOverride: scene,
          segments,
          productionStreams: completedStreams,
          renderedSceneUrl,
          references: {
            characters,
            locationReferences,
            objectReferences,
          },
          previousArScore: review?.arScore,
        }),
      })
      const data = await response.json()
      if (!response.ok || !data.review) {
        throw new Error(data.error || 'Scene video review failed')
      }
      const nextReview = data.review as SceneVideoReviewResult
      setReview(nextReview)
      onReviewComplete?.(nextReview)

      // Persist review onto in-memory script scenes so it survives tab switches
      if (onScriptChange && Array.isArray(scenes) && scenes[sceneIndex]) {
        const nextScenes = [...scenes]
        nextScenes[sceneIndex] = {
          ...nextScenes[sceneIndex],
          videoReview: nextReview,
        }
        onScriptChange({
          ...script,
          script: script?.script
            ? { ...script.script, scenes: nextScenes }
            : undefined,
          ...(script?.script ? {} : { scenes: nextScenes }),
        })
      }

      toast.success(
        `Scene ${sceneNumber} reviewed — AR Score ${nextReview.arScore} · Director Score ${nextReview.directorScore}`
      )
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to run multimodal scene review'
      )
    } finally {
      setIsReviewing(false)
    }
  }

  // ============================================================================
  // Apply Recommendations (Shot Director & Scene Director)
  // ============================================================================

  /**
   * Request AI Shot Director patch refinement via `/api/scene/direct-beat-still`
   * and merge with the recommendation's structured `shotPatch`.
   */
  const resolveRefinedShotPatch = async (
    rec: SceneVideoRecommendation,
    beatId: string
  ): Promise<StillDirectorPatch> => {
    const basePatch = normalizeRecommendationShotPatch(rec.shotPatch)
    if (!projectId) {
      return basePatch || { blocking: rec.directorInstruction }
    }
    try {
      const response = await fetch('/api/scene/direct-beat-still', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          sceneIndex,
          beatId,
          mode: 'rewrite',
          userDirection: rec.directorInstruction,
        }),
      })
      if (response.ok) {
        const data = await response.json()
        const aiPatch = normalizeRecommendationShotPatch(data.patch)
        return mergeShotDirectorPatches(basePatch, aiPatch)
      }
    } catch (err) {
      console.warn('[SceneVideoReviewer] Using baseline shotPatch after API fallback:', err)
    }
    return basePatch || { blocking: rec.directorInstruction }
  }

  const applyShotRecommendationsList = async (
    recsToApply: SceneVideoRecommendation[]
  ) => {
    const shotRecs = recsToApply.filter((r) => r.target === 'shot_director')
    if (shotRecs.length === 0) return
    if (!onScriptChange) {
      toast.error('Scene is in read-only mode.')
      return
    }

    const resolvedItems: Array<{
      recommendation: SceneVideoRecommendation
      resolvedPatch?: StillDirectorPatch
    }> = []

    for (const rec of shotRecs) {
      const resolvedBeat = resolveBeatForRecommendation(scene, rec, segments as any)
      if (!resolvedBeat) continue
      const refinedPatch = await resolveRefinedShotPatch(rec, resolvedBeat.beat.beatId)
      resolvedItems.push({
        recommendation: {
          ...rec,
          beatId: resolvedBeat.beat.beatId,
        },
        resolvedPatch: refinedPatch,
      })
    }

    if (resolvedItems.length === 0) {
      toast.error('Could not match recommendations to active shots in this scene.')
      return
    }

    const appliedAt = new Date().toISOString()
    const result = applyShotDirectorRecommendationsToScenes({
      scenes,
      sceneIdx: sceneIndex,
      recommendations: resolvedItems,
      characters: characters.map((c) => ({
        id: c.id,
        name: c.name,
        referenceImage: c.referenceImage,
        type: c.type,
      })),
      locationReferences: locationReferences.map((l) => ({ id: l.id })),
      objectReferences: objectReferences.map((o) => ({ id: o.id, name: o.name })),
      promptComposition,
      segments: segments as any,
    })

    // Mark applied on the review state as well
    const appliedSet = new Set(result.appliedIds)
    const updatedReview: SceneVideoReviewResult | null = review
      ? {
          ...review,
          recommendations: review.recommendations.map((r) =>
            appliedSet.has(r.id) ? { ...r, applied: true, appliedAt } : r
          ),
        }
      : null

    if (updatedReview) {
      setReview(updatedReview)
      result.scenes[sceneIndex] = {
        ...result.scenes[sceneIndex],
        videoReview: updatedReview,
      }
    }

    // Update script state (updates beatDirection, storyboardImagePrompt, and scene.segments)
    onScriptChange({
      ...script,
      script: script?.script
        ? { ...script.script, scenes: result.scenes }
        : undefined,
      ...(script?.script ? {} : { scenes: result.scenes }),
    })

    // Also synchronize sceneProductionData segments so Video Queue reflects prompt + negativePrompt immediately
    if (result.segmentPromptUpdates.length > 0) {
      for (const segUpdate of result.segmentPromptUpdates) {
        if (segUpdate.videoPrompt && onSegmentPromptChange) {
          onSegmentPromptChange(sceneId, segUpdate.segmentId, segUpdate.videoPrompt)
        }
      }
      if (onProductionDataChange && productionData && Array.isArray(productionData.segments)) {
        const updatedProdSegments = productionData.segments.map((seg: any) => {
          const match = result.segmentPromptUpdates.find(
            (u) => u.segmentId === seg.segmentId || (u.beatId && u.beatId === seg.beatId)
          )
          if (!match) return seg
          return {
            ...seg,
            ...(match.videoPrompt ? { videoPrompt: match.videoPrompt } : {}),
            ...(match.negativePrompt ? { negativePrompt: match.negativePrompt } : {}),
          }
        })
        onProductionDataChange(sceneId, {
          ...productionData,
          segments: updatedProdSegments,
        })
      }
    }

    // Deselect applied IDs
    setSelectedRecIds((prev) => {
      const next = new Set(prev)
      for (const id of result.appliedIds) next.delete(id)
      return next
    })

    toast.success(
      result.appliedIds.length === 1
        ? 'Applied Shot Director fix — shot direction, still prompt, and video prompt updated.'
        : `Applied ${result.appliedIds.length} Shot Director fixes — shot directions and prompts updated.`
    )
  }

  const handleApplySingleShotRecommendation = async (rec: SceneVideoRecommendation) => {
    setApplyingRecId(rec.id)
    try {
      await applyShotRecommendationsList([rec])
    } finally {
      setApplyingRecId(null)
    }
  }

  const handleOpenInDirectShot = (rec: SceneVideoRecommendation) => {
    const resolved = resolveBeatForRecommendation(scene, rec, segments as any)
    const beatId = resolved?.beat.beatId || rec.beatId || activeBeats[0]?.beatId
    if (!beatId) {
      toast.error('No target shot found for this recommendation.')
      return
    }
    if (onOpenDirectShotWithRecommendation) {
      onOpenDirectShotWithRecommendation({
        beatId,
        instruction: rec.directorInstruction,
        patch: normalizeRecommendationShotPatch(rec.shotPatch),
      })
    } else {
      toast.info('Direct Shot dialog is available in the Scene Direction workflow.')
    }
  }

  const handleApplySceneRecommendations = (recs: SceneVideoRecommendation[]) => {
    const sceneRecs = recs.filter((r) => r.target === 'scene_director')
    if (sceneRecs.length === 0) return
    if (!onEditSceneWithRecommendations) {
      toast.error('Scene Director is not available in this view.')
      return
    }

    const instructions = sceneRecs.map((r) => r.directorInstruction)
    const hasModerate = sceneRecs.some(
      (r) => r.revisionDepth === 'moderate' || r.revisionDepth === 'deep'
    )
    onEditSceneWithRecommendations(sceneIndex, instructions, {
      revisionDepth: hasModerate ? 'moderate' : 'light',
      PreserveBeatCount: true,
      recSource: 'audience',
    })

    const appliedAt = new Date().toISOString()
    const appliedIds = new Set(sceneRecs.map((r) => r.id))
    if (review) {
      setReview({
        ...review,
        recommendations: review.recommendations.map((r) =>
          appliedIds.has(r.id) ? { ...r, applied: true, appliedAt } : r
        ),
      })
    }
  }

  const handleApplySelectedBatch = async () => {
    if (!review) return
    const selectedList = review.recommendations.filter((r) =>
      selectedRecIds.has(r.id)
    )
    const shotRecs = selectedList.filter((r) => r.target === 'shot_director')
    const sceneRecs = selectedList.filter((r) => r.target === 'scene_director')

    setIsApplyingBatch(true)
    try {
      if (shotRecs.length > 0) {
        await applyShotRecommendationsList(shotRecs)
      }
      if (sceneRecs.length > 0) {
        handleApplySceneRecommendations(sceneRecs)
      }
    } finally {
      setIsApplyingBatch(false)
    }
  }

  // ============================================================================
  // Computed Summaries & Filtering
  // ============================================================================

  const filteredRecommendations = useMemo(() => {
    const list = review?.recommendations ?? []
    return list.filter((rec) => {
      if (recFilter === 'shot_director') return rec.target === 'shot_director'
      if (recFilter === 'scene_director') return rec.target === 'scene_director'
      if (recFilter === 'unapplied') return !rec.applied
      return true
    })
  }, [review?.recommendations, recFilter])

  const selectedRecommendations = useMemo(() => {
    const list = review?.recommendations ?? []
    return list.filter((r) => selectedRecIds.has(r.id))
  }, [review?.recommendations, selectedRecIds])

  const selectedShotFixCount = useMemo(
    () => selectedRecommendations.filter((r) => r.target === 'shot_director').length,
    [selectedRecommendations]
  )
  const selectedSceneFixCount = useMemo(
    () => selectedRecommendations.filter((r) => r.target === 'scene_director').length,
    [selectedRecommendations]
  )

  const projectedArGain = useMemo(() => {
    return selectedRecommendations.reduce(
      (sum, r) => sum + (r.applied ? 0 : r.estimatedArImpact || 0),
      0
    )
  }, [selectedRecommendations])

  const projectedArScore = useMemo(() => {
    if (!review) return null
    return Math.min(99, review.arScore + projectedArGain)
  }, [review, projectedArGain])

  const selectedShotAssessment: ShotReviewAssessment | undefined = useMemo(() => {
    if (!review?.shotBreakdown?.length) return undefined
    return (
      review.shotBreakdown.find((s) => s.shotNumber === selectedShotNumber) ??
      review.shotBreakdown[0]
    )
  }, [review?.shotBreakdown, selectedShotNumber])

  const selectedShotMedia = useMemo(() => {
    return (
      shotMediaItems.find((m) => m.shotNumber === selectedShotNumber) ??
      shotMediaItems[0]
    )
  }, [shotMediaItems, selectedShotNumber])

  const toggleSelectRec = (id: string) => {
    setSelectedRecIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleExpandRec = (id: string) => {
    setExpandedRecIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div
      data-testid="scene-video-reviewer-panel"
      className={`flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-950/90 p-4 text-slate-100 ${className}`}
    >
      {/* 1. Top Control & Media Readiness Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800/90 bg-slate-900/70 px-3.5 py-2.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              <Eye className="h-4 w-4" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-white">
                  FlowDirector · Scene {sceneNumber}
                </h3>
                {review?.modelId && (
                  <span className="rounded border border-slate-700 bg-slate-800/80 px-1.5 py-0.5 text-[10px] font-mono text-slate-300">
                    {review.modelId}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                Multimodal Audience Resonance (AR), script compliance, continuity &amp; anomaly log — route optional pickups to Shot Director or Scene Director
              </p>
            </div>
          </div>

          <div className="hidden h-5 w-px bg-slate-800 sm:block" />

          {/* Media Readiness Pills */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <span
              className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 ${
                hasRenderedStream
                  ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300'
                  : 'border-slate-700 bg-slate-900 text-slate-400'
              }`}
            >
              <Film className="h-3 w-3" />
              {completedStreams.length > 0
                ? `${completedStreams.length} Rendered MP4${completedStreams.length > 1 ? 's' : ''}`
                : renderedSceneUrl
                  ? '1 Rendered MP4'
                  : 'No Rendered MP4'}
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 ${
                readyClipCount > 0
                  ? 'border-teal-500/40 bg-teal-950/40 text-teal-300'
                  : 'border-slate-700 bg-slate-900 text-slate-400'
              }`}
            >
              <Video className="h-3 w-3" />
              {readyClipCount}/{shotMediaItems.length} Shot Clips
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 ${
                readyKeyframeCount > 0
                  ? 'border-cyan-500/40 bg-cyan-950/40 text-cyan-300'
                  : 'border-slate-700 bg-slate-900 text-slate-400'
              }`}
            >
              <Layers className="h-3 w-3" />
              {readyKeyframeCount}/{shotMediaItems.length} Keyframes
            </span>
          </div>
        </div>

        {/* Source Selector + Run Review CTA */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Review media source"
            value={sourceMode}
            onChange={(e) => setSourceMode(e.target.value as SceneVideoReviewSourceMode)}
            disabled={isReviewing}
            className="h-8 rounded-md border border-slate-700 bg-slate-900 px-2.5 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
          >
            <option value="auto">Source: Auto (MP4 + Shot Clips)</option>
            <option value="rendered_mp4">Source: Rendered MP4 Stream</option>
            <option value="shot_clips">Source: Shot Clips &amp; Keyframes</option>
          </select>

          {(sourceMode === 'rendered_mp4' || sourceMode === 'auto') &&
            completedStreams.length > 1 && (
              <select
                aria-label="Select rendered stream"
                value={selectedStreamId}
                onChange={(e) => setSelectedStreamId(e.target.value)}
                disabled={isReviewing}
                className="h-8 rounded-md border border-slate-700 bg-slate-900 px-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
              >
                <option value="">Latest Video Stream</option>
                {completedStreams.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.streamType === 'animatic' ? 'Animatic' : 'Video'} ·{' '}
                    {(s.language || 'en').toUpperCase()}
                  </option>
                ))}
              </select>
            )}

          <Button
            type="button"
            size="sm"
            onClick={handleRunReview}
            disabled={isReviewing}
            className="h-8 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium gap-1.5"
          >
            {isReviewing ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Inspecting Video &amp; Shots...
              </>
            ) : review ? (
              <>
                <RefreshCw className="h-3.5 w-3.5" />
                Re-Run FlowDirector
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                Run FlowDirector
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Empty State before first review */}
      {!review && !isReviewing && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-800 bg-slate-900/40 px-6 py-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
            <Video className="h-6 w-6" />
          </div>
          <div className="max-w-lg space-y-1">
            <h4 className="text-sm font-semibold text-white">
              FlowDirector · Multimodal Review &amp; Pickup Dispatch
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              FlowDirector inspects your rendered scene MP4 stream and/or individual shot
              clips, start keyframes, and canonical reference plates against the screenplay —
              delivering an Audience Resonance (AR) Score, Director compliance breakdown, continuity
              anomaly log, and optional pickup recommendations routed directly to the Shot Director
              or Scene Director.
            </p>
          </div>
          <Button
            type="button"
            onClick={handleRunReview}
            className="mt-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs gap-1.5"
          >
            <Sparkles className="h-4 w-4" />
            Run FlowDirector
          </Button>
        </div>
      )}

      {/* Loading State */}
      {isReviewing && !review && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-indigo-500/30 bg-indigo-950/15 px-6 py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-white">
              Analyzing Scene {sceneNumber} Video Clips, Keyframes &amp; Continuity...
            </p>
            <p className="text-xs text-slate-400">
              Evaluating Audience Resonance (AR), Script Compliance, Temporal Motion Stability, and Shot Direction patches.
            </p>
          </div>
        </div>
      )}

      {/* Active Review Results */}
      {review && (
        <>
          {/* 2. Score Hero Strip: AR Score + Director Score + Executive Summary */}
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
            {/* Audience Resonance (AR) Score Card */}
            <div className="flex flex-col justify-between rounded-xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/40 via-slate-900/90 to-slate-900/90 p-3.5 lg:col-span-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-indigo-300">
                    <Users className="h-3.5 w-3.5" />
                    Audience Resonance (AR)
                  </span>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-white">{review.arScore}</span>
                    <span className="text-xs text-slate-400">/ 100</span>
                    {typeof review.previousArScore === 'number' &&
                      review.previousArScore !== review.arScore && (
                        <span
                          className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-semibold ${
                            review.arScore > review.previousArScore
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-amber-500/20 text-amber-300'
                          }`}
                        >
                          {review.arScore > review.previousArScore
                            ? `▲ +${review.arScore - review.previousArScore}`
                            : `▼ ${review.arScore - review.previousArScore}`}
                        </span>
                      )}
                  </div>
                </div>

                {/* Projected AR Score with selected optional fixes */}
                {projectedArScore !== null && projectedArGain > 0 && (
                  <div className="rounded-lg border border-emerald-500/35 bg-emerald-950/40 px-2.5 py-1.5 text-right">
                    <span className="block text-[9px] font-semibold uppercase tracking-wider text-emerald-300">
                      Projected w/ Selected
                    </span>
                    <div className="flex items-center justify-end gap-1 text-sm font-bold text-emerald-200">
                      <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                      {projectedArScore}
                      <span className="text-[11px] font-normal text-emerald-300">
                        (+{projectedArGain})
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                {review.audiencePerspective.summary}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
                <span>Source: {review.reviewedSource.replace('_', ' ')}</span>
                <span>•</span>
                <span>{review.reviewedClipCount} clips</span>
                <span>•</span>
                <span>{review.reviewedKeyframeCount} keyframes</span>
              </div>
            </div>

            {/* Director Score & Compliance Card */}
            <div className="flex flex-col justify-between rounded-xl border border-teal-500/30 bg-gradient-to-br from-teal-950/35 via-slate-900/90 to-slate-900/90 p-3.5 lg:col-span-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-teal-300">
                    <Clapperboard className="h-3.5 w-3.5" />
                    Director Execution &amp; Compliance
                  </span>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-white">
                      {review.directorScore}
                    </span>
                    <span className="text-xs text-slate-400">/ 100</span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1 text-[11px]">
                  <span
                    className={`rounded border px-2 py-0.5 font-medium ${getScoreBadgeColor(
                      review.directorPerspective.scriptComplianceScore
                    )}`}
                  >
                    Script Compliance: {review.directorPerspective.scriptComplianceScore}%
                  </span>
                  <span
                    className={`rounded border px-2 py-0.5 font-medium ${getScoreBadgeColor(
                      review.directorPerspective.continuityScore
                    )}`}
                  >
                    Continuity: {review.directorPerspective.continuityScore}%
                  </span>
                </div>
              </div>

              <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                {review.directorPerspective.summary}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80 text-[11px]">
                <span className="text-slate-400">
                  Tech Stability: {review.directorPerspective.technicalExecutionScore}%
                </span>
                <span>•</span>
                <span className="text-slate-400">
                  {review.anomalies.length} Anomal{review.anomalies.length === 1 ? 'y' : 'ies'}
                </span>
              </div>
            </div>

            {/* Executive Synthesis & Perspective Dimensions Card */}
            <div className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/80 p-3.5 lg:col-span-4">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Perspective Breakdown
                  </span>
                  <div className="inline-flex rounded-md border border-slate-700 bg-slate-950 p-0.5 text-[10px]">
                    {(['both', 'audience', 'director'] as const).map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setActivePerspectiveTab(tab)}
                        className={`rounded px-2 py-0.5 capitalize transition-colors ${
                          activePerspectiveTab === tab
                            ? 'bg-indigo-600 text-white font-semibold'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-2.5 space-y-1.5">
                  {(activePerspectiveTab === 'director'
                    ? review.directorPerspective.dimensions
                    : activePerspectiveTab === 'audience'
                      ? review.audiencePerspective.dimensions
                      : [
                          ...review.audiencePerspective.dimensions.slice(0, 3),
                          ...review.directorPerspective.dimensions.slice(0, 2),
                        ]
                  ).map((dim) => (
                    <div key={dim.id} className="space-y-0.5" title={dim.feedback}>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-300 truncate">{dim.name}</span>
                        <span className="font-mono font-semibold text-slate-200">
                          {dim.score}
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                        <div
                          className={`h-full rounded-full ${getScoreBarColor(dim.score)}`}
                          style={{ width: `${Math.max(5, Math.min(100, dim.score))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <p className="mt-2.5 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 line-clamp-2">
                {review.executiveSummary}
              </p>
            </div>
          </div>

          {/* 3. Interactive Video Monitor + Shot-by-Shot Compliance Matrix */}
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
            {/* Left: Video / Keyframe Monitor */}
            <div className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-900/70 p-3 lg:col-span-5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-200">
                  <Play className="h-3.5 w-3.5 text-indigo-400" />
                  <span>
                    {monitorMode === 'stream'
                      ? 'Rendered Scene Stream'
                      : `Shot #${selectedShotNumber} Monitor`}
                  </span>
                </div>
                <div className="inline-flex rounded-md border border-slate-700 bg-slate-950 p-0.5 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setMonitorMode('shot')}
                    className={`rounded px-2 py-0.5 ${
                      monitorMode === 'shot'
                        ? 'bg-teal-600 text-white font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Shot Clip / Still
                  </button>
                  <button
                    type="button"
                    onClick={() => setMonitorMode('stream')}
                    disabled={!activeStreamUrl}
                    className={`rounded px-2 py-0.5 disabled:opacity-40 ${
                      monitorMode === 'stream'
                        ? 'bg-indigo-600 text-white font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Full Scene MP4
                  </button>
                </div>
              </div>

              <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-slate-800 bg-black flex items-center justify-center">
                {monitorMode === 'stream' && activeStreamUrl ? (
                  <video
                    ref={videoRef}
                    key={activeStreamUrl}
                    src={activeStreamUrl}
                    controls
                    playsInline
                    className="h-full w-full object-contain"
                  />
                ) : selectedShotMedia?.videoUrl ? (
                  <video
                    key={selectedShotMedia.videoUrl}
                    src={selectedShotMedia.videoUrl}
                    controls
                    playsInline
                    className="h-full w-full object-contain"
                  />
                ) : selectedShotMedia?.frameUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selectedShotMedia.frameUrl}
                    alt={`Shot ${selectedShotNumber} keyframe`}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-1.5 text-xs text-slate-500 p-4 text-center">
                    <Film className="h-6 w-6 text-slate-600" />
                    <span>No rendered clip or keyframe for Shot #{selectedShotNumber} yet</span>
                  </div>
                )}
              </div>

              {/* Selected Shot Quick Compliance Detail */}
              {selectedShotAssessment && (
                <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-2.5 text-xs space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">
                        Shot #{selectedShotAssessment.shotNumber}
                      </span>
                      {selectedShotAssessment.timecodeRange && (
                        <span className="inline-flex items-center gap-1 font-mono text-[10px] text-slate-400">
                          <Clock className="h-3 w-3" />
                          {selectedShotAssessment.timecodeRange}
                        </span>
                      )}
                      <span
                        className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                          selectedShotAssessment.status === 'pass'
                            ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                            : selectedShotAssessment.status === 'warning'
                              ? 'border-amber-500/40 bg-amber-500/15 text-amber-300'
                              : 'border-rose-500/40 bg-rose-500/15 text-rose-300'
                        }`}
                      >
                        {selectedShotAssessment.status} · {selectedShotAssessment.score}/100
                      </span>
                    </div>

                    {selectedShotAssessment.beatId && onOpenDirectShotWithRecommendation && (
                      <button
                        type="button"
                        onClick={() =>
                          onOpenDirectShotWithRecommendation({
                            beatId: selectedShotAssessment.beatId!,
                            instruction: '',
                          })
                        }
                        className="inline-flex items-center gap-1 rounded border border-teal-700/70 bg-teal-950/50 px-2 py-0.5 text-[11px] text-teal-200 hover:bg-teal-900/50"
                      >
                        <Clapperboard className="h-3 w-3" />
                        Direct Shot #{selectedShotAssessment.shotNumber}
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-300">
                    <span className="font-medium text-slate-400">Script Compliance: </span>
                    {selectedShotAssessment.scriptComplianceNote}
                  </p>
                  <p className="text-[11px] text-slate-300">
                    <span className="font-medium text-slate-400">Visual &amp; Motion: </span>
                    {selectedShotAssessment.visualQualityNote}
                  </p>
                  <p className="text-[11px] text-slate-300">
                    <span className="font-medium text-slate-400">Continuity: </span>
                    {selectedShotAssessment.continuityNote}
                  </p>
                </div>
              )}
            </div>

            {/* Right: Shot-by-Shot Compliance Matrix & Detected Anomalies */}
            <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/70 p-3 lg:col-span-7">
              {/* Shot Selector Strip */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-white">
                    Shot-by-Shot Compliance ({review.shotBreakdown.length} Shots)
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Click a shot to inspect clip &amp; compliance notes
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                  {review.shotBreakdown.map((shot) => {
                    const isSelected = shot.shotNumber === selectedShotNumber
                    const statusIcon =
                      shot.status === 'pass' ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                      ) : shot.status === 'warning' ? (
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                      )
                    return (
                      <button
                        key={shot.beatId || shot.shotNumber}
                        type="button"
                        onClick={() => seekOrFocusShot(shot.shotNumber, shot.timecodeRange)}
                        className={`flex flex-col gap-1 rounded-lg border p-2 text-left transition-colors ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-950/40 ring-1 ring-indigo-500/40'
                            : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-semibold text-white">
                            Shot #{shot.shotNumber}
                          </span>
                          {statusIcon}
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span>Score: {shot.score}</span>
                          {shot.anomalyIds.length > 0 && (
                            <span className="text-amber-300 font-medium">
                              {shot.anomalyIds.length} issue{shot.anomalyIds.length > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 truncate">
                          {shot.scriptComplianceNote}
                        </p>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Anomalies & Inconsistencies Ledger */}
              <div className="flex-1 border-t border-slate-800 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-white">
                    <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />
                    Detected Anomalies &amp; Inconsistencies ({review.anomalies.length})
                  </span>
                </div>

                {review.anomalies.length === 0 ? (
                  <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-950/20 px-3 py-2.5 text-xs text-emerald-200">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    No critical visual, continuity, or script anomalies detected in this scene.
                  </div>
                ) : (
                  <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                    {review.anomalies.map((anom: SceneVideoAnomaly) => {
                      const sev = getSeverityBadge(anom.severity)
                      const orig = getOriginBadge(anom.origin)
                      return (
                        <div
                          key={anom.id}
                          onClick={() => seekOrFocusShot(anom.shotNumber, anom.timecode)}
                          className="cursor-pointer rounded-lg border border-slate-800 bg-slate-950/80 p-2.5 transition-colors hover:border-slate-700"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-1.5">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span
                                className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase ${sev.className}`}
                              >
                                {sev.label}
                              </span>
                              <span
                                className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${orig.className}`}
                                title={orig.hint}
                              >
                                {orig.label}
                              </span>
                              <span className="text-xs font-semibold text-slate-100">
                                {anom.title}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                              {anom.shotNumber && (
                                <span className="rounded bg-slate-800 px-1.5 py-0.5 font-medium text-teal-300">
                                  Shot #{anom.shotNumber}
                                </span>
                              )}
                              {anom.timecode && (
                                <span className="font-mono">{anom.timecode}</span>
                              )}
                            </div>
                          </div>
                          <p className="mt-1 text-xs text-slate-300">{anom.description}</p>
                          {anom.evidence && (
                            <p className="mt-0.5 text-[11px] text-slate-400 italic">
                              Evidence: {anom.evidence}
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 4. Optional Actionable Recommendations Workbench */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3.5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-white flex items-center gap-1.5">
                  <Wand2 className="h-3.5 w-3.5 text-teal-400" />
                  Optional FlowDirector Pickups &amp; Recommendations ({review.recommendations.length})
                </h4>
                <p className="text-[11px] text-slate-400">
                  Select which pickup recommendations to apply. Visual, camera, blocking, and continuity
                  fixes route to the <strong className="text-teal-300">Shot Director</strong>{' '}
                  (updating shot direction, still prompts, and video prompts). Script and pacing
                  changes route to the <strong className="text-indigo-300">Scene Director</strong>.
                </p>
              </div>

              {/* Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    { id: 'all', label: `All (${review.recommendations.length})` },
                    {
                      id: 'shot_director',
                      label: `Shot Director (${
                        review.recommendations.filter((r) => r.target === 'shot_director').length
                      })`,
                    },
                    {
                      id: 'scene_director',
                      label: `Scene Director (${
                        review.recommendations.filter((r) => r.target === 'scene_director').length
                      })`,
                    },
                    {
                      id: 'unapplied',
                      label: `Unapplied (${
                        review.recommendations.filter((r) => !r.applied).length
                      })`,
                    },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setRecFilter(tab.id)}
                    className={`rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                      recFilter === tab.id
                        ? 'border-indigo-500/60 bg-indigo-600/25 text-white'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Recommendations List */}
            {filteredRecommendations.length === 0 ? (
              <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4 text-center text-xs text-slate-400">
                No recommendations match the current filter.
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredRecommendations.map((rec) => {
                  const isSelected = selectedRecIds.has(rec.id)
                  const isExpanded = expandedRecIds.has(rec.id)
                  const isApplyingThis = applyingRecId === rec.id
                  const patchEntries = formatPatchSummaryEntries(rec.shotPatch)

                  return (
                    <div
                      key={rec.id}
                      className={`rounded-lg border p-3 transition-colors ${
                        rec.applied
                          ? 'border-emerald-500/30 bg-emerald-950/10'
                          : isSelected
                            ? 'border-indigo-500/50 bg-indigo-950/20'
                            : 'border-slate-800 bg-slate-950/70'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5 min-w-0 flex-1">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelectRec(rec.id)}
                            aria-label={`Select recommendation ${rec.title}`}
                            className="mt-0.5"
                          />
                          <div className="min-w-0 flex-1 space-y-1">
                            {/* Badges Row */}
                            <div className="flex flex-wrap items-center gap-1.5">
                              {rec.target === 'shot_director' ? (
                                <Badge
                                  variant="outline"
                                  className="border-teal-500/50 bg-teal-950/60 text-teal-200 text-[10px] gap-1"
                                >
                                  <Clapperboard className="h-3 w-3" />
                                  Shot Director
                                  {rec.shotNumber ? ` · Shot #${rec.shotNumber}` : ''}
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="border-indigo-500/50 bg-indigo-950/60 text-indigo-200 text-[10px] gap-1"
                                >
                                  <Sparkles className="h-3 w-3" />
                                  Scene Director · Scene {sceneNumber}
                                </Badge>
                              )}

                              <span className="rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[10px] text-slate-300">
                                {RECOMMENDATION_CATEGORY_LABELS[rec.category] || rec.category}
                              </span>

                              <span
                                className={`rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase ${
                                  rec.priority === 'high'
                                    ? 'border-rose-500/40 bg-rose-500/15 text-rose-300'
                                    : rec.priority === 'medium'
                                      ? 'border-amber-500/40 bg-amber-500/15 text-amber-300'
                                      : 'border-slate-700 bg-slate-800 text-slate-300'
                                }`}
                              >
                                {rec.priority} priority
                              </span>

                              {rec.estimatedArImpact > 0 && (
                                <span className="inline-flex items-center gap-0.5 rounded border border-emerald-500/40 bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300">
                                  <TrendingUp className="h-2.5 w-2.5" />+{rec.estimatedArImpact} AR pts
                                </span>
                              )}

                              {rec.regenerateKeyframeRecommended && (
                                <span className="rounded border border-cyan-500/40 bg-cyan-950/50 px-1.5 py-0.5 text-[10px] text-cyan-200">
                                  Keyframe Regen Recommended
                                </span>
                              )}

                              {rec.applied && (
                                <span className="inline-flex items-center gap-1 rounded border border-emerald-500/50 bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-200">
                                  <Check className="h-3 w-3" />
                                  Applied
                                </span>
                              )}
                            </div>

                            {/* Title & Description */}
                            <div className="flex items-center gap-2">
                              <h5 className="text-xs font-semibold text-white">{rec.title}</h5>
                              {rec.timecode && (
                                <button
                                  type="button"
                                  onClick={() => seekOrFocusShot(rec.shotNumber, rec.timecode)}
                                  className="text-[10px] font-mono text-indigo-300 hover:underline"
                                >
                                  @{rec.timecode}
                                </button>
                              )}
                            </div>
                            <p className="text-xs text-slate-300">{rec.description}</p>
                            <p className="text-[11px] text-slate-400">
                              <span className="font-medium text-slate-300">Why it matters: </span>
                              {rec.rationale}
                            </p>

                            {/* Expandable Prompt & Direction Patch Preview */}
                            <div className="pt-1">
                              <button
                                type="button"
                                onClick={() => toggleExpandRec(rec.id)}
                                className="inline-flex items-center gap-1 text-[11px] font-medium text-teal-300 hover:text-teal-200"
                              >
                                {isExpanded ? (
                                  <ChevronDown className="h-3.5 w-3.5" />
                                ) : (
                                  <ChevronRight className="h-3.5 w-3.5" />
                                )}
                                {rec.target === 'shot_director'
                                  ? 'Preview Shot Direction & Prompt Update'
                                  : 'Preview Scene Director Instruction'}
                              </button>

                              {isExpanded && (
                                <div className="mt-2 rounded-md border border-slate-800 bg-slate-900/90 p-2.5 text-xs space-y-2">
                                  <div>
                                    <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                      Director Instruction
                                    </span>
                                    <p className="mt-0.5 text-slate-200">
                                      {rec.directorInstruction}
                                    </p>
                                  </div>

                                  {rec.target === 'shot_director' && patchEntries.length > 0 && (
                                    <div>
                                      <span className="block text-[10px] font-semibold uppercase tracking-wider text-teal-300">
                                        Proposed Shot Director Patch (Auto-updates Frame &amp; Video Prompts)
                                      </span>
                                      <div className="mt-1 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                                        {patchEntries.map((entry) => (
                                          <div
                                            key={entry.label}
                                            className="rounded border border-slate-800 bg-slate-950/70 px-2 py-1"
                                          >
                                            <span className="text-[10px] font-semibold uppercase text-slate-400">
                                              {entry.label}:{' '}
                                            </span>
                                            <span className="text-[11px] text-slate-200">
                                              {entry.value}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {rec.negativePromptAdditions && (
                                    <div>
                                      <span className="block text-[10px] font-semibold uppercase tracking-wider text-rose-300">
                                        Negative Prompt Additions (Segment Video Queue)
                                      </span>
                                      <p className="mt-0.5 font-mono text-[11px] text-rose-200">
                                        + {rec.negativePromptAdditions}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Individual Action Buttons */}
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          {rec.target === 'shot_director' ? (
                            <>
                              <Button
                                type="button"
                                size="sm"
                                disabled={isApplyingThis || isApplyingBatch || !onScriptChange}
                                onClick={() => handleApplySingleShotRecommendation(rec)}
                                className="h-7 bg-teal-600 hover:bg-teal-500 text-white text-[11px] px-2.5 gap-1"
                              >
                                {isApplyingThis ? (
                                  <>
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    Applying...
                                  </>
                                ) : (
                                  <>
                                    <Clapperboard className="h-3 w-3" />
                                    {rec.applied ? 'Re-Apply to Shot' : 'Apply via Shot Director'}
                                  </>
                                )}
                              </Button>

                              {onOpenDirectShotWithRecommendation && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenInDirectShot(rec)}
                                  className="inline-flex items-center gap-1 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] text-slate-300 hover:bg-slate-800 hover:text-white"
                                >
                                  <Target className="h-3 w-3 text-teal-400" />
                                  Open in Direct Shot…
                                </button>
                              )}
                            </>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              disabled={!onEditSceneWithRecommendations}
                              onClick={() => handleApplySceneRecommendations([rec])}
                              className="h-7 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] px-2.5 gap-1"
                            >
                              <Sparkles className="h-3 w-3" />
                              Apply in Scene Director…
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Batch Action Footer */}
            {review.recommendations.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/90 px-3.5 py-2.5">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-slate-300">
                    <strong>{selectedRecommendations.length}</strong> selected
                    {selectedShotFixCount > 0 && (
                      <span className="text-teal-300">
                        {' '}
                        · {selectedShotFixCount} Shot Director
                      </span>
                    )}
                    {selectedSceneFixCount > 0 && (
                      <span className="text-indigo-300">
                        {' '}
                        · {selectedSceneFixCount} Scene Director
                      </span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedRecIds(
                        new Set(
                          review.recommendations
                            .filter((r) => !r.applied)
                            .map((r) => r.id)
                        )
                      )
                    }
                    className="text-[11px] text-indigo-400 hover:underline"
                  >
                    Select all unapplied
                  </button>
                  {selectedRecommendations.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedRecIds(new Set())}
                      className="text-[11px] text-slate-400 hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {selectedShotFixCount > 0 && (
                    <Button
                      type="button"
                      size="sm"
                      disabled={isApplyingBatch || !onScriptChange}
                      onClick={() =>
                        applyShotRecommendationsList(
                          selectedRecommendations.filter(
                            (r) => r.target === 'shot_director'
                          )
                        )
                      }
                      className="h-8 bg-teal-600 hover:bg-teal-500 text-white text-xs gap-1.5"
                    >
                      {isApplyingBatch ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Applying Shot Fixes...
                        </>
                      ) : (
                        <>
                          <Clapperboard className="h-3.5 w-3.5" />
                          Apply Selected Shot Fixes ({selectedShotFixCount})
                        </>
                      )}
                    </Button>
                  )}

                  {selectedSceneFixCount > 0 && onEditSceneWithRecommendations && (
                    <Button
                      type="button"
                      size="sm"
                      disabled={isApplyingBatch}
                      onClick={() =>
                        handleApplySceneRecommendations(
                          selectedRecommendations.filter(
                            (r) => r.target === 'scene_director'
                          )
                        )
                      }
                      className="h-8 bg-indigo-600 hover:bg-indigo-500 text-white text-xs gap-1.5"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Send Selected to Scene Director ({selectedSceneFixCount})
                    </Button>
                  )}

                  {selectedShotFixCount > 0 && selectedSceneFixCount > 0 && (
                    <Button
                      type="button"
                      size="sm"
                      disabled={isApplyingBatch}
                      onClick={handleApplySelectedBatch}
                      className="h-8 bg-emerald-600 hover:bg-emerald-500 text-white text-xs gap-1.5"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Apply All Selected ({selectedRecommendations.length})
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ============================================================================
// Modal Dialog Wrapper: SceneVideoReviewerDialog
// ============================================================================

export function SceneVideoReviewerDialog({
  open,
  onOpenChange,
  ...panelProps
}: SceneVideoReviewerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex w-[min(76rem,calc(100vw-2rem))] max-w-none min-w-0 max-h-[92vh] flex-col gap-3 overflow-x-hidden overflow-y-auto bg-slate-950 border-slate-800 text-slate-100 p-4">
        <DialogTitle className="sr-only">
          FlowDirector · Scene {panelProps.sceneNumber}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Review rendered scene video or shot clips from Audience and Director perspectives and
          optionally apply recommendations via Shot Director or Scene Director.
        </DialogDescription>
        <SceneVideoReviewerPanel {...panelProps} className="border-0 bg-transparent p-0" />
      </DialogContent>
    </Dialog>
  )
}
