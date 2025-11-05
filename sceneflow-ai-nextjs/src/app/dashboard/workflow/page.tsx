'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader } from 'lucide-react'

export default function WorkflowIndexPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to dashboard - workflow steps are accessed via specific routes
    // Users should start from the dashboard and select a project
    router.replace('/dashboard')
  }, [router])

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center">
      <div className="text-center text-white">
        <Loader className="w-8 h-8 animate-spin text-sf-primary mx-auto mb-4" />
        <p className="text-gray-400">Redirecting to dashboard...</p>
      </div>
    </div>
  )
}

