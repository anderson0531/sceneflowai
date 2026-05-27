'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { 
  ArrowLeft,
  ArrowRight,
  Save, 
  Loader2,
  Film,
  AlertCircle,
  PanelRightOpen,
  PanelRightClose,
  X,
} from 'lucide-react'

import { useStore } from '@/store/useStore'
import { Button } from '@/components/ui/Button'
import { ProductionSectionHeader } from '@/components/vision/scene-production/ProductionSectionHeader'
import { FinalCutTimeline } from '@/components/final-cut/FinalCutTimeline'
import { FinalCutMediaBrowser } from '@/components/final-cut/FinalCutMediaBrowser'
import {
  FinalCutNextStepBanner,
  FinalCutReadinessStrip,
} from '@/components/final-cut/FinalCutNextStepBanner'
import { FinalCutOnboarding } from '@/components/final-cut/FinalCutOnboarding'
import { getSceneProductionStateFromMetadata } from '@/lib/final-cut/projectProductionState'
import { getAvailableLanguagesForFormat } from '@/lib/final-cut/resolveSegmentMedia'
import { buildFinalCutClips } from '@/lib/final-cut/useFinalCutClips'
import {
  calculateFinalCutProgress,
  formatFinalCutDuration,
  scrollToAssemblySceneRow,
} from '@/lib/final-cut/finalCutProgress'
import { readFinalCutSelection, useFinalCutSelection } from '@/hooks/final-cut/useFinalCutSelection'
import { useFinalCutEvents, useFinalCutGuideStatus } from '@/hooks/final-cut/useFinalCutEvents'
import { cn } from '@/lib/utils'
import type { FinalCutAssemblyPresetId, FinalCutSelection } from '@/lib/types/finalCut'

const LS_SECTION_STREAMS = 'finalCut.section.streams'
const LS_SECTION_MIXER = 'finalCut.section.mixer'
const LS_MOBILE_PANE = 'finalCut.section.mobilePane'

function buildDemoSelection(): FinalCutSelection {
  return { format: 'full-video', language: 'en', presetId: 'all-video', perSceneOverrides: {} }
}

export default function FinalCutPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentProject = useStore((s) => s.currentProject)
  const setCurrentProject = useStore((s) => s.setCurrentProject)
  const updateProject = useStore((s) => s.updateProject)
  
  const isDemo = searchParams.get('demo') === 'true'
  const searchProjectIdRaw = searchParams.get('projectId')
  const searchProjectId =
    searchProjectIdRaw && searchProjectIdRaw.trim() !== '' ? searchProjectIdRaw.trim() : undefined

  const projectId =
    searchProjectId || currentProject?.id || (isDemo ? 'demo-project' : undefined)

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const sceneState = useMemo(
    () => getSceneProductionStateFromMetadata(currentProject?.metadata),
    [currentProject?.metadata]
  )
  const {
    selection,
    setSelection,
    handleApplyPreset,
    handleChangeSceneOverride,
    normalizeLanguage,
  } = useFinalCutSelection(sceneState)
  const [streamsExpanded, setStreamsExpanded] = useState(true)
  const [mixerExpanded, setMixerExpanded] = useState(true)
  const [mobilePane, setMobilePane] = useState<'library' | 'edit'>('edit')
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    try {
      const s = localStorage.getItem(LS_SECTION_STREAMS)
      if (s !== null) setStreamsExpanded(s === 'true')
      const m = localStorage.getItem(LS_SECTION_MIXER)
      if (m !== null) setMixerExpanded(m === 'true')
      const pane = localStorage.getItem(LS_MOBILE_PANE)
      if (pane === 'library' || pane === 'edit') setMobilePane(pane)
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(LS_SECTION_STREAMS, String(streamsExpanded))
      localStorage.setItem(LS_SECTION_MIXER, String(mixerExpanded))
      localStorage.setItem(LS_MOBILE_PANE, mobilePane)
    } catch {
      /* ignore */
    }
  }, [streamsExpanded, mixerExpanded, mobilePane])

  const productionVisionHref = projectId
    ? `/dashboard/workflow/vision/${projectId}${isDemo ? '?demo=true' : ''}`
    : undefined
  
  // Initial load: fetch project into store if necessary, then derive selection.
  useEffect(() => {
    if (isDemo) {
      setSelection(buildDemoSelection())
      setIsLoading(false)
      return
    }

    const targetId = searchProjectId || useStore.getState().currentProject?.id
    if (!targetId) {
      setIsLoading(false)
      router.replace('/dashboard')
      return
    }

    let cancelled = false

    ;(async () => {
      let project = useStore.getState().currentProject
      if (project?.id !== targetId) {
        setIsLoading(true)
        try {
          const res = await fetch(`/api/projects/${targetId}`, { cache: 'no-store' })
          if (!res.ok) {
            const detail = await res.text().catch(() => res.statusText)
            throw new Error(detail || `HTTP ${res.status}`)
          }
          const data = await res.json()
          project = data.project ?? data
          if (cancelled) return
          setCurrentProject(project)
        } catch (err) {
          if (!cancelled) {
            console.error('[FinalCut] Failed to load project:', err)
            toast.error('Could not open Final Cut. Return to Production and try again.')
            router.replace('/dashboard')
            setIsLoading(false)
          }
          return
        }
      }

      if (cancelled || !project) return

      try {
        const initial = normalizeLanguage(readFinalCutSelection(project.metadata))
        setSelection(initial)
      } catch (error) {
        console.error('[FinalCut] Failed to compute selection:', error)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [isDemo, searchProjectId, router, setCurrentProject, normalizeLanguage, setSelection])

  // Resolve clip list for the active selection.
  const clips = useMemo(
    () => buildFinalCutClips({ project: currentProject ?? null, selection }),
    [currentProject, selection]
  )

  const totalDuration = useMemo(
    () => clips.reduce((max, c) => Math.max(max, c.endTime), 0),
    [clips]
  )

  const availableLanguages = useMemo(() => {
    const langs = getAvailableLanguagesForFormat(sceneState, selection.format)
    const fromClips = clips.flatMap((c) => c.availableLanguages ?? [])
    return Array.from(new Set([...langs, ...fromClips, selection.language])).sort()
  }, [sceneState, selection.format, selection.language, clips])

  const lastRenderUrl =
    (currentProject?.metadata as { exportedVideoUrl?: string } | undefined)?.exportedVideoUrl ?? null

  const finalCutProgress = useMemo(
    () =>
      calculateFinalCutProgress({
        clips,
        selection,
        hasExportedVideo: !!lastRenderUrl,
        totalDurationSec: totalDuration,
      }),
    [clips, selection, lastRenderUrl, totalDuration]
  )

  useFinalCutGuideStatus(finalCutProgress)

  const premiereHref = `/dashboard/workflow/premiere?projectId=${projectId}${isDemo ? '&demo=true' : ''}`

  const openPremiere = useCallback(() => {
    router.push(premiereHref)
  }, [router, premiereHref])

  const openAssembly = useCallback(() => {
    setStreamsExpanded(true)
    setMobilePane('library')
  }, [])

  const openProduction = useCallback(() => {
    if (productionVisionHref) router.push(productionVisionHref)
  }, [router, productionVisionHref])

  const triggerRender = useCallback(() => {
    setStreamsExpanded(true)
    setMobilePane('library')
    window.setTimeout(() => {
      const btn = document.querySelector<HTMLButtonElement>('[data-final-cut-render]')
      btn?.click()
    }, 150)
  }, [])

  const focusScene = useCallback((sceneId: string) => {
    setStreamsExpanded(true)
    setMobilePane('library')
    scrollToAssemblySceneRow(sceneId)
  }, [])

  useFinalCutEvents(
    useMemo(
      () => ({
        openAssembly,
        openProduction,
        renderFinalCut: triggerRender,
        openPremiere,
        focusScene,
      }),
      [openAssembly, openProduction, triggerRender, openPremiere, focusScene]
    )
  )

  const handleApplyPresetWrapped = useCallback(
    (presetId: FinalCutAssemblyPresetId) => {
      const sceneIds = clips.map((c) => c.sceneId)
      handleApplyPreset(presetId, currentProject?.metadata, sceneIds)
    },
    [clips, currentProject?.metadata, handleApplyPreset]
  )

  const handleFocusAssembly = useCallback((sceneId: string) => {
    setStreamsExpanded(true)
    setMobilePane('library')
    scrollToAssemblySceneRow(sceneId)
  }, [])

  const handleNextStep = useCallback(() => {
    const event = finalCutProgress.nextStepEvent
    if (event) window.dispatchEvent(new CustomEvent(event))
  }, [finalCutProgress.nextStepEvent])

  const streamLabel =
    finalCutProgress.isMixedFormat
      ? 'Mixed assembly'
      : `${selection.format === 'animatic' ? 'Animatic' : 'Video'} · ${selection.language.toUpperCase()}`
  
  const handleSave = useCallback(async () => {
    if (!currentProject) return
    setIsSaving(true)
    try {
      const nextMetadata = {
        ...(currentProject.metadata as Record<string, unknown>),
        finalCut: selection,
      } as unknown
      await updateProject(currentProject.id, { ...currentProject, metadata: nextMetadata as never })
      toast.success('Final Cut selection saved')
    } catch (error) {
      console.error('[FinalCut] Save failed:', error)
      toast.error('Failed to save Final Cut selection')
    } finally {
      setIsSaving(false)
    }
  }, [currentProject, selection, updateProject])

  const handleRendered = useCallback(
    async (url: string) => {
      if (!currentProject) return
      const nextMetadata = {
        ...(currentProject.metadata as Record<string, unknown>),
        exportedVideoUrl: url,
      } as unknown
      await updateProject(currentProject.id, { ...currentProject, metadata: nextMetadata as never })
      toast.success('Master export saved', {
        description: 'Continue to Premiere for screenings and share.',
        action: {
          label: 'Open Premiere',
          onClick: () => router.push(premiereHref),
        },
      })
    },
    [currentProject, updateProject, router, premiereHref]
  )

  const finalCutScreenings = useMemo(() => {
    if (!projectId) return []
    const items: Array<{
      id: string
      title: string
      streamId?: string
      videoUrl?: string
      createdAt: string
      status: 'draft' | 'active' | 'completed' | 'expired'
      viewerCount: number
      averageCompletion: number
    }> = []

    const exported = (
      (currentProject?.metadata as { exportedVideoUrl?: string } | undefined)?.exportedVideoUrl || ''
    ).trim()
    if (exported) {
      items.push({
        id: `project-export-${projectId}`,
        title: 'Latest project export',
        videoUrl: exported,
        createdAt: new Date().toISOString(),
        status: 'draft',
        viewerCount: 0,
        averageCompletion: 0,
      })
    }
    return items
  }, [projectId, currentProject?.metadata])
  
  if (isLoading) {
    return (
      <div className="relative isolate min-h-screen flex items-center justify-center overflow-hidden bg-zinc-950">
        <div
          className="pointer-events-none absolute inset-0 opacity-80"
          aria-hidden
          style={{
            backgroundImage:
              'radial-gradient(ellipse 100% 80% at 50% -20%, rgba(139, 92, 246, 0.2), transparent 50%)',
          }}
        />
        <div className="text-center text-zinc-100 relative">
          <Loader2 className="w-8 h-8 animate-spin text-violet-400 mx-auto mb-4" />
          <p className="text-zinc-400 text-sm font-medium">Loading Final Cut…</p>
        </div>
      </div>
    )
  }
  
  if (!currentProject && !isDemo) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
        <div className="text-center text-zinc-100 max-w-sm">
          <AlertCircle className="w-12 h-12 text-amber-400/90 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">No project selected</h2>
          <p className="text-zinc-500 mb-4 text-sm">Choose a project from the dashboard.</p>
          <Link href="/dashboard">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const filenameLabel = currentProject?.title || projectId || 'final-cut'
  
  return (
    <div className="relative isolate min-h-screen flex flex-col overflow-hidden bg-zinc-950 text-zinc-100">
      {/* Ambient studio backdrop */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-zinc-950" aria-hidden />
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-90"
        aria-hidden
        style={{
          backgroundImage: `
            radial-gradient(ellipse 120% 80% at 15% -10%, rgba(139, 92, 246, 0.22), transparent 52%),
            radial-gradient(ellipse 90% 70% at 92% 8%, rgba(217, 70, 239, 0.12), transparent 48%),
            radial-gradient(ellipse 80% 50% at 50% 100%, rgba(59, 130, 246, 0.08), transparent 55%)
          `,
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.35] [background-size:24px_24px] [background-image:linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)]"
        aria-hidden
      />

      <FinalCutOnboarding />

      {isDemo && (
        <div className="bg-amber-500/15 border-b border-amber-500/25 px-4 py-2.5">
          <div className="flex items-center justify-center gap-2 text-amber-200/95 text-sm">
            <Film className="w-4 h-4 shrink-0" />
            <span className="font-medium">Demo mode</span>
            <span className="text-amber-200/60 hidden sm:inline">
              Read-only sample · nothing is saved
            </span>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-40 flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-white/[0.08] bg-zinc-950/80 backdrop-blur-xl supports-[backdrop-filter]:bg-zinc-950/65 shadow-[0_1px_0_0_rgba(255,255,255,0.04)]">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <Link href={isDemo ? '/dashboard' : `/dashboard/workflow/vision/${projectId}`}>
            <Button
              variant="ghost"
              size="sm"
              className="text-zinc-400 hover:text-white hover:bg-zinc-800/80 -ml-1"
            >
              <ArrowLeft className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">{isDemo ? 'Exit demo' : 'Back to Production'}</span>
            </Button>
          </Link>

          <div className="h-8 w-px bg-zinc-800 hidden sm:block" />

          <div className="flex items-center gap-2">
            <Film className="w-4 h-4 text-violet-400" />
            <span className="text-sm font-medium text-white">Final Cut</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStreamsExpanded(prev => !prev)}
            className={cn(
              "text-zinc-400 hover:text-white hover:bg-zinc-800/80 mr-1",
              streamsExpanded && "bg-violet-600/20 text-violet-300 border-violet-500/30"
            )}
            title={streamsExpanded ? "Hide Production Streams" : "Show Production Streams"}
          >
            <Film className="w-4 h-4" />
            <span className="hidden sm:inline ml-2">{streamsExpanded ? 'Hide Streams' : 'Show Streams'}</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsFullscreen(prev => !prev)}
            className={cn(
              "text-zinc-400 hover:text-white hover:bg-zinc-800/80",
              isFullscreen && "bg-violet-600/20 text-violet-300 border-violet-500/30"
            )}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Viewer"}
          >
            {isFullscreen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
            <span className="hidden sm:inline ml-2">{isFullscreen ? 'Exit Theater' : 'Theater'}</span>
          </Button>

          {!isDemo && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
                className="text-zinc-400 hover:text-white hover:bg-zinc-800/80"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 sm:mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 sm:mr-2" />
                )}
              <span className="hidden sm:inline">Save selection</span>
              </Button>
          )}

          <Link href={premiereHref}>
            <Button
              size="sm"
              variant="outline"
              className="border-zinc-600 bg-zinc-900/50 text-zinc-100 hover:bg-zinc-800 hover:border-zinc-500"
            >
              <span className="hidden sm:inline">Premiere</span>
              <span className="sm:hidden">Next</span>
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </header>
      
      <main className="relative flex-1 min-h-0 flex flex-col gap-3 sm:gap-4 px-4 sm:px-5 py-4 overflow-hidden border-t border-white/[0.06]">
        <div className="shrink-0 relative overflow-hidden rounded-2xl border border-white/[0.1] bg-gradient-to-br from-violet-950/50 via-zinc-950/70 to-fuchsia-950/25 px-5 py-4 sm:px-7 sm:py-5 shadow-[0_0_0_1px_rgba(139,92,246,0.12),0_24px_80px_-32px_rgba(139,92,246,0.35)] backdrop-blur-md">
          <div
            className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-fuchsia-500/20 blur-3xl motion-reduce:opacity-40"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -left-10 bottom-0 h-40 w-40 rounded-full bg-violet-500/15 blur-3xl motion-reduce:opacity-40"
            aria-hidden
          />
          <div className="relative flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-violet-300/90">
                Final Cut
              </p>
              <h2 className="mt-1 text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight text-white [text-shadow:0_2px_28px_rgba(139,92,246,0.35)]">
                {isDemo ? 'Demo project' : currentProject?.title ?? 'Project'}
              </h2>
              <p className="mt-1.5 text-sm text-zinc-400 max-w-xl leading-relaxed">
                Pick which Production stream each scene contributes, preview the full program in script order, and export one master MP4 for Premiere.
              </p>
            </div>
            <div className="flex flex-col items-start sm:items-end gap-2 shrink-0">
              <FinalCutReadinessStrip
                progress={finalCutProgress}
                totalDurationSec={totalDuration}
                formatDuration={formatFinalCutDuration}
              />
              <p className="text-xs text-zinc-500 tabular-nums truncate max-w-[220px] sm:max-w-xs text-right">
                {streamLabel}
              </p>
            </div>
          </div>
          <FinalCutNextStepBanner
            progress={finalCutProgress}
            onAction={handleNextStep}
            className="relative mt-4"
          />
        </div>

        <div
          className="flex lg:hidden shrink-0 rounded-xl border border-white/[0.1] bg-zinc-950/50 backdrop-blur-md p-1 gap-1 shadow-lg shadow-black/20"
          role="tablist"
          aria-label="Final Cut layout"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mobilePane === 'library'}
            onClick={() => setMobilePane('library')}
            className={cn(
              'flex-1 rounded-md py-2 text-xs font-medium transition-colors',
              mobilePane === 'library'
                ? 'bg-violet-600 text-white shadow-md shadow-violet-950/40'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80'
            )}
          >
            Streams
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mobilePane === 'edit'}
            onClick={() => setMobilePane('edit')}
            className={cn(
              'flex-1 rounded-md py-2 text-xs font-medium transition-colors',
              mobilePane === 'edit'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80'
            )}
          >
            Preview
          </button>
        </div>

        <div className={cn(
          "flex-1 min-h-0 grid gap-3 sm:gap-4 min-h-[min(55vh,480px)] transition-all duration-500 ease-in-out",
          streamsExpanded && !isFullscreen 
            ? "grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(300px,380px)]" 
            : "grid-cols-1"
        )}>
          <section
            className={cn(
              'min-h-0 flex flex-col overflow-hidden min-h-[min(50vh,440px)]',
              mobilePane === 'library' && 'hidden lg:flex'
            )}
          >
            <div className="flex flex-col flex-1 min-h-0 rounded-2xl border border-violet-500/25 bg-zinc-950/55 backdrop-blur-xl overflow-hidden shadow-[0_0_0_1px_rgba(139,92,246,0.12),0_28px_100px_-36px_rgba(139,92,246,0.35),inset_0_1px_0_0_rgba(255,255,255,0.06)]">
              <ProductionSectionHeader
                icon={Film}
                title="Final Cut Viewer"
                titleClassName="font-semibold tracking-tight"
                badge={clips.length || undefined}
                rightAction={
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setStreamsExpanded(prev => !prev)}
                      className={cn(
                        "h-7 text-zinc-400 hover:text-white hover:bg-zinc-800/80 mr-1",
                        streamsExpanded && "bg-violet-600/20 text-violet-300 border-violet-500/30"
                      )}
                      title={streamsExpanded ? "Hide Production Streams" : "Show Production Streams"}
                    >
                      <Film className="w-4 h-4" />
                      <span className="hidden sm:inline ml-1.5">{streamsExpanded ? 'Hide Streams' : 'Show Streams'}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsFullscreen(prev => !prev)}
                      className={cn(
                        "h-7 text-zinc-400 hover:text-white hover:bg-zinc-800/80",
                        isFullscreen && "text-violet-300 bg-violet-600/20"
                      )}
                      title={isFullscreen ? "Exit Theater Mode" : "Theater Mode"}
                    >
                      {isFullscreen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
                      <span className="hidden sm:inline ml-1.5">{isFullscreen ? 'Exit Theater' : 'Theater'}</span>
                    </Button>
                  </div>
                }
                collapsible={false}
                expanded={true}
                className="bg-zinc-950/80 border-b border-violet-500/20 shrink-0"
              />
              <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                  <FinalCutTimeline
                    clips={clips}
                    totalDuration={totalDuration}
                    projectId={projectId}
                    streamLabel={streamLabel}
                    isProcessing={isSaving}
                    productionVisionHref={productionVisionHref}
                    lastRenderUrl={lastRenderUrl}
                    filenameLabel={filenameLabel}
                    onRendered={handleRendered}
                    disabled={isDemo}
                    onFocusAssembly={handleFocusAssembly}
                    hideMixerSectionHeader
                    isFullscreen={isFullscreen}
                    onToggleFullscreen={() => setIsFullscreen(f => !f)}
                  />
                </div>
            </div>
          </section>

          <section
            className={cn(
              'min-h-0 flex flex-col overflow-hidden transition-all duration-500 ease-in-out',
              mobilePane === 'edit' && 'hidden lg:flex',
              !streamsExpanded && 'lg:hidden',
              !streamsExpanded && !isFullscreen && 'hidden', // completely hide if closed and not fullscreen
              isFullscreen && streamsExpanded && 'fixed top-[15vh] right-6 w-96 h-[70vh] z-50 shadow-2xl'
            )}
          >
            <div className={cn("flex flex-col flex-1 min-h-0 rounded-2xl border border-white/[0.08] bg-zinc-950/50 backdrop-blur-xl overflow-hidden shadow-xl shadow-black/30 ring-1 ring-white/[0.04]", isFullscreen && "bg-zinc-950/90")}>
              <ProductionSectionHeader
                icon={Film}
                title="Production streams"
                titleClassName="font-semibold tracking-tight"
                badge={clips.length || undefined}
                rightAction={
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setStreamsExpanded(false)}
                    className="h-7 w-7 text-zinc-400 hover:text-white hover:bg-zinc-800/80"
                    title="Hide Panel"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                }
                collapsible={false}
                expanded={true}
                className="bg-zinc-950/70 border-b border-white/[0.06] shrink-0"
              />
              <FinalCutMediaBrowser
                  className="flex-1 min-h-0 rounded-none border-0 shadow-none bg-zinc-950/30"
                  streamsPanelProps={{
                    selection,
                    clips,
                    availableLanguages,
                    onApplyPreset: handleApplyPresetWrapped,
                    onChangeSceneOverride: handleChangeSceneOverride,
                    disabled: isDemo || isSaving || (!isDemo && !currentProject),
                    productionHref: productionVisionHref,
                    projectId,
                    isMixedFormat: finalCutProgress.isMixedFormat,
                  }}
                  renderButtonProps={{
                    projectId,
                    filenameLabel,
                    onRendered: handleRendered,
                    lastRenderUrl,
                    onOpenPremiere: openPremiere,
                  }}
                  projectId={projectId}
                  projectName={isDemo ? 'Demo project' : currentProject?.title}
                  finalCutScreenings={finalCutScreenings}
                  screeningCredits={100}
                  onCreateScreening={() => {
                    router.push(premiereHref)
                  }}
                  onUploadExternal={async () => {
                    router.push(premiereHref)
                    return premiereHref
                  }}
                />
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
