/**
 * SceneGallery - Pre-Vis Studio: global batch tools and audio player.
 *
 * Per-scene storyboard frames are edited in ScriptPanel via SceneStoryboardFrameViewer.
 * This panel keeps Express All, Finalize All, publish/share, and AudioGalleryPlayer.
 */
'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { Loader, Printer, Clapperboard, Sparkles, X, Play, Pause, Zap, Tag } from 'lucide-react'
import { toast } from 'sonner'
import { AudioGalleryPlayer } from './AudioGalleryPlayer'
import { Button } from '@/components/ui/Button'
import { GroupedLanguageSelector } from '@/components/vision/GroupedLanguageSelector'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { ReportPreviewModal } from '@/components/reports/ReportPreviewModal'
import { ReportType, StoryboardData } from '@/lib/types/reports'
import { getStoryboardBeatProgress } from '@/lib/production/sceneProgress'
import {
  ExpressConfirmDialog,
  type ExpressConfirmOptions,
} from './ExpressConfirmDialog'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/Input'
import { useStore } from '@/store/useStore'
import {
  flattenSceneToStoryboardFrames,
  countStoryboardFramesNeedingGeneration,
  countPlayablePreVisScenes,
  sceneHasPlayablePreVisAudio,
} from '@/lib/storyboard/types'
import { countDraftStoryboardFrames } from '@/lib/storyboard/storyboardQuality'
import { ProductionReadyBanner } from './production/ProductionReadyBanner'
import type { ProductionReadyChecklist } from '@/lib/production/productionReadinessGate'

export type ExpressPhase = 'direction' | 'audio' | 'image'
export type ExpressPhaseStatus = 'pending' | 'running' | 'done' | 'error'

export interface ExpressSceneStatus {
  direction: ExpressPhaseStatus
  audio: ExpressPhaseStatus
  image: ExpressPhaseStatus
  /** Optional human-readable error from the most recent failed phase. */
  error?: string
}

export type ExpressSceneStatusMap = Record<number, ExpressSceneStatus>

interface SceneGalleryProps {
  scenes: any[]
  projectTitle?: string
  onClose?: () => void
  /** Callback to open Generate Audio dialog */
  onOpenGenerateAudio?: () => void
  /**
   * Run the Storyboard Express pipeline (Direction → Audio → Image per scene,
   * up to 3 scenes in parallel). The parent is responsible for kicking off the
   * SSE request and updating script state from incoming events.
   */
  onExpressGenerate?: (options: ExpressConfirmOptions) => Promise<void> | void
  /** Upgrade draft storyboard frames to final quality (all scenes or one scene). */
  onFinalizeStoryboard?: (sceneIndex?: number, language?: string) => Promise<void> | void
  productionReadyChecklist?: ProductionReadyChecklist
  /** Whether an Express run is currently in flight. */
  isExpressRunning?: boolean
  /** Per-scene phase progress map driven by SSE events. */
  expressStatus?: ExpressSceneStatusMap
  /** When true, Express is blocked until Pre-Vis ready (voices + references). */
  expressGateBlocked?: boolean
  expressGateReasons?: string[]
  /** Open Reference Library sidebar. */
  onOpenReferences?: () => void
  /** Art style locked from Blueprint — Express uses this instead of a picker. */
  lockedArtStyle?: string
  onGenVideo?: () => void | Promise<void>
  isGenVideoRunning?: boolean
  exportedAnimaticUrl?: string | null
}

export function SceneGallery({
  scenes,
  projectTitle,
  onClose,
  onOpenGenerateAudio,
  onExpressGenerate,
  onFinalizeStoryboard,
  productionReadyChecklist,
  isExpressRunning = false,
  expressStatus,
  expressGateBlocked = false,
  expressGateReasons = [],
  onOpenReferences,
  lockedArtStyle,
  onGenVideo,
  isGenVideoRunning = false,
  exportedAnimaticUrl,
}: SceneGalleryProps) {
  const preVisBannerRef = React.useRef<HTMLDivElement>(null)

  const scrollToPreVisBanner = useCallback(() => {
    preVisBannerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    preVisBannerRef.current?.classList.add('ring-2', 'ring-amber-400/60')
    window.setTimeout(() => {
      preVisBannerRef.current?.classList.remove('ring-2', 'ring-amber-400/60')
    }, 2000)
  }, [])

  const handleExpressGateBlocked = useCallback(() => {
    toast.error(expressGateReasons[0] || 'Complete the Pre-Vis ready checklist before Express.')
    scrollToPreVisBanner()
  }, [expressGateReasons, scrollToPreVisBanner])

  const [reportPreviewOpen, setReportPreviewOpen] = useState(false)
  const [showAudioPlayer, setShowAudioPlayer] = useState(false)
  const [selectedLanguage, setSelectedLanguage] = useState('en')

  const [expressDialogOpen, setExpressDialogOpen] = useState(false)
  const [expressStartedAt, setExpressStartedAt] = useState<number | null>(null)
  const [expressElapsedSec, setExpressElapsedSec] = useState(0)

  React.useEffect(() => {
    if (!isExpressRunning || !expressStartedAt) return
    const tick = () => setExpressElapsedSec(Math.floor((Date.now() - expressStartedAt) / 1000))
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [isExpressRunning, expressStartedAt])

  React.useEffect(() => {
    if (isExpressRunning) {
      setExpressStartedAt((prev) => prev ?? Date.now())
    } else {
      setExpressStartedAt(null)
      setExpressElapsedSec(0)
    }
  }, [isExpressRunning])

  const currentProject = useStore(s => s.currentProject)
  const setCurrentProject = useStore(s => s.setCurrentProject)
  const storyboardRevision = currentProject?.metadata?.storyboardRevision
  const storyboardVersion =
    typeof storyboardRevision?.version === 'number' && storyboardRevision.version >= 1
      ? storyboardRevision.version
      : 1

  const [publishDialogOpen, setPublishDialogOpen] = useState(false)
  const [publishLabel, setPublishLabel] = useState('')
  const [publishNotes, setPublishNotes] = useState('')
  const [publishLoading, setPublishLoading] = useState(false)

  const playableSceneCount = useMemo(
    () => countPlayablePreVisScenes(scenes, selectedLanguage),
    [scenes, selectedLanguage]
  )

  const scenesWithAudio = useMemo(
    () => scenes.filter((scene) => sceneHasPlayablePreVisAudio(scene, selectedLanguage)).length,
    [scenes, selectedLanguage]
  )

  const availableLanguages = useMemo(() => {
    const langs = new Set<string>()
    scenes.forEach(scene => {
      if (scene.narrationAudio) {
        Object.keys(scene.narrationAudio).forEach(lang => {
          if (scene.narrationAudio[lang]?.url) langs.add(lang)
        })
      }
      if (scene.dialogueAudio) {
        Object.keys(scene.dialogueAudio).forEach(lang => {
          if (Array.isArray(scene.dialogueAudio[lang]) && scene.dialogueAudio[lang].length > 0) langs.add(lang)
        })
      }
    })
    if (langs.size === 0) langs.add('en')
    return Array.from(langs).sort()
  }, [scenes])

  const scenesNeedingExpress = useMemo(() => {
    return scenes.filter((scene) => {
      const needsDirection =
        !scene?.sceneDirection ||
        !scene.sceneDirection.camera ||
        !scene.sceneDirection.scene
      const needsImage =
        !scene?.imageUrl || countStoryboardFramesNeedingGeneration(scene) > 0
      const dialogue = Array.isArray(scene?.dialogue) ? scene.dialogue : []
      const dialogueAudio = scene?.dialogueAudio?.[selectedLanguage]
      const dialogueOk =
        dialogue.length === 0 ||
        (Array.isArray(dialogueAudio) &&
          dialogueAudio.length >= dialogue.length &&
          dialogueAudio.every((d: any) => d && d.audioUrl))
      const narrationOk =
        !scene?.narration ||
        !!scene?.narrationAudio?.[selectedLanguage]?.url ||
        (selectedLanguage === 'en' && !!scene?.narrationAudioUrl)
      const needsAudio = !(narrationOk && dialogueOk)
      return needsDirection || needsImage || needsAudio
    }).length
  }, [scenes, selectedLanguage])

  const draftFrameCount = useMemo(
    () => scenes.reduce((sum, scene) => sum + countDraftStoryboardFrames(scene), 0),
    [scenes]
  )

  const storyboardBeatProgress = useMemo(() => {
    return scenes.reduce(
      (acc, scene) => {
        const { complete, total } = getStoryboardBeatProgress(scene)
        return { complete: acc.complete + complete, total: acc.total + total }
      },
      { complete: 0, total: 0 }
    )
  }, [scenes])

  const handleExpressConfirm = useCallback(
    async (options: ExpressConfirmOptions) => {
      if (!onExpressGenerate) return
      if (expressGateBlocked) {
        handleExpressGateBlocked()
        return
      }
      setExpressDialogOpen(false)
      try {
        await onExpressGenerate({ ...options, language: selectedLanguage })
      } catch (err) {
        console.error('[SceneGallery] Express generate failed:', err)
      }
    },
    [onExpressGenerate, selectedLanguage, expressGateBlocked, handleExpressGateBlocked]
  )

  const expressProgress = useMemo(() => {
    if (!isExpressRunning || !expressStatus) return null
    const sceneEntries = Object.values(expressStatus)
    const sceneCount = sceneEntries.length
    if (sceneCount === 0) return null
    const totalPhases = sceneCount * 3
    let completedPhases = 0
    let runningPhases = 0
    let scenesComplete = 0
    for (const s of sceneEntries) {
      const phases = [s.direction, s.audio, s.image]
      let sceneDone = 0
      for (const p of phases) {
        if (p === 'done' || p === 'error') {
          completedPhases += 1
          sceneDone += 1
        } else if (p === 'running') {
          runningPhases += 1
        }
      }
      if (sceneDone === 3) scenesComplete += 1
    }
    const pct = totalPhases === 0 ? 0 : Math.round((completedPhases / totalPhases) * 100)
    return {
      completedPhases,
      totalPhases,
      runningPhases,
      scenesComplete,
      sceneCount,
      pct,
    }
  }, [isExpressRunning, expressStatus])

  const handleShareStoryboard = async () => {
    try {
      const projectId = scenes[0]?.projectId || window.location.pathname.split('/').pop()

      const response = await fetch('/api/vision/create-share-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, linkType: 'storyboard' })
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to create share link')

      if (data.storyboardRevision && projectId && currentProject?.id === projectId) {
        setCurrentProject({
          ...currentProject,
          metadata: { ...currentProject.metadata, storyboardRevision: data.storyboardRevision },
        })
      }

      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(data.shareUrl)
        toast.success('Pre-vis link copied to clipboard!')
      } else {
        toast.success('Share link created!', {
          description: data.shareUrl,
          duration: 10000,
          action: {
            label: 'Open',
            onClick: () => window.open(data.shareUrl, '_blank')
          }
        })
      }
    } catch (err: any) {
      console.error('[Share Storyboard]', err)
      toast.error(err.message || 'Failed to create share link')
    }
  }

  const handlePublishStoryboardRevision = async () => {
    const projectId = scenes[0]?.projectId || window.location.pathname.split('/').pop()
    if (!projectId || !currentProject?.id || currentProject.id !== projectId) {
      toast.error('Project not loaded — refresh the page and try again.')
      return
    }
    setPublishLoading(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/storyboard-revision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: publishLabel || undefined, notes: publishNotes || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to publish revision')
      setCurrentProject({
        ...currentProject,
        metadata: { ...currentProject.metadata, storyboardRevision: data.storyboardRevision },
      })
      setPublishDialogOpen(false)
      setPublishLabel('')
      setPublishNotes('')
      toast.success(`Storyboard v${data.storyboardRevision?.version ?? ''} published`, {
        description: 'Share link unchanged. New feedback after reviewers reload will use this version.',
      })
    } catch (e: any) {
      toast.error(e.message || 'Failed to publish revision')
    } finally {
      setPublishLoading(false)
    }
  }

  return (
    <TooltipProvider>
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex flex-wrap items-center justify-between gap-y-2 mb-6">
        <div className="flex items-center gap-2">
          <Clapperboard className="w-5 h-5 text-sf-primary" />
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 leading-6 my-0">Pre-Vis Studio</h3>
          <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
            {scenes.length} {scenes.length === 1 ? 'scene' : 'scenes'}
          </span>
          {playableSceneCount > 0 && (
            <span className="text-xs text-emerald-500 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 rounded flex items-center gap-1">
              <Play className="w-3 h-3" />
              {playableSceneCount}/{scenes.length} ready
              {scenesWithAudio > 0 && (
                <span className="text-emerald-600/80 dark:text-emerald-300/80">
                  · {scenesWithAudio} audio
                </span>
              )}
            </span>
          )}
          <span
            className="text-[10px] font-semibold text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded px-1.5 py-0.5"
            title="Screening feedback is stamped with this version when reviewers submit."
          >
            v{storyboardVersion}
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setPublishDialogOpen(true)}
              >
                <Tag className="w-3.5 h-3.5 mr-1" />
                Publish revision
              </Button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              Bump the storyboard version after meaningful changes. The public link stays the same; feedback
              records which version the reviewer had loaded.
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          {onExpressGenerate && scenes.length > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (expressGateBlocked) {
                      handleExpressGateBlocked()
                      return
                    }
                    if (scenesNeedingExpress === 0) {
                      toast.info('All scenes complete — open Express and enable Regenerate to redo.')
                      setExpressDialogOpen(true)
                      return
                    }
                    setExpressDialogOpen(true)
                  }}
                  disabled={isExpressRunning}
                  className="relative flex items-center gap-2 overflow-hidden bg-gradient-to-r from-indigo-500/15 to-purple-500/15 border-indigo-500/40 hover:border-indigo-500/60 hover:from-indigo-500/25 hover:to-purple-500/25"
                >
                  {isExpressRunning ? (
                    <Loader className="w-4 h-4 animate-spin text-indigo-300" />
                  ) : (
                    <Zap className="w-4 h-4 text-indigo-300" />
                  )}
                  <span>
                    {isExpressRunning
                      ? expressProgress
                        ? `Express ${expressProgress.pct}%`
                        : 'Express running…'
                      : `Express All Scenes (${scenesNeedingExpress})`}
                  </span>
                  {isExpressRunning && expressProgress && (
                    <span
                      aria-hidden
                      className="absolute bottom-0 left-0 h-0.5 bg-indigo-400 transition-all duration-300 ease-out"
                      style={{ width: `${expressProgress.pct}%` }}
                    />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                {expressGateBlocked ? (
                  <ul className="text-xs space-y-1 list-disc pl-4">
                    {expressGateReasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                ) : isExpressRunning && expressProgress ? (
                  `Direction → Audio → Storyboard • ${storyboardBeatProgress.complete}/${storyboardBeatProgress.total} beats • ${expressElapsedSec}s elapsed`
                ) : scenesNeedingExpress === 0 ? (
                  'All scenes complete — open Express and enable Regenerate to redo'
                ) : (
                  'Express All Scenes: Direction → Audio → storyboard frames for every scene (~3–10 min, varies by beat count)'
                )}
              </TooltipContent>
            </Tooltip>
          )}
          {onFinalizeStoryboard && draftFrameCount > 0 && !isExpressRunning && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void onFinalizeStoryboard(undefined, selectedLanguage)}
                  className="flex items-center gap-2 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10"
                >
                  <Sparkles className="w-4 h-4" />
                  Finalize frames ({draftFrameCount})
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                Upgrade draft storyboard frames to Final quality for animatic preview and video
                generation.
              </TooltipContent>
            </Tooltip>
          )}
          {isExpressRunning && expressProgress && (
            <div className="flex items-center gap-1.5 rounded-md border border-indigo-500/40 bg-indigo-500/10 px-2 py-1 text-[11px] text-indigo-200">
              <span className="font-semibold">
                Beats {storyboardBeatProgress.complete}/{storyboardBeatProgress.total}
              </span>
              <span className="text-indigo-300/70">·</span>
              <span>{expressElapsedSec}s</span>
              <span className="text-indigo-300/70">·</span>
              <span>
                Scene {expressProgress.scenesComplete}/{expressProgress.sceneCount}
              </span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <GroupedLanguageSelector
                    value={selectedLanguage}
                    onValueChange={setSelectedLanguage}
                    size="xs"
                    intent="generate"
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {availableLanguages.includes(selectedLanguage)
                  ? `Switch storyboard playback language`
                  : `No audio in this language yet — run Express to generate`}
              </TooltipContent>
            </Tooltip>
            {!availableLanguages.includes(selectedLanguage) && (
              <span className="text-[10px] uppercase tracking-wider text-amber-300 bg-amber-900/30 border border-amber-700/40 px-1.5 py-0.5 rounded">
                Missing
              </span>
            )}
          </div>
          {playableSceneCount > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={showAudioPlayer ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowAudioPlayer(!showAudioPlayer)}
                  className={showAudioPlayer
                    ? "flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                    : "flex items-center gap-2"
                  }
                >
                  {showAudioPlayer ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  <span>Player</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {showAudioPlayer
                  ? 'Hide player'
                  : 'Preview available scenes — images and/or audio'}
              </TooltipContent>
            </Tooltip>
          )}
          {scenes.length > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setReportPreviewOpen(true)}
                  className="flex items-center justify-center"
                >
                  <Printer className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Print Storyboard</TooltipContent>
            </Tooltip>
          )}
          {onClose && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onClose}
                  className="p-2 rounded text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Close Pre-Vis Studio</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      {productionReadyChecklist && (
        <div ref={preVisBannerRef} className="mb-4 rounded-lg transition-shadow">
          <ProductionReadyBanner
            id="previs-ready-banner"
            checklist={productionReadyChecklist}
            onOpenReferences={onOpenReferences}
            onOpenGenerateAudio={onOpenGenerateAudio}
          />
        </div>
      )}

      {scenes.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-6">
          No scenes yet. Add scenes in the script workflow, then run Express to generate direction, audio, and storyboard frames.
        </p>
      )}

      {showAudioPlayer && playableSceneCount > 0 && (
        <div className="mb-2">
          <AudioGalleryPlayer
            scenes={scenes}
            selectedLanguage={selectedLanguage}
            onLanguageChange={setSelectedLanguage}
            availableLanguages={availableLanguages}
            onClose={() => setShowAudioPlayer(false)}
            onShare={handleShareStoryboard}
            onGenVideo={onGenVideo}
            isGenVideoRunning={isGenVideoRunning}
            exportedAnimaticUrl={exportedAnimaticUrl}
          />
        </div>
      )}

      {scenes.length > 0 && (
        <ReportPreviewModal
          type={ReportType.STORYBOARD}
          data={{
            title: projectTitle || 'Untitled Project',
            frames: scenes.flatMap((scene, idx) =>
              flattenSceneToStoryboardFrames(scene, idx + 1).map((f) => ({
                sceneNumber: f.sceneNumber,
                frameType: f.frameType,
                dialogueIndex: f.dialogueIndex,
                imageUrl: f.imageUrl,
                visualDescription: f.visualDescription,
                shotType: f.shotType,
                cameraAngle: f.cameraAngle,
                lighting: f.lighting,
                duration: f.duration,
                character: f.character,
                line: f.line,
              }))
            ),
          } as StoryboardData}
          projectName={projectTitle || 'Untitled Project'}
          open={reportPreviewOpen}
          onOpenChange={setReportPreviewOpen}
        />
      )}

      {onExpressGenerate && (
        <ExpressConfirmDialog
          open={expressDialogOpen}
          onOpenChange={setExpressDialogOpen}
          scenes={scenes}
          isRunning={isExpressRunning}
          language={selectedLanguage}
          lockedArtStyle={lockedArtStyle}
          onConfirm={handleExpressConfirm}
        />
      )}

      <Dialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Publish storyboard revision</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Increments the version (e.g. v{storyboardVersion} → v{storyboardVersion + 1}). Your share link does not
            change. Reviewers who refresh will see the new current version; their next submissions are stamped
            accordingly.
          </p>
          <div className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <label htmlFor="sb-rev-label" className="text-xs font-medium text-gray-700 dark:text-gray-300">
                Label (optional)
              </label>
              <Input
                id="sb-rev-label"
                value={publishLabel}
                onChange={e => setPublishLabel(e.target.value)}
                placeholder="e.g. Client notes round 2"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="sb-rev-notes" className="text-xs font-medium text-gray-700 dark:text-gray-300">
                Change notes (optional)
              </label>
              <textarea
                id="sb-rev-notes"
                value={publishNotes}
                onChange={e => setPublishNotes(e.target.value)}
                placeholder="What changed since the last version?"
                className="w-full min-h-[72px] rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setPublishDialogOpen(false)} disabled={publishLoading}>
              Cancel
            </Button>
            <Button type="button" onClick={handlePublishStoryboardRevision} disabled={publishLoading}>
              {publishLoading ? <Loader className="w-4 h-4 animate-spin" /> : `Publish v${storyboardVersion + 1}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </TooltipProvider>
  )
}
