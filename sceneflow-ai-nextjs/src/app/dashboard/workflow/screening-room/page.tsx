'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { AlertCircle, ArrowLeft, Loader2 } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { Button } from '@/components/ui/Button'
import { ProductionScreeningRoomShell, type ScreeningRoomTab } from '@/components/screening-room/ProductionScreeningRoomShell'
import { getSceneProductionStateFromMetadata } from '@/lib/final-cut/projectProductionState'

function parseTab(value: string | null): ScreeningRoomTab {
  if (value === 'assemble' || value === 'publish' || value === 'feedback' || value === 'preview') {
    return value
  }
  return 'preview'
}

export default function ProjectScreeningRoomPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentProject = useStore((s) => s.currentProject)
  const setCurrentProject = useStore((s) => s.setCurrentProject)

  const isDemo = searchParams.get('demo') === 'true'
  const searchProjectIdRaw = searchParams.get('projectId')
  const searchProjectId =
    searchProjectIdRaw && searchProjectIdRaw.trim() !== '' ? searchProjectIdRaw.trim() : undefined
  const projectId = searchProjectId || currentProject?.id || (isDemo ? 'demo-project' : undefined)
  const initialTab = parseTab(searchParams.get('tab'))

  const [isLoading, setIsLoading] = useState(true)

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
          console.error('[ScreeningRoom] Failed to load project:', err)
          toast.error('Could not open Screening Room. Please choose a project and try again.')
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [isDemo, searchProjectId, setCurrentProject])

  const script = useMemo(() => {
    const metadata = currentProject?.metadata as Record<string, unknown> | undefined
    const visionPhase = metadata?.visionPhase as Record<string, unknown> | undefined
    return visionPhase?.script ?? visionPhase ?? null
  }, [currentProject?.metadata])

  const characters = useMemo(() => {
    const metadata = currentProject?.metadata as Record<string, unknown> | undefined
    const visionPhase = metadata?.visionPhase as Record<string, unknown> | undefined
    const chars = visionPhase?.characters
    return Array.isArray(chars) ? chars : []
  }, [currentProject?.metadata])

  const sceneProductionState = useMemo(
    () => getSceneProductionStateFromMetadata(currentProject?.metadata),
    [currentProject?.metadata]
  )

  const productionHref = projectId
    ? `/dashboard/workflow/vision/${projectId}${isDemo ? '?demo=true' : ''}`
    : '/dashboard'

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center text-zinc-300">
          <Loader2 className="w-8 h-8 animate-spin text-violet-400 mx-auto mb-4" />
          <p className="text-sm">Loading Screening Room…</p>
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

  if (!script) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
        <div className="text-center text-zinc-100 max-w-sm">
          <AlertCircle className="w-12 h-12 text-amber-400/90 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">No script available</h2>
          <p className="text-zinc-500 mb-4 text-sm">Generate your production script first.</p>
          <Link href={productionHref}>
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Production
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <ProductionScreeningRoomShell
      variant="page"
      script={script}
      characters={characters}
      projectId={projectId}
      sceneProductionState={sceneProductionState}
      initialTab={initialTab}
      isDemo={isDemo}
      backButtonLabel="Back to Production"
      onClose={() => router.push(productionHref)}
    />
  )
}
