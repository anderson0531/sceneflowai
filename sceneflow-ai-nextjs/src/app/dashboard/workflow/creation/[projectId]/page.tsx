'use client'

import { use, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ContextBar } from '@/components/layout/ContextBar'
import { Button } from '@/components/ui/Button'
import { ArrowRight, Loader2, Play, Save, Share2, Settings } from 'lucide-react'
import { ProductionOverview, type ProductionOverviewMetrics } from '@/components/creation/ProductionOverview'
import { SceneWorkspace } from '@/components/creation/SceneWorkspace'
import { CharacterLibrary } from '@/components/vision/CharacterLibrary'
import { CreationScreeningRoom } from '@/components/creation/CreationScreeningRoom'
import { toast } from 'sonner'
import { calculateVideoCost, VIDEO_PRICING } from '@/lib/cost/videoCalculator'
import { usdToCredits } from '@/lib/cost/creditUtils'
import type {
  CreationSceneData,
  SceneTimelineData,
  CreationSceneAsset,
  CreationAssetType,
  VideoGenerationRequest,
  VideoModelKey,
} from '@/components/creation/types'
import { uploadAssetToBlob } from '@/lib/storage/upload'

interface CreationHubJobPayload {
  id: string
  projectId: string
  sceneId: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  error?: string
  asset?: CreationSceneAsset & { meta?: Record<string, any> }
}

interface CreationHubMetadata {
  scenes?: Record<string, Partial<CreationSceneData>> | Array<Partial<CreationSceneData>>
  metrics?: Partial<ProductionOverviewMetrics> & {
    providerKey?: keyof typeof VIDEO_PRICING
    markupPercent?: number
    fixedFeePerClip?: number
    creditsUsed?: number
    creditsForecast?: number
    totalCreditsEstimate?: number
    generatedDurationSec?: number
    estimatedDurationSec?: number
    generationQueueCount?: number
    generationQueueLabel?: string
  }
  lastUpdated?: string
}

interface VisionPhaseMetadata {
  script?: any
  scenes?: any[]
  characters?: any[]
  narrationVoice?: any
}

const CLIP_SECONDS = 10

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = parseFloat(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

async function measureMediaDuration(file: File): Promise<number | undefined> {
  if (typeof window === 'undefined') return undefined
  const isVideo = file.type.startsWith('video/')
  const isAudio = file.type.startsWith('audio/')
  if (!isVideo && !isAudio) {
    return undefined
  }

  const element = document.createElement(isVideo ? 'video' : 'audio')
  element.preload = 'metadata'

  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file)
    const cleanup = () => {
      URL.revokeObjectURL(objectUrl)
    }
    const handleLoadedMetadata = () => {
      const duration = Number.isFinite(element.duration) ? element.duration : undefined
      cleanup()
      resolve(duration)
    }
    const handleError = () => {
      cleanup()
      resolve(undefined)
    }

    element.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true })
    element.addEventListener('error', handleError, { once: true })
    element.src = objectUrl
  })
}

export default function CreationHubPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params)
  const router = useRouter()

  const [project, setProject] = useState<any | null>(null)
  const [visionPhase, setVisionPhase] = useState<VisionPhaseMetadata | null>(null)
  const [creationHub, setCreationHub] = useState<CreationHubMetadata | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSharing, setIsSharing] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [sceneState, setSceneState] = useState<CreationSceneData[]>([])
  const processedJobsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    let isActive = true

    async function loadProject() {
      setIsLoading(true)
      setError(null)
      try {
        const response = await fetch(`/api/projects/${projectId}?_t=${Date.now()}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          },
        })

        if (!response.ok) {
          const message = await response.text()
          throw new Error(message || 'Failed to load project')
        }

        const payload = await response.json()
        const loadedProject = payload.project ?? payload

        if (!isActive) return

        setProject(loadedProject)
        const vp: VisionPhaseMetadata | null = loadedProject.metadata?.visionPhase ?? null
        const ch: CreationHubMetadata | null = loadedProject.metadata?.creationHub ?? null
        setVisionPhase(vp)
        setCreationHub(ch)
      } catch (err) {
        console.error('[CreationHub] Failed to load project', err)
        if (!isActive) return
        setError(err instanceof Error ? err.message : 'Unable to load project')
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    loadProject()

    return () => {
      isActive = false
    }
  }, [projectId])

  useEffect(() => {
    processedJobsRef.current.clear()
  }, [project?.id])

  useEffect(() => {
    if (!project?.id) return
    let cancelled = false

    const syncJobs = async () => {
      try {
        const response = await fetch(`/api/creation/video/jobs?projectId=${project.id}`, {
          cache: 'no-store',
        })
        if (!response.ok) return
        const data = await response.json()
        if (!data.success || cancelled) return

        const jobs: Array<CreationHubJobPayload> = data.jobs || []
        jobs.forEach((job) => {
          mutateScene(job.sceneId, (scene) => {
            const assets = [...(scene.assets ?? [])]
            const idx = assets.findIndex((asset) => asset.id === job.id)
            const mappedStatus =
              job.status === 'completed'
                ? 'ready'
                : job.status === 'processing'
                  ? 'processing'
                  : job.status === 'failed'
                    ? 'failed'
                    : 'queued'

            if (idx === -1) {
              if (job.asset) {
                assets.push({
                  ...job.asset,
                  status: mappedStatus,
                  meta: { ...(job.asset.meta ?? {}), jobId: job.id },
                })
              }
            } else {
              const current = assets[idx]
              assets[idx] = {
                ...current,
                status: mappedStatus,
                sourceUrl: job.asset?.sourceUrl ?? current.sourceUrl,
                thumbnailUrl: job.asset?.thumbnailUrl ?? current.thumbnailUrl,
                durationSec: job.asset?.durationSec ?? current.durationSec,
                meta: {
                  ...(current.meta ?? {}),
                  jobId: job.id,
                  error: job.error ?? (current.meta as any)?.error,
                  chargedCredits: job.asset?.meta?.chargedCredits ?? (current.meta as any)?.chargedCredits,
                },
              }
            }

            return { ...scene, assets }
          })

          if (job.status === 'completed' && !processedJobsRef.current.has(job.id)) {
            processedJobsRef.current.add(job.id)
            setCreationHub((prev) => {
              const metrics = { ...(prev?.metrics ?? {}) }
              metrics.creditsUsed = toNumber(metrics.creditsUsed) + toNumber(job.asset?.meta?.chargedCredits)
              metrics.generatedDurationSec = toNumber(metrics.generatedDurationSec) + toNumber(job.asset?.durationSec)
              return { ...(prev ?? {}), metrics, lastUpdated: new Date().toISOString() }
            })
            toast.success('Veo clip ready for your scene!')
          }

          if (job.status === 'failed' && job.error) {
            toast.error(`Generation failed: ${job.error}`)
          }
        })
      } catch (error) {
        console.warn('[CreationHub] Failed to sync generation jobs', error)
      }
    }

    syncJobs()
    const interval = setInterval(syncJobs, 5000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [project?.id, mutateScene])

  const characters = useMemo(() => {
    return visionPhase?.characters ?? []
  }, [visionPhase])

  const characterSummaries = useMemo(
    () =>
      characters.map((char: any, index: number) => ({
        id: char.id || `character-${index}`,
        name: char.name || `Character ${index + 1}`,
        referenceImage: char.referenceImage || char.referenceImageGCS,
      })),
    [characters]
  )

  const scriptScenes = useMemo(() => {
    const candidates = [
      visionPhase?.script?.script?.scenes,
      visionPhase?.script?.scenes,
      visionPhase?.scenes,
      project?.metadata?.visionPhase?.script?.script?.scenes,
    ]
    for (const candidate of candidates) {
      if (Array.isArray(candidate) && candidate.length > 0) {
        return candidate
      }
    }
    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        return candidate
      }
    }
    return []
  }, [project, visionPhase])

  const workspaceScenes: CreationSceneData[] = useMemo(() => {
    const creationScenes = creationHub?.scenes ?? {}
    const creationAsArray = Array.isArray(creationScenes) ? creationScenes : null

    return scriptScenes.map((scene: any, index: number) => {
      const sceneId = scene.id || scene.sceneId || `scene-${index}`
      const sceneNumber = index + 1

      const creationEntry = creationAsArray
        ? creationAsArray[index]
        : (creationScenes as Record<string, Partial<CreationSceneData>>)[sceneId] ??
          (creationScenes as Record<string, Partial<CreationSceneData>>)[String(sceneNumber)] ??
          null

      const baseDuration = toNumber(scene.duration, toNumber(scene.estimatedDuration, CLIP_SECONDS))
      const timelineDuration = toNumber(creationEntry?.durationSec, baseDuration)

      const narrationUrl = scene.narrationAudioUrl || scene.narrationAudio?.url || scene.narrationAudio?.[0]?.url
      const musicUrl = scene.musicAudio || scene.musicAudioUrl

      return {
        sceneId,
        sceneNumber,
        heading: typeof scene.heading === 'string' ? scene.heading : scene.heading?.text,
        description: scene.visualDescription || scene.action || scene.summary,
        storyboardUrl: scene.imageUrl,
        durationSec: timelineDuration,
        timeline: creationEntry?.timeline ?? null,
        assets: creationEntry?.assets ?? [],
        narrationUrl,
        musicUrl,
        dialogueClips: creationEntry?.timeline?.dialogueTrack ?? null,
      }
    })
  }, [creationHub, scriptScenes])

  useEffect(() => {
    setSceneState(workspaceScenes)
  }, [workspaceScenes])

  const mutateScene = useCallback(
    (sceneId: string, updater: (scene: CreationSceneData) => CreationSceneData) => {
      setSceneState((prev) => prev.map((scene) => (scene.sceneId === sceneId ? updater(scene) : scene)))
    },
    []
  )

  const handleTimelineChange = (sceneId: string, timeline: SceneTimelineData) => {
    mutateScene(sceneId, (scene) => ({ ...scene, timeline }))
  }

  const handleAddAssetToTimeline = (sceneId: string, assetId: string) => {
    mutateScene(sceneId, (scene) => {
      const asset = scene.assets?.find((item) => item.id === assetId)
      if (!asset) return scene
      const existingTimeline: SceneTimelineData = scene.timeline ?? {
        videoTrack: [],
        userAudioTrack: [],
        narrationTrackUrl: scene.narrationUrl,
        musicTrackUrl: scene.musicUrl,
        dialogueTrack: scene.dialogueClips,
      }

      const isAudio = asset.type === 'user_audio' || asset.type === 'generated_audio'
      const targetTrack = isAudio ? existingTimeline.userAudioTrack ?? [] : existingTimeline.videoTrack ?? []
      const duration = asset.durationSec && asset.durationSec > 0
        ? asset.durationSec
        : asset.type === 'uploaded_image'
          ? 5
          : CLIP_SECONDS
      const startTime = targetTrack.reduce((sum, clip) => sum + toNumber(clip.timelineDuration), 0)

      const newClip = {
        assetId: asset.id,
        type: asset.type,
        sourceUrl: asset.sourceUrl,
        sourceInPoint: 0,
        sourceOutPoint: duration,
        timelineDuration: duration,
        startTime,
        label: asset.name,
        status: asset.status,
      }

      const updatedTimeline: SceneTimelineData = {
        ...existingTimeline,
        videoTrack: isAudio ? existingTimeline.videoTrack ?? [] : [...(existingTimeline.videoTrack ?? []), newClip],
        userAudioTrack: isAudio ? [...(existingTimeline.userAudioTrack ?? []), newClip] : existingTimeline.userAudioTrack ?? [],
      }

      if (!updatedTimeline.narrationTrackUrl && scene.narrationUrl) {
        updatedTimeline.narrationTrackUrl = scene.narrationUrl
      }
      if (!updatedTimeline.musicTrackUrl && scene.musicUrl) {
        updatedTimeline.musicTrackUrl = scene.musicUrl
      }

      return { ...scene, timeline: updatedTimeline }
    })
  }

  const handleUploadAsset = async (sceneId: string, file: File, type: CreationAssetType): Promise<CreationSceneAsset> => {
    if (!project?.id) throw new Error('Project not loaded')
    const uploadedUrl = await uploadAssetToBlob(file, file.name.replace(/\s+/g, '-').toLowerCase(), project.id)
    const duration = await measureMediaDuration(file)
    const asset: CreationSceneAsset = {
      id: crypto.randomUUID(),
      type,
      name: file.name,
      sourceUrl: uploadedUrl,
      durationSec: duration ?? (type === 'uploaded_image' ? 5 : CLIP_SECONDS),
      createdAt: new Date().toISOString(),
      status: 'ready',
    }

    mutateScene(sceneId, (scene) => ({
      ...scene,
      assets: [...(scene.assets ?? []), asset],
    }))

    return asset
  }

  const handleDeleteAsset = (sceneId: string, assetId: string) => {
    mutateScene(sceneId, (scene) => {
      const remainingAssets = (scene.assets ?? []).filter((asset) => asset.id !== assetId)
      if (!scene.timeline) {
        return { ...scene, assets: remainingAssets }
      }
      const updatedTimeline: SceneTimelineData = {
        ...scene.timeline,
        videoTrack: (scene.timeline.videoTrack ?? []).filter((clip) => clip.assetId !== assetId),
        userAudioTrack: (scene.timeline.userAudioTrack ?? []).filter((clip) => clip.assetId !== assetId),
      }
      return {
        ...scene,
        assets: remainingAssets,
        timeline: updatedTimeline,
      }
    })
  }

  const handleGenerateVideo = async (sceneId: string, request: VideoGenerationRequest) => {
    if (!project?.id) {
      toast.error('Project context missing. Please reload the page.')
      return
    }

    try {
      const response = await fetch('/api/creation/video/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          sceneId,
          prompt: request.prompt,
          durationSec: request.durationSec,
          modelKey: request.modelKey,
          characterIds: request.references.characterIds,
          markupPercent: costConfig.markupPercent,
          fixedFeePerClip: costConfig.fixedFeePerClip,
        }),
      })

      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to queue video generation')
      }

      const job = data.job as { id: string; status: string; createdAt: string; asset?: CreationSceneAsset }
      const asset: CreationSceneAsset = {
        id: job.id,
        type: 'generated_video',
        name: request.prompt.slice(0, 80) || 'Generated Clip',
        durationSec: request.durationSec,
        createdAt: job.createdAt,
        status: job.status === 'processing' ? 'processing' : job.status === 'completed' ? 'ready' : 'queued',
        sourceUrl: job.asset?.sourceUrl,
        thumbnailUrl: job.asset?.thumbnailUrl,
        meta: {
          ...(job.asset?.meta ?? {}),
          jobId: job.id,
          modelKey: request.modelKey,
        },
      }

      mutateScene(sceneId, (scene) => ({
        ...scene,
        assets: [...(scene.assets ?? []).filter((existing) => existing.id !== asset.id), asset],
      }))

      toast.success('Veo generation queued')
    } catch (error) {
      console.error('[CreationHub] Video generation error', error)
      toast.error(error instanceof Error ? error.message : 'Failed to queue generation')
    }
  }

  const costConfig = useMemo(() => ({
    providerKey: (creationHub?.metrics?.providerKey as VideoModelKey) ?? 'google_veo_standard',
    markupPercent: toNumber(creationHub?.metrics?.markupPercent, 0.25),
    fixedFeePerClip: toNumber(creationHub?.metrics?.fixedFeePerClip, 0.75),
  }), [creationHub])

  const productionMetrics: ProductionOverviewMetrics = useMemo(() => {
    const { providerKey, markupPercent, fixedFeePerClip } = costConfig

    const sequencedScenes = sceneState.filter((scene) => {
      if (!scene.timeline) return false
      const videoTrack = scene.timeline.videoTrack ?? []
      return videoTrack.some((clip) => toNumber((clip as any)?.timelineDuration) > 0)
    }).length

    const timelineDurationSec = sceneState.reduce((acc, scene) => {
      if (!scene.timeline || !scene.timeline.videoTrack) {
        return acc
      }
      const total = scene.timeline.videoTrack.reduce((sum, clip) => sum + toNumber(clip.timelineDuration), 0)
      return acc + total
    }, 0)

    const generatedDurationSec = timelineDurationSec > 0
      ? timelineDurationSec
      : toNumber(creationHub?.metrics?.generatedDurationSec)

    const estimatedFromScenes = sceneState.reduce((sum, scene) => sum + toNumber(scene.durationSec, CLIP_SECONDS), 0)
    const estimatedDurationSec = creationHub?.metrics?.estimatedDurationSec
      ? toNumber(creationHub.metrics.estimatedDurationSec)
      : (estimatedFromScenes > 0 ? estimatedFromScenes : sceneState.length * CLIP_SECONDS)

    const remainingDurationSec = Math.max(0, estimatedDurationSec - generatedDurationSec)

    const clipCountGenerated = Math.ceil(generatedDurationSec / CLIP_SECONDS)
    const clipCountRemaining = Math.ceil(remainingDurationSec / CLIP_SECONDS)

    const actualCredits = creationHub?.metrics?.creditsUsed ?? (
      clipCountGenerated > 0
        ? usdToCredits(calculateVideoCost(clipCountGenerated, providerKey, markupPercent, fixedFeePerClip).totalUserCost)
        : 0
    )

    const forecastCredits = creationHub?.metrics?.creditsForecast ?? (
      clipCountRemaining > 0
        ? usdToCredits(calculateVideoCost(clipCountRemaining, providerKey, markupPercent, fixedFeePerClip).totalUserCost)
        : 0
    )

    const totalCreditsEstimate = creationHub?.metrics?.totalCreditsEstimate ?? (actualCredits + forecastCredits)

    const totalAssets = sceneState.reduce((acc, scene) => acc + (scene.assets?.length ?? 0), 0)
    const generationQueueCount = sceneState.reduce((acc, scene) => {
      const pending = scene.assets?.filter((asset) => asset.status === 'queued' || asset.status === 'processing').length ?? 0
      return acc + pending
    }, 0)

    const generationQueueLabel = generationQueueCount > 0
      ? `Generating ${generationQueueCount} clip${generationQueueCount === 1 ? '' : 's'}…`
      : undefined

    return {
      sequencedScenes,
      totalScenes: sceneState.length,
      generatedDurationSec,
      estimatedDurationSec,
      totalAssets,
      generationQueueLabel,
      generationQueueCount,
      creditsUsed: actualCredits,
      creditsForecast,
      totalCreditsEstimate,
    }
  }, [costConfig, creationHub?.metrics, sceneState])

  const metricsPayload = useMemo(() => ({
    ...productionMetrics,
    providerKey: costConfig.providerKey,
    markupPercent: costConfig.markupPercent,
    fixedFeePerClip: costConfig.fixedFeePerClip,
  }), [productionMetrics, costConfig])

  const handleContinueToPolish = () => {
    toast.info('Polish phase coming soon. Redirecting to dashboard for now.')
    router.push('/dashboard')
  }

  const handleOpenPreview = () => {
    if (!visionPhase?.script) {
      toast.error('Screening Room requires Vision phase script data.')
      return
    }
    setIsPreviewOpen(true)
  }

  const handleClosePreview = () => setIsPreviewOpen(false)

  const handleSaveProject = async () => {
    if (!project) return
    try {
      const currentMetadata = project.metadata ?? {}
      const serializedScenes = sceneState.reduce<Record<string, Partial<CreationSceneData>>>((acc, scene) => {
        acc[scene.sceneId] = {
          assets: scene.assets,
          timeline: scene.timeline,
          durationSec: scene.durationSec,
        }
        return acc
      }, {})

      const nextCreationHub = {
        ...(currentMetadata.creationHub ?? {}),
        scenes: serializedScenes,
        metrics: {
          ...(currentMetadata.creationHub?.metrics ?? {}),
          ...metricsPayload,
        },
        lastUpdated: new Date().toISOString(),
      }

      const updatedMetadata = {
        ...currentMetadata,
        creationHub: nextCreationHub,
      }

      await fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metadata: updatedMetadata }),
      })

      setProject((prev) => (prev ? { ...prev, metadata: updatedMetadata } : prev))
      setCreationHub(nextCreationHub)
      toast.success('Project synced successfully.')
    } catch (err) {
      console.error('[CreationHub] Save failed', err)
      toast.error('Unable to sync project right now.')
    }
  }

  const handleShare = async () => {
    if (!project) return
    setIsSharing(true)
    try {
      const response = await fetch('/api/vision/create-share-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id }),
      })

      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create share link')
      }

      setShareUrl(data.shareUrl)
      await navigator.clipboard.writeText(data.shareUrl)
      setCopied(true)
      toast.success('Share link copied to clipboard!')
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('[CreationHub] Share failed', err)
      toast.error(err instanceof Error ? err.message : 'Unable to create share link')
    } finally {
      setIsSharing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-sf-background">
        <div className="text-center text-gray-600 dark:text-gray-300">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading Creation Hub…</p>
        </div>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-sf-background">
        <div className="text-center max-w-md">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Something went wrong</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">{error || 'Project data is unavailable right now.'}</p>
          <Button className="mt-6" onClick={() => router.push('/dashboard')}>
            Return to dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-sf-background">
      <ContextBar
        title="Creation Hub"
        titleVariant="page"
        emphasis
        meta={creationHub?.lastUpdated ? `Updated ${new Date(creationHub.lastUpdated).toLocaleString()}` : undefined}
        primaryActions={
          <Button className="bg-sf-primary text-white hover:bg-sf-accent flex items-center gap-2" onClick={handleContinueToPolish}>
            <span>Continue to Polish</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        }
        secondaryActions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handleSaveProject}>
              <Save className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleShare}
              disabled={isSharing}
              className={isSharing ? 'opacity-60 cursor-not-allowed' : ''}
            >
              <Share2 className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => toast.info('BYOK settings will open in a future update.')}
            >
              <Settings className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleOpenPreview}>
              <Play className="w-4 h-4" />
            </Button>
          </div>
        }
      />

      <div className="flex-1 overflow-hidden grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-0 xl:gap-6 px-0 xl:px-6 py-4">
        <div className="flex flex-col gap-6 overflow-y-auto px-6 xl:px-0">
          <ProductionOverview projectTitle={project.title} metrics={productionMetrics} />
          <SceneWorkspace
            scenes={sceneState}
            projectId={project.id}
            characters={characters}
            costConfig={costConfig}
            onTimelineChange={handleTimelineChange}
            onAddAssetToTimeline={handleAddAssetToTimeline}
            onUploadAsset={handleUploadAsset}
            onDeleteAsset={handleDeleteAsset}
            onGenerateVideo={handleGenerateVideo}
          />
        </div>
        <aside className="hidden xl:block overflow-y-auto pr-6">
          <CharacterLibrary
            characters={characters}
            onRegenerateCharacter={() => toast.info('Character regeneration is available in the Vision phase.')}
            onGenerateCharacter={() => toast.info('Character generation is available in the Vision phase.')}
            onUploadCharacter={() => toast.info('Upload reference updates are managed in the Vision phase.')}
            onApproveCharacter={() => toast.info('Character approvals remain unchanged.')}
            onUpdateCharacterAttributes={() => {}}
            onUpdateCharacterVoice={() => {}}
            onUpdateCharacterAppearance={() => {}}
            onUpdateCharacterName={() => {}}
            onUpdateCharacterRole={() => {}}
            ttsProvider={visionPhase?.narrationVoice?.provider === 'google' ? 'google' : 'elevenlabs'}
            compact
          />
          {shareUrl ? (
            <div className="mt-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Share Link</p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 break-all">{shareUrl}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 text-xs"
                onClick={async () => {
                  if (!shareUrl) return
                  await navigator.clipboard.writeText(shareUrl)
                  setCopied(true)
                  toast.success('Copied!')
                  setTimeout(() => setCopied(false), 2000)
                }}
              >
                {copied ? 'Copied' : 'Copy link'}
              </Button>
            </div>
          ) : null}
        </aside>
      </div>

      {isPreviewOpen ? (
        <CreationScreeningRoom scenes={sceneState} projectTitle={project?.title} onClose={handleClosePreview} />
      ) : null}
    </div>
  )
}
