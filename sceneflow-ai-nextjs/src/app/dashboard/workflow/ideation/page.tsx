'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEnhancedStore } from '@/store/enhancedStore'
import { Loader2 } from 'lucide-react'

/**
 * Legacy ideation route — redirects to canonical Blueprint Studio.
 */
export default function IdeationRedirectPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentProject = useEnhancedStore((s) => s.currentProject)

  useEffect(() => {
    const qs = searchParams.toString()
    const suffix = qs ? `?${qs}` : ''
    const projectId = currentProject?.id

    if (projectId) {
      router.replace(`/dashboard/studio/${projectId}${suffix}`)
      return
    }

    router.replace(`/dashboard/projects${suffix ? `${suffix}&from=ideation` : '?from=ideation'}`)
  }, [router, searchParams, currentProject?.id])

  return (
    <div className="flex min-h-[40vh] items-center justify-center text-gray-400">
      <Loader2 className="w-6 h-6 animate-spin mr-2" />
      Opening Blueprint Studio…
    </div>
  )
}
