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
} from 'lucide-react'

import { useStore } from '@/store/useStore'
import { Button } from '@/components/ui/Button'
import { ProductionSectionHeader } from '@/components/vision/scene-production/ProductionSectionHeader'
import { FinalCutTimeline } from '@/components/final-cut/FinalCutTimeline'
import { FinalCutMediaBrowser } from '@/components/final-cut/FinalCutMediaBrowser'
import { getSceneProductionStateFromMetadata } from '@/lib/final-cut/projectProductionState'
import { getAvailableLanguagesForFormat } from '@/lib/final-cut/resolveSegmentMedia'
import { buildFinalCutClips } from '@/lib/final-cut/useFinalCutClips'
import { getLanguageName } from '@/constants/languages'
import { cn } from '@/lib/utils'
import type {
  FinalCutSelection,
  ProductionFormat,
  ProductionLanguage,
} from '@/lib/types/finalCut'

const LS_SECTION_STREAMS = 'finalCut.section.streams'
const LS_SECTION_MIXER = 'finalCut.section.mixer'
const LS_MOBILE_PANE = 'finalCut.section.mobilePane'

const DEFAULT_SELECTION: FinalCutSelection = {
  format: 'full-video',
  language: 'en',
  perSceneOverrides: {},
}

/**
 * Migrate the legacy `metadata.finalCutStreams` blob (used by the editing
 * workspace pre-refactor) into the lean `metadata.finalCut` selection. We
 * only carry over `format` and `language` from the most recently-edited
 * stream — overlays, transitions, and audio mixing all moved to Production.
 */
function migrateLegacySelection(metadata: unknown): FinalCutSelection | null {
  if (!metadata || typeof metadata !== 'object') return null
  const m = metadata as Record<string, unknown>
  const legacy = m.finalCutStreams
  if (!Array.isArray(legacy) || legacy.length === 0) return null

  const sortedLegacy = [...legacy].sort((a: unknown, b: unknown) => {
    const ad = new Date((a as { updatedAt?: string })?.updatedAt ?? 0).getTime()
    const bd = new Date((b as { updatedAt?: string })?.updatedAt ?? 0).getTime()
    return bd - ad
  })

  const first = sortedLegacy[0] as { language?: string; format?: string } | undefined
  if (!first) return null

  const format = (first.format === 'animatic' ? 'animatic' : 'full-video') as ProductionFormat
  const language = (typeof first.language === 'string' && first.language ? first.language : 'en') as ProductionLanguage

  return { format, language, perSceneOverrides: {} }
}

function readSelection(metadata: unknown): FinalCutSelection {
  if (metadata && typeof metadata === 'object') {
    const m = metadata as { finalCut?: Partial<FinalCutSelection> }
    if (m.finalCut && typeof m.finalCut === 'object') {
      const format = (m.finalCut.format === 'animatic' ? 'animatic' : 'full-video') as ProductionFormat
      const language = (typeof m.finalCut.language === 'string' && m.finalCut.language
        ? m.finalCut.language
        : 'en') as ProductionLanguage
      const overridesRaw =
        m.finalCut.perSceneOverrides && typeof m.finalCut.perSceneOverrides === 'object'
          ? (m.finalCut.perSceneOverrides as Record<string, { streamVersion?: number }>)
          : {}
      const overrides: NonNullable<FinalCutSelection['perSceneOverrides']> = {}
      for (const k of Object.keys(overridesRaw)) {
        const v = Number(overridesRaw[k]?.streamVersion)
        if (Number.isFinite(v) && v > 0) overrides[k] = { streamVersion: v }
      }
      return { format, language, perSceneOverrides: overrides }
    }
  }
  const migrated = migrateLegacySelection(metadata)
  return migrated ?? { ...DEFAULT_SELECTION }
}

function buildDemoSelection(): FinalCutSelection {
  return { format: 'full-video', language: 'en', perSceneOverrides: {} }
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
  const [selection, setSelection] = useState<FinalCutSelection>(DEFAULT_SELECTION)
  const [streamsExpanded, setStreamsExpanded] = useState(true)
  const [mixerExpanded, setMixerExpanded] = useState(true)
  const [mobilePane, setMobilePane] = useState<'library' | 'edit'>('edit')

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
        const initial = readSelection(project.metadata)
        // If language not present in available languages for this format, fall
        // back to first available (or 'en').
        const sceneState = getSceneProductionStateFromMetadata(project.metadata)
        const langs = getAvailableLanguagesForFormat(sceneState, initial.format)
        if (langs.length > 0 && !langs.includes(initial.language)) {
          initial.language = (langs[0] || 'en') as ProductionLanguage
        }
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
  }, [isDemo, searchProjectId, router, setCurrentProject])

  // Resolve clip list for the active selection.
  const clips = useMemo(
    () => buildFinalCutClips({ project: currentProject ?? null, selection }),
    [currentProject, selection]
  )

  const totalDuration = useMemo(
    () => clips.reduce((max, c) => Math.max(max, c.endTime), 0),
    [clips]
  )

  const sceneState = useMemo(
    () => getSceneProductionStateFromMetadata(currentProject?.metadata),
    [currentProject?.metadata]
  )

  const availableLanguages = useMemo(
    () => getAvailableLanguagesForFormat(sceneState, selection.format),
    [sceneState, selection.format]
  )

  const streamLabel = `${getLanguageName(selection.language)} · ${
    selection.format === 'animatic' ? 'Animatic' : 'Video'
  }`

  const handleChangeFormat = useCallback(
    (format: ProductionFormat) => {
      setSelection((prev) => {
        const langs = getAvailableLanguagesForFormat(sceneState, format)
        const language =
          langs.includes(prev.language) ? prev.language : ((langs[0] ?? prev.language) as ProductionLanguage)
        // Reset overrides on format switch — versions are format-specific.
        return { format, language, perSceneOverrides: {} }
      })
    },
    [sceneState]
  )

  const handleChangeLanguage = useCallback((language: ProductionLanguage) => {
    setSelection((prev) => ({ ...prev, language, perSceneOverrides: {} }))
  }, [])

  const handleChangeSceneOverride = useCallback((sceneId: string, version: number | null) => {
    setSelection((prev) => {
      const next: FinalCutSelection = {
        ...prev,
        perSceneOverrides: { ...(prev.perSceneOverrides ?? {}) },
      }
      if (version == null) {
        delete next.perSceneOverrides![sceneId]
      } else {
        next.perSceneOverrides![sceneId] = { streamVersion: version }
      }
      return next
    })
  }, [])

  const lastRenderUrl =
    (currentProject?.metadata as { exportedVideoUrl?: string } | undefined)?.exportedVideoUrl ?? null

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
    },
    [currentProject, updateProject]
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
              <span className="hidden sm:inline">{isDemo ? 'Exit demo' : 'Production'}</span>
            </Button>
          </Link>

          <div className="h-8 w-px bg-zinc-800 hidden sm:block" />

          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-600/15 ring-1 ring-violet-500/25">
              <Film className="w-5 h-5 text-violet-300" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-semibold tracking-tight text-white truncate">
                {isDemo ? 'Demo project' : currentProject?.title ?? 'Project'}
              </h1>
              <p className="text-[11px] sm:text-xs text-zinc-500 truncate">
                Final Cut · preview workspace
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end">
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

          <Link
            href={`/dashboard/workflow/premiere?projectId=${projectId}${isDemo ? '&demo=true' : ''}`}
          >
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
                SceneFlow Studio
              </p>
              <h2 className="mt-1 text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight text-white [text-shadow:0_2px_28px_rgba(139,92,246,0.35)]">
                Final Cut
              </h2>
              <p className="mt-1.5 text-sm text-zinc-400 max-w-xl leading-relaxed">
                Preview your rendered scene videos for each stream. Editing happens in the Production Scene
                Mixer.
              </p>
            </div>
            <p className="text-xs text-zinc-500 tabular-nums shrink-0 sm:text-right max-w-[220px] sm:max-w-xs truncate">
              {streamLabel}
            </p>
          </div>
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

        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(280px,360px)_minmax(0,1fr)] gap-3 sm:gap-4 min-h-[min(55vh,480px)]">
          <section
            className={cn(
              'min-h-0 flex flex-col overflow-hidden',
              mobilePane === 'edit' && 'hidden lg:flex'
            )}
          >
            <div className="flex flex-col flex-1 min-h-0 rounded-2xl border border-white/[0.08] bg-zinc-950/50 backdrop-blur-xl overflow-hidden shadow-xl shadow-black/30 ring-1 ring-white/[0.04]">
              <ProductionSectionHeader
                icon={Film}
                title="Production streams"
                titleClassName="font-semibold tracking-tight"
                badge={clips.length || undefined}
                collapsible
                expanded={streamsExpanded}
                onToggle={() => setStreamsExpanded((e) => !e)}
                className="bg-zinc-950/70 border-b border-white/[0.06] shrink-0"
              />
              {streamsExpanded ? (
                <FinalCutMediaBrowser
                  className="flex-1 min-h-0 rounded-none border-0 shadow-none bg-zinc-950/30"
                  streamsPanelProps={{
                    selection,
                    clips,
                    availableLanguages,
                    onChangeFormat: handleChangeFormat,
                    onChangeLanguage: handleChangeLanguage,
                    onChangeSceneOverride: handleChangeSceneOverride,
                    disabled: isDemo || isSaving || (!isDemo && !currentProject),
                    productionHref: productionVisionHref,
                    showProductionLink: !!productionVisionHref,
                  }}
                  projectId={projectId}
                  projectName={isDemo ? 'Demo project' : currentProject?.title}
                  finalCutScreenings={finalCutScreenings}
                  screeningCredits={100}
                  onCreateScreening={() => {
                    toast.message('Screenings', {
                      description:
                        'Screening creation will connect to the Premiere workflow in a future update.',
                    })
                  }}
                  onUploadExternal={async () => {
                    toast.message('Upload', {
                      description: 'External screening upload is not wired yet.',
                    })
                    throw new Error('Not implemented')
                  }}
                />
              ) : null}
            </div>
          </section>

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
                rightHint="Read-only preview · render to deliver"
                collapsible
                expanded={mixerExpanded}
                onToggle={() => setMixerExpanded((e) => !e)}
                className="bg-zinc-950/80 border-b border-violet-500/20 shrink-0"
              />
              {mixerExpanded ? (
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
                    hideMixerSectionHeader
                  />
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
