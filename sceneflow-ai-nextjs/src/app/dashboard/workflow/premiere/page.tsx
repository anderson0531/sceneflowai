'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import {
  AlertCircle,
  ArrowLeft,
  Clapperboard,
  Film,
  Loader2,
  Sparkles,
  Upload,
} from 'lucide-react'
import { useStore } from '@/store/useStore'
import { Button } from '@/components/ui/Button'
import { ScreeningRoomDashboard } from '@/components/screening-room/ScreeningRoomDashboard'

type PremiereScreening = {
  id: string
  title: string
  streamId?: string
  videoUrl?: string
  createdAt: string
  updatedAt?: string
  status: 'draft' | 'active' | 'completed' | 'expired'
  viewerCount: number
  averageCompletion: number
  editable?: boolean
}

function dedupeScreenings(items: PremiereScreening[]): PremiereScreening[] {
  const deduped: PremiereScreening[] = []
  const seenIds = new Set<string>()
  const bestByUrl = new Map<string, PremiereScreening>()

  for (const item of items) {
    const id = item.id?.trim()
    if (!id || seenIds.has(id)) continue
    seenIds.add(id)
    const urlKey = (item.videoUrl || '').trim().toLowerCase()
    if (!urlKey) continue

    const existing = bestByUrl.get(urlKey)
    if (!existing) {
      bestByUrl.set(urlKey, item)
      continue
    }

    const existingTime = new Date(existing.updatedAt || existing.createdAt).getTime()
    const itemTime = new Date(item.updatedAt || item.createdAt).getTime()
    if (itemTime >= existingTime) {
      bestByUrl.set(urlKey, item)
    }
  }

  for (const item of bestByUrl.values()) {
    deduped.push(item)
  }

  deduped.sort(
    (a, b) =>
      new Date(b.updatedAt || b.createdAt).getTime() -
      new Date(a.updatedAt || a.createdAt).getTime()
  )
  return deduped
}

export default function PremierePage() {
  const searchParams = useSearchParams()
  const currentProject = useStore((s) => s.currentProject)
  const setCurrentProject = useStore((s) => s.setCurrentProject)

  const [isLoading, setIsLoading] = useState(true)
  const [persistedScreenings, setPersistedScreenings] = useState<PremiereScreening[]>([])
  const [isHeaderUploading, setIsHeaderUploading] = useState(false)

  const isDemo = searchParams.get('demo') === 'true'
  const searchProjectIdRaw = searchParams.get('projectId')
  const searchProjectId =
    searchProjectIdRaw && searchProjectIdRaw.trim() !== '' ? searchProjectIdRaw.trim() : undefined
  const projectId = searchProjectId || currentProject?.id || (isDemo ? 'demo-project' : undefined)

  useEffect(() => {
    if (isDemo) {
      setIsLoading(false)
      return
    }

    const targetId = searchProjectId || useStore.getState().currentProject?.id
    if (!targetId) {
      setIsLoading(false)
      return
    }

    let cancelled = false

    ;(async () => {
      setIsLoading(true)
      try {
        const existing = useStore.getState().currentProject
        if (existing?.id === targetId) {
          if (!cancelled) setIsLoading(false)
          return
        }

        const res = await fetch(`/api/projects/${targetId}`, { cache: 'no-store' })
        if (!res.ok) {
          const detail = await res.text().catch(() => res.statusText)
          throw new Error(detail || `HTTP ${res.status}`)
        }
        const data = await res.json()
        const project = data.project ?? data
        if (cancelled) return
        setCurrentProject(project)
      } catch (err) {
        if (!cancelled) {
          console.error('[Premiere] Failed to load project:', err)
          toast.error('Could not open Premiere. Please choose a project and try again.')
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [isDemo, searchProjectId, setCurrentProject])

  const refreshPersistedScreenings = useCallback(async () => {
    if (!projectId || isDemo) {
      setPersistedScreenings([])
      return
    }
    try {
      const res = await fetch(`/api/premiere/screenings?projectId=${encodeURIComponent(projectId)}`, {
        cache: 'no-store',
      })
      if (!res.ok) throw new Error(await res.text())
      const data = (await res.json()) as { items?: PremiereScreening[] }
      setPersistedScreenings(
        Array.isArray(data.items)
          ? data.items.map((item) => ({ ...item, editable: true }))
          : []
      )
    } catch (error) {
      console.error('[Premiere] Failed loading persisted screenings:', error)
      setPersistedScreenings([])
    }
  }, [isDemo, projectId])

  useEffect(() => {
    void refreshPersistedScreenings()
  }, [refreshPersistedScreenings])

  const derivedFinalCutScreenings = useMemo<PremiereScreening[]>(() => {
    if (isDemo) {
      return [
        {
          id: 'demo-premiere-screening',
          title: 'Demo premiere cut',
          createdAt: new Date().toISOString(),
          status: 'active',
          viewerCount: 8,
          averageCompletion: 73,
        },
      ]
    }

    if (!projectId) return []

    const items: PremiereScreening[] = []
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

    const streams = ((currentProject?.metadata as { finalCutStreams?: unknown } | undefined)
      ?.finalCutStreams || []) as Array<{
      id: string
      name?: string
      exports?: Array<{
        id: string
        outputUrl?: string
        status?: string
        completedAt?: string
        createdAt?: string
      }>
    }>

    for (const stream of streams) {
      for (const ex of stream.exports ?? []) {
        const url = (ex.outputUrl || '').trim()
        if (!url) continue
        items.push({
          id: ex.id,
          title: `Export · ${stream.name || 'Untitled stream'}`,
          streamId: stream.id,
          videoUrl: url,
          createdAt: ex.completedAt || ex.createdAt || new Date().toISOString(),
          status: ex.status === 'complete' ? 'active' : 'draft',
          viewerCount: 0,
          averageCompletion: 0,
        })
      }
    }

    return items.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }, [currentProject?.metadata, isDemo, projectId])

  const finalCutScreenings = useMemo<PremiereScreening[]>(() => {
    return dedupeScreenings([
      ...persistedScreenings,
      ...derivedFinalCutScreenings.map((item) => ({ ...item, editable: false })),
    ])
  }, [derivedFinalCutScreenings, persistedScreenings])

  const handleCreateScreening = useCallback(() => {
    toast.message('Premiere screening', {
      description: 'Screening creation will be connected to release workflows soon.',
    })
  }, [])

  const handleUploadExternal = useCallback(async (file: File) => {
    if (!projectId || isDemo) {
      throw new Error('Upload requires a saved non-demo project')
    }

    const { upload } = await import('@vercel/blob/client')
    const safeProjectId = projectId.replace(/[^a-zA-Z0-9_-]/g, '-')
    const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const pathname = `premiere/uploads/${safeProjectId}/${Date.now()}-${safeFileName}`

    const uploadedBlob = await upload(pathname, file, {
      access: 'public',
      handleUploadUrl: '/api/premiere/upload-url',
    })

    const createRes = await fetch('/api/premiere/screenings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        title: `External upload · ${file.name}`,
        videoUrl: uploadedBlob.url,
        source: 'external_upload',
      }),
    })
    const createText = await createRes.text()
    const createData = (() => {
      try {
        return JSON.parse(createText) as { success?: boolean; error?: string }
      } catch {
        return { error: createText }
      }
    })()
    if (!createRes.ok || !createData.success) {
      throw new Error(createData.error || 'Screening creation failed')
    }

    await refreshPersistedScreenings()
    toast.success('Upload complete', {
      description: 'Created a new Premiere screening from your external video.',
    })

    return uploadedBlob.url
  }, [isDemo, projectId, refreshPersistedScreenings])

  const handleHeaderUpload = useCallback(
    async (file: File) => {
      try {
        setIsHeaderUploading(true)
        await handleUploadExternal(file)
      } finally {
        setIsHeaderUploading(false)
      }
    },
    [handleUploadExternal]
  )

  const handleRenameScreening = useCallback(
    async (screeningId: string, nextTitle: string) => {
      if (!projectId || isDemo) {
        throw new Error('Renaming requires a saved non-demo project')
      }

      if (!screeningId.startsWith('premiere-')) {
        toast.message('Read-only item', {
          description: 'Only uploaded screening records can be renamed right now.',
        })
        return
      }

      const res = await fetch('/api/premiere/screenings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          screeningId,
          title: nextTitle,
        }),
      })
      const text = await res.text()
      const payload = (() => {
        try {
          return JSON.parse(text) as { success?: boolean; error?: string }
        } catch {
          return { error: text }
        }
      })()

      if (!res.ok || !payload.success) {
        throw new Error(payload.error || 'Failed to rename screening')
      }

      await refreshPersistedScreenings()
      toast.success('Name updated')
    },
    [isDemo, projectId, refreshPersistedScreenings]
  )

  if (isLoading) {
    return (
      <div className="relative isolate min-h-screen flex items-center justify-center overflow-hidden bg-zinc-950">
        <div
          className="pointer-events-none absolute inset-0 opacity-80"
          aria-hidden
          style={{
            backgroundImage:
              'radial-gradient(ellipse 100% 80% at 50% -20%, rgba(168, 85, 247, 0.24), transparent 55%)',
          }}
        />
        <div className="text-center text-zinc-100 relative">
          <Loader2 className="w-8 h-8 animate-spin text-violet-400 mx-auto mb-4" />
          <p className="text-zinc-400 text-sm font-medium">Loading Premiere…</p>
        </div>
      </div>
    )
  }

  if (!isDemo && !currentProject) {
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

  const finalCutHref = `/dashboard/workflow/final-cut?projectId=${projectId || ''}${
    isDemo ? '&demo=true' : ''
  }`

  return (
    <div className="relative isolate min-h-screen flex flex-col overflow-hidden bg-zinc-950 text-zinc-100">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-zinc-950" aria-hidden />
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-90"
        aria-hidden
        style={{
          backgroundImage: `
            radial-gradient(ellipse 120% 85% at 8% -12%, rgba(168,85,247,0.24), transparent 50%),
            radial-gradient(ellipse 90% 70% at 92% 8%, rgba(79,70,229,0.16), transparent 48%),
            radial-gradient(ellipse 85% 55% at 50% 100%, rgba(217,70,239,0.1), transparent 55%)
          `,
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.34] [background-size:24px_24px] [background-image:linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)]"
        aria-hidden
      />

      {isDemo ? (
        <div className="bg-amber-500/15 border-b border-amber-500/25 px-4 py-2.5">
          <div className="flex items-center justify-center gap-2 text-amber-200/95 text-sm">
            <Film className="w-4 h-4 shrink-0" />
            <span className="font-medium">Demo mode</span>
            <span className="text-amber-200/60 hidden sm:inline">
              showcase dashboard only · no data is persisted
            </span>
          </div>
        </div>
      ) : null}

      <header className="sticky top-0 z-40 flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-white/[0.08] bg-zinc-950/80 backdrop-blur-xl supports-[backdrop-filter]:bg-zinc-950/65 shadow-[0_1px_0_0_rgba(255,255,255,0.04)]">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <Link href={finalCutHref}>
            <Button
              variant="ghost"
              size="sm"
              className="text-zinc-400 hover:text-white hover:bg-zinc-800/80 -ml-1"
            >
              <ArrowLeft className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Final Cut</span>
            </Button>
          </Link>

          <div className="h-8 w-px bg-zinc-800 hidden sm:block" />

          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-600/15 ring-1 ring-violet-500/25">
              <Clapperboard className="w-5 h-5 text-violet-300" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-semibold tracking-tight text-white truncate">
                Premiere
              </h1>
              <p className="text-[11px] sm:text-xs text-zinc-500 truncate">
                screening and release readiness
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="relative flex-1 min-h-0 flex flex-col gap-4 px-4 sm:px-5 py-4 overflow-hidden border-t border-white/[0.06]">
        <div className="shrink-0 relative overflow-hidden rounded-2xl border border-white/[0.1] bg-gradient-to-br from-violet-950/50 via-zinc-950/70 to-indigo-950/25 px-5 py-4 sm:px-7 sm:py-5 shadow-[0_0_0_1px_rgba(139,92,246,0.12),0_24px_80px_-32px_rgba(139,92,246,0.35)] backdrop-blur-md">
          <div
            className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-indigo-500/20 blur-3xl motion-reduce:opacity-40"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -left-10 bottom-0 h-40 w-40 rounded-full bg-violet-500/15 blur-3xl motion-reduce:opacity-40"
            aria-hidden
          />
          <div className="relative flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-violet-300/90">
                SceneFlow AI Studio
              </p>
              <h2 className="mt-1 text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight text-white [text-shadow:0_2px_28px_rgba(99,102,241,0.35)]">
                {`Premiere: ${isDemo ? 'Demo project' : currentProject?.title ?? 'Project'}`}
              </h2>
              <p className="mt-1.5 text-sm text-zinc-400 max-w-xl leading-relaxed">
                Screening room hub for audience feedback, approvals, and release confidence.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <Sparkles className="w-3.5 h-3.5 text-violet-400" />
              <span>Ready for review</span>
            </div>
          </div>
        </div>

        <section className="min-h-0 flex-1 rounded-2xl border border-violet-500/20 bg-zinc-950/50 backdrop-blur-xl overflow-hidden shadow-[0_0_0_1px_rgba(139,92,246,0.12),0_24px_80px_-32px_rgba(99,102,241,0.3)]">
          <div className="border-b border-violet-500/20 bg-zinc-950/80 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Clapperboard className="w-4 h-4 text-violet-300" />
                <h3 className="text-sm font-semibold tracking-tight text-white">Premiere Dashboard</h3>
              </div>
              <div className="shrink-0">
                <label>
                  <input
                    type="file"
                    accept="video/mp4,video/quicktime,video/x-m4v"
                    className="hidden"
                    disabled={isHeaderUploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) void handleHeaderUpload(file)
                      e.currentTarget.value = ''
                    }}
                  />
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="border-violet-500/40 bg-violet-950/20 text-violet-100 hover:bg-violet-950/40 hover:border-violet-400/50"
                    disabled={isHeaderUploading}
                  >
                    <span>
                      {isHeaderUploading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4 mr-2" />
                      )}
                      {isHeaderUploading ? 'Uploading…' : 'Upload video'}
                    </span>
                  </Button>
                </label>
              </div>
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              Manage final cut screenings and external uploads from one review surface.
            </p>
          </div>
          <div className="h-full min-h-0 overflow-auto p-4 sm:p-5">
            <ScreeningRoomDashboard
              variant="finalCutOnly"
              hideFinalCutChrome
              projectId={projectId || 'unknown-project'}
              projectName={isDemo ? 'Demo project' : currentProject?.title}
              finalCutScreenings={finalCutScreenings}
              screeningCredits={100}
              onCreateScreening={handleCreateScreening}
              onViewAnalytics={(screeningId) => {
                toast.message('Analytics', {
                  description: `Analytics panel for ${screeningId} is coming soon.`,
                })
              }}
              onConfigureABTest={(screeningId) => {
                toast.message('A/B testing', {
                  description: `A/B setup for ${screeningId} will be available in a follow-up update.`,
                })
              }}
              onRenameScreening={handleRenameScreening}
              onUploadExternal={handleUploadExternal}
            />
          </div>
        </section>
      </main>
    </div>
  )
}
