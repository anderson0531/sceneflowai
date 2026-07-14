'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useStore } from '@/store/useStore'

/**
 * Legacy standalone Screening Room route — redirects into Production vision tabs.
 */
export default function ProjectScreeningRoomRedirectPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentProject = useStore((s) => s.currentProject)

  useEffect(() => {
    const searchProjectIdRaw = searchParams.get('projectId')
    const searchProjectId =
      searchProjectIdRaw && searchProjectIdRaw.trim() !== '' ? searchProjectIdRaw.trim() : undefined
    const projectId = searchProjectId || currentProject?.id

    if (!projectId) {
      router.replace('/dashboard')
      return
    }

    const tab = searchParams.get('tab')
    const params = new URLSearchParams()
    if (tab === 'assemble' || tab === 'publish' || tab === 'feedback') {
      params.set('view', 'streams')
    } else {
      params.set('view', 'screening')
    }

    const demo = searchParams.get('demo')
    if (demo) params.set('demo', demo)

    router.replace(`/dashboard/workflow/vision/${projectId}?${params.toString()}`)
  }, [router, searchParams, currentProject?.id])

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="text-center text-zinc-300">
        <Loader2 className="w-8 h-8 animate-spin text-violet-400 mx-auto mb-4" />
        <p className="text-sm">Opening Production…</p>
      </div>
    </div>
  )
}
