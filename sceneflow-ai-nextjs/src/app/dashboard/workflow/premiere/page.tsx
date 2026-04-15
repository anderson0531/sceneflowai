'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import {
  AlertCircle,
  ArrowLeft,
  ExternalLink,
  Film,
  Loader2,
  Upload,
} from 'lucide-react'
import { useStore } from '@/store/useStore'
import { Button } from '@/components/ui/Button'
import { ScreeningRoomDashboard } from '@/components/screening-room/ScreeningRoomDashboard'

type PremiereScreening = {
  id: string
  title: string
  streamId?: string
  streamLabel?: string
  locale?: string
  sourceType?: 'video' | 'animatic'
  videoUrl?: string
  thumbnail?: string
  createdAt: string
  updatedAt?: string
  status: 'draft' | 'active' | 'completed' | 'expired'
  reviewStatus?: 'open' | 'in_review' | 'resolved'
  owner?: string
  lastActionAt?: string
  viewerCount: number
  averageCompletion: number
  feedbackCount?: number
  avgRating?: number
  latestFeedbackAt?: string
  openItems?: number
  editable?: boolean
}

type PremiereFeedback = {
  id: string
  projectId: string
  screeningId: string
  streamId?: string
  author: string
  rating: number
  comment: string
  tags: string[]
  status: 'open' | 'in_review' | 'resolved'
  owner?: string
  createdAt: string
  updatedAt: string
}

function inferStreamMetadata(streamName: string | undefined): {
  streamLabel?: string
  locale?: string
  sourceType: 'video' | 'animatic'
} {
  const label = (streamName || '').trim()
  const normalized = label.toLowerCase()
  let locale = 'en'
  if (normalized.includes('spanish')) locale = 'es'
  else if (normalized.includes('french')) locale = 'fr'
  else if (normalized.includes('portuguese')) locale = 'pt'
  else if (normalized.includes('german')) locale = 'de'
  const sourceType = normalized.includes('animatic') ? 'animatic' : 'video'
  return {
    streamLabel: label || undefined,
    locale,
    sourceType,
  }
}

function dedupeScreenings(items: PremiereScreening[]): PremiereScreening[] {
  const deduped: PremiereScreening[] = []
  const seenIds = new Set<string>()
  const bestByStreamAndUrl = new Map<string, PremiereScreening>()

  for (const item of items) {
    const id = item.id?.trim()
    if (!id || seenIds.has(id)) continue
    seenIds.add(id)
    const urlKey = (item.videoUrl || '').trim().toLowerCase()
    const streamKey = (item.streamId || item.streamLabel || 'unscoped').trim().toLowerCase()
    if (!urlKey) continue
    const dedupeKey = `${streamKey}::${urlKey}`

    const existing = bestByStreamAndUrl.get(dedupeKey)
    if (!existing) {
      bestByStreamAndUrl.set(dedupeKey, item)
      continue
    }

    // Persisted Premiere records (editable=true) win over derived display rows.
    const existingPersisted = existing.editable === true
    const itemPersisted = item.editable === true
    if (itemPersisted && !existingPersisted) {
      bestByUrl.set(urlKey, item)
      continue
    }
    if (!itemPersisted && existingPersisted) {
      continue
    }

    const existingTime = new Date(existing.updatedAt || existing.createdAt).getTime()
    const itemTime = new Date(item.updatedAt || item.createdAt).getTime()
    if (itemTime >= existingTime) {
      bestByStreamAndUrl.set(dedupeKey, item)
    }
  }

  for (const item of bestByStreamAndUrl.values()) {
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
  const [headerUploadProgress, setHeaderUploadProgress] = useState(0)
  const headerUploadInputRef = useRef<HTMLInputElement | null>(null)

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
    const projectBillboard =
      ((currentProject?.metadata as { billboardUrl?: string; billboardImageUrl?: string } | undefined)
        ?.billboardUrl ||
        (currentProject?.metadata as { billboardUrl?: string; billboardImageUrl?: string } | undefined)
          ?.billboardImageUrl ||
        '')?.trim() || undefined
    const exported = (
      (currentProject?.metadata as { exportedVideoUrl?: string } | undefined)?.exportedVideoUrl || ''
    ).trim()

    if (exported) {
      items.push({
        id: `project-export-${projectId}`,
        title: 'Latest project export',
        videoUrl: exported,
        thumbnail: projectBillboard,
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
          ...inferStreamMetadata(stream.name),
          videoUrl: url,
          thumbnail: projectBillboard,
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
    const projectBillboard =
      ((currentProject?.metadata as { billboardUrl?: string; billboardImageUrl?: string } | undefined)
        ?.billboardUrl ||
        (currentProject?.metadata as { billboardUrl?: string; billboardImageUrl?: string } | undefined)
          ?.billboardImageUrl ||
        '')?.trim() || undefined
    return dedupeScreenings([
      ...persistedScreenings,
      ...derivedFinalCutScreenings.map((item) => ({ ...item, editable: false })),
    ]).map((item) => ({
      ...item,
      thumbnail: item.thumbnail || projectBillboard,
    }))
  }, [currentProject?.metadata, derivedFinalCutScreenings, persistedScreenings])

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
        streamLabel: 'External upload',
        locale: 'und',
        sourceType: 'video',
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
      let progressInterval: ReturnType<typeof setInterval> | null = null
      try {
        setIsHeaderUploading(true)
        setHeaderUploadProgress(0)
        progressInterval = setInterval(() => {
          setHeaderUploadProgress((prev) => Math.min(prev + 8, 90))
        }, 350)
        await handleUploadExternal(file)
        if (progressInterval) {
          clearInterval(progressInterval)
          progressInterval = null
        }
        setHeaderUploadProgress(100)
      } finally {
        if (progressInterval) clearInterval(progressInterval)
        setIsHeaderUploading(false)
        setTimeout(() => setHeaderUploadProgress(0), 700)
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

  const handleListFeedback = useCallback(
    async (screeningId: string) => {
      if (!projectId || isDemo) return []
      const res = await fetch(
        `/api/premiere/feedback?projectId=${encodeURIComponent(projectId)}&screeningId=${encodeURIComponent(screeningId)}`,
        { cache: 'no-store' }
      )
      const payload = (await res.json()) as { items?: PremiereFeedback[]; error?: string }
      if (!res.ok) throw new Error(payload.error || 'Failed to load feedback')
      return payload.items || []
    },
    [isDemo, projectId]
  )

  const handleCreateFeedback = useCallback(
    async (input: {
      screeningId: string
      streamId?: string
      author?: string
      rating: number
      comment: string
      tags?: string[]
    }) => {
      if (!projectId || isDemo) throw new Error('Feedback requires a saved non-demo project')
      const res = await fetch('/api/premiere/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          screeningId: input.screeningId,
          streamId: input.streamId,
          author: input.author,
          rating: input.rating,
          comment: input.comment,
          tags: input.tags || [],
        }),
      })
      const payload = (await res.json()) as { success?: boolean; error?: string }
      if (!res.ok || !payload.success) throw new Error(payload.error || 'Failed to submit feedback')
      await refreshPersistedScreenings()
    },
    [isDemo, projectId, refreshPersistedScreenings]
  )

  const handleUpdateFeedback = useCallback(
    async (
      screeningId: string,
      feedbackId: string,
      updates: { status?: 'open' | 'in_review' | 'resolved'; tags?: string[]; owner?: string }
    ) => {
      if (!projectId || isDemo) throw new Error('Feedback requires a saved non-demo project')
      const res = await fetch('/api/premiere/feedback', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          screeningId,
          feedbackId,
          ...updates,
        }),
      })
      const payload = (await res.json()) as { success?: boolean; error?: string }
      if (!res.ok || !payload.success) throw new Error(payload.error || 'Failed to update feedback')
      await refreshPersistedScreenings()
    },
    [isDemo, projectId, refreshPersistedScreenings]
  )

  const handleExportFeedback = useCallback(
    async (screeningId: string) => {
      if (!projectId || isDemo) return
      const url = `/api/premiere/feedback/export?projectId=${encodeURIComponent(projectId)}&screeningId=${encodeURIComponent(screeningId)}&format=csv`
      window.open(url, '_blank', 'noopener,noreferrer')
    },
    [isDemo, projectId]
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
  const screeningRoomHref = `/screening-room?projectId=${encodeURIComponent(projectId || '')}&returnTo=${encodeURIComponent(finalCutHref.replace('/dashboard/workflow/final-cut', '/dashboard/workflow/premiere'))}`

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

        </div>
        <Link href={screeningRoomHref}>
          <Button
            size="sm"
            variant="outline"
            className="border-violet-500/40 bg-violet-950/20 text-violet-100 hover:bg-violet-950/40 hover:border-violet-400/50"
          >
            <ExternalLink className="w-4 h-4 mr-1.5" />
            Screening Room Dashboard
          </Button>
        </Link>
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
          <div className="relative">
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
          </div>
        </div>

        <section className="min-h-0 flex-1 rounded-2xl border border-violet-500/20 bg-zinc-950/50 backdrop-blur-xl overflow-hidden shadow-[0_0_0_1px_rgba(139,92,246,0.12),0_24px_80px_-32px_rgba(99,102,241,0.3)]">
          <div className="border-b border-violet-500/20 bg-zinc-950/80 px-4 py-3">
            <div className="flex items-center justify-end gap-3">
              <div className="shrink-0">
                <input
                  ref={headerUploadInputRef}
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
                  size="sm"
                  variant="outline"
                  type="button"
                  className="h-9 w-9 p-0 border-violet-500/40 bg-violet-950/20 text-violet-100 hover:bg-violet-950/40 hover:border-violet-400/50"
                  disabled={isHeaderUploading}
                  aria-label={isHeaderUploading ? 'Uploading video' : 'Upload video'}
                  onClick={() => headerUploadInputRef.current?.click()}
                >
                  {isHeaderUploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
            {isHeaderUploading ? (
              <div className="mt-2 flex items-center justify-end gap-2">
                <div className="h-1.5 w-28 overflow-hidden rounded-full bg-zinc-800/90">
                  <div
                    className="h-full bg-gradient-to-r from-violet-600 to-fuchsia-500 transition-all duration-300"
                    style={{ width: `${headerUploadProgress}%` }}
                  />
                </div>
                <span className="w-9 text-right text-[11px] tabular-nums text-zinc-400">
                  {headerUploadProgress}%
                </span>
              </div>
            ) : null}
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
              onListFeedback={handleListFeedback}
              onCreateFeedback={handleCreateFeedback}
              onUpdateFeedback={handleUpdateFeedback}
              onExportFeedback={handleExportFeedback}
            />
          </div>
        </section>
      </main>
    </div>
  )
}
