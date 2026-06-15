'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'

/**
 * Legacy Premiere route — redirects to Screening Room (Publish tab).
 */
export default function PremiereRedirectPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', 'publish')
    router.replace(`/dashboard/workflow/screening-room?${params.toString()}`)
  }, [router, searchParams])

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="text-center text-zinc-300">
        <Loader2 className="w-8 h-8 animate-spin text-violet-400 mx-auto mb-4" />
        <p className="text-sm">Opening Screening Room…</p>
      </div>
    </div>
  )
}
